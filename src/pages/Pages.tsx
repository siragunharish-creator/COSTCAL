import { useParams } from 'react-router-dom'
import { DashboardView } from '../components/Dashboard/DashboardView'
import { DimensionDashboard } from '../components/Dimension/DimensionDashboard'
import { DimensionDetail } from '../components/Dimension/DimensionDetail'
import { WeeklyMaterial } from '../components/Dimension/WeeklyMaterial'
import { CATEGORY, LABOUR, MATERIAL, VENDOR, WORK } from '../components/Dimension/dimensions'
import { ImportWizard } from '../components/Excel/ImportWizard'
import { ProjectManager } from '../components/Projects/ProjectManager'
import { TransactionTable } from '../components/Transactions/TransactionTable'
import { useScoped } from '../store/useScoped'
import { useData } from '../store/DataContext'
import { Card, Empty } from '../components/ui/primitives'

export const Dashboard = () => <DashboardView />
export const Projects = () => <ProjectManager />
export const ImportExcel = () => <ImportWizard />
export const Materials = () => <DimensionDashboard cfg={MATERIAL}><WeeklyMaterial /></DimensionDashboard>
export const Labour = () => <DimensionDashboard cfg={LABOUR} />
export const WorkAnalysis = () => <DimensionDashboard cfg={WORK} />
export const Vendors = () => <DimensionDashboard cfg={VENDOR} />
export const MaterialDetail = () => <DimensionDetail cfg={MATERIAL} />
export const LabourDetail = () => <DimensionDetail cfg={LABOUR} />
export const WorkDetail = () => <DimensionDetail cfg={WORK} />
export const VendorDetail = () => <DimensionDetail cfg={VENDOR} />
export const CategoryDetail = () => <DimensionDetail cfg={CATEGORY} />

export function Expenses() {
  const { tx } = useScoped()
  const { data } = useData()
  if (!data.projects.length) return <Card><Empty title="No expenses yet" text="Import an Excel workbook to see the ledger." /></Card>
  return <div className="space-y-4"><div><h1 className="text-2xl font-bold">Expenses</h1><p className="text-sm text-muted">The complete ledger. Click any row for the full transaction and its original Excel row.</p></div><TransactionTable tx={tx} title="All transactions" pageSize={50} /></div>
}
export function ProjectDetail() {
  const id = useParams().id
  const { data } = useData()
  if (!data.projects.some((p) => p.id === id)) return <Card><Empty title="Project not found" text="It may have been deleted." /></Card>
  return <DashboardView projectId={id} />
}
