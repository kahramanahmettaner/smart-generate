import { Line, Group, Rect } from 'react-konva'
import type Konva from 'konva'
import type { LineElement } from '../../types/template'

type Props = {
  element:    LineElement
  isSelected: boolean
  onSelect:   (additive: boolean) => void
  onChange:   (changes: Partial<LineElement>) => void
  onDragMove: (node: Konva.Node) => void
  onDragEnd:  (node: Konva.Node) => void
  snapToGrid: boolean
  gridSize:   number
}

export function LineElementRenderer({
  element, isSelected, onSelect, onChange, onDragMove, onDragEnd,
}: Props) {
  // Line goes from (x,y) to (x+width, y) — rotation handles angle
  // We wrap in a Group so dragging works with a proper hit area
  return (
    <Group
      id={element.id}
      x={element.x}
      y={element.y}
      rotation={element.rotation}
      opacity={element.opacity}
      visible={element.visible}
      draggable={!element.locked}
      onClick={(e) => onSelect(e.evt.shiftKey || e.evt.metaKey || e.evt.ctrlKey)}
      onTap={() => onSelect(false)}
      onDragMove={(e) => onDragMove(e.target)}
      onDragEnd={(e) => {
        onChange({
          x: Math.round(e.target.x()),
          y: Math.round(e.target.y()),
        } as Partial<LineElement>)
      }}
    >
      {/* Invisible wider hit area so thin lines are easy to click */}
      <Rect
        x={0}
        y={-8}
        width={element.width}
        height={16}
        fill="transparent"
      />
      <Line
        points={[0, 0, element.width, 0]}
        stroke={element.props.stroke}
        strokeWidth={element.props.strokeWidth}
        dash={element.props.dash}
        lineCap="round"
        listening={false}
      />
    </Group>
  )
}
