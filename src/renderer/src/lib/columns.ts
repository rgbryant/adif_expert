import type { QsoRecord } from './adif'

// Fields shown by default when a log is first opened (or offered by default
// in a fresh install's Add Contact form); everything else is still
// available, just hidden/unselected until toggled on.
export const DEFAULT_VISIBLE_FIELDS = ['call', 'qso_date', 'time_on', 'band', 'mode', 'freq']

/** Puts the common fields first (in their usual order), then the rest alphabetically. */
export function orderFields(fields: Iterable<string>): string[] {
  const set = new Set(fields)
  const priority = DEFAULT_VISIBLE_FIELDS.filter((field) => set.has(field))
  const rest = [...set].filter((field) => !DEFAULT_VISIBLE_FIELDS.includes(field)).sort()
  return [...priority, ...rest]
}

/** Union of field names (ADIF parser gives us lowercase keys) across every record, ordered with the common fields first. */
export function collectFields(records: QsoRecord[]): string[] {
  const seen = new Set<string>()
  for (const record of records) {
    for (const field of Object.keys(record.fields)) {
      seen.add(field)
    }
  }

  return orderFields(seen)
}

/** Adds a default entry for any field not already present in `current`, leaving existing choices untouched. Returns `current` unchanged if there's nothing new. */
export function mergeColumnVisibility(
  fields: string[],
  current: Record<string, boolean>
): Record<string, boolean> {
  let changed = false
  const next = { ...current }
  for (const field of fields) {
    if (!(field in next)) {
      next[field] = DEFAULT_VISIBLE_FIELDS.includes(field)
      changed = true
    }
  }
  return changed ? next : current
}
