import { eq, and } from 'drizzle-orm'
import { db } from '../../db/client.js'
import { assets, projects, type Asset } from '../../db/schema.js'
import { writeFile, deleteFile } from './storage.js'
import { NotFoundError, ConflictError } from '../../lib/errors.js'

// ── Helpers ───────────────────────────────────────────────────────────────────

async function assertProjectOwnership(projectId: string, userId: string): Promise<void> {
  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, projectId), eq(projects.userId, userId)),
  })
  if (!project) throw new NotFoundError('Project not found')
}

function buildStorageKey(projectId: string, filename: string): string {
  // e.g. "projects/abc-123/assets/hero.png"
  return `projects/${projectId}/assets/${filename}`
}

// ── Exported service functions ────────────────────────────────────────────────

export async function listAssets(projectId: string, userId: string): Promise<Asset[]> {
  await assertProjectOwnership(projectId, userId)

  return db.query.assets.findMany({
    where: eq(assets.projectId, projectId),
    orderBy: (a, { desc }) => [desc(a.createdAt)],
  })
}

export interface UploadAssetInput {
  projectId: string
  userId: string
  name: string        // display name without extension (e.g. "hero")
  filename: string    // original filename with extension (e.g. "hero.png")
  buffer: Buffer
  mimeType: string
  width?: number
  height?: number
  sizeBytes: number
}

export async function uploadAsset(input: UploadAssetInput): Promise<Asset> {
  const { projectId, userId, name, filename, buffer, mimeType, width, height, sizeBytes } = input

  await assertProjectOwnership(projectId, userId)

  // Enforce unique name per project (mirrors frontend behavior)
  const existing = await db.query.assets.findFirst({
    where: and(eq(assets.projectId, projectId), eq(assets.name, name)),
  })
  if (existing) throw new ConflictError(`Asset with name "${name}" already exists in this project`)

  const storageKey = buildStorageKey(projectId, filename)
  const url = await writeFile(storageKey, buffer, mimeType)

  const [asset] = await db
    .insert(assets)
    .values({ projectId, name, storageKey, url, width, height, sizeBytes, mimeType })
    .returning()

  return asset
}

export async function deleteAsset(assetId: string, userId: string): Promise<void> {
  // Find asset and verify ownership via project
  const asset = await db.query.assets.findFirst({
    where: eq(assets.id, assetId),
    with: { project: true },
  })

  if (!asset) throw new NotFoundError('Asset not found')
  if (asset.project.userId !== userId) throw new NotFoundError('Asset not found')

  await deleteFile(asset.storageKey)
  await db.delete(assets).where(eq(assets.id, assetId))
}