import {
  Alert,
  Child,
  GEAR_TYPES,
  Incident,
  Restrictions,
  Severity,
  ZoneId,
  ZonePolicy,
} from './types'

/** 是否三件护具（头盔/护膝/护腕）全部发放 */
export function hasFullGear(c: Child): boolean {
  if (c.helmetDamaged) return false
  return GEAR_TYPES.every((t) => c.gearIssued.some((g) => g.type === t))
}

export function missingGear(c: Child): string[] {
  const labels: string[] = []
  for (const t of GEAR_TYPES) {
    if (t === 'helmet' && c.helmetDamaged) {
      labels.push('头盔(破损)')
      continue
    }
    if (!c.gearIssued.some((g) => g.type === t)) {
      labels.push(t === 'helmet' ? '头盔' : t === 'knee' ? '护膝' : '护腕')
    }
  }
  return labels
}

/**
 * 计算孩子当前可进入区域。
 * 规则：
 *  - 未核验入场：无任何场地权限
 *  - 未领取齐护具（或头盔破损）：只能进入基础练习区
 *  - 三件齐全：基础 + 街式
 *  - 高级 U 池：三件齐全 + 家长同意高级区 + 高级滑行水平 + 头盔完好 + 区域开放
 *  - 当天未结伤情限制（需教学确认 / 必须租护具未满足）会收回街式与高级权限
 */
export function allowedZones(
  c: Child,
  policies: Record<ZoneId, ZonePolicy>,
  activeRestrictions?: Restrictions | null,
): ZoneId[] {
  if (c.gateStatus !== 'checked_in') return []
  const zones: ZoneId[] = []

  // 必须先完成教学确认才能进入街式/高级
  const lessonBlocked = activeRestrictions?.requireLesson ?? false
  // 必须租赁护具但当前未齐 → 只留基础
  const gearBlocked = (activeRestrictions?.mustRentGear ?? false) && !hasFullGear(c)

  if (policies.basic.open) zones.push('basic')

  if (hasFullGear(c) && !lessonBlocked && !gearBlocked) {
    if (policies.street.open) zones.push('street')
    if (
      c.consentAdvanced &&
      c.skill === 'advanced' &&
      policies.advanced.open
    ) {
      zones.push('advanced')
    }
  }
  return zones
}

/** 护具编号 → 可进入区域的绑定说明（护具柜发放后展示） */
export function gearBinding(c: Child): { code: string; name: string }[] {
  return c.gearIssued.map((g) => ({
    code: g.code,
    name: g.type === 'helmet' ? '头盔' : g.type === 'knee' ? '护膝' : '护腕',
  }))
}

/**
 * 伤情后果引擎：根据严重度与触发原因推导当天/下次入场限制。
 *  - serious（送医）：当天禁滑、下次重新授权、必须租护具、先完成教学确认
 *  - moderate：当天停止、必须租护具；若进入高级区/坚持继续滑 → 重新授权 + 教学确认
 *  - minor：当天暂停观察；护具相关原因 → 必须租护具；未佩戴护具 → 教学确认
 */
export function deriveRestrictions(
  severity: Severity,
  reasons: Incident['reasons'],
): Restrictions {
  const r: Restrictions = {
    canSkateToday: true,
    requireReAuthNext: false,
    mustRentGear: false,
    requireLesson: false,
  }
  const has = (x: string) => reasons.includes(x as never)

  if (severity === 'serious') {
    return {
      canSkateToday: false,
      requireReAuthNext: true,
      mustRentGear: true,
      requireLesson: true,
    }
  }
  if (severity === 'moderate') {
    r.canSkateToday = false
    r.mustRentGear = true
    if (has('entered_hard_zone') || has('insist_continue') || has('helmet_broken')) {
      r.requireReAuthNext = true
      r.requireLesson = true
    }
    if (has('no_gear')) r.requireLesson = true
    return r
  }
  // minor
  r.canSkateToday = true
  if (has('no_gear') || has('helmet_broken')) {
    r.mustRentGear = true
    r.requireLesson = has('no_gear')
  }
  if (has('entered_hard_zone')) r.requireLesson = true
  return r
}

/** 该孩子当天生效的伤情限制（取最近一条已出处置结果的伤情） */
export function activeRestrictionsFor(
  childId: string,
  incidents: Incident[],
): Restrictions | null {
  const resolved = incidents
    .filter((i) => i.childId === childId && i.resolution)
    .sort((a, b) => b.resolution!.at - a.resolution!.at)
  if (resolved.length === 0) return null
  return resolved[0].resolution!.restrictions
}

/** 是否存在未关闭的提醒 */
export function openAlerts(childId: string, alerts: Alert[]): Alert[] {
  return alerts.filter((a) => a.childId === childId && !a.resolved)
}

/** 伤情集中区域：统计每个区域相关伤情数量（巡场路线 / 障碍开放依据） */
export function incidentsByZone(
  incidents: Incident[],
  children: Child[],
): Record<ZoneId, number> {
  const tally: Record<ZoneId, number> = { basic: 0, street: 0, advanced: 0 }
  for (const i of incidents) {
    const c = children.find((x) => x.id === i.childId)
    const z = c?.zone
    if (z) tally[z] += 1
    if (i.reasons.includes('entered_hard_zone')) tally.advanced += 1
  }
  return tally
}
