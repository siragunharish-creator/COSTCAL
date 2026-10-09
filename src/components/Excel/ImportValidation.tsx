import { useMemo, useState } from 'react'
import type { ValidationReport } from '../../services/excelParser'
import type { DuplicateHit } from '../../services/duplicateDetection'
import type { Transaction } from '../../types/transaction'
import { fmtDate, money, num } from '../../utils/format'
import { Badge } from '../ui/primitives'

export type DupAction = 'import' | 'skip'

export function ImportValidation({ v, dups, action, onAction }: { v: ValidationReport; dups: DuplicateHit<Transaction>[]; action: DupAction; onAction: (a: DupAction) => void }) {
  const [kind, setKind] = useState('all')
  const [review, setReview] = useState(false)
  const kinds = useMemo(() => [...new Set(v.issues.map((i) => i.kind))], [v.issues])
  const shown = v.issues.filter((i) => kind === 'all' || i.kind === kind).slice(0, 100)
  const stats: [string, number | string, 'green' | 'red' | 'orange' | 'slate'][] = [
    ['Total rows', num(v.totalRows), 'slate'], ['Valid rows', num(v.validRows), 'green'], ['Invalid rows', num(v.invalidRows), v.invalidRows ? 'red' : 'slate'],
    ['Missing dates', v.missingDates, v.missingDates ? 'red' : 'slate'], ['Invalid dates', v.invalidDates, v.invalidDates ? 'red' : 'slate'], ['Missing amounts', v.missingAmounts, v.missingAmounts ? 'orange' : 'slate'],
    ['Invalid numbers', v.invalidNumbers, v.invalidNumbers ? 'red' : 'slate'], ['Missing categories', v.missingCategories, v.missingCategories ? 'orange' : 'slate'], ['Unknown categories', v.unknownCategories, v.unknownCategories ? 'orange' : 'slate'],
    ['Missing vendors', v.missingVendors === null ? 'No vendor column' : v.missingVendors, 'slate'], ['Repeated identical rows', v.repeatedEntries, 'slate'], ['Potential duplicates', dups.length, dups.length ? 'orange' : 'slate'],
  ]
  const tone = { green: 'text-green', red: 'text-red', orange: 'text-orange', slate: 'text-ink' }
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{stats.map(([k, val, t]) => <div key={k} className="rounded-xl border border-line bg-bg p-3"><div className="text-xs text-muted">{k}</div><div className={`num text-lg font-bold ${tone[t]}`}>{val}</div></div>)}</div>
      {v.missingAmounts > 0 && <p className="rounded-lg bg-bg p-3 text-sm text-muted">Rows without an amount (blank or “-”) are kept for quantity tracking but add ₹0 to cost. Their cost may sit in another sheet, such as Weekly material.</p>}
      {v.unknownCategoryList.length > 0 && <p className="text-sm text-muted">Unrecognised categories kept as written: {v.unknownCategoryList.slice(0, 8).map((c) => <Badge key={c} tone="orange">{c}</Badge>)}</p>}
      {dups.length > 0 && (
        <div className="rounded-xl border border-orange bg-orange-soft p-4">
          <b className="text-sm">Potential duplicate transaction{dups.length > 1 ? 's' : ''}: {dups.length}</b>
          <p className="mt-1 text-xs text-muted">Same date, amount, item, work and category already exist in this project from another import.</p>
          <div className="mt-2 flex flex-wrap items-center gap-4 text-sm">
            <label className="flex items-center gap-2"><input type="radio" checked={action === 'skip'} onChange={() => onAction('skip')} />Skip duplicates</label>
            <label className="flex items-center gap-2"><input type="radio" checked={action === 'import'} onChange={() => onAction('import')} />Import anyway</label>
            <button onClick={() => setReview(!review)} className="text-blue hover:underline">{review ? 'Hide' : 'Review'} list</button></div>
          {review && <ul className="mt-3 max-h-48 overflow-auto text-xs">{dups.slice(0, 60).map((d) => <li key={d.incoming.id} className="flex justify-between border-t border-line py-1"><span>{fmtDate(d.incoming.date)} · {d.incoming.subCategory || d.incoming.category} · row {d.incoming.sourceRow}</span><b className="num">{money(d.incoming.amount)}</b></li>)}</ul>}
        </div>)}
      {v.issues.length > 0 && (
        <div><div className="mb-2 flex items-center gap-2"><h4 className="text-sm font-semibold">Rows to review</h4>
          <select value={kind} onChange={(e) => setKind(e.target.value)} className="rounded-lg border border-line bg-card px-2 py-1 text-xs"><option value="all">All ({v.issues.length})</option>{kinds.map((k) => <option key={k} value={k}>{k}</option>)}</select></div>
          <div className="max-h-64 overflow-auto rounded-xl border border-line"><table className="w-full text-xs"><tbody>{shown.map((i, n) => <tr key={n} className="border-t border-line first:border-0"><td className="px-3 py-1.5 text-muted">{i.sheet} · row {i.row}</td><td className="px-3 py-1.5">{i.message}</td></tr>)}</tbody></table></div>
          {v.issues.length > 100 && <p className="mt-1 text-xs text-muted">Showing the first 100 issues.</p>}</div>)}
    </div>
  )
}
