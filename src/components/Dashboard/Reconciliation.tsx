import { AlertTriangle, CheckCircle2, Info } from 'lucide-react'
import { useData } from '../../store/DataContext'
import { calculateReconciliation } from '../../services/reconciliation'
import { Card, SectionTitle, Badge } from '../ui/primitives'
import { money } from '../../utils/format'
import type { Project } from '../../types/project'

function Block({ project }: { project: Project }) {
  const { data, setWeeklyMode } = useData()
  const tx = data.transactions.filter((t) => t.projectId === project.id)
  const rc = calculateReconciliation(project, tx, data.receipts, data.summaries.find((s) => s.projectId === project.id))
  const ok = rc.difference !== null && Math.abs(rc.difference) < 1
  const rows: [string, string, string?][] = [
    ['Cost Summary – stated expense total', rc.statedExpense === null ? 'Not found in file' : money(rc.statedExpense)],
    ['Details ledger total', money(rc.ledgerTotal)],
    ['Weekly material total', money(rc.weeklyTotal)],
    ['Recognized project cost', money(rc.recognizedTotal), 'font-bold'],
    ['Difference vs Cost Summary', rc.difference === null ? '–' : money(rc.difference), ok ? 'text-green' : 'text-red'],
    ['Possible duplicate / unmapped amount', rc.possibleOverlapCount ? `${money(rc.possibleOverlap)} (${rc.possibleOverlapCount} rows)` : '₹0'],
    ['Rows without an amount (not costed)', String(rc.noAmountRows)],
  ]
  return (
    <div className="p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-semibold">{project.name}{rc.hasSummary ? <Badge tone={ok ? 'green' : 'orange'}>{ok ? 'Reconciled' : 'Check difference'}</Badge> : <Badge>No summary in file</Badge>}</div>
        <label className="text-xs text-muted">Weekly material is
          <select value={project.settings.weeklyMode} onChange={(e) => setWeeklyMode(project.id, e.target.value as 'additive')} className="ml-2 rounded-lg border border-line bg-card px-2 py-1 text-sm text-ink">
            <option value="additive">added on top of the ledger</option><option value="informational">reference only</option><option value="ignored">ignored</option>
          </select></label>
      </div>
      <table className="w-full text-sm"><tbody>{rows.map(([k, v, c]) => <tr key={k} className="border-t border-line first:border-0"><td className="py-1.5 text-muted">{k}</td><td className={`num py-1.5 text-right ${c ?? ''}`}>{v}</td></tr>)}</tbody></table>
      <ul className="mt-3 space-y-2">{rc.notes.map((n, i) => (
        <li key={i} className="flex gap-2 rounded-lg bg-bg p-2.5 text-xs text-ink">
          {n.level === 'ok' ? <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-green" /> : n.level === 'warn' ? <AlertTriangle size={15} className="mt-0.5 shrink-0 text-orange" /> : <Info size={15} className="mt-0.5 shrink-0 text-blue" />}{n.text}</li>))}</ul>
    </div>
  )
}
export function Reconciliation({ projects }: { projects: Project[] }) {
  return (
    <Card>
      <SectionTitle title="Source reconciliation" sub="How the Excel's own totals compare with what this app calculates. Totals are never shown without this check." />
      <div className="divide-y divide-line">{projects.slice(0, 6).map((p) => <Block key={p.id} project={p} />)}</div>
      {projects.length > 6 && <p className="px-5 pb-4 text-xs text-muted">Showing 6 of {projects.length} projects. Select a project for the rest.</p>}
    </Card>
  )
}
