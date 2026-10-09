import { Link, useLocation } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { parentOf, useTitleFor, type Crumb } from '../../utils/nav'

export function Breadcrumbs() {
  const loc = useLocation()
  const titleFor = useTitleFor()
  if (loc.pathname === '/') return null
  const state = (loc.state as { trail?: Crumb[] } | null)?.trail
  let items: Crumb[]
  if (state && state.length) items = [...state]
  else { const p = parentOf(loc.pathname); items = [{ label: 'Dashboard', to: '/' }, ...(p ? [p] : [])] }
  if (items[0]?.to !== '/') items.unshift({ label: 'Dashboard', to: '/' })
  const seen = new Set<string>()
  items = items.filter((c) => !seen.has(c.to) && !!seen.add(c.to))
  return (
    <nav aria-label="Breadcrumb" className="no-print mb-3 flex flex-wrap items-center gap-1 text-sm text-muted">
      {items.map((c, i) => {
        const idx = state?.findIndex((s) => s.to === c.to) ?? -1
        const keep = idx >= 0 ? state!.slice(0, idx) : []
        return (<span key={c.to} className="flex items-center gap-1"><Link to={c.to} state={{ trail: keep }} className="hover:text-blue hover:underline">{c.label}</Link><ChevronRight size={14} /></span>)
      })}
      <span className="font-medium text-ink">{titleFor(loc.pathname)}</span>
    </nav>
  )
}
