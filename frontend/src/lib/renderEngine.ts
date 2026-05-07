import JSZip from 'jszip'
import type { RenderConfig, RenderJob, RenderProgress } from '../types/render'
import type { Template } from '../types/template'
import type { DataRow } from '../types/dataset'
import type { ImageAsset } from '../types/asset'

type ProgressCallback = (progress: RenderProgress) => void

export async function runRenderJob(
  template:  Template,
  rows:      DataRow[],
  assets:    Record<string, ImageAsset>,
  config:    RenderConfig,
  onProgress: ProgressCallback
): Promise<void> {
  const total  = rows.length

  onProgress({ status: 'rendering', current: 0, total, message: 'Starting render…' })

    // Build asset map for worker: name variants → dataUrl
    const assetMap: Record<string, string> = {}
    Object.values(assets).forEach((asset) => {
    // by id
    assetMap[asset.id] = asset.dataUrl

    // by name as-is (lowercase)
    assetMap[asset.name.toLowerCase()] = asset.dataUrl

    // by name without extension (in case name somehow has one)
    const nameNoExt = asset.name.replace(/\.[^/.]+$/, '').toLowerCase()
    if (nameNoExt !== asset.name.toLowerCase()) {
        assetMap[nameNoExt] = asset.dataUrl
    }
    })

  const blobs: { name: string; blob: Blob }[] = []

  // Create worker
  const worker = new Worker(
    new URL('../workers/renderWorker.ts', import.meta.url),
    { type: 'module' }
  )

  // Process jobs sequentially
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]

    const fileName = buildFileName(row, config, i)

    onProgress({
      status:  'rendering',
      current: i + 1,
      total,
      message: `Rendering ${i + 1} of ${total}…`,
    })

    const blob = await new Promise<Blob>((resolve, reject) => {
      worker.onmessage = (e) => {
        if (e.data.type === 'done')  resolve(e.data.blob)
        if (e.data.type === 'error') reject(new Error(e.data.message))
      }
      worker.onerror = (e) => reject(new Error(e.message))

      worker.postMessage({
        type:     'render',
        index:    i,          // ← flat, not nested in job object
        rowData:  row,
        template,
        config,
        assets:   assetMap,
      })
    })

    blobs.push({ name: fileName, blob })
  }

  worker.terminate()

  if (config.output === 'zip') {
    onProgress({ status: 'packaging', current: total, total, message: 'Packaging ZIP…' })
    await packageZip(blobs, template.name)
  }

  if (config.output === 'pdf') {
    onProgress({ status: 'packaging', current: total, total, message: 'Building PDF…' })
    await packagePdf(blobs, template.name, template.canvas.width, template.canvas.height, config.pixelRatio)
  }

  onProgress({ status: 'done', current: total, total, message: `${total} images rendered` })
}

function buildFileName(
  row:    Record<string, string>,
  config: RenderConfig,
  index:  number
): string {
  const ext  = config.format === 'jpg' ? 'jpg' : 'png'
  const base = config.fileNameColumn && row[config.fileNameColumn]
    ? sanitizeFileName(row[config.fileNameColumn])
    : `${config.fileNamePrefix}_${String(index + 1).padStart(4, '0')}`
  return `${base}.${ext}`
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100)
}

async function packageZip(
  blobs:    { name: string; blob: Blob }[],
  baseName: string
): Promise<void> {
  const zip = new JSZip()
  blobs.forEach(({ name, blob }) => zip.file(name, blob))
  const zipBlob = await zip.generateAsync({
    type:               'blob',
    compression:        'DEFLATE',
    compressionOptions: { level: 6 },
  })
  downloadBlob(zipBlob, `${baseName}.zip`)
}

async function packagePdf(
  blobs:     { name: string; blob: Blob }[],
  baseName:  string,
  canvasW:   number,
  canvasH:   number,
  pixelRatio: number
): Promise<void> {
  // Use jsPDF for PDF packaging
  const { jsPDF } = await import('jspdf')
  const w   = canvasW
  const h   = canvasH
  const pdf = new jsPDF({
    orientation: w > h ? 'landscape' : 'portrait',
    unit:        'px',
    format:      [w, h],
  })

  for (let i = 0; i < blobs.length; i++) {
    if (i > 0) pdf.addPage([w, h], w > h ? 'landscape' : 'portrait')
    const dataUrl = await blobToDataUrl(blobs[i].blob)
    pdf.addImage(dataUrl, 'PNG', 0, 0, w, h)
  }

  pdf.save(`${baseName}.pdf`)
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader   = new FileReader()
    reader.onload  = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

function downloadBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.download = name
  a.href     = url
  a.click()
  URL.revokeObjectURL(url)
}