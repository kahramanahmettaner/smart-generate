import { create } from 'zustand'
import { temporal } from 'zundo'
import { generateId } from '../lib/utils'
import type { Template, Element, ImageElement } from '../types/template'
import type { TemplateConfig } from '../components/TemplateConfigModal/TemplateConfigModal'
import { resolveAssetIds } from '../lib/templateUtils'

// ── Editor settings (not persisted in undo history) ──────────────────────────

export type EditorSettings = {
  snapToGrid:    boolean
  gridSize:      number   // px
  showGuides:    boolean
}

const defaultSettings: EditorSettings = {
  snapToGrid: false,
  gridSize:   10,
  showGuides: true,
}

type EditorState = {
  template:    Template
  selectedIds: string[]         // multi-select — replaces selectedId
  clipboard:   Element[] | null // copy/paste buffer

  // Backend context
  projectId:  string | null
  templateId: string | null

  // Editor settings
  settings: EditorSettings

  // ── Selection ──────────────────────────────────────────────────────────────
  selectElement:    (id: string | null) => void          // single select (clears others)
  selectElements:   (ids: string[]) => void              // set full selection
  addToSelection:   (id: string) => void                 // Shift+click
  toggleSelection:  (id: string) => void                 // toggle one element
  clearSelection:   () => void

  // ── Element CRUD ───────────────────────────────────────────────────────────
  addElement:       (el: Element) => void
  updateElement:    (id: string, changes: Partial<Element>) => void
  updateElements:   (ids: string[], changes: Partial<Element>) => void  // batch update
  deleteElement:    (id: string) => void
  deleteElements:   (ids: string[]) => void
  duplicateElement: (id: string) => void
  duplicateElements:(ids: string[]) => void
  reorderElements:  (orderedIds: string[]) => void

  // ── Clipboard ──────────────────────────────────────────────────────────────
  copyElements:     (ids: string[]) => void
  pasteElements:    () => void

  // ── Template lifecycle ─────────────────────────────────────────────────────
  initTemplate:       (config: TemplateConfig) => void
  loadTemplate:       (template: Template) => void
  exportTemplateJson: () => string
  syncAssetName:      (oldName: string, newName: string) => void

  // ── Backend context ────────────────────────────────────────────────────────
  setProjectContext:  (projectId: string | null, templateId: string | null) => void

  // ── Settings ───────────────────────────────────────────────────────────────
  updateSettings:     (changes: Partial<EditorSettings>) => void
}

const defaultTemplate: Template = {
  id:     generateId('tpl'),
  name:   'Untitled template',
  canvas: { width: 1080, height: 1080, background: '#ffffff' },
  elements: [],
}

// Paste offset so pasted elements don't sit exactly on top of originals
const PASTE_OFFSET = 20

