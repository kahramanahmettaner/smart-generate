import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type Konva from 'konva'
import { useEditorStore, useHistory } from '../../store/useEditorStore'
import { useTheme } from '../../hooks/useTheme'
import { useKeyboard } from '../../hooks/useKeyboard'
import { EditorCanvas } from '../../editor/EditorCanvas'
import type { EditorCanvasHandle } from '../../editor/EditorCanvasHandle'
import { LeftPanel } from '../../editor/LeftPannel/LeftPanel'
import { RightPanel } from '../../editor/RightPannel/RightPanel'
import { ConfirmDialog } from '../../components/ConfirmDialog/ConfirmDialog'
import { useConfirm } from '../../hooks/useConfirm'
import { exportToPng } from '../../lib/export'
import styles from './Editor.module.scss'

type Tool = 'select' | 'rect' | 'text' | 'image'

export function Editor() {
  const navigate   = useNavigate()
  const { template, selectedId, selectElement, updateElement, deleteElement, exportTemplateJson } = useEditorStore()
  const { undo, redo, canUndo, canRedo } = useHistory()
  const { theme, toggle }  = useTheme()
  const { confirm, dialogProps } = useConfirm()

  const stageRef  = useRef<Konva.Stage>(null)
  const canvasRef = useRef<EditorCanvasHandle>(null)
  const [activeTool, setActiveTool] = useState<Tool>('select')

  useKeyboard([
    { key: 'z',         meta: true,               handler: undo },
    { key: 'z',         meta: true, shift: true,  handler: redo },
    { key: 'Escape',                               handler: () => selectElement(null) },
    { key: 'Delete',                               handler: () => { if (selectedId) deleteElement(selectedId) } },
    { key: 'Backspace',                            handler: () => { if (selectedId) deleteElement(selectedId) } },
    { key: '8',         meta: true,               handler: () => canvasRef.current?.zoomIn()    },
    { key: '2',         meta: true,               handler: () => canvasRef.current?.zoomOut()   },
    { key: '1',         meta: true,               handler: () => canvasRef.current?.zoomReset() },
    { key: '5',         meta: true,  handler: () => canvasRef.current?.zoomFit()   },
  ])

  const handleExportPng = async () => {
    if (!stageRef.current) return
    await exportToPng(stageRef.current, template.name)
  }

  const handleExportJson = () => {
    const json = exportTemplateJson()
    const blob = new Blob([json], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.download = `${template.name}.json`
    a.href     = url
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleBack = async () => {
    const ok = await confirm({
      title:        'Leave editor?',
      message:      'Unsaved changes will be lost. Make sure to export your template first.',
      confirmLabel: 'Leave',
      cancelLabel:  'Stay',
      variant:      'danger',
    })
    if (ok) navigate('/')
  }

  return (
    <div className={styles.editor}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button className={styles.backBtn} onClick={handleBack}>
            ← Home
          </button>
          <span className={styles.templateName}>{template.name}</span>
        </div>

        <div className={styles.headerCenter}>
          <button className={styles.btn} onClick={() => undo()} disabled={!canUndo} title="Undo (Ctrl+Z)">
            Undo
          </button>
          <button className={styles.btn} onClick={() => redo()} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)">
            Redo
          </button>
        </div>

        <div className={styles.headerRight}>
          <button className={styles.btn} onClick={() => toggle()}>
            {theme === 'light' ? '◐ Dark' : '◑ Light'}
          </button>
          <button className={styles.btn} onClick={() => handleExportJson()} title="Export template as JSON">
            Export template
          </button>
          <button
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={() => handleExportPng()}
          >
            Export PNG
          </button>
        </div>
      </header>

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

      {dialogProps && <ConfirmDialog {...dialogProps} />}
    </div>
  )
}