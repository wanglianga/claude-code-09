import { useMemo, useRef, useState } from 'react'
import { useStore, uid } from '../store'
import {
  activeRestrictionsFor,
  allowedZones,
  deriveRestrictions as deriveLocal,
  incidentsByZone,
  missingGear,
} from '../engine'
import {
  Alert,
  Child,
  GEAR_LABEL,
  Incident,
  IncidentReason,
  IncidentStage,
  REASON_LABEL,
  Resolution,
  Restrictions,
  Severity,
  ZONE_LABEL,
  ZoneId,
} from '../types'
import { Badge, Button, Card, H2, Textarea, ZoneDots } from '../ui'

const REASONS: IncidentReason[] = [
  'entered_hard_zone',
  'no_gear',
  'fall',
  'helmet_broken',
  'parent_absent',
  'insist_continue',
]

const SEVERITY: { id: Severity; label: string; tone: string }[] = [
  { id: 'minor', label: '轻微（可自行站起）', tone: 'blue' },
  { id: 'moderate', label: '中度（明显疼痛/擦伤）', tone: 'amber' },
  { id: 'serious', label: '较重（疑似骨折/头部）', tone: 'red' },
]

const STAGE_LABEL: Record<IncidentStage, string> = {
  report: '巡场记录',
  photo: '现场照片',
  parent: '家长确认',
  resolution: '处置结果',
}

