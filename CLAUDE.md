# CLAUDE.md — Smart Generate

> **This file is a living document.**
> Any AI assistant working on this project must keep CLAUDE.md up to date.
> When you make architectural decisions, add files/folders, change conventions, or complete a phase — update the relevant section here before finishing. Do not leave CLAUDE.md stale.

---

## Project Overview

**Smart Generate** is a fullstack SaaS web app for **batch image generation**.

**Core user flow:**

1. Create or import a template (JSON)
2. Design it in the canvas editor (Design tab)
3. Upload images to the asset library (Assets tab)
4. Import a dataset — CSV, Excel, or JSON (Data tab)
5. Bind dataset columns to template elements
6. Render all rows as PNG/JPG → download as ZIP or PDF (Render tab)

---

## Repo Structure

```
/
├── .gitignore             ← OS + editor ignores (covers whole repo)
├── docker-compose.yml     ← runs Postgres 17 + Redis 8 for local dev
├── CLAUDE.md              ← this file
├── frontend/
│   ├── .gitignore         ← frontend-specific ignores
│   └── src/               ← (see Frontend section below)
└── backend/               ← ✅ Phase 1 complete
    ├── .gitignore
    ├── .env               ← local env (git-ignored)
    ├── .env.example       ← committed template with all required keys
    ├── package.json
    ├── tsconfig.json
    ├── drizzle.config.ts
    └── src/               ← (see Backend section below)
```

---

## Frontend Tech Stack

| Concern | Library |
| --- | --- |
| Framework | React 18 + TypeScript + Vite |
| Canvas / Editor | Konva.js + react-konva |
| State management | Zustand + zundo (undo/redo temporal middleware) |
| Routing | React Router v6 |
| CSV parsing | PapaParse |
| Excel parsing | SheetJS (xlsx) |
| ZIP generation | JSZip |
| PDF generation | jsPDF |
| ID generation | nanoid |
| Styling | SCSS + CSS Modules (NO Tailwind) |
| Fonts | Inter via Google Fonts |

---

## Frontend Source Structure

