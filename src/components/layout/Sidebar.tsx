import { NavLink } from 'react-router-dom'
import { BarChart3, Boxes, FileBarChart, FolderKanban, HardHat, Landmark, LayoutDashboard, ListChecks, Receipt, Settings, Store, Upload, X } from 'lucide-react'

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard }, { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/expenses', label: 'Expenses', icon: Receipt }, { to: '/materials', label: 'Materials', icon: Boxes },
  { to: '/labour', label: 'Labour', icon: HardHat }, { to: '/work', label: 'Work Analysis', icon: ListChecks },
  { to: '/vendors', label: 'Vendors', icon: Store }, { to: '/cashflow', label: 'Cash Flow', icon: Landmark },
  { to: '/reports', label: 'Reports', icon: FileBarChart }, { to: '/import', label: 'Import Excel', icon: Upload }, { to: '/settings', label: 'Settings', icon: Settings },
]
export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <>
      {open && <div className="no-print fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onClose} />}
      <aside className={`no-print fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-navy text-slate-300 transition-transform lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`} style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="flex items-center justify-between px-5 py-5">
          <div className="flex items-center gap-2.5"><span className="grid h-9 w-9 place-items-center rounded-lg bg-orange text-white"><BarChart3 size={20} /></span>
            <div className="leading-tight"><div className="text-sm font-bold tracking-wide text-white">CONSTRUCTION</div><div className="text-[11px] font-medium tracking-[.18em] text-orange">COST INTELLIGENCE</div></div></div>
          <button className="lg:hidden" aria-label="Close menu" onClick={onClose}><X size={20} /></button>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
          {NAV.map(({ to, label, icon: I }) => (
            <NavLink key={to} to={to} end={to === '/'} onClick={onClose} state={{ trail: [] }}
              className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${isActive ? 'bg-white/10 text-white shadow-[inset_3px_0_0_var(--orange)]' : 'hover:bg-white/5 hover:text-white'}`}>
              <I size={18} />{label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-white/10 p-4 text-[11px] text-slate-400">Your data stays in this browser.</div>
      </aside>
    </>
  )
}
