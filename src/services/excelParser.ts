/* Reads a workbook, works out what each sheet is, and extracts normalised
   transactions / receipts / summary figures with full source traceability. */
import * as XLSX from 'xlsx'
import type { CostSummary } from '../types/project'
import type { Receipt } from '../types/receipt'
import type { Transaction } from '../types/transaction'
import {
  canonicalItem, canonicalMaterial, DEFAULT_CATEGORY_MAP, normalizeCategory, makeNamer, parseDateValue, parseNumber,
  parseQuantity, parseWeeklyText, titleCase, normUnit,
} from './dataNormalizer'
import { colLetter, uid } from '../utils/format'

export class ImportError extends Error {}

/* ---------- fields & synonyms ---------- */

export type FieldKey =
  | 'date' | 'day' | 'category' | 'work' | 'item' | 'material' | 'vendor' | 'description' | 'quantity'
  | 'unit' | 'rate' | 'amount' | 'paymentMode' | 'invoice' | 'reference' | 'remarks'
export type ColumnMapping = Partial<Record<FieldKey, number>>

export const FIELD_LABELS: Record<FieldKey, string> = {
  date: 'Date', day: 'Day number', category: 'Category', work: 'Work description', item: 'Item / details',
  material: 'Material', vendor: 'Vendor / supplier', description: 'Description', quantity: 'Quantity',
  unit: 'Unit', rate: 'Rate', amount: 'Amount', paymentMode: 'Payment mode', invoice: 'Invoice number',
  reference: 'Reference number', remarks: 'Remarks',
}

const SYN: Record<FieldKey, { exact: string[]; contains: string[] }> = {
  date: { exact: ['date', 'transactiondate', 'expensedate', 'billdate', 'datereceived', 'receiveddate', 'paymentdate', 'entrydate', 'dateofexpense'], contains: ['date'] },
  amount: { exact: ['amount', 'cost', 'expense', 'total', 'paidamount', 'totalamount', 'amountrs', 'amountinr', 'value', 'netamount', 'debit', 'amountpaid'], contains: ['amount', 'cost', 'paid'] },
  category: { exact: ['category', 'type', 'expensetype', 'costtype', 'head', 'expensehead', 'costhead', 'group', 'expensecategory'], contains: ['category'] },
  work: { exact: ['workdescription', 'work', 'activity', 'workname', 'workactivity', 'workdone', 'stage', 'workdetails'], contains: ['work', 'activity'] },
  material: { exact: ['material', 'materialname', 'product', 'materialdescription', 'productname', 'materials'], contains: ['material', 'product'] },
  vendor: { exact: ['vendor', 'supplier', 'party', 'suppliername', 'vendorname', 'partyname', 'paidto', 'payee', 'shop', 'shopname'], contains: ['vendor', 'supplier', 'payee'] },
  quantity: { exact: ['qty', 'quantity', 'quantities', 'nos'], contains: ['qty', 'quantit'] },
  rate: { exact: ['rate', 'unitrate', 'price', 'unitprice', 'rateperunit'], contains: ['rate'] },
  unit: { exact: ['unit', 'uom', 'units'], contains: [] },
  item: { exact: ['details', 'item', 'itemname', 'itemdescription', 'particulars', 'items', 'detail'], contains: ['item', 'particular'] },
  paymentMode: { exact: ['paymentmode', 'mode', 'paymenttype', 'modeofpayment', 'paymentmethod', 'paidby'], contains: ['payment'] },
  invoice: { exact: ['invoice', 'invoiceno', 'invoicenumber', 'billno', 'billnumber', 'receiptno', 'voucherno', 'bill'], contains: ['invoice', 'billno'] },
  reference: { exact: ['reference', 'referenceno', 'referencenumber', 'refno', 'ref', 'chequeno', 'utr', 'transactionid'], contains: ['reference'] },
  remarks: { exact: ['remarks', 'remark', 'notes', 'note', 'comment', 'comments'], contains: ['remark'] },
  day: { exact: ['day', 'dayno', 'daynumber'], contains: [] },
  description: { exact: ['description', 'narration', 'desc'], contains: ['descr'] },
}
const ORDER: FieldKey[] = ['date', 'amount', 'category', 'work', 'material', 'vendor', 'quantity', 'rate', 'unit', 'item', 'paymentMode', 'invoice', 'reference', 'remarks', 'day', 'description']