```
frontend/src/
  types/                  ← TypeScript types ONLY, no logic
    template.ts           ← Element types, Template, ImageSrc, BindableString
    asset.ts              ← ImageAsset
    dataset.ts            ← Dataset, DataRow, DataColumn
    render.ts             ← RenderConfig, RenderProgress, RenderJob

  store/                  ← Zustand stores, state + actions only
    useEditorStore.ts     ← template CRUD, undo/redo, initTemplate, loadTemplate
    useAssetStore.ts      ← asset library, name-unique enforcement
    useDatasetStore.ts    ← dataset rows, selected row index

  lib/                    ← pure utilities, no React, no state
    utils.ts              ← generateId, clamp, deepClone, uniqueName
    export.ts             ← exportToPng (hides transformer, calls fonts.ready)
    importData.ts         ← importFile (CSV/Excel/JSON), exportDatasetAsCsv
    imageUtils.ts         ← fitDimensions, readFileAsDataUrl, getImageDimensions,
                             fileNameWithoutExtension, stripExtension
    templateUtils.ts      ← resolve(), resolveAssetIds()
    elementDefaults.ts    ← createRectElement(), createTextElement(), createImageElement()
    renderEngine.ts       ← runRenderJob() — orchestrates worker + progress
    renderFilename.ts     ← buildFileName(), sanitizeFileName()
    renderPackage.ts      ← packageZip(), packagePdf(), downloadBlob()

  workers/
    renderWorker.ts       ← OffscreenCanvas rendering, receives template JSON + assets map

  hooks/
    useTheme.ts           ← light/dark toggle, persisted in localStorage
    useKeyboard.ts        ← global shortcuts, suppressed in inputs (except meta combos)
    useConfirm.ts         ← Promise-based confirm dialog hook
    useHistory.ts         ← undo/redo wrapping zundo temporal store

  components/             ← reusable, not tied to editor
    ConfirmDialog/
    TemplateConfigModal/  ← create/import modal with resolution presets
    AssetPickerModal/     ← image library picker, drag-drop upload, size options

  renderer/               ← Konva rendering layer, NO editor logic
    TemplateRenderer.tsx  ← renders Template JSON onto a Konva Stage
    SelectionTransformer.tsx ← Konva Transformer, reads aspectRatioLocked from store
    elements/
      RectElement.tsx
      TextElement.tsx
      ImageElement.tsx    ← handles cover/contain/fill, missing/placeholder states

  editor/                 ← editor UI shell and panels
    EditorCanvas.tsx      ← pan/zoom workspace (forwardRef → EditorCanvasHandle)
    EditorCanvasHandle.ts ← { zoomIn, zoomOut, zoomFit, zoomReset }
    LeftPanel/            ← tool buttons, adds elements via elementDefaults
    RightPanel/
      RightPanel.tsx      ← resizable split: Layers (top) + Properties (bottom)
      LayersPanel.tsx     ← layer list, visibility, lock, reorder, delete
      PropertiesPanel/
        index.tsx         ← assembles sections, manages AssetPickerModal state
        PropertiesPanel.module.scss
        sections/
          TransformSection.tsx   ← x/y/w/h/rotation/opacity + aspect ratio lock
          RectProperties.tsx
          TextProperties.tsx     ← static/binding toggle for content
          ImageProperties.tsx    ← asset/binding mode, placeholder, AssetSourceBlock
          ImageAlignControls.tsx ← 3×3 dot grid for cover/contain positioning
        controls/
          NumericInput.tsx
          ColorInput.tsx
          PropRow.tsx

  pages/
    Home/                 ← create new template or import from JSON file
    Editor/
      Editor.tsx          ← tab shell + persistent header + back/export
      tabs/
        DesignTab/        ← assembles LeftPanel + EditorCanvas + RightPanel
        AssetsTab/        ← asset library: grid/list, upload, detail modal
        DataTab/          ← import dataset, resizable split: preview canvas + table
          DataTable/      ← editable table, pagination, row selection
          DataPreviewCanvas/ ← read-only TemplateRenderer, ResizeObserver scaling
        RenderTab/        ← render settings, progress bar, batch output

  styles/
    _variables.scss       ← SCSS layout/spacing/typography tokens
    _reset.scss
    _theme.scss           ← CSS custom properties (light + dark on :root[data-theme])
    global.scss           ← imports partials + Inter font

  App.tsx                 ← routing only: / → Home, /editor → Editor
  main.tsx                ← BrowserRouter wrapper
```

---

## Core Data Model

### Template JSON (the portable export format)

```ts
type Template = {
  id:       string
  name:     string
  canvas:   { width: number; height: number; background: string }
  elements: Element[]   // ordered bottom to top (index 0 = bottom layer)
}
```

### Element types

```ts
type BaseElement = {
  id: string; type: string
  x: number; y: number; width: number; height: number
  rotation: number; opacity: number
  visible: boolean; locked: boolean; aspectRatioLocked: boolean
}

type RectElement  = BaseElement & { type: 'rect';  props: { fill, stroke, strokeWidth, cornerRadius } }
type TextElement  = BaseElement & { type: 'text';  props: { content: BindableString, fontSize, fontFamily, color, fontWeight, align, lineHeight } }
type ImageElement = BaseElement & { type: 'image'; props: { src: ImageSrc, fit: 'cover'|'contain'|'fill', align: ImageAlign } }
```

### Bindable values

```ts
type BindableString =
  | { type: 'static';  value: string }
  | { type: 'binding'; column: string }

type ImageSrc =
  | { type: 'none' }
  | { type: 'asset';   assetId: string; assetName: string }
  | { type: 'binding'; column: string; placeholder?: { assetId: string; assetName: string } }
// assetName is the PORTABLE key — assetId is local only
// On template import, resolveAssetIds() matches assetName → local assetId
```

