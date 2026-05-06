export type DataRow    = Record<string, string>
export type DataColumn = {
  key:   string
  label: string
}

export type Dataset = {
  columns:  DataColumn[]
  rows:     DataRow[]
  fileName: string
  importedAt: number
}