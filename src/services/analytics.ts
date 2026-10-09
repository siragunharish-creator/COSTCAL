/* Central calculation engine. Every number shown in the UI comes from here,
   and every function works on an explicit list of transactions so the same
   list can be shown in a table (traceability). */
import type { Transaction } from '../types/transaction'
import type { Receipt } from '../types/receipt'
import type { Project, WeeklyMode } from '../types/project'
import type { CashPoint, DayPoint, Group, Insight, MonthPoint } from '../types/analytics'
import { fmtMonth, fmtMonthShort, monthKey, money, moneyShort, fmtDate } from '../utils/format'

export function groupBy(tx: Transaction[], keyFn: (t: Transaction) => string, skipEmpty = true): Group[] {
  const map = new Map<string, Group>()
  let grand = 0
  for (const t of tx) {
    const key = keyFn(t)
    if (skipEmpty && !key) continue
    let g = map.get(key)
    if (!g) {
      g = { key, total: 0, count: 0, share: 0, qty: 0, qtyAmount: 0, min: Infinity, max: 0, first: t.date, last: t.date }
      map.set(key, g)
    }
    g.total += t.amount
    grand += t.amount
    if (t.hasAmount) {
      g.count++
      if (t.amount < g.min) g.min = t.amount
      if (t.amount > g.max) g.max = t.amount
      if (t.quantity && t.quantity > 0 && t.amount > 0) { g.qty += t.quantity; g.qtyAmount += t.amount }
    }
    if (t.date < g.first) g.first = t.date
    if (t.date > g.last) g.last = t.date
  }
  const out = [...map.values()]
  out.forEach((g) => { g.share = grand ? (g.total / grand) * 100 : 0; if (g.min === Infinity) g.min = 0 })
  return out.sort((a, b) => b.total - a.total)
}

export const calculateTotalExpense = (tx: Transaction[]) => tx.reduce((s, t) => s + t.amount, 0)
export const countPaid = (tx: Transaction[]) => tx.reduce((n, t) => n + (t.hasAmount ? 1 : 0), 0)
export const calculateCategoryTotals = (tx: Transaction[]) => groupBy(tx, (t) => t.category)
export const calculateMaterialTotals = (tx: Transaction[]) => groupBy(tx.filter((t) => t.material), (t) => t.material)
export const calculateLabourTotals = (tx: Transaction[]) => groupBy(tx.filter((t) => t.category === 'Labour'), (t) => t.subCategory)
export const calculateVendorTotals = (tx: Transaction[]) => groupBy(tx, (t) => t.vendor)
export const calculateWorkTotals = (tx: Transaction[]) => groupBy(tx, (t) => t.workDescription)
export const calculateItemTotals = (tx: Transaction[]) => groupBy(tx, (t) => t.subCategory)
export const calculateProjectGroups = (tx: Transaction[]) => groupBy(tx, (t) => t.projectId)

/** Average rate per unit – only when quantities cover most of the spend, otherwise the figure would mislead. */
export function averageRate(g: Pick<Group, 'qty' | 'qtyAmount' | 'total'>): number | null {
  return g.qty > 0 && g.qtyAmount >= 0.6 * g.total ? g.qtyAmount / g.qty : null
}

export function calculateMonthlyTotals(tx: Transaction[], fillGaps = true): MonthPoint[] {
  const map = new Map<string, MonthPoint>()
  for (const t of tx) {
    const key = monthKey(t.date)
    const p = map.get(key) ?? { key, label: fmtMonthShort(key), total: 0, count: 0 }
    p.total += t.amount
    if (t.hasAmount) p.count++
    map.set(key, p)
  }
  const keys = [...map.keys()].sort()
  if (!keys.length) return []
  if (!fillGaps) return keys.map((k) => map.get(k) as MonthPoint)
  const out: MonthPoint[] = []
  let [y, m] = keys[0].split('-').map(Number)
  const [ey, em] = keys[keys.length - 1].split('-').map(Number)
  while (y < ey || (y === ey && m <= em)) {
    const k = `${y}-${String(m).padStart(2, '0')}`
    out.push(map.get(k) ?? { key: k, label: fmtMonthShort(k), total: 0, count: 0 })
    m++; if (m > 12) { m = 1; y++ }
  }
  return out
}

