import Papa from 'papaparse'
import type { Dataset } from '../types/dataset'

// exportDatasetAsCsv — exports the currently loaded dataset to CSV
export function exportDatasetAsCsv(dataset: Dataset): void {
  const csv  = Papa.unparse({
    fields: dataset.columns.map((c) => c.key),
    data:   dataset.rows,
  })
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.download = `${dataset.name}_export.csv`
  a.href     = url
  a.click()
  URL.revokeObjectURL(url)
}