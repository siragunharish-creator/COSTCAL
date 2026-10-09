import { useRef, useState } from 'react'
import { FileSpreadsheet, UploadCloud } from 'lucide-react'
import { ImportError, readWorkbook, type ParsedWorkbook } from '../../services/excelParser'

const MAX_MB = 60

export function ExcelUploader({ onLoaded }: { onLoaded: (wbs: ParsedWorkbook[]) => void }) {
  const input = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)
  const [busy, setBusy] = useState<{ done: number; total: number } | null>(null)
  const [errors, setErrors] = useState<string[]>([])

  async function handle(files: FileList | File[]) {
    const list = Array.from(files)
    if (!list.length) return
    setErrors([]); setBusy({ done: 0, total: list.length })
    const ok: ParsedWorkbook[] = [], errs: string[] = []
    for (let i = 0; i < list.length; i++) {
      const f = list[i]
      await new Promise((r) => setTimeout(r, 30)) // let the progress bar paint
      try {
        if (!/\.(xlsx|xls|xlsm)$/i.test(f.name)) throw new ImportError(`"${f.name}" is not an Excel file (.xlsx or .xls).`)
        if (f.size > MAX_MB * 1024 * 1024) throw new ImportError(`"${f.name}" is larger than ${MAX_MB} MB. Split it into smaller files.`)
        ok.push(readWorkbook(await f.arrayBuffer(), f.name))
      } catch (e) {
        errs.push(e instanceof ImportError ? e.message : `"${f.name}" could not be read. It may be corrupted or password-protected.`)
      }
      setBusy({ done: i + 1, total: list.length })
    }
    setBusy(null); setErrors(errs)
    if (ok.length) onLoaded(ok)
  }
  return (
    <div>
      <div role="button" tabIndex={0} onClick={() => input.current?.click()} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && input.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)} onDrop={(e) => { e.preventDefault(); setOver(false); void handle(e.dataTransfer.files) }}
        className={`flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed px-6 py-14 text-center transition ${over ? 'border-orange bg-orange-soft' : 'border-line bg-card hover:border-blue'}`}>
        <UploadCloud size={40} className="text-blue" />
        <h2 className="mt-3 text-lg font-semibold">Drop Excel files here, or tap to browse</h2>
        <p className="mt-1 max-w-md text-sm text-muted">.xlsx and .xls · several files at once · one workbook per project works best. Files are read inside your browser and are not uploaded anywhere.</p>
        <input ref={input} type="file" multiple accept=".xlsx,.xls,.xlsm" className="hidden" onChange={(e) => { if (e.target.files) void handle(e.target.files); e.target.value = '' }} />
      </div>
      {busy && <div className="mt-4"><div className="mb-1 flex items-center gap-2 text-sm text-muted"><FileSpreadsheet size={16} />Reading file {Math.min(busy.done + 1, busy.total)} of {busy.total}…</div><div className="h-2 overflow-hidden rounded-full bg-bg"><div className="h-full bg-blue transition-all" style={{ width: `${(busy.done / busy.total) * 100}%` }} /></div></div>}
      {errors.map((e) => <p key={e} role="alert" className="mt-3 rounded-lg bg-red-soft px-3 py-2 text-sm text-red">{e}</p>)}
    </div>
  )
}
