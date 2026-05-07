import type { RenderConfig } from '../types/render'
import type {
  Template, TextElement, RectElement, ImageElement
} from '../types/template'

type WorkerMessage = {
  type:     'render'
  index:    number
  rowData:  Record<string, string>
  template: Template
  config:   RenderConfig
  assets:   Record<string, string> // name/id → dataUrl
}

type WorkerResponse =
  | { type: 'done';  index: number; blob: Blob }
  | { type: 'error'; index: number; message: string }

// ── Value resolution ─────────────────────────────────────────────────────────

function resolveTextValue(
  val: any,
  row: Record<string, string>
): string {
  if (!val) return ''
  if (val.type === 'static')  return String(val.value ?? '')
  if (val.type === 'binding') return String(row[val.column ?? ''] ?? '')
  return ''
}

function resolveImageSrc(
  val: any,
  row: Record<string, string>,
  assets: Record<string, string>
): string {
  if (!val) return ''

  if (val.type === 'asset') {
    return assets[val.assetId] ?? ''
  }

  if (val.type === 'binding') {
    const raw = String(row[val.column ?? ''] ?? '').trim()
    if (!raw) {
      // Use placeholder if set
      if (val.placeholder?.assetId) {
        return assets[val.placeholder.assetId] ?? ''
      }
      return ''
    }
    // Try asset lookup — exact name, then without extension
    const rawLower = raw.toLowerCase()
    const noExt    = rawLower.replace(/\.[^/.]+$/, '')
    return assets[rawLower] ?? assets[noExt] ?? ''
  }

  return ''
}

// ── Image loading ────────────────────────────────────────────────────────────

const imageCache = new Map<string, ImageBitmap>()

async function loadBitmap(src: string): Promise<ImageBitmap | null> {
  if (!src) return null
  if (imageCache.has(src)) return imageCache.get(src)!
  try {
    let blob: Blob
    if (src.startsWith('data:')) {
      // Convert data URL to blob
      const res = await fetch(src)
      blob = await res.blob()
    } else {
      const res = await fetch(src)
      blob = await res.blob()
    }
    const bitmap = await createImageBitmap(blob)
    imageCache.set(src, bitmap)
    return bitmap
  } catch {
    return null
  }
}

// ── Drawing helpers ──────────────────────────────────────────────────────────

function drawRoundRect(
  ctx: OffscreenCanvasRenderingContext2D,
  x: number, y: number,
  w: number, h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + w - radius, y)
  ctx.arcTo(x + w, y,     x + w, y + radius,     radius)
  ctx.lineTo(x + w, y + h - radius)
  ctx.arcTo(x + w, y + h, x + w - radius, y + h, radius)
  ctx.lineTo(x + radius, y + h)
  ctx.arcTo(x,     y + h, x,     y + h - radius, radius)
  ctx.lineTo(x,     y + radius)
  ctx.arcTo(x,     y,     x + radius, y,          radius)
  ctx.closePath()
}

function wrapText(
  ctx: OffscreenCanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  if (!text) return ['']
  const lines: string[] = []

  for (const paragraph of text.split('\n')) {
    if (!paragraph) { lines.push(''); continue }
    const words   = paragraph.split(' ')
    let current   = ''

    for (const word of words) {
      const test = current ? `${current} ${word}` : word
      if (ctx.measureText(test).width > maxWidth && current) {
        lines.push(current)
        current = word
      } else {
        current = test
      }
    }
    if (current) lines.push(current)
  }

  return lines.length ? lines : ['']
}

function drawImageFit(
  ctx:    OffscreenCanvasRenderingContext2D,
  bitmap: ImageBitmap,
  x: number, y: number,
  w: number, h: number,
  fit:   'cover' | 'contain' | 'fill',
  align: { horizontal: string; vertical: string }
) {
  const iw = bitmap.width
  const ih = bitmap.height

  if (fit === 'fill') {
    ctx.drawImage(bitmap, x, y, w, h)
    return
  }

  const iRatio = iw / ih
  const bRatio = w  / h

  const hOff = (total: number, used: number): number => {
    if (align.horizontal === 'left')  return 0
    if (align.horizontal === 'right') return total - used
    return (total - used) / 2
  }

  const vOff = (total: number, used: number): number => {
    if (align.vertical === 'top')    return 0
    if (align.vertical === 'bottom') return total - used
    return (total - used) / 2
  }

  if (fit === 'cover') {
    ctx.save()
    ctx.beginPath()
    ctx.rect(x, y, w, h)
    ctx.clip()
    if (iRatio > bRatio) {
      const rw = h * iRatio
      const rh = h
      ctx.drawImage(bitmap, x + hOff(w, rw), y, rw, rh)
    } else {
      const rw = w
      const rh = w / iRatio
      ctx.drawImage(bitmap, x, y + vOff(h, rh), rw, rh)
    }
    ctx.restore()
    return
  }

  // contain
  if (iRatio > bRatio) {
    const rw = w
    const rh = w / iRatio
    ctx.drawImage(bitmap, x, y + vOff(h, rh), rw, rh)
  } else {
    const rh = h
    const rw = h * iRatio
    ctx.drawImage(bitmap, x + hOff(w, rw), y, rw, rh)
  }
}

