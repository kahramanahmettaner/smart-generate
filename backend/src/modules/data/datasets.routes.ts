import path from 'path'
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { requireAuth } from '../../auth/middleware.js'
import { listDatasets, getDataset, uploadDataset, deleteDataset } from './datasets.service.js'
import { BadRequestError } from '../../lib/errors.js'

const ALLOWED_MIME_TYPES = [
  'text/csv',
  'text/plain',
  'application/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]

const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB

type WithPid   = { Params: { pid: string } }
type WithPidId = { Params: { pid: string; id: string } }

export async function datasetsRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireAuth)

  // ── GET /projects/:pid/datasets ───────────────────────────────────────────
  // Returns list without rows (rows can be large — fetch on demand)
  app.get<WithPid>('/projects/:pid/datasets',
    async (req: FastifyRequest<WithPid>) => {
      return listDatasets(req.params.pid, req.user.userId)
    },
  )

  // ── POST /projects/:pid/datasets ──────────────────────────────────────────
  // Accepts multipart/form-data:
  //   file — CSV or Excel file
  //   name — display name (optional, defaults to filename stem)
  app.post<WithPid>('/projects/:pid/datasets',
    async (req: FastifyRequest<WithPid>, reply: FastifyReply) => {
      const data = await req.file()
      if (!data) throw new BadRequestError('No file uploaded')

      // Allow CSV even if browser sends text/plain
      const isLikelyCsv = data.filename.endsWith('.csv')
      if (!ALLOWED_MIME_TYPES.includes(data.mimetype) && !isLikelyCsv) {
        throw new BadRequestError('File type not allowed. Upload a CSV or Excel file.')
      }

      const buffer = await data.toBuffer()

      if (buffer.byteLength > MAX_FILE_SIZE) {
        throw new BadRequestError('File too large. Maximum size is 20MB')
      }

      const rawName = (data.fields.name as { value: string } | undefined)?.value
      const stem = path.basename(data.filename, path.extname(data.filename))
      const name = (rawName ?? stem).trim()

      const dataset = await uploadDataset({
        projectId: req.params.pid,
        userId: req.user.userId,
        name,
        buffer,
        mimeType: data.mimetype,
        filename: data.filename,
      })

      return reply.status(201).send(dataset)
    },
  )

  // ── GET /projects/:pid/datasets/:id ──────────────────────────────────────
  // Returns dataset including all rows
  app.get<WithPidId>('/projects/:pid/datasets/:id',
    async (req: FastifyRequest<WithPidId>) => {
      return getDataset(req.params.id, req.params.pid, req.user.userId)
    },
  )

  // ── DELETE /projects/:pid/datasets/:id ───────────────────────────────────
  app.delete<WithPidId>('/projects/:pid/datasets/:id',
    async (req: FastifyRequest<WithPidId>, reply: FastifyReply) => {
      await deleteDataset(req.params.id, req.params.pid, req.user.userId)
      return reply.status(204).send()
    },
  )
}