export interface Receipt {
  id: string
  projectId: string
  date: string
  amount: number
  description: string
  sourceFile: string
  sourceSheet: string
  sourceRow: number
}
