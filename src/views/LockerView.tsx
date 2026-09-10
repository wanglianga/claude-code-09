import { useMemo, useState } from 'react'
import { useStore } from '../store'
import { activeRestrictionsFor, allowedZones, gearBinding, hasFullGear } from '../engine'
import { Child, GearItem, GearType, GEAR_LABEL, ZONE_LABEL } from '../types'
import { Badge, Button, Card, H2, ZoneDots } from '../ui'

const PREFIX: Record<GearType, string> = {
  helmet: 'H',
  knee: 'K',
  wrist: 'W',
}

function genCode(type: GearType, taken: Set<string>): string {
  const p = PREFIX[type]
  let n = 1000 + Math.floor(Math.random() * 900)
  let code = `${p}-${n}`
  while (taken.has(code)) {
    n += 1
    code = `${p}-${n}`
  }
  return code
}

export default function LockerView() {
  const { state, dispatch } = useStore()
  const [sel, setSel] = useState<string | null>(null)
  const [scan, setScan] = useState<Record<GearType, string>>({
    helmet: '',
    knee: '',
    wrist: '',
  })

  const takenCodes = useMemo(
    () => new Set(state.children.flatMap((c) => c.gearIssued.map((g) => g.code))),
    [state.children],
  )

  const checkedIn = state.children.filter((c) => c.gateStatus === 'checked_in')
  const current: Child | undefined = checkedIn.find((c) => c.id === sel)

  function issue(type: GearType) {
    if (!current) return
    const code =
      scan[type].trim() || genCode(type, takenCodes)
    if (current.gearIssued.some((g) => g.code === code)) {
      alert('该护具编号已在使用，请更换。')
      return
    }
    const gear: GearItem[] = [
      ...current.gearIssued.filter((g) => g.type !== type),
      { type, code },
    ]
    dispatch({ type: 'ISSUE_GEAR', id: current.id, gear })
    setScan({ ...scan, [type]: '' })
  }

  function returnGear(type: GearType) {
    if (!current) return
    dispatch({
      type: 'ISSUE_GEAR',
      id: current.id,
      gear: current.gearIssued.filter((g) => g.type !== type),
    })
  }

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      {/* 左：在场孩子列表 */}
      <Card className="p-5">
        <H2>🪖 护具发放柜</H2>
        <p className="mt-1 text-xs text-slate-500">
          仅「在场」孩子可领护具；可扫码/手输编号，或由系统分配。
        </p>
        <div className="mt-3 space-y-2">
          {checkedIn.length === 0 && (
            <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">
              暂无已入场孩子，请先在闸口核验放行。
            </p>
          )}
          {checkedIn.map((c) => {
            const rest = activeRestrictionsFor(c.id, state.incidents)
            return (
              <button
                key={c.id}
                onClick={() => setSel(c.id)}
                className={`w-full rounded-xl border p-3 text-left transition ${
                  sel === c.id
                    ? 'border-sky-400 bg-sky-50'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <b>{c.name}</b>
                  <span className="text-xs text-slate-500">{c.age} 岁</span>
                  {hasFullGear(c) ? (
                    <Badge tone="green">全套已领</Badge>
                  ) : (
                    <Badge tone="amber">缺 {3 - c.gearIssued.length} 件</Badge>
                  )}
                  {c.helmetDamaged && <Badge tone="red">头盔破损</Badge>}
                </div>
                {rest?.mustRentGear && (
                  <p className="mt-1 text-xs text-rose-600">
                    ※ 伤情限制：本次必须租赁全套护具
                  </p>
                )}
              </button>
            )
          })}
        </div>
      </Card>

      {/* 中右：发放操作 + 绑定结果 */}
      <div className="space-y-5 lg:col-span-2">
        {!current && (
          <Card className="p-10 text-center text-slate-400">
            ← 请从左侧选择一名在场孩子
          </Card>
        )}

        {current && (
          <>
            <Card className="p-5">
              <div className="flex flex-wrap items-center gap-2">
                <H2>为 {current.name} 发放护具</H2>
                {current.consentAdvanced && (
                  <Badge tone="violet">家长已授权高级区</Badge>
                )}
                <span className="text-xs text-slate-500">
                  滑行水平：
                  {current.skill === 'advanced'
                    ? '高级'
                    : current.skill === 'intermediate'
                      ? '进阶'
                      : '初学'}
                </span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {(['helmet', 'knee', 'wrist'] as GearType[]).map((type) => {
                  const owned = current.gearIssued.find((g) => g.type === type)
                  const damaged = type === 'helmet' && current.helmetDamaged
                  return (
                    <div
                      key={type}
                      className={`rounded-xl border p-4 ${
                        owned && !damaged
                          ? 'border-emerald-300 bg-emerald-50'
                          : 'border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <b>{GEAR_LABEL[type]}</b>
                        {owned && !damaged ? (
                          <Badge tone="green">已发放</Badge>
                        ) : damaged ? (
                          <Badge tone="red">破损停用</Badge>
                        ) : (
                          <Badge tone="slate">未领</Badge>
                        )}
                      </div>
                      {owned && !damaged && (
                        <p className="mt-2 font-mono text-lg text-emerald-700">
                          {owned.code}
                        </p>
                      )}
                      {damaged && (
                        <p className="mt-2 font-mono text-sm text-rose-600">
                          {owned?.code}（已登记破损）
                        </p>
                      )}
                      {!owned && (
                        <div className="mt-3 space-y-2">
                          <input
                            value={scan[type]}
                            onChange={(e) =>
                              setScan({ ...scan, [type]: e.target.value })
                            }
                            placeholder={`扫码/输入编号（如 ${PREFIX[type]}-1042）`}
                            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                          />
                          <Button
                            className="w-full"
                            onClick={() => issue(type)}
                          >
                            发放并绑定
                          </Button>
                        </div>
                      )}
                      {owned && (
                        <button
                          onClick={() => returnGear(type)}
                          className="mt-2 text-xs text-slate-400 hover:text-rose-500"
                        >
                          收回 / 更换
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>

              {current.gearIssued.length > 0 && !current.helmetDamaged && (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      if (confirm('登记头盔破损？将立即收回街式/高级权限。'))
                        dispatch({
                          type: 'MARK_HELMET_DAMAGED',
                          id: current.id,
                        })
                    }}
                  >
                    ⚠ 登记头盔破损（停用）
                  </Button>
                </div>
              )}
            </Card>

            <Card className="p-5">
              <H2>🔗 护具编号 × 可进入区域绑定</H2>
              <p className="mt-1 text-xs text-slate-500">
                护具柜发放后，编号与区域权限绑定并同步给场地闸机与管理员看板。
              </p>

              <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs text-slate-500">
                    <tr>
                      <th className="px-4 py-2">护具编号</th>
                      <th className="px-4 py-2">种类</th>
                      <th className="px-4 py-2">状态</th>
                      <th className="px-4 py-2">绑定后可进入</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gearBinding(current).map((g) => (
                      <tr key={g.code} className="border-t border-slate-100">
                        <td className="px-4 py-2 font-mono">{g.code}</td>
                        <td className="px-4 py-2">{g.name}</td>
                        <td className="px-4 py-2">
                          <Badge tone="green">已绑定 {current.name}</Badge>
                        </td>
                        <td className="px-4 py-2">
                          随全套护具开启街式区（高级区另需授权）
                        </td>
                      </tr>
                    ))}
                    {gearBinding(current).length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                          尚未发放任何护具
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-slate-50 p-4">
                <span className="text-sm font-medium text-slate-600">
                  当前实际可进入区域：
                </span>
                <ZoneDots
                  zones={allowedZones(
                    current,
                    state.policies,
                    activeRestrictionsFor(current.id, state.incidents),
                  ).map((z) => ZONE_LABEL[z])}
                />
                {!hasFullGear(current) && (
                  <span className="text-xs font-medium text-amber-700">
                    ⚠ 未领取齐护具（或头盔破损），只能进入基础练习区
                  </span>
                )}
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
