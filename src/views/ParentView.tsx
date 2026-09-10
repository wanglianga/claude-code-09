import { useState } from 'react'
import { useStore, uid } from '../store'
import { activeRestrictionsFor, allowedZones } from '../engine'
import {
  Child,
  REASON_LABEL,
  SkillLevel,
  ZONE_LABEL,
  ZoneId,
} from '../types'
import {
  Badge,
  Button,
  Card,
  Field,
  H2,
  Input,
  Select,
  Textarea,
  ZoneDots,
} from '../ui'

const SKILL_LABEL: Record<SkillLevel, string> = {
  beginner: '初学（刚上板）',
  intermediate: '进阶（可独立滑行/简单动作）',
  advanced: '高级（熟练 U 池/跳台）',
}

const LOC_OPTIONS: { id: ZoneId | 'lounge' | 'absent'; label: string }[] = [
  { id: 'lounge', label: '家长休息区' },
  { id: 'basic', label: '基础练习区边' },
  { id: 'street', label: '街式区边' },
  { id: 'advanced', label: '高级 U 池区边' },
  { id: 'absent', label: '暂不在现场' },
]

const empty = {
  name: '',
  age: '10',
  skill: 'beginner' as SkillLevel,
  guardianName: '',
  guardianPhone: '',
  emergencyName: '',
  emergencyPhone: '',
  consentAdvanced: false,
  rentGear: true,
  injuryHistory: '',
}

