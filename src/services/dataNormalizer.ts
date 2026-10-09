/* Turns messy cell values into clean, comparable data.
   Everything here is pure and has no knowledge of React or Excel files. */

const UPPER_TOKENS = new Set(['upvc', 'mc', 'fc', 'dk', 'rcc', 'pvc', 'tv', 'ac', 'led', 'cctv', 'gi', 'ms', 'ots'])

export function titleCase(s: string): string {
  return s
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((w) => {
      const lw = w.toLowerCase()
      if (UPPER_TOKENS.has(lw.replace(/[^a-z]/g, ''))) return w.toUpperCase()
      return lw.charAt(0).toUpperCase() + lw.slice(1)
    })
    .join(' ')
}

export const compact = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

/* ---------- categories ---------- */

export const DEFAULT_CATEGORY_MAP: Record<string, string> = {
  material: 'Material', materials: 'Material',
  labour: 'Labour', labor: 'Labour',
  machine: 'Machine', machinery: 'Machine',
  misc: 'Misc', miscellaneous: 'Misc',
  transport: 'Transport', transportation: 'Transport', vehicle: 'Transport',
  petrol: 'Petrol', fuel: 'Petrol', diesel: 'Petrol',
  expense: 'Misc', expenses: 'Misc', tea: 'Misc', water: 'Misc', food: 'Misc', others: 'Misc', other: 'Misc',
}

const MATERIAL_HINT = /(cement|sand|jelly|brick|steel|tile|paint|wire|granite|concrete|aggregate)/i

export function normalizeCategory(raw: string, map: Record<string, string>): { category: string; known: boolean } {
  const key = raw.trim().toLowerCase()
  if (!key || key === '-') return { category: 'Uncategorised', known: false }
  const hit = map[key] ?? DEFAULT_CATEGORY_MAP[key]
  if (hit) return { category: hit, known: true }
  // e.g. "Cement 30 bags" typed into the category column
  if (MATERIAL_HINT.test(key)) return { category: 'Material', known: true }
  return { category: titleCase(raw), known: false }
}

/* ---------- materials, labour, expense items ---------- */

const UNIT_RE = '(?:nos|no|numbers|bags?|loads?|cft|kgs?|tons?|tonnes?|pcs|sqft|sft|ft|rft|ltrs?|litres?)'

const MATERIAL_ALIASES: Record<string, string> = {
  msand: 'M.Sand', psand: 'P.Sand', riversand: 'River Sand', jelly: 'Jelly', cement: 'Cement',
  brick: 'Bricks', bricks: 'Bricks', steel: 'Steel', others: 'Others', other: 'Others',
}

export function canonicalMaterial(text: string): string {
  let t = String(text ?? '').toLowerCase()
  t = t.replace(/\(.*?\)/g, ' ').replace(/tata\s*ace/g, ' ')
  t = t.replace(new RegExp(`\\d[\\d,.]*\\s*${UNIT_RE}?`, 'g'), ' ')
  t = t.replace(/[-–_]+/g, ' ').replace(/\s+/g, ' ').trim()
  if (!t) return 'Unspecified'
  const alias = MATERIAL_ALIASES[compact(t)]
  return alias ?? titleCase(t)
}

const LABOUR_ALIASES: Record<string, string> = {
  mas: 'Mason', mason: 'Mason', masons: 'Mason', mc: 'MC', fc: 'FC', fitter: 'Fitter', fitters: 'Fitter',
  painter: 'Painter', electrician: 'Electrician', plumber: 'Plumber', tilesmason: 'Tiles Mason',
}

