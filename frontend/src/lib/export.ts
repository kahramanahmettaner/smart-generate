import type Konva from 'konva'

export async function exportToPng(
  stage: Konva.Stage,
  name: string,
  pixelRatio = 2
): Promise<void> {
  await document.fonts.ready

  // Hide transformer and selection indicators before export
  const transformer = stage.findOne('Transformer')
  transformer?.hide()
  stage.batchDraw()

  const url = stage.toDataURL({ pixelRatio, mimeType: 'image/png' })

  // Restore transformer immediately after
  transformer?.show()
  stage.batchDraw()

  const a = document.createElement('a')
  a.download = `${name}.png`
  a.href = url
  a.click()
}