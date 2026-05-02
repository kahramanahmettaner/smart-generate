import { useState } from 'react'
import styles from './LayersPanel.module.scss'
import { useEditorStore } from '../../store/useEditorStore'

const elementIcon = (type: string) => {
  switch (type) {
    case 'rect':  return '▭'
    case 'text':  return 'T'
    case 'image': return '⬚'
    default:      return '○'
  }
}

const elementLabel = (el: any): string => {
  if (el.type === 'text') {
    const content = el.props.content
    const val = content.type === 'static'
      ? content.value
      : `{{${content.column}}}`
    return val.length > 20 ? val.slice(0, 20) + '…' : val
  }
  return el.type.charAt(0).toUpperCase() + el.type.slice(1)
}

type Props = {
  height: number
}

export function LayersPanel({ height }: Props) {
  const [collapsed, setCollapsed] = useState(false)
  const { template, selectedId, selectElement, updateElement, reorderElements, deleteElement } = useEditorStore()
  const elements = [...template.elements].reverse()

  const toggleVisibility = (id: string, visible: boolean) =>
    updateElement(id, { visible: !visible } as any)

  const toggleLock = (id: string, locked: boolean) =>
    updateElement(id, { locked: !locked } as any)

  const moveUp = (id: string) => {
    const ids = template.elements.map((e) => e.id)
    const idx = ids.indexOf(id)
    if (idx >= ids.length - 1) return
    const next = [...ids]
    ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
    reorderElements(next)
  }

  const moveDown = (id: string) => {
    const ids = template.elements.map((e) => e.id)
    const idx = ids.indexOf(id)
    if (idx <= 0) return
    const next = [...ids]
    ;[next[idx], next[idx - 1]] = [next[idx - 1], next[idx]]
    reorderElements(next)
  }

  return (
    <div
      className={`${styles.panel} ${collapsed ? styles.collapsed : ''}`}
      style={!collapsed ? { height } : undefined}
    >
      <button
        className={styles.header}
        onClick={() => setCollapsed((c) => !c)}
      >
        <div className={styles.headerLeft}>
          <span className={`${styles.caret} ${collapsed ? styles.caretClosed : ''}`}>
            ▾
          </span>
          <span className={styles.title}>Layers</span>
          <span className={styles.count}>{template.elements.length}</span>
        </div>
      </button>

      {!collapsed && (
        <div className={styles.list}>
          {elements.length === 0 && (
            <p className={styles.empty}>No elements yet</p>
          )}
          {elements.map((el) => (
            <div
              key={el.id}
              className={`${styles.item} ${el.id === selectedId ? styles.selected : ''}`}
              onClick={() => selectElement(el.id)}
            >
              <span className={styles.itemIcon}>{elementIcon(el.type)}</span>
              <span className={styles.itemName}>{elementLabel(el)}</span>

              <div className={styles.itemActions}>
                <button
                  className={styles.actionBtn}
                  onClick={(e) => { e.stopPropagation(); moveUp(el.id) }}
                  title="Move up"
                >↑</button>
                <button
                  className={styles.actionBtn}
                  onClick={(e) => { e.stopPropagation(); moveDown(el.id) }}
                  title="Move down"
                >↓</button>
                <button
                  className={`${styles.actionBtn} ${!el.visible ? styles.dimmed : ''}`}
                  onClick={(e) => { e.stopPropagation(); toggleVisibility(el.id, el.visible) }}
                  title={el.visible ? 'Hide' : 'Show'}
                >●</button>
                <button
                  className={`${styles.actionBtn} ${el.locked ? styles.accent : ''}`}
                  onClick={(e) => { e.stopPropagation(); toggleLock(el.id, el.locked) }}
                  title={el.locked ? 'Unlock' : 'Lock'}
                >{el.locked ? '🔒' : '🔓'}</button>
                <button
                  className={`${styles.actionBtn} ${styles.deleteBtn}`}
                  onClick={(e) => { e.stopPropagation(); deleteElement(el.id) }}
                  title="Delete element"
                >✕</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}