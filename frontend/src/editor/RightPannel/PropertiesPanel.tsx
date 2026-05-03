import styles from './PropertiesPanel.module.scss'
import { useEditorStore } from '../../store/useEditorStore'
import type { Element, ImageElement, RectElement, TextElement } from '../../types/template'
import { useState } from 'react';
import { useAssetStore } from '../../store/useAssetStore';
import type { ImageAsset } from '../../types/asset';
import { AssetPickerModal } from '../AssetPicker/AssetPickerModal';
import { useConfirm } from '../../hooks/useConfirm';
import { ConfirmDialog } from '../../components/ConfirmDialog/ConfirmDialog';

function PropRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={styles.propRow}>
      <span className={styles.propLabel}>{label}</span>
      <div className={styles.propControl}>{children}</div>
    </div>
  )
}

function NumericInput({ value, onChange, min, max, step = 1 }: {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
}) {
  return (
    <input
      type="number"
      className={styles.input}
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
    />
  )
}

function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className={styles.colorRow}>
      <input
        type="color"
        className={styles.colorSwatch}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <input
        type="text"
        className={styles.input}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

function TransformSection({ el, onChange }: {
  el: Element
  onChange: (c: Partial<Element>) => void
}) {
  const ratio = el.width / el.height

  const handleWidthChange = (w: number) => {
    if (el.aspectRatioLocked) {
      onChange({ width: w, height: Math.max(1, Math.round(w / ratio)) } as any)
    } else {
      onChange({ width: w } as any)
    }
  }

  const handleHeightChange = (h: number) => {
    if (el.aspectRatioLocked) {
      onChange({ height: h, width: Math.max(1, Math.round(h * ratio)) } as any)
    } else {
      onChange({ height: h } as any)
    }
  }

  return (
    <div className={styles.section}>
      <p className={styles.sectionTitle}>Transform</p>

      {/* Position */}
      <div className={styles.twoCol}>
        <div>
          <p className={styles.miniLabel}>X</p>
          <NumericInput value={el.x} onChange={(v) => onChange({ x: v } as any)} />
        </div>
        <div>
          <p className={styles.miniLabel}>Y</p>
          <NumericInput value={el.y} onChange={(v) => onChange({ y: v } as any)} />
        </div>
      </div>

      {/* Aspect ratio lock */}
      <label className={styles.checkboxRow}>
        <input
          type="checkbox"
          className={styles.checkbox}
          checked={el.aspectRatioLocked ?? false}
          onChange={(e) => onChange({ aspectRatioLocked: e.target.checked } as any)}
        />
        <span className={styles.checkboxLabel}>Lock aspect ratio</span>
      </label>

      {/* Size */}
      <div className={styles.twoCol}>
        <div>
          <p className={styles.miniLabel}>Width</p>
          <NumericInput value={el.width} min={1} onChange={handleWidthChange} />
        </div>
        <div>
          <p className={styles.miniLabel}>Height</p>
          <NumericInput value={el.height} min={1} onChange={handleHeightChange} />
        </div>
      </div>

      {/* Rotation + Opacity */}
      <div className={styles.twoCol}>
        <div>
          <p className={styles.miniLabel}>Rotation °</p>
          <NumericInput value={el.rotation} min={-360} max={360}
            onChange={(v) => onChange({ rotation: v } as any)} />
        </div>
        <div>
          <p className={styles.miniLabel}>Opacity %</p>
          <NumericInput
            value={Math.round(el.opacity * 100)}
            min={0} max={100}
            onChange={(v) => onChange({ opacity: v / 100 } as any)}
          />
        </div>
      </div>
    </div>
  )
}

function RectProperties({ el, onChange }: { el: RectElement; onChange: (c: Partial<RectElement>) => void }) {
  return (
    <div className={styles.section}>
      <p className={styles.sectionTitle}>Appearance</p>
      <PropRow label="Fill">
        <ColorInput value={el.props.fill}
          onChange={(v) => onChange({ props: { ...el.props, fill: v } })} />
      </PropRow>
      <PropRow label="Stroke">
        <ColorInput value={el.props.stroke}
          onChange={(v) => onChange({ props: { ...el.props, stroke: v } })} />
      </PropRow>
      <PropRow label="Stroke W">
        <NumericInput value={el.props.strokeWidth} min={0} max={20}
          onChange={(v) => onChange({ props: { ...el.props, strokeWidth: v } })} />
      </PropRow>
      <PropRow label="Radius">
        <NumericInput value={el.props.cornerRadius} min={0} max={500}
          onChange={(v) => onChange({ props: { ...el.props, cornerRadius: v } })} />
      </PropRow>
    </div>
  )
}

