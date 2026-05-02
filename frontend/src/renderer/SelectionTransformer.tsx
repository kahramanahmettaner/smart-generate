import { useEffect, useRef } from 'react'
import { Transformer } from 'react-konva'
import type Konva from 'konva'

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
      keepRatio={false}
      onTransformEnd={() => {
        const stage = stageRef.current
        if (!stage || !selectedId) return

        const node = stage.findOne(`#${selectedId}`)
        if (!node) return

        const scaleX   = node.scaleX()
        const scaleY   = node.scaleY()
        const rotation = Math.round(node.rotation())

        // Always read stored width/height attrs — never use getClientRect
        // getClientRect returns the rotated bounding box which is wrong for our purposes
        const storedW = node.getAttr('width')  as number | undefined
        const storedH = node.getAttr('height') as number | undefined

        // If scale hasn't changed (pure rotation), keep original dimensions exactly
        const scaleChanged = Math.abs(scaleX - 1) > 0.001 || Math.abs(scaleY - 1) > 0.001

        const width  = scaleChanged
          ? Math.max(1, Math.round((storedW ?? node.width())  * scaleX))
          : Math.max(1, Math.round(storedW ?? node.width()))

        const height = scaleChanged
          ? Math.max(1, Math.round((storedH ?? node.height()) * scaleY))
          : Math.max(1, Math.round(storedH ?? node.height()))

        // Reset scale — baked into width/height above
        node.scaleX(1)
        node.scaleY(1)

        onTransformEnd(selectedId, {
          x: Math.round(node.x()),
          y: Math.round(node.y()),
          width,
          height,
          rotation,
        })
      }}
    />
  )
}