export function calculateDailyTotals(tx: Transaction[]): DayPoint[] {
  const map = new Map<string, DayPoint>()
  for (const t of tx) {
    const p = map.get(t.date) ?? { key: t.date, total: 0, count: 0, high: false }
    p.total += t.amount
    if (t.hasAmount) p.count++
    map.set(t.date, p)
  }
  const out = [...map.values()].sort((a, b) => (a.key < b.key ? -1 : 1))
  if (out.length >= 14) {
    const mean = out.reduce((s, d) => s + d.total, 0) / out.length
    const sd = Math.sqrt(out.reduce((s, d) => s + (d.total - mean) ** 2, 0) / out.length)
    const thr = mean + 2 * sd
    out.forEach((d) => { d.high = d.total > thr })
  }
  return out
}

export function spanStats(tx: Transaction[]) {
  const days = new Set<string>()
  const months = new Set<string>()
  let total = 0
  for (const t of tx) { days.add(t.date); months.add(monthKey(t.date)); total += t.amount }
  const monthly = calculateMonthlyTotals(tx)
  return {
    total,
    workingDays: days.size,
    monthsSpan: monthly.length,
    avgDaily: days.size ? total / days.size : 0,
    avgMonthly: monthly.length ? total / monthly.length : 0,
  }
}

export function calculateCostPerSqft(total: number, area: number | null | undefined): number | null {
  return area && area > 0 ? total / area : null
}

/** Which transactions count towards project cost, given each project's Weekly-material setting. */
export function recognizedTransactions(tx: Transaction[], projects: Project[]): Transaction[] {
  const modes = new Map<string, WeeklyMode>(projects.map((p) => [p.id, p.settings.weeklyMode]))
  return tx.filter((t) => t.stream === 'ledger' || (modes.get(t.projectId) ?? 'additive') === 'additive')
}

export interface ProjectRow {
  project: Project
  received: number
  expense: number
  balance: number
  material: number
  labour: number
  other: number
  transactions: number
  costPerSqft: number | null
  budgetUsed: number | null
}

export function calculateProjectTotals(projects: Project[], tx: Transaction[], receipts: Receipt[]): ProjectRow[] {
  return projects.map((project) => {
    let expense = 0, material = 0, labour = 0, count = 0
    for (const t of tx) {
      if (t.projectId !== project.id) continue
      expense += t.amount
      if (t.category === 'Material') material += t.amount
      else if (t.category === 'Labour') labour += t.amount
      if (t.hasAmount) count++
    }
    const received = receipts.filter((r) => r.projectId === project.id).reduce((s, r) => s + r.amount, 0)
    return {
      project, received, expense, balance: received - expense, material, labour, other: expense - material - labour,
      transactions: count, costPerSqft: calculateCostPerSqft(expense, project.builtUpArea),
      budgetUsed: project.budget ? (expense / project.budget) * 100 : null,
    }
  })
}

export function calculateCashFlow(receipts: Receipt[], tx: Transaction[]): CashPoint[] {
  const map = new Map<string, { received: number; expense: number }>()
  for (const r of receipts) { const k = monthKey(r.date); const p = map.get(k) ?? { received: 0, expense: 0 }; p.received += r.amount; map.set(k, p) }
  for (const t of tx) { const k = monthKey(t.date); const p = map.get(k) ?? { received: 0, expense: 0 }; p.expense += t.amount; map.set(k, p) }
  const keys = [...map.keys()].sort()
  if (!keys.length) return []
  const out: CashPoint[] = []
  let [y, m] = keys[0].split('-').map(Number)
  const [ey, em] = keys[keys.length - 1].split('-').map(Number)
  let cr = 0, ce = 0
  while (y < ey || (y === ey && m <= em)) {
    const k = `${y}-${String(m).padStart(2, '0')}`
    const p = map.get(k) ?? { received: 0, expense: 0 }
    cr += p.received; ce += p.expense
    out.push({ key: k, label: fmtMonthShort(k), received: p.received, expense: p.expense, cumReceived: cr, cumExpense: ce, cumBalance: cr - ce })
    m++; if (m > 12) { m = 1; y++ }
  }
  return out
}

