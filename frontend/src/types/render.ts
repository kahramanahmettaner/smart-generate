export type RenderFormat = 'png' | 'jpg'
export type RenderOutput = 'zip' | 'pdf'

export type RenderConfig = {
  format:     RenderFormat
  output:     RenderOutput
  quality:    number        // 0.1–1.0 for jpg, ignored for png
  pixelRatio: number        // 1, 2, or 3
  fileNameColumn?: string   // optional column to use for file names
  fileNamePrefix:  string   // fallback prefix e.g. "image"
}

export type RenderJob = {
  index:    number
  total:    number
  rowData:  Record<string, string>
}

export type RenderProgress = {
  status:    'idle' | 'rendering' | 'packaging' | 'done' | 'error'
  current:   number
  total:     number
  message:   string
  error?:    string
}