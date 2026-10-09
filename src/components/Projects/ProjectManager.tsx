import { useState } from 'react'
import { Archive, History, Pencil, Plus, Trash2, Upload, ArchiveRestore } from 'lucide-react'
import { useData } from '../../store/DataContext'
import { useDrill } from '../../utils/nav'
import { calculateProjectTotals, recognizedTransactions } from '../../services/analytics'
import type { Project } from '../../types/project'
import { Badge, Btn, Card, Empty, Modal } from '../ui/primitives'
import { fmtDate, money, moneyShort, num, uid } from '../../utils/format'

const blank = (): Project => ({ id: uid('p'), name: '', location: '', startDate: null, endDate: null, budget: null, builtUpArea: null, status: 'active', createdAt: new Date().toISOString(), settings: { weeklyMode: 'additive', targetCostPerSqft: null } })

export function ProjectManager() {
  const { data, saveProject, deleteProject, setStatus, mode } = useData()
  const { go } = useDrill()
  const [edit, setEdit] = useState<Project | null>(null)
  const [hist, setHist] = useState<Project | null>(null)
  const [del, setDel] = useState<Project | null>(null)
  const rows = calculateProjectTotals(data.projects, recognizedTransactions(data.transactions, data.projects), data.receipts)
  const inp = 'mt-1 w-full rounded-lg border border-line bg-card px-3 py-2 text-sm text-ink'
  const numOrNull = (v: string) => (v.trim() && +v > 0 ? +v : null)
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-2xl font-bold">Projects</h1><p className="text-sm text-muted">Each project has its own analytics. “All Projects” combines the active ones.</p></div>
        <div className="flex gap-2"><Btn onClick={() => setEdit(blank())}><Plus size={16} />Add project</Btn><Btn kind="primary" onClick={() => go('/import')}><Upload size={16} />Upload Excel</Btn></div></div>
      {!rows.length ? <Card><Empty title="No projects yet" text="Upload an Excel workbook to create a project automatically, or add one manually." action={<Btn kind="primary" onClick={() => go('/import')}>Upload Excel</Btn>} /></Card> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{rows.map((r) => { const p = r.project; return (
          <Card key={p.id} className={`p-5 ${p.status === 'archived' ? 'opacity-70' : ''}`}>
            <div className="flex items-start justify-between gap-2"><button onClick={() => go(`/projects/${p.id}`)} className="text-left"><h3 className="font-semibold hover:text-blue">{p.name}</h3><p className="text-xs text-muted">{p.location || 'No location'}</p></button><Badge tone={p.status === 'active' ? 'green' : p.status === 'archived' ? 'slate' : 'orange'}>{p.status}</Badge></div>
            <dl className="mt-4 grid grid-cols-3 gap-2 text-sm"><div><dt className="text-xs text-muted">Received</dt><dd className="num font-semibold">{moneyShort(r.received)}</dd></div><div><dt className="text-xs text-muted">Spent</dt><dd className="num font-semibold">{moneyShort(r.expense)}</dd></div><div><dt className="text-xs text-muted">Balance</dt><dd className={`num font-semibold ${r.balance < 0 ? 'text-red' : 'text-green'}`}>{moneyShort(r.balance)}</dd></div></dl>
            <p className="mt-3 text-xs text-muted">{fmtDate(p.startDate ?? '')} → {fmtDate(p.endDate ?? '')} · {num(r.transactions)} transactions</p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              <Btn onClick={() => setEdit(p)} aria-label="Edit"><Pencil size={14} />Edit</Btn><Btn onClick={() => go(`/import?project=${p.id}`)}><Upload size={14} />Add Excel</Btn><Btn onClick={() => setHist(p)}><History size={14} />History</Btn>
              <Btn onClick={() => setStatus(p.id, p.status === 'archived' ? 'active' : 'archived')}>{p.status === 'archived' ? <ArchiveRestore size={14} /> : <Archive size={14} />}{p.status === 'archived' ? 'Restore' : 'Archive'}</Btn>
              <Btn kind="danger" onClick={() => setDel(p)} aria-label="Delete"><Trash2 size={14} /></Btn></div>
          </Card>) })}</div>)}
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit && data.projects.some((p) => p.id === edit.id) ? 'Edit project' : 'Add project'}>
        {edit && <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-muted sm:col-span-2">Name<input className={inp} value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></label>
          <label className="text-xs text-muted sm:col-span-2">Location<input className={inp} value={edit.location} onChange={(e) => setEdit({ ...edit, location: e.target.value })} /></label>
          <label className="text-xs text-muted">Start date<input type="date" className={inp} value={edit.startDate ?? ''} onChange={(e) => setEdit({ ...edit, startDate: e.target.value || null })} /></label>
          <label className="text-xs text-muted">End date<input type="date" className={inp} value={edit.endDate ?? ''} onChange={(e) => setEdit({ ...edit, endDate: e.target.value || null })} /></label>
          <label className="text-xs text-muted">Budget (₹)<input type="number" className={inp} value={edit.budget ?? ''} onChange={(e) => setEdit({ ...edit, budget: numOrNull(e.target.value) })} /></label>
          <label className="text-xs text-muted">Built-up area (sqft)<input type="number" className={inp} value={edit.builtUpArea ?? ''} onChange={(e) => setEdit({ ...edit, builtUpArea: numOrNull(e.target.value) })} /></label>
          <label className="text-xs text-muted">Target cost / sqft<input type="number" className={inp} value={edit.settings.targetCostPerSqft ?? ''} onChange={(e) => setEdit({ ...edit, settings: { ...edit.settings, targetCostPerSqft: numOrNull(e.target.value) } })} /></label>
          <label className="text-xs text-muted">Status<select className={inp} value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value as Project['status'] })}>{['active', 'on-hold', 'completed', 'archived'].map((s) => <option key={s}>{s}</option>)}</select></label>
          <div className="sm:col-span-2"><Btn kind="primary" disabled={!edit.name.trim()} onClick={() => { saveProject({ ...edit, name: edit.name.trim() }); setEdit(null) }}>Save project</Btn></div>
        </div>}
      </Modal>
      <Modal open={!!hist} onClose={() => setHist(null)} title={`History – ${hist?.name ?? ''}`}>
        {hist && (data.imports.filter((i) => i.projectId === hist.id).length === 0 ? <p className="text-sm text-muted">{mode === 'demo' ? 'Demo data has no import history.' : 'No imports recorded for this project.'}</p> :
          <ul className="space-y-2">{data.imports.filter((i) => i.projectId === hist.id).map((i) => <li key={i.id} className="rounded-lg bg-bg p-3 text-sm"><b>{i.file}</b>{i.replaced && <Badge tone="orange"> replaced earlier import</Badge>}<div className="text-xs text-muted">{new Date(i.at).toLocaleString('en-IN')} · {i.ledgerRows} ledger · {i.weeklyRows} weekly · {i.receiptRows} receipts{i.skipped ? ` · ${i.skipped} duplicates skipped` : ''}</div></li>)}</ul>)}
      </Modal>
      <Modal open={!!del} onClose={() => setDel(null)} title="Delete project?">
        <p className="text-sm text-muted">This removes <b className="text-ink">{del?.name}</b> and all its imported transactions and receipts from this browser. You cannot undo it. Consider archiving instead.</p>
        <div className="mt-4 flex gap-2"><Btn onClick={() => setDel(null)}>Cancel</Btn><Btn kind="danger" onClick={() => { if (del) deleteProject(del.id); setDel(null) }}>Delete {del && money(rows.find((r) => r.project.id === del.id)?.expense ?? 0)} of data</Btn></div>
      </Modal>
    </div>
  )
}
