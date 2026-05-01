import { Image } from 'react-konva'
import { useEffect, useState } from 'react'
import type { ImageElement } from '../../types/template'
import { resolve } from '../../types/template'

type Props = {
  element: ImageElement
  isSelected: boolean
  onSelect: () => void
  onChange: (changes: Partial<ImageElement>) => void
  dataRow?: Record<string, string>
}

export function ImageElementRenderer({ element, isSelected, onSelect, onChange, dataRow }: Props) {
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const src = resolve(element.props.src, dataRow) as string

  useEffect(() => {
    if (!src || src.startsWith('{{')) return
    const image = new window.Image()
    image.crossOrigin = 'anonymous'
    image.src = src
    image.onload = () => setImg(image)
    return () => { image.onload = null }
  }, [src])

  if (!img) return null

  return (
    <Image
      id={element.id}
      x={element.x}
      y={element.y}
      width={element.width}
      height={element.height}
      rotation={element.rotation}
      opacity={element.opacity}
      visible={element.visible}
      image={img}
      draggable={!element.locked}
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={(e) => {
        onChange({
          x: Math.round(e.target.x()),
          y: Math.round(e.target.y()),
        } as Partial<ImageElement>)
      }}
    />
  )
}