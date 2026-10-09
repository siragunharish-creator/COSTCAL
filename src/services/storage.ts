/* Browser persistence. Kept behind one small interface so it can later be
   swapped for Supabase / PostgreSQL without touching the UI. */
import type { CostSummary, ImportRecord, Project } from '../types/project'
import type { Receipt } from '../types/receipt'
import type { Transaction } from '../types/transaction'

export interface Dataset {
  projects: Project[]
  transactions: Transaction[]
  receipts: Receipt[]
  summaries: CostSummary[]
  imports: ImportRecord[]
}
export const emptyDataset = (): Dataset => ({ projects: [], transactions: [], receipts: [], summaries: [], imports: [] })
const KEY = 'cci:v1:live'

export function loadDataset(): Dataset {
  try {
    const txt = localStorage.getItem(KEY)
    if (!txt) return emptyDataset()
    const d = JSON.parse(txt) as Dataset
    return { ...emptyDataset(), ...d }
  } catch {
    return emptyDataset()
  }
}
/** Returns false when the browser refuses (storage full / blocked). */
export function saveDataset(d: Dataset): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(d))
    return true
  } catch {
    return false
  }
}
export function wipeDataset() {
  try { localStorage.removeItem(KEY) } catch { /* ignore */ }
}
