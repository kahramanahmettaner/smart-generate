import type { Element } from '../types/template'

export type GuideLine = {
  orientation: 'horizontal' | 'vertical'
  position:    number   // canvas coordinate
  from:        number   // start of the visual line
  to:          number   // end of the visual line
}

type Box = { x: number; y: number; width: number; height: number }

const SNAP_THRESHOLD = 6  // px — how close before snapping

function getSnapPoints(box: Box) {
  return {
    left:   box.x,
    centerX: box.x + box.width / 2,
    right:  box.x + box.width,
    top:    box.y,
    centerY: box.y + box.height / 2,
    bottom: box.y + box.height,
  }
}

export type SnapResult = {
  x:      number        // snapped x position
  y:      number        // snapped y position
  guides: GuideLine[]   // lines to draw
}

/**
 * Calculate snap position and alignment guides for a dragging element.
 *
 * @param dragging   - the element being dragged (current position)
 * @param others     - all other elements on the canvas
 * @param canvas     - canvas dimensions
 * @param snapToGrid - whether grid snapping is enabled
 * @param gridSize   - grid size in px
 */
export function calculateSnap(
  dragging:    Box,
  others:      Element[],
  canvas:      { width: number; height: number },
  snapToGrid:  boolean,
  gridSize:    number,
): SnapResult {
  let snapX = dragging.x
  let snapY = dragging.y
  const guides: GuideLine[] = []

  const dragPoints = getSnapPoints(dragging)

  // ── Canvas snap points ────────────────────────────────────────────────────
  const canvasBox: Box = { x: 0, y: 0, width: canvas.width, height: canvas.height }
  const canvasPoints   = getSnapPoints(canvasBox)

  // ── Collect all target snap points ────────────────────────────────────────
  const targets: Box[] = [
    canvasBox,
    ...others.map((el) => ({ x: el.x, y: el.y, width: el.width, height: el.height })),
  ]

  let bestDeltaX = SNAP_THRESHOLD + 1
  let bestDeltaY = SNAP_THRESHOLD + 1

  for (const target of targets) {
    const tp = getSnapPoints(target)
    const isCanvas = target === canvasBox

    // Check each drag point against each target point (horizontal = Y axis)
    const xPairs: [number, number][] = [
      [dragPoints.left,    tp.left],
      [dragPoints.left,    tp.centerX],
      [dragPoints.left,    tp.right],
      [dragPoints.centerX, tp.left],
      [dragPoints.centerX, tp.centerX],
      [dragPoints.centerX, tp.right],
      [dragPoints.right,   tp.left],
      [dragPoints.right,   tp.centerX],
      [dragPoints.right,   tp.right],
    ]

    const yPairs: [number, number][] = [
      [dragPoints.top,     tp.top],
      [dragPoints.top,     tp.centerY],
      [dragPoints.top,     tp.bottom],
      [dragPoints.centerY, tp.top],
      [dragPoints.centerY, tp.centerY],
      [dragPoints.centerY, tp.bottom],
      [dragPoints.bottom,  tp.top],
      [dragPoints.bottom,  tp.centerY],
      [dragPoints.bottom,  tp.bottom],
    ]

    for (const [dragPoint, targetPoint] of xPairs) {
      const delta = Math.abs(dragPoint - targetPoint)
      if (delta < SNAP_THRESHOLD && delta < bestDeltaX) {
        bestDeltaX = delta
        snapX = dragging.x + (targetPoint - dragPoint)

        const guideX = targetPoint
        const minY = Math.min(dragging.y, target.y)
        const maxY = Math.max(dragging.y + dragging.height, target.y + target.height)
        guides.push({
          orientation: 'vertical',
          position: guideX,
          from: isCanvas ? 0 : minY,
          to:   isCanvas ? canvas.height : maxY,
        })
      }
    }

    for (const [dragPoint, targetPoint] of yPairs) {
      const delta = Math.abs(dragPoint - targetPoint)
      if (delta < SNAP_THRESHOLD && delta < bestDeltaY) {
        bestDeltaY = delta
        snapY = dragging.y + (targetPoint - dragPoint)

        const guideY = targetPoint
        const minX = Math.min(dragging.x, target.x)
        const maxX = Math.max(dragging.x + dragging.width, target.x + target.width)
        guides.push({
          orientation: 'horizontal',
          position: guideY,
          from: isCanvas ? 0 : minX,
          to:   isCanvas ? canvas.width : maxX,
        })
      }
    }
  }

  // ── Grid snap (applied if no element snap found or in addition to it) ─────
  if (snapToGrid) {
    if (bestDeltaX > SNAP_THRESHOLD) {
      snapX = Math.round(snapX / gridSize) * gridSize
    }
    if (bestDeltaY > SNAP_THRESHOLD) {
      snapY = Math.round(snapY / gridSize) * gridSize
    }
  }

  return { x: snapX, y: snapY, guides }
}

/**
 * Snap a resize operation (width/height) to grid.
 */
export function snapResize(
  width:      number,
  height:     number,
  snapToGrid: boolean,
  gridSize:   number,
): { width: number; height: number } {
  if (!snapToGrid) return { width, height }
  return {
    width:  Math.round(width  / gridSize) * gridSize,
    height: Math.round(height / gridSize) * gridSize,
  }
}