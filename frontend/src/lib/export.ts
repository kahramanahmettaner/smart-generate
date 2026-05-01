import type Konva from 'konva'

export async function exportToPng(
  stage: Konva.Stage,
  name: string,
  pixelRatio = 2
): Promise<void> {
  await document.fonts.ready  // ensure fonts are loaded before export

  const url = stage.toDataURL({ pixelRatio, mimeType: 'image/png' })
  const a = document.createElement('a')
  a.download = `${name}.png`
  a.href = url
  a.click()
}