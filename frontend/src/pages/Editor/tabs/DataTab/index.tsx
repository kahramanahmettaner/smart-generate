import { useRef, useState, useCallback, useEffect } from 'react'
import { useDatasetStore } from '../../../../store/useDatasetStore'
import { useEditorStore }  from '../../../../store/useEditorStore'
import { exportDatasetAsCsv } from '../../../../lib/importData'
import { DataTable }        from './DataTable'
import { DataPreviewCanvas } from './DataPreviewCanvas'
import { useConfirm }       from '../../../../hooks/useConfirm'
import { ConfirmDialog }    from '../../../../components/ConfirmDialog/ConfirmDialog'
import { fileNameWithoutExtension } from '../../../../lib/imageUtils'
import styles from './DataTab.module.scss'

const MIN_PANEL = 280
const DEFAULT_PREVIEW_WIDTH = 420

export function DataTab() {
  const {
    dataset, datasetList,
    fetchDatasetList, uploadDataset, deleteDataset,
    clearDataset, selectedRowIndex,
  } = useDatasetStore()
  const { template }         = useEditorStore()
  const { confirm, dialogProps } = useConfirm()

  const [importing,    setImporting]    = useState(false)
  const [importError,  setImportError]  = useState<string | null>(null)
  const [previewWidth, setPreviewWidth] = useState(DEFAULT_PREVIEW_WIDTH)
  const [isDragging,   setIsDragging]   = useState(false)
  const [fileDragOver, setFileDragOver] = useState(false)
  const [showList,     setShowList]     = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const dragStartX   = useRef(0)
  const dragStartW   = useRef(0)

  // Load dataset list on mount
  useEffect(() => {
    fetchDatasetList()
  }, [fetchDatasetList])

  const handleFile = useCallback(async (file: File) => {
    setImporting(true)
    setImportError(null)
    try {
      const name = fileNameWithoutExtension(file.name)
      await uploadDataset(file, name)
    } catch (err: any) {
      setImportError(err.message ?? 'Failed to import file')
    } finally {
      setImporting(false)
    }
  }, [uploadDataset])

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
      message:      'The dataset will be removed from view. It stays saved in the project.',
      confirmLabel: 'Clear',
      variant:      'danger',
    })
    if (ok) clearDataset()
  }

  const handleDeleteDataset = async () => {
    if (!dataset) return
    const ok = await confirm({
      title:        `Delete "${dataset.name}"?`,
      message:      'This dataset will be permanently deleted from the project.',
      confirmLabel: 'Delete',
      variant:      'danger',
    })
    if (ok) await deleteDataset(dataset.id)
  }

  // Resize divider drag
  const onDividerMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    dragStartX.current = e.clientX
    dragStartW.current = previewWidth

    const onMove = (e: MouseEvent) => {
      const delta     = e.clientX - dragStartX.current
      const container = containerRef.current
      if (!container) return
      const totalW = container.clientWidth
      const next   = Math.min(totalW - MIN_PANEL, Math.max(MIN_PANEL, dragStartW.current + delta))
      setPreviewWidth(next)
    }

    const onUp = () => {
      setIsDragging(false)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
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

          {/* Dataset selector — show saved datasets */}
          {datasetList.length > 0 && (
            <div style={{ position: 'relative' }}>
              <button
                className={styles.toolbarBtn}
                onClick={() => setShowList((v) => !v)}
              >
                Saved datasets ({datasetList.length})
              </button>
              {showList && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, zIndex: 100,
                  background: 'var(--color-bg-primary)',
                  border: '1px solid var(--color-border-default)',
                  borderRadius: 8, padding: '4px 0', minWidth: 220,
                  boxShadow: 'var(--shadow-md)', marginTop: 4,
                }}>
                  {datasetList.map((d) => (
                    <button
                      key={d.id}
                      onClick={async () => {
                        const { loadDataset } = useDatasetStore.getState()
                        await loadDataset(d.id)
                        setShowList(false)
                      }}
                      style={{
                        display: 'block', width: '100%', textAlign: 'left',
                        padding: '6px 12px', fontSize: 13,
                        color: 'var(--color-text-primary)',
                        background: dataset?.id === d.id ? 'var(--color-accent-subtle)' : 'transparent',
                      }}
                    >
                      {d.name}
                      <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginLeft: 8 }}>
                        {d.rowCount} rows
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {dataset && (
          <div className={styles.toolbarCenter}>
            <span className={styles.datasetName}>{dataset.name}</span>
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
              className={styles.toolbarBtn}
              onClick={handleClear}
            >
              Close
            </button>
            <button
              className={`${styles.toolbarBtn} ${styles.toolbarBtnDanger}`}
              onClick={handleDeleteDataset}
            >
              Delete
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
        <div
          className={`${styles.emptyState} ${fileDragOver ? styles.fileDragOver : ''}`}
          onDragOver={(e) => { e.preventDefault(); setFileDragOver(true) }}
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
        <div
          className={`${styles.splitLayout} ${isDragging ? styles.isDragging : ''}`}
          ref={containerRef}
        >
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

          <div className={styles.divider} onMouseDown={onDividerMouseDown}>
            <div className={styles.dividerHandle} />
          </div>

          <div className={styles.tablePanel}>
            <DataTable />
          </div>
        </div>
      )}

      {dialogProps && <ConfirmDialog {...dialogProps} />}
    </div>
  )
}
