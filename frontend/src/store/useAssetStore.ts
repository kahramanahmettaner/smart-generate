import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ImageAsset } from '../types/asset'
import { generateId, uniqueName } from '../lib/utils'
import { fileNameWithoutExtension, getImageDimensions, readFileAsDataUrl } from '../lib/imageUtils'

type AssetStore = {
  assets: Record<string, ImageAsset>
  addAsset:          (file: File) => Promise<ImageAsset>
  addAssetWithName:  (file: File, name: string) => Promise<ImageAsset>
  removeAsset:       (id: string) => void
  renameAsset:       (id: string, name: string) => void
  getAsset:          (id: string) => ImageAsset | undefined
  getAssetByName:    (name: string) => ImageAsset | undefined
  resolveOrAdd:      (file: File, preferredName: string) => Promise<ImageAsset>
}

export const useAssetStore = create<AssetStore>()(
  persist(
    (set, get) => ({
      assets: {},

      addAsset: async (file: File): Promise<ImageAsset> => {
        const baseName    = fileNameWithoutExtension(file.name)
        const existingNames = Object.values(get().assets).map((a) => a.name)
        const name        = uniqueName(baseName, existingNames)
        return get().addAssetWithName(file, name)
      },

      addAssetWithName: async (file: File, name: string): Promise<ImageAsset> => {
        const dataUrl = await readFileAsDataUrl(file)
        const dims    = await getImageDimensions(dataUrl)
        const asset: ImageAsset = {
          id:        generateId('ast'),
          name,
          dataUrl,
          width:     dims.width,
          height:    dims.height,
          size:      file.size,
          createdAt: Date.now(),
        }
        set((state) => ({
          assets: { ...state.assets, [asset.id]: asset }
        }))
        return asset
      },

      removeAsset: (id) =>
        set((state) => {
          const next = { ...state.assets }
          delete next[id]
          return { assets: next }
        }),

      renameAsset: (id, newName) => {
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

      getAsset: (id) => get().assets[id],

      getAssetByName: (name) =>
        Object.values(get().assets).find((a) => a.name === name),

      // Used during template import:
      // If an asset with this name already exists locally, return it.
      // Otherwise add the file under this name (with dedup if needed).
      resolveOrAdd: async (file: File, preferredName: string): Promise<ImageAsset> => {
        const existing = get().getAssetByName(preferredName)
        if (existing) return existing
        return get().addAssetWithName(file, preferredName)
      },
    }),
    { name: 'imagio-assets' }
  )
)