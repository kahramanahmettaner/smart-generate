import { Rect } from 'react-konva'
import type { RectElement } from '../../types/template'

type Props = {
  element: RectElement
  isSelected: boolean
  onSelect: () => void
  onChange: (changes: Partial<RectElement>) => void
}

export function RectElementRenderer({ element, isSelected, onSelect, onChange }: Props) {
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
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={(e) => {
        onChange({
          x: Math.round(e.target.x()),
          y: Math.round(e.target.y()),
        } as Partial<RectElement>)
      }}
    />
  )
}