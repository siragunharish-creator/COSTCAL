import type { Transaction } from '../types/transaction'
import type { Receipt } from '../types/receipt'
import type { Project, CostSummary, WeeklyMode } from '../types/project'
import type { Reconciliation } from '../types/analytics'
import { money } from '../utils/format'

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)
const near = (a: number, b: number) => Math.abs(a - b) < 1

/** Decide how "Weekly material" relates to the ledger by checking which combination reproduces the workbook's own stated expense total. */
export function suggestWeeklyMode(ledger: number, weekly: number, statedExpense: number | null): WeeklyMode {
  if (statedExpense === null || weekly === 0) return 'additive'
  if (near(ledger + weekly, statedExpense)) return 'additive'
  if (near(ledger, statedExpense)) return 'informational'
  return 'additive'
}

export function calculateReconciliation(
  project: Project, tx: Transaction[], receipts: Receipt[], summary: CostSummary | undefined,
): Reconciliation {
  const mine = tx.filter((t) => t.projectId === project.id)
  const ledger = mine.filter((t) => t.stream === 'ledger')
  const weekly = mine.filter((t) => t.stream === 'weekly')
  const ledgerTotal = sum(ledger.map((t) => t.amount))
  const weeklyTotal = sum(weekly.map((t) => t.amount))
  const mode = project.settings.weeklyMode
  const recognizedTotal = mode === 'additive' ? ledgerTotal + weeklyTotal : ledgerTotal
  const receivedTotal = sum(receipts.filter((r) => r.projectId === project.id).map((r) => r.amount))
  const statedExpense = summary?.expenseStated ?? null
  const statedReceived = summary?.receivedStated ?? null

  // weekly rows that look like they already exist in the ledger (same date & amount, material)
  const ledgerKeys = new Map<string, number>()
  ledger.forEach((t) => { if (t.category === 'Material' && t.hasAmount) { const k = `${t.date}|${t.amount}`; ledgerKeys.set(k, (ledgerKeys.get(k) ?? 0) + 1) } })
  let possibleOverlap = 0, possibleOverlapCount = 0
  weekly.forEach((t) => { if (ledgerKeys.has(`${t.date}|${t.amount}`)) { possibleOverlap += t.amount; possibleOverlapCount++ } })

  const quantityOnlyRows = ledger.filter((t) => !t.hasAmount && t.category === 'Material').length
  const noAmountRows = ledger.filter((t) => !t.hasAmount).length
  const difference = statedExpense === null ? null : recognizedTotal - statedExpense
  const receivedDifference = statedReceived === null ? null : receivedTotal - statedReceived

  const notes: Reconciliation['notes'] = []
  if (summary && statedExpense !== null) {
    if (difference !== null && near(difference, 0)) {
      if (mode === 'additive' && weeklyTotal > 0 && near(ledgerTotal + weeklyTotal, statedExpense)) {
        notes.push({ level: 'ok', text: `The Cost Summary "Expenses Total" (${money(statedExpense)}) equals the Details ledger (${money(ledgerTotal)}) plus Weekly material (${money(weeklyTotal)}). Weekly material is therefore counted in addition to the ledger and nothing is double counted.` })
      } else {
        notes.push({ level: 'ok', text: `Recognized project cost (${money(recognizedTotal)}) matches the Cost Summary "Expenses Total".` })
      }
    } else if (mode === 'additive' && near(ledgerTotal, statedExpense) && weeklyTotal > 0) {
      notes.push({ level: 'warn', text: `The Cost Summary equals the Details ledger alone (${money(ledgerTotal)}), so Weekly material (${money(weeklyTotal)}) looks like it is already included there. Set Weekly material to "Informational" for this project to avoid counting it twice.` })
    } else if (difference !== null) {
      notes.push({ level: 'warn', text: `Recognized cost is ${money(Math.abs(difference))} ${difference > 0 ? 'higher' : 'lower'} than the Cost Summary figure (${money(statedExpense)}). The summary may contain manual adjustments, or some rows were not imported.` })
    }
  } else {
    notes.push({ level: 'info', text: 'No stated expense total was found in the workbook, so recognized cost is the calculated total only and cannot be cross-checked.' })
  }
  if (summary && statedReceived !== null && receivedDifference !== null && !near(receivedDifference, 0)) {
    notes.push({ level: 'warn', text: `Receipts add up to ${money(receivedTotal)} but the summary states ${money(statedReceived)} (difference ${money(Math.abs(receivedDifference))}).` })
  }
  if (weeklyTotal > 0) {
    notes.push({ level: 'info', text: mode === 'additive' ? 'Weekly material is treated as additional expense on top of the ledger.' : mode === 'informational' ? 'Weekly material is shown for reference only and is not added to project cost.' : 'Weekly material is ignored.' })
  }
  if (quantityOnlyRows > 0) {
    notes.push({ level: 'info', text: `${quantityOnlyRows} material rows in the ledger carry a quantity but no amount (for example "3 loads (weekly)"). Their cost is expected to sit in Weekly material, so they add nothing to the ledger total.` })
  }
  if (possibleOverlapCount > 0) {
    notes.push({ level: 'warn', text: `${possibleOverlapCount} Weekly material rows (${money(possibleOverlap)}) have a ledger material entry on the same date for the same amount – possible double counting. Review them in Expenses.` })
  }
  return {
    projectId: project.id, hasSummary: !!summary, mode, statedExpense, statedReceived, contractValue: summary?.contractValue ?? null,
    ledgerTotal, weeklyTotal, recognizedTotal, receivedTotal, difference, receivedDifference, possibleOverlap, possibleOverlapCount,
    quantityOnlyRows, noAmountRows, notes,
  }
}
