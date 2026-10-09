import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { CostSummary, ImportRecord, Project, ProjectStatus, WeeklyMode } from '../types/project'
import type { Receipt } from '../types/receipt'
import type { Transaction } from '../types/transaction'
import { emptyDataset, loadDataset, saveDataset, wipeDataset, type Dataset } from '../services/storage'
import { buildDemo } from '../services/demoData'
import { defaultFilters, type Filters } from '../services/filters'
import { uid } from '../utils/format'

export interface CommitArgs {
  project: Project
  transactions: Transaction[]
  receipts: Receipt[]
  summary: CostSummary | null
  record: Omit<ImportRecord, 'id' | 'at'>
  /** remove earlier rows that came from the same file before adding the new ones */
  replaceFile: boolean
}

interface Ctx {
  data: Dataset
  mode: 'live' | 'demo'
  storageOk: boolean
  filters: Filters
  setFilters: (p: Partial<Filters> | ((f: Filters) => Partial<Filters>)) => void
  resetFilters: () => void
  commitImport: (a: CommitArgs) => void
  saveProject: (p: Project) => void
  deleteProject: (id: string) => void
  setStatus: (id: string, s: ProjectStatus) => void
  setWeeklyMode: (id: string, m: WeeklyMode) => void
  loadDemo: () => void
  exitDemo: () => void
  clearAll: () => void
}
const C = createContext<Ctx | null>(null)
export const useData = () => {
  const c = useContext(C)
  if (!c) throw new Error('DataProvider missing')
  return c
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [live, setLive] = useState<Dataset>(() => loadDataset())
  const [demo, setDemo] = useState<Dataset | null>(null)
  const [storageOk, setStorageOk] = useState(true)
  const [filters, setF] = useState<Filters>(defaultFilters)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => {
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setStorageOk(saveDataset(live)), 400)
  }, [live])

  const mode = demo ? 'demo' : 'live'
  const data = demo ?? live
  const update = useCallback((fn: (d: Dataset) => Dataset) => (demo ? setDemo(fn(demo)) : setLive((d) => fn(d))), [demo])

  const setFilters = useCallback((p: Partial<Filters> | ((f: Filters) => Partial<Filters>)) =>
    setF((f) => ({ ...f, ...(typeof p === 'function' ? p(f) : p) })), [])
  const resetFilters = useCallback(() => setF((f) => ({ ...defaultFilters, projectId: f.projectId })), [])

  const commitImport = useCallback((a: CommitArgs) => {
    // Importing real data always leaves demo mode: demo and live data never mix.
    setDemo(null)
    setLive((d) => {
      const exists = d.projects.some((p) => p.id === a.project.id)
      const drop = (x: { projectId: string; sourceFile: string }) => a.replaceFile && x.projectId === a.project.id && x.sourceFile === a.record.file
      const dates = [...d.transactions.filter((t) => t.projectId === a.project.id && !drop(t)), ...a.transactions].map((t) => t.date).sort()
      const project = { ...a.project, startDate: a.project.startDate ?? dates[0] ?? null, endDate: dates[dates.length - 1] ?? null }
      return {
        projects: exists ? d.projects.map((p) => (p.id === project.id ? project : p)) : [...d.projects, project],
        transactions: [...d.transactions.filter((t) => !drop(t)), ...a.transactions],
        receipts: [...d.receipts.filter((r) => !drop(r)), ...a.receipts],
        summaries: a.summary ? [...d.summaries.filter((s) => !(s.projectId === project.id && s.sourceFile === a.summary!.sourceFile)), a.summary] : d.summaries,
        imports: [{ ...a.record, id: uid('i'), at: new Date().toISOString() }, ...d.imports],
      }
    })
    setF((f) => ({ ...f, projectId: 'all' }))
  }, [])

  const saveProject = useCallback((p: Project) => update((d) => ({ ...d, projects: d.projects.some((x) => x.id === p.id) ? d.projects.map((x) => (x.id === p.id ? p : x)) : [...d.projects, p] })), [update])
  const deleteProject = useCallback((id: string) => {
    update((d) => ({ projects: d.projects.filter((p) => p.id !== id), transactions: d.transactions.filter((t) => t.projectId !== id), receipts: d.receipts.filter((r) => r.projectId !== id), summaries: d.summaries.filter((s) => s.projectId !== id), imports: d.imports.filter((i) => i.projectId !== id) }))
    setF((f) => (f.projectId === id ? { ...f, projectId: 'all' } : f))
  }, [update])
  const setStatus = useCallback((id: string, status: ProjectStatus) => update((d) => ({ ...d, projects: d.projects.map((p) => (p.id === id ? { ...p, status } : p)) })), [update])
  const setWeeklyMode = useCallback((id: string, m: WeeklyMode) => update((d) => ({ ...d, projects: d.projects.map((p) => (p.id === id ? { ...p, settings: { ...p.settings, weeklyMode: m } } : p)) })), [update])

  const value = useMemo<Ctx>(() => ({
    data, mode, storageOk, filters, setFilters, resetFilters, commitImport, saveProject, deleteProject, setStatus, setWeeklyMode,
    loadDemo: () => { setDemo(buildDemo()); setF(defaultFilters) },
    exitDemo: () => { setDemo(null); setF(defaultFilters) },
    clearAll: () => { wipeDataset(); setLive(emptyDataset()); setF(defaultFilters) },
  }), [data, mode, storageOk, filters, setFilters, resetFilters, commitImport, saveProject, deleteProject, setStatus, setWeeklyMode])
  return <C.Provider value={value}>{children}</C.Provider>
}
