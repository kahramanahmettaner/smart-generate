import type { RenderConfig, RenderProgress } from '../types/render'
import type { Template } from '../types/template'
import type { DataRow } from '../types/dataset'
import type { ImageAsset } from '../types/asset'
import { packagePdf, packageZip } from './renderPackage'
import { buildFileName } from './renderFilename'

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
    await packagePdf(blobs, template.name, template.canvas.width, template.canvas.height)
  }

  onProgress({ status: 'done', current: total, total, message: `${total} images rendered` })
}



