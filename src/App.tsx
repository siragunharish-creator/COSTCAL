import { HashRouter, Route, Routes } from 'react-router-dom'
import { ErrorBoundary } from './components/ui/ErrorBoundary'
import { DataProvider } from './store/DataContext'
import { Layout } from './components/layout/Layout'
import { PeriodDetail } from './components/Dimension/PeriodDetail'
import { TransactionDetail } from './components/Transactions/TransactionDetail'
import CashFlow from './pages/CashFlow'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import * as P from './pages/Pages'

export default function App() {
  return (
    <ErrorBoundary>
    <DataProvider>
      <HashRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<P.Dashboard />} />
            <Route path="/projects" element={<P.Projects />} />
            <Route path="/projects/:id" element={<P.ProjectDetail />} />
            <Route path="/expenses" element={<P.Expenses />} />
            <Route path="/materials" element={<P.Materials />} />
            <Route path="/materials/:name" element={<P.MaterialDetail />} />
            <Route path="/labour" element={<P.Labour />} />
            <Route path="/labour/:name" element={<P.LabourDetail />} />
            <Route path="/work" element={<P.WorkAnalysis />} />
            <Route path="/work/:name" element={<P.WorkDetail />} />
            <Route path="/vendors" element={<P.Vendors />} />
            <Route path="/vendors/:name" element={<P.VendorDetail />} />
            <Route path="/categories/:name" element={<P.CategoryDetail />} />
            <Route path="/months/:key" element={<PeriodDetail kind="month" />} />
            <Route path="/days/:key" element={<PeriodDetail kind="day" />} />
            <Route path="/transactions/:id" element={<TransactionDetail />} />
            <Route path="/cashflow" element={<CashFlow />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/import" element={<P.ImportExcel />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<P.Dashboard />} />
          </Routes>
        </Layout>
      </HashRouter>
    </DataProvider>
    </ErrorBoundary>
  )
}
