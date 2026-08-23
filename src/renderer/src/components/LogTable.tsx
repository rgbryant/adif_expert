import { useMemo, useRef } from 'react'
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
import { ColumnPicker } from './ColumnPicker'

type QsoRow = Record<string, string>

const features = tableFeatures({
  columnVisibilityFeature,
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric }
})

const helper = createColumnHelper<typeof features, QsoRow>()

const ROW_HEIGHT = 30
const WIDE_FIELDS = new Set(['comment', 'notes', 'name', 'qth', 'address', 'email'])

function columnWidth(field: string): number {
  return WIDE_FIELDS.has(field) ? 220 : 130
}

interface LogTableProps {
  fileName: string | null
  records: QsoRow[]
  fields: string[]
  loading: boolean
  columnVisibility: Record<string, boolean>
  onColumnVisibilityChange: (visibility: Record<string, boolean>) => void
}

export function LogTable({
  fileName,
  records,
  fields,
  loading,
  columnVisibility,
  onColumnVisibilityChange
}: LogTableProps): React.JSX.Element {
  const columns = useMemo(
    () =>
      helper.columns(
        fields.map((field) =>
          helper.accessor((row) => row[field] ?? '', {
            id: field,
            header: field.toUpperCase(),
            cell: (info) => info.getValue(),
            sortFn: 'alphanumeric'
          })
        )
      ),
    [fields]
  )

  const table = useTable({
    features,
    columns,
    data: records,
    state: { columnVisibility },
    onColumnVisibilityChange: (updater) => {
      const next = typeof updater === 'function' ? updater(columnVisibility) : updater
      onColumnVisibilityChange(next)
    }
  })

  const scrollRef = useRef<HTMLDivElement>(null)
  const rows = table.getRowModel().rows

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    getItemKey: (index) => rows[index].id,
    overscan: 10
  })

  if (!fileName) {
    return (
      <div className="log-table">
        <div className="log-table__status">Select a file to view its QSOs</div>
      </div>
    )
  }

  return (
    <div className="log-table">
      <div className="log-table__toolbar">
        <span className="log-table__filename">{fileName}</span>
        <span className="log-table__count">{records.length} QSOs</span>
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

      {loading ? (
        <div className="log-table__status">Loading…</div>
      ) : records.length === 0 ? (
        <div className="log-table__status">This file has no QSO records</div>
      ) : (
        <div className="log-table__scroll" ref={scrollRef}>
          <div className="log-table__header-row">
            {table.getHeaderGroups().map((group) =>
              group.headers.map((header) => (
                <button
                  key={header.id}
                  type="button"
                  className="log-table__header-cell"
                  style={{ width: columnWidth(header.column.id) }}
                  onClick={header.column.getToggleSortingHandler()}
                >
                  <table.FlexRender header={header} />
                  {header.column.getIsSorted() === 'asc' && ' ▲'}
                  {header.column.getIsSorted() === 'desc' && ' ▼'}
                </button>
              ))
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
                  {row.getVisibleCells().map((cell) => (
                    <div
                      key={cell.id}
                      className="log-table__cell"
                      style={{ width: columnWidth(cell.column.id) }}
                    >
                      <table.FlexRender cell={cell} />
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
