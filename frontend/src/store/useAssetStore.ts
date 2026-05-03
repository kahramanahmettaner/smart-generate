import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ImageAsset } from '../types/asset'
import { generateId, uniqueName } from '../lib/utils'

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

// ─── Helpers ────────────────────────────────────────────────────────────────

export function fitDimensions(
  imgW: number, imgH: number,
  canvasW: number, canvasH: number,
  options: {
    keepOriginalResolution: boolean
    keepAspectRatio:        boolean
    maxFraction?:           number
  }
): { width: number; height: number } {
  if (options.keepOriginalResolution) {
    return { width: imgW, height: imgH }
  }
  if (!options.keepAspectRatio) {
    return {
      width:  Math.round(canvasW * (options.maxFraction ?? 0.6)),
      height: Math.round(canvasH * (options.maxFraction ?? 0.6)),
    }
  }
  const maxW  = canvasW * (options.maxFraction ?? 0.6)
  const maxH  = canvasH * (options.maxFraction ?? 0.6)
  const ratio = imgW / imgH
  let w = maxW
  let h = w / ratio
  if (h > maxH) { h = maxH; w = h * ratio }
  return { width: Math.round(w), height: Math.round(h) }
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader   = new FileReader()
    reader.onload  = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

function getImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img  = new Image()
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
    img.src    = dataUrl
  })
}

function fileNameWithoutExtension(name: string): string {
  return name.replace(/\.[^/.]+$/, '')
}