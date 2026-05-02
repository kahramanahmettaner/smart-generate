import { useState } from 'react'
import styles from './LeftPanel.module.scss'
import { useEditorStore } from '../../store/useEditorStore'
import { AssetPickerModal } from '../AssetPicker/AssetPickerModal'
import { generateId } from '../../lib/utils'
import type { RectElement, TextElement, ImageElement } from '../../types/template'
import type { ImageAsset } from '../../types/asset'

type Tool = 'select' | 'rect' | 'text' | 'image'

type Props = {
  activeTool: Tool
  onToolChange: (tool: Tool) => void
  canvasWidth: number
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
      const el: RectElement = {
        id: generateId('rect'),
        type: 'rect',
        x: 100, y: 100,
        width: 200, height: 150,
        rotation: 0, opacity: 1,
        visible: true, locked: false,
        props: { fill: '#E0E7FF', stroke: '#6366F1', strokeWidth: 2, cornerRadius: 4 },
        aspectRatioLocked: false,
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
          fontSize: 24, fontFamily: 'Inter',
          color: '#111111', fontWeight: 'normal',
          align: 'left', lineHeight: 1.4,
        },
        aspectRatioLocked: false,
      }
      addElement(el)
      selectElement(el.id)
      onToolChange('select')
    }

    if (tool === 'image') {
      // Add placeholder first, then open picker
      const el: ImageElement = {
        id: generateId('img'),
        type: 'image',
        x: 100, y: 100,
        width: 300, height: 200,
        rotation: 0, opacity: 1,
        visible: true, locked: false,
        props: {
          src:   { type: 'none' },
          fit:   'cover',
          align: { horizontal: 'center', vertical: 'center' }
        },
        aspectRatioLocked: false,
      }
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
        props:  { src: { type: 'asset', assetId: asset.id }, fit: 'cover' }
      } as any)
    }
    setShowPicker(false)
    setPendingImageId(null)
  }

  const handlePickerClose = () => {
    setShowPicker(false)
    setPendingImageId(null)
    // Element stays as placeholder — user can set image later via properties
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
          onClose={handlePickerClose}
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
        />
      )}
    </>
  )
}