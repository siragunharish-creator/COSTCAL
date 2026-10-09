export type ProjectStatus = 'active' | 'completed' | 'on-hold' | 'archived'
/** additive = counted on top of the ledger; informational = shown only; ignored = not used. */
export type WeeklyMode = 'additive' | 'informational' | 'ignored'

export interface Project {
  id: string
  name: string
  location: string
  startDate: string | null
  endDate: string | null
  budget: number | null
  builtUpArea: number | null
  status: ProjectStatus
  createdAt: string
  settings: { weeklyMode: WeeklyMode; targetCostPerSqft: number | null }
}

/** Figures printed inside the Excel file itself; used only to cross-check calculated totals. */
export interface CostSummary {
  projectId: string
  sourceFile: string
  sourceSheet: string
  contractValue: number | null
  receivedStated: number | null
  balanceToReceiveStated: number | null
  expenseStated: number | null
  marginStated: number | null
  cashBalanceStated: number | null
  labels: { label: string; value: number; cell: string }[]
}

export interface ImportRecord {
  id: string
  projectId: string
  file: string
  at: string
  ledgerRows: number
  weeklyRows: number
  receiptRows: number
  skipped: number
  replaced: boolean
}
