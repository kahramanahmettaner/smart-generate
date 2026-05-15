import { useEffect, useRef } from 'react'
import { Transformer } from 'react-konva'
import type Konva from 'konva'
import type { Element } from '../types/template'
import { useEditorStore } from '../store/useEditorStore'

type TransformUpdate = {
  id:       string
  x:        number
  y:        number
  width:    number
  height:   number
  rotation: number
}

type Props = {
  selectedIds:     string[]
  stageRef:        React.RefObject<Konva.Stage>
  elements:        Element[]
  onTransformEnd:  (updates: TransformUpdate[]) => void
}

export function MultiTransformer({ selectedIds, stageRef, elements, onTransformEnd }: Props) {
  const transformerRef = useRef<Konva.Transformer>(null)

  // Single selected element — check aspect ratio lock
  const singleEl = selectedIds.length === 1
    ? elements.find((el) => el.id === selectedIds[0])
    : null
  const keepRatio = singleEl?.aspectRatioLocked ?? false

  useEffect(() => {
    const transformer = transformerRef.current
    const stage       = stageRef.current
    if (!transformer || !stage) return

    if (selectedIds.length === 0) {
      transformer.nodes([])
      transformer.getLayer()?.batchDraw()
      return
    }

    const nodes = selectedIds
      .map((id) => stage.findOne(`#${id}`))
      .filter(Boolean) as Konva.Node[]

    transformer.nodes(nodes)
    transformer.getLayer()?.batchDraw()
  }, [selectedIds, stageRef])

  if (selectedIds.length === 0) return null

  return (
    <Transformer
      ref={transformerRef}
      anchorSize={8}
      anchorCornerRadius={2}
      anchorStroke="#4A90D9"
      anchorFill="#ffffff"
      anchorStrokeWidth={1.5}
      borderStroke="#4A90D9"
      borderStrokeWidth={1.5}
      rotateAnchorOffset={20}
      keepRatio={keepRatio}
      // For multi-select, disable rotation (too confusing with multiple elements)
      rotateEnabled={selectedIds.length === 1}
      onTransformEnd={() => {
        const stage = stageRef.current
        if (!stage) return

        const updates: TransformUpdate[] = []

        for (const id of selectedIds) {
          const node = stage.findOne(`#${id}`)
          if (!node) continue

          const el      = elements.find((e) => e.id === id)
          const scaleX  = node.scaleX()
          const scaleY  = node.scaleY()
          const rotation = Math.round(node.rotation())

          const storedW = node.getAttr('width')  as number | undefined
          const storedH = node.getAttr('height') as number | undefined

          const scaleChanged = Math.abs(scaleX - 1) > 0.001 || Math.abs(scaleY - 1) > 0.001

          let width  = scaleChanged
            ? Math.max(1, Math.round((storedW ?? node.width())  * scaleX))
            : Math.max(1, Math.round(storedW ?? node.width()))

          let height = scaleChanged
            ? Math.max(1, Math.round((storedH ?? node.height()) * scaleY))
            : Math.max(1, Math.round(storedH ?? node.height()))

          // Enforce ratio if locked (single select only)
          if (keepRatio && scaleChanged && storedW && storedH) {
            const ratio = storedW / storedH
            height = Math.max(1, Math.round(width / ratio))
          }

          node.scaleX(1)
          node.scaleY(1)

          updates.push({
            id,
            x:        Math.round(node.x()),
            y:        Math.round(node.y()),
            width,
            height,
            rotation,
          })
        }

        onTransformEnd(updates)
      }}
    />
  )
}
