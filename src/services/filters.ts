import type { Transaction } from '../types/transaction'
import { shiftIso, todayIso } from '../utils/format'

export interface Filters {
  projectId: string // 'all' or a project id
  dateFrom: string | null
  dateTo: string | null
  datePreset: string
  categories: string[]
  subCategories: string[]
  materials: string[]
  vendors: string[]
  works: string[]
  paymentModes: string[]
  minAmount: number | null
  maxAmount: number | null
  search: string
  includeZero: boolean
}

export const defaultFilters: Filters = {
  projectId: 'all', dateFrom: null, dateTo: null, datePreset: 'all', categories: [], subCategories: [], materials: [],
  vendors: [], works: [], paymentModes: [], minAmount: null, maxAmount: null, search: '', includeZero: false,
}

export const DATE_PRESETS: { id: string; label: string }[] = [
  { id: 'all', label: 'All time' },
  { id: 'thisMonth', label: 'Latest month' },
  { id: 'lastMonth', label: 'Previous month' },
  { id: 'last30', label: 'Last 30 days' },
  { id: 'last90', label: 'Last 90 days' },
  { id: 'thisYear', label: 'Latest year' },
  { id: 'custom', label: 'Custom range' },
]

export function presetRange(id: string, anchor?: string): { from: string | null; to: string | null } {
  const t = anchor || todayIso()
  const [y, m] = t.split('-').map(Number)
  const pad = (n: number) => String(n).padStart(2, '0')
  switch (id) {
    case 'thisMonth': return { from: `${y}-${pad(m)}-01`, to: t }
    case 'lastMonth': {
      const py = m === 1 ? y - 1 : y
      const pm = m === 1 ? 12 : m - 1
      const last = new Date(Date.UTC(py, pm, 0)).getUTCDate()
      return { from: `${py}-${pad(pm)}-01`, to: `${py}-${pad(pm)}-${pad(last)}` }
    }
    case 'last30': return { from: shiftIso(t, -30), to: t }
    case 'last90': return { from: shiftIso(t, -90), to: t }
    case 'thisYear': return { from: `${y}-01-01`, to: t }
    default: return { from: null, to: null }
  }
}

const set = (a: string[]) => (a.length ? new Set(a) : null)

export function applyFilters(tx: Transaction[], f: Filters): Transaction[] {
  const cats = set(f.categories), subs = set(f.subCategories), mats = set(f.materials)
  const vens = set(f.vendors), works = set(f.works), pays = set(f.paymentModes)
  const q = f.search.trim().toLowerCase()
  const noop =
    f.projectId === 'all' && !f.dateFrom && !f.dateTo && !cats && !subs && !mats && !vens && !works && !pays &&
    f.minAmount === null && f.maxAmount === null && !q && f.includeZero
  if (noop) return tx
  return tx.filter((t) => {
    if (f.projectId !== 'all' && t.projectId !== f.projectId) return false
    if (!f.includeZero && !t.hasAmount) return false
    if (f.dateFrom && t.date < f.dateFrom) return false
    if (f.dateTo && t.date > f.dateTo) return false
    if (cats && !cats.has(t.category)) return false
    if (subs && !subs.has(t.subCategory)) return false
    if (mats && !mats.has(t.material)) return false
    if (vens && !vens.has(t.vendor)) return false
    if (works && !works.has(t.workDescription)) return false
    if (pays && !pays.has(t.paymentMode)) return false
    if (f.minAmount !== null && t.amount < f.minAmount) return false
    if (f.maxAmount !== null && t.amount > f.maxAmount) return false
    if (q) {
      const hay = `${t.category} ${t.subCategory} ${t.material} ${t.vendor} ${t.workDescription} ${t.description} ${t.invoiceNumber} ${t.referenceNumber}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })
}

/** Merge a drill-down scope (e.g. {materials:['Steel']}) onto the global filters. */
export function mergeScope(base: Filters, scope: Partial<Filters>): Filters {
  const out: Filters = { ...base }
  ;(['categories', 'subCategories', 'materials', 'vendors', 'works', 'paymentModes'] as const).forEach((k) => {
    const s = scope[k]
    if (s && s.length) out[k] = s
  })
  if (scope.projectId) out.projectId = scope.projectId
  if (scope.dateFrom) out.dateFrom = scope.dateFrom
  if (scope.dateTo) out.dateTo = scope.dateTo
  return out
}

export function activeChips(f: Filters): { id: string; label: string; clear: Partial<Filters> }[] {
  const chips: { id: string; label: string; clear: Partial<Filters> }[] = []
  const list = (key: 'categories' | 'subCategories' | 'materials' | 'vendors' | 'works' | 'paymentModes', label: string) => {
    f[key].forEach((v) => chips.push({ id: `${key}:${v}`, label: `${label}: ${v}`, clear: { [key]: f[key].filter((x) => x !== v) } }))
  }
  list('categories', 'Category'); list('subCategories', 'Item'); list('materials', 'Material')
  list('vendors', 'Vendor'); list('works', 'Work'); list('paymentModes', 'Payment')
  if (f.dateFrom || f.dateTo) chips.push({ id: 'date', label: `Date: ${f.dateFrom ?? '…'} → ${f.dateTo ?? '…'}`, clear: { dateFrom: null, dateTo: null, datePreset: 'all' } })
  if (f.minAmount !== null || f.maxAmount !== null) chips.push({ id: 'amount', label: `Amount: ${f.minAmount ?? 0} – ${f.maxAmount ?? '∞'}`, clear: { minAmount: null, maxAmount: null } })
  if (f.search.trim()) chips.push({ id: 'search', label: `Search: “${f.search.trim()}”`, clear: { search: '' } })
  return chips
}