### Asset

```ts
type ImageAsset = {
  id: string        // local random ID (ast_xxxxxxxx) — will become UUID from backend
  name: string      // unique display name, no extension — THE matching key
  dataUrl: string   // base64 data URL (frontend-only phase); replaced by url in backend phase
  width: number; height: number; size: number; createdAt: number
}
// NOTE: fileName and mimeType are NOT on this type — kept simple intentionally
// FUTURE: dataUrl → url (served from local disk or R2 signed URL)
```

---

## Backend Architecture

### Status: 🚧 In Progress

| Phase | Status |
|---|---|
| Phase 1 — Scaffold + Auth + Projects | ✅ Complete |
| Phase 2 — Core Data APIs | 🔜 Next |
| Phase 3 — Frontend Integration | ⏳ Planned |
| Phase 4 — Server-Side Rendering | ⏳ Planned |
| Phase 5 — Async Batch Queue | ⏳ Planned |

### Tech Stack

| Concern | Choice |
| --- | --- |
| Runtime | Node.js + TypeScript |
| Framework | Fastify |
| ORM | Drizzle ORM |
| Database | PostgreSQL 17 |
| Auth | Google OAuth 2.0 + JWT in HTTP-only cookie |
| File Storage | Local disk (dev) → Cloudflare R2 (production) |
| Queue (Phase 4) | BullMQ + Redis |
| Renderer (Phase 3) | `@napi-rs/canvas` (Skia-based, same Canvas API) |

### Backend Folder Structure

```
backend/
├── src/
│   ├── index.ts                  ← Fastify app entry point
│   ├── config.ts                 ← env vars (DATABASE_URL, GOOGLE_CLIENT_ID, JWT_SECRET, STORAGE_PATH, etc.)
│   │
│   ├── db/
│   │   ├── schema.ts             ← Drizzle table definitions
│   │   ├── client.ts             ← DB connection
│   │   └── migrations/           ← SQL migration files (auto-generated by Drizzle)
│   │
│   ├── auth/
│   │   ├── google.ts             ← OAuth callback, user upsert
│   │   ├── session.ts            ← JWT sign/verify helpers
│   │   └── middleware.ts         ← requireAuth Fastify hook
│   │
│   ├── modules/
│   │   ├── users/
│   │   │   ├── users.routes.ts
│   │   │   └── users.service.ts
│   │   ├── projects/
│   │   │   ├── projects.routes.ts
│   │   │   └── projects.service.ts
│   │   ├── templates/
│   │   │   ├── templates.routes.ts
│   │   │   └── templates.service.ts
│   │   ├── assets/
│   │   │   ├── assets.routes.ts
│   │   │   ├── assets.service.ts
│   │   │   └── storage.ts        ← abstraction: writeFile/readFile (local or R2)
│   │   ├── datasets/
│   │   │   ├── datasets.routes.ts
│   │   │   └── datasets.service.ts
│   │   └── render/               ← Phase 3+
│   │       ├── render.routes.ts
│   │       ├── render.service.ts
│   │       └── renderer.ts       ← @napi-rs/canvas engine
│   │
│   ├── lib/
│   │   └── errors.ts             ← typed HTTP errors
│   │
│   └── types/
│       └── shared.ts             ← Template, Element types (mirrors frontend/src/types/)
│
├── .env                          ← local env (git-ignored)
├── .env.example                  ← committed template with all required keys
├── drizzle.config.ts
├── tsconfig.json
└── package.json
```

### Database Schema

