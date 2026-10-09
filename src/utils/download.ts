/* Saves generated files. Inside the claude.ai artifact viewer the `downloads`
   capability is used; everywhere else a normal browser download is performed. */

interface ClaudeHost { use?: (name: string) => Promise<{ save: (r: { filename: string; data: Blob | string | ArrayBuffer }) => Promise<unknown> } | null> }

export async function saveFile(filename: string, data: Blob | string | ArrayBuffer): Promise<'saved' | 'declined' | 'failed'> {
  const host = (window as unknown as { claude?: ClaudeHost }).claude
  if (host?.use) {
    try {
      const dl = await host.use('downloads')
      if (dl) {
        await dl.save({ filename, data })
        return 'saved'
      }
    } catch (e) {
      const code = (e as { code?: string })?.code
      if (code === 'declined') return 'declined'
    }
  }
  try {
    const blob = data instanceof Blob ? data : new Blob([data as BlobPart])
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
    return 'saved'
  } catch {
    return 'failed'
  }
}
