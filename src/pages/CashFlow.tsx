import { useMemo } from 'react'
import { useScoped } from '../store/useScoped'
import { useDrill } from '../utils/nav'
import { calculateCashFlow } from '../services/analytics'
import { Card, Empty, KPICard, SectionTitle } from '../components/ui/primitives'
import { CashLines } from '../components/ui/charts'
import { fmtDate, fmtMonth, money, moneyShort } from '../utils/format'

export default function CashFlow() {
  const { tx, receipts } = useScoped()
  const { go, ledger } = useDrill()
  const rows = useMemo(() => calculateCashFlow(receipts, tx), [receipts, tx])
  const received = receipts.reduce((s, r) => s + r.amount, 0)
  const spent = tx.reduce((s, t) => s + t.amount, 0)
  if (!rows.length) return <Card><Empty title="No cash-flow data" text="Import a workbook with money received and expenses." /></Card>
  return (
    <div className="space-y-5">
      <div><h1 className="text-2xl font-bold">Cash Flow</h1><p className="text-sm text-muted">Money received against project expenses, month by month.</p></div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KPICard label="Money received" value={received} format={moneyShort} tone="green" />
        <KPICard label="Project expenses" value={spent} format={moneyShort} tone="orange" onClick={() => ledger({})} />
        <KPICard label="Balance" value={received - spent} format={moneyShort} tone={received - spent < 0 ? 'red' : 'blue'} />
        <KPICard label="Payments received" value={receipts.length} format={(n) => String(Math.round(n))} tone="slate" />
      </div>
      <Card><SectionTitle title="Received vs expense (cumulative)" sub="Click a month to see its transactions" /><div className="p-4"><CashLines data={rows} onSelect={(k) => go(`/months/${k}`)} /></div></Card>
      <Card className="overflow-hidden"><SectionTitle title="Month by month" />
        <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[640px] text-sm"><thead className="bg-bg text-left text-xs uppercase tracking-wide text-muted"><tr><th className="px-4 py-2">Month</th><th className="px-4 text-right">Received</th><th className="px-4 text-right">Expense</th><th className="px-4 text-right">Cum. received</th><th className="px-4 text-right">Cum. expense</th><th className="px-4 text-right">Cum. balance</th></tr></thead>
          <tbody>{rows.map((r) => <tr key={r.key} onClick={() => go(`/months/${r.key}`)} className="cursor-pointer border-t border-line hover:bg-blue-soft"><td className="px-4 py-2 font-medium">{fmtMonth(r.key)}</td><td className="num px-4 text-right text-green">{r.received ? money(r.received) : '–'}</td><td className="num px-4 text-right">{money(r.expense)}</td><td className="num px-4 text-right">{money(r.cumReceived)}</td><td className="num px-4 text-right">{money(r.cumExpense)}</td><td className={`num px-4 text-right font-semibold ${r.cumBalance < 0 ? 'text-red' : ''}`}>{money(r.cumBalance)}</td></tr>)}</tbody></table></div></Card>
      <Card className="overflow-hidden"><SectionTitle title="Money received" sub="Each payment with its Excel source" />
        <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[480px] text-sm"><tbody>{receipts.slice().sort((a, b) => (a.date < b.date ? -1 : 1)).map((r) => <tr key={r.id} className="border-t border-line"><td className="px-4 py-2">{fmtDate(r.date)}</td><td className="num px-4 py-2 text-right font-semibold text-green">{money(r.amount)}</td><td className="px-4 py-2 text-xs text-muted">{r.sourceSheet} · row {r.sourceRow}</td></tr>)}</tbody></table></div></Card>
    </div>
  )
}