const normHeader = (h: unknown) => String(h ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')

export function assignColumns(headers: string[]): ColumnMapping {
  const norm = headers.map(normHeader)
  const used = new Set<number>()
  const map: ColumnMapping = {}
  for (const f of ORDER) {
    const idx = norm.findIndex((h, i) => !used.has(i) && h !== '' && SYN[f].exact.includes(h))
    if (idx >= 0) { map[f] = idx; used.add(idx) }
  }
  for (const f of ORDER) {
    if (map[f] !== undefined) continue
    const idx = norm.findIndex((h, i) => !used.has(i) && h !== '' && SYN[f].contains.some((k) => h.includes(k)))
    if (idx >= 0) { map[f] = idx; used.add(idx) }
  }
  if (map.work === undefined && map.description !== undefined) { map.work = map.description; delete map.description }
  return map
}

/* ---------- workbook model ---------- */

export type SheetRole = 'ledger' | 'weekly' | 'receipts' | 'ignore'
export const ROLE_LABELS: Record<SheetRole, string> = {
  ledger: 'Expense ledger',
  weekly: 'Weekly material purchases',
  receipts: 'Cost summary & money received',
  ignore: 'Ignore this sheet',
}

export interface SheetData {
  name: string
  aoa: unknown[][]
  rowOffset: number
  colOffset: number
  nonEmptyRows: number
  headerRow: number
  headers: string[]
  mapping: ColumnMapping
  role: SheetRole
  detectedRole: SheetRole
  note: string
}

export interface ParsedWorkbook {
  fileName: string
  sheets: SheetData[]
  projectName: string
  location: string
}

const isBlank = (v: unknown) => v === null || v === undefined || (typeof v === 'string' && v.trim() === '')
const cellText = (v: unknown): string => {
  if (isBlank(v)) return ''
  if (v instanceof Date) return parseDateValue(v).iso ?? ''
  return String(v).replace(/\s+/g, ' ').trim()
}

export function detectHeader(aoa: unknown[][]): { headerRow: number; mapping: ColumnMapping; headers: string[] } {
  let best = { row: -1, score: 0, mapping: {} as ColumnMapping }
  const limit = Math.min(aoa.length, 40)
  for (let i = 0; i < limit; i++) {
    const cells = (aoa[i] ?? []).map(cellText)
    if (cells.filter(Boolean).length < 2) continue
    const mapping = assignColumns(cells)
    const keys = Object.keys(mapping) as FieldKey[]
    if (!keys.includes('date') && !keys.includes('amount')) continue
    const score = keys.length + (mapping.date !== undefined ? 2 : 0) + (mapping.amount !== undefined ? 2 : 0)
    if (score > best.score) best = { row: i, score, mapping }
  }
  if (best.row < 0) return { headerRow: 0, mapping: {}, headers: (aoa[0] ?? []).map((c, i) => cellText(c) || `Column ${colLetter(i)}`) }
  const headers = (aoa[best.row] ?? []).map((c, i) => cellText(c) || `Column ${colLetter(i)}`)
  return { headerRow: best.row, mapping: best.mapping, headers }
}

function guessRole(name: string, mapping: ColumnMapping, headers: string[], nonEmptyRows: number): { role: SheetRole; note: string } {
  if (nonEmptyRows < 2) return { role: 'ignore', note: 'No data found in this sheet.' }
  if (mapping.date === undefined && mapping.amount === undefined) return { role: 'ignore', note: 'No date or amount columns recognised.' }
  const dateHeader = normHeader(headers[mapping.date ?? -1])
  const hasCat = mapping.category !== undefined
  const hasWork = mapping.work !== undefined
  if (dateHeader.includes('receiv') || (/summary|receipt|received/i.test(name) && !hasCat && !hasWork && mapping.material === undefined)) {
    return { role: 'receipts', note: 'Looks like money received plus project summary figures.' }
  }
  if (/weekly/i.test(name) || (mapping.material !== undefined && !hasCat)) {
    return { role: 'weekly', note: 'Looks like a material purchase list (no category column).' }
  }
  if (hasCat || hasWork || mapping.item !== undefined) return { role: 'ledger', note: 'Looks like the detailed expense ledger.' }
  return { role: mapping.date !== undefined && mapping.amount !== undefined ? 'ledger' : 'ignore', note: 'Treated as an expense list.' }
}

export function inspectSheet(name: string, aoa: unknown[][], rowOffset: number, colOffset: number): SheetData {
  const nonEmptyRows = aoa.reduce<number>((n, r) => n + (r.some((c) => !isBlank(c)) ? 1 : 0), 0)
  const { headerRow, mapping, headers } = detectHeader(aoa)
  const { role, note } = guessRole(name, mapping, headers, nonEmptyRows)
  return { name, aoa, rowOffset, colOffset, nonEmptyRows, headerRow, headers, mapping, role, detectedRole: role, note }
}

export function readWorkbook(buf: ArrayBuffer | Uint8Array, fileName: string): ParsedWorkbook {
  if (!buf || (buf as ArrayBuffer).byteLength === 0) throw new ImportError(`"${fileName}" is empty.`)
  let wb: XLSX.WorkBook
  try {
    wb = XLSX.read(buf, { type: 'array', cellDates: true })
  } catch {
    throw new ImportError(`"${fileName}" could not be read. The file may be corrupted, password-protected or not an Excel workbook.`)
  }
  if (!wb.SheetNames.length) throw new ImportError(`"${fileName}" does not contain any sheets.`)
  const sheets: SheetData[] = []
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name]
    if (!ws || !ws['!ref']) {
      sheets.push({ name, aoa: [], rowOffset: 0, colOffset: 0, nonEmptyRows: 0, headerRow: 0, headers: [], mapping: {}, role: 'ignore', detectedRole: 'ignore', note: 'Empty sheet.' })
      continue
    }
    const ref = XLSX.utils.decode_range(ws['!ref'])
    const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: null, blankrows: true })
    sheets.push(inspectSheet(name, aoa, ref.s.r, ref.s.c))
  }
  if (!sheets.some((s) => s.role !== 'ignore')) {
    throw new ImportError(`No expense table was found in "${fileName}". Check that it has a header row with columns such as Date, Category and Amount.`)
  }
  const { projectName, location } = guessProject(sheets, fileName)
  return { fileName, sheets, projectName, location }
}

