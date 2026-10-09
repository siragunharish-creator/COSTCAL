import { useMemo, useState } from 'react'
import { AlertTriangle, ArrowRight, Info, Pencil } from 'lucide-react'
import { useData } from '../../store/DataContext'
import { useScoped } from '../../store/useScoped'
import { useDrill } from '../../utils/nav'
import { bucketTotals, calculateCategoryTotals, calculateCostPerSqft, calculateDailyTotals, calculateMonthlyTotals, calculateProjectTotals, generateInsights, spanStats } from '../../services/analytics'
import { Btn, Card, KPICard, SectionTitle, Empty } from '../ui/primitives'
import { Donut, MonthLine, RankBars, TrendBars } from '../ui/charts'
import { TransactionTable } from '../Transactions/TransactionTable'
import { Reconciliation } from './Reconciliation'
import { ProjectComparison } from './ProjectComparison'
import { fmtDate, money, moneyShort, num, pct } from '../../utils/format'
import type { Project } from '../../types/project'

export function StartScreen() {
  const { loadDemo } = useData()
  const { go } = useDrill()
  return (
    <Card className="mx-auto mt-6 max-w-3xl overflow-hidden">
      <div className="bg-navy px-8 py-10 text-white">
        <p className="text-xs font-semibold uppercase tracking-[.2em] text-orange">Construction Cost Intelligence</p>
        <h1 className="mt-3 text-3xl font-bold">Start Your Construction Cost Analysis</h1>
        <p className="mt-3 max-w-xl text-slate-300">Upload your project Excel and turn your expense records into actionable insights – then click any number to see the exact transactions and Excel rows behind it.</p>
        <div className="mt-6 flex flex-wrap gap-3"><Btn kind="accent" onClick={() => go('/import')}>Upload Excel</Btn><button onClick={loadDemo} className="rounded-lg border border-white/30 px-4 py-2 text-sm font-medium hover:bg-white/10">View Demo</button></div>
      </div>
      <ul className="grid gap-4 p-6 text-sm text-muted sm:grid-cols-3">
        <li><b className="text-ink">Understands your sheets</b><br />Cost summary, daily ledger and weekly material are recognised and cross-checked.</li>
        <li><b className="text-ink">Reconciles totals</b><br />Shows why totals differ so nothing is double counted.</li>
        <li><b className="text-ink">Private</b><br />Files are read in your browser and stay on this device.</li>
      </ul>
    </Card>
  )
}

function CostControl({ project }: { project: Project }) {
  const { saveProject, data } = useData()
  const [edit, setEdit] = useState(false)
  const [b, setB] = useState(String(project.budget ?? '')), [a, setA] = useState(String(project.builtUpArea ?? '')), [t, setT] = useState(String(project.settings.targetCostPerSqft ?? ''))
  const contract = data.summaries.find((s) => s.projectId === project.id)?.contractValue ?? null
  const save = () => { const n = (x: string) => (x.trim() && +x > 0 ? +x : null); saveProject({ ...project, budget: n(b), builtUpArea: n(a), settings: { ...project.settings, targetCostPerSqft: n(t) } }); setEdit(false) }
  const spent = useScoped({ projectId: project.id }).tx.reduce((s, x) => s + x.amount, 0)
  const cps = calculateCostPerSqft(spent, project.builtUpArea)
  const inp = 'mt-1 w-full rounded-lg border border-line bg-card px-3 py-2 text-sm'
  return (
    <Card>
      <SectionTitle title="Cost control" sub="Only figures you enter or that exist in the Excel – nothing is estimated." right={<Btn onClick={() => setEdit(!edit)}><Pencil size={14} />{edit ? 'Cancel' : 'Edit'}</Btn>} />
      <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
        <div><div className="text-xs text-muted">Built-up area</div><div className="num text-xl font-bold">{project.builtUpArea ? `${num(project.builtUpArea)} sqft` : '–'}</div></div>
        <div><div className="text-xs text-muted">Cost per sqft</div><div className="num text-xl font-bold text-blue">{cps ? money(cps) : 'Enter area'}</div>{project.settings.targetCostPerSqft && cps && <div className={`text-xs ${cps > project.settings.targetCostPerSqft ? 'text-red' : 'text-green'}`}>Target {money(project.settings.targetCostPerSqft)}</div>}</div>
        <div><div className="text-xs text-muted">Budget</div><div className="num text-xl font-bold">{project.budget ? money(project.budget) : '–'}</div>{project.budget && <div className={`text-xs ${spent > project.budget ? 'text-red' : 'text-muted'}`}>{pct(spent, project.budget)} used · {money(project.budget - spent)} remaining</div>}</div>
        <div><div className="text-xs text-muted">Contract value (from Excel)</div><div className="num text-xl font-bold">{contract ? money(contract) : '–'}</div>{contract && !project.budget && <button className="text-xs text-blue hover:underline" onClick={() => saveProject({ ...project, budget: contract })}>Use as budget</button>}</div>
      </div>
      {edit && <div className="grid gap-3 border-t border-line p-5 sm:grid-cols-4">
        <label className="text-xs text-muted">Built-up area (sqft)<input className={inp} type="number" value={a} onChange={(e) => setA(e.target.value)} /></label>
        <label className="text-xs text-muted">Target cost / sqft<input className={inp} type="number" value={t} onChange={(e) => setT(e.target.value)} /></label>
        <label className="text-xs text-muted">Project budget<input className={inp} type="number" value={b} onChange={(e) => setB(e.target.value)} /></label>
        <div className="flex items-end"><Btn kind="primary" onClick={save}>Save</Btn></div></div>}
    </Card>
  )
}

