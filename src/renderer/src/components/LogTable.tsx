import { useMemo, useRef, useState } from 'react'
import {
  columnVisibilityFeature,
  createColumnHelper,
  createSortedRowModel,
  rowSortingFeature,
  sortFn_alphanumeric,
  tableFeatures,
  useTable
} from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { QsoRecord } from '../lib/adif'
import { validateRecords, type RecordIssues } from '../lib/validation'
import { ColumnPicker } from './ColumnPicker'
import { NewContactPane } from './NewContactPane'

const features = tableFeatures({
  columnVisibilityFeature,
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric }
})

const helper = createColumnHelper<typeof features, QsoRecord>()

const SELECT_COLUMN_ID = '__select'
const ROW_HEIGHT = 30
const WIDE_FIELDS = new Set(['comment', 'notes', 'name', 'qth', 'address', 'email'])

function columnWidth(field: string): number {
  if (field === SELECT_COLUMN_ID) return 32
  return WIDE_FIELDS.has(field) ? 220 : 130
}

function cellHasError(issues: RecordIssues | undefined, field: string): boolean {
  if (!issues) return false
  if ((field === 'band' || field === 'freq') && issues.freqBandMismatch) return true
  if ((field === 'time_on' || field === 'time_off') && issues.timeOrderInvalid) return true
  return false
}

interface LogTableProps {
  fileName: string | null
  records: QsoRecord[]
  fields: string[]
  loading: boolean
  saving: boolean
  columnVisibility: Record<string, boolean>
  onColumnVisibilityChange: (visibility: Record<string, boolean>) => void
  onUpdateCell: (id: number, field: string, value: string) => void
  onBulkSetColumns: (fieldIds: string[], rowIds: number[] | 'all', value: string) => void
  onDeleteRows: (ids: number[]) => void
  onAddRecord: (fields: Record<string, string>) => void
  addContactFields: string[]
  onAddContactFieldsChange: (fields: string[]) => void
}

