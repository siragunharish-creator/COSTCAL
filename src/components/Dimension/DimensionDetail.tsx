import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useScoped } from '../../store/useScoped'
import { useData } from '../../store/DataContext'
import { useDrill } from '../../utils/nav'
import { averageRate, bucketTotals, calculateDailyTotals, calculateMonthlyTotals, groupBy } from '../../services/analytics'
import { Btn, Card, Empty, KPICard, SectionTitle } from '../ui/primitives'
import { RankBars, TrendBars } from '../ui/charts'
import { TransactionTable } from '../Transactions/TransactionTable'
import { fmtDate, money, moneyShort, num } from '../../utils/format'
import type { DimCfg } from './dimensions'

export function DimensionDetail({ cfg }: { cfg: DimCfg }) {
  const name = decodeURIComponent(useParams().name ?? '')
  const scope = useMemo(() => cfg.scope(name), [cfg, name])
  const { tx } = useScoped({ scope })
  const { data } = useData()
  const { go, ledger } = useDrill()
  const rows = useMemo(() => cfg.pick(tx).filter((t) => cfg.key(t) === name), [tx, cfg, name])
  const paid = rows.filter((t) => t.hasAmount)
  const total = rows.reduce((s, t) => s + t.amount, 0)
  const monthly = useMemo(() => calculateMonthlyTotals(rows), [rows])
  const daily = useMemo(() => calculateDailyTotals(rows), [rows])
  const b = useMemo(() => bucketTotals(rows), [rows])
  const g = groupBy(rows, cfg.key)[0]
  const rate = g ? averageRate(g) : null
  const pname = (id: string) => data.projects.find((p) => p.id === id)?.name ?? id
  if (!rows.length) return <Card><Empty title={`No ${cfg.singular.toLowerCase()} entries`} text={`“${name}” has no transactions under the current filters.`} action={<Btn onClick={() => go(cfg.route)}>Back to {cfg.title}</Btn>} /></Card>
  const amounts = paid.map((t) => t.amount)
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div><p className="text-xs font-medium uppercase tracking-wide text-muted">{cfg.singular}</p><h1 className="text-2xl font-bold">{name}</h1></div>
        <Btn kind="primary" onClick={() => ledger(scope)}>View all {num(paid.length)} transactions</Btn>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-6">
        <KPICard label="Total cost" value={total} format={moneyShort} tone="blue" sub={`Based on ${num(paid.length)} transactions`} onClick={() => ledger(scope)} />
        <KPICard label="Transactions" value={paid.length} format={(n) => num(Math.round(n))} tone="slate" />
        <KPICard label="Average" value={paid.length ? total / paid.length : 0} format={moneyShort} tone="slate" />
        <KPICard label="Highest" value={amounts.length ? Math.max(...amounts) : 0} format={moneyShort} tone="orange" />
        <KPICard label="Lowest" value={amounts.length ? Math.min(...amounts) : 0} format={moneyShort} tone="slate" />
        {cfg.id === 'material' ? <KPICard label="Avg rate / unit" value={rate ?? 0} format={(n) => (rate ? money(n, true) : 'n/a')} tone="green" sub={rate ? `${num(g!.qty)} units across rows with a quantity` : 'Quantities are missing or cover too little of the spend'} />
          : <KPICard label="Active days" value={new Set(rows.map((t) => t.date)).size} format={(n) => num(Math.round(n))} tone="slate" />}
      </div>
      {cfg.id === 'work' && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KPICard label="Material" value={b.material} format={moneyShort} tone="blue" onClick={() => ledger({ ...scope, categories: ['Material'] })} />
          <KPICard label="Labour" value={b.labour} format={moneyShort} tone="orange" onClick={() => ledger({ ...scope, categories: ['Labour'] })} />
          <KPICard label="Machine" value={b.machine} format={moneyShort} tone="slate" />
          <KPICard label="Other" value={b.other} format={moneyShort} tone="slate" />
        </div>
      )}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card><SectionTitle title="Monthly trend" sub="Click a month to open it" /><div className="p-4"><TrendBars data={monthly} onSelect={(k) => go(`/months/${k}`)} /></div></Card>
        <Card><SectionTitle title="Date-wise cost" sub="Click a day to open it" /><div className="p-4"><TrendBars data={daily.map((d) => ({ ...d, label: fmtDate(d.key).slice(0, 6) }))} onSelect={(k) => go(`/days/${k}`)} highlight color="#16a34a" /></div></Card>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        {cfg.sections.map((s) => {
          const gs = groupBy(rows, s.by).map((x) => (s.title.startsWith('Project') || s.title === 'Projects' ? { ...x, key: pname(x.key) } : x))
          if (!gs.length || (s.skipIfOne && gs.length < 2)) return null
          return <Card key={s.title}><SectionTitle title={s.title} /><div className="p-4"><RankBars data={gs} onSelect={s.to ? (k) => go(s.to!(k)) : undefined} limit={10} /></div></Card>
        })}
      </div>
      <TransactionTable tx={rows} title={`${name} transactions`} />
    </div>
  )
}
