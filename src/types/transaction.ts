export interface Transaction {
  id: string
  projectId: string
  date: string // ISO yyyy-mm-dd
  category: string
  categoryRaw: string
  subCategory: string
  workDescription: string
  material: string
  vendor: string
  description: string
  quantity: number | null
  quantityText: string
  unit: string
  rate: number | null
  amount: number
  /** false when the source cell was blank or "-": the row is kept for quantity tracking only. */
  hasAmount: boolean
  paymentMode: string
  invoiceNumber: string
  referenceNumber: string
  remarks: string
  stream: 'ledger' | 'weekly'
  dayNo: number | null
  sourceFile: string
  sourceSheet: string
  sourceRow: number
  raw: Record<string, string>
  flags: string[]
}
