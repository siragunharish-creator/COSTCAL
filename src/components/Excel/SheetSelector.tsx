import { ROLE_LABELS, type ParsedWorkbook, type SheetRole } from '../../services/excelParser'
import { Badge } from '../ui/primitives'

export function SheetSelector({ wb, onChange }: { wb: ParsedWorkbook; onChange: (wb: ParsedWorkbook) => void }) {
  const setRole = (name: string, role: SheetRole) => onChange({ ...wb, sheets: wb.sheets.map((s) => (s.name === name ? { ...s, role } : s)) })
  return (
    <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-sm">
      <thead className="text-left text-xs uppercase tracking-wide text-muted"><tr><th className="py-2 pr-3">Sheet</th><th className="px-3">Rows</th><th className="px-3">What the app sees</th><th className="px-3">Use this sheet as</th></tr></thead>
      <tbody>{wb.sheets.map((s) => (
        <tr key={s.name} className="border-t border-line align-top">
          <td className="py-2.5 pr-3 font-medium">{s.name}</td><td className="num px-3 py-2.5">{s.nonEmptyRows}</td>
          <td className="px-3 py-2.5 text-muted">{s.note} {s.role !== s.detectedRole && <Badge tone="orange">changed</Badge>}</td>
          <td className="px-3 py-2"><select value={s.role} onChange={(e) => setRole(s.name, e.target.value as SheetRole)} className="rounded-lg border border-line bg-card px-2 py-1.5 text-sm">
            {(Object.keys(ROLE_LABELS) as SheetRole[]).map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}</select></td>
        </tr>))}</tbody>
    </table></div>
  )
}
