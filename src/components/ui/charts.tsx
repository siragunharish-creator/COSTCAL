import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { colorFor, PALETTE } from '../../utils/colors'
import { money, moneyShort, pct } from '../../utils/format'

const tick = { fill: 'var(--muted)', fontSize: 11 }
const tip = { contentStyle: { background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 10, color: 'var(--ink)', fontSize: 12 }, labelStyle: { color: 'var(--ink)', fontWeight: 600 } }
export type Slice = { key: string; total: number }

export function Donut({ data, onSelect, height = 260 }: { data: Slice[]; onSelect?: (k: string) => void; height?: number }) {
  const total = data.reduce((s, d) => s + d.total, 0)
  return (
    <div className="grid items-center gap-4 sm:grid-cols-[minmax(0,220px)_1fr]">
      <div style={{ height }} className="relative">
        <ResponsiveContainer>
          <PieChart>
            <Pie data={data} dataKey="total" nameKey="key" innerRadius="58%" outerRadius="92%" paddingAngle={1.5} stroke="var(--card)" onClick={(d) => onSelect?.((d as unknown as { key: string }).key)} animationDuration={500}>
              {data.map((d, i) => <Cell key={d.key} fill={colorFor(d.key, i)} />)}
            </Pie>
            <Tooltip {...tip} formatter={(v: number, n: string) => [`${money(v)} (${pct(v, total)})`, n]} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><span className="text-[11px] text-muted">Total</span><span className="num text-lg font-bold text-ink">{moneyShort(total)}</span></div>
      </div>
      <ul className="space-y-1.5 text-sm">
        {data.map((d, i) => (
          <li key={d.key}>
            <button onClick={() => onSelect?.(d.key)} className="grid w-full grid-cols-[12px_1fr_auto_44px] items-center gap-2 rounded px-1 py-0.5 text-left hover:bg-bg">
              <i className="h-3 w-3 rounded-sm" style={{ background: colorFor(d.key, i) }} /><span className="truncate">{d.key}</span>
              <span className="num text-muted">{moneyShort(d.total)}</span><span className="num text-right text-xs text-muted">{pct(d.total, total)}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Horizontal ranking bars; each bar is clickable. */
export function RankBars({ data, onSelect, limit = 12, color }: { data: Slice[]; onSelect?: (k: string) => void; limit?: number; color?: string }) {
  const rows = data.slice(0, limit)
  const h = Math.max(160, rows.length * 32 + 20)
  return (
    <div style={{ height: h }}>
      <ResponsiveContainer>
        <BarChart data={rows} layout="vertical" margin={{ left: 4, right: 24, top: 4, bottom: 4 }}>
          <CartesianGrid horizontal={false} stroke="var(--line)" />
          <XAxis type="number" tick={tick} tickFormatter={moneyShort} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="key" width={118} tick={tick} axisLine={false} tickLine={false} interval={0} tickFormatter={(v: string) => (v.length > 18 ? v.slice(0, 17) + '…' : v)} />
          <Tooltip {...tip} cursor={{ fill: 'var(--blue-soft)' }} formatter={(v: number) => [money(v), 'Spend']} />
          <Bar dataKey="total" radius={[0, 6, 6, 0]} onClick={(d) => onSelect?.((d as unknown as { key: string }).key)} animationDuration={500}>
            {rows.map((r, i) => <Cell key={r.key} fill={color ?? colorFor(r.key, i)} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function TrendBars({ data, onSelect, height = 260, highlight, color = '#2563eb' }: {
  data: { key: string; label: string; total: number; high?: boolean }[]; onSelect?: (k: string) => void; height?: number; highlight?: boolean; color?: string
}) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--line)" />
          <XAxis dataKey="label" tick={tick} axisLine={false} tickLine={false} minTickGap={18} />
          <YAxis tick={tick} tickFormatter={moneyShort} axisLine={false} tickLine={false} width={52} />
          <Tooltip {...tip} cursor={{ fill: 'var(--blue-soft)' }} formatter={(v: number) => [money(v), 'Expense']} />
          <Bar dataKey="total" radius={[4, 4, 0, 0]} onClick={(d) => onSelect?.((d as unknown as { key: string }).key)} animationDuration={500}>
            {data.map((d) => <Cell key={d.key} fill={highlight && d.high ? '#f97316' : color} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function MonthLine({ data, onSelect, height = 260 }: { data: { key: string; label: string; total: number }[]; onSelect?: (k: string) => void; height?: number }) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ left: 0, right: 12, top: 8, bottom: 0 }} onClick={(e) => { const k = (e as { activePayload?: { payload: { key: string } }[] } | null)?.activePayload?.[0]?.payload.key; if (k) onSelect?.(k) }}>
          <CartesianGrid vertical={false} stroke="var(--line)" />
          <XAxis dataKey="label" tick={tick} axisLine={false} tickLine={false} />
          <YAxis tick={tick} tickFormatter={moneyShort} axisLine={false} tickLine={false} width={52} />
          <Tooltip {...tip} formatter={(v: number) => [money(v), 'Expense']} />
          <Line type="monotone" dataKey="total" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 4, fill: '#2563eb', cursor: 'pointer' }} activeDot={{ r: 6 }} animationDuration={600} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export function CashLines({ data, onSelect, height = 300 }: { data: { key: string; label: string; cumReceived: number; cumExpense: number; cumBalance: number }[]; onSelect?: (k: string) => void; height?: number }) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ left: 0, right: 12, top: 8, bottom: 0 }} onClick={(e) => { const k = (e as { activePayload?: { payload: { key: string } }[] } | null)?.activePayload?.[0]?.payload.key; if (k) onSelect?.(k) }}>
          <CartesianGrid vertical={false} stroke="var(--line)" />
          <XAxis dataKey="label" tick={tick} axisLine={false} tickLine={false} />
          <YAxis tick={tick} tickFormatter={moneyShort} axisLine={false} tickLine={false} width={56} />
          <Tooltip {...tip} formatter={(v: number, n: string) => [money(v), n]} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" name="Received (cumulative)" dataKey="cumReceived" stroke="#16a34a" strokeWidth={2.5} dot={{ r: 3 }} />
          <Line type="monotone" name="Expense (cumulative)" dataKey="cumExpense" stroke="#f97316" strokeWidth={2.5} dot={{ r: 3 }} />
          <Line type="monotone" name="Balance" dataKey="cumBalance" stroke="#2563eb" strokeDasharray="5 4" strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
export { PALETTE }