export default function ParentView() {
  const { state, dispatch } = useStore()
  const [form, setForm] = useState({ ...empty })
  const [done, setDone] = useState<string | null>(null)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const child: Child = {
      id: uid('c'),
      name: form.name.trim(),
      age: Number(form.age),
      skill: form.skill,
      guardianName: form.guardianName.trim(),
      guardianPhone: form.guardianPhone.trim(),
      emergencyName: form.emergencyName.trim() || form.guardianName.trim(),
      emergencyPhone: form.emergencyPhone.trim() || form.guardianPhone.trim(),
      consentAdvanced: form.consentAdvanced,
      rentGear: form.rentGear,
      injuryHistory: form.injuryHistory.trim() || '无',
      gateStatus: 'booked',
      gearIssued: [],
      helmetDamaged: false,
      wearing: false,
      parentLoc: { zone: 'lounge', note: '尚未入场', at: Date.now() },
    }
    dispatch({ type: 'ADD_CHILD', child })
    setDone(child.name)
    setForm({ ...empty })
  }

  return (
    <div className="grid gap-5 lg:grid-cols-5">
      {/* 左：预约表单 */}
      <Card className="lg:col-span-2">
        <form onSubmit={submit} className="space-y-4 p-5">
          <H2>📝 为未成年人预约入场</H2>
          <p className="text-xs text-slate-500">
            信息将用于闸口核验、护具柜区域授权与紧急联络。8 岁以下须家长全程陪同。
          </p>

          <div className="grid grid-cols-2 gap-3">
            <Field label="孩子姓名">
              <Input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="如：林小乐"
              />
            </Field>
            <Field label="年龄">
              <Input
                required
                type="number"
                min={5}
                max={17}
                value={form.age}
                onChange={(e) => setForm({ ...form, age: e.target.value })}
              />
            </Field>
          </div>

          <Field label="滑行水平">
            <Select
              value={form.skill}
              onChange={(e) =>
                setForm({ ...form, skill: e.target.value as SkillLevel })
              }
            >
              {Object.entries(SKILL_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </Field>

          <div className="rounded-xl bg-slate-50 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              家长 / 紧急联系人
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="家长姓名">
                <Input
                  required
                  value={form.guardianName}
                  onChange={(e) =>
                    setForm({ ...form, guardianName: e.target.value })
                  }
                />
              </Field>
              <Field label="家长手机">
                <Input
                  required
                  value={form.guardianPhone}
                  onChange={(e) =>
                    setForm({ ...form, guardianPhone: e.target.value })
                  }
                  placeholder="138-0000-0000"
                />
              </Field>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Field label="紧急联系人" hint="不填则同家长">
                <Input
                  value={form.emergencyName}
                  onChange={(e) =>
                    setForm({ ...form, emergencyName: e.target.value })
                  }
                />
              </Field>
              <Field label="紧急联系电话" hint="不填则同家长手机">
                <Input
                  value={form.emergencyPhone}
                  onChange={(e) =>
                    setForm({ ...form, emergencyPhone: e.target.value })
                  }
                />
              </Field>
            </div>
          </div>

          <Field label="历史受伤情况">
            <Textarea
              rows={2}
              value={form.injuryHistory}
              onChange={(e) =>
                setForm({ ...form, injuryHistory: e.target.value })
              }
              placeholder="如：去年手腕轻微扭伤，已痊愈；无则留空"
            />
          </Field>

          <div className="space-y-2">
            <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 p-3 text-sm">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 accent-sky-600"
                checked={form.rentGear}
                onChange={(e) =>
                  setForm({ ...form, rentGear: e.target.checked })
                }
              />
              <span>
                <b>租赁全套护具</b>（头盔 / 护膝 / 护腕）
                <span className="block text-xs text-slate-500">
                  未领取齐护具的孩子只能进入基础练习区
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 p-3 text-sm">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 accent-rose-600"
                checked={form.consentAdvanced}
                onChange={(e) =>
                  setForm({ ...form, consentAdvanced: e.target.checked })
                }
              />
              <span>
                <b>同意进入高级 U 池区</b>
                <span className="block text-xs text-slate-500">
                  仍须：高级滑行水平 + 头盔完好 + 全套护具 + 区域当日开放
                </span>
              </span>
            </label>
          </div>

          <Button type="submit" className="w-full">
            提交预约
          </Button>
          {done && (
            <p className="rounded-lg bg-emerald-50 p-2 text-center text-sm text-emerald-700">
              ✓ 已为 <b>{done}</b> 完成预约，请前往「闸口核验」放行入场
            </p>
          )}
        </form>
      </Card>

      {/* 右：我的孩子 + 伤情通知 */}
      <div className="space-y-5 lg:col-span-3">
        <Card className="p-5">
          <H2>👧 我的孩子 / 预约记录</H2>
          <div className="mt-3 space-y-3">
            {state.children.map((c) => {
              const rest = activeRestrictionsFor(c.id, state.incidents)
              const zones = allowedZones(c, state.policies, rest)
              return (
                <div
                  key={c.id}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <b>{c.name}</b>
                    <span className="text-sm text-slate-500">
                      {c.age} 岁 ·{' '}
                      {SKILL_LABEL[c.skill].split('（')[0]}
                    </span>
                    {c.gateStatus === 'booked' && <Badge tone="amber">待核验</Badge>}
                    {c.gateStatus === 'checked_in' && (
                      <Badge tone="green">● 在场</Badge>
                    )}
                    {c.gateStatus === 'checked_out' && (
                      <Badge tone="slate">已离场</Badge>
                    )}
                    {c.consentAdvanced && <Badge tone="violet">同意高级区</Badge>}
                    {c.rentGear ? (
                      <Badge tone="blue">租赁护具</Badge>
                    ) : (
                      <Badge tone="slate">自备/未租护具</Badge>
                    )}
                  </div>

                  <div className="mt-2 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                    <p>
                      紧急联系人：{c.emergencyName} {c.emergencyPhone}
                    </p>
                    <p>历史受伤：{c.injuryHistory}</p>
                    <p>
                      已领护具：{' '}
                      {c.gearIssued.length
                        ? c.gearIssued
                            .map((g) => `${g.code}`)
                            .join('、')
                        : '—'}
                      {c.helmetDamaged && (
                        <Badge tone="red">头盔破损</Badge>
                      )}
                    </p>
                    <div className="flex items-center gap-2">
                      <span>当前可进入：</span>
                      <ZoneDots
                        zones={zones.map((z) => ZONE_LABEL[z])}
                      />
                    </div>
                  </div>

                  {c.gateStatus === 'checked_in' && (
                    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                      <span className="text-xs text-slate-500">
                        我的陪同位置（同步给管理员/巡场）：
                      </span>
                      <select
                        className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
                        value={c.parentLoc.zone}
                        onChange={(e) =>
                          dispatch({
                            type: 'SET_PARENT_LOC',
                            id: c.id,
                            loc: {
                              zone: e.target
                                .value as ParentLocZone,
                              note:
                                LOC_OPTIONS.find(
                                  (o) => o.id === e.target.value,
                                )?.label ?? '',
                              at: Date.now(),
                            },
                          })
                        }
                      >
                        {LOC_OPTIONS.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {rest && (
                    <div className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">
                      <p className="font-semibold">伤情后的入场限制</p>
                      <ul className="mt-1 list-inside list-disc">
                        <li>
                          当天{rest.canSkateToday ? '可在评估后继续滑' : '停止滑行、建议离场'}
                        </li>
                        {rest.requireReAuthNext && <li>下次入场须重新签署授权</li>}
                        {rest.mustRentGear && <li>必须租赁全套护具</li>}
                        {rest.requireLesson && <li>须先完成教学确认</li>}
                      </ul>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </Card>

        <ParentIncidentNotice />
      </div>
    </div>
  )
}

type ParentLocZone = ZoneId | 'lounge' | 'absent'

/** 家长端收到的伤情通知（具体伤情/现场处理/是否建议离场/复查提示） */
function ParentIncidentNotice() {
  const { state } = useStore()
  const mine = state.incidents.filter((i) => i.resolution)

  if (mine.length === 0) return null

  return (
    <Card className="p-5">
      <H2>🏥 伤情与处置通知</H2>
      <div className="mt-3 space-y-3">
        {mine.map((inc) => {
          const c = state.children.find((x) => x.id === inc.childId)
          const r = inc.resolution!
          return (
            <div
              key={inc.id}
              className="rounded-xl border border-rose-200 bg-rose-50/50 p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <b>{c?.name}</b>
                <Badge tone={inc.severity === 'serious' ? 'red' : inc.severity === 'moderate' ? 'amber' : 'blue'}>
                  {inc.severity === 'serious'
                    ? '较重 · 建议送医'
                    : inc.severity === 'moderate'
                      ? '中度'
                      : '轻微'}
                </Badge>
                <span className="text-xs text-slate-500">
                  事件 {inc.code}
                </span>
                {inc.parentConfirmed ? (
                  <Badge tone="green">家长已确认</Badge>
                ) : (
                  <Badge tone="amber">待家长确认</Badge>
                )}
              </div>
              <p className="mt-2 text-sm text-slate-700">
                <b>具体伤情：</b>
                {inc.reportNote}
              </p>
              <p className="mt-1 text-sm text-slate-700">
                <b>触发情形：</b>
                {inc.reasons.map((x) => REASON_LABEL[x]).join('、')}
              </p>
              <p className="mt-1 text-sm text-slate-700">
                <b>现场处理：</b>
                {r.onSiteTreatment}
              </p>
              <div className="mt-2 flex flex-wrap gap-2 text-sm">
                <Badge tone={r.suggestLeave ? 'red' : 'green'}>
                  {r.suggestLeave ? '建议今天离场休息' : '评估后可短暂停留'}
                </Badge>
                {r.sentToHospital && <Badge tone="red">已呼叫/建议送医</Badge>}
              </div>
              {r.followUp && (
                <p className="mt-2 rounded-lg bg-white p-2 text-sm text-slate-700">
                  <b>后续复查提示：</b>
                  {r.followUp}
                </p>
              )}
              {inc.photo && (
                <img
                  src={inc.photo}
                  alt="现场照片"
                  className="mt-2 h-32 rounded-lg border border-slate-200 object-cover"
                />
              )}
            </div>
          )
        })}
      </div>
    </Card>
  )
}
