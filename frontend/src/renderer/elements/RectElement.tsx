import { Rect } from 'react-konva'
import type Konva from 'konva'
import type { RectElement } from '../../types/template'

type Props = {
  element:     RectElement
  isSelected:  boolean
  onSelect:    (additive: boolean) => void
  onChange:    (changes: Partial<RectElement>) => void
  onDragMove:  (node: Konva.Node) => void
  onDragEnd:   (node: Konva.Node) => void
  snapToGrid:  boolean
  gridSize:    number
}

export function RectElementRenderer({
  element, isSelected, onSelect, onChange, onDragMove, onDragEnd
}: Props) {
  return (
    <Rect
      id={element.id}
      x={element.x}
      y={element.y}
      width={element.width}
      height={element.height}
      rotation={element.rotation}
      opacity={element.opacity}
      visible={element.visible}
      fill={element.props.fill}
      stroke={element.props.stroke}
      strokeWidth={element.props.strokeWidth}
      cornerRadius={element.props.cornerRadius}
      draggable={!element.locked}
      onClick={(e) => onSelect(e.evt.shiftKey || e.evt.metaKey || e.evt.ctrlKey)}
      onTap={() => onSelect(false)}
      onDragMove={(e) => onDragMove(e.target)}
      onDragEnd={(e)  => onDragEnd(e.target)}
    />
  )
}
