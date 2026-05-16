export type BindableString =
  | { type: 'static'; value: string }
  | { type: 'binding'; column: string }

export type ImageSrc =
  | { type: 'none' }
  | { type: 'asset';   assetId: string; assetName: string }
  | { type: 'binding'; column: string; placeholder?: { assetId: string; assetName: string } }

export type BindableNumber =
  | { type: 'static';  value: number }
  | { type: 'binding'; column: string }

export type BaseElement = {
  id:               string
  x:                number
  y:                number
  width:            number
  height:           number
  rotation:         number
  opacity:          number
  visible:          boolean
  locked:           boolean
  aspectRatioLocked: boolean
}

export type RectElement = BaseElement & {
  type: 'rect'
  props: {
    fill:         string
    stroke:       string
    strokeWidth:  number
    cornerRadius: number
  }
}

export type EllipseElement = BaseElement & {
  type: 'ellipse'
  props: {
    fill:        string
    stroke:      string
    strokeWidth: number
  }
}

export type LineElement = BaseElement & {
  type: 'line'
  props: {
    stroke:      string
    strokeWidth: number
    dash:        number[]   // [] = solid, [8,4] = dashed, [2,4] = dotted
  }
}

export type TextElement = BaseElement & {
  type: 'text'
  props: {
    content:    BindableString
    fontSize:   number
    fontFamily: string
    color:      string
    fontWeight: 'normal' | 'bold'
    align:      'left' | 'center' | 'right'
    lineHeight: number
  }
}

export type ImageElement = BaseElement & {
  type: 'image'
  props: {
    src:          ImageSrc
    fit:          'cover' | 'contain' | 'fill'
    align:        ImageAlign
    cornerRadius: number   // 0 = square, >0 = rounded, high value = circle
  }
}

export type Element =
  | RectElement
  | EllipseElement
  | LineElement
  | TextElement
  | ImageElement

export type CanvasConfig = {
  width:      number
  height:     number
  background: string   // hex color OR 'transparent'
}

export type Template = {
  id:       string
  name:     string
  canvas:   CanvasConfig
  elements: Element[]
}

export type ImageAlign = {
  horizontal: 'left' | 'center' | 'right'
  vertical:   'top'  | 'center' | 'bottom'
}