```sql
-- Users (created on first Google login)
users
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
  google_id   TEXT UNIQUE NOT NULL
  email       TEXT UNIQUE NOT NULL
  name        TEXT NOT NULL
  avatar_url  TEXT
  created_at  TIMESTAMPTZ DEFAULT now()

-- Projects (top-level container per user)
projects
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
  name        TEXT NOT NULL
  created_at  TIMESTAMPTZ DEFAULT now()
  updated_at  TIMESTAMPTZ DEFAULT now()

-- Templates (one or many per project)
templates
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE
  name        TEXT NOT NULL
  canvas_data JSONB NOT NULL    ← full Template JSON (same format as frontend export)
  created_at  TIMESTAMPTZ DEFAULT now()
  updated_at  TIMESTAMPTZ DEFAULT now()

-- Assets (uploaded images/logos)
assets
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE
  name        TEXT NOT NULL               ← unique per project (enforced in service layer)
  storage_key TEXT NOT NULL               ← path on disk or R2 object key
  url         TEXT NOT NULL               ← served URL or signed R2 URL
  width       INT
  height      INT
  size_bytes  INT
  mime_type   TEXT
  created_at  TIMESTAMPTZ DEFAULT now()

-- Datasets (CSV/Excel uploaded, converted to JSON rows)
datasets
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE
  name        TEXT NOT NULL
  columns     JSONB NOT NULL              ← [{ key, label }]
  rows        JSONB NOT NULL              ← [{ col1: val, col2: val, ... }]
  row_count   INT NOT NULL DEFAULT 0
  created_at  TIMESTAMPTZ DEFAULT now()
  updated_at  TIMESTAMPTZ DEFAULT now()

-- Render Jobs (Phase 4)
render_jobs
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid()
  project_id     UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE
  template_id    UUID REFERENCES templates(id)
  dataset_id     UUID REFERENCES datasets(id)
  status         TEXT NOT NULL DEFAULT 'pending'  ← pending|processing|done|failed
  total_rows     INT
  completed_rows INT DEFAULT 0
  output_url     TEXT                             ← ZIP download when done
  error          TEXT
  created_at     TIMESTAMPTZ DEFAULT now()
  updated_at     TIMESTAMPTZ DEFAULT now()
```

**Key schema decisions:**
- `canvas_data JSONB` stores the full Template JSON verbatim — no shredding into relational tables
- `assets.name` uniqueness enforced per-project in service layer (mirrors frontend behavior)
- `render_jobs` defined now, wired up only in Phase 4
- All user data scoped through project ownership: `projects.user_id = req.user.id`

### API Routes

```
Auth
  GET  /auth/google              → redirect to Google OAuth
  GET  /auth/google/callback     → exchange code, set JWT cookie, redirect to app
  POST /auth/logout              → clear cookie
  GET  /auth/me                  → current user info

Projects
  GET    /projects               → list user's projects
  POST   /projects               → create project
  GET    /projects/:id           → get single project
  PATCH  /projects/:id           → rename project
  DELETE /projects/:id           → delete (cascades templates, assets, datasets)

Templates
  GET    /projects/:pid/templates          → list templates in project
  POST   /projects/:pid/templates          → save new template
  GET    /projects/:pid/templates/:id      → load template JSON
  PUT    /projects/:pid/templates/:id      → overwrite (full save / autosave)
  DELETE /projects/:pid/templates/:id      → delete template

Assets
  GET    /projects/:pid/assets             → list assets (metadata only)
  POST   /projects/:pid/assets             → upload image (multipart/form-data)
  DELETE /projects/:pid/assets/:id         → delete asset + file
  GET    /assets/file/:key                 → serve file (local) or redirect (R2 signed URL)

Datasets
  GET    /projects/:pid/datasets           → list datasets
  POST   /projects/:pid/datasets           → upload CSV/Excel → parse → store as JSON
  GET    /projects/:pid/datasets/:id       → get dataset with rows
  DELETE /projects/:pid/datasets/:id       → delete dataset

Render (Phase 3+)
  POST   /projects/:pid/render             → start render job { templateId, datasetId }
  GET    /render/:jobId                    → poll job status + progress
  GET    /render/:jobId/download           → download ZIP of rendered images
```

### Implementation Phases

