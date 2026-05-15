import { useRef, useState, useCallback } from 'react'
import type Konva from 'konva'
import { useEditorStore, getSelectedId } from '../../../../store/useEditorStore'
import { useHistory }   from '../../../../hooks/useHistory'
import { useKeyboard }  from '../../../../hooks/useKeyboard'
import { EditorCanvas } from '../../../../editor/EditorCanvas'
import type { EditorCanvasHandle } from '../../../../editor/EditorCanvasHandle'
import { LeftPanel }    from '../../../../editor/LeftPannel/LeftPanel'
import { RightPanel }   from '../../../../editor/RightPannel/RightPanel'
import { exportToPng }  from '../../../../lib/export'
import type { Element } from '../../../../types/template'
import styles from './DesignTab.module.scss'

const NUDGE_SMALL = 1   // px — arrow key
const NUDGE_LARGE = 10  // px — Shift + arrow key

type Tool = 'select' | 'rect' | 'text' | 'image'

export function DesignTab() {
  const {
    template, selectedIds, settings,
    selectElement, clearSelection,
    updateElement, updateElements,
    deleteElement, deleteElements,
    duplicateElement, duplicateElements,
    copyElements, pasteElements,
    updateSettings,
  } = useEditorStore()

  const { undo, redo, canUndo, canRedo } = useHistory()

  const stageRef  = useRef<Konva.Stage>(null)
  const canvasRef = useRef<EditorCanvasHandle>(null)
  const [activeTool, setActiveTool] = useState<Tool>('select')

  // Single selected id (for properties panel compatibility)
  const selectedId = getSelectedId(useEditorStore.getState())

  // ── Nudge selected elements with arrow keys ───────────────────────────────

  const nudge = useCallback((dx: number, dy: number) => {
    if (selectedIds.length === 0) return
    if (selectedIds.length === 1) {
      const el = template.elements.find((e) => e.id === selectedIds[0])
      if (!el || el.locked) return
      updateElement(selectedIds[0], { x: el.x + dx, y: el.y + dy } as Partial<Element>)
    } else {
      // Move all selected elements
      selectedIds.forEach((id) => {
        const el = template.elements.find((e) => e.id === id)
        if (!el || el.locked) return
        updateElement(id, { x: el.x + dx, y: el.y + dy } as Partial<Element>)
      })
    }
  }, [selectedIds, template.elements, updateElement])

  // ── Delete selected ───────────────────────────────────────────────────────

  const deleteSelected = useCallback(() => {
    if (selectedIds.length === 0) return
    if (selectedIds.length === 1) deleteElement(selectedIds[0])
    else deleteElements(selectedIds)
  }, [selectedIds, deleteElement, deleteElements])

  // ── Duplicate selected ────────────────────────────────────────────────────

  const duplicateSelected = useCallback(() => {
    if (selectedIds.length === 0) return
    if (selectedIds.length === 1) duplicateElement(selectedIds[0])
    else duplicateElements(selectedIds)
  }, [selectedIds, duplicateElement, duplicateElements])

  // ── Select all ────────────────────────────────────────────────────────────

  const selectAll = useCallback(() => {
    const ids = template.elements
      .filter((el) => !el.locked && el.visible)
      .map((el) => el.id)
    useEditorStore.getState().selectElements(ids)
  }, [template.elements])

  // ── Keyboard shortcuts ────────────────────────────────────────────────────

  useKeyboard([
    // Undo / Redo
    { key: 'z',         meta: true,              handler: undo },
    { key: 'z',         meta: true, shift: true, handler: redo },

    // Escape / Delete
    { key: 'Escape',    handler: clearSelection },
    { key: 'Delete',    handler: deleteSelected },
    { key: 'Backspace', handler: deleteSelected },

    // Duplicate
    { key: 'd', meta: true, handler: duplicateSelected },

    // Copy / Paste
    { key: 'c', meta: true, handler: () => copyElements(selectedIds) },
    { key: 'v', meta: true, handler: pasteElements },

    // Select all
    { key: 'a', meta: true, handler: selectAll },

    // Arrow nudge — small
    { key: 'ArrowLeft',  handler: () => nudge(-NUDGE_SMALL, 0) },
    { key: 'ArrowRight', handler: () => nudge( NUDGE_SMALL, 0) },
    { key: 'ArrowUp',    handler: () => nudge(0, -NUDGE_SMALL) },
    { key: 'ArrowDown',  handler: () => nudge(0,  NUDGE_SMALL) },

    // Arrow nudge — large
    { key: 'ArrowLeft',  shift: true, handler: () => nudge(-NUDGE_LARGE, 0) },
    { key: 'ArrowRight', shift: true, handler: () => nudge( NUDGE_LARGE, 0) },
    { key: 'ArrowUp',    shift: true, handler: () => nudge(0, -NUDGE_LARGE) },
    { key: 'ArrowDown',  shift: true, handler: () => nudge(0,  NUDGE_LARGE) },

    // Zoom
    { key: '8', meta: true, handler: () => canvasRef.current?.zoomIn() },
    { key: '2', meta: true, handler: () => canvasRef.current?.zoomOut() },
    { key: '1', meta: true, handler: () => canvasRef.current?.zoomReset() },
    { key: '5', meta: true, handler: () => canvasRef.current?.zoomFit() },
  ])

  const handleExportPng = async () => {
    if (!stageRef.current) return
    await exportToPng(stageRef.current, template.name)
  }

  return (
    <div className={styles.tab}>

      {/* Design-specific toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <button className={styles.btn} onClick={() => undo()} disabled={!canUndo} title="Undo (Ctrl+Z)">
            Undo
          </button>
          <button className={styles.btn} onClick={() => redo()} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)">
            Redo
          </button>

          <div className={styles.divider} />

          {/* Snap to grid toggle */}
          <button
            className={`${styles.btn} ${settings.snapToGrid ? styles.btnActive : ''}`}
            onClick={() => updateSettings({ snapToGrid: !settings.snapToGrid })}
            title="Toggle snap to grid"
          >
            ⊞ Snap
          </button>

          {/* Alignment guides toggle */}
          <button
            className={`${styles.btn} ${settings.showGuides ? styles.btnActive : ''}`}
            onClick={() => updateSettings({ showGuides: !settings.showGuides })}
            title="Toggle alignment guides"
          >
            ⊹ Guides
          </button>

          {/* Multi-select info */}
          {selectedIds.length > 1 && (
            <span className={styles.selectionBadge}>
              {selectedIds.length} selected
            </span>
          )}
        </div>

        <div className={styles.toolbarRight}>
          <button
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={handleExportPng}
          >
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
            else if (additive) useEditorStore.getState().toggleSelection(id)
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
    </div>
  )
}
