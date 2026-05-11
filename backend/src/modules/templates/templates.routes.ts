import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { requireAuth } from '../../auth/middleware.js'
import {
  listTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from './templates.service.js'

type WithPid    = { Params: { pid: string } }
type WithPidId  = { Params: { pid: string; id: string } }
type CreateBody = { Body: { name: string; canvasData: unknown } }
type UpdateBody = { Body: { name: string; canvasData: unknown } }

export async function templatesRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireAuth)

  // ── GET /projects/:pid/templates ──────────────────────────────────────────
  app.get<WithPid>('/projects/:pid/templates',
    async (req: FastifyRequest<WithPid>) => {
      return listTemplates(req.params.pid, req.user.userId)
    },
  )

  // ── POST /projects/:pid/templates ─────────────────────────────────────────
  app.post<WithPid & CreateBody>('/projects/:pid/templates',
    async (req: FastifyRequest<WithPid & CreateBody>, reply: FastifyReply) => {
      const template = await createTemplate(
        req.params.pid,
        req.user.userId,
        req.body.name,
        req.body.canvasData,
      )
      return reply.status(201).send(template)
    },
  )

  // ── GET /projects/:pid/templates/:id ──────────────────────────────────────
  app.get<WithPidId>('/projects/:pid/templates/:id',
    async (req: FastifyRequest<WithPidId>) => {
      return getTemplate(req.params.id, req.params.pid, req.user.userId)
    },
  )

  // ── PUT /projects/:pid/templates/:id ──────────────────────────────────────
  // Full overwrite — used for autosave
  app.put<WithPidId & UpdateBody>('/projects/:pid/templates/:id',
    async (req: FastifyRequest<WithPidId & UpdateBody>) => {
      return updateTemplate(
        req.params.id,
        req.params.pid,
        req.user.userId,
        req.body.name,
        req.body.canvasData,
      )
    },
  )

  // ── DELETE /projects/:pid/templates/:id ───────────────────────────────────
  app.delete<WithPidId>('/projects/:pid/templates/:id',
    async (req: FastifyRequest<WithPidId>, reply: FastifyReply) => {
      await deleteTemplate(req.params.id, req.params.pid, req.user.userId)
      return reply.status(204).send()
    },
  )
}