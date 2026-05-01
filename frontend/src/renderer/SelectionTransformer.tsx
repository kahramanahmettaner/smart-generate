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
    const stage = stageRef.current
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
        onTransformEnd(selectedId, {
          x: Math.round(node.x()),
          y: Math.round(node.y()),
          width: Math.round(node.width() * node.scaleX()),
          height: Math.round(node.height() * node.scaleY()),
          rotation: Math.round(node.rotation()),
        })
        // Reset scale after baking into width/height
        node.scaleX(1)
        node.scaleY(1)
      }}
    />
  )
}