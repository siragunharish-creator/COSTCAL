import type { Transaction } from '../../types/transaction'
import type { Filters } from '../../services/filters'

export interface DimSection { title: string; by: (t: Transaction) => string; to?: (k: string) => string; skipIfOne?: boolean }
export interface DimCfg {
  id: string
  title: string
  singular: string
  route: string
  pick: (tx: Transaction[]) => Transaction[]
  key: (t: Transaction) => string
  scope: (name: string) => Partial<Filters>
  sections: DimSection[]
  explain: string
}
const enc = encodeURIComponent

export const MATERIAL: DimCfg = {
  id: 'material', title: 'Materials', singular: 'Material', route: '/materials', explain: 'Every purchase in the Material category, grouped by material name.',
  pick: (tx) => tx.filter((t) => t.category === 'Material'), key: (t) => t.material,
  scope: (n) => ({ materials: [n] }),
  sections: [
    { title: 'Vendor-wise cost', by: (t) => t.vendor, to: (k) => `/vendors/${enc(k)}` },
    { title: 'Work-wise cost', by: (t) => t.workDescription, to: (k) => `/work/${enc(k)}` },
    { title: 'Project-wise cost', by: (t) => t.projectId, skipIfOne: true },
  ],
}
export const LABOUR: DimCfg = {
  id: 'labour', title: 'Labour', singular: 'Labour category', route: '/labour', explain: 'Labour entries grouped by trade (Mason, MC, Fitter…) as written in your Excel.',
  pick: (tx) => tx.filter((t) => t.category === 'Labour'), key: (t) => t.subCategory,
  scope: (n) => ({ categories: ['Labour'], subCategories: [n] }),
  sections: [{ title: 'Work-wise labour cost', by: (t) => t.workDescription, to: (k) => `/work/${enc(k)}` }, { title: 'Project-wise cost', by: (t) => t.projectId, skipIfOne: true }],
}
export const WORK: DimCfg = {
  id: 'work', title: 'Work Analysis', singular: 'Work activity', route: '/work', explain: 'Cost of each construction activity, from the “Work Description” column.',
  pick: (tx) => tx, key: (t) => t.workDescription,
  scope: (n) => ({ works: [n] }),
  sections: [
    { title: 'By category', by: (t) => t.category, to: (k) => `/categories/${enc(k)}` },
    { title: 'Materials used', by: (t) => (t.category === 'Material' ? t.material : ''), to: (k) => `/materials/${enc(k)}` },
    { title: 'Labour used', by: (t) => (t.category === 'Labour' ? t.subCategory : ''), to: (k) => `/labour/${enc(k)}` },
  ],
}
export const VENDOR: DimCfg = {
  id: 'vendor', title: 'Vendors', singular: 'Vendor', route: '/vendors', explain: 'Payments grouped by the Vendor / Supplier column.',
  pick: (tx) => tx.filter((t) => t.vendor), key: (t) => t.vendor,
  scope: (n) => ({ vendors: [n] }),
  sections: [{ title: 'Materials supplied', by: (t) => t.material || t.subCategory, to: (k) => `/materials/${enc(k)}` }, { title: 'Projects', by: (t) => t.projectId, skipIfOne: true }],
}
export const CATEGORY: DimCfg = {
  id: 'category', title: 'Categories', singular: 'Category', route: '/categories', explain: 'All entries in one expense category.',
  pick: (tx) => tx, key: (t) => t.category,
  scope: (n) => ({ categories: [n] }),
  sections: [
    { title: 'Items', by: (t) => t.subCategory },
    { title: 'Work-wise cost', by: (t) => t.workDescription, to: (k) => `/work/${enc(k)}` },
  ],
}
export const DIMS: Record<string, DimCfg> = { material: MATERIAL, labour: LABOUR, work: WORK, vendor: VENDOR, category: CATEGORY }
