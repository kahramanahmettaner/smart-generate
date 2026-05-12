import { create } from 'zustand'
import { projectsApi, type ApiProject } from '../lib/api'

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

export const useProjectStore = create<ProjectState>((set) => ({
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
    set({ currentProject: project })
  },
}))