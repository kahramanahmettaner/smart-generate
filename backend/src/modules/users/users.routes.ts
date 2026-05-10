import { FastifyInstance } from 'fastify'
import { requireAuth } from '../../auth/middleware.js'
import { getUserById } from './users.service.js'

export async function usersRoutes(app: FastifyInstance): Promise<void> {
  // GET /users/me — alias, main one is /auth/me
  app.get('/users/me', { preHandler: requireAuth }, async (req) => {
    return getUserById(req.user.userId)
  })
}
