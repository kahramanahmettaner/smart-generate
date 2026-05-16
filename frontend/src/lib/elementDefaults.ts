import type { RectElement, TextElement, ImageElement, EllipseElement, LineElement } from '../types/template'
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
      cornerRadius: 0,
    },
  }
}

export function createEllipseElement(x = 100, y = 100): EllipseElement {
  return {
    id: generateId('ellipse'),
    type: 'ellipse',
    x, y,
    width: 160, height: 160,
    rotation: 0, opacity: 1,
    visible: true, locked: false,
    aspectRatioLocked: false,
    props: {
      fill:        '#E0E7FF',
      stroke:      '#6366F1',
      strokeWidth: 2,
    },
  }
}

export function createLineElement(x = 100, y = 200): LineElement {
  return {
    id: generateId('line'),
    type: 'line',
    // For lines, width = length, height = strokeWidth (used for hit area)
    x, y,
    width: 300, height: 2,
    rotation: 0, opacity: 1,
    visible: true, locked: false,
    aspectRatioLocked: false,
    props: {
      stroke:      '#111111',
      strokeWidth: 2,
      dash:        [],
    },
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
    },
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
      src:          { type: 'none' },
      fit:          'cover',
      align:        { horizontal: 'center', vertical: 'center' },
      cornerRadius: 0,
    },
  }
}
