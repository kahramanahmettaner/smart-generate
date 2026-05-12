import { create } from 'zustand'
import { datasetsApi, type ApiDatasetWithRows } from '../lib/api'
import { useProjectStore } from './useProjectStore'
import type { Dataset, DatasetSummary, DataRow } from '../types/dataset'

// Convert backend response → frontend Dataset
function toDataset(d: ApiDatasetWithRows): Dataset {
  return {
    id:        d.id,
    projectId: d.projectId,
    name:      d.name,
    columns:   d.columns,
    rows:      d.rows,
    rowCount:  d.rowCount,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  }
}

type DatasetState = {
  // List of datasets for current project (metadata only, no rows)
  datasetList:      DatasetSummary[]
  // Currently loaded dataset (with rows)
  dataset:          Dataset | null
  selectedRowIndex: number | null
  loading:          boolean
  error:            string | null

  // Actions
  fetchDatasetList: ()                          => Promise<void>
  loadDataset:      (id: string)                => Promise<void>
  uploadDataset:    (file: File, name: string)  => Promise<void>
  deleteDataset:    (id: string)                => Promise<void>
  clearDataset:     ()                          => void
  clearDatasetList: ()                          => void
  selectRow:        (index: number | null)      => void
  updateCell:       (rowIndex: number, key: string, value: string) => void
  addRow:           ()                          => void
  deleteRow:        (index: number)             => void
}

export const useDatasetStore = create<DatasetState>((set) => ({
  datasetList:      [],
  dataset:          null,
  selectedRowIndex: null,
  loading:          false,
  error:            null,

  // ── Fetch dataset list for current project (no rows) ─────────────────────

  fetchDatasetList: async () => {
    const projectId = useProjectStore.getState().currentProject?.id
    if (!projectId) { set({ datasetList: [] }); return }

    set({ loading: true, error: null })
    try {
      const list = await datasetsApi.list(projectId)
      set({ datasetList: list, loading: false })
    } catch (err: any) {
      set({ error: err.message ?? 'Failed to load datasets', loading: false })
    }
  },

  // ── Load a specific dataset with its rows ─────────────────────────────────

  loadDataset: async (id: string) => {
    const projectId = useProjectStore.getState().currentProject?.id
    if (!projectId) return

    set({ loading: true, error: null })
    try {
      const data = await datasetsApi.get(projectId, id)
      set({ dataset: toDataset(data), selectedRowIndex: null, loading: false })
    } catch (err: any) {
      set({ error: err.message ?? 'Failed to load dataset', loading: false })
    }
  },

  // ── Upload a CSV/Excel file ───────────────────────────────────────────────

  uploadDataset: async (file: File, name: string) => {
    const projectId = useProjectStore.getState().currentProject?.id
    if (!projectId) throw new Error('No project selected')

    set({ loading: true, error: null })
    try {
      // Upload returns summary (no rows) — then load full dataset
      const summary = await datasetsApi.upload(projectId, file, name)
      // Add to list
      set((state) => ({
        datasetList: [summary, ...state.datasetList],
      }))
      // Load the full dataset with rows
      const full = await datasetsApi.get(projectId, summary.id)
      set({ dataset: toDataset(full), selectedRowIndex: null, loading: false })
    } catch (err: any) {
      set({ error: err.message ?? 'Failed to upload dataset', loading: false })
      throw err
    }
  },

  // ── Delete a dataset ──────────────────────────────────────────────────────

  deleteDataset: async (id: string) => {
    const projectId = useProjectStore.getState().currentProject?.id
    if (!projectId) return

    await datasetsApi.delete(projectId, id)
    set((state) => ({
      datasetList: state.datasetList.filter((d) => d.id !== id),
      dataset:     state.dataset?.id === id ? null : state.dataset,
      selectedRowIndex: state.dataset?.id === id ? null : state.selectedRowIndex,
    }))
  },

  // ── Clear dataset list (on project switch)

  clearDatasetList: () =>
    set({ datasetList: [], loading: false, error: null }),

  // ── Clear current dataset from view ──────────────────────────────────────

  clearDataset: () =>
    set({ dataset: null, selectedRowIndex: null }),

  // ── Row selection ─────────────────────────────────────────────────────────

  selectRow: (index) =>
    set({ selectedRowIndex: index }),

  // ── Local cell editing (updates in memory, no backend call) ──────────────
  // TODO: add autosave for cell edits if needed in future

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
          rows:     [...state.dataset.rows, empty],
          rowCount: state.dataset.rowCount + 1,
        }
      }
    }),

  deleteRow: (index) =>
    set((state) => {
      if (!state.dataset) return state
      const rows = state.dataset.rows.filter((_, i) => i !== index)
      const selectedRowIndex =
        state.selectedRowIndex === index       ? null :
        state.selectedRowIndex !== null &&
        state.selectedRowIndex > index         ? state.selectedRowIndex - 1 :
        state.selectedRowIndex
      return {
        dataset: { ...state.dataset, rows, rowCount: rows.length },
        selectedRowIndex,
      }
    }),
}))