import { useRef, useState, useCallback, useEffect } from 'react'
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

const MIN_ZOOM = 0.05
const MAX_ZOOM = 4
const ZOOM_SENSITIVITY = 0.001
const ZOOM_STEP = 0.1

type Offset = { x: number; y: number }

export function EditorCanvas({
  template,
  selectedId,
  onSelectElement,
  onUpdateElement,
  stageRef,
}: Props) {
  const [zoom, setZoom] = useState(0.5)
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)

  const workspaceRef  = useRef<HTMLDivElement>(null)
  const isPanningRef  = useRef(false)  // ref for use inside event listeners
  const panStartRef   = useRef<{ mouseX: number; mouseY: number; offsetX: number; offsetY: number } | null>(null)
  const spaceHeldRef  = useRef(false)

  // Keep isPanningRef in sync with state
  useEffect(() => {
    isPanningRef.current = isPanning
  }, [isPanning])

  // Space key tracking — sets pan mode cursor
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return
      const tag = (document.activeElement?.tagName ?? '').toLowerCase()
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return
      e.preventDefault()
      spaceHeldRef.current = true
      workspaceRef.current?.classList.add(styles.panMode)
    }

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return
      spaceHeldRef.current = false
      workspaceRef.current?.classList.remove(styles.panMode)
      if (isPanningRef.current) {
        setIsPanning(false)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  const startPan = useCallback((mouseX: number, mouseY: number) => {
    setIsPanning(true)
    panStartRef.current = {
      mouseX,
      mouseY,
      offsetX: offset.x,
      offsetY: offset.y,
    }
  }, [offset])

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    const isMiddle = e.button === 1
    const isSpaceLeft = e.button === 0 && spaceHeldRef.current

    if (!isMiddle && !isSpaceLeft) return
    e.preventDefault()
    startPan(e.clientX, e.clientY)
  }, [startPan])

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isPanningRef.current || !panStartRef.current) return
      const dx = e.clientX - panStartRef.current.mouseX
      const dy = e.clientY - panStartRef.current.mouseY
      setOffset({
        x: panStartRef.current.offsetX + dx,
        y: panStartRef.current.offsetY + dy,
      })
    }

    const onMouseUp = (e: MouseEvent) => {
      if (!isPanningRef.current) return
      setIsPanning(false)
      panStartRef.current = null
      // If space no longer held, remove pan cursor
      if (!spaceHeldRef.current) {
        workspaceRef.current?.classList.remove(styles.panMode)
      }
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  // Zoom toward cursor position
  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()

    // Plain scroll (no modifier) = pan vertically
    if (!e.ctrlKey && !e.metaKey) {
      setOffset((o) => ({
        x: o.x - e.deltaX,
        y: o.y - e.deltaY,
      }))
      return
    }

    // Ctrl/Cmd + scroll = zoom toward cursor
    const workspace = workspaceRef.current
    if (!workspace) return

    const rect = workspace.getBoundingClientRect()

    // Mouse position relative to workspace center
    const mouseX = e.clientX - rect.left - rect.width  / 2
    const mouseY = e.clientY - rect.top  - rect.height / 2

    setZoom((prevZoom) => {
      const delta = -e.deltaY * ZOOM_SENSITIVITY
      const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prevZoom + delta * prevZoom))
      const zoomRatio = nextZoom / prevZoom

      // Adjust offset so zoom centers on cursor
      setOffset((o) => ({
        x: mouseX - (mouseX - o.x) * zoomRatio,
        y: mouseY - (mouseY - o.y) * zoomRatio,
      }))

      return nextZoom
    })
  }, [])

  const zoomIn = () => {
    setZoom((z) => Math.min(MAX_ZOOM, parseFloat((z + ZOOM_STEP).toFixed(2))))
  }

  const zoomOut = () => {
    setZoom((z) => Math.max(MIN_ZOOM, parseFloat((z - ZOOM_STEP).toFixed(2))))
  }

  const zoomFit = () => {
    const workspace = workspaceRef.current
    if (!workspace) return
    const { width, height } = workspace.getBoundingClientRect()
    const fitZoom = Math.min(
      (width  - 80) / template.canvas.width,
      (height - 80) / template.canvas.height,
    )
    setZoom(parseFloat(fitZoom.toFixed(3)))
    setOffset({ x: 0, y: 0 })
  }

  const zoomReset = () => {
    setZoom(1)
    setOffset({ x: 0, y: 0 })
  }

  return (
    <div
      className={`${styles.workspace} ${isPanning ? styles.panning : ''}`}
      ref={workspaceRef}
      onMouseDown={onMouseDown}
      onWheel={onWheel}
    >
      {/* Canvas positioned via transform — zoom + pan */}
      <div
        className={styles.canvasFrame}
        style={{
          width: template.canvas.width,
          height: template.canvas.height,
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
          transformOrigin: 'center center',
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
        <button className={styles.zoomBtn} onClick={zoomOut} title="Zoom out">−</button>
        <button className={styles.zoomValue} onClick={zoomReset} title="Reset to 100%">
          {Math.round(zoom * 100)}%
        </button>
        <button className={styles.zoomBtn} onClick={zoomIn} title="Zoom in">+</button>
        <div className={styles.zoomDivider} />
        <button className={styles.zoomBtn} onClick={zoomFit} title="Fit to screen">
          Fit
        </button>
      </div>

      {/* Pan hint — shown briefly when space is pressed */}
      <div className={`${styles.panHint} ${isPanning ? styles.panHintVisible : ''}`}>
        Panning
      </div>
    </div>
  )
}