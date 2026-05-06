import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Dataset, DataRow } from '../types/dataset'

type DatasetStore = {
  dataset:         Dataset | null
  selectedRowIndex: number | null

  setDataset:       (dataset: Dataset) => void
  clearDataset:     () => void
  selectRow:        (index: number | null) => void
  updateCell:       (rowIndex: number, key: string, value: string) => void
  addRow:           () => void
  deleteRow:        (index: number) => void
}

export const useDatasetStore = create<DatasetStore>()(
  persist(
    (set) => ({
      dataset:          null,
      selectedRowIndex: null,

      setDataset: (dataset) =>
        set({ dataset, selectedRowIndex: null }),

      clearDataset: () =>
        set({ dataset: null, selectedRowIndex: null }),

      selectRow: (index) =>
        set({ selectedRowIndex: index }),

      updateCell: (rowIndex, key, value) =>
        set((state) => {
          if (!state.dataset) return state
          const rows = state.dataset.rows.map((row, i) =>
            i === rowIndex ? { ...row, [key]: value } : row
          )
          return { dataset: { ...state.dataset, rows } }
        }),

      addRow: () =>
        set((state) => {
          if (!state.dataset) return state
          const empty: DataRow = {}
          state.dataset.columns.forEach((col) => { empty[col.key] = '' })
          return {
            dataset: {
              ...state.dataset,
              rows: [...state.dataset.rows, empty]
            }
          }
        }),

      deleteRow: (index) =>
        set((state) => {
          if (!state.dataset) return state
          const rows = state.dataset.rows.filter((_, i) => i !== index)
          const selectedRowIndex =
            state.selectedRowIndex === index ? null :
            state.selectedRowIndex !== null && state.selectedRowIndex > index
              ? state.selectedRowIndex - 1
              : state.selectedRowIndex
          return { dataset: { ...state.dataset, rows }, selectedRowIndex }
        }),
    }),
    {
      name: 'imagio-dataset',
      // Don't persist huge datasets — keep session only
      // Remove this if you want persistence across refreshes
      skipHydration: false,
    }
  )
)