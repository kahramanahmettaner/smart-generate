import { useRef, useState, useCallback, useEffect } from 'react'
import { Stage, Layer, Rect, Line } from 'react-konva'
import type Konva from 'konva'
import type { Template, Element } from '../types/template'
import { RectElementRenderer }    from './elements/RectElement'
import { EllipseElementRenderer } from './elements/EllipseElement'
import { LineElementRenderer }    from './elements/LineElement'
import { TextElementRenderer }  from './elements/TextElement'
import { ImageElementRenderer } from './elements/ImageElement'
import { MultiTransformer }     from './MultiTransformer'
import { calculateSnap, type GuideLine } from '../lib/alignmentGuides'
import { useEditorStore } from '../store/useEditorStore'

type Props = {
  template:         Template
  selectedIds:      string[]
  onSelectElement:  (id: string | null, additive: boolean) => void
  onUpdateElement:  (id: string, changes: Partial<Element>) => void
  onUpdateElements: (ids: string[], changes: Partial<Element>) => void
  dataRow?:         Record<string, string>
  stageRef?:        React.RefObject<Konva.Stage>
  readOnly?:        boolean
}

type Marquee = { x: number; y: number; width: number; height: number } | null

// Clamp a marquee rectangle to canvas bounds
function clampMarquee(
  startX: number, startY: number,
  currentX: number, currentY: number,
  canvasW: number, canvasH: number,
): Marquee {
  const clampedX = Math.max(0, Math.min(currentX, canvasW))
  const clampedY = Math.max(0, Math.min(currentY, canvasH))
  return {
    x:      Math.min(startX, clampedX),
    y:      Math.min(startY, clampedY),
    width:  Math.abs(clampedX - startX),
    height: Math.abs(clampedY - startY),
  }
}

