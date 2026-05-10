import { pgTable, text, uuid, timestamp, integer, jsonb } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ─── Users ───────────────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id:        uuid('id').primaryKey().defaultRandom(),
  googleId:  text('google_id').unique().notNull(),
  email:     text('email').unique().notNull(),
  name:      text('name').notNull(),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
}))

// ─── Projects ─────────────────────────────────────────────────────────────────

export const projects = pgTable('projects', {
  id:        uuid('id').primaryKey().defaultRandom(),
  userId:    uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name:      text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const projectsRelations = relations(projects, ({ one, many }) => ({
  user:      one(users, { fields: [projects.userId], references: [users.id] }),
  templates: many(templates),
  assets:    many(assets),
  datasets:  many(datasets),
}))

// ─── Templates ────────────────────────────────────────────────────────────────

export const templates = pgTable('templates', {
  id:         uuid('id').primaryKey().defaultRandom(),
  projectId:  uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  name:       text('name').notNull(),
  canvasData: jsonb('canvas_data').notNull(), // full Template JSON from frontend
  createdAt:  timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:  timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const templatesRelations = relations(templates, ({ one }) => ({
  project: one(projects, { fields: [templates.projectId], references: [projects.id] }),
}))

// ─── Assets ───────────────────────────────────────────────────────────────────

export const assets = pgTable('assets', {
  id:         uuid('id').primaryKey().defaultRandom(),
  projectId:  uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  name:       text('name').notNull(),       // unique per project, enforced in service
  storageKey: text('storage_key').notNull(), // local path or R2 object key
  url:        text('url').notNull(),         // served URL or signed R2 URL
  width:      integer('width'),
  height:     integer('height'),
  sizeBytes:  integer('size_bytes'),
  mimeType:   text('mime_type'),
  createdAt:  timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const assetsRelations = relations(assets, ({ one }) => ({
  project: one(projects, { fields: [assets.projectId], references: [projects.id] }),
}))

// ─── Datasets ─────────────────────────────────────────────────────────────────

export const datasets = pgTable('datasets', {
  id:        uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  name:      text('name').notNull(),
  columns:   jsonb('columns').notNull(),  // [{ key: string, label: string }]
  rows:      jsonb('rows').notNull(),     // [{ col1: val, col2: val, ... }]
  rowCount:  integer('row_count').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const datasetsRelations = relations(datasets, ({ one }) => ({
  project: one(projects, { fields: [datasets.projectId], references: [projects.id] }),
}))

// ─── Render Jobs (Phase 5) ────────────────────────────────────────────────────

export const renderJobs = pgTable('render_jobs', {
  id:            uuid('id').primaryKey().defaultRandom(),
  projectId:     uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  templateId:    uuid('template_id').references(() => templates.id),
  datasetId:     uuid('dataset_id').references(() => datasets.id),
  status:        text('status').notNull().default('pending'), // pending|processing|done|failed
  totalRows:     integer('total_rows'),
  completedRows: integer('completed_rows').default(0),
  outputUrl:     text('output_url'),
  error:         text('error'),
  createdAt:     timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:     timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// ─── Types ────────────────────────────────────────────────────────────────────

export type User        = typeof users.$inferSelect
export type NewUser     = typeof users.$inferInsert
export type Project     = typeof projects.$inferSelect
export type NewProject  = typeof projects.$inferInsert
export type Template    = typeof templates.$inferSelect
export type NewTemplate = typeof templates.$inferInsert
export type Asset       = typeof assets.$inferSelect
export type NewAsset    = typeof assets.$inferInsert
export type Dataset     = typeof datasets.$inferSelect
export type NewDataset  = typeof datasets.$inferInsert
export type RenderJob   = typeof renderJobs.$inferSelect
