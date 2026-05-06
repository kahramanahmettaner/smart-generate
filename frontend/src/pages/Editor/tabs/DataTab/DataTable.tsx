import { useState, useRef } from 'react'
import { useDatasetStore } from '../../../../store/useDatasetStore'
import { useConfirm }      from '../../../../hooks/useConfirm'
import { ConfirmDialog }   from '../../../../components/ConfirmDialog/ConfirmDialog'
import styles from './DataTable.module.scss'

const PAGE_SIZE = 50

export function DataTable() {
  const {
    dataset, selectedRowIndex,
    selectRow, updateCell, addRow, deleteRow
  } = useDatasetStore()

  const { confirm, dialogProps } = useConfirm()
  const [editingCell, setEditingCell] = useState<{ row: number; col: string } | null>(null)
  const [editValue,   setEditValue]   = useState('')
  const [page,        setPage]        = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  if (!dataset) return null

  const { columns, rows } = dataset
  const totalPages = Math.ceil(rows.length / PAGE_SIZE)
  const pageRows   = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const pageOffset = page * PAGE_SIZE

  const startEdit = (rowIndex: number, col: string, value: string) => {
    setEditingCell({ row: rowIndex, col })
    setEditValue(value)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const commitEdit = () => {
    if (!editingCell) return
    updateCell(editingCell.row, editingCell.col, editValue)
    setEditingCell(null)
  }

  const handleCellKeyDown = (e: React.KeyboardEvent, rowIndex: number, colIndex: number) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      commitEdit()
      // Move to next cell
      const nextCol = columns[colIndex + 1]
      if (nextCol) {
        startEdit(rowIndex, nextCol.key, rows[rowIndex][nextCol.key] ?? '')
      } else if (rowIndex + 1 < rows.length) {
        startEdit(rowIndex + 1, columns[0].key, rows[rowIndex + 1][columns[0].key] ?? '')
      }
    }
    if (e.key === 'Escape') {
      setEditingCell(null)
    }
    e.stopPropagation()
  }

  const handleDeleteRow = async (index: number) => {
    const ok = await confirm({
      title:        'Delete row?',
      message:      `Row ${index + 1} will be permanently removed.`,
      confirmLabel: 'Delete',
      variant:      'danger',
    })
    if (ok) deleteRow(index)
  }

  return (
    <>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.thIndex}>#</th>
              {columns.map((col) => (
                <th key={col.key} className={styles.th}>
                  <div className={styles.thContent}>
                    <span className={styles.thLabel}>{col.label}</span>
                    <span className={styles.thKey}>{col.key}</span>
                  </div>
                </th>
              ))}
              <th className={styles.thActions} />
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, pageRowIdx) => {
              const absIdx   = pageOffset + pageRowIdx
              const isSelected = absIdx === selectedRowIndex

              return (
                <tr
                  key={absIdx}
                  className={`${styles.tr} ${isSelected ? styles.trSelected : ''}`}
                  onClick={() => selectRow(isSelected ? null : absIdx)}
                >
                  {/* Row number */}
                  <td className={styles.tdIndex}>
                    <span className={styles.rowNum}>{absIdx + 1}</span>
                    {isSelected && <span className={styles.selectedDot} />}
                  </td>

                  {/* Data cells */}
                  {columns.map((col, colIdx) => {
                    const isEditing =
                      editingCell?.row === absIdx &&
                      editingCell?.col === col.key

                    return (
                      <td
                        key={col.key}
                        className={`${styles.td} ${isEditing ? styles.tdEditing : ''}`}
                        onDoubleClick={(e) => {
                          e.stopPropagation()
                          startEdit(absIdx, col.key, row[col.key] ?? '')
                        }}
                      >
                        {isEditing ? (
                          <input
                            ref={inputRef}
                            className={styles.cellInput}
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={commitEdit}
                            onKeyDown={(e) => handleCellKeyDown(e, absIdx, colIdx)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <span className={styles.cellValue}>
                            {row[col.key] ?? ''}
                          </span>
                        )}
                      </td>
                    )
                  })}

                  {/* Row actions */}
                  <td className={styles.tdActions}>
                    <button
                      className={styles.deleteRowBtn}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteRow(absIdx)
                      }}
                      title="Delete row"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className={styles.footer}>
        <div className={styles.footerLeft}>
          <button
            className={styles.addRowBtn}
            onClick={addRow}
          >
            + Add row
          </button>
          {selectedRowIndex !== null && (
            <span className={styles.selectedInfo}>
              Row {selectedRowIndex + 1} selected
            </span>
          )}
        </div>

        {totalPages > 1 && (
          <div className={styles.pagination}>
            <button
              className={styles.pageBtn}
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              ←
            </button>
            <span className={styles.pageInfo}>
              {page + 1} / {totalPages}
            </span>
            <button
              className={styles.pageBtn}
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              →
            </button>
          </div>
        )}

        <div className={styles.footerRight}>
          <span className={styles.rowCount}>
            {dataset.rows.length} rows total
          </span>
        </div>
      </div>

      {dialogProps && <ConfirmDialog {...dialogProps} />}
    </>
  )
}