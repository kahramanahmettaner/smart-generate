import { eq, and } from 'drizzle-orm'
import { db } from '../../db/client.js'
import { projects, type Project } from '../../db/schema.js'
import { NotFoundError, BadRequestError } from '../../lib/errors.js'

// ── Helpers ───────────────────────────────────────────────────────────────────

// Always verifies the project belongs to the requesting user.
// Throws 404 (not 403) to avoid leaking whether a project exists.
async function getOwnedProject(projectId: string, userId: string): Promise<Project> {
  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, projectId), eq(projects.userId, userId)),
  })
  if (!project) throw new NotFoundError('Project not found')
  return project
}

// ── Exported service functions ────────────────────────────────────────────────

export async function listProjects(userId: string): Promise<Project[]> {
  return db.query.projects.findMany({
    where: eq(projects.userId, userId),
    orderBy: (p, { desc }) => [desc(p.updatedAt)],
  })
}

export async function getProject(projectId: string, userId: string): Promise<Project> {
  return getOwnedProject(projectId, userId)
}

export async function createProject(userId: string, name: string): Promise<Project> {
  if (!name?.trim()) throw new BadRequestError('Project name is required')

  const [project] = await db
    .insert(projects)
    .values({ userId, name: name.trim() })
    .returning()

  return project
}

export async function renameProject(
  projectId: string,
  userId: string,
  name: string,
): Promise<Project> {
  if (!name?.trim()) throw new BadRequestError('Project name is required')

  await getOwnedProject(projectId, userId) // ownership check

  const [updated] = await db
    .update(projects)
    .set({ name: name.trim(), updatedAt: new Date() })
    .where(eq(projects.id, projectId))
    .returning()

  return updated
}

export async function deleteProject(projectId: string, userId: string): Promise<void> {
  await getOwnedProject(projectId, userId) // ownership check

  await db.delete(projects).where(eq(projects.id, projectId))
  // Cascade in DB handles templates, assets, datasets automatically
}
