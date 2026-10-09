import { useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { Breadcrumbs } from './Breadcrumbs'
import { ActiveChips } from './FilterBar'
import { useData } from '../../store/DataContext'

export function Layout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const { mode, storageOk } = useData()
  const loc = useLocation()
  return (
    <div className="min-h-screen">
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <div className="lg:pl-64">
        <Header onMenu={() => setOpen(true)} />
        <main className="print-area px-4 py-5 lg:px-8">
          {!storageOk && mode === 'live' && <div className="no-print mb-4 rounded-lg bg-red-soft px-4 py-2 text-sm text-red">Your browser could not save this data (storage full or blocked). It will be lost when you close the page – export your reports first.</div>}
          <Breadcrumbs />
          <ActiveChips />
          <div key={loc.pathname} className="page-enter">{children}</div>
        </main>
      </div>
    </div>
  )
}
