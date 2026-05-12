export type DataRow    = Record<string, string>
export type DataColumn = {
  key:   string
  label: string
}

export type Dataset = {
  id:        string
  projectId: string
  name:      string
  columns:   DataColumn[]
  rows:      DataRow[]
  rowCount:  number
  createdAt: string
  updatedAt: string
}

// Summary version returned by list endpoint (no rows)
export type DatasetSummary = Omit<Dataset, 'rows'>
