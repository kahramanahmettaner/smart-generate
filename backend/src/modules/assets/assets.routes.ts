import path from 'path'
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { requireAuth } from '../../auth/middleware.js'
import { listAssets, uploadAsset, deleteAsset } from './assets.service.js'
import { readFile } from './storage.js'
import { NotFoundError, BadRequestError } from '../../lib/errors.js'
import { db } from '../../db/client.js'
import { projects } from '../../db/schema.js'
import { eq, and } from 'drizzle-orm'

// Mime types we accept for asset uploads
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export async function assetsRoutes(app: FastifyInstance): Promise<void> {

  // ── GET /projects/:pid/assets ─────────────────────────────────────────────
  app.get<{ Params: { pid: string } }>(
    '/projects/:pid/assets',
    { preHandler: requireAuth },
    async (req: FastifyRequest<{ Params: { pid: string } }>) => {
      return listAssets(req.params.pid, req.user.userId)
    },
  )

  // ── POST /projects/:pid/assets ────────────────────────────────────────────
  // Accepts multipart/form-data with fields:
  //   file   — the image file
  //   name   — display name without extension (optional, defaults to filename stem)
  //   width  — image width in px (optional)
  //   height — image height in px (optional)
  app.post<{ Params: { pid: string } }>(
    '/projects/:pid/assets',
    { preHandler: requireAuth },
    async (req: FastifyRequest<{ Params: { pid: string } }>, reply: FastifyReply) => {
      const data = await req.file()
      if (!data) throw new BadRequestError('No file uploaded')

      if (!ALLOWED_MIME_TYPES.includes(data.mimetype)) {
        throw new BadRequestError(`File type not allowed. Accepted: ${ALLOWED_MIME_TYPES.join(', ')}`)
      }

      const buffer = await data.toBuffer()

      if (buffer.byteLength > MAX_FILE_SIZE) {
        throw new BadRequestError('File too large. Maximum size is 10MB')
      }

      // Name field from form data, or fall back to filename without extension
      const rawName = (data.fields.name as { value: string } | undefined)?.value
      const stem = path.basename(data.filename, path.extname(data.filename))
      const name = (rawName ?? stem).trim()

      const widthField = (data.fields.width as { value: string } | undefined)?.value
      const heightField = (data.fields.height as { value: string } | undefined)?.value

      const asset = await uploadAsset({
        projectId: req.params.pid,
        userId: req.user.userId,
        name,
        filename: data.filename,
        buffer,
        mimeType: data.mimetype,
        width:  widthField  ? parseInt(widthField,  10) : undefined,
        height: heightField ? parseInt(heightField, 10) : undefined,
        sizeBytes: buffer.byteLength,
      })

      return reply.status(201).send(asset)
    },
  )

  // ── DELETE /projects/:pid/assets/:id ──────────────────────────────────────
  app.delete<{ Params: { pid: string; id: string } }>(
    '/projects/:pid/assets/:id',
    { preHandler: requireAuth },
    async (req: FastifyRequest<{ Params: { pid: string; id: string } }>, reply: FastifyReply) => {
      await deleteAsset(req.params.id, req.user.userId)
      return reply.status(204).send()
    },
  )

  // ── GET /files/* ────────────────────────────────────────────────────────
  // Serves files from local disk storage behind auth + ownership check.
  // TODO (R2): remove this route entirely — replace with signed R2 URLs.
  //
  // Key format: projects/<projectId>/assets/<filename>
  // We extract the projectId from the key and verify the user owns that project.
  app.get<{ Params: { '*': string } }>(
    '/files/*',
    { preHandler: requireAuth },
    async (req: FastifyRequest<{ Params: { '*': string } }>, reply: FastifyReply) => {
      const key = req.params['*']
      if (!key) throw new NotFoundError('File not found')

      // Extract projectId from key: "projects/<projectId>/..."
      const parts = key.split('/')
      const projectId = parts[1]
      if (parts[0] !== 'projects' || !projectId) throw new NotFoundError('File not found')

      // Verify the requesting user owns this project
      const project = await db.query.projects.findFirst({
        where: and(eq(projects.id, projectId), eq(projects.userId, req.user.userId)),
      })
      if (!project) throw new NotFoundError('File not found')

      try {
        const buffer = await readFile(key)

        const ext = path.extname(key).toLowerCase()
        const mimeMap: Record<string, string> = {
          '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
          '.png': 'image/png',  '.webp': 'image/webp',
          '.gif': 'image/gif',  '.svg': 'image/svg+xml',
        }
        const contentType = mimeMap[ext] ?? 'application/octet-stream'

        return reply
          .header('Content-Type', contentType)
          .header('Cache-Control', 'private, max-age=3600')
          .send(buffer)
      } catch {
        throw new NotFoundError('File not found')
      }
    },
  )
}