/** Split of a transaction list into the headline buckets used across the app. */
export function bucketTotals(tx: Transaction[]) {
  let material = 0, labour = 0, machine = 0, other = 0
  for (const t of tx) {
    if (t.category === 'Material') material += t.amount
    else if (t.category === 'Labour') labour += t.amount
    else if (t.category === 'Machine') machine += t.amount
    else other += t.amount
  }
  return { material, labour, machine, other, total: material + labour + machine + other }
}

/* ---------- insights: only what can be calculated from the data ---------- */

const median = (xs: number[]) => {
  if (!xs.length) return 0
  const s = [...xs].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

export function generateInsights(tx: Transaction[], projects: Project[], opts: { budgetProjects?: boolean } = {}): Insight[] {
  const out: Insight[] = []
  if (!tx.length) return out

  // high expense days
  const days = calculateDailyTotals(tx)
  const high = days.filter((d) => d.high).sort((a, b) => b.total - a.total)
  if (high.length) {
    out.push({
      id: 'high-days', level: 'warn', title: `${high.length} unusually high expense ${high.length === 1 ? 'day' : 'days'}`,
      detail: `Highest: ${fmtDate(high[0].key)} at ${money(high[0].total)}. Days are flagged when spend is more than 2 standard deviations above the daily average.`,
      link: `/days/${high[0].key}`,
    })
  }

  // month-on-month movement
  const allMonths = calculateMonthlyTotals(tx, false)
  // The latest month is skipped when the data stops mid-month, so a part-month is never compared with a full one.
  const lastDate = tx.reduce((m, t) => (t.date > m ? t.date : m), '')
  const dim = lastDate ? new Date(Date.UTC(+lastDate.slice(0, 4), +lastDate.slice(5, 7), 0)).getUTCDate() : 31
  const partial = !!lastDate && +lastDate.slice(8, 10) < dim - 2
  const months = partial ? allMonths.slice(0, -1) : allMonths
  if (months.length >= 2) {
    const cur = months[months.length - 1], prev = months[months.length - 2]
    if (prev.total > 0) {
      const ch = ((cur.total - prev.total) / prev.total) * 100
      if (Math.abs(ch) >= 25) {
        out.push({
          id: 'mom-total', level: ch > 0 ? 'warn' : 'info',
          title: `Total spending ${ch > 0 ? 'rose' : 'fell'} ${Math.abs(ch).toFixed(0)}% in ${fmtMonth(cur.key)}`,
          detail: `${moneyShort(cur.total)} in ${fmtMonth(cur.key)} vs ${moneyShort(prev.total)} in ${fmtMonth(prev.key)}.`,
          link: `/months/${cur.key}`,
        })
      }
    }
    const matMonth = (key: string) => {
      const m = new Map<string, number>()
      tx.forEach((t) => { if (t.category === 'Material' && t.material && monthKey(t.date) === key) m.set(t.material, (m.get(t.material) ?? 0) + t.amount) })
      return m
    }
    const a = matMonth(cur.key), b = matMonth(prev.key)
    const moves = [...a.entries()]
      .filter(([k, v]) => (b.get(k) ?? 0) >= 10000 && v >= 10000)
      .map(([k, v]) => ({ k, v, p: b.get(k) as number, ch: ((v - (b.get(k) as number)) / (b.get(k) as number)) * 100 }))
      .filter((x) => Math.abs(x.ch) >= 25)
      .sort((x, y) => Math.abs(y.ch) - Math.abs(x.ch))
      .slice(0, 3)
    moves.forEach((x) => out.push({
      id: `mom-${x.k}`, level: x.ch > 0 ? 'warn' : 'info',
      title: `${x.k} spending ${x.ch > 0 ? 'increased' : 'decreased'} ${Math.abs(x.ch).toFixed(0)}% compared with the previous month`,
      detail: `${moneyShort(x.v)} in ${fmtMonth(cur.key)} vs ${moneyShort(x.p)} in ${fmtMonth(prev.key)}.`,
      link: `/materials/${encodeURIComponent(x.k)}`,
    }))
  }

  // unusually high rates: per material, rate = amount / qty
  const byMat = new Map<string, Transaction[]>()
  tx.forEach((t) => { if (t.category === 'Material' && t.material && t.unit && t.quantity && t.quantity > 0 && t.amount > 0) { const k = `${t.material}|${t.unit}`; const l = byMat.get(k) ?? []; l.push(t); byMat.set(k, l) } })
  const rateHits: { mat: string; t: Transaction; rate: number; med: number }[] = []
  byMat.forEach((list, key) => {
    const mat = key.split('|')[0]
    if (list.length < 5) return
    const rates = list.map((t) => t.amount / (t.quantity as number))
    const med = median(rates)
    list.forEach((t, i) => { if (med > 0 && rates[i] > med * 1.5 && t.amount >= 5000) rateHits.push({ mat, t, rate: rates[i], med }) })
  })
  if (rateHits.length) {
    rateHits.sort((a, b) => b.rate / b.med - a.rate / a.med)
    const h = rateHits[0]
    out.push({
      id: 'high-rate', level: 'warn', title: `${rateHits.length} purchase${rateHits.length === 1 ? '' : 's'} priced well above the usual rate`,
      detail: `Example: ${h.mat} on ${fmtDate(h.t.date)} at ${money(h.rate, true)} per ${h.t.unit || 'unit'} vs a median of ${money(h.med, true)}.`,
      link: `/transactions/${h.t.id}`,
    })
  }

  // large single payments
  const paid = tx.filter((t) => t.hasAmount)
  const big = paid.reduce<Transaction | null>((b, t) => (!b || t.amount > b.amount ? t : b), null)
  if (big) {
    const med = median(paid.map((t) => t.amount))
    if (big.amount > med * 20 && big.amount >= 50000) {
      out.push({ id: 'big-payment', level: 'info', title: `Largest single entry: ${money(big.amount)}`, detail: `${big.subCategory || big.category} on ${fmtDate(big.date)}${big.workDescription ? ` – ${big.workDescription}` : ''}.`, link: `/transactions/${big.id}` })
    }
  }

  // potential duplicate entries
  const dupMap = new Map<string, number>()
  paid.forEach((t) => { if (t.amount >= 5000) { const k = `${t.projectId}|${t.date}|${t.amount}|${t.subCategory}|${t.workDescription}`; dupMap.set(k, (dupMap.get(k) ?? 0) + 1) } })
  const dups = [...dupMap.values()].filter((n) => n > 1).length
  if (dups) out.push({ id: 'dups', level: 'warn', title: `${dups} possible duplicate ${dups === 1 ? 'entry' : 'entries'}`, detail: 'Same date, item, work and amount (₹5,000 or more) appears more than once.', link: '/expenses' })

  // missing information
  const noAmount = tx.filter((t) => !t.hasAmount).length
  if (noAmount) out.push({ id: 'no-amount', level: 'info', title: `${noAmount} entries have no amount`, detail: 'They are kept for quantity tracking but add nothing to cost totals.' })
  if (!tx.some((t) => t.vendor)) out.push({ id: 'no-vendor', level: 'info', title: 'No vendor information in this data', detail: 'Vendor analysis needs a Vendor / Supplier column. Map one when importing, or add it to your Excel.' })

  // budget
  if (opts.budgetProjects !== false) {
    projects.forEach((p) => {
      if (!p.budget) return
      const spent = tx.filter((t) => t.projectId === p.id).reduce((s, t) => s + t.amount, 0)
      const used = (spent / p.budget) * 100
      if (used > 100) out.push({ id: `budget-${p.id}`, level: 'alert', title: `${p.name} is over budget`, detail: `${money(spent)} spent against a budget of ${money(p.budget)} (${used.toFixed(0)}%).`, link: `/projects/${p.id}` })
      else if (used >= 90) out.push({ id: `budget-${p.id}`, level: 'warn', title: `${p.name} has used ${used.toFixed(0)}% of its budget`, detail: `${money(p.budget - spent)} remaining.`, link: `/projects/${p.id}` })
    })
  }
  return out
}
