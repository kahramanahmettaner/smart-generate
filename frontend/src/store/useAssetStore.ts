import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ImageAsset } from '../types/asset'
import { generateId } from '../lib/utils'

type AssetStore = {
  assets: Record<string, ImageAsset>
  addAsset: (file: File) => Promise<ImageAsset>
  removeAsset: (id: string) => void
  getAsset: (id: string) => ImageAsset | undefined
}

// Given image natural dimensions and a canvas size,
// return element dimensions that fit within the canvas
// while maintaining aspect ratio
export function fitDimensions(
  imgW: number,
  imgH: number,
  canvasW: number,
  canvasH: number,
  options: {
    keepOriginalResolution: boolean
    keepAspectRatio: boolean
    maxFraction?: number  // max fraction of canvas to occupy (default 0.6)
  }
): { width: number; height: number } {
  if (options.keepOriginalResolution) {
    return { width: imgW, height: imgH }
  }

  if (!options.keepAspectRatio) {
    // Default size — 60% of canvas, ignore aspect ratio
    return {
      width:  Math.round(canvasW * (options.maxFraction ?? 0.6)),
      height: Math.round(canvasH * (options.maxFraction ?? 0.6)),
    }
  }

  // Keep aspect ratio, fit within maxFraction of canvas
  const maxW   = canvasW * (options.maxFraction ?? 0.6)
  const maxH   = canvasH * (options.maxFraction ?? 0.6)
  const ratio  = imgW / imgH
  let w = maxW
  let h = w / ratio
  if (h > maxH) {
    h = maxH
    w = h * ratio
  }
  return { width: Math.round(w), height: Math.round(h) }
}

export const useAssetStore = create<AssetStore>()(
  persist(
    (set, get) => ({
      assets: {},

      addAsset: async (file: File): Promise<ImageAsset> => {
        const dataUrl = await readFileAsDataUrl(file)
        const dims    = await getImageDimensions(dataUrl)
        const asset: ImageAsset = {
          id:        generateId('ast'),
          name:      fileNameWithoutExtension(file.name),
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

      getAsset: (id) => get().assets[id],
    }),
    { name: 'imagio-assets' }
  )
)

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