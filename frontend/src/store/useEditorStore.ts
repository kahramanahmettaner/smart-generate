import { create } from 'zustand'
import { temporal } from 'zundo'
import { generateId } from '../lib/utils'
import type { Template, Element, ImageElement } from '../types/template'
import type { TemplateConfig } from '../components/TemplateConfigModal/TemplateConfigModal'
import { resolveAssetIds } from '../lib/templateUtils'

type EditorState = {
  template:   Template
  selectedId: string | null

  // Selection
  selectElement:  (id: string | null) => void

  // Element CRUD
  addElement:      (el: Element) => void
  updateElement:   (id: string, changes: Partial<Element>) => void
  deleteElement:   (id: string) => void
  reorderElements: (orderedIds: string[]) => void

  // Template lifecycle
  initTemplate:       (config: TemplateConfig) => void
  loadTemplate:       (template: Template) => void
  exportTemplateJson: () => string
  syncAssetName:      (oldName: string, newName: string) => void
}

const defaultTemplate: Template = {
  id:     generateId('tpl'),
  name:   'Untitled template',
  canvas: {
    width:      1080,
    height:     1080,
    background: '#ffffff',
  },
  elements: [],
}

export const useEditorStore = create<EditorState>()(
  temporal(
    (set, get) => ({
      template:   defaultTemplate,
      selectedId: null,

      // ─── Selection ──────────────────────────────────────────────────────

      selectElement: (id) =>
        set({ selectedId: id }),

      // ─── Element CRUD ────────────────────────────────────────────────────

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

      deleteElement: (id) =>
        set((state) => ({
          template: {
            ...state.template,
            elements: state.template.elements.filter((el) => el.id !== id),
          },
          selectedId: state.selectedId === id ? null : state.selectedId,
        })),

      reorderElements: (orderedIds) =>
        set((state) => ({
          template: {
            ...state.template,
            elements: orderedIds
              .map((id) => state.template.elements.find((el) => el.id === id))
              .filter(Boolean) as Element[],
          },
        })),

      // ─── Template lifecycle ──────────────────────────────────────────────

      initTemplate: (config) =>
        set({
          template: {
            id:     generateId('tpl'),
            name:   config.name,
            canvas: {
              width:      config.width,
              height:     config.height,
              background: '#ffffff',
            },
            elements: [],
          },
          selectedId: null,
        }),

      // Update loadTemplate to resolve on load:
      loadTemplate: (template) => {
        const resolved = resolveAssetIds(template)
        set({ template: resolved, selectedId: null })
      },

      exportTemplateJson: () => {
        return JSON.stringify(get().template, null, 2)
      },

      syncAssetName: (oldName: string, newName: string) =>
        set((state) => ({
          template: {
            ...state.template,
            elements: state.template.elements.map((el) => {
              if (el.type !== 'image') return el
              const imgEl = el as ImageElement
              const src   = imgEl.props.src

              if (src.type === 'asset' && src.assetName === oldName) {
                return { ...imgEl, props: { ...imgEl.props,
                  src: { ...src, assetName: newName } } }
              }

              if (src.type === 'binding' && src.placeholder?.assetName === oldName) {
                return { ...imgEl, props: { ...imgEl.props,
                  src: { ...src, placeholder: { ...src.placeholder, assetName: newName } } } }
              }

              return el
            })
          }
        })),
    }),
    {
      limit: 50,
      // Only track template changes in history, not selection
      partialize: (state) => ({ template: state.template }),
    }
  )
)