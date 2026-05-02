import { useState, useCallback, useRef } from 'react'
import styles from './RightPanel.module.scss'
import { PropertiesPanel } from './PropertiesPanel'
import { LayersPanel } from './LayersPannel'

const PANEL_MIN = 80    // minimum height for each panel when open
const DEFAULT_SPLIT = 260 // default layers panel height in px

export function RightPanel({ canvasWidth, canvasHeight }: { canvasWidth: number; canvasHeight: number }) {
  const [layersHeight, setLayersHeight] = useState(DEFAULT_SPLIT)
  const containerRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const startY = useRef(0)
  const startHeight = useRef(0)

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    dragging.current = true
    startY.current = e.clientY
    startHeight.current = layersHeight

    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current || !containerRef.current) return
      const containerH = containerRef.current.clientHeight
      const delta = e.clientY - startY.current
      const next = startHeight.current + delta
      // clamp so neither panel goes below PANEL_MIN
      const clamped = Math.min(
        containerH - PANEL_MIN,
        Math.max(PANEL_MIN, next)
      )
      setLayersHeight(clamped)
    }

    const onMouseUp = () => {
      dragging.current = false
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }, [layersHeight])

  return (
    <aside className={styles.panel} ref={containerRef}>
      <LayersPanel height={layersHeight} />

      <div
        className={styles.resizeHandle}
        onMouseDown={onMouseDown}
        title="Drag to resize"
      >
        <div className={styles.resizeDots} />
      </div>

      <PropertiesPanel canvasWidth={canvasWidth} canvasHeight={canvasHeight} />
    </aside>
  )
}