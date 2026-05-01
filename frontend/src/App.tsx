import { useRef } from 'react'
import type Konva from 'konva'
import { useEditorStore, useHistory } from './store/useEditorStore'
import { useTheme } from './hooks/useTheme'
import { useKeyboard } from './hooks/useKeyboard'
import { EditorCanvas } from './editor/EditorCanvas'
import { exportToPng } from './lib/export'
import styles from './App.module.scss'

export default function App() {
  const { template, selectedId, selectElement, updateElement } = useEditorStore()
  const { undo, redo, canUndo, canRedo } = useHistory()
  const { theme, toggle } = useTheme()
  const stageRef = useRef<Konva.Stage>(null)

  useKeyboard([
    { key: 'z', meta: true, handler: undo },
    { key: 'z', meta: true, shift: true, handler: redo },
    { key: 'Escape', handler: () => selectElement(null) },
  ])

  const handleExport = async () => {
    if (!stageRef.current) return
    await exportToPng(stageRef.current, template.name)
  }

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.templateName}>{template.name}</span>
        </div>

        <div className={styles.headerCenter}>
          <button
            className={styles.btn}
            onClick={ () => undo()}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
          >
            Undo
          </button>
          <button
            className={styles.btn}
            onClick={ () => redo()}
            disabled={!canRedo}
            title="Redo (Ctrl+Shift+Z)"
          >
            Redo
          </button>
        </div>

        <div className={styles.headerRight}>
          <button className={styles.btn} onClick={toggle}>
            {theme === 'light' ? '◐ Dark' : '◑ Light'}
          </button>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleExport}>
            Export PNG
          </button>
        </div>
      </header>

      <div className={styles.body}>
        <EditorCanvas
          template={template}
          selectedId={selectedId}
          onSelectElement={selectElement}
          onUpdateElement={updateElement}
          stageRef={stageRef}
        />
      </div>

      {/* Temporary debug: show selected element id */}
      {selectedId && (
        <div className={styles.debugBadge}>
          {selectedId}
        </div>
      )}
    </div>
  )
}