export default function PatrolView() {
  const { state } = useStore()
  const [staff, setStaff] = useState<'巡场员' | '教练'>('巡场员')
  const [wizardChild, setWizardChild] = useState<Child | null>(null)
  const [openIncident, setOpenIncident] = useState<Incident | null>(null)

  const onSite = state.children.filter((c) => c.gateStatus === 'checked_in')
  const heat = incidentsByZone(state.incidents, state.children)
  const route = (['advanced', 'street', 'basic'] as ZoneId[]).sort(
    (a, b) => heat[b] - heat[a],
  )

  return (
    <div className="space-y-4 pb-10">
      {/* 手机顶栏 */}
      <div className="flex items-center justify-between rounded-2xl bg-ink-900 p-3 text-white">
        <div>
          <p className="text-sm font-bold">巡场移动端</p>
          <p className="text-[11px] text-slate-300">
            在岗：{staff} · 在场 {onSite.length} 名未成年人
          </p>
        </div>
        <div className="flex rounded-lg bg-white/10 p-0.5 text-xs">
          {(['巡场员', '教练'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStaff(s)}
              className={`rounded-md px-3 py-1.5 ${
                staff === s ? 'bg-white text-ink-900' : 'text-slate-200'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* 巡场路线（按伤情集中区域） */}
      <Card className="p-4">
        <p className="text-sm font-semibold">🧭 今日巡场路线（按伤情热度排序）</p>
        <div className="mt-2 space-y-1.5">
          {route.map((z, idx) => {
            const p = state.policies[z]
            return (
              <div
                key={z}
                className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"
              >
                <span>
                  {idx + 1}. {ZONE_LABEL[z]}
                  <span className="ml-2 text-xs text-slate-400">
                    伤情 {heat[z]} 起
                  </span>
                </span>
                <span className="flex gap-1">
                  {!p.open && <Badge tone="slate">区域关闭</Badge>}
                  {p.patrolBoost && <Badge tone="red">加强巡场</Badge>}
                </span>
              </div>
            )
          })}
        </div>
      </Card>

      {/* 未关闭提醒 */}
      <AlertStrip
        onOpenIncident={(inc) => setOpenIncident(inc)}
        onNewIncident={(c) => setWizardChild(c)}
      />

      {/* 在场孩子快捷操作 */}
      <div className="space-y-3">
        {onSite.map((c) => {
          const rest = activeRestrictionsFor(c.id, state.incidents)
          const zones = allowedZones(c, state.policies, rest)
          const activeInc = state.incidents.find(
            (i) => i.childId === c.id && !i.resolution,
          )
          return (
            <Card key={c.id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">
                    {c.name}{' '}
                    <span className="text-xs font-normal text-slate-500">
                      {c.age} 岁 · {c.parentLoc.note}
                    </span>
                  </p>
                  <div className="mt-1">
                    <ZoneDots zones={zones.map((z) => ZONE_LABEL[z])} />
                  </div>
                </div>
                <Badge tone={c.parentLoc.zone === 'absent' ? 'red' : 'blue'}>
                  家长：
                  {c.parentLoc.zone === 'absent'
                    ? '不在现场'
                    : c.parentLoc.zone === 'lounge'
                      ? '休息区'
                      : '场边陪同'}
                </Badge>
              </div>

              <div className="mt-2 flex flex-wrap gap-1 text-xs">
                <Badge tone={c.wearing ? 'green' : 'red'}>
                  {c.wearing ? '护具穿戴中' : `未规范穿戴（缺 ${missingGear(c).join('、') || '—'}）`}
                </Badge>
                {c.helmetDamaged && <Badge tone="red">头盔破损</Badge>}
                {activeInc && (
                  <Badge tone="amber">
                    伤情 {activeInc.code} 处置中（{STAGE_LABEL[activeInc.stage]}）
                  </Badge>
                )}
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button
                  variant="ghost"
                  className="text-xs"
                  onClick={() => setWizardChild(c)}
                >
                  ⚠ 发起提醒
                </Button>
                <Button
                  variant="danger"
                  className="text-xs"
                  onClick={() => setWizardChild(c)}
                >
                  🩹 伤情记录
                </Button>
              </div>
              {activeInc && (
                <button
                  onClick={() => setOpenIncident(activeInc)}
                  className="mt-2 w-full rounded-lg bg-amber-50 py-2 text-xs font-medium text-amber-700"
                >
                  继续处置 {activeInc.code} →
                </button>
              )}
            </Card>
          )
        })}
      </div>

      {wizardChild && (
        <IncidentWizard
          child={wizardChild}
          staff={staff}
          onClose={() => setWizardChild(null)}
        />
      )}
      {openIncident && (
        <IncidentWizard
          child={state.children.find((c) => c.id === openIncident.childId)!}
          staff={staff}
          existing={openIncident}
          onClose={() => setOpenIncident(null)}
        />
      )}
    </div>
  )
}

function AlertStrip({
  onOpenIncident,
  onNewIncident,
}: {
  onOpenIncident: (i: Incident) => void
  onNewIncident: (c: Child) => void
}) {
  const { state, dispatch } = useStore()
  const open = state.alerts.filter((a) => !a.resolved)
  if (open.length === 0) return null
  return (
    <Card className="border-amber-300 p-4">
      <p className="text-sm font-semibold text-amber-800">🔔 未关闭提醒</p>
      <div className="mt-2 space-y-2">
        {open.map((a) => {
          const c = state.children.find((x) => x.id === a.childId)
          return (
            <div
              key={a.id}
              className="rounded-lg bg-amber-50 p-2 text-xs text-amber-900"
            >
              <p>
                <b>{c?.name}</b> · {REASON_LABEL[a.reason]} · {a.detail}
              </p>
              <div className="mt-1 flex gap-2">
                <button
                  className="font-medium underline"
                  onClick={() => dispatch({ type: 'RESOLVE_ALERT', id: a.id })}
                >
                  已劝导/关闭
                </button>
                {c && c.gateStatus === 'checked_in' && (
                  <button
                    className="font-medium text-rose-600 underline"
                    onClick={() => {
                      const inc = state.incidents.find(
                        (i) => i.childId === c.id && !i.resolution,
                      )
                      if (inc) onOpenIncident(inc)
                      else onNewIncident(c)
                    }}
                  >
                    升级为伤情记录
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

// ================= 伤情四步向导 =================

function IncidentWizard({
  child,
  staff,
  existing,
  onClose,
}: {
  child: Child
  staff: string
  existing?: Incident
  onClose: () => void
}) {
  const { state, dispatch } = useStore()

  const [mode, setMode] = useState<'alert' | 'injury'>(
    existing ? 'injury' : 'injury',
  )
  const [reasons, setReasons] = useState<IncidentReason[]>(
    existing?.reasons ?? ['fall'],
  )
  const [severity, setSeverity] = useState<Severity>(existing?.severity ?? 'minor')
  const [note, setNote] = useState(existing?.reportNote ?? '')
  const [alertDetail, setAlertDetail] = useState('')

  const [photo, setPhoto] = useState(existing?.photo)
  const [caption, setCaption] = useState(existing?.photoCaption ?? '')

  const [parentConfirmed, setParentConfirmed] = useState(
    existing?.parentConfirmed ?? false,
  )
  const [parentNote, setParentNote] = useState(existing?.parentConfirmNote ?? '')

  const incId = useRef(existing?.id ?? uid('i'))
  const incCode = useRef(
    existing?.code ??
      `INJ-${2400 + state.incidents.length + Math.floor(Math.random() * 50)}`,
  )

  // 始终读 store 中的最新事件（existing 仅用于拿到 id），避免快照导致阶段不推进
  const incident: Incident | undefined = state.incidents.find(
    (i) => i.id === (existing?.id ?? incId.current),
  )

  const stage: IncidentStage = incident?.stage ?? 'report'
  const fileRef = useRef<HTMLInputElement>(null)

  const gearSnapshot = useMemo(
    () => child.gearIssued.filter((g) => !(g.type === 'helmet' && child.helmetDamaged)).map((g) => g.type),
    [child],
  )

  function toggleReason(r: IncidentReason) {
    setReasons((rs) => (rs.includes(r) ? rs.filter((x) => x !== r) : [...rs, r]))
  }

  // 第 1 步：仅发提醒
  function submitAlert() {
    const alert: Alert = {
      id: uid('a'),
      childId: child.id,
      reason: reasons[0] ?? 'no_gear',
      detail: alertDetail || '现场发现违规/风险，已口头提醒。',
      at: Date.now(),
      resolved: false,
    }
    dispatch({ type: 'ADD_ALERT', alert })
    onClose()
  }

  // 第 1 步：创建/更新伤情
  function submitReport() {
    if (reasons.length === 0) {
      alert('请至少选择一个触发情形')
      return
    }
    if (!note.trim()) {
      alert('请填写巡场员现场记录')
      return
    }
    const payload: Incident = {
      id: incId.current,
      code: incCode.current,
      childId: child.id,
      reasons,
      severity,
      reporter: staff,
      reportNote: note.trim(),
      gearSnapshot,
      stage: 'photo',
      parentConfirmed: false,
      parentConfirmNote: '',
      createdAt: existing?.createdAt ?? Date.now(),
    }
    if (existing) {
      dispatch({
        type: 'UPDATE_INCIDENT',
        id: existing.id,
        patch: { reasons, severity, reporter: staff, reportNote: note.trim(), gearSnapshot },
      })
    } else if (incident) {
      dispatch({ type: 'UPDATE_INCIDENT', id: incId.current, patch: payload })
    } else {
      dispatch({ type: 'CREATE_INCIDENT', incident: payload })
    }
    // 头盔破损即时影响护具状态
    if (reasons.includes('helmet_broken') && !child.helmetDamaged) {
      dispatch({ type: 'MARK_HELMET_DAMAGED', id: child.id })
    }
  }

  function submitPhoto() {
    dispatch({
      type: 'UPDATE_INCIDENT',
      id: incId.current,
      patch: { photo, photoCaption: caption, stage: 'parent' },
    })
  }

  function submitParent() {
    dispatch({
      type: 'UPDATE_INCIDENT',
      id: incId.current,
      patch: {
        parentConfirmed,
        parentConfirmNote: parentNote,
        stage: 'resolution',
      },
    })
  }

  // ====== 顶部模式切换（仅未建档时） ======
  if (!existing && !incident) {
    return (
      <Shell title={`${child.name} · 现场处置`} onClose={onClose}>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setMode('alert')}
            className={`rounded-xl border-2 p-4 text-left ${
              mode === 'alert' ? 'border-amber-400 bg-amber-50' : 'border-slate-200'
            }`}
          >
            <p className="text-lg">⚠</p>
            <p className="text-sm font-semibold">发起提醒</p>
            <p className="text-xs text-slate-500">
              进入高难度区 / 未佩戴护具，劝导纠正
            </p>
          </button>
          <button
            onClick={() => setMode('injury')}
            className={`rounded-xl border-2 p-4 text-left ${
              mode === 'injury' ? 'border-rose-400 bg-rose-50' : 'border-slate-200'
            }`}
          >
            <p className="text-lg">🩹</p>
            <p className="text-sm font-semibold">伤情记录</p>
            <p className="text-xs text-slate-500">
              摔倒 / 头盔破损 / 家长不在 / 坚持继续 / 送医
            </p>
          </button>
        </div>

        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium">触发情形（可多选）</p>
          <div className="flex flex-wrap gap-2">
            {REASONS.map((r) => (
              <button
                key={r}
                onClick={() => toggleReason(r)}
                className={`rounded-full border px-3 py-1 text-xs ${
                  reasons.includes(r)
                    ? 'border-sky-500 bg-sky-50 text-sky-700'
                    : 'border-slate-300 text-slate-600'
                }`}
              >
                {REASON_LABEL[r]}
              </button>
            ))}
          </div>
        </div>

        {mode === 'alert' ? (
          <div className="mt-4">
            <Textarea
              rows={3}
              value={alertDetail}
              onChange={(e) => setAlertDetail(e.target.value)}
              placeholder="记录提醒内容，如：孩子未穿护膝试图上街式杆，已劝回基础区。"
            />
            <Button className="mt-3 w-full" onClick={submitAlert}>
              发送提醒（家长端/管理员可见）
            </Button>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <div>
              <p className="mb-1 text-sm font-medium">初步伤情判断</p>
              <div className="space-y-2">
                {SEVERITY.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSeverity(s.id)}
                    className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
                      severity === s.id
                        ? 'border-rose-400 bg-rose-50'
                        : 'border-slate-200'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <Textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="巡场员记录：摔倒部位、孩子反应、是否撞到头部等"
            />
            <div className="rounded-lg bg-slate-50 p-2 text-xs text-slate-500">
              事发时护具快照：
              {gearSnapshot.length
                ? gearSnapshot.map((g) => GEAR_LABEL[g]).join('、')
                : '未穿戴任何护具'}
            </div>
            <Button variant="danger" className="w-full" onClick={submitReport}>
              下一步：拍摄现场照片 →
            </Button>
          </div>
        )}
      </Shell>
    )
  }

  // ====== 已建档：按 stage 渲染第 2~4 步 ======
  const current = incident!
  return (
    <Shell
      title={`伤情 ${current.code} · ${child.name}`}
      onClose={onClose}
      steps={['巡场记录', '现场照片', '家长确认', '处置结果']}
      activeStage={current.stage}
    >
      {current.stage === 'photo' && (
        <PhotoStep
          photo={photo}
          caption={caption}
          setCaption={setCaption}
          setPhoto={setPhoto}
          fileRef={fileRef}
          onNext={submitPhoto}
        />
      )}

      {current.stage === 'parent' && (
        <ParentStep
          child={child}
          parentConfirmed={parentConfirmed}
          setParentConfirmed={setParentConfirmed}
          parentNote={parentNote}
          setParentNote={setParentNote}
          reasons={current.reasons}
          onNext={submitParent}
        />
      )}

      {current.stage === 'resolution' && (
        <ResolutionStep
          child={child}
          incident={current}
          onClose={onClose}
        />
      )}
    </Shell>
  )
}

// ---------- 第 2 步：现场照片 ----------
function PhotoStep({
  photo,
  setPhoto,
  caption,
  setCaption,
  fileRef,
  onNext,
}: {
  photo?: string
  setPhoto: (s?: string) => void
  caption: string
  setCaption: (s: string) => void
  fileRef: React.RefObject<HTMLInputElement>
  onNext: () => void
}) {
  function read(f: File) {
    const reader = new FileReader()
    reader.onload = () => {
      // 压缩到最大 480px，避免 localStorage 超限
      const img = new Image()
      img.onload = () => {
        const scale = Math.min(1, 480 / Math.max(img.width, img.height))
        const cv = document.createElement('canvas')
        cv.width = img.width * scale
        cv.height = img.height * scale
        cv.getContext('2d')!.drawImage(img, 0, 0, cv.width, cv.height)
        setPhoto(cv.toDataURL('image/jpeg', 0.7))
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(f)
  }

  function fakeShot() {
    const cv = document.createElement('canvas')
    cv.width = 320
    cv.height = 200
    const ctx = cv.getContext('2d')!
    ctx.fillStyle = '#94a3b8'
    ctx.fillRect(0, 0, 320, 200)
    ctx.fillStyle = '#0f1b2d'
    ctx.font = 'bold 16px sans-serif'
    ctx.fillText('现场示意图（演示）', 80, 100)
    ctx.font = '12px sans-serif'
    ctx.fillText(new Date().toLocaleString('zh-CN'), 90, 124)
    setPhoto(cv.toDataURL('image/jpeg', 0.7))
  }

  return (
    <div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && read(e.target.files[0])}
      />
      {photo ? (
        <img src={photo} alt="现场" className="w-full rounded-xl border" />
      ) : (
        <div className="flex h-40 items-center justify-center rounded-xl border-2 border-dashed border-slate-300 text-sm text-slate-400">
          暂无照片
        </div>
      )}
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Button variant="ghost" onClick={() => fileRef.current?.click()}>
          📷 拍照/上传
        </Button>
        <Button variant="ghost" onClick={fakeShot}>
          使用示意照片
        </Button>
      </div>
      <Textarea
        className="mt-3"
        rows={2}
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        placeholder="照片说明：拍摄角度 / 着地位置 / 涉事物件"
      />
      <Button className="mt-3 w-full" onClick={onNext}>
        下一步：联系家长确认 →
      </Button>
    </div>
  )
}

// ---------- 第 3 步：家长确认 ----------
function ParentStep({
  child,
  parentConfirmed,
  setParentConfirmed,
  parentNote,
  setParentNote,
  reasons,
  onNext,
}: {
  child: Child
  parentConfirmed: boolean
  setParentConfirmed: (b: boolean) => void
  parentNote: string
  setParentNote: (s: string) => void
  reasons: IncidentReason[]
  onNext: () => void
}) {
  const absent =
    reasons.includes('parent_absent') || child.parentLoc.zone === 'absent'
  const insist = reasons.includes('insist_continue')
  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-slate-50 p-3 text-sm">
        <p>
          <b>陪同家长：</b>
          {child.guardianName} {child.guardianPhone}
        </p>
        <p>
          <b>紧急联系人：</b>
          {child.emergencyName} {child.emergencyPhone}
        </p>
        <p className="mt-1">
          <b>定位：</b>
          {child.parentLoc.note}
        </p>
      </div>

      {absent && (
        <div className="rounded-lg bg-rose-50 p-2 text-xs text-rose-700">
          ⚠ 家长不在现场：已拨打陪同家长与紧急联系人电话，等待到场/远程确认。
        </div>
      )}
      {insist && (
        <div className="rounded-lg bg-amber-50 p-2 text-xs text-amber-800">
          ⚠ 孩子坚持继续滑行：须由家长知情确认，较重伤情一律先停止滑行。
        </div>
      )}

      <label className="flex items-start gap-2 rounded-lg border border-slate-200 p-3 text-sm">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 accent-sky-600"
          checked={parentConfirmed}
          onChange={(e) => setParentConfirmed(e.target.checked)}
        />
        <span>
          已联系家长，<b>家长已知情并确认</b>现场处置方案
          <span className="block text-xs text-slate-500">
            无法到场时可电话确认，请在下方记录通话内容
          </span>
        </span>
      </label>
      <Textarea
        rows={2}
        value={parentNote}
        onChange={(e) => setParentNote(e.target.value)}
        placeholder="家长确认记录：如 15:42 电话接通，母亲要求先冰敷观察、到场后接走。"
      />
      <Button className="w-full" onClick={onNext}>
        下一步：填写处置结果 →
      </Button>
    </div>
  )
}

// ---------- 第 4 步：处置结果（规则引擎 + 家长通知预览） ----------
function ResolutionStep({
  child,
  incident,
  onClose,
}: {
  child: Child
  incident: Incident
  onClose: () => void
}) {
  const { state, dispatch } = useStore()
  const suggested = deriveLocal(incident.severity, incident.reasons)
  const [treatment, setTreatment] = useState('')
  const [suggestLeave, setSuggestLeave] = useState(!suggested.canSkateToday)
  const [hospital, setHospital] = useState(incident.severity === 'serious')
  const [followUp, setFollowUp] = useState('')
  const [r, setR] = useState<Restrictions>(suggested)
  const [done, setDone] = useState(false)

  function submit() {
    if (!treatment.trim()) {
      alert('请填写现场处理')
      return
    }
    if (!incident.parentConfirmed && incident.severity !== 'minor') {
      if (!confirm('家长尚未确认，确认仍要结束处置？')) return
    }
    const finalRest: Restrictions = {
      ...r,
      canSkateToday: !suggestLeave && !hospital ? r.canSkateToday : false,
    }
    const resolution: Resolution = {
      onSiteTreatment: treatment.trim(),
      suggestLeave,
      sentToHospital: hospital,
      followUp: followUp.trim(),
      restrictions: finalRest,
      at: Date.now(),
    }
    dispatch({
      type: 'RESOLVE_INCIDENT',
      id: incident.id,
      resolution,
    })
    // 处置联动：停止滑行 → 收回场内位置到基础区；头盔破损已在记录时处理
    if (!finalRest.canSkateToday) {
      dispatch({ type: 'SET_ZONE', id: child.id, zone: 'basic' })
      dispatch({ type: 'SET_WEARING', id: child.id, wearing: false })
    }
    // 根据伤情集中度自动加强该区域巡场
    const zone = child.zone
    if (zone && incident.severity !== 'minor') {
      dispatch({ type: 'TOGGLE_BOOST', zone, boost: true })
    }
    setDone(true)
  }

  if (done) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl bg-emerald-50 p-4 text-center text-emerald-700">
          <p className="text-2xl">✅</p>
          <p className="font-semibold">伤情事件已闭环</p>
          <p className="text-xs">
            处置结果、限制与复查提示已推送家长端；管理员看板与区域策略已更新。
          </p>
        </div>
        <ParentPushPreview
          child={child}
          incident={incident}
          treatment={treatment}
          suggestLeave={suggestLeave}
          hospital={hospital}
          followUp={followUp}
          r={r}
        />
        <Button className="w-full" onClick={onClose}>
          完成
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium">现场处理</p>
        <Textarea
          rows={3}
          value={treatment}
          onChange={(e) => setTreatment(e.target.value)}
          placeholder="如：立即停止滑行，冰敷右膝 15 分钟，碘伏消毒擦伤，观察意识反应。"
        />
      </div>

      <label className="flex items-center gap-2 rounded-lg border border-slate-200 p-2.5 text-sm">
        <input
          type="checkbox"
          className="h-4 w-4 accent-rose-600"
          checked={suggestLeave}
          onChange={(e) => setSuggestLeave(e.target.checked)}
        />
        建议今天离场休息
      </label>
      <label className="flex items-center gap-2 rounded-lg border border-slate-200 p-2.5 text-sm">
        <input
          type="checkbox"
          className="h-4 w-4 accent-rose-600"
          checked={hospital}
          onChange={(e) => setHospital(e.target.checked)}
        />
        需要送医 / 已呼叫 120
      </label>

      <div>
        <p className="text-sm font-medium">后续复查提示</p>
        <Textarea
          rows={2}
          value={followUp}
          onChange={(e) => setFollowUp(e.target.value)}
          placeholder="如：48 小时内局部冷敷，若肿痛加剧及时骨科就诊；头部撞击需观察 24 小时。"
        />
      </div>

      <div className="rounded-xl border border-sky-200 bg-sky-50 p-3">
        <p className="text-sm font-semibold text-sky-800">
          对入场资格的影响（按伤情规则预填，可调整）
        </p>
        <div className="mt-2 space-y-1.5 text-sm">
          <ToggleRestrict
            label="当天还能继续滑"
            checked={r.canSkateToday}
            onChange={(v) => setR({ ...r, canSkateToday: v })}
            disabled={suggestLeave || hospital}
          />
          <ToggleRestrict
            label="下次入场须家长重新授权"
            checked={r.requireReAuthNext}
            onChange={(v) => setR({ ...r, requireReAuthNext: v })}
          />
          <ToggleRestrict
            label="下次必须租赁全套护具"
            checked={r.mustRentGear}
            onChange={(v) => setR({ ...r, mustRentGear: v })}
          />
          <ToggleRestrict
            label="须先完成教学确认才能再入场"
            checked={r.requireLesson}
            onChange={(v) => setR({ ...r, requireLesson: v })}
          />
        </div>
        <p className="mt-2 text-xs text-sky-700">
          勾选「建议离场/送医」时，当天继续滑自动收回；区域巡场将按伤情集中度自动加强。
        </p>
      </div>

      <Button variant="danger" className="w-full" onClick={submit}>
        结束处置并推送家长
      </Button>
    </div>
  )
}

function ToggleRestrict({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <label
      className={`flex items-center gap-2 ${disabled ? 'opacity-50' : ''}`}
    >
      <input
        type="checkbox"
        className="h-4 w-4 accent-sky-600"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  )
}

function ParentPushPreview({
  child,
  incident,
  treatment,
  suggestLeave,
  hospital,
  followUp,
  r,
}: {
  child: Child
  incident: Incident
  treatment: string
  suggestLeave: boolean
  hospital: boolean
  followUp: string
  r: Restrictions
}) {
  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3 text-xs text-slate-700">
      <p className="font-semibold text-rose-700">📲 家长端推送预览</p>
      <p className="mt-1">
        {child.guardianName}您好，{child.name} 的事件 {incident.code}：
        {incident.reportNote}
      </p>
      <p className="mt-1">现场处理：{treatment}</p>
      <p className="mt-1">
        {suggestLeave ? '建议今天离场休息。' : '评估后可短暂停留观察。'}
        {hospital && ' 已安排送医，请立即前往对接医院。'}
      </p>
      {followUp && <p className="mt-1">复查提示：{followUp}</p>}
      <p className="mt-1">
        后续入场：
        {r.canSkateToday ? '' : '今天停止滑行；'}
        {r.requireReAuthNext && '下次需重新授权；'}
        {r.mustRentGear && '必须租赁护具；'}
        {r.requireLesson && '先完成教学确认。'}
      </p>
    </div>
  )
}

// ---------- 弹层外壳 ----------
function Shell({
  title,
  children,
  onClose,
  steps,
  activeStage,
}: {
  title: string
  children: React.ReactNode
  onClose: () => void
  steps?: string[]
  activeStage?: IncidentStage
}) {
  const order: IncidentStage[] = ['report', 'photo', 'parent', 'resolution']
  const activeIdx = activeStage ? order.indexOf(activeStage) : 0
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-4 shadow-xl sm:rounded-2xl">
        <div className="mb-3 flex items-center justify-between">
          <H2>{title}</H2>
          <button
            onClick={onClose}
            className="rounded-full px-2 text-xl text-slate-400 hover:bg-slate-100"
          >
            ×
          </button>
        </div>

        {steps && (
          <div className="mb-4">
            <div className="flex justify-between text-[10px] text-slate-500">
              {steps.map((s, i) => (
                <div key={s} className="flex-1 text-center">
                  <div
                    className={`mx-auto flex h-6 w-6 items-center justify-center rounded-full text-[10px] ${
                      i <= activeIdx
                        ? 'bg-rose-500 text-white'
                        : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {i + 1}
                  </div>
                  <span className="mt-0.5 block">{s}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {children}
      </div>
    </div>
  )
}
