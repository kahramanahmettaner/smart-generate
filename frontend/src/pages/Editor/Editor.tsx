import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useEditorStore } from '../../store/useEditorStore'
import { useTheme } from '../../hooks/useTheme'
import { useConfirm } from '../../hooks/useConfirm'
import { ConfirmDialog } from '../../components/ConfirmDialog/ConfirmDialog'
import { DesignTab } from './tabs/DesignTab'
import { AssetsTab } from './tabs/AssetsTab'
import { DataTab } from './tabs/DataTab'
import { RenderTab } from './tabs/RenderTab'
import styles from './Editor.module.scss'

type Tab = 'design' | 'assets' | 'data' | 'render'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'assets', label: 'Assets',  icon: '⬚' },
  { id: 'design', label: 'Design',  icon: '✏' },
  { id: 'data',   label: 'Data',    icon: '⊞' },
  { id: 'render', label: 'Render',  icon: '▶' },
]

export function Editor() {
  const navigate                       = useNavigate()
  const { template, exportTemplateJson } = useEditorStore()
  const { theme, toggle }              = useTheme()
  const { confirm, dialogProps }       = useConfirm()
  const [activeTab, setActiveTab]      = useState<Tab>('design')

  const handleBack = async () => {
    const ok = await confirm({
      title:        'Leave editor?',
      message:      'Unsaved changes will be lost. Export your template first to save your work.',
      confirmLabel: 'Leave',
      cancelLabel:  'Stay',
      variant:      'danger',
    })
    if (ok) navigate('/')
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

  return (
    <div className={styles.shell}>

      {/* ── Persistent header ── */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button className={styles.backBtn} onClick={handleBack}>
            ← Home
          </button>
          <span className={styles.templateName}>{template.name}</span>
          <span className={styles.canvasSize}>
            {template.canvas.width} × {template.canvas.height}px
          </span>
        </div>

        <div className={styles.headerRight}>
          <button className={styles.btn} onClick={toggle}>
            {theme === 'light' ? '◐ Dark' : '◑ Light'}
          </button>
          <button className={styles.btn} onClick={handleExportJson}>
            Export template
          </button>
        </div>
      </header>

      {/* ── Tab content — each tab is always mounted but hidden when inactive ──
           This preserves state (zoom, scroll, selections) when switching tabs   */}
      <div className={styles.tabContent}>
        <div className={activeTab === 'assets' ? styles.tabVisible : styles.tabHidden}>
          <AssetsTab />
        </div>
        <div className={activeTab === 'design' ? styles.tabVisible : styles.tabHidden}>
          <DesignTab />
        </div>
        <div className={activeTab === 'data' ? styles.tabVisible : styles.tabHidden}>
          <DataTab />
        </div>
        <div className={activeTab === 'render' ? styles.tabVisible : styles.tabHidden}>
          <RenderTab />
        </div>
      </div>

      {/* ── Bottom tab bar ── */}
      <nav className={styles.tabBar}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`${styles.tabBtn} ${activeTab === tab.id ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className={styles.tabIcon}>{tab.icon}</span>
            <span className={styles.tabLabel}>{tab.label}</span>
            {activeTab === tab.id && <span className={styles.tabIndicator} />}
          </button>
        ))}
      </nav>

      {dialogProps && <ConfirmDialog {...dialogProps} />}
    </div>
  )
}