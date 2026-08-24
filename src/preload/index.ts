import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { FileEntry, Prefs } from '../shared/types'

const api = {
  selectDirectory: (): Promise<string | null> => ipcRenderer.invoke('select-directory'),
  listAdifFiles: (dirPath: string): Promise<FileEntry[]> =>
    ipcRenderer.invoke('list-adif-files', dirPath),
  readAdifFile: (filePath: string): Promise<string> =>
    ipcRenderer.invoke('read-adif-file', filePath),
  writeAdifFile: (filePath: string, contents: string): Promise<void> =>
    ipcRenderer.invoke('write-adif-file', filePath, contents),
  watchDirectory: (dirPath: string): Promise<void> =>
    ipcRenderer.invoke('watch-directory', dirPath),
  onFilesChanged: (callback: () => void): (() => void) => {
    const listener = (): void => callback()
    ipcRenderer.on('files-changed', listener)
    return () => ipcRenderer.removeListener('files-changed', listener)
  },
  getPrefs: (): Promise<Prefs> => ipcRenderer.invoke('get-prefs'),
  setPrefs: (prefs: Prefs): Promise<void> => ipcRenderer.invoke('set-prefs', prefs)
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
