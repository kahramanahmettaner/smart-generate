export type BindableString =
  | { type: 'static'; value: string }
  | { type: 'binding'; column: string }

// Image sources get their own type — more explicit than BindableString
export type ImageSrc =
  | { type: 'asset';   assetId: string }
  | { type: 'binding'; column: string }
  | { type: 'none' }  // placeholder state — no asset selected yet


export type BindableNumber =
  | { type: 'static'; value: number }
  | { type: 'binding'; column: string }

// Resolve a bindable value against a data row
export function resolve<T>(
  bindable: { type: 'static'; value: T } | { type: 'binding'; column: string },
  row?: Record<string, string>
): T | string {
  if (bindable.type === 'static') return bindable.value
  return row?.[bindable.column] ?? `{{${bindable.column}}}`
}

export type BaseElement = {
  id: string
  x: number
  y: number
  width: number
  height: number
  rotation: number
  opacity: number
  visible: boolean
  locked: boolean
  aspectRatioLocked: boolean
}

export type RectElement = BaseElement & {
  type: 'rect'
  props: {
    fill: string
    stroke: string
    strokeWidth: number
    cornerRadius: number
  }
}

export type TextElement = BaseElement & {
  type: 'text'
  props: {
    content: BindableString
    fontSize: number
    fontFamily: string
    color: string
    fontWeight: 'normal' | 'bold'
    align: 'left' | 'center' | 'right'
    lineHeight: number
  }
}

export type ImageElement = BaseElement & {
  type: 'image'
  props: {
    src: ImageSrc
    fit: 'cover' | 'contain' | 'fill'
    align: ImageAlign
  }
}

export type Element =
  | RectElement
  | TextElement
  | ImageElement

export type CanvasConfig = {
  width: number
  height: number
  background: string
}

export type Template = {
  id: string
  name: string
  canvas: CanvasConfig
  elements: Element[]
}

export type ImageAlign = {
  horizontal: 'left' | 'center' | 'right'
  vertical:   'top'  | 'center' | 'bottom'
}