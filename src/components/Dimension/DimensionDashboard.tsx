import { useMemo } from 'react'
import { useScoped } from '../../store/useScoped'
import { useDrill } from '../../utils/nav'
import { groupBy, averageRate } from '../../services/analytics'
import { KPICard, Card, SectionTitle, Empty, Btn } from '../ui/primitives'
import { RankBars } from '../ui/charts'
import { money, moneyShort, num } from '../../utils/format'
import type { DimCfg } from './dimensions'
import type { ReactNode } from 'react'

export function DimensionDashboard({ cfg, children }: { cfg: DimCfg; children?: ReactNode }) {
  const { tx } = useScoped()
  const { go, ledger } = useDrill()
  const rows = useMemo(() => cfg.pick(tx), [tx, cfg])
  const groups = useMemo(() => groupBy(rows, cfg.key), [rows, cfg])
  const paid = rows.filter((t) => t.hasAmount)
  const total = rows.reduce((s, t) => s + t.amount, 0)
  const biggest = paid.reduce((m, t) => Math.max(m, t.amount), 0)
  const open = (k: string) => go(`${cfg.route}/${encodeURIComponent(k)}`)

  if (!groups.length) {
    const noVendor = cfg.id === 'vendor'
    return <Card><Empty title={noVendor ? 'No vendor information in this data' : `No ${cfg.title.toLowerCase()} data`}
      text={noVendor ? 'Your Excel has no Vendor / Supplier column, so vendor totals cannot be calculated – nothing has been guessed. Add such a column and re-import, or map one in the import step.' : 'Nothing matches the current filters.'}
      action={noVendor ? <Btn kind="primary" onClick={() => go('/import')}>Import Excel</Btn> : undefined} /></Card>
  }
  return (
    <div className="space-y-5">
      <div><h1 className="text-2xl font-bold">{cfg.title}</h1><p className="text-sm text-muted">{cfg.explain}</p></div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <KPICard label={`Total ${cfg.id === 'vendor' ? 'paid' : 'cost'}`} value={total} format={moneyShort} tone="blue" sub={`${num(paid.length)} transactions`} onClick={() => ledger(cfg.id === 'material' ? { categories: ['Material'] } : cfg.id === 'labour' ? { categories: ['Labour'] } : {})} />
        <KPICard label={`${cfg.singular}s`} value={groups.length} format={(n) => num(Math.round(n))} tone="slate" />
        <KPICard label="Transactions" value={paid.length} format={(n) => num(Math.round(n))} tone="slate" />
        <KPICard label="Top" value={groups[0].total} format={moneyShort} tone="orange" sub={groups[0].key} onClick={() => open(groups[0].key)} />
        <KPICard label="Average entry" value={paid.length ? total / paid.length : 0} format={moneyShort} tone="slate" />
        <KPICard label="Largest entry" value={biggest} format={moneyShort} tone="slate" />
      </div>
      <Card>
        <SectionTitle title={`${cfg.singular} ranking`} sub="Click a bar or a row to drill down." />
        <div className="p-4"><RankBars data={groups} onSelect={open} limit={15} color="#2563eb" /></div>
      </Card>
      <Card className="overflow-hidden">
        <SectionTitle title="All entries" sub={`${groups.length} ${cfg.singular.toLowerCase()}s · based on ${num(paid.length)} transactions`} />
        <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[560px] text-sm">
          <thead className="bg-bg text-left text-xs uppercase tracking-wide text-muted"><tr><th className="px-4 py-2">#</th><th className="px-4 py-2">{cfg.singular}</th><th className="px-4 py-2 text-right">Total</th><th className="px-4 py-2 text-right">Share</th><th className="px-4 py-2 text-right">Txns</th>{cfg.id === 'material' && <th className="px-4 py-2 text-right">Avg rate</th>}</tr></thead>
          <tbody>{groups.map((g, i) => { const r = averageRate(g); return (
            <tr key={g.key} onClick={() => open(g.key)} className="cursor-pointer border-t border-line hover:bg-blue-soft"><td className="px-4 py-2 text-muted">{i + 1}</td><td className="px-4 py-2 font-medium">{g.key}</td><td className="num px-4 py-2 text-right font-semibold">{money(g.total)}</td><td className="num px-4 py-2 text-right text-muted">{g.share.toFixed(1)}%</td><td className="num px-4 py-2 text-right">{g.count}</td>{cfg.id === 'material' && <td className="num px-4 py-2 text-right text-muted">{r ? money(r, true) : '–'}</td>}</tr>) })}</tbody>
        </table></div>
      </Card>
      {children}
    </div>
  )
}
