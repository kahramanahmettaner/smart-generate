import { useEditorStore } from '../../store/useEditorStore'
import { generateId } from '../../lib/utils'
import type { RectElement, TextElement } from '../../types/template'
import styles from './ToolPanel.module.scss'

type Tool = {
  id: string
  label: string
  icon: string
  title: string
}

const tools: Tool[] = [
  { id: 'select', label: 'Select', icon: '↖', title: 'Select (V)' },
  { id: 'text',   label: 'Text',   icon: 'T', title: 'Text (T)' },
  { id: 'rect',   label: 'Rect',   icon: '▭', title: 'Rectangle (R)' },
  { id: 'image',  label: 'Image',  icon: '⬚', title: 'Image (I)' },
]

type Props = {
  activeTool: string
  onToolChange: (tool: string) => void
}

export function ToolPanel({ activeTool, onToolChange }: Props) {
  const { addElement, selectElement } = useEditorStore()

  const handleToolClick = (toolId: string) => {
    onToolChange(toolId)

    // Immediately insert element at center for non-select tools
    if (toolId === 'rect') {
      const el: RectElement = {
        id: generateId('el'),
        type: 'rect',
        x: 200, y: 200,
        width: 200, height: 120,
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

    if (toolId === 'text') {
      const el: TextElement = {
        id: generateId('el'),
        type: 'text',
        x: 200, y: 200,
        width: 300, height: 50,
        rotation: 0, opacity: 1,
        visible: true, locked: false,
        props: {
          content: { type: 'static', value: 'Text' },
          fontSize: 32,
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
    <div className={styles.panel}>
      {tools.map((tool, i) => (
        <>
          {i === 1 && <div key="div-1" className={styles.divider} />}
          <button
            key={tool.id}
            className={`${styles.toolBtn} ${activeTool === tool.id ? styles.active : ''}`}
            title={tool.title}
            onClick={() => handleToolClick(tool.id)}
          >
            <span className={styles.icon}>{tool.icon}</span>
            <span className={styles.label}>{tool.label}</span>
          </button>
        </>
      ))}
    </div>
  )
}