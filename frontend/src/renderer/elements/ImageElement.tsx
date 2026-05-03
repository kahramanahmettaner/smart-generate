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
  if (src.type === 'none') return null

  if (src.type === 'asset') {
    return getAsset(src.assetId)?.dataUrl ?? null
  }

  if (src.type === 'binding') {
    // Real data row value takes priority
    const rowValue = dataRow?.[src.column]
    if (rowValue) return rowValue

    // Fall back to placeholder asset if set
    if (src.placeholder?.assetId) {
      return getAsset(src.placeholder.assetId)?.dataUrl ?? null
    }

    return null
  }

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

type ImageStatus = 'unset' | 'missing' | 'loading' | 'ready'

export function ImageElementRenderer({
  element, isSelected, onSelect, onChange, dataRow
}: Props) {
  const { getAsset }  = useAssetStore()
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [status, setStatus] = useState<ImageStatus>('unset')

  const resolvedSrc = resolveSrc(element.props.src, getAsset, dataRow)

  // Determine initial status based on src type
  const expectedSrc = element.props.src

  useEffect(() => {
    if (expectedSrc.type === 'none') {
      setStatus('unset')
      setImg(null)
      return
    }

    if (expectedSrc.type === 'asset') {
      const asset = getAsset(expectedSrc.assetId)
      if (!asset) {
        // Reference exists but asset not in store
        setStatus('missing')
        setImg(null)
        return
      }
    }

    if (!resolvedSrc) {
      setStatus('unset')
      setImg(null)
      return
    }

    setStatus('loading')
    const image       = new window.Image()
    image.crossOrigin = 'anonymous'
    image.src         = resolvedSrc
    image.onload      = () => { setImg(image); setStatus('ready') }
    image.onerror     = () => { setImg(null);  setStatus('missing') }
    return () => { image.onload = null; image.onerror = null }
  }, [resolvedSrc, expectedSrc, getAsset])

  const sharedGroupProps = {
    id:        element.id,
    x:         element.x,
    y:         element.y,
    width:     element.width,
    height:    element.height,
    rotation:  element.rotation,
    opacity:   element.opacity,
    visible:   element.visible,
    draggable: !element.locked,
    onClick:   onSelect,
    onTap:     onSelect,
    onDragEnd: (e: any) => onChange({
      x: Math.round(e.target.x()),
      y: Math.round(e.target.y()),
    } as Partial<ImageElement>),
  }

  // Ready — render image with fit/align
  if (status === 'ready' && img) {
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
      {...sharedGroupProps}
      clipX={0}
      clipY={0}
      clipWidth={element.width}
      clipHeight={element.height}
    >
      {/* Transparent hit area — makes the whole frame interactable */}
      <Rect
        width={element.width}
        height={element.height}
        fill="transparent"
      />
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
        listening={false}
      />
    </Group>
  )
}

  // All non-ready states — placeholder with contextual message
  const placeholderConfig = getPlaceholderConfig(status, element.props.src)

  // Placeholder state
  return (
    <Group {...sharedGroupProps}>
      <Rect
        width={element.width}
        height={element.height}
        fill={placeholderConfig.fill}
        stroke={isSelected ? '#4A90D9' : placeholderConfig.stroke}
        strokeWidth={1.5}
        dash={placeholderConfig.dash}
      />
      <Text
        y={element.height / 2 - 20}
        width={element.width}
        text={placeholderConfig.icon}
        fontSize={26}
        fill={placeholderConfig.iconColor}
        align="center"
        listening={false}
      />
      <Text
        y={element.height / 2 + 12}
        width={element.width}
        text={placeholderConfig.label}
        fontSize={11}
        fill={placeholderConfig.labelColor}
        align="center"
        listening={false}
      />
    </Group>
  )
}

// ─── Placeholder appearance per status ──────────────────────────────────────

type PlaceholderConfig = {
  fill:       string
  stroke:     string
  dash:       number[]
  icon:       string
  iconColor:  string
  label:      string
  labelColor: string
}

function getPlaceholderConfig(
  status: ImageStatus,
  src: ImageElement['props']['src']
): PlaceholderConfig {
  if (status === 'missing') {
    return {
      fill:       '#FEF2F2',
      stroke:     '#FCA5A5',
      dash:       [6, 3],
      icon:       '⚠',
      iconColor:  '#EF4444',
      label:      'image not found',
      labelColor: '#EF4444',
    }
  }

  if (status === 'loading') {
    return {
      fill:       '#F5F4F2',
      stroke:     '#CCCCCC',
      dash:       [],
      icon:       '⊙',
      iconColor:  '#AAAAAA',
      label:      'loading…',
      labelColor: '#AAAAAA',
    }
  }

  // unset
  if (src.type === 'binding') {
    const col = src.type === 'binding' ? src.column : ''
    return {
      fill:       '#EEF2FF',
      stroke:     '#C7D2FE',
      dash:       [6, 3],
      icon:       '{ }',
      iconColor:  '#6366F1',
      label:      col ? `{{${col}}}` : 'no column set',
      labelColor: '#6366F1',
    }
  }

  return {
    fill:       '#F5F4F2',
    stroke:     '#CCCCCC',
    dash:       [6, 3],
    icon:       '⬚',
    iconColor:  '#CCCCCC',
    label:      'no image set',
    labelColor: '#AAAAAA',
  }
}