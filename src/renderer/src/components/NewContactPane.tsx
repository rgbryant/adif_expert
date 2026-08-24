import { useMemo, useState, type FormEvent } from 'react'
import { orderFields } from '../lib/columns'
import { AddContactFieldPicker } from './AddContactFieldPicker'

interface NewContactPaneProps {
  selectedFields: string[]
  onFieldsChange: (fields: string[]) => void
  onAdd: (fields: Record<string, string>) => void
  onCancel: () => void
}

export function NewContactPane({
  selectedFields,
  onFieldsChange,
  onAdd,
  onCancel
}: NewContactPaneProps): React.JSX.Element {
  const [values, setValues] = useState<Record<string, string>>({})
  const fields = useMemo(() => orderFields(selectedFields), [selectedFields])

  function handleSubmit(event: FormEvent): void {
    event.preventDefault()
    const nonEmpty = Object.fromEntries(
      Object.entries(values).filter(([, value]) => value.trim() !== '')
    )
    onAdd(nonEmpty)
  }

  return (
    <form className="add-contact" onSubmit={handleSubmit}>
      <div className="add-contact__header">
        <span className="add-contact__title">New Contact</span>
        <AddContactFieldPicker selected={selectedFields} onChange={onFieldsChange} />
      </div>
      <div className="add-contact__fields">
        {fields.map((field, index) => (
          <label key={field} className="add-contact__field">
            <span>{field.toUpperCase()}</span>
            <input
              autoFocus={index === 0}
              required={field === 'call'}
              value={values[field] ?? ''}
              onChange={(e) => setValues((prev) => ({ ...prev, [field]: e.target.value }))}
            />
          </label>
        ))}
        {fields.length === 0 && (
          <div className="add-contact__empty">
            No fields selected — use ⚙ Fields to choose which ones show up here.
          </div>
        )}
      </div>
      <div className="add-contact__actions">
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit">Add</button>
      </div>
    </form>
  )
}
