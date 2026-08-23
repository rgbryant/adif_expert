import { useEffect, useMemo, useState } from 'react'
import type { FileEntry } from '../../shared/types'
import { FileList } from './components/FileList'
import { LogTable } from './components/LogTable'
import { useAdifFile } from './hooks/useAdifFile'
import { collectFields, mergeColumnVisibility } from './lib/columns'

function App(): React.JSX.Element {
  const [folder, setFolder] = useState<string | null>(null)
  const [files, setFiles] = useState<FileEntry[]>([])
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({})
  const [prefsLoaded, setPrefsLoaded] = useState(false)

  const { records, loading, error } = useAdifFile(selectedPath)
  const fields = useMemo(() => collectFields(records), [records])
  // Fields the current file introduces get a default visibility; anything the
  // user already chose (persisted in `columnVisibility`) is left untouched.
  const effectiveVisibility = useMemo(
    () => mergeColumnVisibility(fields, columnVisibility),
    [fields, columnVisibility]
  )

  // Load persisted folder/column choices once on startup.
  useEffect(() => {
    window.api.getPrefs().then((prefs) => {
      setFolder(prefs.lastFolder ?? null)
      setColumnVisibility(prefs.columnVisibility ?? {})
      setPrefsLoaded(true)
    })
  }, [])

  // List and watch whichever folder is current, whether picked just now or restored from prefs.
  useEffect(() => {
    if (!folder) return
    window.api.listAdifFiles(folder).then(setFiles)
    window.api.watchDirectory(folder)
    return window.api.onFilesChanged(() => {
      window.api.listAdifFiles(folder).then(setFiles)
    })
  }, [folder])

  useEffect(() => {
    if (!prefsLoaded) return
    window.api.setPrefs({ lastFolder: folder ?? undefined, columnVisibility })
  }, [folder, columnVisibility, prefsLoaded])

  const handleOpenFolder = async (): Promise<void> => {
    const path = await window.api.selectDirectory()
    if (!path) return
    setSelectedPath(null)
    setFolder(path)
  }

  const selectedFile = files.find((file) => file.path === selectedPath) ?? null

  return (
    <div className="app">
      <FileList
        folder={folder}
        files={files}
        selectedPath={selectedPath}
        onSelect={setSelectedPath}
        onOpenFolder={handleOpenFolder}
      />
      <main className="app__main">
        {selectedPath && error && <div className="app__error">{error}</div>}
        <LogTable
          fileName={selectedFile?.name ?? null}
          records={records}
          fields={fields}
          loading={loading}
          columnVisibility={effectiveVisibility}
          onColumnVisibilityChange={setColumnVisibility}
        />
      </main>
    </div>
  )
}

export default App
