import { useParams } from 'react-router-dom'
import { Badge, Card, Empty, SectionTitle } from '../ui/primitives'
import { useData } from '../../store/DataContext'
import { useDrill } from '../../utils/nav'
import { fmtDateLong, money } from '../../utils/format'

export function TransactionDetail() {
  const { id } = useParams()
  const { data } = useData()
  const { go } = useDrill()
  const t = data.transactions.find((x) => x.id === id)
  if (!t) return <Card><Empty title="Transaction not found" text="It may have been removed when its project or file was replaced." /></Card>
  const project = data.projects.find((p) => p.id === t.projectId)
  const link = (text: string, to: string) => (text ? <button onClick={() => go(to)} className="text-left font-medium text-blue hover:underline">{text}</button> : <span className="text-muted">–</span>)
  const fields: [string, React.ReactNode][] = [
    ['Date', link(fmtDateLong(t.date), `/days/${t.date}`)],
    ['Project', link(project?.name ?? '', `/projects/${t.projectId}`)],
    ['Category', link(t.category, `/categories/${encodeURIComponent(t.category)}`)],
    ['Item / details', t.subCategory || '–'],
    ['Work', link(t.workDescription, `/work/${encodeURIComponent(t.workDescription)}`)],
    ['Material', link(t.material, `/materials/${encodeURIComponent(t.material)}`)],
    ['Vendor', t.vendor ? link(t.vendor, `/vendors/${encodeURIComponent(t.vendor)}`) : <span className="text-muted">Not recorded</span>],
    ['Quantity', t.quantity !== null ? `${t.quantity} ${t.unit}` : t.quantityText || '–'],
    ['Rate', t.rate !== null ? money(t.rate, true) : '–'],
    ['Payment mode', t.paymentMode || '–'], ['Invoice', t.invoiceNumber || '–'], ['Reference', t.referenceNumber || '–'],
    ['Description', t.description || '–'], ['Remarks', t.remarks || '–'], ['Project day', t.dayNo ?? '–'],
  ]
  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><div className="text-xs font-medium uppercase tracking-wide text-muted">Transaction · {t.sourceSheet} row {t.sourceRow}</div>
            <h1 className="num mt-1 text-3xl font-bold">{t.hasAmount ? money(t.amount) : 'No amount recorded'}</h1></div>
          <div className="flex gap-2"><Badge tone="blue">{t.category}</Badge><Badge tone={t.stream === 'weekly' ? 'orange' : 'slate'}>{t.stream === 'weekly' ? 'Weekly material' : 'Ledger'}</Badge>{t.flags.map((f) => <Badge key={f} tone="orange">{f}</Badge>)}</div>
        </div>
        <dl className="mt-5 grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
          {fields.map(([k, v]) => <div key={k}><dt className="text-xs text-muted">{k}</dt><dd className="mt-0.5 text-sm text-ink">{v}</dd></div>)}
        </dl>
      </Card>
      <Card>
        <SectionTitle title="Original Excel row" sub={`${t.sourceFile} → sheet “${t.sourceSheet}” → row ${t.sourceRow}`} />
        <div className="overflow-x-auto p-5"><table className="w-full text-sm"><tbody>
          {Object.entries(t.raw).map(([k, v]) => <tr key={k} className="border-t border-line first:border-0"><td className="w-1/3 py-2 pr-4 text-muted">{k}</td><td className="py-2 text-ink">{v}</td></tr>)}
          {Object.keys(t.raw).length === 0 && <tr><td className="py-2 text-muted">Demo data has no original Excel row.</td></tr>}
        </tbody></table></div>
      </Card>
    </div>
  )
}
