import { FastifyInstance } from 'fastify'
import { db } from '../db/client.js'
import { users } from '../db/schema.js'
import { eq } from 'drizzle-orm'
import { signJwt } from './session.js'
import { requireAuth } from './middleware.js'
import { config } from '../config.js'

interface GoogleUserInfo {
  sub: string
  email: string
  name: string
  picture?: string
}

export async function authRoutes(app: FastifyInstance): Promise<void> {
  // ── GET /auth/google ──────────────────────────────────────────────────────
  // Redirects browser to Google's OAuth consent screen
  app.get('/auth/google', async (req, reply) => {
    const params = new URLSearchParams({
      client_id:     config.google.clientId,
      redirect_uri:  config.google.callbackUrl,
      response_type: 'code',
      scope:         'openid email profile',
      access_type:   'offline',
      prompt:        'select_account',
    })
    return reply.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`)
  })

  // ── GET /auth/google/callback ─────────────────────────────────────────────
  // Google redirects here after user approves. We exchange the code for tokens,
  // fetch the user's profile, upsert into DB, set JWT cookie, redirect to app.
  app.get<{ Querystring: { code?: string; error?: string } }>(
    '/auth/google/callback',
    async (req, reply) => {
      const { code, error } = req.query

      if (error || !code) {
        return reply.redirect(`${config.frontendUrl}?auth_error=true`)
      }

      // 1. Exchange code for access token
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id:     config.google.clientId,
          client_secret: config.google.clientSecret,
          redirect_uri:  config.google.callbackUrl,
          grant_type:    'authorization_code',
        }),
      })

      if (!tokenRes.ok) {
        console.error('Google token exchange failed:', await tokenRes.text())
        return reply.redirect(`${config.frontendUrl}?auth_error=true`)
      }

      const { access_token } = await tokenRes.json() as { access_token: string }

      // 2. Fetch user profile from Google
      const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${access_token}` },
      })

      if (!profileRes.ok) {
        return reply.redirect(`${config.frontendUrl}?auth_error=true`)
      }

      const profile = await profileRes.json() as GoogleUserInfo

      // 3. Upsert user in DB
      const [user] = await db
        .insert(users)
        .values({
          googleId:  profile.sub,
          email:     profile.email,
          name:      profile.name,
          avatarUrl: profile.picture ?? null,
        })
        .onConflictDoUpdate({
          target: users.googleId,
          set: {
            email:     profile.email,
            name:      profile.name,
            avatarUrl: profile.picture ?? null,
          },
        })
        .returning()

      // 4. Sign JWT and set as HTTP-only cookie
      const token = await signJwt({
        userId: user.id,
        email:  user.email,
        name:   user.name,
      })

      reply.setCookie('token', token, {
        httpOnly: true,
        secure:   config.isProd,
        sameSite: 'lax',
        path:     '/',
        maxAge:   60 * 60 * 24 * 7, // 7 days
      })

      return reply.redirect(config.frontendUrl)
    },
  )

  // ── POST /auth/logout ─────────────────────────────────────────────────────
  app.post('/auth/logout', async (req, reply) => {
    reply.clearCookie('token', { path: '/' })
    return { ok: true }
  })

  // ── GET /auth/me ──────────────────────────────────────────────────────────
  app.get('/auth/me', { preHandler: requireAuth }, async (req, reply) => {
    const user = await db.query.users.findFirst({
      where: eq(users.id, req.user.userId),
      columns: { id: true, email: true, name: true, avatarUrl: true, createdAt: true },
    })

    if (!user) {
      reply.clearCookie('token', { path: '/' })
      return reply.status(401).send({ error: 'User not found' })
    }

    return user
  })
}
