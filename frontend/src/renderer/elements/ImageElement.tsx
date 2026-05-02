import { Image, Rect, Text, Group } from 'react-konva'
import { useEffect, useState } from 'react'
import type { ImageAlign, ImageElement } from '../../types/template'
import type { ImageAsset } from '../../types/asset'
import { useAssetStore } from '../../store/useAssetStore'

type Props = {
  element: ImageElement
  isSelected: boolean
  onSelect: () => void
  onChange: (changes: Partial<ImageElement>) => void
  dataRow?: Record<string, string>
}

function resolveSrc(
  src: ImageElement['props']['src'],
  getAsset: (id: string) => ImageAsset | undefined,
  dataRow?: Record<string, string>
): string | null {
  if (src.type === 'none')    return null
  if (src.type === 'asset')   return getAsset(src.assetId)?.dataUrl ?? null
  if (src.type === 'binding') return dataRow?.[src.column] ?? null
  return null
}

// Returns Konva crop params to simulate CSS object-fit behavior
function getCropProps(
  imgW: number, imgH: number,
  boxW: number, boxH: number,
  fit:   'cover' | 'contain' | 'fill',
  align: ImageAlign = { horizontal: 'center', vertical: 'center' }
): {
  cropX: number; cropY: number
  cropWidth: number; cropHeight: number
  x: number; y: number
  width: number; height: number
} {
  if (!imgW || !imgH || !boxW || !boxH ||
      isNaN(imgW) || isNaN(imgH) || isNaN(boxW) || isNaN(boxH)) {
    return { cropX: 0, cropY: 0, cropWidth: imgW || 1, cropHeight: imgH || 1,
             x: 0, y: 0, width: boxW || 1, height: boxH || 1 }
  }

  if (fit === 'fill') {
    return { cropX: 0, cropY: 0, cropWidth: imgW, cropHeight: imgH,
             x: 0, y: 0, width: boxW, height: boxH }
  }

  const imgRatio = imgW / imgH
  const boxRatio = boxW / boxH

  // Horizontal offset helper
  const hOffset = (total: number, used: number) => {
    if (align.horizontal === 'left')   return 0
    if (align.horizontal === 'right')  return total - used
    return (total - used) / 2  // center
  }

  // Vertical offset helper
  const vOffset = (total: number, used: number) => {
    if (align.vertical === 'top')    return 0
    if (align.vertical === 'bottom') return total - used
    return (total - used) / 2  // center
  }

  if (fit === 'cover') {
    if (imgRatio > boxRatio) {
      // Wider image — crop left/right based on horizontal align
      const cropH = imgH
      const cropW = imgH * boxRatio
      const cropX = hOffset(imgW, cropW)
      return { cropX, cropY: 0, cropWidth: cropW, cropHeight: cropH,
               x: 0, y: 0, width: boxW, height: boxH }
    } else {
      // Taller image — crop top/bottom based on vertical align
      const cropW = imgW
      const cropH = imgW / boxRatio
      const cropY = vOffset(imgH, cropH)
      return { cropX: 0, cropY, cropWidth: cropW, cropHeight: cropH,
               x: 0, y: 0, width: boxW, height: boxH }
    }
  }

  // contain — letterbox with alignment
  if (imgRatio > boxRatio) {
    const renderH = boxW / imgRatio
    const offsetY = vOffset(boxH, renderH)
    return { cropX: 0, cropY: 0, cropWidth: imgW, cropHeight: imgH,
             x: 0, y: offsetY, width: boxW, height: renderH }
  } else {
    const renderW = boxH * imgRatio
    const offsetX = hOffset(boxW, renderW)
    return { cropX: 0, cropY: 0, cropWidth: imgW, cropHeight: imgH,
             x: offsetX, y: 0, width: renderW, height: boxH }
  }
}

export function ImageElementRenderer({
  element, isSelected, onSelect, onChange, dataRow
}: Props) {
  const { getAsset }  = useAssetStore()
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const resolvedSrc   = resolveSrc(element.props.src, getAsset, dataRow)

  useEffect(() => {
    if (!resolvedSrc) { setImg(null); return }
    const image       = new window.Image()
    image.crossOrigin = 'anonymous'
    image.src         = resolvedSrc
    image.onload      = () => setImg(image)
    image.onerror     = () => setImg(null)
    return () => { image.onload = null; image.onerror = null }
  }, [resolvedSrc])

  const sharedDragProps = {
    draggable: !element.locked,
    onDragEnd: (e: any) => onChange({
      x: Math.round(e.target.x()),
      y: Math.round(e.target.y()),
    } as Partial<ImageElement>),
  }

  // Placeholder
  if (!img) {
    return (
      <Group
        id={element.id}
        x={element.x}
        y={element.y}
        width={element.width}
        height={element.height}
        rotation={element.rotation}
        opacity={element.opacity}
        visible={element.visible}
        onClick={onSelect}
        onTap={onSelect}
        {...sharedDragProps}
      >
        <Rect
          width={element.width}
          height={element.height}
          fill="#F5F4F2"
          stroke={isSelected ? '#4A90D9' : '#CCCCCC'}
          strokeWidth={1.5}
          dash={[6, 3]}
        />
        <Text
          y={element.height / 2 - 20}
          width={element.width}
          text="⬚"
          fontSize={28}
          fill="#CCCCCC"
          align="center"
          listening={false}
        />
        <Text
          y={element.height / 2 + 14}
          width={element.width}
          text="no image set"
          fontSize={11}
          fill="#AAAAAA"
          align="center"
          listening={false}
        />
      </Group>
    )
  }

  const crop = getCropProps(
    img.naturalWidth,
    img.naturalHeight,
    element.width,
    element.height,
    element.props.fit,
    element.props.align ?? { horizontal: 'center', vertical: 'center' }
  )

  return (
    <Group
      id={element.id}
      x={element.x}
      y={element.y}
      width={element.width}    // ← explicit attrs on the Group
      height={element.height}  // ← so transformer can read them
      rotation={element.rotation}
      opacity={element.opacity}
      visible={element.visible}
      onClick={onSelect}
      onTap={onSelect}
      {...sharedDragProps}
      // Clip group to element bounds so contain letterbox doesn't overflow
      clipX={0}
      clipY={0}
      clipWidth={element.width}
      clipHeight={element.height}
    >
      <Image
        x={crop.x}
        y={crop.y}
        width={crop.width}
        height={crop.height}
        image={img}
        cropX={crop.cropX}
        cropY={crop.cropY}
        cropWidth={crop.cropWidth}
        cropHeight={crop.cropHeight}
      />
    </Group>
  )
}