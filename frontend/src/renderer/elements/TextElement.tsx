import { Text } from 'react-konva'
import type Konva from 'konva'
import type { TextElement } from '../../types/template'
import { resolve } from '../../lib/templateUtils'

type Props = {
  element:    TextElement
  isSelected: boolean
  onSelect:   (additive: boolean) => void
  onChange:   (changes: Partial<TextElement>) => void
  onDragMove: (node: Konva.Node) => void
  onDragEnd:  (node: Konva.Node) => void
  snapToGrid: boolean
  gridSize:   number
  dataRow?:   Record<string, string>
}

export function TextElementRenderer({
  element, isSelected, onSelect, onChange, onDragMove, onDragEnd, dataRow
}: Props) {
  const content = resolve(element.props.content, dataRow) as string

  return (
    <Text
      id={element.id}
      x={element.x}
      y={element.y}
      width={element.width}
      height={element.height}
      rotation={element.rotation}
      opacity={element.opacity}
      visible={element.visible}
      text={content}
      fontSize={element.props.fontSize}
      fontFamily={element.props.fontFamily}
      fontStyle={element.props.fontWeight}
      fill={element.props.color}
      align={element.props.align}
      lineHeight={element.props.lineHeight}
      draggable={!element.locked}
      onClick={(e) => onSelect(e.evt.shiftKey || e.evt.metaKey || e.evt.ctrlKey)}
      onTap={() => onSelect(false)}
      onDragMove={(e) => onDragMove(e.target)}
      onDragEnd={(e)  => onDragEnd(e.target)}
    />
  )
}
