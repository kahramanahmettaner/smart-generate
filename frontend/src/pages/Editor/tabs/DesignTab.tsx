import { useRef, useState } from 'react'
import type Konva from 'konva'
import { useEditorStore, useHistory } from '../../../store/useEditorStore'
import { useKeyboard } from '../../../hooks/useKeyboard'
import { EditorCanvas } from '../../../editor/EditorCanvas'
import type { EditorCanvasHandle } from '../../../editor/EditorCanvasHandle'
import { LeftPanel } from '../../../editor/LeftPannel/LeftPanel'
import { RightPanel } from '../../../editor/RightPannel/RightPanel'
import { exportToPng } from '../../../lib/export'
import styles from './DesignTab.module.scss'

type Tool = 'select' | 'rect' | 'text' | 'image'

export function DesignTab() {
  const {
    template, selectedId,
    selectElement, updateElement, deleteElement
  } = useEditorStore()
  const { undo, redo, canUndo, canRedo } = useHistory()

  const stageRef  = useRef<Konva.Stage>(null)
  const canvasRef = useRef<EditorCanvasHandle>(null)
  const [activeTool, setActiveTool] = useState<Tool>('select')

  useKeyboard([
    { key: 'z',         meta: true,              handler: undo },
    { key: 'z',         meta: true, shift: true, handler: redo },
    { key: 'Escape',                             handler: () => selectElement(null) },
    { key: 'Delete',                             handler: () => { if (selectedId) deleteElement(selectedId) } },
    { key: 'Backspace',                          handler: () => { if (selectedId) deleteElement(selectedId) } },
    { key: '8',         meta: true,              handler: () => canvasRef.current?.zoomIn()    },
    { key: '2',         meta: true,              handler: () => canvasRef.current?.zoomOut()   },
    { key: '1',         meta: true,              handler: () => canvasRef.current?.zoomReset() },
    { key: '5',         meta: true, handler: () => canvasRef.current?.zoomFit()   },
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
          <button
            className={styles.btn}
            onClick={() => undo()}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
          >
            Undo
          </button>
          <button
            className={styles.btn}
            onClick={() => redo()}
            disabled={!canRedo}
            title="Redo (Ctrl+Shift+Z)"
          >
            Redo
          </button>
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
          selectedId={selectedId}
          onSelectElement={selectElement}
          onUpdateElement={updateElement}
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