import { app } from 'electron'
import { promises as fs } from 'fs'
import { join } from 'path'
import type { Prefs } from '../shared/types'

function prefsPath(): string {
  return join(app.getPath('userData'), 'prefs.json')
}

export async function readPrefs(): Promise<Prefs> {
  try {
    const raw = await fs.readFile(prefsPath(), 'utf-8')
    return JSON.parse(raw) as Prefs
  } catch {
    return {}
  }
}

export async function writePrefs(prefs: Prefs): Promise<void> {
  await fs.writeFile(prefsPath(), JSON.stringify(prefs, null, 2), 'utf-8')
}
