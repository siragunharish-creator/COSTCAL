import { useState } from 'react'
import { useData } from '../store/DataContext'
import { Btn, Card, Modal, SectionTitle } from '../components/ui/primitives'
import { num } from '../utils/format'

export default function Settings() {
  const { data, setWeeklyMode, clearAll, mode, loadDemo, exitDemo, storageOk } = useData()
  const [ask, setAsk] = useState(false)
  return (
    <div className="space-y-5">
      <div><h1 className="text-2xl font-bold">Settings</h1></div>
      <Card><SectionTitle title="Weekly material handling" sub="Decides whether the Weekly material sheet adds to project cost. The import step suggests this by checking the file’s own totals." />
        <div className="space-y-2 p-5">{data.projects.length === 0 && <p className="text-sm text-muted">No projects yet.</p>}
          {data.projects.map((p) => <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-bg p-3 text-sm"><b>{p.name}</b>
            <select value={p.settings.weeklyMode} onChange={(e) => setWeeklyMode(p.id, e.target.value as 'additive')} className="rounded-lg border border-line bg-card px-2 py-1.5"><option value="additive">Additional to ledger</option><option value="informational">Reference only</option><option value="ignored">Ignore</option></select></div>)}</div></Card>
      <Card><SectionTitle title="Your data" sub="Everything is stored in this browser only. Nothing is sent to a server." />
        <div className="space-y-3 p-5 text-sm"><p>{num(data.transactions.length)} transactions · {num(data.receipts.length)} receipts · {data.projects.length} projects · {storageOk ? 'saved locally' : 'NOT saved (browser storage unavailable)'}</p>
          <div className="flex flex-wrap gap-2">{mode === 'demo' ? <Btn onClick={exitDemo}>Exit demo</Btn> : <Btn onClick={loadDemo}>View demo data</Btn>}<Btn kind="danger" onClick={() => setAsk(true)}>Delete all my data</Btn></div></div></Card>
      <Card><SectionTitle title="About" /><p className="p-5 text-sm text-muted">Built so storage can move to Supabase/PostgreSQL later: all reads and writes go through one storage service and one data context.</p></Card>
      <Modal open={ask} onClose={() => setAsk(false)} title="Delete all data?"><p className="text-sm text-muted">This removes every project, transaction and receipt stored in this browser.</p><div className="mt-4 flex gap-2"><Btn onClick={() => setAsk(false)}>Cancel</Btn><Btn kind="danger" onClick={() => { clearAll(); setAsk(false) }}>Delete everything</Btn></div></Modal>
    </div>
  )
}
