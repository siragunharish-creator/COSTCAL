import { useMemo, useState } from 'react'
import { Download, Printer } from 'lucide-react'
import { useScoped } from '../store/useScoped'
import { useData } from '../store/DataContext'
import { calculateCashFlow, calculateCategoryTotals, calculateMaterialTotals, calculateMonthlyTotals, calculateVendorTotals, calculateWorkTotals, calculateLabourTotals, bucketTotals } from '../services/analytics'
import { exportTable, type TableData } from '../services/exporter'
import { Btn, Card, Empty } from '../components/ui/primitives'
import { fmtDate, fmtMonth, money, num } from '../utils/format'

export default function Reports() {
  const { tx, receipts, scopedProjects } = useScoped()
  const { data } = useData()
  const [id, setId] = useState('project')
  const names = useMemo(() => new Map(data.projects.map((p) => [p.id, p.name])), [data.projects])
  const reports = useMemo<Record<string, TableData>>(() => {
    const total = tx.reduce((s, t) => s + t.amount, 0)
    const g = (rows: ReturnType<typeof calculateCategoryTotals>) => rows.map((r) => [r.key, r.total, r.count, +r.share.toFixed(1)])
    const gc = ['Name', 'Amount (₹)', 'Transactions', 'Share %']
    const b = bucketTotals(tx), rec = receipts.reduce((s, r) => s + r.amount, 0)
    return {
      project: { title: 'Project Cost Report', columns: ['Item', 'Amount (₹)'], rows: [['Total received', rec], ['Total project cost', total], ['Balance', rec - total], ['Material', b.material], ['Labour', b.labour], ['Machine', b.machine], ['Other', b.other], ['Transactions', tx.filter((t) => t.hasAmount).length], ...scopedProjects.map((p) => [`Project: ${p.name}`, tx.filter((t) => t.projectId === p.id).reduce((s, t) => s + t.amount, 0)] as (string | number)[])] },
      material: { title: 'Material Report', columns: gc, rows: g(calculateMaterialTotals(tx.filter((t) => t.category === 'Material'))) },
      labour: { title: 'Labour Report', columns: gc, rows: g(calculateLabourTotals(tx)) },
      vendor: { title: 'Vendor Report', columns: gc, rows: g(calculateVendorTotals(tx)) },
      work: { title: 'Work Analysis Report', columns: gc, rows: g(calculateWorkTotals(tx)) },
      monthly: { title: 'Monthly Expense Report', columns: ['Month', 'Amount (₹)', 'Transactions'], rows: calculateMonthlyTotals(tx).map((m) => [fmtMonth(m.key), m.total, m.count]) },
      cashflow: { title: 'Cash Flow Report', columns: ['Month', 'Received', 'Expense', 'Cum. received', 'Cum. expense', 'Cum. balance'], rows: calculateCashFlow(receipts, tx).map((c) => [fmtMonth(c.key), c.received, c.expense, c.cumReceived, c.cumExpense, c.cumBalance]) },
      transactions: { title: 'Complete Transaction Report', columns: ['Date', 'Project', 'Category', 'Item', 'Work', 'Vendor', 'Qty', 'Unit', 'Rate', 'Amount', 'Source file', 'Sheet', 'Row'], rows: tx.map((t) => [t.date, names.get(t.projectId) ?? '', t.category, t.subCategory, t.workDescription, t.vendor, t.quantity, t.unit, t.rate, t.amount, t.sourceFile, t.sourceSheet, t.sourceRow]) },
    }
  }, [tx, receipts, scopedProjects, names])
  const r = reports[id]
  const tabs: [string, string][] = [['project', 'Project cost'], ['material', 'Material'], ['labour', 'Labour'], ['vendor', 'Vendor'], ['work', 'Work analysis'], ['monthly', 'Monthly'], ['cashflow', 'Cash flow'], ['transactions', 'Transactions']]
  return (
    <div className="space-y-5">
      <div className="no-print"><h1 className="text-2xl font-bold">Reports</h1><p className="text-sm text-muted">Reports follow the project and filters selected above. Export to Excel/CSV, or print / save as PDF.</p></div>
      <div className="no-print flex flex-wrap gap-2">{tabs.map(([k, l]) => <button key={k} onClick={() => setId(k)} className={`rounded-full px-3 py-1.5 text-sm font-medium ${id === k ? 'bg-blue text-white' : 'border border-line bg-card hover:bg-bg'}`}>{l}</button>)}</div>
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3"><div><h2 className="font-semibold">{r.title}</h2><p className="text-xs text-muted">{scopedProjects.map((p) => p.name).join(', ') || 'No project'} · {num(r.rows.length)} rows</p></div>
          <div className="no-print flex gap-2"><Btn onClick={() => exportTable(r, 'xlsx')}><Download size={15} />Excel</Btn><Btn onClick={() => exportTable(r, 'csv')}>CSV</Btn><Btn onClick={() => window.print()}><Printer size={15} />Print / PDF</Btn></div></div>
        {r.rows.length === 0 ? <Empty title="Nothing to report" text="This report has no rows for the current data (for example, vendors need a vendor column)." /> : (
          <div className="max-h-[70vh] overflow-auto"><table className="w-full text-sm"><thead className="sticky top-0 bg-bg text-left text-xs uppercase tracking-wide text-muted"><tr>{r.columns.map((c) => <th key={c} className="px-4 py-2">{c}</th>)}</tr></thead>
            <tbody>{r.rows.slice(0, 500).map((row, i) => <tr key={i} className="border-t border-line">{row.map((v, j) => <td key={j} className={`px-4 py-1.5 ${typeof v === 'number' ? 'num text-right' : ''}`}>{typeof v === 'number' ? (/Row|Transactions|Qty|Rate|Share/.test(r.columns[j]) && r.columns[j] !== 'Amount (₹)' ? num(v, 2) : money(v)) : /^\d{4}-\d\d-\d\d$/.test(String(v)) ? fmtDate(String(v)) : v ?? ''}</td>)}</tr>)}</tbody></table>
            {r.rows.length > 500 && <p className="p-3 text-xs text-muted">Preview shows 500 of {num(r.rows.length)} rows – the export contains all of them.</p>}</div>)}
      </Card>
    </div>
  )
}
