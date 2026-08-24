import { app, shell, BrowserWindow, dialog, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import type { FSWatcher } from 'chokidar'
import icon from '../../resources/icon.png?asset'
import { listAdifFiles, readAdifFile, watchDirectory, writeAdifFile } from './fileSystem'
import { readPrefs, writePrefs } from './store'
import type { Prefs } from '../shared/types'

let activeWatcher: FSWatcher | null = null

function stopWatching(): void {
  if (activeWatcher) {
    activeWatcher.close()
    activeWatcher = null
  }
}

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 780,
    minWidth: 720,
    minHeight: 480,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  mainWindow.on('closed', stopWatching)

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.adifexpert.app')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.handle('select-directory', async (event) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    const options: Electron.OpenDialogOptions = { properties: ['openDirectory'] }
    const result = await (window
      ? dialog.showOpenDialog(window, options)
      : dialog.showOpenDialog(options))
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  ipcMain.handle('list-adif-files', (_event, dirPath: string) => listAdifFiles(dirPath))

  ipcMain.handle('read-adif-file', (_event, filePath: string) => readAdifFile(filePath))

  ipcMain.handle('write-adif-file', (_event, filePath: string, contents: string) =>
    writeAdifFile(filePath, contents)
  )

  ipcMain.handle('watch-directory', (event, dirPath: string) => {
    stopWatching()
    const window = BrowserWindow.fromWebContents(event.sender)
    activeWatcher = watchDirectory(dirPath, () => {
      window?.webContents.send('files-changed')
    })
  })

  ipcMain.handle('get-prefs', () => readPrefs())

  ipcMain.handle('set-prefs', (_event, prefs: Prefs) => writePrefs(prefs))

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  stopWatching()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
