import JSZip from 'jszip'

export async function packageZip(
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

export async function packagePdf(
  blobs:     { name: string; blob: Blob }[],
  baseName:  string,
  canvasW:   number,
  canvasH:   number
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

export function downloadBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.download = name
  a.href     = url
  a.click()
  URL.revokeObjectURL(url)
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader   = new FileReader()
    reader.onload  = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}