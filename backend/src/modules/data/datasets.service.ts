import { eq, and } from 'drizzle-orm'
import { db } from '../../db/client.js'
import { datasets, projects, type Dataset } from '../../db/schema.js'
import { writeFile, readFile, deleteFile } from '../assets/storage.js'
import { NotFoundError, BadRequestError } from '../../lib/errors.js'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DataColumn {
  key: string
  label: string
}

export type DataRow = Record<string, string>

export interface DatasetWithRows extends Dataset {
  rows: DataRow[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function assertProjectOwnership(projectId: string, userId: string): Promise<void> {
  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, projectId), eq(projects.userId, userId)),
  })
  if (!project) throw new NotFoundError('Project not found')
}

function buildStorageKey(projectId: string, datasetId: string): string {
  return `projects/${projectId}/datasets/${datasetId}.json`
}

/**
 * Parse a CSV or Excel buffer into columns + rows.
 * Mirrors the frontend's importData.ts logic so the data format is identical.
 */
function parseFile(
  buffer: Buffer,
  mimeType: string,
  filename: string,
): { columns: DataColumn[]; rows: DataRow[] } {
  let rawRows: Record<string, unknown>[]

  const isExcel =
    mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mimeType === 'application/vnd.ms-excel' ||
    filename.endsWith('.xlsx') ||
    filename.endsWith('.xls')

  if (isExcel) {
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    if (!sheetName) throw new BadRequestError('Excel file has no sheets')
    rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName])
  } else {
    const text = buffer.toString('utf-8')
    const result = Papa.parse<Record<string, unknown>>(text, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false, // keep everything as strings — same as frontend
    })
    if (result.errors.length > 0) {
      throw new BadRequestError(`CSV parse error: ${result.errors[0].message}`)
    }
    rawRows = result.data
  }

  if (rawRows.length === 0) throw new BadRequestError('File has no data rows')

  const keys = Object.keys(rawRows[0])
  const columns: DataColumn[] = keys.map((key) => ({ key, label: key }))
  const rows: DataRow[] = rawRows.map((raw) =>
    Object.fromEntries(keys.map((k) => [k, String(raw[k] ?? '')])),
  )

  return { columns, rows }
}

// ── Exported service functions ────────────────────────────────────────────────

export async function listDatasets(projectId: string, userId: string): Promise<Dataset[]> {
  await assertProjectOwnership(projectId, userId)

  return db.query.datasets.findMany({
    where: eq(datasets.projectId, projectId),
    orderBy: (d, { desc }) => [desc(d.createdAt)],
  })
}

export async function getDataset(
  datasetId: string,
  projectId: string,
  userId: string,
): Promise<DatasetWithRows> {
  await assertProjectOwnership(projectId, userId)

  const dataset = await db.query.datasets.findFirst({
    where: and(eq(datasets.id, datasetId), eq(datasets.projectId, projectId)),
  })
  if (!dataset) throw new NotFoundError('Dataset not found')

  // Load rows from file
  const buffer = await readFile(dataset.storageKey)
  const rows: DataRow[] = JSON.parse(buffer.toString('utf-8'))

  return { ...dataset, rows }
}

export interface UploadDatasetInput {
  projectId: string
  userId: string
  name: string
  buffer: Buffer
  mimeType: string
  filename: string
}

export async function uploadDataset(input: UploadDatasetInput): Promise<Dataset> {
  const { projectId, userId, name, buffer, mimeType, filename } = input

  await assertProjectOwnership(projectId, userId)

  const { columns, rows } = parseFile(buffer, mimeType, filename)

  // Insert metadata row first to get the generated UUID for the storage key
  const [dataset] = await db
    .insert(datasets)
    .values({
      projectId,
      name: name.trim(),
      storageKey: 'pending', // temporary — updated right after
      columns,
      rowCount: rows.length,
    })
    .returning()

  // Build storage key using the real dataset ID, then write rows to disk
  const storageKey = buildStorageKey(projectId, dataset.id)
  const rowsJson = JSON.stringify(rows)
  await writeFile(storageKey, Buffer.from(rowsJson), 'application/json')

  // Update the record with the real storage key
  const [updated] = await db
    .update(datasets)
    .set({ storageKey })
    .where(eq(datasets.id, dataset.id))
    .returning()

  return updated
}

export async function deleteDataset(
  datasetId: string,
  projectId: string,
  userId: string,
): Promise<void> {
  await assertProjectOwnership(projectId, userId)

  const dataset = await db.query.datasets.findFirst({
    where: and(eq(datasets.id, datasetId), eq(datasets.projectId, projectId)),
  })
  if (!dataset) throw new NotFoundError('Dataset not found')

  // Delete file first, then DB row
  await deleteFile(dataset.storageKey)
  await db.delete(datasets).where(eq(datasets.id, datasetId))
}