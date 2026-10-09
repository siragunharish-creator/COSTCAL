import { useMemo } from 'react'
import { useDrill } from '../../utils/nav'
import { calculateProjectTotals } from '../../services/analytics'
import type { Project } from '../../types/project'
import type { Receipt } from '../../types/receipt'
import type { Transaction } from '../../types/transaction'
import { Card, SectionTitle } from '../ui/primitives'
import { money, moneyShort, num } from '../../utils/format'

export function ProjectComparison({ projects, tx, receipts }: { projects: Project[]; tx: Transaction[]; receipts: Receipt[] }) {
  const { go } = useDrill()
  const rows = useMemo(() => calculateProjectTotals(projects, tx, receipts), [projects, tx, receipts])
  return (
    <Card className="overflow-hidden">
      <SectionTitle title="Project comparison" sub="Click a project to open its dashboard" />
      <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[760px] text-sm">
        <thead className="bg-bg text-left text-xs uppercase tracking-wide text-muted"><tr>{['Project', 'Received', 'Expense', 'Balance', 'Material', 'Labour', 'Cost/sqft', 'Txns'].map((h, i) => <th key={h} className={`px-4 py-2 ${i ? 'text-right' : ''}`}>{h}</th>)}</tr></thead>
        <tbody>{rows.map((r) => (
          <tr key={r.project.id} onClick={() => go(`/projects/${r.project.id}`)} className="cursor-pointer border-t border-line hover:bg-blue-soft">
            <td className="px-4 py-2 font-medium">{r.project.name}<div className="text-xs font-normal text-muted">{r.project.location}</div></td>
            <td className="num px-4 py-2 text-right">{moneyShort(r.received)}</td><td className="num px-4 py-2 text-right">{moneyShort(r.expense)}</td>
            <td className={`num px-4 py-2 text-right font-semibold ${r.balance < 0 ? 'text-red' : 'text-green'}`}>{moneyShort(r.balance)}</td>
            <td className="num px-4 py-2 text-right">{moneyShort(r.material)}</td><td className="num px-4 py-2 text-right">{moneyShort(r.labour)}</td>
            <td className="num px-4 py-2 text-right">{r.costPerSqft ? money(r.costPerSqft) : <span className="text-muted">add area</span>}</td><td className="num px-4 py-2 text-right">{num(r.transactions)}</td></tr>))}</tbody>
      </table></div>
    </Card>
  )
}