function guessProject(sheets: SheetData[], fileName: string): { projectName: string; location: string } {
  for (const s of sheets.filter((x) => x.role === 'receipts')) {
    for (let r = 0; r < Math.min(s.aoa.length, 4); r++) {
      for (const c of s.aoa[r] ?? []) {
        if (typeof c === 'string' && c.includes('@')) {
          const [a, b] = c.split('@')
          return { projectName: a.replace(/\s+/g, ' ').trim(), location: (b ?? '').replace(/\s+/g, ' ').trim() }
        }
      }
    }
  }
  const base = fileName.replace(/\.[^.]+$/, '').replace(/_/g, ' ').replace(/\s+/g, ' ').trim()
  const parts = base.split(/\s-\s/)
  return { projectName: parts[0] || base, location: parts.slice(1).join(' - ') }
}

/* ---------- extraction ---------- */

export interface Issue { sheet: string; row: number; kind: string; message: string }

export interface ValidationReport {
  totalRows: number
  validRows: number
  invalidRows: number
  ignoredRows: number
  missingDates: number
  invalidDates: number
  missingAmounts: number
  invalidNumbers: number
  missingCategories: number
  unknownCategories: number
  unknownCategoryList: string[]
  missingVendors: number | null
  repeatedEntries: number
  perSheet: { sheet: string; role: SheetRole; rows: number; valid: number }[]
  issues: Issue[]
}