#### Phase 1 — Scaffold + Auth + Projects (current)
- `docker-compose.yml` for Postgres + Redis (local dev)
- Backend folder scaffold: Fastify app, TypeScript config, env setup
- PostgreSQL + Drizzle schema + first migration
- Google OAuth flow → JWT in HTTP-only cookie
- `/auth/*` and `/projects` CRUD routes
- `requireAuth` middleware on all protected routes
- **Frontend unchanged** — test backend with curl/Postman

#### Phase 2 — Core Data APIs
- Template save/load (JSONB round-trip)
- Asset upload → local disk → serve via static route → return URL
- Asset `name` uniqueness enforced per project
- Dataset upload: parse CSV/Excel on server → store rows as JSONB
- All routes scoped to authenticated user via project ownership

#### Phase 3 — Frontend Integration
- Replace `imagio-assets` localStorage with backend API calls
- Replace `imagio-dataset` localStorage with backend API calls
- Add project dashboard/selector (Home screen)
- Template autosave: debounced `PUT /templates/:id` on store change
- Asset URLs: swap `dataUrl` → server URL in `ImageAsset`; update `resolveAssetIds()`
- Google login redirect on first load if no valid JWT

#### Phase 4 — Server-Side Rendering
- Install `@napi-rs/canvas`
- Port `renderWorker.ts` logic to `backend/src/modules/render/renderer.ts`
- Same template JSON + assets map, same drawing logic, Node canvas instead of OffscreenCanvas
- `POST /projects/:pid/render` — synchronous for small jobs, returns ZIP directly
- Frontend: swap `renderEngine.ts` to call API instead of spawning a worker

#### Phase 5 — Async Batch Queue
- BullMQ + Redis worker process
- `POST /render` enqueues job, returns `jobId` immediately
- Worker picks up job, renders rows, writes ZIP to storage, marks done
- Frontend polls `GET /render/:jobId` and shows progress bar
- Maps cleanly to existing `RenderProgress` type in `frontend/src/types/render.ts`

### Storage Abstraction

`backend/src/modules/assets/storage.ts` exposes only two functions:

```ts
writeFile(key: string, buffer: Buffer, mimeType: string): Promise<string> // returns served URL
readFile(key: string): Promise<Buffer>
deleteFile(key: string): Promise<void>
```

In Phase 1–3: backed by local disk under `STORAGE_PATH` env var.
In production: swap implementation to Cloudflare R2 (S3-compatible). No other code changes.

### Auth Strategy

- Google OAuth 2.0 implemented manually (native fetch — no @fastify/oauth2 plugin needed)
- On callback: upsert user in DB, sign JWT, set as HTTP-only cookie (`sameSite: lax`, `secure: true` in prod)
- Stateless JWT — no server-side session storage needed until Phase 5 (Redis arrives for BullMQ anyway)
- `requireAuth` hook: verify JWT from cookie, attach `req.user = { id, email, name }` to request

### Multi-Tenancy

All queries are scoped per user via project ownership. Pattern:

```ts
// In any module's service:
const project = await db.query.projects.findFirst({
  where: and(eq(projects.id, projectId), eq(projects.userId, req.user.id))
})
if (!project) throw new NotFoundError()
// now safe to query templates/assets/datasets for this project
```

No shared data between users. Simple, correct by default.

---

## Local Development Setup

### Prerequisites
- Node.js 20+
- Docker Desktop (for Postgres + Redis)
- A Google Cloud project with OAuth credentials (needed for Phase 1 auth)

### Start local services

```bash
docker compose up -d      # starts Postgres on :5432, Redis on :6379
docker compose down       # stops both (data persists in docker volume)
docker compose down -v    # stops both AND wipes data (fresh start)
```

### Start frontend

```bash
cd frontend
npm install
npm run dev               # http://localhost:5173
```

### Start backend

```bash
cd backend
npm install
cp .env.example .env      # fill in your values
npm run db:migrate        # run Drizzle migrations
npm run dev               # http://localhost:3000
```

