import * as XLSX from 'xlsx'
import { readWorkbook, extractWorkbook } from '../src/services/excelParser'
import { calculateCategoryTotals, calculateMaterialTotals, calculateMonthlyTotals, calculateDailyTotals, generateInsights } from '../src/services/analytics'
import { applyFilters, defaultFilters } from '../src/services/filters'
const rows: unknown[][] = [['Date', 'Category', 'Work Description', 'Details', 'Qty', 'Rate', 'Amount']]
const cats = ['Material', 'Labour', 'Machine', 'Misc']
for (let i = 0; i < 50000; i++) rows.push([45700 + (i % 400), cats[i % 4], 'Work ' + (i % 60), 'Item ' + (i % 90), 2, 100, 200 + (i % 50)])
const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Details')
const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
let t = Date.now()
const p = readWorkbook(new Uint8Array(buf), 'big.xlsx'); console.log('read', Date.now() - t, 'ms'); t = Date.now()
const r = await extractWorkbook(p, { projectId: 'p', categoryMap: {} }); console.log('extract', r.transactions.length, Date.now() - t, 'ms'); t = Date.now()
const f = applyFilters(r.transactions, { ...defaultFilters, categories: ['Material'], includeZero: false })
calculateCategoryTotals(f); calculateMaterialTotals(r.transactions); calculateMonthlyTotals(r.transactions); calculateDailyTotals(r.transactions); generateInsights(r.transactions, [])
console.log('analytics', Date.now() - t, 'ms')
