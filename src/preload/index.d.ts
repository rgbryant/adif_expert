import { ElectronAPI } from '@electron-toolkit/preload'
import type { FileEntry, Prefs } from '../shared/types'

interface Api {
  selectDirectory: () => Promise<string | null>
  listAdifFiles: (dirPath: string) => Promise<FileEntry[]>
  readAdifFile: (filePath: string) => Promise<string>
  writeAdifFile: (filePath: string, contents: string) => Promise<void>
  watchDirectory: (dirPath: string) => Promise<void>
  onFilesChanged: (callback: () => void) => () => void
  getPrefs: () => Promise<Prefs>
  setPrefs: (prefs: Prefs) => Promise<void>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: Api
  }
}
