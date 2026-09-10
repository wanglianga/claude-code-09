import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'

export function Card({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}
    >
      {children}
    </div>
  )
}

const TONE: Record<string, string> = {
  slate: 'bg-slate-100 text-slate-700',
  green: 'bg-emerald-100 text-emerald-700',
  amber: 'bg-amber-100 text-amber-800',
  red: 'bg-rose-100 text-rose-700',
  blue: 'bg-sky-100 text-sky-700',
  violet: 'bg-violet-100 text-violet-700',
}

export function Badge({
  children,
  tone = 'slate',
}: {
  children: ReactNode
  tone?: keyof typeof TONE | string
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${TONE[tone] ?? TONE.slate}`}
    >
      {children}
    </span>
  )
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string
  children: ReactNode
  hint?: string
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  )
}

const inputCls =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100'

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputCls} ${props.className ?? ''}`} />
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${inputCls} ${props.className ?? ''}`} />
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputCls} ${props.className ?? ''}`} />
}

export function Button({
  children,
  variant = 'primary',
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'danger' | 'dark'
}) {
  const styles = {
    primary: 'bg-sky-600 text-white hover:bg-sky-700 disabled:bg-slate-300',
    dark: 'bg-ink-900 text-white hover:bg-ink-700 disabled:bg-slate-300',
    danger: 'bg-rose-600 text-white hover:bg-rose-700 disabled:bg-slate-300',
    ghost:
      'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50',
  }
  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  )
}

export function H2({ children }: { children: ReactNode }) {
  return <h2 className="text-lg font-semibold text-slate-800">{children}</h2>
}

export function ZoneDots({ zones }: { zones: string[] }) {
  if (zones.length === 0)
    return <Badge tone="slate">暂无场地权限</Badge>
  return (
    <div className="flex flex-wrap gap-1">
      {zones.map((z) => (
        <Badge key={z} tone={z === 'advanced' ? 'red' : z === 'street' ? 'amber' : 'green'}>
          {z}
        </Badge>
      ))}
    </div>
  )
}