export const useEditorStore = create<EditorState>()(
  temporal(
    (set, get) => ({
      template:    defaultTemplate,
      selectedIds: [],
      clipboard:   null,
      projectId:   null,
      templateId:  null,
      settings:    defaultSettings,

      // ── Selection ────────────────────────────────────────────────────────

      selectElement: (id) =>
        set({ selectedIds: id ? [id] : [] }),

      selectElements: (ids) =>
        set({ selectedIds: ids }),

      addToSelection: (id) =>
        set((state) => ({
          selectedIds: state.selectedIds.includes(id)
            ? state.selectedIds
            : [...state.selectedIds, id],
        })),

      toggleSelection: (id) =>
        set((state) => ({
          selectedIds: state.selectedIds.includes(id)
            ? state.selectedIds.filter((s) => s !== id)
            : [...state.selectedIds, id],
        })),

      clearSelection: () =>
        set({ selectedIds: [] }),

      // ── Element CRUD ─────────────────────────────────────────────────────

      addElement: (el) =>
        set((state) => ({
          template: {
            ...state.template,
            elements: [...state.template.elements, el],
          },
        })),

      updateElement: (id, changes) =>
        set((state) => ({
          template: {
            ...state.template,
            elements: state.template.elements.map((el) =>
              el.id === id ? { ...el, ...changes } as Element : el
            ),
          },
        })),

      updateElements: (ids, changes) =>
        set((state) => ({
          template: {
            ...state.template,
            elements: state.template.elements.map((el) =>
              ids.includes(el.id) ? { ...el, ...changes } as Element : el
            ),
          },
        })),

      deleteElement: (id) =>
        set((state) => ({
          template: {
            ...state.template,
            elements: state.template.elements.filter((el) => el.id !== id),
          },
          selectedIds: state.selectedIds.filter((s) => s !== id),
        })),

      deleteElements: (ids) =>
        set((state) => ({
          template: {
            ...state.template,
            elements: state.template.elements.filter((el) => !ids.includes(el.id)),
          },
          selectedIds: state.selectedIds.filter((s) => !ids.includes(s)),
        })),

      duplicateElement: (id) => {
        const el = get().template.elements.find((e) => e.id === id)
        if (!el) return
        const copy: Element = {
          ...el,
          id: generateId(el.type),
          x:  el.x + PASTE_OFFSET,
          y:  el.y + PASTE_OFFSET,
        }
        set((state) => ({
          template: {
            ...state.template,
            elements: [...state.template.elements, copy],
          },
          selectedIds: [copy.id],
        }))
      },

      duplicateElements: (ids) => {
        const elements = get().template.elements.filter((e) => ids.includes(e.id))
        if (!elements.length) return
        const copies: Element[] = elements.map((el) => ({
          ...el,
          id: generateId(el.type),
          x:  el.x + PASTE_OFFSET,
          y:  el.y + PASTE_OFFSET,
        }))
        set((state) => ({
          template: {
            ...state.template,
            elements: [...state.template.elements, ...copies],
          },
          selectedIds: copies.map((c) => c.id),
        }))
      },

      reorderElements: (orderedIds) =>
        set((state) => ({
          template: {
            ...state.template,
            elements: orderedIds
              .map((id) => state.template.elements.find((el) => el.id === id))
              .filter(Boolean) as Element[],
          },
        })),

      // ── Clipboard ────────────────────────────────────────────────────────

      copyElements: (ids) => {
        const elements = get().template.elements.filter((e) => ids.includes(e.id))
        set({ clipboard: elements })
      },

      pasteElements: () => {
        const { clipboard } = get()
        if (!clipboard || clipboard.length === 0) return
        const copies: Element[] = clipboard.map((el) => ({
          ...el,
          id: generateId(el.type),
          x:  el.x + PASTE_OFFSET,
          y:  el.y + PASTE_OFFSET,
        }))
        set((state) => ({
          template: {
            ...state.template,
            elements: [...state.template.elements, ...copies],
          },
          selectedIds: copies.map((c) => c.id),
          // Update clipboard to the pasted copies so repeated pastes cascade
          clipboard: copies,
        }))
      },

      // ── Template lifecycle ────────────────────────────────────────────────

      initTemplate: (config) =>
        set({
          template: {
            id:     generateId('tpl'),
            name:   config.name,
            canvas: { width: config.width, height: config.height, background: '#ffffff' },
            elements: [],
          },
          selectedIds: [],
          clipboard:   null,
        }),

      loadTemplate: (template) => {
        const resolved = resolveAssetIds(template)
        set({ template: resolved, selectedIds: [], clipboard: null })
      },

      exportTemplateJson: () => JSON.stringify(get().template, null, 2),

      syncAssetName: (oldName, newName) =>
        set((state) => ({
          template: {
            ...state.template,
            elements: state.template.elements.map((el) => {
              if (el.type !== 'image') return el
              const imgEl = el as ImageElement
              const src   = imgEl.props.src
              if (src.type === 'asset' && src.assetName === oldName) {
                return { ...imgEl, props: { ...imgEl.props, src: { ...src, assetName: newName } } }
              }
              if (src.type === 'binding' && src.placeholder?.assetName === oldName) {
                return { ...imgEl, props: { ...imgEl.props,
                  src: { ...src, placeholder: { ...src.placeholder, assetName: newName } } } }
              }
              return el
            }),
          },
        })),

      // ── Backend context ───────────────────────────────────────────────────

      setProjectContext: (projectId, templateId) =>
        set({ projectId, templateId }),

      // ── Settings ─────────────────────────────────────────────────────────

      updateSettings: (changes) =>
        set((state) => ({
          settings: { ...state.settings, ...changes },
        })),
    }),
    {
      limit: 50,
      // Only track template changes in undo history
      partialize: (state) => ({ template: state.template }),
    }
  )
)

// ── Convenience selector for single selected id (backward compat) ─────────────
// Components that only care about one selected element can use this
export const getSelectedId = (state: EditorState): string | null =>
  state.selectedIds.length === 1 ? state.selectedIds[0] : null