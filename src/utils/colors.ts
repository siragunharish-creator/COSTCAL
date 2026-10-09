export const CATEGORY_COLORS: Record<string, string> = {
  Material: '#2563eb',
  Labour: '#f97316',
  Machine: '#7c3aed',
  Misc: '#0891b2',
  Transport: '#059669',
  Petrol: '#d97706',
  Other: '#64748b',
}
const FALLBACK = ['#2563eb', '#f97316', '#0891b2', '#7c3aed', '#059669', '#d97706', '#db2777', '#4f46e5', '#65a30d', '#0d9488', '#64748b']
export function colorFor(key: string, idx = 0): string {
  return CATEGORY_COLORS[key] ?? FALLBACK[idx % FALLBACK.length]
}
export const PALETTE = FALLBACK