// ── Main renderer ────────────────────────────────────────────────────────────

async function renderTemplate(
  template: Template,
  row:      Record<string, string>,
  config:   RenderConfig,
  assets:   Record<string, string>
): Promise<Blob> {
  const { canvas } = template
  const pr = config.pixelRatio
  const cw = canvas.width
  const ch = canvas.height

  const offscreen = new OffscreenCanvas(cw * pr, ch * pr)
  const ctx       = offscreen.getContext('2d')!

  // Scale all drawing by pixel ratio
  ctx.scale(pr, pr)

  // Background
  ctx.fillStyle = canvas.background ?? '#ffffff'
  ctx.fillRect(0, 0, cw, ch)

  // Render elements in order (index 0 = bottom layer)
  for (const el of template.elements) {
    if (!el.visible) continue

    ctx.save()
    ctx.globalAlpha = el.opacity ?? 1

    // Konva stores x,y as top-left corner.
    // For rotation we rotate around the element center.
    const rotation = el.rotation ?? 0

    if (rotation !== 0) {
      const cx = el.x + el.width  / 2
      const cy = el.y + el.height / 2
      ctx.translate(cx, cy)
      ctx.rotate((rotation * Math.PI) / 180)
      ctx.translate(-cx, -cy)
    }

    if (el.type === 'rect') {
      const rect = el as RectElement
      const { fill, stroke, strokeWidth, cornerRadius } = rect.props

      if (cornerRadius > 0) {
        drawRoundRect(ctx, el.x, el.y, el.width, el.height, cornerRadius)
        ctx.fillStyle = fill
        ctx.fill()
        if (strokeWidth > 0) {
          ctx.strokeStyle = stroke
          ctx.lineWidth   = strokeWidth
          ctx.stroke()
        }
      } else {
        ctx.fillStyle = fill
        ctx.fillRect(el.x, el.y, el.width, el.height)
        if (strokeWidth > 0) {
          ctx.strokeStyle = stroke
          ctx.lineWidth   = strokeWidth
          ctx.strokeRect(el.x, el.y, el.width, el.height)
        }
      }
    }

    if (el.type === 'text') {
      const text    = el as TextElement
      const content = resolveTextValue(text.props.content, row)

      ctx.fillStyle    = text.props.color
      ctx.font         = `${text.props.fontWeight} ${text.props.fontSize}px ${text.props.fontFamily}, sans-serif`
      ctx.textAlign    = text.props.align as CanvasTextAlign
      ctx.textBaseline = 'top'

      const lineH  = text.props.fontSize * (text.props.lineHeight ?? 1.4)
      const lines  = wrapText(ctx, content, el.width)

      const xPos =
        text.props.align === 'center' ? el.x + el.width / 2 :
        text.props.align === 'right'  ? el.x + el.width     :
        el.x

      let yPos = el.y
      for (const line of lines) {
        if (yPos + lineH > el.y + el.height) break
        ctx.fillText(line, xPos, yPos)
        yPos += lineH
      }
    }

    if (el.type === 'image') {
      const imgEl = el as ImageElement
      const src   = resolveImageSrc(imgEl.props.src, row, assets)

      if (src) {
        const bitmap = await loadBitmap(src)
        if (bitmap) {
          drawImageFit(
            ctx, bitmap,
            el.x, el.y, el.width, el.height,
            imgEl.props.fit ?? 'cover',
            imgEl.props.align ?? { horizontal: 'center', vertical: 'center' }
          )
        }
      }
    }

    ctx.restore()
  }

  const mimeType = config.format === 'jpg' ? 'image/jpeg' : 'image/png'
  const quality  = config.format === 'jpg' ? config.quality : undefined
  return offscreen.convertToBlob({ type: mimeType, quality })
}

// ── Message handler ──────────────────────────────────────────────────────────

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  const { type, index, rowData, template, config, assets } = e.data
  if (type !== 'render') return

  try {
    const blob = await renderTemplate(template, rowData, config, assets)
    self.postMessage({ type: 'done', index, blob } satisfies WorkerResponse)
  } catch (err: any) {
    self.postMessage({
      type:    'error',
      index,
      message: err?.message ?? 'Unknown render error'
    } satisfies WorkerResponse)
  }
}