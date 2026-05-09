import { useRef, useState, useCallback } from 'react'
import { useDatasetStore } from '../../../../store/useDatasetStore'
import { useEditorStore } from '../../../../store/useEditorStore'
import { importFile, exportDatasetAsCsv } from '../../../../lib/importData'
import { DataTable } from './DataTable'
import { DataPreviewCanvas } from './DataPreviewCanvas'
import { useConfirm }       from '../../../../hooks/useConfirm'
import { ConfirmDialog }    from '../../../../components/ConfirmDialog/ConfirmDialog'
import styles from './DataTab.module.scss'

const MIN_PANEL = 280
const DEFAULT_PREVIEW_WIDTH = 420

export function DataTab() {
  const { dataset, setDataset, clearDataset, selectedRowIndex } = useDatasetStore()
  const { template } = useEditorStore()
  const { confirm, dialogProps } = useConfirm()

  const [importing,     setImporting]     = useState(false)
  const [importError,   setImportError]   = useState<string | null>(null)
  const [previewWidth,  setPreviewWidth]  = useState(DEFAULT_PREVIEW_WIDTH)
  const [isDragging,    setIsDragging]    = useState(false)
  const [fileDragOver,  setFileDragOver]  = useState(false)

  const fileInputRef  = useRef<HTMLInputElement>(null)
  const containerRef  = useRef<HTMLDivElement>(null)
  const dragStartX    = useRef(0)
  const dragStartW    = useRef(0)

  const handleFile = useCallback(async (file: File) => {
    setImporting(true)
    setImportError(null)
    try {
      const result = await importFile(file)
      setDataset(result)
    } catch (err: any) {
      setImportError(err.message ?? 'Failed to import file')
    } finally {
      setImporting(false)
    }
  }, [setDataset])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setFileDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  const handleClear = async () => {
    const ok = await confirm({
      title:        'Clear dataset?',
      message:      'All rows and column data will be removed.',
      confirmLabel: 'Clear',
      variant:      'danger',
    })
    if (ok) clearDataset()
  }

  // Resize divider drag
  const onDividerMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    dragStartX.current = e.clientX
    dragStartW.current = previewWidth

    const onMove = (e: MouseEvent) => {
      const delta = e.clientX - dragStartX.current
      const container = containerRef.current
      if (!container) return
      const totalW = container.clientWidth
      const next   = Math.min(
        totalW - MIN_PANEL,
        Math.max(MIN_PANEL, dragStartW.current + delta)
      )
      setPreviewWidth(next)
    }

    const onUp = () => {
      setIsDragging(false)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup',   onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup',   onUp)
  }

  const selectedRow = selectedRowIndex !== null
    ? dataset?.rows[selectedRowIndex] ?? null
    : null

  return (
    <div className={styles.tab}>

      {/* ── Toolbar ── */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <button
            className={styles.importBtn}
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
          >
            <span>{importing ? '⊙' : '↑'}</span>
            {importing ? 'Importing…' : 'Import data'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls,.json"
            style={{ display: 'none' }}
            onChange={handleFileInput}
          />
          <span className={styles.formatHint}>CSV, Excel, JSON</span>
        </div>

        {dataset && (
          <div className={styles.toolbarCenter}>
            <span className={styles.datasetName}>{dataset.fileName}</span>
            <span className={styles.datasetMeta}>
              {dataset.rows.length} rows · {dataset.columns.length} columns
            </span>
          </div>
        )}

        {dataset && (
          <div className={styles.toolbarRight}>
            <button
              className={styles.toolbarBtn}
              onClick={() => exportDatasetAsCsv(dataset)}
              title="Export as CSV"
            >
              ↓ Export CSV
            </button>
            <button
              className={`${styles.toolbarBtn} ${styles.toolbarBtnDanger}`}
              onClick={handleClear}
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* ── Error ── */}
      {importError && (
        <div className={styles.errorBar}>
          <span>⚠ {importError}</span>
          <button onClick={() => setImportError(null)}>✕</button>
        </div>
      )}

      {/* ── Main content ── */}
      {!dataset ? (
        // Empty state — drop zone
        <div
          className={`${styles.emptyState} ${fileDragOver ? styles.fileDragOver : ''}`}
          onDragOver={(e) => { e.preventDefault(); setFileDragOver(true)  }}
          onDragLeave={() => setFileDragOver(false)}
          onDrop={handleFileDrop}
        >
          <div className={styles.emptyContent}>
            <span className={styles.emptyIcon}>⊞</span>
            <p className={styles.emptyTitle}>Import your dataset</p>
            <p className={styles.emptyDesc}>
              Drop a file here or click to browse.
              Supported formats: CSV, Excel (.xlsx), JSON
            </p>
            <button
              className={styles.emptyImportBtn}
              onClick={() => fileInputRef.current?.click()}
            >
              Browse files
            </button>
          </div>
        </div>
      ) : (
        // Split layout — preview + table
        <div
          className={`${styles.splitLayout} ${isDragging ? styles.isDragging : ''}`}
          ref={containerRef}
        >
          {/* Preview panel */}
          <div
            className={styles.previewPanel}
            style={{ width: previewWidth, flexShrink: 0 }}
          >
            <DataPreviewCanvas
              template={template}
              dataRow={selectedRow}
              rowIndex={selectedRowIndex}
              totalRows={dataset.rows.length}
            />
          </div>

          {/* Resize divider */}
          <div
            className={styles.divider}
            onMouseDown={onDividerMouseDown}
          >
            <div className={styles.dividerHandle} />
          </div>

          {/* Table panel */}
          <div className={styles.tablePanel}>
            <DataTable />
          </div>
        </div>
      )}

      {dialogProps && <ConfirmDialog {...dialogProps} />}
    </div>
  )
}