### Environment variables (backend/.env)

```
DATABASE_URL=postgresql://dev:dev@localhost:5432/smartgenerate
REDIS_URL=redis://localhost:6379
JWT_SECRET=change-me-in-production
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
STORAGE_PATH=./uploads
FRONTEND_URL=http://localhost:5173
PORT=3000
```

---

## Key Architectural Decisions

### 1. Canvas-first (not HTML/CSS)

Konva renders everything on a single `<canvas>`. Editor preview and PNG export are pixel-identical. Export: `stage.toDataURL({ pixelRatio: 2 })`. No html2canvas hacks.

### 2. Template JSON is source of truth

Konva is a renderer that reads from Zustand store. Never read positions back from Konva nodes — always update the store and let Konva re-render:

```
User action → store.updateElement() → React re-render → Konva redraws
```

### 3. Asset portability via name

Asset IDs are local random strings. Templates store `assetName` alongside `assetId`. On import, `resolveAssetIds()` auto-matches by name. Asset name uniqueness enforced: `hero.png` added twice → `hero` and `hero 2`.

### 4. Render pipeline is backend-portable

`renderWorker.ts` receives template JSON + flat assets map and uses `OffscreenCanvas`. To move to backend: replace `worker.postMessage()` in `renderEngine.ts` with `fetch('/api/render')`. Everything else stays the same.

### 5. Storage is swappable

`storage.ts` abstracts all file I/O behind three functions. Local disk in dev, Cloudflare R2 in production. No other code changes required.

### 6. Tab visibility (not display:none)

Inactive editor tabs use `visibility: hidden; pointer-events: none` — NOT `display: none`. Preserves internal state (zoom, scroll, selections) when switching tabs.

### 7. Undo/redo scoping

zundo `partialize` tracks only `template` in history — NOT `selectedId`. Selecting/deselecting elements does not pollute the undo stack.

---

## Zustand Stores (Frontend)

### `useEditorStore`

```ts
{
  template: Template
  selectedId: string | null
  selectElement(id), addElement(el), updateElement(id, changes)
  deleteElement(id), reorderElements(orderedIds)
  initTemplate(config), loadTemplate(template), exportTemplateJson()
  syncAssetName(oldName, newName)
}
// temporal middleware (zundo): limit 50, partializes only { template }
```

### `useAssetStore` (persisted: `imagio-assets`)

```ts
{
  assets: Record<string, ImageAsset>
  addAsset(file), addAssetWithName(file, name)
  removeAsset(id), renameAsset(id, name)
  getAsset(id), getAssetByName(name), resolveOrAdd(file, preferredName)
}
// FUTURE: localStorage persistence → backend API calls (Phase 3)
```

### `useDatasetStore` (persisted: `imagio-dataset`)

```ts
{
  dataset: Dataset | null
  selectedRowIndex: number | null
  setDataset(dataset), clearDataset(), selectRow(index)
  updateCell(rowIndex, key, value), addRow(), deleteRow(index)
}
// FUTURE: localStorage persistence → backend API calls (Phase 3)
```

---

## Styling System (Frontend)

```scss
// In every .module.scss file:
@use '../styles/variables' as *;

// SCSS variables for layout/spacing:
$header-height, $panel-left-width (52px), $panel-right-width (220px)
$space-1 (4px) through $space-10 (40px)
$radius-sm/md/lg/xl/full
$font-size-xs through xl
$transition-fast/base/slow

// CSS custom properties for all colors (theme-aware):
var(--color-bg-primary/secondary/tertiary/hover/active/app)
var(--color-text-primary/secondary/tertiary/disabled)
var(--color-border-subtle/default/strong)
var(--color-accent), var(--color-accent-hover), var(--color-accent-subtle)
var(--color-danger), var(--color-danger-subtle)
var(--color-workspace-bg), var(--color-workspace-dot)
var(--shadow-sm/md/lg/canvas)
var(--color-binding-bg/text/border)
```

