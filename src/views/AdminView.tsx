import { useStore } from '../store'
import {
  activeRestrictionsFor,
  allowedZones,
  hasFullGear,
  incidentsByZone,
  missingGear,
  openAlerts,
} from '../engine'
import {
  GEAR_LABEL,
  SkillLevel,
  ZONE_LABEL,
  ZoneId,
} from '../types'
import { Badge, Button, Card, H2, ZoneDots } from '../ui'

const SKILL_LABEL: Record<SkillLevel, string> = {
  beginner: '初学',
  intermediate: '进阶',
  advanced: '高级',
}

const ZONE_TONE: Record<ZoneId, 'green' | 'amber' | 'red'> = {
  basic: 'green',
  street: 'amber',
  advanced: 'red',
}

const PARENT_LOC_LABEL: Record<string, string> = {
  lounge: '家长休息区',
  basic: '基础练习区边',
  street: '街式区边',
  advanced: '高级 U 池区边',
  absent: '⚠ 不在现场',
}

export default function AdminView() {
  const { state, dispatch } = useStore()
  const onSite = state.children.filter((c) => c.gateStatus === 'checked_in')
  const heat = incidentsByZone(state.incidents, state.children)
  const activeIncidents = state.incidents.filter((i) => !i.resolution)
  const openAlertCount = state.alerts.filter((a) => !a.resolved).length

  return (
    <div className="space-y-5">
      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="当前在场未成年人" value={onSite.length} tone="sky" />
        <Kpi label="未按要求穿戴" value={onSite.filter((c) => !c.wearing).length} tone="amber" />
        <Kpi label="未关闭提醒" value={openAlertCount} tone="amber" />
        <Kpi label="进行中伤情事件" value={activeIncidents.length} tone="rose" />
      </div>

      {/* 区域策略 */}
      <Card className="p-5">
        <H2>🗺️ 区域开放 · 巡场路线 · 障碍策略</H2>
        <p className="mt-1 text-xs text-slate-500">
          根据各区域伤情集中度调整：关闭区域将即时收回所有孩子的该区域权限；加强巡场会在巡场端置顶路线。
        </p>
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {(['basic', 'street', 'advanced'] as ZoneId[]).map((z) => {
            const p = state.policies[z]
            const count = heat[z]
            return (
              <div
                key={z}
                className={`rounded-xl border p-4 ${
                  count >= 2
                    ? 'border-rose-300 bg-rose-50/60'
                    : count === 1
                      ? 'border-amber-300 bg-amber-50/60'
                      : 'border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <b>{ZONE_LABEL[z]}</b>
                  <Badge tone={p.open ? 'green' : 'slate'}>
                    {p.open ? '开放中' : '已关闭'}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  关联伤情 <b className={count ? 'text-rose-600' : ''}>{count}</b> 起
                  {p.patrolBoost && <Badge tone="red">加强巡场</Badge>}
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {p.obstacles.map((o) => (
                    <span
                      key={o}
                      className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600"
                    >
                      {o}
                    </span>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    variant="ghost"
                    className="px-2 py-1 text-xs"
                    onClick={() =>
                      dispatch({ type: 'TOGGLE_ZONE', zone: z, open: !p.open })
                    }
                  >
                    {p.open ? '临时关闭该区域' : '重新开放'}
                  </Button>
                  <Button
                    variant="ghost"
                    className="px-2 py-1 text-xs"
                    onClick={() =>
                      dispatch({
                        type: 'TOGGLE_BOOST',
                        zone: z,
                        boost: !p.patrolBoost,
                      })
                    }
                  >
                    {p.patrolBoost ? '取消加强巡场' : '加强巡场路线'}
                  </Button>
                </div>
                {count >= 2 && (
                  <p className="mt-2 rounded-lg bg-rose-100 p-2 text-xs text-rose-700">
                    建议：暂停大跳台/U 池等高风险障碍并加派巡场（已高亮）。
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </Card>

      {/* 在场孩子看板 */}
      <Card className="p-5">
        <H2>🧒 当前在场未成年人</H2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="text-left text-xs text-slate-500">
              <tr className="border-b border-slate-200">
                <th className="py-2 pr-3">孩子</th>
                <th className="py-2 pr-3">护具穿戴</th>
                <th className="py-2 pr-3">可进入区域</th>
                <th className="py-2 pr-3">当前位置</th>
                <th className="py-2 pr-3">陪同家长</th>
                <th className="py-2 pr-3">状态/操作</th>
              </tr>
            </thead>
            <tbody>
              {onSite.map((c) => {
                const rest = activeRestrictionsFor(c.id, state.incidents)
                const zones = allowedZones(c, state.policies, rest)
                const alerts = openAlerts(c.id, state.alerts)
                return (
                  <tr key={c.id} className="border-b border-slate-100 align-top">
                    <td className="py-3 pr-3">
                      <b>{c.name}</b>
                      <span className="text-xs text-slate-500">
                        {' '}
                        {c.age} 岁 · {SKILL_LABEL[c.skill]}
                      </span>
                      {rest && !rest.canSkateToday && (
                        <div>
                          <Badge tone="red">当天已停止滑行</Badge>
                        </div>
                      )}
                    </td>
                    <td className="py-3 pr-3">
                      <div className="flex flex-wrap items-center gap-1">
                        {c.wearing ? (
                          <Badge tone="green">已按要求穿戴</Badge>
                        ) : (
                          <Badge tone="red">未佩戴/不完整</Badge>
                        )}
                        {c.helmetDamaged && <Badge tone="red">头盔破损</Badge>}
                      </div>
                      <p className="mt-1 font-mono text-xs text-slate-500">
                        {c.gearIssued
                          .map((g) => `${GEAR_LABEL[g.type]}${g.code}`)
                          .join(' / ') || '未领取'}
                      </p>
                      {missingGear(c).length > 0 && (
                        <p className="text-xs text-amber-700">
                          缺：{missingGear(c).join('、')}
                        </p>
                      )}
                      {!hasFullGear(c) && (
                        <p className="text-xs text-slate-400">仅限基础练习区</p>
                      )}
                    </td>
                    <td className="py-3 pr-3">
                      <ZoneDots zones={zones.map((z) => ZONE_LABEL[z])} />
                      {rest?.requireLesson && (
                        <p className="mt-1 text-xs text-violet-700">
                          需先完成教学确认
                        </p>
                      )}
                    </td>
                    <td className="py-3 pr-3">
                      <select
                        value={c.zone ?? 'basic'}
                        onChange={(e) =>
                          dispatch({
                            type: 'SET_ZONE',
                            id: c.id,
                            zone: e.target.value as ZoneId,
                          })
                        }
                        className="rounded-lg border border-slate-300 px-2 py-1 text-xs"
                      >
                        {(['basic', 'street', 'advanced'] as ZoneId[]).map((z) => (
                          <option key={z} value={z}>
                            {ZONE_LABEL[z]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 pr-3">
                      <Badge
                        tone={c.parentLoc.zone === 'absent' ? 'red' : 'blue'}
                      >
                        {PARENT_LOC_LABEL[c.parentLoc.zone]}
                      </Badge>
                      <p className="mt-1 text-xs text-slate-500">
                        {c.parentLoc.note}
                      </p>
                    </td>
                    <td className="py-3 pr-3">
                      <div className="flex flex-col items-start gap-1">
                        {alerts.length > 0 && (
                          <Badge tone="amber">
                            {alerts.length} 条未处理提醒
                          </Badge>
                        )}
                        {state.incidents.some(
                          (i) =>
                            i.childId === c.id &&
                            !i.resolution,
                        ) && <Badge tone="red">伤情处置中</Badge>}
                        <button
                          onClick={() =>
                            dispatch({
                              type: 'SET_WEARING',
                              id: c.id,
                              wearing: !c.wearing,
                            })
                          }
                          className="text-xs text-sky-600 hover:underline"
                        >
                          {c.wearing ? '标记为未佩戴' : '标记为已穿戴'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 伤情事件总览 */}
      <Card className="p-5">
        <H2>🚑 当日伤情事件流转</H2>
        <div className="mt-3 space-y-2">
          {state.incidents.length === 0 && (
            <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">
              暂无伤情事件。巡场/教练可在移动端发起。
            </p>
          )}
          {state.incidents.map((i) => {
            const c = state.children.find((x) => x.id === i.childId)
            const steps = ['report', 'photo', 'parent', 'resolution'] as const
            const idx = steps.indexOf(i.stage)
            return (
              <div
                key={i.id}
                className="rounded-xl border border-slate-200 p-3"
              >
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <b>{c?.name}</b>
                  <span className="text-xs text-slate-400">{i.code}</span>
                  <Badge
                    tone={
                      i.severity === 'serious'
                        ? 'red'
                        : i.severity === 'moderate'
                          ? 'amber'
                          : 'blue'
                    }
                  >
                    {i.severity === 'serious'
                      ? '较重'
                      : i.severity === 'moderate'
                        ? '中度'
                        : '轻微'}
                  </Badge>
                  {i.resolution ? (
                    <Badge tone="green">已闭环</Badge>
                  ) : (
                    <Badge tone="amber">
                      进行中 ·{' '}
                      {['巡场记录', '现场照片', '家长确认', '处置结果'][idx]}
                    </Badge>
                  )}
                </div>
                <div className="mt-2 flex gap-1">
                  {steps.map((s, k) => (
                    <div
                      key={s}
                      className={`h-1.5 flex-1 rounded-full ${
                        k <= idx ? 'bg-sky-500' : 'bg-slate-200'
                      }`}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}

function Kpi({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'sky' | 'amber' | 'rose'
}) {
  const bg = {
    sky: 'from-sky-500 to-sky-600',
    amber: 'from-amber-500 to-orange-500',
    rose: 'from-rose-500 to-rose-600',
  }[tone]
  return (
    <div className={`rounded-2xl bg-gradient-to-br ${bg} p-4 text-white shadow-sm`}>
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-xs opacity-90">{label}</p>
    </div>
  )
}