function TextProperties({ el, onChange }: { el: TextElement; onChange: (c: Partial<TextElement>) => void }) {
  const content = el.props.content
  const isStatic = content.type === 'static'

  return (
    <div className={styles.section}>
      <p className={styles.sectionTitle}>Text</p>

      <div className={styles.bindingRow}>
        <span className={styles.propLabel}>Content</span>
        <button
          className={`${styles.bindToggle} ${!isStatic ? styles.bound : ''}`}
          onClick={() => {
            if (isStatic) {
              onChange({ props: { ...el.props, content: { type: 'binding', column: '' } } })
            } else {
              onChange({ props: { ...el.props, content: { type: 'static', value: '' } } })
            }
          }}
        >
          {isStatic ? '{ } Bind' : '✕ Unbind'}
        </button>
      </div>

      {isStatic ? (
        <textarea
          className={styles.textarea}
          value={content.value}
          rows={2}
          onChange={(e) => onChange({
            props: { ...el.props, content: { type: 'static', value: e.target.value } }
          })}
        />
      ) : (
        <input
          type="text"
          className={`${styles.input} ${styles.inputFull}`}
          placeholder="column name"
          value={content.column}
          onChange={(e) => onChange({
            props: { ...el.props, content: { type: 'binding', column: e.target.value } }
          })}
        />
      )}

      <div className={styles.twoCol} style={{ marginTop: 8 }}>
        <div>
          <p className={styles.miniLabel}>Size</p>
          <NumericInput value={el.props.fontSize} min={6} max={400}
            onChange={(v) => onChange({ props: { ...el.props, fontSize: v } })} />
        </div>
        <div>
          <p className={styles.miniLabel}>Line H</p>
          <NumericInput value={el.props.lineHeight} min={0.5} max={4} step={0.1}
            onChange={(v) => onChange({ props: { ...el.props, lineHeight: v } })} />
        </div>
      </div>

      <PropRow label="Color">
        <ColorInput value={el.props.color}
          onChange={(v) => onChange({ props: { ...el.props, color: v } })} />
      </PropRow>

      <PropRow label="Weight">
        <select
          className={styles.select}
          value={el.props.fontWeight}
          onChange={(e) => onChange({
            props: { ...el.props, fontWeight: e.target.value as 'normal' | 'bold' }
          })}
        >
          <option value="normal">Normal</option>
          <option value="bold">Bold</option>
        </select>
      </PropRow>

      <PropRow label="Align">
        <select
          className={styles.select}
          value={el.props.align}
          onChange={(e) => onChange({
            props: { ...el.props, align: e.target.value as 'left' | 'center' | 'right' }
          })}
        >
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
        </select>
      </PropRow>
    </div>
  )
}

function ImageAlignControls({ el, onChange }: {
  el: ImageElement
  onChange: (c: Partial<ImageElement>) => void
}) {
  const align = el.props.align ?? { horizontal: 'center', vertical: 'center' }

  // 3x3 grid of positions
  const positions: Array<{
    h: 'left' | 'center' | 'right'
    v: 'top'  | 'center' | 'bottom'
  }> = [
    { h: 'left',   v: 'top'    },
    { h: 'center', v: 'top'    },
    { h: 'right',  v: 'top'    },
    { h: 'left',   v: 'center' },
    { h: 'center', v: 'center' },
    { h: 'right',  v: 'center' },
    { h: 'left',   v: 'bottom' },
    { h: 'center', v: 'bottom' },
    { h: 'right',  v: 'bottom' },
  ]

  return (
    <div className={styles.alignBlock}>
      <p className={styles.miniLabel} style={{ marginBottom: 6 }}>Position</p>
      <div className={styles.alignGrid}>
        {positions.map(({ h, v }) => {
          const active = align.horizontal === h && align.vertical === v
          return (
            <button
              key={`${h}-${v}`}
              className={`${styles.alignDot} ${active ? styles.alignDotActive : ''}`}
              onClick={() => onChange({
                props: { ...el.props, align: { horizontal: h, vertical: v } }
              })}
              title={`${v} ${h}`}
            />
          )
        })}
      </div>
    </div>
  )
}