export interface ExtractContext {
  projectId: string
  categoryMap: Record<string, string>
}

export interface ExtractResult {
  transactions: Transaction[]
  receipts: Receipt[]
  summary: CostSummary | null
  validation: ValidationReport
}

const tick = () => new Promise<void>((r) => setTimeout(r, 0))

function emptyReport(): ValidationReport {
  return {
    totalRows: 0, validRows: 0, invalidRows: 0, ignoredRows: 0, missingDates: 0, invalidDates: 0, missingAmounts: 0,
    invalidNumbers: 0, missingCategories: 0, unknownCategories: 0, unknownCategoryList: [], missingVendors: null,
    repeatedEntries: 0, perSheet: [], issues: [],
  }
}

function rawRecord(sheet: SheetData, row: unknown[]): Record<string, string> {
  const out: Record<string, string> = {}
  sheet.headers.forEach((h, c) => {
    const v = row[c]
    if (!isBlank(v)) out[h] = cellText(v)
  })
  return out
}

const SUMMARY_LABELS: { key: keyof Omit<CostSummary, 'projectId' | 'sourceFile' | 'sourceSheet' | 'labels'>; re: RegExp }[] = [
  { key: 'cashBalanceStated', re: /received.*-.*expense/ },
  { key: 'marginStated', re: /^expense\s*-\s*project\s*cost/ },
  { key: 'contractValue', re: /^total amount|contract (value|amount)|project value|agreed (amount|value)/ },
  { key: 'receivedStated', re: /^received total|^total received/ },
  { key: 'balanceToReceiveStated', re: /^balance total|^balance (to be )?(received|receivable)|^pending/ },
  { key: 'expenseStated', re: /^expenses? total|^total expenses?|^total (project )?cost/ },
]

function extractSummary(sheet: SheetData, ctx: ExtractContext, fileName: string): CostSummary | null {
  const found: CostSummary = {
    projectId: ctx.projectId, sourceFile: fileName, sourceSheet: sheet.name, contractValue: null, receivedStated: null,
    balanceToReceiveStated: null, expenseStated: null, marginStated: null, cashBalanceStated: null, labels: [],
  }
  const numAt = (r: number, c: number): number | null => {
    const v = sheet.aoa[r]?.[c]
    return typeof v === 'number' ? v : null
  }
  for (let r = 0; r < sheet.aoa.length; r++) {
    const row = sheet.aoa[r] ?? []
    for (let c = 0; c < row.length; c++) {
      const v = row[c]
      if (typeof v !== 'string') continue
      const label = v.toLowerCase().replace(/[:\s]+/g, ' ').trim()
      const def = SUMMARY_LABELS.find((d) => d.re.test(label))
      if (!def || found[def.key] !== null) continue
      let value: number | null = null
      let at: [number, number] = [r, c]
      for (let k = 1; k <= 3 && value === null; k++) { value = numAt(r, c + k); at = [r, c + k] }
      for (let k = 1; k <= 2 && value === null; k++) { value = numAt(r + k, c); at = [r + k, c] }
      if (value !== null) {
        found[def.key] = value
        found.labels.push({ label: v.replace(/\s+/g, ' ').replace(/:$/, '').trim(), value, cell: `${colLetter(sheet.colOffset + at[1])}${sheet.rowOffset + at[0] + 1}` })
      }
    }
  }
  return found.labels.length ? found : null
}

