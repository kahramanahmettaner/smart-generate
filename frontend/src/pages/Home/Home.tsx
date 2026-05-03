import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useEditorStore } from '../../store/useEditorStore'
import { TemplateConfigModal } from '../../components/TemplateConfigModal/TemplateConfigModal'
import type { TemplateConfig } from '../../components/TemplateConfigModal/TemplateConfigModal'
import type { Template } from '../../types/template'
import { useTheme } from '../../hooks/useTheme'
import styles from './Home.module.scss'

type ModalMode = 'create' | 'import' | null

export function Home() {
  const navigate                     = useNavigate()
  const { initTemplate, loadTemplate } = useEditorStore()
  const { theme, toggle }            = useTheme()
  const [modalMode,    setModalMode]    = useState<ModalMode>(null)
  const [importConfig, setImportConfig] = useState<Partial<TemplateConfig> & { raw?: Template }>({})
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleCreate = (config: TemplateConfig) => {
    initTemplate(config)
    navigate('/editor')
  }

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const raw = JSON.parse(ev.target?.result as string) as Template

        // Validate minimally
        if (!raw.canvas || !raw.elements) {
          alert('Invalid template file.')
          return
        }

        // Pre-fill the config modal with values from the file
        setImportConfig({
          name:   raw.name,
          width:  raw.canvas.width,
          height: raw.canvas.height,
          raw,
        })
        setModalMode('import')
      } catch {
        alert('Could not parse template file.')
      }
    }
    reader.readAsText(file)

    // Reset input so same file can be re-selected
    e.target.value = ''
  }

  const handleImportConfirm = (config: TemplateConfig) => {
    if (!importConfig.raw) return
    loadTemplate({
      ...importConfig.raw,
      name:   config.name,
      canvas: {
        ...importConfig.raw.canvas,
        width:  config.width,
        height: config.height,
      },
    })
    navigate('/editor')
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <span className={styles.logo}>Smart Generate</span>
        <button className={styles.themeBtn} onClick={toggle}>
          {theme === 'light' ? '◐ Dark' : '◑ Light'}
        </button>
      </header>

      <main className={styles.main}>
        <div className={styles.hero}>
          <h1 className={styles.heroTitle}>Design once, generate many</h1>
          <p className={styles.heroSub}>
            Build image templates and generate batches from your data
          </p>
        </div>

        <div className={styles.actions}>
          {/* Create */}
          <button
            className={styles.actionCard}
            onClick={() => setModalMode('create')}
          >
            <span className={styles.actionIcon}>+</span>
            <span className={styles.actionTitle}>New template</span>
            <span className={styles.actionDesc}>
              Start from a blank canvas with your chosen resolution
            </span>
          </button>

          {/* Import */}
          <button
            className={styles.actionCard}
            onClick={() => fileInputRef.current?.click()}
          >
            <span className={styles.actionIcon}>↑</span>
            <span className={styles.actionTitle}>Import template</span>
            <span className={styles.actionDesc}>
              Open a previously exported .json template file
            </span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            style={{ display: 'none' }}
            onChange={handleImportFile}
          />
        </div>
      </main>

      {/* Create modal */}
      {modalMode === 'create' && (
        <TemplateConfigModal
          mode="create"
          onConfirm={handleCreate}
          onCancel={() => setModalMode(null)}
        />
      )}

      {/* Import modal */}
      {modalMode === 'import' && (
        <TemplateConfigModal
          mode="import"
          initialConfig={importConfig}
          onConfirm={handleImportConfirm}
          onCancel={() => { setModalMode(null); setImportConfig({}) }}
        />
      )}
    </div>
  )
}