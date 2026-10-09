import * as XLSX from 'xlsx'
import { saveFile } from '../utils/download'

export interface TableData { title: string; columns: string[]; rows: (string | number | null)[][] }

export async function exportTable(t: TableData, format: 'xlsx' | 'csv', baseName?: string) {
  const name = (baseName ?? t.title).replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-') || 'export'
  const ws = XLSX.utils.aoa_to_sheet([t.columns, ...t.rows])
  if (format === 'csv') {
    const csv = '\ufeff' + XLSX.utils.sheet_to_csv(ws)
    return saveFile(`${name}.csv`, new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  }
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, t.title.slice(0, 31) || 'Sheet1')
  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
  return saveFile(`${name}.xlsx`, new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
}
