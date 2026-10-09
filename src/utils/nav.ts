import { useLocation, useNavigate } from 'react-router-dom'
import { useData } from '../store/DataContext'
import { fmtDate, fmtMonth } from './format'
import type { Filters } from '../services/filters'

export interface Crumb { label: string; to: string }
const ROOTS: Record<string, string> = {
  '': 'Dashboard', projects: 'Projects', expenses: 'Expenses', materials: 'Materials', labour: 'Labour', work: 'Work Analysis',
  vendors: 'Vendors', cashflow: 'Cash Flow', reports: 'Reports', import: 'Import Excel', settings: 'Settings',
}
const GROUP: Record<string, [string, string]> = {
  materials: ['Materials', '/materials'], labour: ['Labour', '/labour'], work: ['Work Analysis', '/work'], vendors: ['Vendors', '/vendors'],
  categories: ['Expenses', '/expenses'], months: ['Cash Flow', '/cashflow'], days: ['Dashboard', '/'], transactions: ['Expenses', '/expenses'], projects: ['Projects', '/projects'],
}

export function useTitleFor() {
  const { data } = useData()
  return (path: string): string => {
    const [a, b] = path.split('/').filter(Boolean)
    if (!b) return ROOTS[a ?? ''] ?? 'Page'
    const v = decodeURIComponent(b)
    if (a === 'months') return fmtMonth(v)
    if (a === 'days') return fmtDate(v)
    if (a === 'transactions') return 'Transaction'
    if (a === 'projects') return data.projects.find((p) => p.id === v)?.name ?? 'Project'
    return v
  }
}
export const parentOf = (path: string): Crumb | null => {
  const a = path.split('/').filter(Boolean)[0]
  const g = a && GROUP[a]
  return g && path.split('/').filter(Boolean).length > 1 ? { label: g[0], to: g[1] } : null
}

/** Navigation helper that records the path taken so breadcrumbs can walk back through every drill-down level. */
export function useDrill() {
  const nav = useNavigate()
  const loc = useLocation()
  const titleFor = useTitleFor()
  const { setFilters } = useData()
  const trail: Crumb[] = (loc.state as { trail?: Crumb[] } | null)?.trail ?? []
  const here: Crumb = { label: titleFor(loc.pathname), to: loc.pathname + loc.search }
  const go = (to: string) => nav(to, { state: { trail: [...trail, here] } })
  /** Show the exact transactions behind a figure: sets visible filter chips, then opens the ledger. */
  const ledger = (scope: Partial<Filters>) => { setFilters(scope); go('/expenses') }
  return { go, ledger, trail, here }
}
