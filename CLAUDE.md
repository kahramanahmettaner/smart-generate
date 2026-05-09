# CLAUDE.md — Smart Generate

> The `frontend/` folder contains the entire current application. 
> A `backend/` folder is planned for future phases.

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

**Everything runs in the browser.** No backend exists yet. The architecture is designed so the render pipeline can be moved to a Node.js backend with minimal changes.

---

## Repo Structure

```
/
├── frontend/          ← entire current application (Vite + React + TS)
│   ├── src/
│   ├── public/
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── package.json
└── CLAUDE.md          ← this file
```

> `backend/` does not exist yet. When added it will be a Node.js service using `@napi-rs/canvas` for server-side rendering of the same template JSON format.

---

## Frontend Tech Stack

| Concern | Library |
|---|---|
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
// Text content can be static or bound to a dataset column
type BindableString =
  | { type: 'static';  value: string }
  | { type: 'binding'; column: string }

// Image source has three modes
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
  id: string        // local random ID (ast_xxxxxxxx)
  name: string      // unique display name, no extension — THE matching key
  dataUrl: string   // base64 data URL (future: remote URL from backend)
  width: number; height: number; size: number; createdAt: number
}
// NOTE: fileName and mimeType are NOT on this type — kept simple intentionally
```

---

## Key Architectural Decisions

### 1. Canvas-first (not HTML/CSS)
Konva renders everything on a single `<canvas>`. There are no DOM elements for shapes. This means:
- Editor preview and PNG export are **pixel-identical** (same renderer, just different pixel ratio)
- Export: `stage.toDataURL({ pixelRatio: 2 })`
- No html2canvas hacks

### 2. Template JSON is source of truth
Konva is a **renderer** that reads from Zustand store. Never read positions back from Konva nodes — always update the store and let Konva re-render. Pattern:
```
User action → store.updateElement() → React re-render → Konva redraws
```

### 3. Asset portability via name
Asset IDs are local random strings. Templates store `assetName` alongside `assetId`. When a template is imported, `resolveAssetIds()` in `lib/templateUtils.ts` auto-matches by name. Users can share templates — recipients just need assets with the same names.

Asset name uniqueness is enforced: `hero.png` added twice → `hero` and `hero 2`.

### 4. Render worker is backend-portable
`renderWorker.ts` receives template JSON + flat assets map and uses `OffscreenCanvas`. To move to backend, replace `worker.postMessage()` in `renderEngine.ts` with `fetch('/api/render')`. Everything else stays the same.

### 5. Tab visibility (not display:none)
Inactive editor tabs use `visibility: hidden; pointer-events: none` — NOT `display: none`. This preserves internal state (zoom level, scroll position, selections) when switching tabs.

### 6. Undo/redo scoping
zundo `partialize` option tracks only `template` in history — NOT `selectedId`. Selecting/deselecting elements does not pollute the undo stack.

---

## Zustand Stores

### `useEditorStore`
```ts
{
  template: Template
  selectedId: string | null
  // actions:
  selectElement(id)
  addElement(el)
  updateElement(id, changes)    // merges changes into element
  deleteElement(id)             // also clears selectedId if it matched
  reorderElements(orderedIds)
  initTemplate(config)          // creates fresh template, clears history
  loadTemplate(template)        // calls resolveAssetIds() then sets state
  exportTemplateJson()          // returns JSON string
  syncAssetName(oldName, newName) // updates assetName in all elements referencing old name
}
// temporal middleware (zundo): limit 50, partializes only { template }
```

### `useAssetStore` (persisted: `imagio-assets`)
```ts
{
  assets: Record<string, ImageAsset>
  addAsset(file)                // deduplicates name automatically
  addAssetWithName(file, name)
  removeAsset(id)
  renameAsset(id, name)         // enforces uniqueness, caller must syncAssetName
  getAsset(id)
  getAssetByName(name)          // case-insensitive, tries name + name-without-ext
  resolveOrAdd(file, preferredName)
}
```

### `useDatasetStore` (persisted: `imagio-dataset`)
```ts
{
  dataset: Dataset | null
  selectedRowIndex: number | null
  setDataset(dataset)
  clearDataset()
  selectRow(index)
  updateCell(rowIndex, key, value)
  addRow()
  deleteRow(index)              // adjusts selectedRowIndex if needed
}
```

---

## Styling System

```scss
// In every .module.scss file:
@use '../styles/variables' as *;   // adjust path depth as needed

// Use SCSS variables for layout/spacing:
$header-height, $panel-left-width (52px), $panel-right-width (220px)
$space-1 (4px) through $space-10 (40px)
$radius-sm/md/lg/xl/full
$font-size-xs through xl
$transition-fast/base/slow
$font-sans, $font-mono

