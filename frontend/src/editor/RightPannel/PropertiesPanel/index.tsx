import { useState } from 'react'
import { useEditorStore } from '../../../store/useEditorStore'
import { AssetPickerModal }    from '../../../components/AssetPickerModal/AssetPickerModal'
import { TransformSection }    from './sections/TransformSection'
import { RectProperties }      from './sections/RectProperties'
import { EllipseProperties }   from './sections/EllipseProperties'
import { LineProperties }      from './sections/LineProperties'
import { TextProperties }      from './sections/TextProperties'
import { ImageProperties }     from './sections/ImageProperties'
import { CanvasProperties }    from './sections/CanvasProperties'
import styles from './PropertiesPanel.module.scss'
import type { ImageAsset }     from '../../../types/asset'
import type { ImageElement, EllipseElement, LineElement } from '../../../types/template'

type Props = {
  canvasWidth:  number
  canvasHeight: number
}

export function PropertiesPanel({ canvasWidth, canvasHeight }: Props) {
  const [collapsed,    setCollapsed]    = useState(false)
  const [pickerTarget, setPickerTarget] = useState<'main' | 'placeholder' | null>(null)

  const { template, selectedIds, updateElement } = useEditorStore()

  const selectedId = selectedIds.length === 1 ? selectedIds[0] : null
  const selected   = template.elements.find((el) => el.id === selectedId)

  const onChange = (changes: Partial<any>) => {
    if (selected) updateElement(selected.id, changes)
  }

  const handleAssetSelect = (asset: ImageAsset, dims: { width: number; height: number }) => {
    if (!selected || selected.type !== 'image') return
    const el  = selected as ImageElement
    const src = el.props.src

    if (pickerTarget === 'main') {
      onChange({
        width: dims.width, height: dims.height,
        props: { ...el.props, src: { type: 'asset', assetId: asset.id, assetName: asset.name } }
      })
    }
    if (pickerTarget === 'placeholder' && src.type === 'binding') {
      onChange({
        props: { ...el.props, src: { ...src, placeholder: { assetId: asset.id, assetName: asset.name } } }
      })
    }
    setPickerTarget(null)
  }

  return (
    <>
      <div className={`${styles.panel} ${collapsed ? styles.collapsed : ''}`}>
        <button className={styles.header} onClick={() => setCollapsed((c) => !c)}>
          <span className={`${styles.caret} ${collapsed ? styles.caretClosed : ''}`}>▾</span>
          <span className={styles.title}>Properties</span>
        </button>

        {!collapsed && (
          <>
            {/* Nothing selected — show canvas properties */}
            {selectedIds.length === 0 && (
              <div className={styles.content}>
                <CanvasProperties />
              </div>
            )}

            {/* Multiple selected */}
            {selectedIds.length > 1 && (
              <p className={styles.empty}>
                {selectedIds.length} elements selected.
                Select one to edit properties.
              </p>
            )}

            {/* Single element selected */}
            {selected && (
              <div className={styles.content}>
                <TransformSection el={selected} onChange={onChange} />

                {selected.type === 'rect' && (
                  <RectProperties el={selected} onChange={onChange} />
                )}
                {selected.type === 'ellipse' && (
                  <EllipseProperties
                    el={selected as EllipseElement}
                    onChange={onChange}
                  />
                )}
                {selected.type === 'line' && (
                  <LineProperties
                    el={selected as LineElement}
                    onChange={onChange}
                  />
                )}
                {selected.type === 'text' && (
                  <TextProperties el={selected} onChange={onChange} />
                )}
                {selected.type === 'image' && (
                  <ImageProperties
                    el={selected as ImageElement}
                    onChange={onChange}
                    onOpenPicker={(target) => setPickerTarget(target)}
                  />
                )}
              </div>
            )}
          </>
        )}
      </div>

      {pickerTarget !== null && (
        <AssetPickerModal
          onSelect={handleAssetSelect}
          onClose={() => setPickerTarget(null)}
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
          applyDimensions={pickerTarget === 'main'}
        />
      )}
    </>
  )
}
