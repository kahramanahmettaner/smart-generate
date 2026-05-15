import { useRef, useState, useCallback } from 'react'
import { Stage, Layer, Rect, Line } from 'react-konva'
import type Konva from 'konva'
import type { Template, Element } from '../types/template'
import { RectElementRenderer }  from './elements/RectElement'
import { TextElementRenderer }  from './elements/TextElement'
import { ImageElementRenderer } from './elements/ImageElement'
import { MultiTransformer }     from './MultiTransformer'
import { calculateSnap, type GuideLine } from '../lib/alignmentGuides'
import { useEditorStore } from '../store/useEditorStore'

type Props = {
  template:        Template
  selectedIds:     string[]
  onSelectElement: (id: string | null, additive: boolean) => void
  onUpdateElement: (id: string, changes: Partial<Element>) => void
  onUpdateElements:(ids: string[], changes: Partial<Element>) => void
  dataRow?:        Record<string, string>
  stageRef?:       React.RefObject<Konva.Stage>
  readOnly?:       boolean
}

// Marquee selection state
type Marquee = { x: number; y: number; width: number; height: number } | null

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

  // Track marquee drag start
  const marqueeStart = useRef<{ x: number; y: number } | null>(null)
  const isDraggingMarquee = useRef(false)

  // ── Marquee selection ─────────────────────────────────────────────────────

  const getStagePos = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = stageRef.current
    if (!stage) return { x: 0, y: 0 }
    const pos = stage.getPointerPosition()
    return pos ?? { x: 0, y: 0 }
  }

  const onStageMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (readOnly) return
    // Only start marquee when clicking on empty stage (not on an element)
    if (e.target !== e.target.getStage() && e.target.getClassName() !== 'Rect') {
      return
    }
    if (e.target !== e.target.getStage()) return

    const pos = getStagePos(e)
    marqueeStart.current     = pos
    isDraggingMarquee.current = false
    setMarquee(null)
    // Clear selection when clicking empty area
    onSelectElement(null, false)
  }, [readOnly, onSelectElement])

  const onStageMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!marqueeStart.current) return
    const pos = getStagePos(e)
    const dx  = pos.x - marqueeStart.current.x
    const dy  = pos.y - marqueeStart.current.y

    // Only start marquee after moving a few px (avoid accidental tiny marquees)
    if (!isDraggingMarquee.current && Math.abs(dx) < 4 && Math.abs(dy) < 4) return
    isDraggingMarquee.current = true

    setMarquee({
      x:      Math.min(pos.x, marqueeStart.current.x),
      y:      Math.min(pos.y, marqueeStart.current.y),
      width:  Math.abs(dx),
      height: Math.abs(dy),
    })
  }, [])

  const onStageMouseUp = useCallback(() => {
    if (!marqueeStart.current) return

    if (isDraggingMarquee.current && marquee) {
      // Select all elements that intersect with the marquee
      const selected = elements.filter((el) => {
        if (!el.visible || el.locked) return false
        return (
          el.x < marquee.x + marquee.width  &&
          el.x + el.width  > marquee.x       &&
          el.y < marquee.y + marquee.height  &&
          el.y + el.height > marquee.y
        )
      })
      if (selected.length > 0) {
        useEditorStore.getState().selectElements(selected.map((e) => e.id))
      }
    }

    marqueeStart.current      = null
    isDraggingMarquee.current = false
    setMarquee(null)
  }, [marquee, elements])

  // ── Element drag with snap/guides ─────────────────────────────────────────

  const handleDragMove = useCallback((id: string, node: Konva.Node) => {
    const el     = elements.find((e) => e.id === id)
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

    if (settings.showGuides) {
      setGuides(result.guides)
    }
  }, [elements, selectedIds, canvas, settings])

  const handleDragEnd = useCallback((id: string, node: Konva.Node) => {
    setGuides([])
    onUpdateElement(id, {
      x: Math.round(node.x()),
      y: Math.round(node.y()),
    } as Partial<Element>)
  }, [onUpdateElement])

  // ── Transform end (resize/rotate via transformer) ─────────────────────────

  const handleTransformEnd = useCallback((
    updates: { id: string; x: number; y: number; width: number; height: number; rotation: number }[]
  ) => {
    setGuides([])
    updates.forEach(({ id, ...changes }) => onUpdateElement(id, changes as Partial<Element>))
  }, [onUpdateElement])

  return (
    <Stage
      ref={stageRef}
      width={canvas.width}
      height={canvas.height}
      onMouseDown={onStageMouseDown}
      onMouseMove={onStageMouseMove}
      onMouseUp={onStageMouseUp}
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
              onSelect: (additive: boolean) => onSelectElement(el.id, additive),
              onChange: (changes: Partial<Element>) => onUpdateElement(el.id, changes),
              onDragMove: (node: Konva.Node) => handleDragMove(el.id, node),
              onDragEnd:  (node: Konva.Node) => handleDragEnd(el.id, node),
              snapToGrid:  settings.snapToGrid,
              gridSize:    settings.gridSize,
            }

            switch (el.type) {
              case 'rect':
                return <RectElementRenderer  key={el.id} element={el} {...sharedProps} />
              case 'text':
                return <TextElementRenderer  key={el.id} element={el} dataRow={dataRow} {...sharedProps} />
              case 'image':
                return <ImageElementRenderer key={el.id} element={el} dataRow={dataRow} {...sharedProps} />
              default:
                return null
            }
          })}

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
