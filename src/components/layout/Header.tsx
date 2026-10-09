import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Menu, Search, SlidersHorizontal, User } from 'lucide-react'
import { useData } from '../../store/DataContext'
import { useScoped } from '../../store/useScoped'
import { DATE_PRESETS, presetRange } from '../../services/filters'
import { generateInsights } from '../../services/analytics'
import { Modal, Badge } from '../ui/primitives'
import { FilterPanel } from './FilterBar'
import { useDrill } from '../../utils/nav'

export function Header({ onMenu }: { onMenu: () => void }) {
  const { data, filters, setFilters, mode, exitDemo } = useData()
  const { projects, tx, recognizedAll } = useScoped()
  const nav = useNavigate()
  const { go } = useDrill()
  const [q, setQ] = useState('')
  const [showF, setShowF] = useState(false)
  const [showBell, setShowBell] = useState(false)
  const [focus, setFocus] = useState(false)
  const insights = useMemo(() => generateInsights(tx, projects), [tx, projects])
  const dataEnd = useMemo(() => recognizedAll.reduce((m, t) => (t.date > m ? t.date : m), ''), [recognizedAll])
  const suggestions = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (s.length < 2) return []
    const out: { label: string; kind: string; to: string }[] = []
    projects.filter((p) => p.name.toLowerCase().includes(s) || p.location.toLowerCase().includes(s)).slice(0, 3).forEach((p) => out.push({ label: p.name, kind: 'Project', to: `/projects/${p.id}` }))
    const seen = new Set<string>()
    for (const t of recognizedAll) {
      if (out.length >= 10) break
      if (t.material && t.material.toLowerCase().includes(s) && !seen.has('m' + t.material)) { seen.add('m' + t.material); out.push({ label: t.material, kind: 'Material', to: `/materials/${encodeURIComponent(t.material)}` }) }
      else if (t.workDescription && t.workDescription.toLowerCase().includes(s) && !seen.has('w' + t.workDescription)) { seen.add('w' + t.workDescription); out.push({ label: t.workDescription, kind: 'Work', to: `/work/${encodeURIComponent(t.workDescription)}` }) }
      else if (t.vendor && t.vendor.toLowerCase().includes(s) && !seen.has('v' + t.vendor)) { seen.add('v' + t.vendor); out.push({ label: t.vendor, kind: 'Vendor', to: `/vendors/${encodeURIComponent(t.vendor)}` }) }
    }
    return out
  }, [q, projects, recognizedAll])

  const sel = 'rounded-lg border border-line bg-card px-3 py-2 text-sm text-ink'
  return (
    <header className="no-print sticky top-0 z-30 border-b border-line bg-card/95 backdrop-blur" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      {mode === 'demo' && (
        <div className="flex items-center justify-center gap-3 bg-orange px-3 py-1.5 text-xs font-semibold text-white">DEMO DATA – not your project <button onClick={() => { exitDemo(); nav('/import') }} className="rounded bg-white/20 px-2 py-0.5 hover:bg-white/30">Upload your Excel</button><button onClick={exitDemo} className="underline">Exit demo</button></div>
      )}
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 lg:px-8">
        <button className="rounded-lg p-2 hover:bg-bg lg:hidden" aria-label="Open menu" onClick={onMenu}><Menu size={20} /></button>
        <select aria-label="Project" className={sel} value={filters.projectId} onChange={(e) => setFilters({ projectId: e.target.value })}>
          <option value="all">All Projects</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select aria-label="Date range" className={sel} value={filters.datePreset} onChange={(e) => {
          const id = e.target.value
          if (id === 'custom') setFilters({ datePreset: id })
          else { const r = presetRange(id, dataEnd || undefined); setFilters({ datePreset: id, dateFrom: r.from, dateTo: r.to }) }
        }}>
          {DATE_PRESETS.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
        </select>
        {filters.datePreset === 'custom' && (
          <>
            <input aria-label="From date" type="date" className={sel} value={filters.dateFrom ?? ''} onChange={(e) => setFilters({ dateFrom: e.target.value || null })} />
            <input aria-label="To date" type="date" className={sel} value={filters.dateTo ?? ''} onChange={(e) => setFilters({ dateTo: e.target.value || null })} />
          </>
        )}
        <div className="relative order-last w-full flex-1 md:order-none md:w-auto md:min-w-[260px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => setFocus(true)} onBlur={() => setTimeout(() => setFocus(false), 150)}
            onKeyDown={(e) => { if (e.key === 'Enter' && q.trim()) { setFilters({ search: q.trim() }); go('/expenses'); setQ('') } }}
            placeholder="Search projects, vendors, materials, transactions…" aria-label="Search" className="w-full rounded-lg border border-line bg-bg py-2 pl-9 pr-3 text-sm text-ink placeholder:text-muted" />
          {focus && q.trim().length >= 2 && (
            <div className="absolute z-40 mt-1 w-full overflow-hidden rounded-xl border border-line bg-card shadow-xl">
              {suggestions.map((s) => <button key={s.kind + s.label} onMouseDown={() => { go(s.to); setQ('') }} className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-bg"><span className="truncate">{s.label}</span><Badge>{s.kind}</Badge></button>)}
              <button onMouseDown={() => { setFilters({ search: q.trim() }); go('/expenses'); setQ('') }} className="w-full border-t border-line px-3 py-2 text-left text-sm text-blue hover:bg-bg">Search transactions for “{q.trim()}”</button>
            </div>
          )}
        </div>
        <button onClick={() => setShowF(true)} className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm hover:bg-bg"><SlidersHorizontal size={16} /><span className="hidden sm:inline">Filters</span></button>
        <div className="relative">
          <button aria-label="Alerts" onClick={() => setShowBell(!showBell)} className="relative rounded-lg border border-line p-2 hover:bg-bg"><Bell size={18} />{insights.length > 0 && <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-orange px-1 text-[10px] font-bold text-white">{insights.length}</span>}</button>
          {showBell && (
            <div className="absolute right-0 z-40 mt-2 max-h-96 w-80 overflow-y-auto rounded-xl border border-line bg-card p-2 shadow-xl">
              {insights.length === 0 && <p className="p-3 text-sm text-muted">No alerts for the current data.</p>}
              {insights.map((i) => <button key={i.id} onClick={() => { setShowBell(false); if (i.link) go(i.link) }} className="block w-full rounded-lg p-2 text-left hover:bg-bg"><div className="text-sm font-semibold text-ink">{i.title}</div><div className="text-xs text-muted">{i.detail}</div></button>)}
            </div>
          )}
        </div>
        <div className="hidden items-center gap-2 rounded-lg border border-line px-2 py-1.5 sm:flex"><span className="grid h-7 w-7 place-items-center rounded-full bg-blue-soft text-blue"><User size={15} /></span><span className="pr-1 text-xs leading-tight"><b className="block text-ink">{mode === 'demo' ? 'Demo user' : 'Local workspace'}</b><span className="text-muted">{data.projects.length} project{data.projects.length === 1 ? '' : 's'}</span></span></div>
      </div>
      <Modal open={showF} onClose={() => setShowF(false)} title="Filters" wide><FilterPanel onDone={() => setShowF(false)} /></Modal>
    </header>
  )
}
