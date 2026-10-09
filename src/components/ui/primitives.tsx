import { useEffect, useRef, useState, type ReactNode } from 'react'
import { X, ChevronDown, Search } from 'lucide-react'

export const Card = ({ children, className = '', ...rest }: { children: ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) => (
  <div {...rest} className={`rounded-2xl border border-line bg-card shadow-card ${className}`}>{children}</div>
)
export const SectionTitle = ({ title, sub, right }: { title: string; sub?: string; right?: ReactNode }) => (
  <div className="flex flex-wrap items-start justify-between gap-2 px-5 pt-4">
    <div><h2 className="text-[15px] font-semibold text-ink">{title}</h2>{sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}</div>
    {right}
  </div>
)
export const Btn = ({ children, kind = 'ghost', className = '', ...p }: { kind?: 'primary' | 'ghost' | 'danger' | 'accent' } & React.ButtonHTMLAttributes<HTMLButtonElement>) => {
  const k = { primary: 'bg-blue text-white hover:opacity-90', accent: 'bg-orange text-white hover:opacity-90', ghost: 'border border-line bg-card text-ink hover:bg-bg', danger: 'border border-red text-red hover:bg-red-soft' }[kind]
  return <button {...p} className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition disabled:opacity-50 ${k} ${className}`}>{children}</button>
}
export const Badge = ({ children, tone = 'slate' }: { children: ReactNode; tone?: 'blue' | 'orange' | 'green' | 'red' | 'slate' }) => {
  const t = { blue: 'bg-blue-soft text-blue', orange: 'bg-orange-soft text-orange', green: 'bg-green-soft text-green', red: 'bg-red-soft text-red', slate: 'bg-bg text-muted border border-line' }[tone]
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${t}`}>{children}</span>
}
export const Empty = ({ title, text, action }: { title: string; text: string; action?: ReactNode }) => (
  <div className="flex flex-col items-center px-6 py-12 text-center"><h3 className="text-base font-semibold text-ink">{title}</h3><p className="mt-1 max-w-md text-sm text-muted">{text}</p>{action && <div className="mt-4">{action}</div>}</div>
)

export function useCountUp(target: number, ms = 600) {
  const [v, setV] = useState(target)
  const from = useRef(target)
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { setV(target); return }
    const start = performance.now(), a = from.current
    let raf = 0
    const step = (t: number) => {
      const k = Math.min(1, (t - start) / ms), e = 1 - Math.pow(1 - k, 3)
      setV(a + (target - a) * e)
      if (k < 1) raf = requestAnimationFrame(step); else from.current = target
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, ms])
  return v
}

export function KPICard({ label, value, format, sub, onClick, tone = 'blue', icon }: {
  label: string; value: number; format: (n: number) => string; sub?: string; onClick?: () => void
  tone?: 'blue' | 'orange' | 'green' | 'red' | 'slate'; icon?: ReactNode
}) {
  const v = useCountUp(value)
  const bar = { blue: 'bg-blue', orange: 'bg-orange', green: 'bg-green', red: 'bg-red', slate: 'bg-muted' }[tone]
  return (
    <button onClick={onClick} disabled={!onClick} className="group relative overflow-hidden rounded-2xl border border-line bg-card p-4 text-left shadow-card transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-default disabled:hover:translate-y-0">
      <span className={`absolute inset-y-0 left-0 w-1 ${bar}`} />
      <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-muted"><span>{label}</span>{icon}</div>
      <div className="num mt-2 text-2xl font-bold text-ink">{format(v)}</div>
      {sub && <div className="mt-1 text-xs text-muted group-hover:text-blue">{sub}</div>}
    </button>
  )
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" style={{ animation: 'fadeIn .15s' }} onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} onMouseDown={(e) => e.stopPropagation()} style={{ animation: 'sheetIn .2s' }}
        className={`max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border border-line bg-card shadow-xl sm:rounded-2xl ${wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'}`}>
        <div className="sticky top-0 flex items-center justify-between border-b border-line bg-card px-5 py-3"><h3 className="font-semibold text-ink">{title}</h3><button aria-label="Close" onClick={onClose} className="rounded p-1 text-muted hover:bg-bg"><X size={18} /></button></div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

export function MultiSelect({ label, options, value, onChange }: { label: string; options: string[]; value: string[]; onChange: (v: string[]) => void }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false)
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  const shown = options.filter((o) => o.toLowerCase().includes(q.toLowerCase())).slice(0, 200)
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between gap-2 rounded-lg border border-line bg-card px-3 py-2 text-sm text-ink">
        <span className="truncate">{label}{value.length ? <b className="ml-1 text-blue">({value.length})</b> : ''}</span><ChevronDown size={14} className="shrink-0 text-muted" />
      </button>
      {open && (
        <div className="absolute z-30 mt-1 w-64 rounded-xl border border-line bg-card p-2 shadow-xl">
          <div className="mb-2 flex items-center gap-2 rounded-lg border border-line px-2"><Search size={14} className="text-muted" /><input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="w-full bg-transparent py-1.5 text-sm outline-none" /></div>
          <div className="max-h-56 overflow-y-auto">
            {shown.length === 0 && <p className="p-2 text-xs text-muted">No options in the current data.</p>}
            {shown.map((o) => (
              <label key={o} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-bg">
                <input type="checkbox" checked={value.includes(o)} onChange={() => onChange(value.includes(o) ? value.filter((x) => x !== o) : [...value, o])} className="accent-[var(--blue)]" />
                <span className="truncate">{o}</span>
              </label>
            ))}
          </div>
          {value.length > 0 && <button onClick={() => onChange([])} className="mt-1 w-full rounded px-2 py-1 text-left text-xs text-blue hover:bg-bg">Clear selection</button>}
        </div>
      )}
    </div>
  )
}
