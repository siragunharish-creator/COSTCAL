import type { Transaction } from '../../types/transaction'
import type { Receipt } from '../../types/receipt'
import { fmtDate, money } from '../../utils/format'

export function ImportPreview({ tx, receipts }: { tx: Transaction[]; receipts: Receipt[] }) {
  const sample = [...tx.filter((t) => t.stream === 'ledger').slice(0, 12), ...tx.filter((t) => t.stream === 'weekly').slice(0, 4)]
  return (
    <div className="space-y-5">
      <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-sm">
        <thead className="bg-bg text-left text-xs uppercase tracking-wide text-muted"><tr><th className="px-3 py-2">Source</th><th className="px-3">Date</th><th className="px-3">Category</th><th className="px-3">Item</th><th className="px-3">Work</th><th className="px-3 text-right">Amount</th></tr></thead>
        <tbody>{sample.map((t) => <tr key={t.id} className="border-t border-line"><td className="px-3 py-1.5 text-muted">{t.sourceSheet} · {t.sourceRow}</td><td className="px-3">{fmtDate(t.date)}</td><td className="px-3">{t.category}</td><td className="px-3">{t.subCategory || '–'}</td><td className="max-w-[220px] truncate px-3">{t.workDescription || '–'}</td><td className="num px-3 text-right">{t.hasAmount ? money(t.amount) : <span className="text-muted">no amount</span>}</td></tr>)}</tbody>
      </table></div>
      {receipts.length > 0 && <div><h4 className="mb-1 text-sm font-semibold">Money received (first 6 of {receipts.length})</h4><ul className="grid gap-1 text-sm sm:grid-cols-3">{receipts.slice(0, 6).map((r) => <li key={r.id} className="flex justify-between rounded bg-bg px-3 py-1.5"><span className="text-muted">{fmtDate(r.date)}</span><b className="num">{money(r.amount)}</b></li>)}</ul></div>}
    </div>
  )
}
