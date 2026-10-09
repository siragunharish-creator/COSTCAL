import type { WeeklyMode } from './project'

export interface Group {
  key: string; total: number; count: number; share: number
  qty: number; qtyAmount: number; min: number; max: number; first: string; last: string
}
export interface MonthPoint { key: string; label: string; total: number; count: number }
export interface DayPoint { key: string; total: number; count: number; high: boolean }
export interface CashPoint {
  key: string; label: string; received: number; expense: number
  cumReceived: number; cumExpense: number; cumBalance: number
}
export interface Insight {
  id: string
  level: 'info' | 'warn' | 'alert'
  title: string
  detail: string
  link?: string
}
export interface Reconciliation {
  projectId: string
  hasSummary: boolean
  mode: WeeklyMode
  statedExpense: number | null
  statedReceived: number | null
  contractValue: number | null
  ledgerTotal: number
  weeklyTotal: number
  recognizedTotal: number
  receivedTotal: number
  difference: number | null
  receivedDifference: number | null
  possibleOverlap: number
  possibleOverlapCount: number
  quantityOnlyRows: number
  noAmountRows: number
  notes: { level: 'ok' | 'warn' | 'info'; text: string }[]
}
