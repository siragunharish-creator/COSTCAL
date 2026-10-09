/* Synthetic demo workbook-shaped data. It is generated in memory only, is clearly
   labelled DEMO DATA in the UI and is never mixed with live projects. */
import type { CostSummary, Project } from '../types/project'
import type { Receipt } from '../types/receipt'
import type { Transaction } from '../types/transaction'
import { shiftIso } from '../utils/format'
import type { Dataset } from './storage'

const FILE = 'DEMO – Sample Residence.xlsx'
const WORKS = ['Excavation and footing', 'Column work', 'Plinth beam', 'Ground floor brick work', 'Roof centring work', 'Lintel work', 'Inner plastering', 'Outer plastering', 'Tiles work', 'Painting work']
const MATS: { name: string; unit: string; rate: number; vendor: string }[] = [
  { name: 'Steel', unit: 'kg', rate: 64, vendor: 'Madras Steels' }, { name: 'Cement', unit: 'bags', rate: 320, vendor: 'Sri Ganesh Traders' },
  { name: 'Bricks', unit: 'nos', rate: 12.5, vendor: 'Annai Brick Works' }, { name: 'M.Sand', unit: 'cft', rate: 80, vendor: 'Lakshmi Sand Suppliers' },
  { name: 'Jelly', unit: 'cft', rate: 70, vendor: 'Lakshmi Sand Suppliers' }, { name: 'Tiles', unit: 'sqft', rate: 62, vendor: 'Tile Palace' },
  { name: 'Wires', unit: 'nos', rate: 3000, vendor: 'Bharat Electricals' },
]
const TRADES = [['Mason', 1350], ['MC', 1000], ['Fitter', 1280], ['Painter', 1100], ['Electrician', 1400]] as const

export function buildDemo(): Dataset {
  let s = 12345
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280)
  const pid = 'demo-901'
  const tx: Transaction[] = []
  let n = 0, row = 2
  const add = (p: Partial<Transaction> & Pick<Transaction, 'date' | 'category' | 'subCategory' | 'amount'>) => {
    n++
    tx.push({
      id: `demo-t${n}`, projectId: pid, categoryRaw: p.category, workDescription: '', material: '', vendor: '', description: p.subCategory,
      quantity: null, quantityText: '', unit: '', rate: null, hasAmount: true, paymentMode: '', invoiceNumber: '', referenceNumber: '',
      remarks: '', stream: 'ledger', dayNo: null, sourceFile: FILE, sourceSheet: 'Details', sourceRow: row++, raw: {}, flags: [], ...p,
    })
  }
  const start = '2025-04-01'
  for (let d = 0; d < 150; d++) {
    const date = shiftIso(start, d)
    if (new Date(date + 'T00:00:00Z').getUTCDay() === 0) continue
    const work = WORKS[Math.min(WORKS.length - 1, Math.floor(d / 15))]
    const base = { date, workDescription: work, dayNo: d + 1 }
    TRADES.forEach(([t, r], i) => {
      if (i > 1 && rnd() > 0.35) return
      const q = 1 + Math.floor(rnd() * 3)
      add({ ...base, category: 'Labour', subCategory: t, quantity: q, rate: r, amount: q * r })
    })
    if (rnd() > 0.82) add({ ...base, category: 'Machine', subCategory: 'JCB', quantity: 1, rate: 1000, amount: 1000 })
    if (rnd() > 0.45) {
      const m = MATS[Math.floor(rnd() * MATS.length)]
      const q = Math.round((m.unit === 'kg' ? 300 + rnd() * 700 : m.unit === 'nos' && m.rate < 20 ? 1000 + rnd() * 2000 : 10 + rnd() * 40))
      const rate = Math.round(m.rate * (0.95 + rnd() * 0.1) * 100) / 100
      add({ ...base, category: 'Material', subCategory: m.name, material: m.name, vendor: m.vendor, quantity: q, unit: m.unit, rate, amount: Math.round(q * rate), paymentMode: rnd() > 0.5 ? 'Cash' : 'UPI', invoiceNumber: `INV-${1000 + n}` })
    }
    add({ ...base, category: 'Misc', subCategory: 'Tea', amount: 150 })
    add({ ...base, category: 'Petrol', subCategory: 'Petrol', amount: 100 })
  }
  // weekly purchases (additional cost source)
  for (let w = 0; w < 20; w++) {
    const m = MATS[2 + (w % 2)]
    const date = shiftIso(start, 4 + w * 7)
    const q = m.unit === 'nos' ? 1500 : 50
    add({ date, category: 'Material', subCategory: m.name, material: m.name, vendor: m.vendor, workDescription: 'Weekly material', quantity: q, unit: m.unit, rate: m.rate, amount: Math.round(q * m.rate), stream: 'weekly', sourceSheet: 'Weekly material' })
  }
  const total = tx.reduce((a, t) => a + t.amount, 0)
  const receipts: Receipt[] = []
  const amounts = [0.15, 0.2, 0.2, 0.25, 0.25, 0.2]
  amounts.forEach((f, i) => receipts.push({ id: `demo-r${i}`, projectId: pid, date: shiftIso(start, 3 + i * 28), amount: Math.round((total * 1.12 * f) / 1000) * 1000, description: 'Stage payment', sourceFile: FILE, sourceSheet: 'Sheet1', sourceRow: 2 + i }))
  const received = receipts.reduce((a, r) => a + r.amount, 0)
  const project: Project = {
    id: pid, name: 'Demo Project 901', location: 'Sample Residence, Chennai', startDate: start, endDate: null, budget: null,
    builtUpArea: 1800, status: 'active', createdAt: new Date().toISOString(), settings: { weeklyMode: 'additive', targetCostPerSqft: null },
  }
  const summary: CostSummary = {
    projectId: pid, sourceFile: FILE, sourceSheet: 'Sheet1', contractValue: null, receivedStated: received, balanceToReceiveStated: null,
    expenseStated: total, marginStated: null, cashBalanceStated: received - total, labels: [{ label: 'Expenses Total', value: total, cell: 'I4' }, { label: 'Received Total', value: received, cell: 'F6' }],
  }
  return { projects: [project], transactions: tx, receipts, summaries: [summary], imports: [] }
}
