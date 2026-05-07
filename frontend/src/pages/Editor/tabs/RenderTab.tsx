import { useState, useCallback } from 'react'
import { useEditorStore }   from '../../../store/useEditorStore'
import { useDatasetStore }  from '../../../store/useDatasetStore'
import { useAssetStore }    from '../../../store/useAssetStore'
import { runRenderJob }     from '../../../lib/renderEngine'
import type { RenderConfig, RenderProgress } from '../../../types/render'
import styles from './RenderTab.module.scss'

const DEFAULT_CONFIG: RenderConfig = {
  format:          'png',
  output:          'zip',
  quality:         0.92,
  pixelRatio:      2,
  fileNameColumn:  '',
  fileNamePrefix:  'image',
}

export function RenderTab() {
  const { template }        = useEditorStore()
  const { dataset }         = useDatasetStore()
  const { assets }          = useAssetStore()
  const [config, setConfig] = useState<RenderConfig>(DEFAULT_CONFIG)
  const [progress, setProgress] = useState<RenderProgress>({
    status: 'idle', current: 0, total: 0, message: ''
  })

  const isRendering = progress.status === 'rendering' || progress.status === 'packaging'
  const isDone      = progress.status === 'done'
  const isError     = progress.status === 'error'

  const set = <K extends keyof RenderConfig>(key: K, value: RenderConfig[K]) =>
    setConfig((c) => ({ ...c, [key]: value }))

  const handleRender = useCallback(async () => {
    if (!dataset) return
    setProgress({ status: 'rendering', current: 0, total: dataset.rows.length, message: 'Starting…' })
    try {
      await runRenderJob(template, dataset.rows, assets, config, setProgress)
    } catch (err: any) {
      setProgress((p) => ({
        ...p,
        status:  'error',
        message: 'Render failed',
        error:   err?.message ?? 'Unknown error',
      }))
    }
  }, [template, dataset, assets, config])

  const columns = dataset?.columns ?? []

  return (
    <div className={styles.tab}>
      <div className={styles.layout}>

        {/* ── Config panel ── */}
        <div className={styles.configPanel}>
          <p className={styles.panelTitle}>Render settings</p>

          {/* Output format */}
          <div className={styles.fieldGroup}>
            <p className={styles.fieldLabel}>Image format</p>
            <div className={styles.segmented}>
              {(['png', 'jpg'] as const).map((f) => (
                <button
                  key={f}
                  className={`${styles.segBtn} ${config.format === f ? styles.segBtnActive : ''}`}
                  onClick={() => set('format', f)}
                >
                  {f.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* JPG quality */}
          {config.format === 'jpg' && (
            <div className={styles.fieldGroup}>
              <p className={styles.fieldLabel}>
                Quality — {Math.round(config.quality * 100)}%
              </p>
              <input
                type="range"
                className={styles.slider}
                min={0.1} max={1} step={0.01}
                value={config.quality}
                onChange={(e) => set('quality', parseFloat(e.target.value))}
              />
              <div className={styles.sliderLabels}>
                <span>Smaller file</span>
                <span>Best quality</span>
              </div>
            </div>
          )}

          {/* Pixel ratio */}
          <div className={styles.fieldGroup}>
            <p className={styles.fieldLabel}>Resolution scale</p>
            <div className={styles.segmented}>
              {([1, 2, 3] as const).map((r) => (
                <button
                  key={r}
                  className={`${styles.segBtn} ${config.pixelRatio === r ? styles.segBtnActive : ''}`}
                  onClick={() => set('pixelRatio', r)}
                >
                  {r}×
                </button>
              ))}
            </div>
            <p className={styles.fieldHint}>
              {config.pixelRatio}× → {template.canvas.width * config.pixelRatio} × {template.canvas.height * config.pixelRatio}px
            </p>
          </div>

          {/* Output type */}
          <div className={styles.fieldGroup}>
            <p className={styles.fieldLabel}>Package as</p>
            <div className={styles.segmented}>
              <button
                className={`${styles.segBtn} ${config.output === 'zip' ? styles.segBtnActive : ''}`}
                onClick={() => set('output', 'zip')}
              >
                ZIP archive
              </button>
              <button
                className={`${styles.segBtn} ${config.output === 'pdf' ? styles.segBtnActive : ''}`}
                onClick={() => set('output', 'pdf')}
              >
                PDF file
              </button>
            </div>
          </div>

          {/* File naming */}
          <div className={styles.fieldGroup}>
            <p className={styles.fieldLabel}>File naming</p>
            <div className={styles.namingRow}>
              <select
                className={styles.select}
                value={config.fileNameColumn}
                onChange={(e) => set('fileNameColumn', e.target.value)}
              >
                <option value="">Use prefix + number</option>
                {columns.map((col) => (
                  <option key={col.key} value={col.key}>
                    Column: {col.label}
                  </option>
                ))}
              </select>
            </div>
            {!config.fileNameColumn && (
              <div className={styles.prefixRow}>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="image"
                  value={config.fileNamePrefix}
                  onChange={(e) => set('fileNamePrefix', e.target.value || 'image')}
                />
                <span className={styles.prefixPreview}>
                  → {config.fileNamePrefix}_0001.{config.format}
                </span>
              </div>
            )}
            {config.fileNameColumn && (
              <p className={styles.fieldHint}>
                Files named from <code>{config.fileNameColumn}</code> column
              </p>
            )}
          </div>

          {/* Dataset summary */}
          <div className={styles.summaryBox}>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Dataset</span>
              <span className={`${styles.summaryValue} ${!dataset ? styles.summaryMissing : ''}`}>
                {dataset
                  ? `${dataset.rows.length} rows`
                  : 'No dataset imported'}
              </span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Output</span>
              <span className={styles.summaryValue}>
                {dataset ? dataset.rows.length : 0} {config.format.toUpperCase()} files
                → {config.output.toUpperCase()}
              </span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Canvas</span>
              <span className={styles.summaryValue}>
                {template.canvas.width * config.pixelRatio} × {template.canvas.height * config.pixelRatio}px
              </span>
            </div>
          </div>
        </div>

        {/* ── Render panel ── */}
        <div className={styles.renderPanel}>
          <p className={styles.panelTitle}>Render</p>

          {/* Progress */}
          {progress.status !== 'idle' && (
            <div className={styles.progressBlock}>
              <div className={styles.progressHeader}>
                <span className={styles.progressMessage}>{progress.message}</span>
                {isRendering && (
                  <span className={styles.progressCount}>
                    {progress.current} / {progress.total}
                  </span>
                )}
              </div>

              <div className={styles.progressBarWrap}>
                <div
                  className={`${styles.progressBar} ${isDone ? styles.progressBarDone : ''} ${isError ? styles.progressBarError : ''}`}
                  style={{
                    width: progress.total > 0
                      ? `${(progress.current / progress.total) * 100}%`
                      : '0%'
                  }}
                />
              </div>

              {isDone && (
                <div className={styles.doneMsg}>
                  ✓ Done — check your downloads folder
                </div>
              )}

              {isError && (
                <div className={styles.errorMsg}>
                  ⚠ {progress.error}
                </div>
              )}
            </div>
          )}

          {/* Start button */}
          <button
            className={styles.renderBtn}
            onClick={handleRender}
            disabled={isRendering || !dataset}
          >
            {isRendering
              ? `Rendering… ${progress.current}/${progress.total}`
              : `Render ${dataset?.rows.length ?? 0} images`}
          </button>

          {!dataset && (
            <p className={styles.noDatasetHint}>
              Import a dataset in the Data tab first
            </p>
          )}

          {/* Per-image log */}
          {progress.status !== 'idle' && (
            <div className={styles.logBlock}>
              {Array.from({ length: progress.current }).map((_, i) => (
                <div key={i} className={styles.logRow}>
                  <span className={styles.logDone}>✓</span>
                  <span className={styles.logName}>
                    {buildPreviewName(dataset?.rows[i] ?? {}, config, i)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function buildPreviewName(
  row:    Record<string, string>,
  config: RenderConfig,
  index:  number
): string {
  const ext  = config.format
  const base = config.fileNameColumn && row[config.fileNameColumn]
    ? row[config.fileNameColumn].replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 40)
    : `${config.fileNamePrefix}_${String(index + 1).padStart(4, '0')}`
  return `${base}.${ext}`
}