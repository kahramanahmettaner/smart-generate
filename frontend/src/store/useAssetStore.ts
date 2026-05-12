import { create } from 'zustand'
import { assetsApi, type ApiAsset } from '../lib/api'
import { useProjectStore } from './useProjectStore'
import { fileNameWithoutExtension, getImageDimensions } from '../lib/imageUtils'
import { uniqueName } from '../lib/utils'
import type { ImageAsset } from '../types/asset'

// Convert backend ApiAsset → frontend ImageAsset
function toImageAsset(a: ApiAsset): ImageAsset {
  return {
    id:        a.id,
    name:      a.name,
    url:       assetsApi.fileUrl(a.url),
    width:     a.width  ?? 0,
    height:    a.height ?? 0,
    size:      a.sizeBytes ?? 0,
    createdAt: new Date(a.createdAt).getTime(),
  }
}

type AssetState = {
  assets:  Record<string, ImageAsset>
  loading: boolean
  error:   string | null

  // Actions
  fetchAssets:      ()                                    => Promise<void>
  addAsset:         (file: File)                          => Promise<ImageAsset>
  addAssetWithName: (file: File, name: string)            => Promise<ImageAsset>
  removeAsset:      (id: string)                          => Promise<void>
  renameAsset:      (id: string, newName: string)         => void   // local only — no rename endpoint yet
  getAsset:         (id: string)                          => ImageAsset | undefined
  getAssetByName:   (name: string)                        => ImageAsset | undefined
  clearAssets:      ()                                    => void
  resolveOrAdd:     (file: File, preferredName: string)   => Promise<ImageAsset>
}

export const useAssetStore = create<AssetState>((set, get) => ({
  assets:  {},
  loading: false,
  error:   null,

  // ── Fetch all assets for current project ──────────────────────────────────

  fetchAssets: async () => {
    const projectId = useProjectStore.getState().currentProject?.id
    if (!projectId) { set({ assets: {} }); return }

    set({ loading: true, error: null })
    try {
      const list = await assetsApi.list(projectId)
      const assets: Record<string, ImageAsset> = {}
      list.forEach((a) => { assets[a.id] = toImageAsset(a) })
      set({ assets, loading: false })
    } catch (err: any) {
      set({ error: err.message ?? 'Failed to load assets', loading: false })
    }
  },

  // ── Upload a file, deriving name from filename ────────────────────────────

  addAsset: async (file: File): Promise<ImageAsset> => {
    const baseName      = fileNameWithoutExtension(file.name)
    const existingNames = Object.values(get().assets).map((a) => a.name)
    const name          = uniqueName(baseName, existingNames)
    return get().addAssetWithName(file, name)
  },

  // ── Upload a file with a specific name ───────────────────────────────────

  addAssetWithName: async (file: File, name: string): Promise<ImageAsset> => {
    const projectId = useProjectStore.getState().currentProject?.id
    if (!projectId) throw new Error('No project selected')

    // Get dimensions client-side before uploading
    const url  = URL.createObjectURL(file)
    const dims = await getImageDimensions(url)
    URL.revokeObjectURL(url)

    const apiAsset = await assetsApi.upload(
      projectId,
      file,
      name,
      dims.width,
      dims.height,
    )
    const asset = toImageAsset(apiAsset)

    set((state) => ({
      assets: { ...state.assets, [asset.id]: asset }
    }))

    return asset
  },

  // ── Delete asset from backend + local state ───────────────────────────────

  removeAsset: async (id: string): Promise<void> => {
    const projectId = useProjectStore.getState().currentProject?.id
    if (!projectId) return

    await assetsApi.delete(projectId, id)

    set((state) => {
      const next = { ...state.assets }
      delete next[id]
      return { assets: next }
    })
  },

  // ── Rename — local only for now (no backend rename endpoint yet) ──────────
  // TODO Phase 3+: add PATCH /projects/:pid/assets/:id endpoint

  renameAsset: (id: string, newName: string): void => {
    const existingNames = Object.values(get().assets)
      .filter((a) => a.id !== id)
      .map((a) => a.name)
    const safeName = uniqueName(newName, existingNames)
    set((state) => ({
      assets: {
        ...state.assets,
        [id]: { ...state.assets[id], name: safeName }
      }
    }))
  },

  // ── Clear all assets (on project switch)

  clearAssets: () =>
    set({ assets: {}, loading: false, error: null }),

  // ── Lookups ───────────────────────────────────────────────────────────────

  getAsset: (id) => get().assets[id],

  getAssetByName: (name) =>
    Object.values(get().assets).find((a) => a.name === name),

  // ── Used during template import ───────────────────────────────────────────
  // If an asset with this name already exists, return it.
  // Otherwise upload the file under this name.

  resolveOrAdd: async (file: File, preferredName: string): Promise<ImageAsset> => {
    const existing = get().getAssetByName(preferredName)
    if (existing) return existing
    return get().addAssetWithName(file, preferredName)
  },
}))