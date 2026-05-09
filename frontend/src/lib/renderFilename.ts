import type { RenderConfig } from '../types/render'

export function buildFileName(
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

export function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100)
}