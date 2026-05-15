import { useState } from 'react'
import styles from './LeftPanel.module.scss'
import { useEditorStore } from '../../store/useEditorStore'
import { AssetPickerModal } from '../../components/AssetPickerModal/AssetPickerModal'
import type { ImageAsset } from '../../types/asset'
import { createImageElement, createRectElement, createTextElement } from '../../lib/elementDefaults'

type Tool = 'select' | 'rect' | 'text' | 'image'

type Props = {
  activeTool:   Tool
  onToolChange: (tool: Tool) => void
  canvasWidth:  number
  canvasHeight: number
}

const tools = [
  { id: 'select' as Tool, icon: '↖', label: 'Select' },
  { id: 'rect'   as Tool, icon: '▭', label: 'Rect'   },
  { id: 'text'   as Tool, icon: 'T', label: 'Text'   },
  { id: 'image'  as Tool, icon: '⬚', label: 'Image'  },
]

export function LeftPanel({ activeTool, onToolChange, canvasWidth, canvasHeight }: Props) {
  const { addElement, selectElement, updateElement } = useEditorStore()
  const [showPicker,     setShowPicker]     = useState(false)
  const [pendingImageId, setPendingImageId] = useState<string | null>(null)

  const handleToolClick = (tool: Tool) => {
    onToolChange(tool)

    if (tool === 'rect') {
      const el = createRectElement()
      addElement(el)
      selectElement(el.id)
      onToolChange('select')
    }

    if (tool === 'text') {
      const el = createTextElement()
      addElement(el)
      selectElement(el.id)
      onToolChange('select')
    }

    if (tool === 'image') {
      const el = createImageElement()
      addElement(el)
      selectElement(el.id)
      setPendingImageId(el.id)
      setShowPicker(true)
      onToolChange('select')
    }
  }

  const handleAssetSelect = (asset: ImageAsset, dims: { width: number; height: number }) => {
    if (pendingImageId) {
      updateElement(pendingImageId, {
        width:  dims.width,
        height: dims.height,
        props: {
          src:   { type: 'asset', assetId: asset.id, assetName: asset.name },
          fit:   'cover',
          align: { horizontal: 'center', vertical: 'center' },
        }
      } as any)
    }
    setShowPicker(false)
    setPendingImageId(null)
  }

  return (
    <>
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

      {showPicker && (
        <AssetPickerModal
          onSelect={handleAssetSelect}
          onClose={() => { setShowPicker(false); setPendingImageId(null) }}
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
        />
      )}
    </>
  )
}
