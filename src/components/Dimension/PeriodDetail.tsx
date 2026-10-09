import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useScoped } from '../../store/useScoped'
import { useDrill } from '../../utils/nav'
import { bucketTotals, calculateDailyTotals, groupBy } from '../../services/analytics'
import { Btn, Card, Empty, KPICard, SectionTitle } from '../ui/primitives'
import { RankBars, TrendBars } from '../ui/charts'
import { TransactionTable } from '../Transactions/TransactionTable'
import { fmtDate, fmtDateLong, fmtMonth, moneyShort, num } from '../../utils/format'

export function PeriodDetail({ kind }: { kind: 'month' | 'day' }) {
  const key = useParams().key ?? ''
  const scope = useMemo(() => (kind === 'month' ? { dateFrom: `${key}-01`, dateTo: `${key}-31` } : { dateFrom: key, dateTo: key }), [kind, key])
  const { tx } = useScoped({ scope })
  const { go, ledger } = useDrill()
  const b = useMemo(() => bucketTotals(tx), [tx])
  const enc = encodeURIComponent
  const title = kind === 'month' ? `${fmtMonth(key)} expense analysis` : `${fmtDateLong(key)} expenses`
  if (!tx.length) return <Card><Empty title="No transactions" text="Nothing was spent in this period under the current filters." action={<Btn onClick={() => go('/')}>Dashboard</Btn>} /></Card>
  const daily = calculateDailyTotals(tx)
  const paid = tx.filter((t) => t.hasAmount).length
  const avg = daily.length ? b.total / daily.length : 0
  const high = daily.find((d) => d.high)
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-2"><h1 className="text-2xl font-bold">{title}</h1><Btn kind="primary" onClick={() => ledger(scope)}>View {num(paid)} transactions</Btn></div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <KPICard label="Total" value={b.total} format={moneyShort} tone="blue" sub={`Based on ${num(paid)} transactions`} onClick={() => ledger(scope)} />
        <KPICard label="Material" value={b.material} format={moneyShort} tone="blue" onClick={() => ledger({ ...scope, categories: ['Material'] })} />
        <KPICard label="Labour" value={b.labour} format={moneyShort} tone="orange" onClick={() => ledger({ ...scope, categories: ['Labour'] })} />
        <KPICard label="Machine" value={b.machine} format={moneyShort} tone="slate" />
        <KPICard label="Other" value={b.other} format={moneyShort} tone="slate" />
      </div>
      {kind === 'month' && <Card><SectionTitle title="Daily expense in this month" sub={high ? `Highlighted days are unusually high (e.g. ${fmtDate(high.key)})` : `Average ${moneyShort(avg)} per working day`} /><div className="p-4"><TrendBars data={daily.map((d) => ({ ...d, label: d.key.slice(8) }))} onSelect={(k) => go(`/days/${k}`)} highlight /></div></Card>}
      <div className="grid gap-5 lg:grid-cols-3">
        <Card><SectionTitle title="Top materials" /><div className="p-4"><RankBars data={groupBy(tx.filter((t) => t.category === 'Material'), (t) => t.material)} onSelect={(k) => go(`/materials/${enc(k)}`)} limit={8} /></div></Card>
        <Card><SectionTitle title="Top work activities" /><div className="p-4"><RankBars data={groupBy(tx, (t) => t.workDescription)} onSelect={(k) => go(`/work/${enc(k)}`)} limit={8} /></div></Card>
        <Card><SectionTitle title="Top vendors" /><div className="p-4">{tx.some((t) => t.vendor) ? <RankBars data={groupBy(tx, (t) => t.vendor)} onSelect={(k) => go(`/vendors/${enc(k)}`)} limit={8} /> : <p className="text-sm text-muted">No vendor column in this data.</p>}</div></Card>
      </div>
      <TransactionTable tx={tx} title="Transactions" />
    </div>
  )
}
