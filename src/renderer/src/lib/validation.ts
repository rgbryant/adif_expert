import type { QsoRecord } from './adif'

interface BandRange {
  lower: number
  upper: number
}

// ADIF 3.1.7 Band Enumeration (frequency bounds in MHz), from adif.org.
const BAND_RANGES: Record<string, BandRange> = {
  '2190m': { lower: 0.1357, upper: 0.1378 },
  '630m': { lower: 0.472, upper: 0.479 },
  '560m': { lower: 0.501, upper: 0.504 },
  '160m': { lower: 1.8, upper: 2.0 },
  '80m': { lower: 3.5, upper: 4.0 },
  '60m': { lower: 5.06, upper: 5.45 },
  '40m': { lower: 7.0, upper: 7.3 },
  '30m': { lower: 10.1, upper: 10.15 },
  '20m': { lower: 14.0, upper: 14.35 },
  '17m': { lower: 18.068, upper: 18.168 },
  '15m': { lower: 21.0, upper: 21.45 },
  '12m': { lower: 24.89, upper: 24.99 },
  '10m': { lower: 28.0, upper: 29.7 },
  '8m': { lower: 40, upper: 45 },
  '6m': { lower: 50, upper: 54 },
  '5m': { lower: 54.000001, upper: 69.9 },
  '4m': { lower: 70, upper: 71 },
  '2m': { lower: 144, upper: 148 },
  '1.25m': { lower: 222, upper: 225 },
  '70cm': { lower: 420, upper: 450 },
  '33cm': { lower: 902, upper: 928 },
  '23cm': { lower: 1240, upper: 1300 },
  '13cm': { lower: 2300, upper: 2450 },
  '9cm': { lower: 3300, upper: 3500 },
  '6cm': { lower: 5650, upper: 5925 },
  '3cm': { lower: 10000, upper: 10500 },
  '1.25cm': { lower: 24000, upper: 24250 },
  '6mm': { lower: 47000, upper: 47200 },
  '4mm': { lower: 75500, upper: 81000 },
  '2.5mm': { lower: 119980, upper: 123000 },
  '2mm': { lower: 134000, upper: 149000 },
  '1mm': { lower: 241000, upper: 250000 },
  submm: { lower: 300000, upper: 7500000 }
}

export interface RecordIssues {
  freqBandMismatch: boolean
  timeOrderInvalid: boolean
}

export interface ValidationSummary {
  issuesByRecordId: Map<number, RecordIssues>
  freqBandMismatchCount: number
  timeOrderInvalidCount: number
  totalCount: number
}

/** HHMM or HHMMSS (ADIF's fixed-width TIME_ON/TIME_OFF format) to seconds since midnight, or null if unparseable. */
function parseTimeToSeconds(time: string): number | null {
  if (!/^\d{4}$|^\d{6}$/.test(time)) return null
  const hh = Number(time.slice(0, 2))
  const mm = Number(time.slice(2, 4))
  const ss = time.length === 6 ? Number(time.slice(4, 6)) : 0
  if (hh > 23 || mm > 59 || ss > 59) return null
  return hh * 3600 + mm * 60 + ss
}

export function validateRecord(fields: Record<string, string>): RecordIssues {
  const band = fields.band?.trim().toLowerCase()
  const freqStr = fields.freq?.trim()
  let freqBandMismatch = false
  if (band && freqStr) {
    const range = BAND_RANGES[band]
    const freq = Number(freqStr)
    if (range && Number.isFinite(freq)) {
      freqBandMismatch = freq < range.lower || freq > range.upper
    }
  }

  const timeOn = fields.time_on?.trim()
  const timeOff = fields.time_off?.trim()
  let timeOrderInvalid = false
  if (timeOn && timeOff) {
    // QSO_DATE_OFF present and different means the contact crossed midnight,
    // so TIME_OFF < TIME_ON is expected there, not an error.
    const sameDay = !fields.qso_date_off || fields.qso_date_off === fields.qso_date
    if (sameDay) {
      const onSeconds = parseTimeToSeconds(timeOn)
      const offSeconds = parseTimeToSeconds(timeOff)
      if (onSeconds !== null && offSeconds !== null) {
        timeOrderInvalid = offSeconds < onSeconds
      }
    }
  }

  return { freqBandMismatch, timeOrderInvalid }
}

export function validateRecords(records: QsoRecord[]): ValidationSummary {
  const issuesByRecordId = new Map<number, RecordIssues>()
  let freqBandMismatchCount = 0
  let timeOrderInvalidCount = 0

  for (const record of records) {
    const issues = validateRecord(record.fields)
    if (issues.freqBandMismatch || issues.timeOrderInvalid) {
      issuesByRecordId.set(record.id, issues)
      if (issues.freqBandMismatch) freqBandMismatchCount++
      if (issues.timeOrderInvalid) timeOrderInvalidCount++
    }
  }

  return {
    issuesByRecordId,
    freqBandMismatchCount,
    timeOrderInvalidCount,
    totalCount: freqBandMismatchCount + timeOrderInvalidCount
  }
}