export function TemplateRenderer({
  template,
  selectedIds,
  onSelectElement,
  onUpdateElement,
  onUpdateElements,
  dataRow,
  stageRef: externalStageRef,
  readOnly,
}: Props) {
  const internalStageRef = useRef<Konva.Stage>(null)
  const stageRef         = externalStageRef ?? internalStageRef
  const { canvas, elements } = template
  const { settings } = useEditorStore()

  const [guides,  setGuides]  = useState<GuideLine[]>([])
  const [marquee, setMarquee] = useState<Marquee>(null)

  // Marquee tracking (all in refs — no re-render during mousemove)
  const marqueeStart        = useRef<{ x: number; y: number } | null>(null)
  const isDraggingMarquee   = useRef(false)
  const latestMarquee       = useRef<Marquee>(null)  // mirror of state for use in window listeners

  // ── Canvas-relative mouse position from a native MouseEvent ──────────────
  // Used in window-level listeners where Konva events aren't available

  const getNativeCanvasPos = useCallback((e: MouseEvent): { x: number; y: number } | null => {
    const stage = stageRef.current
    if (!stage) return null
    const container = stage.container()
    const rect      = container.getBoundingClientRect()
    // Account for the CSS transform (zoom/pan) applied by EditorCanvas
    // We need position relative to the Konva canvas itself
    const scaleX = stage.width()  / rect.width
    const scaleY = stage.height() / rect.height
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top)  * scaleY,
    }
  }, [stageRef])

  // ── Konva stage position helper ───────────────────────────────────────────

  const getStagePos = useCallback(() => {
    const stage = stageRef.current
    if (!stage) return { x: 0, y: 0 }
    return stage.getPointerPosition() ?? { x: 0, y: 0 }
  }, [stageRef])

  // ── Marquee: window-level listeners so release outside canvas is caught ───

  useEffect(() => {
    if (readOnly) return

    const onWindowMouseMove = (e: MouseEvent) => {
      if (!marqueeStart.current) return

      const pos = getNativeCanvasPos(e)
      if (!pos) return

      const dx = pos.x - marqueeStart.current.x
      const dy = pos.y - marqueeStart.current.y

      if (!isDraggingMarquee.current && Math.abs(dx) < 4 && Math.abs(dy) < 4) return
      isDraggingMarquee.current = true

      const clamped = clampMarquee(
        marqueeStart.current.x, marqueeStart.current.y,
        pos.x, pos.y,
        canvas.width, canvas.height,
      )
      latestMarquee.current = clamped
      setMarquee(clamped)
    }

    const onWindowMouseUp = () => {
      if (!marqueeStart.current) return

      if (isDraggingMarquee.current && latestMarquee.current) {
        const m = latestMarquee.current
        const selected = elements.filter((el) => {
          if (!el.visible || el.locked) return false
          return (
            el.x                < m.x + m.width  &&
            el.x + el.width     > m.x             &&
            el.y                < m.y + m.height  &&
            el.y + el.height    > m.y
          )
        })
        if (selected.length > 0) {
          useEditorStore.getState().selectElements(selected.map((e) => e.id))
        }
      }

      marqueeStart.current      = null
      isDraggingMarquee.current = false
      latestMarquee.current     = null
      setMarquee(null)
    }

    window.addEventListener('mousemove', onWindowMouseMove)
    window.addEventListener('mouseup',   onWindowMouseUp)
    return () => {
      window.removeEventListener('mousemove', onWindowMouseMove)
      window.removeEventListener('mouseup',   onWindowMouseUp)
    }
  }, [readOnly, elements, canvas, getNativeCanvasPos])

  const onStageMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (readOnly) return
    // Only start marquee on the bare stage background (not on elements)
    if (e.target !== e.target.getStage()) return

    const pos = getStagePos()
    marqueeStart.current      = pos
    isDraggingMarquee.current = false
    latestMarquee.current     = null
    setMarquee(null)
    onSelectElement(null, false)
  }, [readOnly, getStagePos, onSelectElement])

  // ── Drag selected group via invisible bounding-box rect ───────────────────
  // When multi-selecting, an invisible rect covers the bounding box of all
  // selected elements. Dragging it moves all of them together.

  const selectionBounds = useCallback((): {
    x: number; y: number; width: number; height: number
  } | null => {
    if (selectedIds.length < 2) return null
    const selected = elements.filter((e) => selectedIds.includes(e.id))
    if (selected.length === 0) return null
    const minX = Math.min(...selected.map((e) => e.x))
    const minY = Math.min(...selected.map((e) => e.y))
    const maxX = Math.max(...selected.map((e) => e.x + e.width))
    const maxY = Math.max(...selected.map((e) => e.y + e.height))
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
  }, [selectedIds, elements])

  const handleGroupDragMove = useCallback((node: Konva.Node) => {
    // Calculate delta from how far the invisible rect moved
    const selected   = elements.filter((e) => selectedIds.includes(e.id))
    if (selected.length === 0) return

    // The node position IS the new bounding box top-left
    // We need to figure out the delta from the original bounding box position
    const bounds = selectionBounds()
    if (!bounds) return

    const deltaX = node.x() - bounds.x
    const deltaY = node.y() - bounds.y

    // Move all selected nodes on the Konva stage visually (don't commit yet)
    const stage = stageRef.current
    if (!stage) return
    selected.forEach((el) => {
      const elNode = stage.findOne(`#${el.id}`)
      if (elNode) {
        elNode.x(el.x + deltaX)
        elNode.y(el.y + deltaY)
      }
    })
  }, [elements, selectedIds, selectionBounds, stageRef])

  const handleGroupDragEnd = useCallback((node: Konva.Node) => {
    const bounds = selectionBounds()
    if (!bounds) return

    const deltaX = Math.round(node.x() - bounds.x)
    const deltaY = Math.round(node.y() - bounds.y)

    // Reset the invisible rect to its logical position
    node.x(bounds.x)
    node.y(bounds.y)

    // Commit all element position updates to the store
    const updates: { id: string; x: number; y: number }[] = []
    elements
      .filter((e) => selectedIds.includes(e.id))
      .forEach((el) => {
        updates.push({ id: el.id, x: el.x + deltaX, y: el.y + deltaY })
      })

    updates.forEach(({ id, x, y }) =>
      onUpdateElement(id, { x, y } as Partial<Element>)
    )
  }, [elements, selectedIds, selectionBounds, onUpdateElement])

  // ── Single element drag with snap/guides ──────────────────────────────────

  const handleDragMove = useCallback((id: string, node: Konva.Node) => {
    const el = elements.find((e) => e.id === id)
    if (!el) return

    const others = elements.filter((e) => !selectedIds.includes(e.id))
    const result = calculateSnap(
      { x: node.x(), y: node.y(), width: el.width, height: el.height },
      others,
      canvas,
      settings.snapToGrid,
      settings.gridSize,
    )

    node.x(result.x)
    node.y(result.y)

    if (settings.showGuides) setGuides(result.guides)
  }, [elements, selectedIds, canvas, settings])

  const handleDragEnd = useCallback((id: string, node: Konva.Node) => {
    setGuides([])
    onUpdateElement(id, {
      x: Math.round(node.x()),
      y: Math.round(node.y()),
    } as Partial<Element>)
  }, [onUpdateElement])

  // ── Transform end ─────────────────────────────────────────────────────────

  const handleTransformEnd = useCallback((
    updates: { id: string; x: number; y: number; width: number; height: number; rotation: number }[]
  ) => {
    setGuides([])
    updates.forEach(({ id, ...changes }) => onUpdateElement(id, changes as Partial<Element>))
  }, [onUpdateElement])

  const bounds = selectionBounds()

  return (
    <Stage
      ref={stageRef}
      width={canvas.width}
      height={canvas.height}
      onMouseDown={onStageMouseDown}
    >
      <Layer>
        {/* Canvas background */}
        <Rect
          x={0} y={0}
          width={canvas.width}
          height={canvas.height}
          fill={canvas.background === 'transparent' ? undefined : canvas.background}
          listening={false}
        />

        {/* Grid overlay */}
        {settings.snapToGrid && !readOnly && (
          <>
            {Array.from({ length: Math.floor(canvas.width / settings.gridSize) }).map((_, i) => (
              <Line
                key={`gv-${i}`}
                points={[(i + 1) * settings.gridSize, 0, (i + 1) * settings.gridSize, canvas.height]}
                stroke="rgba(99,102,241,0.12)"
                strokeWidth={1}
                listening={false}
              />
            ))}
            {Array.from({ length: Math.floor(canvas.height / settings.gridSize) }).map((_, i) => (
              <Line
                key={`gh-${i}`}
                points={[0, (i + 1) * settings.gridSize, canvas.width, (i + 1) * settings.gridSize]}
                stroke="rgba(99,102,241,0.12)"
                strokeWidth={1}
                listening={false}
              />
            ))}
          </>
        )}

        {/* Elements */}
        {elements
          .filter((el) => el.visible)
          .map((el) => {
            const isSelected = selectedIds.includes(el.id)
            const sharedProps = {
              isSelected,
              onSelect:   (additive: boolean) => onSelectElement(el.id, additive),
              onChange:   (changes: Partial<Element>) => onUpdateElement(el.id, changes),
              onDragMove: (node: Konva.Node) => handleDragMove(el.id, node),
              onDragEnd:  (node: Konva.Node) => handleDragEnd(el.id, node),
              snapToGrid: settings.snapToGrid,
              gridSize:   settings.gridSize,
            }

            switch (el.type) {
              case 'rect':
                return <RectElementRenderer  key={el.id} element={el} {...sharedProps} />
              case 'text':
                return <TextElementRenderer  key={el.id} element={el} dataRow={dataRow} {...sharedProps} />
              case 'image':
                return <ImageElementRenderer key={el.id} element={el} dataRow={dataRow} {...sharedProps} />
              case 'ellipse':
                return <EllipseElementRenderer key={el.id} element={el} {...sharedProps} />
              case 'line':
                return <LineElementRenderer key={el.id} element={el} {...sharedProps} />
              default:
                return null
            }
          })}

        {/* Invisible drag rect for multi-select group move
            Sits over the bounding box — dragging it moves all selected elements.
            Only rendered when 2+ elements are selected. */}
        {!readOnly && bounds && selectedIds.length > 1 && (
          <Rect
            x={bounds.x}
            y={bounds.y}
            width={bounds.width}
            height={bounds.height}
            fill="transparent"
            draggable
            onDragMove={(e) => handleGroupDragMove(e.target)}
            onDragEnd={(e)  => handleGroupDragEnd(e.target)}
            // Stop click propagation so it doesn't clear the selection
            onClick={(e) => e.cancelBubble = true}
            onMouseDown={(e) => e.cancelBubble = true}
          />
        )}

        {/* Multi-select transformer */}
        {!readOnly && selectedIds.length > 0 && (
          <MultiTransformer
            selectedIds={selectedIds}
            stageRef={stageRef}
            elements={elements}
            onTransformEnd={handleTransformEnd}
          />
        )}

        {/* Alignment guides */}
        {guides.map((guide, i) => (
          <Line
            key={i}
            points={
              guide.orientation === 'vertical'
                ? [guide.position, guide.from, guide.position, guide.to]
                : [guide.from, guide.position, guide.to, guide.position]
            }
            stroke="#6366F1"
            strokeWidth={1}
            dash={[4, 4]}
            listening={false}
          />
        ))}

        {/* Marquee selection box */}
        {marquee && (
          <Rect
            x={marquee.x} y={marquee.y}
            width={marquee.width} height={marquee.height}
            fill="rgba(99,102,241,0.08)"
            stroke="#6366F1"
            strokeWidth={1}
            dash={[4, 3]}
            listening={false}
          />
        )}
      </Layer>
    </Stage>
  )
}
