import { FastifyInstance } from 'fastify'
import { requireAuth } from '../../auth/middleware.js'
import {
  listProjects,
  getProject,
  createProject,
  renameProject,
  deleteProject,
} from './projects.service.js'

export async function projectsRoutes(app: FastifyInstance): Promise<void> {
  // All project routes require authentication
  app.addHook('preHandler', requireAuth)

  // ── GET /projects ─────────────────────────────────────────────────────────
  app.get('/projects', async (req) => {
    return listProjects(req.user.userId)
  })

  // ── POST /projects ────────────────────────────────────────────────────────
  app.post<{ Body: { name: string } }>('/projects', async (req, reply) => {
    const project = await createProject(req.user.userId, req.body.name)
    return reply.status(201).send(project)
  })

  // ── GET /projects/:id ─────────────────────────────────────────────────────
  app.get<{ Params: { id: string } }>('/projects/:id', async (req) => {
    return getProject(req.params.id, req.user.userId)
  })

  // ── PATCH /projects/:id ───────────────────────────────────────────────────
  app.patch<{ Params: { id: string }; Body: { name: string } }>(
    '/projects/:id',
    async (req) => {
      return renameProject(req.params.id, req.user.userId, req.body.name)
    },
  )

  // ── DELETE /projects/:id ──────────────────────────────────────────────────
  app.delete<{ Params: { id: string } }>('/projects/:id', async (req, reply) => {
    await deleteProject(req.params.id, req.user.userId)
    return reply.status(204).send()
  })
}
