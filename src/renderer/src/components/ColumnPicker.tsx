import { useEffect, useRef, useState } from 'react'

interface ColumnPickerProps {
  fields: string[]
  visibility: Record<string, boolean>
  onToggle: (field: string) => void
}

export function ColumnPicker({
  fields,
  visibility,
  onToggle
}: ColumnPickerProps): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (event: MouseEvent): void => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const visibleCount = fields.filter((field) => visibility[field] !== false).length

  return (
    <div className="column-picker" ref={containerRef}>
      <button type="button" onClick={() => setOpen((value) => !value)}>
        Columns ({visibleCount}/{fields.length})
      </button>
      {open && (
        <div className="column-picker__panel">
          {fields.map((field) => (
            <label key={field} className="column-picker__option">
              <input
                type="checkbox"
                checked={visibility[field] !== false}
                onChange={() => onToggle(field)}
              />
              {field.toUpperCase()}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
