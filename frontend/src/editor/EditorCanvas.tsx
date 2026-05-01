import { useRef, useState, useCallback } from 'react'
import type Konva from 'konva'
import { TemplateRenderer } from '../renderer/TemplateRenderer'
import type { Template, Element } from '../types/template'
import styles from './EditorCanvas.module.scss'

type Props = {
  template: Template
  selectedId: string | null
  onSelectElement: (id: string | null) => void
  onUpdateElement: (id: string, changes: Partial<Element>) => void
  stageRef: React.RefObject<Konva.Stage>
}

const MIN_ZOOM = 0.1
const MAX_ZOOM = 4
const ZOOM_STEP = 0.001

export function EditorCanvas({
  template,
  selectedId,
  onSelectElement,
  onUpdateElement,
  stageRef,
}: Props) {
  const [zoom, setZoom] = useState(0.5)
  const workspaceRef = useRef<HTMLDivElement>(null)

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!e.ctrlKey && !e.metaKey) return
    e.preventDefault()
    setZoom((z) => {
      const next = z - e.deltaY * ZOOM_STEP
      return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next))
    })
  }, [])

  const zoomIn  = () => setZoom((z) => Math.min(MAX_ZOOM, parseFloat((z + 0.1).toFixed(2))))
  const zoomOut = () => setZoom((z) => Math.max(MIN_ZOOM, parseFloat((z - 0.1).toFixed(2))))
  const zoomFit = () => setZoom(0.5)

  return (
    <div className={styles.workspace} ref={workspaceRef} onWheel={handleWheel}>
      <div
        className={styles.canvasFrame}
        style={{
          transform: `scale(${zoom})`,
          transformOrigin: 'center center',
          width: template.canvas.width,
          height: template.canvas.height,
        }}
      >
        <TemplateRenderer
          template={template}
          selectedId={selectedId}
          onSelectElement={onSelectElement}
          onUpdateElement={onUpdateElement}
          stageRef={stageRef}
        />
      </div>

      {/* Zoom controls */}
      <div className={styles.zoomWidget}>
        <button className={styles.zoomBtn} onClick={zoomOut}>−</button>
        <span className={styles.zoomValue}>{Math.round(zoom * 100)}%</span>
        <button className={styles.zoomBtn} onClick={zoomIn}>+</button>
        <div className={styles.zoomDivider} />
        <button className={styles.zoomBtn} onClick={zoomFit}>Fit</button>
      </div>
    </div>
  )
}