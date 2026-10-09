import { useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Columns3, Download } from 'lucide-react'
import type { Transaction } from '../../types/transaction'
import { useData } from '../../store/DataContext'
import { useDrill } from '../../utils/nav'
import { fmtDate, money, num } from '../../utils/format'
import { exportTable } from '../../services/exporter'
import { Btn, Card, Empty } from '../ui/primitives'

type Col = { id: string; label: string; get: (t: Transaction, p: string) => string | number; right?: boolean; fmt?: (v: string | number) => string; on: boolean }
const COLS: Col[] = [
  { id: 'date', label: 'Date', get: (t) => t.date, fmt: (v) => fmtDate(String(v)), on: true },
  { id: 'project', label: 'Project', get: (_t, p) => p, on: true },
  { id: 'category', label: 'Category', get: (t) => t.category, on: true },
  { id: 'item', label: 'Item', get: (t) => t.subCategory, on: true },
  { id: 'work', label: 'Work', get: (t) => t.workDescription, on: true },
  { id: 'material', label: 'Material', get: (t) => t.material, on: false },
  { id: 'vendor', label: 'Vendor', get: (t) => t.vendor, on: false },
  { id: 'desc', label: 'Description', get: (t) => t.description, on: false },
  { id: 'qty', label: 'Qty', get: (t) => t.quantity ?? '', right: true, on: true },
  { id: 'unit', label: 'Unit', get: (t) => t.unit, on: false },
  { id: 'rate', label: 'Rate', get: (t) => t.rate ?? '', right: true, fmt: (v) => (v === '' ? '' : money(+v, true)), on: false },
  { id: 'amount', label: 'Amount', get: (t) => t.amount, right: true, fmt: (v) => money(+v), on: true },
  { id: 'pay', label: 'Payment', get: (t) => t.paymentMode, on: false },
  { id: 'invoice', label: 'Invoice', get: (t) => t.invoiceNumber, on: false },
  { id: 'source', label: 'Source', get: (t) => `${t.sourceSheet} · row ${t.sourceRow}`, on: true },
]

export function TransactionTable({ tx, title = 'Transactions', pageSize = 25, search = true }: { tx: Transaction[]; title?: string; pageSize?: number; search?: boolean }) {
  const { data } = useData()
  const { go } = useDrill()
  const names = useMemo(() => new Map(data.projects.map((p) => [p.id, p.name])), [data.projects])
  const [vis, setVis] = useState<Record<string, boolean>>(() => Object.fromEntries(COLS.map((c) => [c.id, c.on])))
  const [sort, setSort] = useState<{ id: string; dir: 1 | -1 }>({ id: 'date', dir: -1 })
  const [page, setPage] = useState(0)
  const [q, setQ] = useState('')
  const [menu, setMenu] = useState(false)
  const cols = COLS.filter((c) => vis[c.id])

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    let r = s ? tx.filter((t) => `${t.category} ${t.subCategory} ${t.workDescription} ${t.material} ${t.vendor} ${t.description} ${t.invoiceNumber}`.toLowerCase().includes(s)) : tx
    const col = COLS.find((c) => c.id === sort.id)!
    r = [...r].sort((a, b) => {
      const x = col.get(a, names.get(a.projectId) ?? ''), y = col.get(b, names.get(b.projectId) ?? '')
      if (typeof x === 'number' && typeof y === 'number') return (x - y) * sort.dir
      return String(x).localeCompare(String(y), undefined, { numeric: true }) * sort.dir
    })
    return r
  }, [tx, q, sort, names])
  useEffect(() => setPage(0), [tx, q, sort])
  const pages = Math.max(1, Math.ceil(rows.length / pageSize))
  const slice = rows.slice(page * pageSize, page * pageSize + pageSize)
  const total = rows.reduce((s, t) => s + t.amount, 0)

  const exportData = (f: 'xlsx' | 'csv') => exportTable({
    title, columns: [...COLS.map((c) => c.label), 'Source file'],
    rows: rows.map((t) => [...COLS.map((c) => c.get(t, names.get(t.projectId) ?? '')), t.sourceFile]),
  }, f)

  return (
    <Card className="overflow-hidden">
      <div className="no-print flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
        <div className="mr-auto"><h2 className="text-[15px] font-semibold">{title}</h2><p className="text-xs text-muted">{num(rows.length)} transactions · <span className="num">{money(total)}</span></p></div>
        {search && <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search this table…" aria-label="Search table" className="w-44 rounded-lg border border-line bg-bg px-3 py-1.5 text-sm" />}
        <div className="relative">
          <Btn onClick={() => setMenu(!menu)}><Columns3 size={15} />Columns</Btn>
          {menu && <div className="absolute right-0 z-20 mt-1 w-44 rounded-xl border border-line bg-card p-2 shadow-xl">{COLS.map((c) => <label key={c.id} className="flex items-center gap-2 px-2 py-1 text-sm"><input type="checkbox" checked={vis[c.id]} onChange={() => setVis({ ...vis, [c.id]: !vis[c.id] })} />{c.label}</label>)}</div>}
        </div>
        <Btn onClick={() => exportData('xlsx')}><Download size={15} />Excel</Btn>
        <Btn onClick={() => exportData('csv')}>CSV</Btn>
      </div>
      {rows.length === 0 ? <Empty title="No transactions" text="Nothing matches the current filters." /> : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-bg text-left text-xs uppercase tracking-wide text-muted"><tr>
              {cols.map((c) => <th key={c.id} className={`px-3 py-2 font-semibold ${c.right ? 'text-right' : ''}`}>
                <button onClick={() => setSort({ id: c.id, dir: sort.id === c.id ? (sort.dir === 1 ? -1 : 1) : 1 })} className="inline-flex items-center gap-1 uppercase">{c.label}{sort.id === c.id && (sort.dir === 1 ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}</button></th>)}
            </tr></thead>
            <tbody>
              {slice.map((t) => (
                <tr key={t.id} onClick={() => go(`/transactions/${t.id}`)} className="cursor-pointer border-t border-line hover:bg-blue-soft">
                  {cols.map((c) => { const v = c.get(t, names.get(t.projectId) ?? ''); return <td key={c.id} className={`max-w-[260px] truncate px-3 py-2 ${c.right ? 'num text-right' : ''} ${c.id === 'amount' ? 'font-semibold' : ''}`}>{c.fmt ? c.fmt(v) : String(v)}</td> })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="no-print flex items-center justify-between border-t border-line px-4 py-2 text-sm text-muted">
        <span>Page {page + 1} of {pages}</span>
        <div className="flex gap-1"><Btn disabled={page === 0} onClick={() => setPage(page - 1)} aria-label="Previous page"><ChevronLeft size={16} /></Btn><Btn disabled={page >= pages - 1} onClick={() => setPage(page + 1)} aria-label="Next page"><ChevronRight size={16} /></Btn></div>
      </div>
    </Card>
  )
}
