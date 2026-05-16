import { useRef, useState, useCallback } from 'react'
import type Konva from 'konva'
import { useEditorStore, getSelectedId } from '../../../../store/useEditorStore'
import { useHistory }    from '../../../../hooks/useHistory'
import { useKeyboard }   from '../../../../hooks/useKeyboard'
import { EditorCanvas }  from '../../../../editor/EditorCanvas'
import type { EditorCanvasHandle } from '../../../../editor/EditorCanvasHandle'
import { LeftPanel }     from '../../../../editor/LeftPannel/LeftPanel'
import { RightPanel }    from '../../../../editor/RightPannel/RightPanel'
import { ContextMenu }   from '../../../../components/ContextMenu/ContextMenu'
import type { ContextMenuItem } from '../../../../components/ContextMenu/ContextMenu'
import { exportToPng }   from '../../../../lib/export'
import type { Element }  from '../../../../types/template'
import styles from './DesignTab.module.scss'

const NUDGE_SMALL = 1
const NUDGE_LARGE = 10

type Tool = 'select' | 'rect' | 'ellipse' | 'line' | 'text' | 'image'

type ContextMenuState = { x: number; y: number } | null

export function DesignTab() {
  const {
    template, selectedIds, settings,
    selectElement, clearSelection, toggleSelection,
    updateElement, updateElements,
    deleteElement, deleteElements,
    duplicateElement, duplicateElements,
    copyElements, pasteElements,
    reorderElements, updateSettings,
  } = useEditorStore()

  const { undo, redo, canUndo, canRedo } = useHistory()
  const stageRef  = useRef<Konva.Stage>(null)
  const canvasRef = useRef<EditorCanvasHandle>(null)
  const [activeTool,   setActiveTool]   = useState<Tool>('select')
  const [contextMenu,  setContextMenu]  = useState<ContextMenuState>(null)

  // ── Z-order helpers ───────────────────────────────────────────────────────

  const bringForward = useCallback(() => {
    if (selectedIds.length !== 1) return
    const ids  = template.elements.map((e) => e.id)
    const idx  = ids.indexOf(selectedIds[0])
    if (idx >= ids.length - 1) return
    const next = [...ids];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
    reorderElements(next)
  }, [selectedIds, template.elements, reorderElements])

  const sendBackward = useCallback(() => {
    if (selectedIds.length !== 1) return
    const ids  = template.elements.map((e) => e.id)
    const idx  = ids.indexOf(selectedIds[0])
    if (idx <= 0) return
    const next = [...ids];
    [next[idx], next[idx - 1]] = [next[idx - 1], next[idx]]
    reorderElements(next)
  }, [selectedIds, template.elements, reorderElements])

  const bringToFront = useCallback(() => {
    if (selectedIds.length !== 1) return
    const ids = template.elements.map((e) => e.id)
    const idx = ids.indexOf(selectedIds[0])
    if (idx >= ids.length - 1) return
    const next = ids.filter((id) => id !== selectedIds[0])
    next.push(selectedIds[0])
    reorderElements(next)
  }, [selectedIds, template.elements, reorderElements])

  const sendToBack = useCallback(() => {
    if (selectedIds.length !== 1) return
    const ids = template.elements.map((e) => e.id)
    const idx = ids.indexOf(selectedIds[0])
    if (idx <= 0) return
    const next = ids.filter((id) => id !== selectedIds[0])
    next.unshift(selectedIds[0])
    reorderElements(next)
  }, [selectedIds, template.elements, reorderElements])

  // ── Nudge ─────────────────────────────────────────────────────────────────

  const nudge = useCallback((dx: number, dy: number) => {
    if (selectedIds.length === 0) return
    selectedIds.forEach((id) => {
      const el = template.elements.find((e) => e.id === id)
      if (!el || el.locked) return
      updateElement(id, { x: el.x + dx, y: el.y + dy } as Partial<Element>)
    })
  }, [selectedIds, template.elements, updateElement])

  // ── Delete / duplicate / select all ──────────────────────────────────────

  const deleteSelected = useCallback(() => {
    if (selectedIds.length === 0) return
    selectedIds.length === 1 ? deleteElement(selectedIds[0]) : deleteElements(selectedIds)
  }, [selectedIds, deleteElement, deleteElements])

  const duplicateSelected = useCallback(() => {
    if (selectedIds.length === 0) return
    selectedIds.length === 1 ? duplicateElement(selectedIds[0]) : duplicateElements(selectedIds)
  }, [selectedIds, duplicateElement, duplicateElements])

  const selectAll = useCallback(() => {
    const ids = template.elements.filter((el) => !el.locked && el.visible).map((el) => el.id)
    useEditorStore.getState().selectElements(ids)
  }, [template.elements])

  // ── Right-click context menu ──────────────────────────────────────────────

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    if (selectedIds.length === 0) return
    setContextMenu({ x: e.clientX, y: e.clientY })
  }, [selectedIds])

  const buildContextMenuItems = (): ContextMenuItem[] => {
    const single = selectedIds.length === 1
    const items: ContextMenuItem[] = [
      { type: 'action', label: 'Duplicate',   icon: '⎘', shortcut: 'Ctrl+D', onClick: duplicateSelected },
      { type: 'action', label: 'Copy',        icon: '⎘', shortcut: 'Ctrl+C', onClick: () => copyElements(selectedIds) },
      { type: 'action', label: 'Paste',       icon: '⎘', shortcut: 'Ctrl+V', onClick: pasteElements },
      { type: 'separator' },
    ]
    if (single) {
      items.push(
        { type: 'action', label: 'Bring Forward', icon: '↑', shortcut: 'Ctrl+]', onClick: bringForward },
        { type: 'action', label: 'Send Backward',  icon: '↓', shortcut: 'Ctrl+[', onClick: sendBackward },
        { type: 'action', label: 'Bring to Front', icon: '⤒', shortcut: 'Ctrl+Shift+]', onClick: bringToFront },
        { type: 'action', label: 'Send to Back',   icon: '⤓', shortcut: 'Ctrl+Shift+[', onClick: sendToBack },
        { type: 'separator' },
      )
    }
    items.push(
      { type: 'action', label: 'Delete', icon: '✕', shortcut: 'Del', danger: true, onClick: deleteSelected }
    )
    return items
  }

  // ── Keyboard shortcuts ────────────────────────────────────────────────────

  useKeyboard([
    { key: 'z',            meta: true,              handler: undo },
    { key: 'z',            meta: true, shift: true, handler: redo },
    { key: 'Escape',       handler: clearSelection },
    { key: 'Delete',       handler: deleteSelected },
    { key: 'Backspace',    handler: deleteSelected },
    { key: 'd',            meta: true,              handler: duplicateSelected },
    { key: 'c',            meta: true,              handler: () => copyElements(selectedIds) },
    { key: 'v',            meta: true,              handler: pasteElements },
    { key: 'a',            meta: true,              handler: selectAll },
    // Z-order
    { key: ']',            meta: true,              handler: bringForward },
    { key: '[',            meta: true,              handler: sendBackward },
    { key: ']',            meta: true, shift: true, handler: bringToFront },
    { key: '[',            meta: true, shift: true, handler: sendToBack },
    // Nudge
    { key: 'ArrowLeft',                             handler: () => nudge(-NUDGE_SMALL, 0) },
    { key: 'ArrowRight',                            handler: () => nudge( NUDGE_SMALL, 0) },
    { key: 'ArrowUp',                               handler: () => nudge(0, -NUDGE_SMALL) },
    { key: 'ArrowDown',                             handler: () => nudge(0,  NUDGE_SMALL) },
    { key: 'ArrowLeft',   shift: true,              handler: () => nudge(-NUDGE_LARGE, 0) },
    { key: 'ArrowRight',  shift: true,              handler: () => nudge( NUDGE_LARGE, 0) },
    { key: 'ArrowUp',     shift: true,              handler: () => nudge(0, -NUDGE_LARGE) },
    { key: 'ArrowDown',   shift: true,              handler: () => nudge(0,  NUDGE_LARGE) },
    // Zoom
    { key: '8', meta: true, handler: () => canvasRef.current?.zoomIn()    },
    { key: '2', meta: true, handler: () => canvasRef.current?.zoomOut()   },
    { key: '1', meta: true, handler: () => canvasRef.current?.zoomReset() },
    { key: '5', meta: true, handler: () => canvasRef.current?.zoomFit()   },
  ])

  return (
    <div className={styles.tab} onContextMenu={handleContextMenu}>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <button className={styles.btn} onClick={() => undo()} disabled={!canUndo} title="Undo (Ctrl+Z)">Undo</button>
          <button className={styles.btn} onClick={() => redo()} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)">Redo</button>
          <div className={styles.divider} />
          <button
            className={`${styles.btn} ${settings.snapToGrid ? styles.btnActive : ''}`}
            onClick={() => updateSettings({ snapToGrid: !settings.snapToGrid })}
            title="Toggle snap to grid"
          >⊞ Snap</button>
          <button
            className={`${styles.btn} ${settings.showGuides ? styles.btnActive : ''}`}
            onClick={() => updateSettings({ showGuides: !settings.showGuides })}
            title="Toggle alignment guides"
          >⊹ Guides</button>
          {selectedIds.length > 1 && (
            <span className={styles.selectionBadge}>{selectedIds.length} selected</span>
          )}
        </div>
        <div className={styles.toolbarRight}>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => exportToPng(stageRef.current!, template.name)}>
            Export PNG
          </button>
        </div>
      </div>

      {/* Editor layout */}
      <div className={styles.body}>
        <LeftPanel
          activeTool={activeTool}
          onToolChange={setActiveTool}
          canvasWidth={template.canvas.width}
          canvasHeight={template.canvas.height}
        />

        <EditorCanvas
          ref={canvasRef}
          template={template}
          selectedIds={selectedIds}
          onSelectElement={(id, additive) => {
            if (id === null) clearSelection()
            else if (additive) toggleSelection(id)
            else selectElement(id)
          }}
          onUpdateElement={updateElement}
          onUpdateElements={updateElements}
          stageRef={stageRef}
        />

        <RightPanel
          canvasWidth={template.canvas.width}
          canvasHeight={template.canvas.height}
        />
      </div>

      {/* Context menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={buildContextMenuItems()}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  )
}
