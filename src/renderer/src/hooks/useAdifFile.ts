import { useEffect, useState } from 'react'
import { AdifParser } from 'adif-parser-ts'

export interface AdifFileState {
  records: Array<Record<string, string>>
  loading: boolean
  error: string | null
}

const EMPTY_RECORDS: Array<Record<string, string>> = []

export function useAdifFile(filePath: string | null): AdifFileState {
  // Stale records/error from a previous file are left in state when filePath
  // goes back to null; callers key their "no file selected" UI off filePath
  // itself, so leftovers here are never rendered.
  const [records, setRecords] = useState<Array<Record<string, string>>>(EMPTY_RECORDS)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

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

    window.api
      .readAdifFile(filePath)
      .then((text) => {
        if (cancelled) return
        try {
          const parsed = AdifParser.parseAdi(text)
          setRecords(parsed.records ?? EMPTY_RECORDS)
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

  return { records, loading, error }
}
