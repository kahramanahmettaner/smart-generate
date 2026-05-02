import styles from './LeftPanel.module.scss'
import { useEditorStore } from '../../store/useEditorStore'
import { generateId } from '../../lib/utils'
import type { RectElement, TextElement } from '../../types/template'

type Tool = 'select' | 'rect' | 'text' | 'image'

type Props = {
  activeTool: Tool
  onToolChange: (tool: Tool) => void
}

const tools = [
  { id: 'select' as Tool, icon: '↖', label: 'Select' },
  { id: 'rect'   as Tool, icon: '▭', label: 'Rect'   },
  { id: 'text'   as Tool, icon: 'T', label: 'Text'   },
  { id: 'image'  as Tool, icon: '⬚', label: 'Image'  },
]

export function LeftPanel({ activeTool, onToolChange }: Props) {
  const { addElement, selectElement } = useEditorStore()

  const handleToolClick = (tool: Tool) => {
    onToolChange(tool)

    if (tool === 'rect') {
      const el: RectElement = {
        id: generateId('rect'),
        type: 'rect',
        x: 100, y: 100,
        width: 200, height: 150,
        rotation: 0, opacity: 1,
        visible: true, locked: false,
        props: {
          fill: '#E0E7FF',
          stroke: '#6366F1',
          strokeWidth: 2,
          cornerRadius: 4,
        }
      }
      addElement(el)
      selectElement(el.id)
      onToolChange('select')
    }

    if (tool === 'text') {
      const el: TextElement = {
        id: generateId('text'),
        type: 'text',
        x: 100, y: 100,
        width: 300, height: 50,
        rotation: 0, opacity: 1,
        visible: true, locked: false,
        props: {
          content: { type: 'static', value: 'Text' },
          fontSize: 24,
          fontFamily: 'Inter',
          color: '#111111',
          fontWeight: 'normal',
          align: 'left',
          lineHeight: 1.4,
        }
      }
      addElement(el)
      selectElement(el.id)
      onToolChange('select')
    }
  }

  return (
    <aside className={styles.panel}>
      <div className={styles.toolGroup}>
        {tools.map((tool) => (
          <button
            key={tool.id}
            className={`${styles.toolBtn} ${activeTool === tool.id ? styles.active : ''}`}
            onClick={() => handleToolClick(tool.id)}
            title={tool.label}
          >
            <span className={styles.toolIcon}>{tool.icon}</span>
            <span className={styles.toolLabel}>{tool.label}</span>
          </button>
        ))}
      </div>
    </aside>
  )
}