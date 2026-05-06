import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import type { Dataset, DataRow, DataColumn } from '../types/dataset'

export async function importFile(file: File): Promise<Dataset> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''

  if (ext === 'csv') return importCsv(file)
  if (ext === 'xlsx' || ext === 'xls') return importExcel(file)
  if (ext === 'json') return importJson(file)

  throw new Error(`Unsupported file type: .${ext}`)
}

function importCsv(file: File): Promise<Dataset> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header:        true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      complete: (result) => {
        resolve(buildDataset(
          result.meta.fields ?? [],
          result.data as DataRow[],
          file.name
        ))
      },
      error: (err) => reject(new Error(err.message)),
    })
  })
}

async function importExcel(file: File): Promise<Dataset> {
  const buffer    = await file.arrayBuffer()
  const workbook  = XLSX.read(buffer, { type: 'array' })
  const sheetName = workbook.SheetNames[0]
  const sheet     = workbook.Sheets[sheetName]
  const raw       = XLSX.utils.sheet_to_json<DataRow>(sheet, {
    defval: '',
    raw:    false, // keep everything as strings
  })

  const columns = raw.length > 0
    ? Object.keys(raw[0]).map((k) => k.trim())
    : []

  // Normalize keys (trim whitespace)
  const rows = raw.map((row) => {
    const clean: DataRow = {}
    Object.entries(row).forEach(([k, v]) => {
      clean[k.trim()] = String(v ?? '')
    })
    return clean
  })

  return buildDataset(columns, rows, file.name)
}

async function importJson(file: File): Promise<Dataset> {
  const text = await file.text()
  let parsed: unknown

  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('Invalid JSON file')
  }

  // Support array of objects or { data: [...] }
  const raw: DataRow[] = Array.isArray(parsed)
    ? parsed
    : Array.isArray((parsed as any).data)
      ? (parsed as any).data
      : []

  if (raw.length === 0) throw new Error('No data rows found in JSON')

  const columns = Object.keys(raw[0]).map((k) => k.trim())
  const rows    = raw.map((row) => {
    const clean: DataRow = {}
    Object.entries(row).forEach(([k, v]) => {
      clean[k.trim()] = String(v ?? '')
    })
    return clean
  })

  return buildDataset(columns, rows, file.name)
}

function buildDataset(
  keys:     string[],
  rows:     DataRow[],
  fileName: string
): Dataset {
  const columns: DataColumn[] = keys.map((key) => ({ key, label: key }))
  return { columns, rows, fileName, importedAt: Date.now() }
}

export function exportDatasetAsCsv(dataset: Dataset): void {
  const csv  = Papa.unparse({
    fields: dataset.columns.map((c) => c.key),
    data:   dataset.rows,
  })
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.download = dataset.fileName.replace(/\.[^/.]+$/, '') + '_export.csv'
  a.href     = url
  a.click()
  URL.revokeObjectURL(url)
}