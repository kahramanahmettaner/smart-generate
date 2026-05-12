import { create } from 'zustand'
import { projectsApi, type ApiProject } from '../lib/api'
import { useAssetStore }   from './useAssetStore'
import { useDatasetStore } from './useDatasetStore'
import { useEditorStore }  from './useEditorStore'

type ProjectState = {
  projects:       ApiProject[]
  currentProject: ApiProject | null
  loading:        boolean
  error:          string | null

  // Actions
  fetchProjects:    ()                           => Promise<void>
  createProject:    (name: string)               => Promise<ApiProject>
  renameProject:    (id: string, name: string)   => Promise<void>
  deleteProject:    (id: string)                 => Promise<void>
  selectProject:    (project: ApiProject | null) => void
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects:       [],
  currentProject: null,
  loading:        false,
  error:          null,

  fetchProjects: async () => {
    set({ loading: true, error: null })
    try {
      const projects = await projectsApi.list()
      set({ projects, loading: false })
    } catch (err: any) {
      set({ error: err.message ?? 'Failed to load projects', loading: false })
    }
  },

  createProject: async (name) => {
    const project = await projectsApi.create(name)
    set((state) => ({ projects: [project, ...state.projects] }))
    return project
  },

  renameProject: async (id, name) => {
    const updated = await projectsApi.rename(id, name)
    set((state) => ({
      projects: state.projects.map((p) => p.id === id ? updated : p),
      currentProject: state.currentProject?.id === id ? updated : state.currentProject,
    }))
  },

  deleteProject: async (id) => {
    await projectsApi.delete(id)
    set((state) => ({
      projects:       state.projects.filter((p) => p.id !== id),
      currentProject: state.currentProject?.id === id ? null : state.currentProject,
    }))
  },

  selectProject: (project) => {
    const current = get().currentProject

    // Only clear state if actually switching to a different project
    if (current?.id !== project?.id) {
      useAssetStore.getState().clearAssets()
      useDatasetStore.getState().clearDataset()
      useDatasetStore.getState().clearDatasetList()
      useEditorStore.getState().setProjectContext(
        project?.id ?? null,
        null,
      )
    }

    set({ currentProject: project })
  },
}))