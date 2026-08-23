export interface FileEntry {
  name: string
  path: string
  size: number
  mtimeMs: number
}

export interface Prefs {
  lastFolder?: string
  columnVisibility?: Record<string, boolean>
}
