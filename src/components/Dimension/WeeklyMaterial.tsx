import { useMemo } from 'react'
import { useScoped } from '../../store/useScoped'
import { useData } from '../../store/DataContext'
import { applyFilters } from '../../services/filters'
import { Card, SectionTitle, Badge } from '../ui/primitives'
import { fmtDate, isoWeekStart, money, num } from '../../utils/format'

/** The "Weekly material" sheet shown as its own source, whether or not it is counted in project cost. */
export function WeeklyMaterial() {
  const { recognizedAll, informational, filters, scopedProjects } = useScoped()
  const { setWeeklyMode } = useData()
  const weekly = useMemo(() => applyFilters([...recognizedAll, ...informational].filter((t) => t.stream === 'weekly'), { ...filters, categories: [], materials: [], subCategories: [] }), [recognizedAll, informational, filters])
  const weeks = useMemo(() => {
    const m = new Map<string, typeof weekly>()
    weekly.forEach((t) => { const k = isoWeekStart(t.date); m.set(k, [...(m.get(k) ?? []), t]) })
    return [...m.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))
  }, [weekly])
  if (!weekly.length) return null
  const total = weekly.reduce((s, t) => s + t.amount, 0)
  const single = scopedProjects.length === 1 ? scopedProjects[0] : null
  const mode = single?.settings.weeklyMode
  return (
    <Card className="overflow-hidden">
      <SectionTitle title="Weekly material purchases" sub={`Separate source sheet · ${num(weekly.length)} purchases · ${money(total)}`}
        right={single ? (
          <label className="text-xs text-muted">Counted in project cost?
            <select value={mode} onChange={(e) => setWeeklyMode(single.id, e.target.value as 'additive')} className="ml-2 rounded-lg border border-line bg-card px-2 py-1 text-sm text-ink">
              <option value="additive">Yes – additional to ledger</option><option value="informational">No – reference only</option><option value="ignored">Ignore</option>
            </select></label>) : <Badge tone="slate">Set per project</Badge>} />
      <div className="mt-3 max-h-96 overflow-auto"><table className="w-full min-w-[560px] text-sm">
        <thead className="sticky top-0 bg-bg text-left text-xs uppercase tracking-wide text-muted"><tr><th className="px-4 py-2">Week of</th><th className="px-4 py-2">Material</th><th className="px-4 py-2 text-right">Quantity</th><th className="px-4 py-2 text-right">Amount</th></tr></thead>
        <tbody>{weeks.map(([wk, rows]) => (<>
          {rows.map((t, i) => <tr key={t.id} className="border-t border-line"><td className="px-4 py-1.5 text-muted">{i === 0 ? fmtDate(wk) : ''}</td><td className="px-4 py-1.5">{t.material}</td><td className="num px-4 py-1.5 text-right">{t.quantity ? `${num(t.quantity)} ${t.unit}` : '–'}</td><td className="num px-4 py-1.5 text-right">{money(t.amount)}</td></tr>)}
          <tr key={wk} className="border-t border-line bg-bg font-semibold"><td className="px-4 py-1.5" colSpan={3}>Week total</td><td className="num px-4 py-1.5 text-right">{money(rows.reduce((s, t) => s + t.amount, 0))}</td></tr></>))}
          <tr className="border-t-2 border-line font-bold"><td className="px-4 py-2" colSpan={3}>Total</td><td className="num px-4 py-2 text-right">{money(total)}</td></tr></tbody>
      </table></div>
    </Card>
  )
}
