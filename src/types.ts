// ===== 领域类型：城市滑板公园未成年人入场与伤情处置 =====

export type Role = 'parent' | 'gate' | 'locker' | 'admin' | 'patrol'

/** 滑行水平 */
export type SkillLevel = 'beginner' | 'intermediate' | 'advanced'

/** 入场闸口状态 */
export type GateStatus = 'booked' | 'checked_in' | 'checked_out'

/** 区域标识：基础练习区 / 街式区 / 高级 U 池区 */
export type ZoneId = 'basic' | 'street' | 'advanced'

/** 护具种类 */
export type GearType = 'helmet' | 'knee' | 'wrist'
export const GEAR_TYPES: GearType[] = ['helmet', 'knee', 'wrist']

export const GEAR_LABEL: Record<GearType, string> = {
  helmet: '头盔',
  knee: '护膝',
  wrist: '护腕',
}

export const ZONE_LABEL: Record<ZoneId, string> = {
  basic: '基础练习区',
  street: '街式区',
  advanced: '高级 U 池区',
}

/** 单件护具（含编号） */
export interface GearItem {
  type: GearType
  code: string // 护具编号，如 H-1042
}

/** 家长位置定位（陪同位置） */
export interface ParentLocation {
  zone: ZoneId | 'lounge' | 'absent'
  note: string
  at: number
}

/** 孩子档案 + 入场聚合 */
export interface Child {
  id: string
  name: string
  age: number
  skill: SkillLevel
  guardianName: string
  guardianPhone: string
  emergencyName: string
  emergencyPhone: string
  consentAdvanced: boolean // 是否同意进入高级区
  rentGear: boolean // 是否租赁护具
  injuryHistory: string // 历史受伤情况
  gateStatus: GateStatus
  gearIssued: GearItem[] // 已发放护具（编号）
  helmetDamaged: boolean // 头盔是否破损
  wearing: boolean // 当前是否按要求穿戴
  parentLoc: ParentLocation
  checkedInAt?: number
  zone?: ZoneId // 当前所在区域
}

/** 伤情处置阶段 */
export type IncidentStage =
  | 'report' // 巡场员记录
  | 'photo' // 现场照片
  | 'parent' // 家长确认
  | 'resolution' // 处置结果

/** 触发提醒 / 伤情的原因 */
export type IncidentReason =
  | 'entered_hard_zone' // 进入高难度区
  | 'no_gear' // 未佩戴护具
  | 'fall' // 摔倒
  | 'helmet_broken' // 头盔破损
  | 'parent_absent' // 家长不在现场
  | 'insist_continue' // 孩子坚持继续滑

export const REASON_LABEL: Record<IncidentReason, string> = {
  entered_hard_zone: '进入高难度区',
  no_gear: '未佩戴护具',
  fall: '摔倒',
  helmet_broken: '头盔破损',
  parent_absent: '家长不在现场',
  insist_continue: '坚持继续滑',
}

/** 提醒（轻度干预，可升级为伤情事件） */
export interface Alert {
  id: string
  childId: string
  reason: IncidentReason
  detail: string
  at: number
  resolved: boolean
}

/** 伤情严重度 */
export type Severity = 'minor' | 'moderate' | 'serious'

/** 处置结果 */
export interface Resolution {
  onSiteTreatment: string // 现场处理
  suggestLeave: boolean // 是否建议离场
  sentToHospital: boolean // 是否需要送医
  followUp: string // 后续复查提示
  /** 对当天/下次入场的影响（由规则引擎回填，可被管理员覆盖） */
  restrictions: Restrictions
  at: number
}

/** 伤情事件带来的后续限制 */
export interface Restrictions {
  canSkateToday: boolean // 当天是否还能继续滑
  requireReAuthNext: boolean // 下次入场是否需要重新授权
  mustRentGear: boolean // 是否必须租赁护具
  requireLesson: boolean // 是否需先完成教学确认
}

export interface Incident {
  id: string
  code: string // 事件编号，如 INJ-2401
  childId: string
  reasons: IncidentReason[]
  severity: Severity
  reporter: string // 巡场员/教练
  reportNote: string // 巡场员记录
  gearSnapshot: GearType[] // 事发时已穿戴护具种类（快照）
  photo?: string // 现场照片（dataURL）
  photoCaption?: string
  parentConfirmed: boolean // 家长是否确认
  parentConfirmNote: string
  resolution?: Resolution
  stage: IncidentStage
  createdAt: number
}

/** 区域策略（场馆可根据伤情调整） */
export interface ZonePolicy {
  open: boolean
  patrolBoost: boolean // 是否加强巡场
  obstacles: string[] // 开放的障碍
}

export interface AppState {
  children: Child[]
  alerts: Alert[]
  incidents: Incident[]
  policies: Record<ZoneId, ZonePolicy>
}
