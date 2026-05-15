import { Image, Rect, Text, Group } from 'react-konva'
import { useEffect, useState } from 'react'
import type Konva from 'konva'
import type { ImageAlign, ImageElement } from '../../types/template'
import type { ImageAsset } from '../../types/asset'
import { useAssetStore } from '../../store/useAssetStore'

type Props = {
  element:    ImageElement
  isSelected: boolean
  onSelect:   (additive: boolean) => void
  onChange:   (changes: Partial<ImageElement>) => void
  onDragMove: (node: Konva.Node) => void
  onDragEnd:  (node: Konva.Node) => void
  snapToGrid: boolean
  gridSize:   number
  dataRow?:   Record<string, string>
}

function resolveSrc(
  src: ImageElement['props']['src'],
  getAsset: (id: string) => ImageAsset | undefined,
  getAssetByName: (name: string) => ImageAsset | undefined,
  dataRow?: Record<string, string>
): string | null {
  if (src.type === 'none') return null
  if (src.type === 'asset') return getAsset(src.assetId)?.url ?? null
  if (src.type === 'binding') {
    const rawValue = dataRow?.[src.column]
    if (!rawValue) {
      return src.placeholder?.assetId ? getAsset(src.placeholder.assetId)?.url ?? null : null
    }
    const nameWithoutExt = rawValue.trim().replace(/\.[^/.]+$/, '')
    return getAssetByName(rawValue.trim())?.url
        ?? getAssetByName(nameWithoutExt)?.url
        ?? (rawValue.startsWith('http') || rawValue.startsWith('data:') ? rawValue : null)
  }
  return null
}

function getCropProps(
  imgW: number, imgH: number, boxW: number, boxH: number,
  fit: 'cover' | 'contain' | 'fill',
  align: ImageAlign = { horizontal: 'center', vertical: 'center' }
) {
  if (!imgW || !imgH || !boxW || !boxH) {
    return { cropX: 0, cropY: 0, cropWidth: imgW || 1, cropHeight: imgH || 1,
             x: 0, y: 0, width: boxW || 1, height: boxH || 1 }
  }
  if (fit === 'fill') {
    return { cropX: 0, cropY: 0, cropWidth: imgW, cropHeight: imgH,
             x: 0, y: 0, width: boxW, height: boxH }
  }
  const imgRatio = imgW / imgH
  const boxRatio = boxW / boxH
  const hOff = (total: number, used: number) =>
    align.horizontal === 'left' ? 0 : align.horizontal === 'right' ? total - used : (total - used) / 2
  const vOff = (total: number, used: number) =>
    align.vertical === 'top' ? 0 : align.vertical === 'bottom' ? total - used : (total - used) / 2

  if (fit === 'cover') {
    if (imgRatio > boxRatio) {
      const cropW = imgH * boxRatio
      return { cropX: hOff(imgW, cropW), cropY: 0, cropWidth: cropW, cropHeight: imgH,
               x: 0, y: 0, width: boxW, height: boxH }
    } else {
      const cropH = imgW / boxRatio
      return { cropX: 0, cropY: vOff(imgH, cropH), cropWidth: imgW, cropHeight: cropH,
               x: 0, y: 0, width: boxW, height: boxH }
    }
  }
  if (imgRatio > boxRatio) {
    const renderH = boxW / imgRatio
    return { cropX: 0, cropY: 0, cropWidth: imgW, cropHeight: imgH,
             x: 0, y: vOff(boxH, renderH), width: boxW, height: renderH }
  } else {
    const renderW = boxH * imgRatio
    return { cropX: 0, cropY: 0, cropWidth: imgW, cropHeight: imgH,
             x: hOff(boxW, renderW), y: 0, width: renderW, height: boxH }
  }
}

type ImageStatus = 'unset' | 'missing' | 'loading' | 'ready'

