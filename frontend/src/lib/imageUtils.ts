export function fitDimensions(
  imgW: number, imgH: number,
  canvasW: number, canvasH: number,
  options: {
    keepOriginalResolution: boolean
    keepAspectRatio:        boolean
    maxFraction?:           number
  }
): { width: number; height: number } {
  if (options.keepOriginalResolution) {
    return { width: imgW, height: imgH }
  }
  if (!options.keepAspectRatio) {
    return {
      width:  Math.round(canvasW * (options.maxFraction ?? 0.6)),
      height: Math.round(canvasH * (options.maxFraction ?? 0.6)),
    }
  }
  const maxW  = canvasW * (options.maxFraction ?? 0.6)
  const maxH  = canvasH * (options.maxFraction ?? 0.6)
  const ratio = imgW / imgH
  let w = maxW
  let h = w / ratio
  if (h > maxH) { h = maxH; w = h * ratio }
  return { width: Math.round(w), height: Math.round(h) }
}

export function stripExtension(name: string): string {
  return name.replace(/\.[^/.]+$/, '')
}

export function guessMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase()
  const map: Record<string, string> = {
    jpg:  'image/jpeg',
    jpeg: 'image/jpeg',
    png:  'image/png',
    webp: 'image/webp',
    svg:  'image/svg+xml',
    gif:  'image/gif',
  }
  return map[ext ?? ''] ?? 'image/png'
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader   = new FileReader()
    reader.onload  = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

export function getImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img  = new Image()
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
    img.src    = dataUrl
  })
}

export function fileNameWithoutExtension(name: string): string {
  return name.replace(/\.[^/.]+$/, '')
}