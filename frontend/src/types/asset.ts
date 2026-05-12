export type ImageAsset = {
  id:        string
  name:      string
  url:       string   // served URL: /files/... (local) or https://... (R2)
  width:     number
  height:    number
  size:      number   // bytes
  createdAt: number   // timestamp ms
}