import { useRef } from 'react'
import { Stage, Layer, Rect } from 'react-konva'
import type Konva from 'konva'
import type { Template, Element } from '../types/template'
import { RectElementRenderer } from './elements/RectElement'
import { TextElementRenderer } from './elements/TextElement'
import { ImageElementRenderer } from './elements/ImageElement'
import { SelectionTransformer } from './SelectionTransformer'

type Props = {
  template: Template
  selectedId: string | null
  onSelectElement: (id: string | null) => void
  onUpdateElement: (id: string, changes: Partial<Element>) => void
  dataRow?: Record<string, string>
  stageRef?: React.RefObject<Konva.Stage>
}

export function TemplateRenderer({
  template,
  selectedId,
  onSelectElement,
  onUpdateElement,
  dataRow,
  stageRef: externalStageRef,
}: Props) {
  const internalStageRef = useRef<Konva.Stage>(null)
  const stageRef = externalStageRef ?? internalStageRef
  const { canvas, elements } = template

  const handleTransformEnd = (id: string, changes: {
    x: number; y: number
    width: number; height: number
    rotation: number
  }) => {
    onUpdateElement(id, changes as Partial<Element>)
  }

  return (
    <Stage
      ref={stageRef}
      width={canvas.width}
      height={canvas.height}
      onMouseDown={(e) => {
        // Deselect when clicking empty area
        if (e.target === e.target.getStage()) {
          onSelectElement(null)
        }
      }}
    >
      <Layer>
        {/* Canvas background */}
        <Rect
          x={0}
          y={0}
          width={canvas.width}
          height={canvas.height}
          fill={canvas.background}
          listening={false}
        />

        {/* Elements bottom to top */}
        {elements
          .filter((el) => el.visible)
          .map((el) => {
            const { key, ...sharedProps } = {
              key:      el.id,
              isSelected: el.id === selectedId,
              onSelect:   () => onSelectElement(el.id),
              onChange:   (changes: Partial<Element>) => onUpdateElement(el.id, changes),
            }

            switch (el.type) {
              case 'rect':
                return <RectElementRenderer key={key} element={el} {...sharedProps} />
              case 'text':
                return (
                  <TextElementRenderer
                    key={key}
                    element={el}
                    dataRow={dataRow}
                    {...sharedProps}
                  />
                )
              case 'image':
                return (
                  <ImageElementRenderer
                    key={key}
                    element={el}
                    dataRow={dataRow}
                    {...sharedProps}
                  />
                )
              default:
                return null
            }
          })}

        {/* Selection transformer always on top */}
        <SelectionTransformer
          selectedId={selectedId}
          stageRef={stageRef}
          onTransformEnd={handleTransformEnd}
        />
      </Layer>
    </Stage>
  )
}