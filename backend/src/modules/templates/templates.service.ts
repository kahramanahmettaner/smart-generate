import { eq, and } from 'drizzle-orm'
import { db } from '../../db/client.js'
import { templates, projects, type Template } from '../../db/schema.js'
import { NotFoundError, BadRequestError } from '../../lib/errors.js'

// ── Helpers ───────────────────────────────────────────────────────────────────

async function assertProjectOwnership(projectId: string, userId: string): Promise<void> {
  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, projectId), eq(projects.userId, userId)),
  })
  if (!project) throw new NotFoundError('Project not found')
}

async function getOwnedTemplate(
  templateId: string,
  projectId: string,
  userId: string,
): Promise<Template> {
  await assertProjectOwnership(projectId, userId)

  const template = await db.query.templates.findFirst({
    where: and(eq(templates.id, templateId), eq(templates.projectId, projectId)),
  })
  if (!template) throw new NotFoundError('Template not found')
  return template
}

// ── Exported service functions ────────────────────────────────────────────────

export async function listTemplates(projectId: string, userId: string): Promise<Template[]> {
  await assertProjectOwnership(projectId, userId)

  return db.query.templates.findMany({
    where: eq(templates.projectId, projectId),
    orderBy: (t, { desc }) => [desc(t.updatedAt)],
  })
}

export async function getTemplate(
  templateId: string,
  projectId: string,
  userId: string,
): Promise<Template> {
  return getOwnedTemplate(templateId, projectId, userId)
}

export async function createTemplate(
  projectId: string,
  userId: string,
  name: string,
  canvasData: unknown,
): Promise<Template> {
  if (!name?.trim()) throw new BadRequestError('Template name is required')
  if (!canvasData) throw new BadRequestError('Canvas data is required')

  await assertProjectOwnership(projectId, userId)

  const [template] = await db
    .insert(templates)
    .values({ projectId, name: name.trim(), canvasData })
    .returning()

  return template
}

export async function updateTemplate(
  templateId: string,
  projectId: string,
  userId: string,
  name: string,
  canvasData: unknown,
): Promise<Template> {
  if (!name?.trim()) throw new BadRequestError('Template name is required')
  if (!canvasData) throw new BadRequestError('Canvas data is required')

  await getOwnedTemplate(templateId, projectId, userId) // ownership check

  const [updated] = await db
    .update(templates)
    .set({ name: name.trim(), canvasData, updatedAt: new Date() })
    .where(eq(templates.id, templateId))
    .returning()

  return updated
}

export async function deleteTemplate(
  templateId: string,
  projectId: string,
  userId: string,
): Promise<void> {
  await getOwnedTemplate(templateId, projectId, userId) // ownership check
  await db.delete(templates).where(eq(templates.id, templateId))
}