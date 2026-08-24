import { useEffect, useMemo, useRef, useState } from 'react'
import { ADIF_QSO_FIELDS } from '../lib/adifFields'

interface AddContactFieldPickerProps {
  selected: string[]
  onChange: (fields: string[]) => void
}

export function AddContactFieldPicker({
  selected,
  onChange
}: AddContactFieldPickerProps): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
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

  const selectedSet = useMemo(() => new Set(selected), [selected])
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return term ? ADIF_QSO_FIELDS.filter((field) => field.includes(term)) : ADIF_QSO_FIELDS
  }, [search])

  function toggle(field: string): void {
    onChange(selectedSet.has(field) ? selected.filter((f) => f !== field) : [...selected, field])
  }

  return (
    <div className="field-picker" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        title="Choose which ADIF fields appear in this form"
        aria-label="Choose fields"
      >
        ⚙ Fields ({selected.length})
      </button>
      {open && (
        <div className="field-picker__panel">
          <input
            className="field-picker__search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search ADIF fields…"
            autoFocus
          />
          <div className="field-picker__list">
            {filtered.map((field) => (
              <label key={field} className="field-picker__option">
                <input
                  type="checkbox"
                  checked={selectedSet.has(field)}
                  onChange={() => toggle(field)}
                />
                {field.toUpperCase()}
              </label>
            ))}
            {filtered.length === 0 && <div className="field-picker__empty">No matching fields</div>}
          </div>
        </div>
      )}
    </div>
  )
}
