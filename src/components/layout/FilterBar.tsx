import { useMemo } from 'react'
import { X } from 'lucide-react'
import { useData } from '../../store/DataContext'
import { useScoped } from '../../store/useScoped'
import { activeChips } from '../../services/filters'
import { MultiSelect, Btn } from '../ui/primitives'

export function ActiveChips() {
  const { filters, setFilters, resetFilters } = useData()
  const chips = activeChips(filters)
  if (!chips.length && filters.projectId === 'all') return null
  return (
    <div className="no-print mb-4 flex flex-wrap items-center gap-2">
      {chips.map((c) => (
        <span key={c.id} className="inline-flex items-center gap-1 rounded-full bg-blue-soft px-3 py-1 text-xs font-medium text-blue">
          {c.label}<button aria-label={`Remove filter ${c.label}`} onClick={() => setFilters(c.clear)}><X size={13} /></button>
        </span>
      ))}
      {chips.length > 0 && <button onClick={resetFilters} className="text-xs font-medium text-muted underline hover:text-ink">Clear all</button>}
    </div>
  )
}

export function FilterPanel({ onDone }: { onDone?: () => void }) {
  const { filters, setFilters, resetFilters } = useData()
  const { recognizedAll } = useScoped()
  const opts = useMemo(() => {
    const u = (f: (t: (typeof recognizedAll)[number]) => string) => [...new Set(recognizedAll.map(f).filter(Boolean))].sort()
    return { cat: u((t) => t.category), sub: u((t) => t.subCategory), mat: u((t) => t.material), ven: u((t) => t.vendor), work: u((t) => t.workDescription), pay: u((t) => t.paymentMode) }
  }, [recognizedAll])
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <MultiSelect label="Category" options={opts.cat} value={filters.categories} onChange={(v) => setFilters({ categories: v })} />
        <MultiSelect label="Subcategory" options={opts.sub} value={filters.subCategories} onChange={(v) => setFilters({ subCategories: v })} />
        <MultiSelect label="Material" options={opts.mat} value={filters.materials} onChange={(v) => setFilters({ materials: v })} />
        <MultiSelect label="Vendor" options={opts.ven} value={filters.vendors} onChange={(v) => setFilters({ vendors: v })} />
        <MultiSelect label="Work" options={opts.work} value={filters.works} onChange={(v) => setFilters({ works: v })} />
        <MultiSelect label="Payment mode" options={opts.pay} value={filters.paymentModes} onChange={(v) => setFilters({ paymentModes: v })} />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-xs text-muted">Min amount<input type="number" value={filters.minAmount ?? ''} onChange={(e) => setFilters({ minAmount: e.target.value === '' ? null : +e.target.value })} className="mt-1 w-full rounded-lg border border-line bg-card px-3 py-2 text-sm text-ink" /></label>
        <label className="text-xs text-muted">Max amount<input type="number" value={filters.maxAmount ?? ''} onChange={(e) => setFilters({ maxAmount: e.target.value === '' ? null : +e.target.value })} className="mt-1 w-full rounded-lg border border-line bg-card px-3 py-2 text-sm text-ink" /></label>
        <label className="flex items-end gap-2 pb-2 text-sm text-ink"><input type="checkbox" checked={filters.includeZero} onChange={(e) => setFilters({ includeZero: e.target.checked })} className="accent-[var(--blue)]" />Include rows without an amount</label>
      </div>
      <div className="flex gap-2"><Btn kind="ghost" onClick={resetFilters}>Reset filters</Btn>{onDone && <Btn kind="primary" onClick={onDone}>Apply</Btn>}</div>
    </div>
  )
}