// Use CSS custom properties for all colors (theme-aware):
var(--color-bg-primary/secondary/tertiary/hover/active/app)
var(--color-text-primary/secondary/tertiary/disabled)
var(--color-border-subtle/default/strong)
var(--color-accent), var(--color-accent-hover), var(--color-accent-subtle), var(--color-accent-text)
var(--color-danger), var(--color-danger-subtle)
var(--color-workspace-bg), var(--color-workspace-dot)
var(--shadow-sm/md/lg/canvas)
var(--color-binding-bg/text/border)

// Theme switching:
document.documentElement.setAttribute('data-theme', 'dark' | 'light')
// Persisted in localStorage as 'imagio-theme'
// Respects prefers-color-scheme on first load
```

---

## Coding Conventions

- **Named exports everywhere** — no default exports except `App.tsx` and `main.tsx`
- **TypeScript strict** — always type component props explicitly
- **`any` casting** is accepted for `Partial<Element>` updates due to discriminated union complexity: `onChange({ x: v } as any)`
- **CSS Modules** — `import styles from './Foo.module.scss'`, never global class names
- **No inline styles** except dynamic values (transforms, sizes from state)
- **Folder = feature, index.tsx = public API** — `PropertiesPanel/index.tsx` exports `PropertiesPanel`
- **Store actions are imperative** — `updateElement(id, changes)` not `dispatch({ type })`
- **Hooks in `hooks/`** — never export hooks from store files
- **Utilities in `lib/`** — never put pure functions in store or type files

---

## Important Patterns

### Adding a new element type
1. Add type to `types/template.ts`
2. Add default factory to `lib/elementDefaults.ts`
3. Add renderer to `renderer/elements/`
4. Add case to `renderer/TemplateRenderer.tsx` switch
5. Add properties section to `editor/RightPanel/PropertiesPanel/sections/`
6. Add render logic to `workers/renderWorker.ts`

### Reusable confirm dialog
```tsx
const { confirm, dialogProps } = useConfirm()
const ok = await confirm({
  title: 'Delete?', message: 'This cannot be undone.',
  confirmLabel: 'Delete', variant: 'danger'
})
if (!ok) return
// ...proceed
// In JSX: {dialogProps && <ConfirmDialog {...dialogProps} />}
```

### Keyboard shortcuts
```tsx
useKeyboard([
  { key: 'z', meta: true, handler: undo },
  { key: 'z', meta: true, shift: true, handler: redo },
  { key: 'Delete', handler: () => { if (selectedId) deleteElement(selectedId) } },
  // meta: true → works even when an input is focused
  // no meta → suppressed when input/textarea/select is focused
])
```

### Asset picker modal
```tsx
// Two targets: 'main' (resizes element) or 'placeholder' (does not resize)
<AssetPickerModal
  onSelect={(asset, dims) => { /* update element */ }}
  onClose={() => setPickerTarget(null)}
  canvasWidth={template.canvas.width}
  canvasHeight={template.canvas.height}
  applyDimensions={pickerTarget === 'main'}  // hides size options for placeholder
/>
```

---

## Known Issues & Constraints

| Issue | Status | Notes |
|---|---|---|
| localStorage asset limit | Known, deferred | base64 dataUrls hit ~5MB; needs IndexedDB |
| Worker font rendering | Known, deferred | Inter (Google Fonts) unavailable in OffscreenCanvas; falls back to system sans-serif |
| No template autosave | Intentional | User must export JSON manually; no backend yet |
| Large PDF slow | Acceptable | Sequential image-to-PDF; fine for current scale |
| `initTemplate`/`loadTemplate` pollutes undo | Known | Should clear zundo history after these calls |
| No multi-select | Not implemented yet | Single element selection only |

---

## Environment Setup

```bash
cd frontend
npm install
npm run dev      # http://localhost:5173
npm run build    # production build to frontend/dist/
```

```ts
// vite.config.ts — standard, no special config
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({ plugins: [react()] })

// Web Workers: instantiated with Vite's import.meta.url pattern
new Worker(new URL('../workers/renderWorker.ts', import.meta.url), { type: 'module' })
```

---

## Future Backend Plan

When `backend/` is added:
- **Language**: Node.js + TypeScript
- **Renderer**: `@napi-rs/canvas` (Skia-based, same Canvas API as browser)
- **Migration point**: `renderEngine.ts` — replace `worker.postMessage` with `fetch('/api/render')`
- **Template JSON**: same format, no changes needed
- **Assets**: S3-compatible storage; replace `dataUrl` with remote URL in `ImageAsset`
- **Asset IDs**: migrate to content-hash (SHA-256) for true portability across users

---

## Pending / Next Steps

- [ ] Fix worker font rendering (load Inter as ArrayBuffer, pass to worker)
- [ ] IndexedDB for asset storage (replace localStorage persist)
- [ ] Template autosave to localStorage
- [ ] Multi-select elements
- [ ] Duplicate element (Ctrl+D)
- [ ] Copy/paste elements  
- [ ] Canvas background color in template settings
- [ ] Render cancellation button
- [ ] Single-row preview render before batch
- [ ] Column mapping UI (visual binding between dataset columns and elements)
- [ ] Backend migration (Node.js + @napi-rs/canvas)