---

## Coding Conventions

### General
- **Named exports everywhere** — no default exports except `App.tsx` and `main.tsx`
- **TypeScript strict** — always type component props explicitly
- **`any` casting** accepted for `Partial<Element>` updates due to discriminated union complexity
- **Store actions are imperative** — `updateElement(id, changes)` not `dispatch({ type })`
- **Hooks in `hooks/`** — never export hooks from store files
- **Utilities in `lib/`** — never put pure functions in store or type files

### Frontend-specific
- **CSS Modules** — `import styles from './Foo.module.scss'`, never global class names
- **No inline styles** except dynamic values (transforms, sizes from state)
- **Folder = feature, index.tsx = public API**

### Backend-specific
- **Routes handle HTTP only** — validation, parsing, response shaping
- **Services handle business logic** — DB queries, file ops, ownership checks
- **All routes behind `requireAuth`** except `/auth/*`
- **Ownership always checked** — never trust `:projectId` without verifying `userId`
- **Errors via `lib/errors.ts`** — typed HTTP errors, never raw `throw`

---

## Known Issues & Constraints

| Issue | Status | Notes |
| --- | --- | --- |
| localStorage asset limit | Known, deferred | base64 dataUrls hit ~5MB; resolved in Phase 3 (backend storage) |
| Worker font rendering | Known, deferred | Inter unavailable in OffscreenCanvas; falls back to system sans-serif |
| No template autosave | Intentional | Manual JSON export for now; autosave added in Phase 3 |
| Large PDF slow | Acceptable | Sequential image-to-PDF; fine for current scale |
| `initTemplate`/`loadTemplate` pollutes undo | Known | Should clear zundo history after these calls |
| No multi-select | Not implemented | Single element selection only |

---

## Environment Setup

### Frontend

```bash
cd frontend
npm install
npm run dev      # http://localhost:5173
npm run build    # production build to frontend/dist/
```

### Backend (once scaffolded)

```bash
cd backend
npm install
cp .env.example .env
npm run db:migrate
npm run dev      # http://localhost:3000
```

### Docker (local Postgres + Redis)

```bash
docker compose up -d    # start both services
docker compose down     # stop (data persists)
docker compose down -v  # stop + wipe data
```

---

## Pending / Next Steps

### Frontend
- [ ] Fix worker font rendering (load Inter as ArrayBuffer, pass to worker)
- [ ] IndexedDB for asset storage (replace localStorage persist) — may be skipped if Phase 3 lands first
- [ ] Template autosave to localStorage — may be skipped if Phase 3 lands first
- [ ] Multi-select elements
- [ ] Duplicate element (Ctrl+D)
- [ ] Copy/paste elements
- [ ] Render cancellation button
- [ ] Single-row preview render before batch
- [ ] Column mapping UI (visual binding between dataset columns and elements)

### Backend
- [x] **Phase 1:** Scaffold + Docker + Auth + Projects CRUD
  - [x] docker-compose.yml (Postgres 17 + Redis 8)
  - [x] Fastify app, TypeScript config, env setup
  - [x] Drizzle schema (users, projects, templates, assets, datasets, render_jobs)
  - [x] Google OAuth flow → JWT in HTTP-only cookie
  - [x] `/auth/google`, `/auth/google/callback`, `/auth/logout`, `/auth/me`
  - [x] `/projects` CRUD (list, create, get, rename, delete)
  - [x] `requireAuth` middleware, typed error classes
  - [x] `.gitignore` files (root + backend)
- [ ] **Phase 2:** Templates, Assets (local disk), Datasets APIs
- [ ] **Phase 3:** Frontend integration (replace localStorage with API)
- [ ] **Phase 4:** Server-side rendering (`@napi-rs/canvas`)
- [ ] **Phase 5:** Async batch queue (BullMQ + Redis workers)
- [ ] **Later:** Swap local disk storage → Cloudflare R2