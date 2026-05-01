import { Text } from 'react-konva'
import type { TextElement } from '../../types/template'
import { resolve } from '../../types/template'

type Props = {
  element: TextElement
  isSelected: boolean
  onSelect: () => void
  onChange: (changes: Partial<TextElement>) => void
  dataRow?: Record<string, string>
}

export function TextElementRenderer({ element, isSelected, onSelect, onChange, dataRow }: Props) {
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
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={(e) => {
        onChange({
          x: Math.round(e.target.x()),
          y: Math.round(e.target.y()),
        } as Partial<TextElement>)
      }}
    />
  )
}