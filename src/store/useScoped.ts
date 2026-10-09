import { useMemo } from 'react'
import { useData } from './DataContext'
import { applyFilters, mergeScope, type Filters } from '../services/filters'
import { recognizedTransactions } from '../services/analytics'

/** One place that turns raw data + global filters (+ optional drill-down scope) into the lists every screen uses. */
export function useScoped(opts: { projectId?: string; scope?: Partial<Filters> } = {}) {
  const { data, filters } = useData()
  const projects = useMemo(() => data.projects.filter((p) => p.status !== 'archived'), [data.projects])
  const eff = useMemo(() => mergeScope(filters, { ...(opts.scope ?? {}), ...(opts.projectId ? { projectId: opts.projectId } : {}) }), [filters, opts.scope, opts.projectId])
  const visibleTx = useMemo(() => {
    const ids = new Set(projects.map((p) => p.id))
    return data.transactions.filter((t) => ids.has(t.projectId))
  }, [data.transactions, projects])
  /** Recognized = ledger + weekly (when the project counts it). */
  const recognizedAll = useMemo(() => recognizedTransactions(visibleTx, projects), [visibleTx, projects])
  const tx = useMemo(() => applyFilters(recognizedAll, eff), [recognizedAll, eff])
  const informational = useMemo(() => { const rec = new Set(recognizedAll); return visibleTx.filter((t) => t.stream === 'weekly' && !rec.has(t)) }, [visibleTx, recognizedAll])
  const receipts = useMemo(() => {
    const ids = new Set(projects.map((p) => p.id))
    return data.receipts.filter((r) => ids.has(r.projectId) && (eff.projectId === 'all' || r.projectId === eff.projectId) && (!eff.dateFrom || r.date >= eff.dateFrom) && (!eff.dateTo || r.date <= eff.dateTo))
  }, [data.receipts, projects, eff])
  const scopedProjects = eff.projectId === 'all' ? projects : projects.filter((p) => p.id === eff.projectId)
  return { projects, scopedProjects, tx, recognizedAll, informational, receipts, filters: eff }
}
