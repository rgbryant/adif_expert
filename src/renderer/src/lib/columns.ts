// Fields shown by default when a log is first opened; everything else the
// file contains is still available, just hidden until toggled on.
const DEFAULT_VISIBLE_FIELDS = ['call', 'qso_date', 'time_on', 'band', 'mode', 'freq']

/** Union of field names (ADIF parser gives us lowercase keys) across every record, ordered with the common fields first. */
export function collectFields(records: Array<Record<string, string>>): string[] {
  const seen = new Set<string>()
  for (const record of records) {
    for (const field of Object.keys(record)) {
      seen.add(field)
    }
  }

  const priority = DEFAULT_VISIBLE_FIELDS.filter((field) => seen.has(field))
  const rest = [...seen].filter((field) => !DEFAULT_VISIBLE_FIELDS.includes(field)).sort()
  return [...priority, ...rest]
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
