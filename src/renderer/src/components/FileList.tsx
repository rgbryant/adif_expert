import type { FileEntry } from '../../../shared/types'

interface FileListProps {
  folder: string | null
  files: FileEntry[]
  selectedPath: string | null
  onSelect: (path: string) => void
  onOpenFolder: () => void
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function FileList({
  folder,
  files,
  selectedPath,
  onSelect,
  onOpenFolder
}: FileListProps): React.JSX.Element {
  return (
    <div className="file-list">
      <div className="file-list__header">
        <button type="button" onClick={onOpenFolder}>
          Open Folder…
        </button>
      </div>
      {folder && (
        <div className="file-list__folder" title={folder}>
          {folder}
        </div>
      )}
      <ul className="file-list__items">
        {files.length === 0 && (
          <li className="file-list__empty">
            {folder ? 'No .adi/.adif files in this folder' : 'No folder selected'}
          </li>
        )}
        {files.map((file) => (
          <li key={file.path}>
            <button
              type="button"
              className={
                file.path === selectedPath ? 'file-list__item is-selected' : 'file-list__item'
              }
              onClick={() => onSelect(file.path)}
            >
              <span className="file-list__name">{file.name}</span>
              <span className="file-list__size">{formatSize(file.size)}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
