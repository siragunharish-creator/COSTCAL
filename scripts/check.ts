import { readFileSync } from "node:fs"
import { readWorkbook, extractWorkbook } from '../src/services/excelParser'

const path = '/mnt/user-data/uploads/VSHN_161_-_Tondiarpet_Otravadai.xlsx'
const buf = readFileSync(path)
const wb = readWorkbook(new Uint8Array(buf), 'VSHN 161 - Tondiarpet Otravadai.xlsx')
console.log('project:', wb.projectName, '|', wb.location)
for (const s of wb.sheets) console.log(s.name.padEnd(16), s.role.padEnd(9), 'rows', s.nonEmptyRows, 'hdr', s.headerRow, JSON.stringify(s.mapping))
const r = await extractWorkbook(wb, { projectId: 'p1', categoryMap: {} })
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)
const led = r.transactions.filter(t => t.stream === 'ledger')
const wk = r.transactions.filter(t => t.stream === 'weekly')
console.log('ledger tx', led.length, 'total', sum(led.map(t => t.amount)))
console.log('weekly tx', wk.length, 'total', sum(wk.map(t => t.amount)))
console.log('receipts', r.receipts.length, 'total', sum(r.receipts.map(x => x.amount)))
console.log('summary', JSON.stringify(r.summary?.labels))
const v = r.validation
console.log({ total: v.totalRows, valid: v.validRows, invalid: v.invalidRows, ignored: v.ignoredRows, noAmt: v.missingAmounts, badNum: v.invalidNumbers, noCat: v.missingCategories, unknownCat: v.unknownCategories, cats: v.unknownCategoryList })
const by = (k: (t: any) => string, xs = r.transactions) => { const m = new Map<string, number>(); xs.forEach(t => m.set(k(t), (m.get(k(t)) ?? 0) + t.amount)); return [...m].sort((a, b) => b[1] - a[1]) }
console.log('categories', by(t => t.category))
console.log('materials', by(t => t.material, r.transactions.filter(t => t.category === 'Material')).slice(0, 12))
console.log('labour', by(t => t.subCategory, r.transactions.filter(t => t.category === 'Labour')))
console.log('works', new Set(r.transactions.map(t => t.workDescription)).size)
console.log('sample', JSON.stringify(wk[0]), JSON.stringify(led[9]))
const dates = r.transactions.map(t => t.date).sort(); console.log(dates[0], dates[dates.length - 1])
