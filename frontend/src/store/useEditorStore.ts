import { create } from 'zustand'
import { temporal } from 'zundo'
import type { Template, Element } from '../types/template'

type EditorState = {
  template: Template
  selectedId: string | null

  // Actions
  selectElement: (id: string | null) => void
  addElement: (el: Element) => void
  updateElement: (id: string, changes: Partial<Element>) => void
  deleteElement: (id: string) => void
  reorderElements: (orderedIds: string[]) => void
}

const defaultTemplate: Template = {
  id: 'tpl_default',
  name: 'Untitled Template',
  canvas: { width: 1080, height: 1080, background: '#ffffff' },
  elements: [
    {
      id: 'el_001',
      type: 'rect',
      x: 100, y: 100,
      width: 300, height: 200,
      rotation: 0, opacity: 1,
      visible: true, locked: false,
      props: {
        fill: '#E0E7FF',
        stroke: '#6366F1',
        strokeWidth: 2,
        cornerRadius: 8,
      }
    },
    {
      id: 'el_002',
      type: 'text',
      x: 100, y: 340,
      width: 400, height: 60,
      rotation: 0, opacity: 1,
      visible: true, locked: false,
      props: {
        content: { type: 'static', value: 'Hello World' },
        fontSize: 32,
        fontFamily: 'Inter',
        color: '#111827',
        fontWeight: 'bold',
        align: 'left',
        lineHeight: 1.4,
      }
    }
  ]
}

export const useEditorStore = create<EditorState>()(
  temporal(
    (set) => ({
      template: defaultTemplate,
      selectedId: null,

      selectElement: (id) =>
        set({ selectedId: id }),

      addElement: (el) =>
        set((state) => ({
          template: {
            ...state.template,
            elements: [...state.template.elements, el]
          }
        })),

      updateElement: (id, changes) =>
        set((state) => ({
          template: {
            ...state.template,
            elements: state.template.elements.map((el) =>
              el.id === id ? ({ ...el, ...changes } as Element) : el
            )
          }
        })),

      deleteElement: (id) =>
        set((state) => ({
          template: {
            ...state.template,
            elements: state.template.elements.filter((el) => el.id !== id)
          },
          selectedId: null
        })),

      reorderElements: (orderedIds) =>
        set((state) => ({
          template: {
            ...state.template,
            elements: orderedIds
              .map((id) => state.template.elements.find((el) => el.id === id))
              .filter(Boolean) as Element[]
          }
        })),
    }),
    {
      limit: 50,
      // only track template changes in history, not selection
      partialize: (state) => ({ template: state.template }),
    }
  )
)

// Separate hook for history controls
export const useHistory = () => {
  const { undo, redo, pastStates, futureStates } = useEditorStore.temporal.getState()
  return {
    undo,
    redo,
    canUndo: pastStates.length > 0,
    canRedo: futureStates.length > 0,
  }
}