import { promises as fs } from 'fs'
import { join } from 'path'
import chokidar, { FSWatcher } from 'chokidar'
import type { FileEntry } from '../shared/types'

const ADIF_EXTENSIONS = new Set(['.adi', '.adif'])

function isAdifFile(name: string): boolean {
  const dot = name.lastIndexOf('.')
  if (dot === -1) return false
  return ADIF_EXTENSIONS.has(name.slice(dot).toLowerCase())
}

export async function listAdifFiles(dirPath: string): Promise<FileEntry[]> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true })
  const files = await Promise.all(
    entries
      .filter((entry) => entry.isFile() && isAdifFile(entry.name))
      .map(async (entry) => {
        const path = join(dirPath, entry.name)
        const stat = await fs.stat(path)
        return { name: entry.name, path, size: stat.size, mtimeMs: stat.mtimeMs }
      })
  )
  return files.sort((a, b) => a.name.localeCompare(b.name))
}

export function readAdifFile(filePath: string): Promise<string> {
  return fs.readFile(filePath, 'utf-8')
}

/** Writes atomically (temp file + rename) so a crash mid-write can't leave a truncated log. */
export async function writeAdifFile(filePath: string, contents: string): Promise<void> {
  const tmpPath = `${filePath}.tmp`
  await fs.writeFile(tmpPath, contents, 'utf-8')
  await fs.rename(tmpPath, filePath)
}

/** Watches a folder (non-recursive) and calls onChange when its contents change. */
export function watchDirectory(dirPath: string, onChange: () => void): FSWatcher {
  const watcher = chokidar.watch(dirPath, {
    depth: 0,
    ignoreInitial: true
  })
  watcher.on('add', onChange).on('unlink', onChange).on('change', onChange)
  return watcher
}
