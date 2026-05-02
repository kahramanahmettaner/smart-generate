export type ImageAsset = {
  id: string
  name: string
  dataUrl: string   // data:image/... for now, https://... after backend
  width: number
  height: number
  size: number      // bytes
  createdAt: number // timestamp
}