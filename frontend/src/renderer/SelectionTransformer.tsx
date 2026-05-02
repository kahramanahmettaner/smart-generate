import { useEffect, useRef } from 'react'
import { Transformer } from 'react-konva'
import type Konva from 'konva'
import { useEditorStore } from '../store/useEditorStore'

type Props = {
  selectedId: string | null
  stageRef: React.RefObject<Konva.Stage>
  onTransformEnd: (id: string, changes: {
    x: number
    y: number
    width: number
    height: number
    rotation: number
  }) => void
}

export function SelectionTransformer({ selectedId, stageRef, onTransformEnd }: Props) {
  const transformerRef = useRef<Konva.Transformer>(null)
  const { template }   = useEditorStore()

  const selectedElement = template.elements.find((el) => el.id === selectedId)
  const keepRatio       = selectedElement?.aspectRatioLocked ?? false

  useEffect(() => {
    const transformer = transformerRef.current
    const stage       = stageRef.current
    if (!transformer || !stage) return

    if (!selectedId) {
      transformer.nodes([])
      transformer.getLayer()?.batchDraw()
      return
    }

    const node = stage.findOne(`#${selectedId}`)
    if (node) {
      transformer.nodes([node])
      transformer.getLayer()?.batchDraw()
    }
  }, [selectedId, stageRef])

  if (!selectedId) return null

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
      borderDash={[]}
      rotateAnchorOffset={20}
      keepRatio={keepRatio}   // ← Konva handles ratio during drag
      onTransformEnd={() => {
        const stage = stageRef.current
        if (!stage || !selectedId) return

        const node = stage.findOne(`#${selectedId}`)
        if (!node) return

        const scaleX   = node.scaleX()
        const scaleY   = node.scaleY()
        const rotation = Math.round(node.rotation())

        const storedW = node.getAttr('width')  as number | undefined
        const storedH = node.getAttr('height') as number | undefined

        const scaleChanged = Math.abs(scaleX - 1) > 0.001 || Math.abs(scaleY - 1) > 0.001

        let width  = scaleChanged
          ? Math.max(1, Math.round((storedW ?? node.width()) * scaleX))
          : Math.max(1, Math.round(storedW ?? node.width()))

        let height = scaleChanged
          ? Math.max(1, Math.round((storedH ?? node.height()) * scaleY))
          : Math.max(1, Math.round(storedH ?? node.height()))

        // Enforce ratio after baking scale if locked
        if (keepRatio && scaleChanged && storedW && storedH) {
          const originalRatio = storedW / storedH
          // Use width as the anchor dimension
          height = Math.max(1, Math.round(width / originalRatio))
        }

        node.scaleX(1)
        node.scaleY(1)

        onTransformEnd(selectedId, { x: Math.round(node.x()), y: Math.round(node.y()), width, height, rotation })
      }}
    />
  )
}