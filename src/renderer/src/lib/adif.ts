import { AdifFormatter } from 'adif-parser-ts'

export interface QsoRecord {
  id: number
  fields: Record<string, string>
}

let nextId = 1

/** Tags freshly-parsed records with stable ids that survive sorting and edits. */
export function withIds(records: Array<Record<string, string>>): QsoRecord[] {
  return records.map((fields) => ({ id: nextId++, fields }))
}

/**
 * `AdifFormatter.formatAdi` deletes `header.text` off the object it's given,
 * so every call here gets a fresh shallow copy — otherwise the free-text
 * header line silently vanishes after the first save.
 */
export function serialize(
  header: Record<string, string> | undefined,
  records: QsoRecord[]
): string {
  return AdifFormatter.formatAdi({
    header: header && { ...header },
    records: records.map((record) => record.fields)
  })
}
