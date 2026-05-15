import { useRef, useEffect, useState } from 'react'
import type Konva from 'konva'
import { TemplateRenderer } from '../../../../renderer/TemplateRenderer'
import type { Template } from '../../../../types/template'
import type { DataRow } from '../../../../types/dataset'
import styles from './DataPreviewCanvas.module.scss'

type Props = {
  template:  Template
  dataRow:   DataRow | null
  rowIndex:  number | null
  totalRows: number
}

export function DataPreviewCanvas({ template, dataRow, rowIndex, totalRows }: Props) {
  const stageRef     = useRef<Konva.Stage>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      const { width, height } = entry.contentRect
      const scaleX = (width  - 32) / template.canvas.width
      const scaleY = (height - 32) / template.canvas.height
      setScale(Math.min(scaleX, scaleY, 1))
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [template.canvas.width, template.canvas.height])

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>Preview</span>
        {rowIndex !== null ? (
          <span className={styles.rowBadge}>Row {rowIndex + 1} of {totalRows}</span>
        ) : (
          <span className={styles.rowBadgeEmpty}>No row selected</span>
        )}
      </div>

      <div className={styles.canvasWrap} ref={containerRef}>
        <div
          className={styles.canvasScaler}
          style={{
            width:           template.canvas.width,
            height:          template.canvas.height,
            transform:       `scale(${scale})`,
            transformOrigin: 'center center',
          }}
        >
          <TemplateRenderer
            template={template}
            selectedIds={[]}
            onSelectElement={() => {}}
            onUpdateElement={() => {}}
            onUpdateElements={() => {}}
            stageRef={stageRef}
            dataRow={dataRow ?? undefined}
            readOnly
          />
        </div>
      </div>

      {rowIndex === null && (
        <div className={styles.hint}>Select a row in the table to preview it</div>
      )}
    </div>
  )
}
