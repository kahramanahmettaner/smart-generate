import "dotenv/config"
import Fastify, { FastifyError, FastifyRequest, FastifyReply } from 'fastify'
import cookie from '@fastify/cookie'
import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import { config } from './config.js'
import { connectDb } from './db/client.js'
import { AppError } from './lib/errors.js'
import { authRoutes } from './auth/google.js'
import { usersRoutes } from './modules/users/users.routes.js'
import { projectsRoutes } from './modules/projects/projects.routes.js'
import { templatesRoutes } from "./modules/templates/templates.routes.js"
import { assetsRoutes } from './modules/assets/assets.routes.js'
import { datasetsRoutes } from "./modules/data/datasets.routes.js"

async function buildApp() {
  const app = Fastify({
    logger: {
      level: config.isProd ? 'info' : 'debug',
      transport: config.isProd
        ? undefined
        : { target: 'pino-pretty', options: { colorize: true } },
    },
  })

  // ── Plugins ─────────────────────────────────────────────────────────────────

  await app.register(cors, {
    origin: config.frontendUrl,
    credentials: true, // required for cookies to be sent cross-origin
  })

  await app.register(cookie)

  await app.register(multipart, {
    limits: {
      fileSize: 20 * 1024 * 1024, // 20MB max (datasets can be larger than images)
    },
  })

  // ── Routes ───────────────────────────────────────────────────────────────────

  await app.register(authRoutes)
  await app.register(usersRoutes)
  await app.register(projectsRoutes)
  await app.register(templatesRoutes)
  await app.register(assetsRoutes)
  await app.register(datasetsRoutes)

  // ── Health check ─────────────────────────────────────────────────────────────

  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }))

  // ── Global error handler ──────────────────────────────────────────────────────

  app.setErrorHandler((error: FastifyError, req: FastifyRequest, reply: FastifyReply) => {
    // Our typed app errors
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({ error: error.message })
    }

    // Fastify validation errors
    if (error.validation) {
      return reply.status(400).send({ error: 'Validation error', details: error.validation })
    }

    // Unexpected errors — log and return generic message
    req.log.error(error)
    return reply.status(500).send({ error: 'Internal server error' })
  })

  return app
}

async function start() {
  try {
    await connectDb()

    const app = await buildApp()

    await app.listen({ port: config.port, host: '0.0.0.0' })
    console.log(`🚀 Backend running at http://localhost:${config.port}`)
  } catch (err) {
    console.error('Failed to start server:', err)
    process.exit(1)
  }
}

start()