export function LogTable({
  fileName,
  records,
  fields,
  loading,
  saving,
  columnVisibility,
  onColumnVisibilityChange,
  onUpdateCell,
  onBulkSetColumns,
  onDeleteRows,
  onAddRecord,
  addContactFields,
  onAddContactFieldsChange
}: LogTableProps): React.JSX.Element {
  const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(new Set())
  const [selectedColumn, setSelectedColumn] = useState<string | null>(null)
  const [bulkValue, setBulkValue] = useState('')
  const [showAddPane, setShowAddPane] = useState(false)
  const [editingCell, setEditingCell] = useState<{ id: number; field: string } | null>(null)
  const [editValue, setEditValue] = useState('')
  const cancelingEditRef = useRef(false)

  const columns = useMemo(
    () =>
      helper.columns([
        helper.display({ id: SELECT_COLUMN_ID, header: '' }),
        ...fields.map((field) =>
          helper.accessor((row) => row.fields[field] ?? '', {
            id: field,
            header: field.toUpperCase(),
            cell: (info) => info.getValue(),
            sortFn: 'alphanumeric'
          })
        )
      ]),
    [fields]
  )

  const table = useTable({
    features,
    columns,
    data: records,
    getRowId: (row) => String(row.id),
    state: { columnVisibility },
    onColumnVisibilityChange: (updater) => {
      const next = typeof updater === 'function' ? updater(columnVisibility) : updater
      onColumnVisibilityChange(next)
    }
  })

  const validation = useMemo(() => validateRecords(records), [records])

  const scrollRef = useRef<HTMLDivElement>(null)
  const rows = table.getRowModel().rows

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    getItemKey: (index) => rows[index].id,
    overscan: 10
  })

  function toggleRowSelected(id: number): void {
    setSelectedRowIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleColumnSelected(field: string): void {
    // Only one column can be selected at a time, so picking a new one
    // replaces whichever was selected before (radio-button behavior).
    setSelectedColumn((prev) => (prev === field ? null : field))
  }

  function beginEdit(id: number, field: string, value: string): void {
    setEditingCell({ id, field })
    setEditValue(value)
  }

  function commitEdit(): void {
    if (cancelingEditRef.current) {
      cancelingEditRef.current = false
      return
    }
    if (!editingCell) return
    onUpdateCell(editingCell.id, editingCell.field, editValue)
    setEditingCell(null)
  }

  function cancelEdit(): void {
    cancelingEditRef.current = true
    setEditingCell(null)
  }

  function handleDelete(): void {
    const ids = [...selectedRowIds]
    if (ids.length === 0) return
    if (ids.length > 1) {
      const idSet = new Set(ids)
      const preview = records
        .filter((record) => idSet.has(record.id))
        .map((record) => `${record.fields.call ?? '?'}  ${record.fields.qso_date ?? ''}`)
        .join('\n')
      if (!window.confirm(`Delete ${ids.length} rows?\n\n${preview}\n\nThis cannot be undone.`)) {
        return
      }
    }
    onDeleteRows(ids)
    setSelectedRowIds(new Set())
  }

  function handleBulkApply(): void {
    if (!selectedColumn) return
    const rowIds = selectedRowIds.size > 0 ? [...selectedRowIds] : 'all'
    const affectedRows = rowIds === 'all' ? records.length : rowIds.length
    if (affectedRows > 1) {
      const scope =
        rowIds === 'all' ? `all ${records.length} rows` : `${rowIds.length} selected rows`
      if (
        !window.confirm(
          `Set ${selectedColumn.toUpperCase()} to "${bulkValue}" across ${scope}?\n\nThis cannot be undone.`
        )
      ) {
        return
      }
    }
    onBulkSetColumns([selectedColumn], rowIds, bulkValue)
    setSelectedColumn(null)
    setBulkValue('')
  }

  if (!fileName) {
    return (
      <div className="log-table">
        <div className="log-table__status">Select a file to view its QSOs</div>
      </div>
    )
  }

  return (
    <div className="log-table">
      {validation.totalCount > 0 && (
        <div className="log-table__validation-banner">
          {validation.totalCount} validation {validation.totalCount === 1 ? 'error' : 'errors'} (
          {validation.freqBandMismatchCount} frequency/band mismatch
          {validation.freqBandMismatchCount === 1 ? '' : 'es'}, {validation.timeOrderInvalidCount}{' '}
          time order issue{validation.timeOrderInvalidCount === 1 ? '' : 's'})
        </div>
      )}
      <div className="log-table__toolbar">
        <span className="log-table__filename">{fileName}</span>
        <span className="log-table__count">{records.length} QSOs</span>
        {saving && <span className="log-table__saving">Saving…</span>}
        <button type="button" onClick={() => setShowAddPane(true)}>
          Add Contact
        </button>
        {selectedRowIds.size > 0 && (
          <button type="button" onClick={handleDelete}>
            Delete {selectedRowIds.size}
          </button>
        )}
        <ColumnPicker
          fields={fields}
          visibility={columnVisibility}
          onToggle={(field) =>
            onColumnVisibilityChange({
              ...columnVisibility,
              [field]: columnVisibility[field] === false
            })
          }
        />
      </div>

      {selectedColumn && (
        <div className="log-table__bulk-bar">
          <span>Set {selectedColumn.toUpperCase()} to</span>
          <input
            className="log-table__bulk-input"
            value={bulkValue}
            onChange={(e) => setBulkValue(e.target.value)}
            placeholder="value"
            autoFocus
          />
          <span className="log-table__bulk-scope">
            across{' '}
            {selectedRowIds.size > 0
              ? `${selectedRowIds.size} selected rows`
              : `all ${records.length} rows`}
          </span>
          <button type="button" onClick={handleBulkApply}>
            Apply
          </button>
          <button type="button" onClick={() => setSelectedColumn(null)}>
            Cancel
          </button>
        </div>
      )}

      {loading ? (
        <div className="log-table__status">Loading…</div>
      ) : records.length === 0 ? (
        <div className="log-table__status">This file has no QSO records</div>
      ) : (
        <div className="log-table__scroll" ref={scrollRef}>
          <div className="log-table__header-row">
            {table.getHeaderGroups().map((group) =>
              group.headers.map((header) => {
                if (header.column.id === SELECT_COLUMN_ID) {
                  return (
                    <div
                      key={header.id}
                      className="log-table__header-cell"
                      style={{ width: columnWidth(SELECT_COLUMN_ID) }}
                    />
                  )
                }
                return (
                  <div
                    key={header.id}
                    className="log-table__header-cell"
                    style={{ width: columnWidth(header.column.id) }}
                  >
                    <input
                      type="checkbox"
                      className="log-table__header-checkbox"
                      checked={selectedColumn === header.column.id}
                      onChange={() => toggleColumnSelected(header.column.id)}
                    />
                    <button
                      type="button"
                      className="log-table__header-label"
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <table.FlexRender header={header} />
                      {header.column.getIsSorted() === 'asc' && ' ▲'}
                      {header.column.getIsSorted() === 'desc' && ' ▼'}
                    </button>
                  </div>
                )
              })
            )}
          </div>
          <div
            className="log-table__body"
            style={{ height: virtualizer.getTotalSize(), position: 'relative' }}
          >
            {virtualizer.getVirtualItems().map((item) => {
              const row = rows[item.index]
              return (
                <div
                  key={row.id}
                  data-index={item.index}
                  ref={virtualizer.measureElement}
                  className="log-table__row"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${item.start}px)`
                  }}
                >
                  {row.getVisibleCells().map((cell) => {
                    const field = cell.column.id

                    if (field === SELECT_COLUMN_ID) {
                      return (
                        <div
                          key={cell.id}
                          className="log-table__cell log-table__cell--select"
                          style={{ width: columnWidth(SELECT_COLUMN_ID) }}
                        >
                          <input
                            type="checkbox"
                            checked={selectedRowIds.has(row.original.id)}
                            onChange={() => toggleRowSelected(row.original.id)}
                          />
                        </div>
                      )
                    }

                    const isEditing =
                      editingCell?.id === row.original.id && editingCell.field === field
                    const hasError = cellHasError(
                      validation.issuesByRecordId.get(row.original.id),
                      field
                    )

                    return (
                      <div
                        key={cell.id}
                        className={
                          hasError ? 'log-table__cell log-table__cell--invalid' : 'log-table__cell'
                        }
                        style={{ width: columnWidth(field) }}
                        onClick={() => {
                          if (!isEditing) beginEdit(row.original.id, field, String(cell.getValue()))
                        }}
                      >
                        {isEditing ? (
                          <input
                            autoFocus
                            className="log-table__cell-input"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={commitEdit}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') e.currentTarget.blur()
                              else if (e.key === 'Escape') cancelEdit()
                            }}
                          />
                        ) : (
                          <table.FlexRender cell={cell} />
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {showAddPane && (
        <NewContactPane
          selectedFields={addContactFields}
          onFieldsChange={onAddContactFieldsChange}
          onAdd={(newFields) => {
            onAddRecord(newFields)
            setShowAddPane(false)
          }}
          onCancel={() => setShowAddPane(false)}
        />
      )}
    </div>
  )
}
