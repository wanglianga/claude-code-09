import { useState } from 'react'
import { useStore } from '../store'
import { activeRestrictionsFor, allowedZones } from '../engine'
import { SkillLevel, ZONE_LABEL } from '../types'
import { Badge, Button, Card, H2, ZoneDots } from '../ui'

const SKILL_LABEL: Record<SkillLevel, string> = {
  beginner: '初学',
  intermediate: '进阶',
  advanced: '高级',
}

function fmt(ts?: number) {
  if (!ts) return '—'
  return new Date(ts).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function GateView() {
  const { state, dispatch } = useStore()
  const [q, setQ] = useState('')
  const [last, setLast] = useState<string | null>(null)

  const list = state.children.filter(
    (c) =>
      q.trim() === '' ||
      c.name.includes(q.trim()) ||
      c.guardianName.includes(q.trim()) ||
      c.gearIssued.some((g) => g.code.toLowerCase().includes(q.trim().toLowerCase())),
  )

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <Card className="p-5 lg:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <H2>🚦 闸口核验台</H2>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜索孩子 / 家长 / 护具编号"
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
          />
        </div>
        <p className="mt-1 text-xs text-slate-500">
          核验通过后孩子状态变为「在场」，其区域权限将下发给护具柜与场地区域闸机。
        </p>

        <div className="mt-4 space-y-3">
          {list.map((c) => {
            const rest = activeRestrictionsFor(c.id, state.incidents)
            const zones = allowedZones(c, state.policies, rest)
            return (
              <div
                key={c.id}
                className={`rounded-xl border p-4 ${
                  last === c.id
                    ? 'border-emerald-300 bg-emerald-50/60'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <b className="text-base">{c.name}</b>
                  <span className="text-sm text-slate-500">
                    {c.age} 岁 · {SKILL_LABEL[c.skill]}
                  </span>
                  {c.gateStatus === 'booked' && <Badge tone="amber">待核验</Badge>}
                  {c.gateStatus === 'checked_in' && (
                    <Badge tone="green">● 已入场 {fmt(c.checkedInAt)}</Badge>
                  )}
                  {c.gateStatus === 'checked_out' && (
                    <Badge tone="slate">已离场</Badge>
                  )}
                  {c.consentAdvanced && <Badge tone="violet">高级区授权</Badge>}
                  {rest?.requireReAuthNext && (
                    <Badge tone="red">下次入场需重新授权</Badge>
                  )}
                </div>

                <div className="mt-2 grid gap-1 text-sm text-slate-600 sm:grid-cols-2">
                  <p>家长：{c.guardianName} {c.guardianPhone}</p>
                  <p>
                    紧急联系：{c.emergencyName} {c.emergencyPhone}
                  </p>
                  <p>租赁护具：{c.rentGear ? '是（全套）' : '否'}</p>
                  <p>历史受伤：{c.injuryHistory}</p>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3">
                  <span className="text-xs text-slate-500">核验后区域权限：</span>
                  <ZoneDots zones={zones.map((z) => ZONE_LABEL[z])} />
                  <span className="ml-auto flex gap-2">
                    {c.gateStatus === 'booked' && (
                      <Button
                        onClick={() => {
                          dispatch({
                            type: 'CHECK_IN',
                            id: c.id,
                            at: Date.now(),
                          })
                          setLast(c.id)
                        }}
                      >
                        ✓ 人证一致，放行入场
                      </Button>
                    )}
                    {c.gateStatus === 'checked_in' && (
                      <Button
                        variant="ghost"
                        onClick={() =>
                          dispatch({ type: 'CHECK_OUT', id: c.id })
                        }
                      >
                        离场签退
                      </Button>
                    )}
                    {c.gateStatus === 'checked_out' && (
                      <span className="text-xs text-slate-400">
                        当日已结束
                      </span>
                    )}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      <Card className="h-fit p-5">
        <H2>🔁 入场状态如何联动</H2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-600">
          <li>家长预约后状态为<b>待核验</b>，护具柜与场地闸机均无权限。</li>
          <li>闸口放行 → 状态变为<b>在场</b>，护具柜可对其发放护具。</li>
          <li>护具柜发放头盔/护膝/护腕并绑定编号后，街式区权限开启。</li>
          <li>
            <b>未领取齐护具只能进入基础练习区</b>；高级 U 池还需高级水平 +
            家长授权 + 头盔完好。
          </li>
          <li>离场签退后，所有区域权限即时收回。</li>
        </ol>
        <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
          提示：可先在「家长端」新建预约，再回到此处搜索孩子姓名完成核验。
        </div>
      </Card>
    </div>
  )
}
