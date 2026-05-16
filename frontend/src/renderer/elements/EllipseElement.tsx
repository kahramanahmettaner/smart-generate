import { Ellipse } from 'react-konva'
import type Konva from 'konva'
import type { EllipseElement } from '../../types/template'

type Props = {
  element:    EllipseElement
  isSelected: boolean
  onSelect:   (additive: boolean) => void
  onChange:   (changes: Partial<EllipseElement>) => void
  onDragMove: (node: Konva.Node) => void
  onDragEnd:  (node: Konva.Node) => void
  snapToGrid: boolean
  gridSize:   number
}

export function EllipseElementRenderer({
  element, isSelected, onSelect, onChange, onDragMove, onDragEnd,
}: Props) {
  // Konva Ellipse uses radiusX/radiusY and centers at x,y
  // We store x,y as top-left and width/height as bounding box — convert here
  const radiusX = element.width  / 2
  const radiusY = element.height / 2
  const cx      = element.x + radiusX
  const cy      = element.y + radiusY

  return (
    <Ellipse
      id={element.id}
      x={cx}
      y={cy}
      radiusX={radiusX}
      radiusY={radiusY}
      rotation={element.rotation}
      opacity={element.opacity}
      visible={element.visible}
      fill={element.props.fill}
      stroke={element.props.stroke}
      strokeWidth={element.props.strokeWidth}
      draggable={!element.locked}
      onClick={(e) => onSelect(e.evt.shiftKey || e.evt.metaKey || e.evt.ctrlKey)}
      onTap={() => onSelect(false)}
      onDragMove={(e) => onDragMove(e.target)}
      onDragEnd={(e)  => {
        // Konva moves the center — convert back to top-left for store
        const node = e.target
        onChange({
          x: Math.round(node.x() - radiusX),
          y: Math.round(node.y() - radiusY),
        } as Partial<EllipseElement>)
      }}
    />
  )
}