export function ImageElementRenderer({
  element, isSelected, onSelect, onChange, onDragMove, onDragEnd, dataRow
}: Props) {
  const { getAsset, getAssetByName } = useAssetStore()
  const [img,    setImg]    = useState<HTMLImageElement | null>(null)
  const [status, setStatus] = useState<ImageStatus>('unset')

  const resolvedSrc = resolveSrc(element.props.src, getAsset, getAssetByName, dataRow)
  const expectedSrc = element.props.src

  useEffect(() => {
    if (expectedSrc.type === 'none') { setStatus('unset'); setImg(null); return }
    if (expectedSrc.type === 'asset' && !getAsset(expectedSrc.assetId)) {
      setStatus('missing'); setImg(null); return
    }
    if (!resolvedSrc) { setStatus('unset'); setImg(null); return }
    setStatus('loading')
    const image       = new window.Image()
    image.crossOrigin = 'anonymous'
    image.src         = resolvedSrc
    image.onload      = () => { setImg(image); setStatus('ready') }
    image.onerror     = () => { setImg(null);  setStatus('missing') }
    return () => { image.onload = null; image.onerror = null }
  }, [resolvedSrc, expectedSrc, getAsset])

  const groupProps = {
    id:        element.id,
    x:         element.x,
    y:         element.y,
    width:     element.width,
    height:    element.height,
    rotation:  element.rotation,
    opacity:   element.opacity,
    visible:   element.visible,
    draggable: !element.locked,
    onClick:   (e: Konva.KonvaEventObject<MouseEvent>) =>
      onSelect(e.evt.shiftKey || e.evt.metaKey || e.evt.ctrlKey),
    onTap:     () => onSelect(false),
    onDragMove: (e: Konva.KonvaEventObject<DragEvent>) => onDragMove(e.target),
    onDragEnd:  (e: Konva.KonvaEventObject<DragEvent>) => onDragEnd(e.target),
  }

  if (status === 'ready' && img) {
    const crop = getCropProps(
      img.naturalWidth, img.naturalHeight,
      element.width, element.height,
      element.props.fit,
      element.props.align ?? { horizontal: 'center', vertical: 'center' }
    )
    return (
      <Group {...groupProps} clipX={0} clipY={0} clipWidth={element.width} clipHeight={element.height}>
        <Rect width={element.width} height={element.height} fill="transparent" />
        <Image x={crop.x} y={crop.y} width={crop.width} height={crop.height}
          image={img} cropX={crop.cropX} cropY={crop.cropY}
          cropWidth={crop.cropWidth} cropHeight={crop.cropHeight} listening={false} />
      </Group>
    )
  }

  const p = getPlaceholderConfig(status, element.props.src)
  return (
    <Group {...groupProps}>
      <Rect width={element.width} height={element.height}
        fill={p.fill} stroke={isSelected ? '#4A90D9' : p.stroke}
        strokeWidth={1.5} dash={p.dash} />
      <Text y={element.height / 2 - 20} width={element.width}
        text={p.icon} fontSize={26} fill={p.iconColor} align="center" listening={false} />
      <Text y={element.height / 2 + 12} width={element.width}
        text={p.label} fontSize={11} fill={p.labelColor} align="center" listening={false} />
    </Group>
  )
}

function getPlaceholderConfig(status: ImageStatus, src: ImageElement['props']['src']) {
  if (status === 'missing') return {
    fill: '#FEF2F2', stroke: '#FCA5A5', dash: [6, 3] as number[],
    icon: '⚠', iconColor: '#EF4444', label: 'image not found', labelColor: '#EF4444'
  }
  if (status === 'loading') return {
    fill: '#F5F4F2', stroke: '#CCCCCC', dash: [] as number[],
    icon: '⊙', iconColor: '#AAAAAA', label: 'loading…', labelColor: '#AAAAAA'
  }
  if (src.type === 'binding') {
    const col = src.column
    return {
      fill: '#EEF2FF', stroke: '#C7D2FE', dash: [6, 3] as number[],
      icon: '{ }', iconColor: '#6366F1',
      label: col ? `{{${col}}}` : 'no column set', labelColor: '#6366F1'
    }
  }
  return {
    fill: '#F5F4F2', stroke: '#CCCCCC', dash: [6, 3] as number[],
    icon: '⬚', iconColor: '#CCCCCC', label: 'no image set', labelColor: '#AAAAAA'
  }
}