export function DashboardView({ projectId }: { projectId?: string }) {
  const { data } = useData()
  const { tx, receipts, scopedProjects, projects, recognizedAll } = useScoped({ projectId })
  const { go, ledger } = useDrill()
  const received = receipts.reduce((s, r) => s + r.amount, 0)
  const b = useMemo(() => bucketTotals(tx), [tx])
  const expense = b.total
  const balance = received - expense
  const counted = tx.filter((t) => t.hasAmount).length
  const span = useMemo(() => spanStats(tx), [tx])
  const cats = useMemo(() => calculateCategoryTotals(tx), [tx])
  const monthly = useMemo(() => calculateMonthlyTotals(tx), [tx])
  const daily = useMemo(() => calculateDailyTotals(tx), [tx])
  const insights = useMemo(() => generateInsights(tx, scopedProjects), [tx, scopedProjects])
  const single = scopedProjects.length === 1 ? scopedProjects[0] : null
  const rows = useMemo(() => calculateProjectTotals(scopedProjects, tx, receipts), [scopedProjects, tx, receipts])
  if (!data.projects.length) return <StartScreen />
  const pickCat = (k: string) => (k === 'Material' ? go('/materials') : k === 'Labour' ? go('/labour') : go(`/categories/${encodeURIComponent(k)}`))
  const other = cats.filter((c) => c.key !== 'Material' && c.key !== 'Labour').map((c) => c.key)
  const best = rows.slice().sort((a, c) => c.expense - a.expense)[0]
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">{single ? single.name : 'Project Cost Intelligence'}</h1>
        <p className="text-sm text-muted">{single ? `${single.location} · ${single.status}` : 'Understand where every rupee of your construction project is going.'}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        <KPICard label="Total received" value={received} format={moneyShort} tone="green" sub={`${receipts.length} payments`} onClick={() => go('/cashflow')} />
        <KPICard label="Project cost" value={expense} format={moneyShort} tone="blue" sub={`Based on ${num(counted)} transactions`} onClick={() => ledger({})} />
        <KPICard label="Balance" value={balance} format={moneyShort} tone={balance < 0 ? 'red' : 'green'} sub={balance < 0 ? 'Spent more than received' : 'Received − cost'} onClick={() => go('/cashflow')} />
        <KPICard label="Material" value={b.material} format={moneyShort} tone="blue" sub={pct(b.material, expense) + ' of cost'} onClick={() => go('/materials')} />
        <KPICard label="Labour" value={b.labour} format={moneyShort} tone="orange" sub={pct(b.labour, expense) + ' of cost'} onClick={() => go('/labour')} />
        <KPICard label="Other expenses" value={b.machine + b.other} format={moneyShort} tone="slate" sub="Machine, misc, transport…" onClick={() => ledger({ categories: other })} />
        <KPICard label="Transactions" value={counted} format={(n) => num(Math.round(n))} tone="slate" sub="Open ledger" onClick={() => ledger({})} />
      </div>

      {!tx.length ? <Card><Empty title="No transactions match" text="Try clearing some filters." /></Card> : (<>
        <Card>
          <SectionTitle title="Financial summary" />
          <div className="grid items-center gap-4 p-5 lg:grid-cols-[1fr_auto_1fr_auto_1fr_1.1fr]">
            <div className="rounded-xl bg-green-soft p-4"><div className="text-xs text-muted">Money received</div><div className="num text-2xl font-bold text-green">{money(received)}</div></div>
            <ArrowRight className="mx-auto hidden text-muted lg:block" />
            <div className="rounded-xl bg-orange-soft p-4"><div className="text-xs text-muted">Project expenses</div><div className="num text-2xl font-bold text-orange">{money(expense)}</div></div>
            <ArrowRight className="mx-auto hidden text-muted lg:block" />
            <div className={`rounded-xl p-4 ${balance < 0 ? 'bg-red-soft' : 'bg-blue-soft'}`}><div className="text-xs text-muted">Remaining balance</div><div className={`num text-2xl font-bold ${balance < 0 ? 'text-red' : 'text-blue'}`}>{money(balance)}</div></div>
            <dl className="grid grid-cols-3 gap-2 text-xs lg:grid-cols-1">
              <div className="flex justify-between"><dt className="text-muted">Expense % of received</dt><dd className="num font-semibold">{received ? pct(expense, received) : '–'}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Avg monthly expense</dt><dd className="num font-semibold">{moneyShort(span.avgMonthly)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Avg daily expense</dt><dd className="num font-semibold">{moneyShort(span.avgDaily)}</dd></div>
            </dl>
          </div>
          {received > 0 && <div className="px-5 pb-5"><div className="h-2.5 overflow-hidden rounded-full bg-bg"><div className={`h-full rounded-full ${expense > received ? 'bg-red' : 'bg-orange'}`} style={{ width: `${Math.min(100, (expense / received) * 100)}%`, transition: 'width .6s' }} /></div></div>}
        </Card>

        <div className="grid gap-5 lg:grid-cols-2">
          <Card><SectionTitle title="Where the money went" sub="Click a slice to open its analysis" /><div className="p-4"><Donut data={cats} onSelect={pickCat} /></div></Card>
          <Card><SectionTitle title="Expense category breakdown" sub="Categories exactly as found in your Excel" /><div className="p-4"><RankBars data={cats} onSelect={pickCat} /></div></Card>
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          <Card><SectionTitle title="Monthly expense" sub="Click a month to drill down" /><div className="p-4"><MonthLine data={monthly} onSelect={(k) => go(`/months/${k}`)} /></div></Card>
          <Card><SectionTitle title="Daily expense" sub="Orange bars are unusually high days · click to open" /><div className="p-4"><TrendBars data={daily.map((d) => ({ ...d, label: fmtDate(d.key).slice(0, 6) }))} onSelect={(k) => go(`/days/${k}`)} highlight color="#2563eb" /></div></Card>
        </div>

        {insights.length > 0 && (
          <Card><SectionTitle title="Alerts & insights" sub="Calculated from your data only" />
            <ul className="grid gap-2 p-5 md:grid-cols-2">{insights.slice(0, 8).map((i) => (
              <li key={i.id}><button onClick={() => i.link && go(i.link)} className={`flex w-full gap-3 rounded-xl border p-3 text-left hover:shadow-md ${i.level === 'alert' ? 'border-red bg-red-soft' : i.level === 'warn' ? 'border-orange bg-orange-soft' : 'border-line bg-bg'}`}>
                {i.level === 'info' ? <Info size={18} className="mt-0.5 shrink-0 text-blue" /> : <AlertTriangle size={18} className={`mt-0.5 shrink-0 ${i.level === 'alert' ? 'text-red' : 'text-orange'}`} />}
                <span><span className="block text-sm font-semibold">{i.title}</span><span className="text-xs text-muted">{i.detail}</span></span></button></li>))}</ul></Card>
        )}

        {single && <CostControl project={single} />}
        {!single && scopedProjects.length > 1 && (<>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <KPICard label="Projects" value={scopedProjects.length} format={(n) => String(Math.round(n))} tone="slate" onClick={() => go('/projects')} />
            <KPICard label="Highest-cost project" value={best?.expense ?? 0} format={moneyShort} tone="orange" sub={best?.project.name} onClick={() => best && go(`/projects/${best.project.id}`)} />
            <KPICard label="Average project cost" value={expense / scopedProjects.length} format={moneyShort} tone="blue" />
            <KPICard label="Total balance" value={balance} format={moneyShort} tone={balance < 0 ? 'red' : 'green'} />
          </div>
          <ProjectComparison projects={scopedProjects} tx={tx} receipts={receipts} />
        </>)}
        <Reconciliation projects={scopedProjects.length ? scopedProjects : projects} />
        <TransactionTable tx={tx.slice().sort((a, c) => (a.date < c.date ? 1 : -1)).slice(0, 200)} title="Recent transactions" pageSize={8} search={false} />
        <p className="text-xs text-muted">{recognizedAll.length ? '' : ''}Every figure above is calculated from imported rows – click any card, slice or bar to see the transactions behind it.</p>
      </>)}
    </div>
  )
}