export function canonicalLabour(text: string): string {
  const t = String(text ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
  if (!t || t === '-') return 'Unspecified'
  if (t.startsWith('jelly gang')) return 'Jelly Gang'
  return LABOUR_ALIASES[compact(t)] ?? titleCase(t)
}

export function canonicalItem(category: string, raw: string): string {
  const t = String(raw ?? '').trim()
  if (!t || t === '-' || /^\d+$/.test(t)) return ''
  if (category === 'Material') return canonicalMaterial(t)
  if (category === 'Labour') return canonicalLabour(t)
  return titleCase(t)
}

/** Case-insensitive grouping of free text (work descriptions, vendors...). */
export function makeNamer() {
  const seen = new Map<string, string>()
  return (raw: string): string => {
    const clean = String(raw ?? '').replace(/\s+/g, ' ').trim()
    if (!clean || clean === '-') return ''
    const key = clean.toLowerCase()
    const hit = seen.get(key)
    if (hit) return hit
    seen.set(key, clean)
    return clean
  }
}

/* ---------- numbers ---------- */

export type NumStatus = 'ok' | 'missing' | 'invalid'

/** Accepts 1300, "1,300", "₹ 1,300", "58,100 + 280", "(500)". "-" and "" are "missing". */
export function parseNumber(v: unknown): { value: number | null; status: NumStatus } {
  if (v === null || v === undefined) return { value: null, status: 'missing' }
  if (typeof v === 'number') return Number.isFinite(v) ? { value: v, status: 'ok' } : { value: null, status: 'invalid' }
  if (v instanceof Date) return { value: null, status: 'invalid' }
  const s = String(v).trim()
  if (s === '' || s === '-' || s === '–' || s === '—' || /^n\/?a$/i.test(s)) return { value: null, status: 'missing' }
  let cleaned = s.replace(/[₹$,\s]|rs\.?|inr/gi, '')
  let neg = false
  if (/^\(.*\)$/.test(cleaned)) { neg = true; cleaned = cleaned.slice(1, -1) }
  if (/^-?[\d.]+(\+[\d.]+)*$/.test(cleaned)) {
    const total = cleaned.split('+').reduce((a, p) => a + parseFloat(p), 0)
    if (Number.isFinite(total)) return { value: neg ? -total : total, status: 'ok' }
  }
  return { value: null, status: 'invalid' }
}

const UNIT_NORMAL: Record<string, string> = {
  nos: 'nos', no: 'nos', numbers: 'nos', pcs: 'nos', bag: 'bags', bags: 'bags', load: 'loads', loads: 'loads',
  cft: 'cft', kg: 'kg', kgs: 'kg', ton: 'ton', tons: 'ton', tonne: 'ton', tonnes: 'ton', sqft: 'sqft', sft: 'sqft',
  ft: 'ft', rft: 'rft', ltr: 'ltr', ltrs: 'ltr', litre: 'ltr', litres: 'ltr',
}
export const normUnit = (u: string) => UNIT_NORMAL[u.toLowerCase()] ?? u.toLowerCase()

/** "15 bags" -> {15,'bags'}; "2nos" -> {2,'nos'}; 5 -> {5,''}; "-" -> none */
export function parseQuantity(v: unknown): { quantity: number | null; unit: string; text: string } {
  if (v === null || v === undefined) return { quantity: null, unit: '', text: '' }
  if (typeof v === 'number') return { quantity: v, unit: '', text: String(v) }
  const text = String(v).trim()
  if (!text || text === '-') return { quantity: null, unit: '', text: '' }
  const m = text.match(new RegExp(`^([\\d.,]+)\\s*(?:x\\s*([\\d.]+))?\\s*(${UNIT_RE})?`, 'i'))
  if (m) {
    const base = parseFloat(m[1].replace(/,/g, ''))
    if (Number.isFinite(base)) {
      const mult = m[2] ? parseFloat(m[2]) : 1
      return { quantity: base * (Number.isFinite(mult) ? mult : 1), unit: m[3] ? normUnit(m[3]) : '', text }
    }
  }
  return { quantity: null, unit: '', text }
}

/** "Bricks 1500nos - 18,000" / "M.sand 50cft x 2 -8000" -> name + quantity */
export function parseWeeklyText(textRaw: string): { name: string; quantity: number | null; unit: string; qtyText: string } {
  const text = String(textRaw ?? '').replace(/\s+/g, ' ').trim()
  const re = new RegExp(`(\\d[\\d,]*(?:\\.\\d+)?)\\s*(${UNIT_RE})\\b(?:\\s*x\\s*(\\d+(?:\\.\\d+)?))?`, 'i')
  const m = text.match(re)
  if (m && m.index !== undefined) {
    const base = parseFloat(m[1].replace(/,/g, ''))
    const mult = m[3] ? parseFloat(m[3]) : 1
    const name = text.slice(0, m.index).replace(/[-–\s]+$/g, '').trim()
    return { name: name || text, quantity: base * mult, unit: normUnit(m[2]), qtyText: m[0] }
  }
  const cut = text.split(/\s[-–]\s|\d/)[0].trim()
  return { name: cut || text, quantity: null, unit: '', qtyText: '' }
}

/* ---------- dates ---------- */

export type DateStatus = 'ok' | 'missing' | 'invalid'

function validIso(y: number, m: number, d: number): string | null {
  if (y < 1990 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return null
  const dt = new Date(Date.UTC(y, m - 1, d))
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

export function parseDateValue(v: unknown): { iso: string | null; status: DateStatus } {
  if (v === null || v === undefined || v === '') return { iso: null, status: 'missing' }
  if (v instanceof Date) {
    if (Number.isNaN(v.getTime())) return { iso: null, status: 'invalid' }
    // +12h absorbs the sub-minute timezone drift SheetJS can introduce
    const d = new Date(v.getTime() + 12 * 3600 * 1000)
    const iso = validIso(d.getFullYear(), d.getMonth() + 1, d.getDate())
    return iso ? { iso, status: 'ok' } : { iso: null, status: 'invalid' }
  }
  if (typeof v === 'number') {
    if (v > 20000 && v < 80000) {
      const d = new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 86400000)
      const iso = validIso(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate())
      if (iso) return { iso, status: 'ok' }
    }
    return { iso: null, status: 'invalid' }
  }
  const s = String(v).trim()
  if (!s || s === '-') return { iso: null, status: 'missing' }
  let m = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/)
  if (m) {
    let y = +m[3]
    if (y < 100) y += 2000
    const iso = validIso(y, +m[2], +m[1])
    return iso ? { iso, status: 'ok' } : { iso: null, status: 'invalid' }
  }
  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (m) {
    const iso = validIso(+m[1], +m[2], +m[3])
    return iso ? { iso, status: 'ok' } : { iso: null, status: 'invalid' }
  }
  const t = Date.parse(s)
  if (!Number.isNaN(t)) {
    const d = new Date(t)
    const iso = validIso(d.getFullYear(), d.getMonth() + 1, d.getDate())
    if (iso) return { iso, status: 'ok' }
  }
  return { iso: null, status: 'invalid' }
}
