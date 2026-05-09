import type { RectElement, TextElement, ImageElement } from '../types/template'
import { generateId } from './utils'

export function createRectElement(x = 100, y = 100): RectElement {
  return {
    id: generateId('rect'),
    type: 'rect',
    x, y,
    width: 200, height: 150,
    rotation: 0, opacity: 1,
    visible: true, locked: false,
    aspectRatioLocked: false,
    props: {
      fill:         '#E0E7FF',
      stroke:       '#6366F1',
      strokeWidth:  2,
      cornerRadius: 4,
    }
  }
}

export function createTextElement(x = 100, y = 100): TextElement {
  return {
    id: generateId('text'),
    type: 'text',
    x, y,
    width: 300, height: 50,
    rotation: 0, opacity: 1,
    visible: true, locked: false,
    aspectRatioLocked: false,
    props: {
      content:    { type: 'static', value: 'Text' },
      fontSize:   24,
      fontFamily: 'Inter',
      color:      '#111111',
      fontWeight: 'normal',
      align:      'left',
      lineHeight: 1.4,
    }
  }
}

export function createImageElement(x = 100, y = 100): ImageElement {
  return {
    id: generateId('img'),
    type: 'image',
    x, y,
    width: 300, height: 200,
    rotation: 0, opacity: 1,
    visible: true, locked: false,
    aspectRatioLocked: false,
    props: {
      src:   { type: 'none' },
      fit:   'cover',
      align: { horizontal: 'center', vertical: 'center' },
    }
  }
}