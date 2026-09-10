import { useState } from 'react'
import { Role } from './types'
import { useStore } from './store'
import ParentView from './views/ParentView'
import GateView from './views/GateView'
import LockerView from './views/LockerView'
import AdminView from './views/AdminView'
import PatrolView from './views/PatrolView'

const ROLES: { id: Role; name: string; icon: string; desc: string }[] = [
  { id: 'parent', name: '家长端', icon: '👨‍👩‍👧', desc: '预约 / 授权 / 伤情通知' },
  { id: 'gate', name: '闸口核验', icon: '🚦', desc: '核验放行入场' },
  { id: 'locker', name: '护具柜', icon: '🪖', desc: '发放并绑定区域权限' },
  { id: 'admin', name: '场地管理员', icon: '🗺️', desc: '在场看板与区域策略' },
  { id: 'patrol', name: '巡场/教练', icon: '📱', desc: '移动端提醒与伤情处置' },
]

export default function App() {
  const [role, setRole] = useState<Role>('admin')
  const { dispatch } = useStore()

  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-ink-900 text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🛹</span>
            <div>
              <h1 className="text-base font-bold leading-tight">
                城市滑板公园 · 未成年人入场与伤情处置
              </h1>
              <p className="text-[11px] text-slate-300">
                预约 → 闸口核验 → 护具绑定区域 → 在场看板 → 巡场提醒/伤情串联 → 家长通知
              </p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => {
                if (confirm('重置为演示数据？当前操作记录将被清除。'))
                  dispatch({ type: 'RESET' })
              }}
              className="rounded-lg border border-white/30 px-3 py-1.5 text-xs hover:bg-white/10"
            >
              ↺ 重置演示数据
            </button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-2 pb-2">
          {ROLES.map((r) => (
            <button
              key={r.id}
              onClick={() => setRole(r.id)}
              className={`whitespace-nowrap rounded-t-lg px-3 py-2 text-sm font-medium transition ${
                role === r.id
                  ? 'bg-slate-100 text-ink-900'
                  : 'text-slate-300 hover:bg-white/10'
              }`}
            >
              <span className="mr-1">{r.icon}</span>
              {r.name}
            </button>
          ))}
        </nav>
      </header>

      <main
        className={
          role === 'patrol'
            ? 'mx-auto max-w-md px-3 py-4'
            : 'mx-auto max-w-7xl px-4 py-5'
        }
      >
        <p className="mb-3 text-xs text-slate-500">
          {ROLES.find((r) => r.id === role)?.desc}
        </p>
        {role === 'parent' && <ParentView />}
        {role === 'gate' && <GateView />}
        {role === 'locker' && <LockerView />}
        {role === 'admin' && <AdminView />}
        {role === 'patrol' && <PatrolView />}
      </main>

      <footer className="mx-auto max-w-7xl px-4 py-8 text-center text-xs text-slate-400">
        演示系统 · 数据保存在浏览器本地（localStorage）· 角色切换用于评审全流程
      </footer>
    </div>
  )
}
