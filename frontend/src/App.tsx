import { useTheme } from './hooks/useTheme'
import { useEditorStore } from './store/useEditorStore'
import { useHistory } from './store/useEditorStore'
import { useKeyboard } from './hooks/useKeyboard'
import styles from './App.module.scss'

export default function App() {
  const { theme, toggle } = useTheme()
  const { template } = useEditorStore()
  const { undo, redo, canUndo, canRedo } = useHistory()

  useKeyboard([
    { key: 'z', meta: true, handler: undo },
    { key: 'z', meta: true, shift: true, handler: redo },
  ])

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <span className={styles.templateName}>{template.name}</span>
        <div className={styles.headerActions}>
          <button onClick={ () => undo() } disabled={!canUndo} className={styles.btn}>
            Undo
          </button>
          <button onClick={ () => redo() } disabled={!canRedo} className={styles.btn}>
            Redo
          </button>
          <button onClick={toggle} className={styles.btn}>
            {theme === 'light' ? '◐ Dark' : '◑ Light'}
          </button>
        </div>
      </header>
      <main className={styles.workspace}>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 12 }}>
          Canvas will go here
        </p>
      </main>
    </div>
  )
}