export async function extractWorkbook(
  wb: ParsedWorkbook,
  ctx: ExtractContext,
  onProgress?: (pct: number) => void,
): Promise<ExtractResult> {
  const report = emptyReport()
  const transactions: Transaction[] = []
  const receipts: Receipt[] = []
  let summary: CostSummary | null = null
  const workNamer = makeNamer()
  const vendorNamer = makeNamer()
  const unknownCats = new Set<string>()
  const active = wb.sheets.filter((s) => s.role !== 'ignore')
  const totalWork = active.reduce((n, s) => n + s.aoa.length, 0) || 1
  let done = 0
  const addIssue = (sheet: string, row: number, kind: string, message: string) => {
    if (report.issues.length < 1500) report.issues.push({ sheet, row, kind, message })
  }
  let vendorMapped = false
  let vendorMissing = 0

  for (const sheet of active) {
    const m = sheet.mapping
    const perSheet = { sheet: sheet.name, role: sheet.role, rows: 0, valid: 0 }
    report.perSheet.push(perSheet)
    if (sheet.role === 'receipts' && !summary) summary = extractSummary(sheet, ctx, wb.fileName)
    const colText = (row: unknown[], f: FieldKey) => (m[f] === undefined ? '' : cellText(row[m[f] as number]))
    const colRaw = (row: unknown[], f: FieldKey) => (m[f] === undefined ? undefined : row[m[f] as number])

    for (let i = sheet.headerRow + 1; i < sheet.aoa.length; i++) {
      if (++done % 4000 === 0) { onProgress?.(Math.min(99, Math.round((done / totalWork) * 100))); await tick() }
      const row = sheet.aoa[i] ?? []
      const mappedCols = Object.values(m) as number[]
      if (!mappedCols.some((c) => !isBlank(row[c]))) continue
      const excelRow = sheet.rowOffset + i + 1

      const d = parseDateValue(colRaw(row, 'date'))
      const a = parseNumber(colRaw(row, 'amount'))

      /* ---- money received ---- */
      if (sheet.role === 'receipts') {
        if (d.status !== 'ok' || a.value === null) { report.ignoredRows++; continue }
        report.totalRows++; perSheet.rows++
        if (a.value <= 0) { report.invalidRows++; addIssue(sheet.name, excelRow, 'invalid-amount', 'Receipt amount must be greater than zero.'); continue }
        receipts.push({
          id: uid('r'), projectId: ctx.projectId, date: d.iso as string, amount: a.value,
          description: colText(row, 'description') || colText(row, 'remarks'),
          sourceFile: wb.fileName, sourceSheet: sheet.name, sourceRow: excelRow,
        })
        report.validRows++; perSheet.valid++
        continue
      }

      /* ---- ledger & weekly ---- */
      let catRaw = colText(row, 'category')
      let workRaw = colText(row, 'work')
      let itemRaw = colText(row, 'item')
      // Some rows are typed one column to the left (category word in the Work column, item in the Category column).
      const isCatWord = (x: string) => !!DEFAULT_CATEGORY_MAP[x.trim().toLowerCase()]
      const realigned = sheet.role === 'ledger' && !!workRaw && isCatWord(workRaw) && !!catRaw && !isCatWord(catRaw) && (itemRaw === '' || itemRaw === '-')
      if (realigned) { itemRaw = catRaw; catRaw = workRaw; workRaw = '' }
      const matCol = colText(row, 'material')
      const textual = sheet.role === 'weekly' ? matCol || itemRaw : itemRaw || workRaw || catRaw

      // rows with no date that look like totals / notes are not data
      if (d.status === 'missing' && !catRaw && !workRaw && !(sheet.role === 'weekly' && textual)) { report.ignoredRows++; continue }

      report.totalRows++; perSheet.rows++
      if (d.status === 'missing') { report.missingDates++; report.invalidRows++; addIssue(sheet.name, excelRow, 'missing-date', 'Date is missing.'); continue }
      if (d.status === 'invalid') { report.invalidDates++; report.invalidRows++; addIssue(sheet.name, excelRow, 'invalid-date', `Date "${cellText(colRaw(row, 'date'))}" could not be understood.`); continue }
      if (a.status === 'invalid') { report.invalidNumbers++; report.invalidRows++; addIssue(sheet.name, excelRow, 'invalid-amount', `Amount "${cellText(colRaw(row, 'amount'))}" is not a number.`); continue }

      const flags: string[] = realigned ? ['realigned-row'] : []
      const hasAmount = a.value !== null
      if (!hasAmount) { report.missingAmounts++; flags.push('no-amount'); addIssue(sheet.name, excelRow, 'missing-amount', 'No amount – row kept as a quantity-only entry.') }

      const vendorRaw = colText(row, 'vendor')
      if (m.vendor !== undefined) { vendorMapped = true; if (!vendorRaw) vendorMissing++ }

      let category: string, categoryRaw: string, subCategory: string, material: string
      let quantity: number | null, unit: string, qtyText: string, workDescription: string, description: string
      let stream: Transaction['stream'] = 'ledger'

      if (sheet.role === 'weekly') {
        stream = 'weekly'
        const p = parseWeeklyText(textual)
        const q = parseQuantity(colRaw(row, 'quantity'))
        category = 'Material'; categoryRaw = 'Material'
        material = canonicalMaterial(p.name)
        subCategory = material
        quantity = q.quantity ?? p.quantity
        unit = colText(row, 'unit') ? normUnit(colText(row, 'unit')) : q.unit || p.unit
        qtyText = q.text || p.qtyText
        workDescription = workNamer(workRaw) || 'Weekly material'
        description = textual
      } else {
        if (!catRaw) { report.missingCategories++; addIssue(sheet.name, excelRow, 'missing-category', 'Category is missing.') }
        const nc = normalizeCategory(catRaw, ctx.categoryMap)
        category = nc.category; categoryRaw = catRaw
        if (!nc.known && catRaw) { unknownCats.add(catRaw); flags.push('unknown-category') }
        subCategory = canonicalItem(category, itemRaw || matCol)
        if (!subCategory && catRaw) subCategory = category === 'Material' ? canonicalMaterial(catRaw) : titleCase(catRaw)
        material = category === 'Material' ? (matCol ? canonicalMaterial(matCol) : subCategory) : matCol ? canonicalMaterial(matCol) : ''
        const q = parseQuantity(colRaw(row, 'quantity'))
        quantity = q.quantity; qtyText = q.text
        unit = colText(row, 'unit') ? normUnit(colText(row, 'unit')) : q.unit
        workDescription = workNamer(workRaw)
        description = colText(row, 'description') || itemRaw
      }

      const rate = parseNumber(colRaw(row, 'rate')).value
      const dayVal = parseNumber(colRaw(row, 'day')).value
      transactions.push({
        id: uid('t'), projectId: ctx.projectId, date: d.iso as string, category, categoryRaw, subCategory,
        workDescription, material, vendor: vendorNamer(vendorRaw), description, quantity, quantityText: qtyText, unit, rate,
        amount: hasAmount ? (a.value as number) : 0, hasAmount, paymentMode: colText(row, 'paymentMode'),
        invoiceNumber: colText(row, 'invoice'), referenceNumber: colText(row, 'reference'), remarks: colText(row, 'remarks'),
        stream, dayNo: dayVal, sourceFile: wb.fileName, sourceSheet: sheet.name, sourceRow: excelRow,
        raw: rawRecord(sheet, row), flags,
      })
      report.validRows++; perSheet.valid++
    }
  }

  report.unknownCategories = transactions.filter((t) => t.flags.includes('unknown-category')).length
  report.unknownCategoryList = [...unknownCats]
  report.missingVendors = vendorMapped ? vendorMissing : null
  onProgress?.(100)
  if (!transactions.length && !receipts.length) {
    throw new ImportError(`No usable rows were found in "${wb.fileName}". Check the column mapping — at least Date and Amount are needed.`)
  }
  return { transactions, receipts, summary, validation: report }
}
