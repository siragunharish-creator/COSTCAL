import { assignColumns, FIELD_LABELS, type ColumnMapping, type FieldKey, type ParsedWorkbook, type SheetData } from '../../services/excelParser'
import { Badge } from '../ui/primitives'

const FIELDS: Record<'ledger' | 'weekly' | 'receipts', FieldKey[]> = {
  ledger: ['date', 'amount', 'category', 'work', 'item', 'material', 'vendor', 'quantity', 'unit', 'rate', 'description', 'paymentMode', 'invoice', 'reference', 'remarks', 'day'],
  weekly: ['date', 'amount', 'material', 'quantity', 'vendor', 'work'],
  receipts: ['date', 'amount', 'description'],
}
const REQUIRED: FieldKey[] = ['date', 'amount']

export function ColumnMapper({ wb, onChange }: { wb: ParsedWorkbook; onChange: (wb: ParsedWorkbook) => void }) {
  const update = (name: string, fn: (s: SheetData) => SheetData) => onChange({ ...wb, sheets: wb.sheets.map((s) => (s.name === name ? fn(s) : s)) })
  const active = wb.sheets.filter((s) => s.role !== 'ignore')
  return (
    <div className="space-y-6">
      {active.map((s) => {
        const fields = FIELDS[s.role as 'ledger']
        const missing = REQUIRED.filter((f) => s.mapping[f] === undefined)
        return (
          <div key={s.name}>
            <div className="mb-2 flex flex-wrap items-center gap-2"><h3 className="font-semibold">{s.name}</h3><Badge tone="blue">{s.role}</Badge>
              {missing.length > 0 && <Badge tone="red">Missing: {missing.map((m) => FIELD_LABELS[m]).join(', ')}</Badge>}
              <button className="ml-auto text-xs text-blue hover:underline" onClick={() => update(s.name, (x) => ({ ...x, mapping: assignColumns(x.headers) }))}>Re-detect</button></div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {fields.map((f) => (
                <label key={f} className="text-xs text-muted">{FIELD_LABELS[f]}{REQUIRED.includes(f) && <span className="text-red"> *</span>}
                  <select value={s.mapping[f] ?? ''} onChange={(e) => update(s.name, (x) => { const m: ColumnMapping = { ...x.mapping }; if (e.target.value === '') delete m[f]; else m[f] = +e.target.value; return { ...x, mapping: m } })}
                    className="mt-1 w-full rounded-lg border border-line bg-card px-2 py-2 text-sm text-ink"><option value="">– not in my file –</option>
                    {s.headers.map((h, i) => <option key={i} value={i}>{h}</option>)}</select></label>))}
            </div>
          </div>)
      })}
      {active.length === 0 && <p className="text-sm text-muted">All sheets are set to “ignore”. Go back and choose at least one sheet.</p>}
    </div>
  )
}