function ImageProperties({ el, onChange, onOpenPicker }: {
  el: ImageElement
  onChange: (c: Partial<ImageElement>) => void
  onOpenPicker: (target: 'main' | 'placeholder') => void
}) {
  const { getAsset } = useAssetStore()
  const { confirm, dialogProps } = useConfirm()
  const src          = el.props.src
  const isBinding    = src.type === 'binding'

  // Resolve assets for display
  const mainAsset = src.type === 'asset'
    ? getAsset(src.assetId)
    : null

  const placeholderAsset = src.type === 'binding' && src.placeholder
    ? getAsset(src.placeholder.assetId)
    : null

  const switchToBinding = async () => {
    if (src.type === 'asset' && src.assetId) {
      const ok = await confirm({
        title:        'Switch to column binding?',
        message:      'The currently set image will be removed. You can set a placeholder image after switching.',
        confirmLabel: 'Switch',
        cancelLabel:  'Keep asset',
        variant:      'danger',
      })
      if (!ok) return
    }
    onChange({
      props: {
        ...el.props,
        src: { type: 'binding', column: '', placeholder: undefined }
      }
    })
  }

  const switchToAsset = async () => {
    if (src.type === 'binding' && (src.column || src.placeholder)) {
      const ok = await confirm({
        title:        'Switch to asset?',
        message:      'The column binding and placeholder will be removed.',
        confirmLabel: 'Switch',
        cancelLabel:  'Keep binding',
        variant:      'danger',
      })
      if (!ok) return
    }
    onChange({
      props: { ...el.props, src: { type: 'none' } }
    })
  }

  return (
    <>
      <div className={styles.section}>
        <p className={styles.sectionTitle}>Image</p>

        {/* Source mode segmented control */}
        <div className={styles.segmentedControl}>
          <button
            className={`${styles.segmentBtn} ${!isBinding ? styles.segmentActive : ''}`}
            onClick={switchToAsset}
          >
            Asset
          </button>
          <button
            className={`${styles.segmentBtn} ${isBinding ? styles.segmentActive : ''}`}
            onClick={switchToBinding}
          >
            {'{ } Column'}
          </button>
        </div>

        {/* ── Asset mode ── */}
        {!isBinding && (
          <div className={styles.imageSourceBlock}>
            {mainAsset ? (
              <div className={styles.imageSourceSet}>
                <span className={styles.imageAssetName} title={mainAsset.name}>
                  {mainAsset.name}
                </span>
                <span className={styles.imageAssetDims}>
                  {mainAsset.width} × {mainAsset.height}px
                </span>
                <div className={styles.imageSourceBtns}>
                  <button
                    className={styles.imageSourceBtn}
                    onClick={() => onOpenPicker('main')}
                  >
                    Change
                  </button>
                  <button
                    className={`${styles.imageSourceBtn} ${styles.imageSourceBtnDanger}`}
                    onClick={() => onChange({
                      props: { ...el.props, src: { type: 'none' } }
                    })}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <button
                className={styles.setImageBtn}
                onClick={() => onOpenPicker('main')}
              >
                + Set image
              </button>
            )}
          </div>
        )}

        {/* ── Binding mode ── */}
        {isBinding && src.type === 'binding' && (
          <div className={styles.bindingBlock}>

            {/* Column name */}
            <div className={styles.bindingFieldGroup}>
              <p className={styles.miniLabel}>Dataset column</p>
              <input
                type="text"
                className={`${styles.input} ${styles.inputFull}`}
                placeholder="e.g. product_image"
                value={src.column}
                onChange={(e) => onChange({
                  props: {
                    ...el.props,
                    src: { ...src, column: e.target.value }
                  }
                })}
              />
              {src.column.trim() && (
                <p className={styles.bindingHint}>
                  Reads from <code>{src.column}</code> at generation time
                </p>
              )}
            </div>

            {/* Placeholder */}
            <div className={styles.bindingFieldGroup}>
              <div className={styles.bindingPlaceholderHeader}>
                <p className={styles.miniLabel}>Preview placeholder</p>
                <span className={styles.bindingPlaceholderHint}>editor only</span>
              </div>

              {placeholderAsset ? (
                <div className={styles.imageSourceSet}>
                  <span className={styles.imageAssetName} title={placeholderAsset.name}>
                    {placeholderAsset.name}
                  </span>
                  <span className={styles.imageAssetDims}>
                    {placeholderAsset.width} × {placeholderAsset.height}px
                  </span>
                  <div className={styles.imageSourceBtns}>
                    <button
                      className={styles.imageSourceBtn}
                      onClick={() => onOpenPicker('placeholder')}
                    >
                      Change
                    </button>
                    <button
                      className={`${styles.imageSourceBtn} ${styles.imageSourceBtnDanger}`}
                      onClick={() => onChange({
                        props: {
                          ...el.props,
                          src: { ...src, placeholder: undefined }
                        }
                      })}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  className={`${styles.setImageBtn} ${styles.setImageBtnSubtle}`}
                  onClick={() => onOpenPicker('placeholder')}
                >
                  + Set placeholder
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Fit + Alignment — always visible for both modes ── */}
        <div className={styles.propRow} style={{ marginTop: 8 }}>
          <span className={styles.propLabel}>Fit</span>
          <div className={styles.propControl}>
            <select
              className={styles.select}
              value={el.props.fit}
              onChange={(e) => onChange({
                props: {
                  ...el.props,
                  fit: e.target.value as 'cover' | 'contain' | 'fill'
                }
              })}
            >
              <option value="cover">Cover</option>
              <option value="contain">Contain</option>
              <option value="fill">Fill</option>
            </select>
          </div>
        </div>

        {(el.props.fit === 'cover' || el.props.fit === 'contain') && (
          <ImageAlignControls el={el} onChange={onChange} />
        )}
      </div>

      {/* Confirmation dialog */}
      {dialogProps && <ConfirmDialog {...dialogProps} />}
    </>
  )
}

type Props = {
  canvasWidth: number
  canvasHeight: number
}

export function PropertiesPanel({ canvasWidth, canvasHeight }: {
  canvasWidth: number
  canvasHeight: number
}) {
  const [collapsed,    setCollapsed]    = useState(false)
  const [pickerTarget, setPickerTarget] = useState<'main' | 'placeholder' | null>(null)

  const { template, selectedId, updateElement } = useEditorStore()
  const selected = template.elements.find((el) => el.id === selectedId)

  const onChange = (changes: Partial<Element>) => {
    if (selected) updateElement(selected.id, changes)
  }

  const handleAssetSelect = (asset: ImageAsset, dims: { width: number; height: number }) => {
    if (!selected || selected.type !== 'image') return

    const el  = selected as ImageElement
    const src = el.props.src

    if (pickerTarget === 'main') {
      onChange({
        width:  dims.width,
        height: dims.height,
        props: {
          ...el.props,
          src: { type: 'asset', assetId: asset.id }
        }
      } as any)
    }

    if (pickerTarget === 'placeholder' && src.type === 'binding') {
      onChange({
        props: {
          ...el.props,
          src: {
            ...src,
            placeholder: { assetId: asset.id }
          }
        }
      } as any)
      // Don't resize element when setting a placeholder
    }

    setPickerTarget(null)
  }

  return (
    <>
      <div className={`${styles.panel} ${collapsed ? styles.collapsed : ''}`}>
        <button
          className={styles.header}
          onClick={() => setCollapsed((c) => !c)}
        >
          <span className={`${styles.caret} ${collapsed ? styles.caretClosed : ''}`}>
            ▾
          </span>
          <span className={styles.title}>Properties</span>
        </button>

        {!collapsed && (
          <>
            {!selected ? (
              <p className={styles.empty}>Select an element to edit its properties</p>
            ) : (
              <div className={styles.content}>
                <TransformSection el={selected} onChange={onChange} />

                {selected.type === 'rect' && (
                  <RectProperties
                    el={selected}
                    onChange={(c) => onChange(c as Partial<Element>)}
                  />
                )}

                {selected.type === 'text' && (
                  <TextProperties
                    el={selected}
                    onChange={(c) => onChange(c as Partial<Element>)}
                  />
                )}

                {selected.type === 'image' && (
                  <ImageProperties
                    el={selected as ImageElement}
                    onChange={(c) => onChange(c as Partial<Element>)}
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
          // When picking a placeholder, don't apply fit dimensions
          applyDimensions={pickerTarget === 'main'}
        />
      )}
    </>
  )
}