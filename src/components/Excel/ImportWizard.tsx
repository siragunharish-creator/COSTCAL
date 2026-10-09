import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Check } from 'lucide-react'
import { useData } from '../../store/DataContext'
import { extractWorkbook, ImportError, type ExtractResult, type ParsedWorkbook } from '../../services/excelParser'
import { findDuplicates, receiptSignature, txSignature, countRepeated } from '../../services/duplicateDetection'
import { suggestWeeklyMode } from '../../services/reconciliation'
import type { Project, WeeklyMode } from '../../types/project'
import { Btn, Card } from '../ui/primitives'
import { ExcelUploader } from './ExcelUploader'
import { SheetSelector } from './SheetSelector'
import { ColumnMapper } from './ColumnMapper'
import { ImportPreview } from './ImportPreview'
import { ImportValidation, type DupAction } from './ImportValidation'
import { money, uid } from '../../utils/format'

const STEPS = ['Upload', 'Sheets', 'Columns', 'Preview', 'Validate & import']

export function ImportWizard() {
  const { data, commitImport } = useData()
  const nav = useNavigate()
  const [sp] = useSearchParams()
  const [queue, setQueue] = useState<ParsedWorkbook[]>([])
  const [qi, setQi] = useState(0)
  const [step, setStep] = useState(0)
  const [target, setTarget] = useState<string>('new')
  const [pname, setPname] = useState(''), [ploc, setPloc] = useState('')
  const [newId, setNewId] = useState(() => uid('p'))
  const [result, setResult] = useState<ExtractResult | null>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [err, setErr] = useState('')
  const [dupAction, setDupAction] = useState<DupAction>('skip')
  const [replace, setReplace] = useState(true)
  const [mode, setMode] = useState<WeeklyMode>('additive')
  const wb = queue[qi]
  const existing = data.projects.find((p) => p.id === target)
  const projectId = target === 'new' ? newId : target

  function loaded(wbs: ParsedWorkbook[]) {
    setQueue(wbs); setQi(0); startFile(wbs[0])
  }
  function startFile(w: ParsedWorkbook) {
    const match = data.projects.find((p) => p.name.toLowerCase() === w.projectName.toLowerCase()) ?? data.projects.find((p) => p.id === sp.get('project'))
    setTarget(match?.id ?? 'new'); setPname(w.projectName); setPloc(w.location); setNewId(uid('p')); setResult(null); setErr(''); setStep(1)
  }
  const setWb = (w: ParsedWorkbook) => setQueue(queue.map((x, i) => (i === qi ? w : x)))

  async function runExtract() {
    if (!wb) return
    setErr(''); setResult(null); setProgress(0); setStep(3)
    try {
      const r = await extractWorkbook(wb, { projectId, categoryMap: {} }, setProgress)
      setResult(r)
      const led = r.transactions.filter((t) => t.stream === 'ledger').reduce((s, t) => s + t.amount, 0)
      const wk = r.transactions.filter((t) => t.stream === 'weekly').reduce((s, t) => s + t.amount, 0)
      setMode(existing ? existing.settings.weeklyMode : suggestWeeklyMode(led, wk, r.summary?.expenseStated ?? null))
    } catch (e) {
      setErr(e instanceof ImportError ? e.message : 'Something went wrong while reading the rows. Check the column mapping and try again.')
      setStep(2)
    }
    setProgress(null)
  }

  const prior = useMemo(() => data.transactions.filter((t) => t.projectId === projectId), [data.transactions, projectId])
  const replacing = !!wb && replace && prior.some((t) => t.sourceFile === wb.fileName)
  const dup = useMemo(() => {
    if (!result) return { duplicates: [], fresh: [], rDup: [], rFresh: [] as ExtractResult['receipts'] }
    const base = prior.filter((t) => !(replacing && wb && t.sourceFile === wb.fileName))
    const t = findDuplicates(result.transactions, base, txSignature)
    const r = findDuplicates(result.receipts, data.receipts.filter((x) => x.projectId === projectId && !(replacing && wb && x.sourceFile === wb.fileName)), receiptSignature)
    return { duplicates: t.duplicates, fresh: t.fresh, rDup: r.duplicates, rFresh: r.fresh }
  }, [result, prior, data.receipts, projectId, replacing, wb])

  useEffect(() => { if (result) result.validation.repeatedEntries = countRepeated(result.transactions) }, [result])

  function finish() {
    if (!result || !wb) return
    const skip = dupAction === 'skip'
    const transactions = skip ? dup.fresh : result.transactions
    const receipts = skip ? dup.rFresh : result.receipts
    const project: Project = existing ? { ...existing, settings: { ...existing.settings, weeklyMode: mode } } : {
      id: newId, name: pname.trim() || wb.fileName, location: ploc.trim(), startDate: null, endDate: null, budget: null, builtUpArea: null,
      status: 'active', createdAt: new Date().toISOString(), settings: { weeklyMode: mode, targetCostPerSqft: null },
    }
    commitImport({
      project, transactions, receipts, summary: result.summary, replaceFile: replacing,
      record: { projectId: project.id, file: wb.fileName, ledgerRows: transactions.filter((t) => t.stream === 'ledger').length, weeklyRows: transactions.filter((t) => t.stream === 'weekly').length, receiptRows: receipts.length, skipped: result.transactions.length - transactions.length, replaced: replacing },
    })
    if (qi + 1 < queue.length) { setQi(qi + 1); startFile(queue[qi + 1]) } else nav('/')
  }

  const required = wb ? wb.sheets.filter((s) => s.role !== 'ignore').flatMap((s) => (s.mapping.date === undefined || s.mapping.amount === undefined ? [s.name] : [])) : []
  const usable = wb ? wb.sheets.some((s) => s.role !== 'ignore') : false
  return (
    <div className="space-y-5">
      <div><h1 className="text-2xl font-bold">Import Excel</h1><p className="text-sm text-muted">Upload → understand → map → validate → import. Nothing is added until you confirm.</p></div>
      <ol className="flex flex-wrap gap-2 text-xs font-medium">{STEPS.map((s, i) => <li key={s} className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 ${i === step ? 'bg-blue text-white' : i < step ? 'bg-green-soft text-green' : 'bg-card text-muted border border-line'}`}>{i < step ? <Check size={13} /> : i + 1}{s}</li>)}</ol>
      {queue.length > 1 && <p className="text-sm text-muted">File {qi + 1} of {queue.length}: <b className="text-ink">{wb?.fileName}</b></p>}

      {step === 0 && <ExcelUploader onLoaded={loaded} />}

      {step === 1 && wb && (<Card className="space-y-5 p-5">
        <div><h2 className="font-semibold">{wb.fileName}</h2><p className="text-sm text-muted">{wb.sheets.length} sheets found. Check what each one is used for.</p></div>
        <SheetSelector wb={wb} onChange={setWb} />
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-xs text-muted">Add to project<select value={target} onChange={(e) => setTarget(e.target.value)} className="mt-1 w-full rounded-lg border border-line bg-card px-2 py-2 text-sm text-ink"><option value="new">New project</option>{data.projects.map((p) => <option key={p.id} value={p.id}>{p.name} (existing)</option>)}</select></label>
          {target === 'new' && <><label className="text-xs text-muted">Project name<input value={pname} onChange={(e) => setPname(e.target.value)} className="mt-1 w-full rounded-lg border border-line bg-card px-3 py-2 text-sm text-ink" /></label>
            <label className="text-xs text-muted">Location<input value={ploc} onChange={(e) => setPloc(e.target.value)} className="mt-1 w-full rounded-lg border border-line bg-card px-3 py-2 text-sm text-ink" /></label></>}
        </div>
        <div className="flex gap-2"><Btn onClick={() => { setQueue([]); setStep(0) }}>Back</Btn><Btn kind="primary" disabled={!usable} onClick={() => setStep(2)}>Continue</Btn></div>
      </Card>)}

      {step === 2 && wb && (<Card className="space-y-4 p-5">
        <div><h2 className="font-semibold">Match your columns</h2><p className="text-sm text-muted">Headers were recognised automatically – change any that look wrong. Fields marked * are required.</p></div>
        {err && <p role="alert" className="rounded-lg bg-red-soft px-3 py-2 text-sm text-red">{err}</p>}
        <ColumnMapper wb={wb} onChange={setWb} />
        <div className="flex gap-2"><Btn onClick={() => setStep(1)}>Back</Btn><Btn kind="primary" disabled={required.length > 0 || !usable} onClick={runExtract}>Preview data</Btn>{required.length > 0 && <span className="self-center text-xs text-red">Map Date and Amount on: {required.join(', ')}</span>}</div>
      </Card>)}

      {step === 3 && (<Card className="space-y-4 p-5">
        <h2 className="font-semibold">Preview</h2>
        {progress !== null && <div><p className="mb-1 text-sm text-muted">Reading rows… {progress}%</p><div className="h-2 overflow-hidden rounded-full bg-bg"><div className="h-full bg-blue transition-all" style={{ width: `${progress}%` }} /></div></div>}
        {result && <ImportPreview tx={result.transactions} receipts={result.receipts} />}
        <div className="flex gap-2"><Btn onClick={() => setStep(2)}>Back</Btn><Btn kind="primary" disabled={!result} onClick={() => setStep(4)}>Validate</Btn></div>
      </Card>)}

      {step === 4 && result && wb && (<Card className="space-y-5 p-5">
        <h2 className="font-semibold">Validation & import summary</h2>
        <ImportValidation v={result.validation} dups={dup.duplicates} action={dupAction} onAction={setDupAction} />
        <div className="grid gap-3 rounded-xl bg-bg p-4 text-sm sm:grid-cols-2">
          <div><div className="text-xs text-muted">Will import</div><b>{(dupAction === 'skip' ? dup.fresh : result.transactions).length} transactions · {(dupAction === 'skip' ? dup.rFresh : result.receipts).length} receipts</b><div className="num text-muted">{money((dupAction === 'skip' ? dup.fresh : result.transactions).reduce((s, t) => s + t.amount, 0))} total</div></div>
          {result.transactions.some((t) => t.stream === 'weekly') && (
            <label className="text-xs text-muted">Weekly material counts as…
              <select value={mode} onChange={(e) => setMode(e.target.value as WeeklyMode)} className="mt-1 w-full rounded-lg border border-line bg-card px-2 py-2 text-sm text-ink"><option value="additive">Additional cost on top of the ledger</option><option value="informational">Reference only (already inside the ledger)</option><option value="ignored">Ignore</option></select>
              {result.summary?.expenseStated != null && <span className="mt-1 block">The file’s own Expenses Total is {money(result.summary.expenseStated)}; the suggestion above reproduces it.</span>}</label>)}
          {prior.some((t) => t.sourceFile === wb.fileName) && <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} />Replace data previously imported from this file</label>}
        </div>
        <div className="flex gap-2"><Btn onClick={() => setStep(3)}>Back</Btn><Btn kind="accent" onClick={finish}>Import data</Btn></div>
      </Card>)}
    </div>
  )
}
