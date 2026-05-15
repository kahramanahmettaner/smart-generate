import { useRef, useState, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react'
import type Konva from 'konva'
import { TemplateRenderer } from '../renderer/TemplateRenderer'
import type { Template, Element } from '../types/template'
import type { EditorCanvasHandle } from './EditorCanvasHandle'
import styles from './EditorCanvas.module.scss'

type Props = {
  template:         Template
  selectedIds:      string[]
  onSelectElement:  (id: string | null, additive: boolean) => void
  onUpdateElement:  (id: string, changes: Partial<Element>) => void
  onUpdateElements: (ids: string[], changes: Partial<Element>) => void
  stageRef:         React.RefObject<Konva.Stage>
  dataRow?:         Record<string, string>
  readOnly?:        boolean
}

const MIN_ZOOM = 0.05
const MAX_ZOOM = 4
const ZOOM_SENSITIVITY = 0.001
const ZOOM_STEP = 0.1

type Offset = { x: number; y: number }

export const EditorCanvas = forwardRef<EditorCanvasHandle, Props>(function EditorCanvas(
  { template, selectedIds, onSelectElement, onUpdateElement, onUpdateElements, stageRef, dataRow, readOnly },
  ref
) {
  const [zoom,      setZoom]      = useState(0.5)
  const [offset,    setOffset]    = useState<Offset>({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)

  const workspaceRef  = useRef<HTMLDivElement>(null)
  const isPanningRef  = useRef(false)
  const panStartRef   = useRef<{ mouseX: number; mouseY: number; offsetX: number; offsetY: number } | null>(null)
  const spaceHeldRef  = useRef(false)
  const zoomRef       = useRef(zoom)
  const offsetRef     = useRef(offset)

  useEffect(() => { zoomRef.current   = zoom   }, [zoom])
  useEffect(() => { offsetRef.current = offset }, [offset])
  useEffect(() => { isPanningRef.current = isPanning }, [isPanning])

  // ── Zoom helpers ──────────────────────────────────────────────────────────

  const zoomIn    = useCallback(() => setZoom((z) => parseFloat(Math.min(MAX_ZOOM, z + ZOOM_STEP).toFixed(2))), [])
  const zoomOut   = useCallback(() => setZoom((z) => parseFloat(Math.max(MIN_ZOOM, z - ZOOM_STEP).toFixed(2))), [])
  const zoomReset = useCallback(() => { setZoom(1); setOffset({ x: 0, y: 0 }) }, [])

  const zoomFit = useCallback(() => {
    const workspace = workspaceRef.current
    if (!workspace) return
    const { width, height } = workspace.getBoundingClientRect()
    const fitZoom = Math.min((width - 80) / template.canvas.width, (height - 80) / template.canvas.height)
    setZoom(parseFloat(fitZoom.toFixed(3)))
    setOffset({ x: 0, y: 0 })
  }, [template.canvas.width, template.canvas.height])

  useImperativeHandle(ref, () => ({ zoomIn, zoomOut, zoomFit, zoomReset }), [zoomIn, zoomOut, zoomFit, zoomReset])

  // ── Space key pan mode ────────────────────────────────────────────────────

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
      if (isPanningRef.current) setIsPanning(false)
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup',   onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup',   onKeyUp)
    }
  }, [])

  // ── Pan ───────────────────────────────────────────────────────────────────

  const startPan = useCallback((mouseX: number, mouseY: number) => {
    setIsPanning(true)
    panStartRef.current = { mouseX, mouseY, offsetX: offsetRef.current.x, offsetY: offsetRef.current.y }
  }, [])

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    const isMiddle    = e.button === 1
    const isSpaceLeft = e.button === 0 && spaceHeldRef.current
    if (!isMiddle && !isSpaceLeft) return
    e.preventDefault()
    startPan(e.clientX, e.clientY)
  }, [startPan])

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isPanningRef.current || !panStartRef.current) return
      setOffset({
        x: panStartRef.current.offsetX + (e.clientX - panStartRef.current.mouseX),
        y: panStartRef.current.offsetY + (e.clientY - panStartRef.current.mouseY),
      })
    }
    const onMouseUp = () => {
      if (!isPanningRef.current) return
      setIsPanning(false)
      panStartRef.current = null
      if (!spaceHeldRef.current) workspaceRef.current?.classList.remove(styles.panMode)
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup',   onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup',   onMouseUp)
    }
  }, [])

  // ── Wheel zoom / scroll ───────────────────────────────────────────────────

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    if (!e.ctrlKey && !e.metaKey) {
      setOffset((o) => ({ x: o.x - e.deltaX, y: o.y - e.deltaY }))
      return
    }
    const workspace = workspaceRef.current
    if (!workspace) return
    const rect   = workspace.getBoundingClientRect()
    const mouseX = e.clientX - rect.left  - rect.width  / 2
    const mouseY = e.clientY - rect.top   - rect.height / 2
    setZoom((prevZoom) => {
      const delta    = -e.deltaY * ZOOM_SENSITIVITY
      const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prevZoom + delta * prevZoom))
      const ratio    = nextZoom / prevZoom
      setOffset((o) => ({ x: mouseX - (mouseX - o.x) * ratio, y: mouseY - (mouseY - o.y) * ratio }))
      return nextZoom
    })
  }, [])

  return (
    <div
      className={`${styles.workspace} ${isPanning ? styles.panning : ''}`}
      ref={workspaceRef}
      onMouseDown={readOnly ? undefined : onMouseDown}
      onWheel={onWheel}
    >
      <div
        className={styles.canvasFrame}
        style={{
          width:           template.canvas.width,
          height:          template.canvas.height,
          transform:       `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
          transformOrigin: 'center center',
        }}
      >
        <TemplateRenderer
          template={template}
          selectedIds={readOnly ? [] : selectedIds}
          onSelectElement={readOnly ? () => {} : onSelectElement}
          onUpdateElement={readOnly ? () => {} : onUpdateElement}
          onUpdateElements={readOnly ? () => {} : onUpdateElements}
          stageRef={stageRef}
          dataRow={dataRow}
          readOnly={readOnly}
        />
      </div>

      <div className={styles.zoomWidget}>
        <button className={styles.zoomBtn} onClick={zoomOut} title="Zoom out">−</button>
        <button className={styles.zoomValue} onClick={zoomReset} title="Reset to 100%">
          {Math.round(zoom * 100)}%
        </button>
        <button className={styles.zoomBtn} onClick={zoomIn} title="Zoom in">+</button>
        <div className={styles.zoomDivider} />
        <button className={styles.zoomBtn} onClick={zoomFit} title="Fit to screen">Fit</button>
      </div>

      <div className={`${styles.panHint} ${isPanning ? styles.panHintVisible : ''}`}>
        Panning
      </div>
    </div>
  )
})
