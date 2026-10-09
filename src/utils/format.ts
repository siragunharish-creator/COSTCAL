const inrFmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })
const inrFmt2 = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })

/** ₹50,85,355 (Indian digit grouping). Pass true for two decimals (rates). */
export function money(n: number, decimals = false): string {
  const f = decimals ? inrFmt2 : inrFmt
  return (n < 0 ? '-' : '') + '₹' + f.format(Math.abs(decimals ? n : Math.round(n)))
}
/** ₹50.85L / ₹1.20Cr / ₹12.3K */
export function moneyShort(n: number): string {
  const a = Math.abs(n), s = n < 0 ? '-' : ''
  if (a >= 1e7) return `${s}₹${(a / 1e7).toFixed(2)}Cr`
  if (a >= 1e5) return `${s}₹${(a / 1e5).toFixed(2)}L`
  if (a >= 1e3) return `${s}₹${(a / 1e3).toFixed(1)}K`
  return `${s}₹${Math.round(a)}`
}
export const inr = money
export const inrShort = moneyShort
export const num = (n: number, d = 0) => n.toLocaleString('en-IN', { maximumFractionDigits: d })
export const pct = (v: number, t: number) => (t ? ((v / t) * 100).toFixed(1) + '%' : '0%')

const M3 = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const MFULL = ['January','February','March','April','May','June','July','August','September','October','November','December']
export const monthKey = (iso: string) => iso.slice(0, 7)
export const fmtMonthShort = (ym: string) => `${M3[+ym.slice(5, 7) - 1]} ${ym.slice(2, 4)}`
export const fmtMonth = (ym: string) => `${MFULL[+ym.slice(5, 7) - 1]} ${ym.slice(0, 4)}`
export const fmtDate = (iso: string) => (iso ? `${iso.slice(8, 10)} ${M3[+iso.slice(5, 7) - 1]} ${iso.slice(0, 4)}` : '–')
export const fmtDateLong = (iso: string) => (iso ? `${+iso.slice(8, 10)} ${MFULL[+iso.slice(5, 7) - 1]} ${iso.slice(0, 4)}` : '–')

export const todayIso = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
export function shiftIso(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}
export function isoWeekStart(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7))
  return d.toISOString().slice(0, 10)
}
let counter = 0
export const uid = (prefix: string) => `${prefix}${Date.now().toString(36)}${(counter++).toString(36)}${Math.random().toString(36).slice(2, 5)}`
/** 0 → A, 25 → Z, 26 → AA */
export function colLetter(i: number): string {
  let s = ''
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s
  return s
}
