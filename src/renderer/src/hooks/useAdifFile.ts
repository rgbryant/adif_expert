import { useCallback, useEffect, useState } from 'react'
import { AdifParser } from 'adif-parser-ts'
import { serialize, withIds, type QsoRecord } from '../lib/adif'

export interface AdifFileState {
  records: QsoRecord[]
  loading: boolean
  error: string | null
  saving: boolean
  saveError: string | null
  updateCell: (id: number, field: string, value: string) => void
  bulkSetColumns: (fieldIds: string[], rowIds: number[] | 'all', value: string) => void
  deleteRows: (ids: number[]) => void
  addRecord: (fields: Record<string, string>) => void
}

const EMPTY_RECORDS: QsoRecord[] = []

export function useAdifFile(filePath: string | null): AdifFileState {
  // Stale records/error from a previous file are left in state when filePath
  // goes back to null; callers key their "no file selected" UI off filePath
  // itself, so leftovers here are never rendered.
  const [records, setRecords] = useState<QsoRecord[]>(EMPTY_RECORDS)
  const [header, setHeader] = useState<Record<string, string> | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    if (!filePath) return

    let cancelled = false
    // This is the standard "kick off a fetch on mount/dep-change" effect
    // shape from the React docs; react-hooks/set-state-in-effect flags any
    // synchronous setState here, but there's no external subscription to
    // hang the loading/error reset off instead.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    setError(null)
    setSaveError(null)

    window.api
      .readAdifFile(filePath)
      .then((text) => {
        if (cancelled) return
        try {
          const parsed = AdifParser.parseAdi(text)
          setHeader(parsed.header)
          setRecords(withIds(parsed.records ?? []))
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Failed to parse ADIF file')
          setRecords(EMPTY_RECORDS)
        }
      })
      .catch((e) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Failed to read file')
        setRecords(EMPTY_RECORDS)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [filePath])

  const persist = useCallback(
    (next: QsoRecord[]) => {
      setRecords(next)
      if (!filePath) return
      setSaving(true)
      setSaveError(null)
      window.api
        .writeAdifFile(filePath, serialize(header, next))
        .catch((e) => {
          setSaveError(e instanceof Error ? e.message : 'Failed to save file')
        })
        .finally(() => setSaving(false))
    },
    [filePath, header]
  )

  const updateCell = useCallback(
    (id: number, field: string, value: string) => {
      persist(
        records.map((record) =>
          record.id === id ? { ...record, fields: { ...record.fields, [field]: value } } : record
        )
      )
    },
    [records, persist]
  )

  const bulkSetColumns = useCallback(
    (fieldIds: string[], rowIds: number[] | 'all', value: string) => {
      const idSet = rowIds === 'all' ? null : new Set(rowIds)
      persist(
        records.map((record) => {
          if (idSet && !idSet.has(record.id)) return record
          const fields = { ...record.fields }
          for (const field of fieldIds) fields[field] = value
          return { ...record, fields }
        })
      )
    },
    [records, persist]
  )

  const deleteRows = useCallback(
    (ids: number[]) => {
      const idSet = new Set(ids)
      persist(records.filter((record) => !idSet.has(record.id)))
    },
    [records, persist]
  )

  const addRecord = useCallback(
    (fields: Record<string, string>) => {
      persist([...records, ...withIds([fields])])
    },
    [records, persist]
  )

  return {
    records,
    loading,
    error,
    saving,
    saveError,
    updateCell,
    bulkSetColumns,
    deleteRows,
    addRecord
  }
}
