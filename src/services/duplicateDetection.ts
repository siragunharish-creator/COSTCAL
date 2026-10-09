import type { Transaction } from '../types/transaction'
import type { Receipt } from '../types/receipt'

const n = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim()

/** Signature built from date, amount, vendor, invoice, description and material. */
export function txSignature(t: Transaction): string {
  return [t.date, t.amount, n(t.subCategory || t.material), n(t.vendor), n(t.invoiceNumber), n(t.workDescription), n(t.category)].join('|')
}
export const receiptSignature = (r: Receipt) => `${r.date}|${r.amount}`

export interface DuplicateHit<T> { incoming: T; existingId: string }

/** Multiset comparison: if the project already holds 2 identical rows, only the first 2 incoming copies count as duplicates. */
export function findDuplicates<T extends { id: string }>(
  incoming: T[], existing: T[], sig: (x: T) => string,
): { duplicates: DuplicateHit<T>[]; fresh: T[] } {
  const bucket = new Map<string, string[]>()
  existing.forEach((e) => { const k = sig(e); const l = bucket.get(k) ?? []; l.push(e.id); bucket.set(k, l) })
  const used = new Map<string, number>()
  const duplicates: DuplicateHit<T>[] = []
  const fresh: T[] = []
  incoming.forEach((x) => {
    const k = sig(x)
    const ids = bucket.get(k)
    const u = used.get(k) ?? 0
    if (ids && u < ids.length) { duplicates.push({ incoming: x, existingId: ids[u] }); used.set(k, u + 1) }
    else fresh.push(x)
  })
  return { duplicates, fresh }
}

export function countRepeated(tx: Transaction[]): number {
  const m = new Map<string, number>()
  tx.forEach((t) => { const k = txSignature(t); m.set(k, (m.get(k) ?? 0) + 1) })
  let r = 0
  m.forEach((c) => { if (c > 1) r += c - 1 })
  return r
}
