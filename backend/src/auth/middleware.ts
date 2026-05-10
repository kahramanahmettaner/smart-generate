import { FastifyRequest, FastifyReply } from 'fastify'
import { verifyJwt, JwtPayload } from './session.js'
import { UnauthorizedError } from '../lib/errors.js'

// Extend Fastify's request type so req.user is available everywhere
declare module 'fastify' {
  interface FastifyRequest {
    user: JwtPayload
  }
}

export async function requireAuth(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const token = req.cookies?.token

  if (!token) {
    throw new UnauthorizedError('No session cookie found')
  }

  try {
    req.user = await verifyJwt(token)
  } catch {
    throw new UnauthorizedError('Invalid or expired session')
  }
}
