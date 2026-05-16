import { useEffect, useRef } from 'react'
import styles from './ContextMenu.module.scss'

export type ContextMenuItem =
  | { type: 'action'; label: string; icon?: string; shortcut?: string; danger?: boolean; onClick: () => void }
  | { type: 'separator' }

type Props = {
  x:       number
  y:       number
  items:   ContextMenuItem[]
  onClose: () => void
}

export function ContextMenu({ x, y, items, onClose }: Props) {
  const menuRef = useRef<HTMLDivElement>(null)

  // Close on click outside or Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    const onClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose()
    }
    window.addEventListener('keydown',   onKey)
    window.addEventListener('mousedown', onClickOutside)
    return () => {
      window.removeEventListener('keydown',   onKey)
      window.removeEventListener('mousedown', onClickOutside)
    }
  }, [onClose])

  // Clamp position to viewport so menu never goes off-screen
  const style: React.CSSProperties = {
    position: 'fixed',
    left: Math.min(x, window.innerWidth  - 200),
    top:  Math.min(y, window.innerHeight - items.length * 32 - 16),
    zIndex: 9999,
  }

  return (
    <div ref={menuRef} className={styles.menu} style={style}>
      {items.map((item, i) => {
        if (item.type === 'separator') {
          return <div key={i} className={styles.separator} />
        }
        return (
          <button
            key={i}
            className={`${styles.item} ${item.danger ? styles.danger : ''}`}
            onClick={() => { item.onClick(); onClose() }}
          >
            {item.icon && <span className={styles.icon}>{item.icon}</span>}
            <span className={styles.label}>{item.label}</span>
            {item.shortcut && <span className={styles.shortcut}>{item.shortcut}</span>}
          </button>
        )
      })}
    </div>
  )
}
