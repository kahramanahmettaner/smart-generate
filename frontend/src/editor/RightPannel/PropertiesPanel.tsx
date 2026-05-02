import styles from './PropertiesPanel.module.scss'
import { useEditorStore } from '../../store/useEditorStore'
import type { Element, ImageElement, RectElement, TextElement } from '../../types/template'
import { useState } from 'react';
import { useAssetStore } from '../../store/useAssetStore';
import type { ImageAsset } from '../../types/asset';
import { AssetPickerModal } from '../AssetPicker/AssetPickerModal';

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

function TransformSection({ el, onChange }: { el: Element; onChange: (c: Partial<Element>) => void }) {
  return (
    <div className={styles.section}>
      <p className={styles.sectionTitle}>Transform</p>

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

      <div className={styles.twoCol}>
        <div>
          <p className={styles.miniLabel}>W</p>
          <NumericInput value={el.width} min={1} onChange={(v) => onChange({ width: v } as any)} />
        </div>
        <div>
          <p className={styles.miniLabel}>H</p>
          <NumericInput value={el.height} min={1} onChange={(v) => onChange({ height: v } as any)} />
        </div>
      </div>

      <div className={styles.twoCol}>
        <div>
          <p className={styles.miniLabel}>Rotation</p>
          <NumericInput value={el.rotation} min={-360} max={360} onChange={(v) => onChange({ rotation: v } as any)} />
        </div>
        <div>
          <p className={styles.miniLabel}>Opacity</p>
          <NumericInput value={Math.round(el.opacity * 100)} min={0} max={100}
            onChange={(v) => onChange({ opacity: v / 100 } as any)} />
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

function ImageProperties({
  el, onChange, onOpenPicker
}: {
  el: ImageElement
  onChange: (c: Partial<ImageElement>) => void
  onOpenPicker: () => void
}) {
  const { getAsset } = useAssetStore()
  const src = el.props.src

  const assetName = src.type === 'asset'
    ? (getAsset(src.assetId)?.name ?? 'Unknown asset')
    : null

  return (
    <div className={styles.section}>
      <p className={styles.sectionTitle}>Image</p>

      {/* Source mode toggle */}
      <div className={styles.bindingRow}>
        <span className={styles.propLabel}>Source</span>
        <button
          className={`${styles.bindToggle} ${src.type === 'binding' ? styles.bound : ''}`}
          onClick={() => {
            if (src.type === 'binding') {
              onChange({ props: { ...el.props, src: { type: 'none' } } })
            } else {
              onChange({ props: { ...el.props, src: { type: 'binding', column: '' } } })
            }
          }}
        >
          {src.type === 'binding' ? '✕ Unbind' : '{ } Bind'}
        </button>
      </div>

      {src.type !== 'binding' && (
        <div className={styles.imageSourceSection}>
          {src.type === 'asset' ? (
            <div className={styles.imageSourceRow}>
              <div className={styles.imageSourceInfo}>
                <span className={styles.imageSourceIcon}>⬚</span>
                <div>
                  <span className={styles.imageSourceName}>{assetName}</span>
                  <span className={styles.imageSourceDims}>
                    {getAsset((src as any).assetId)?.width} × {getAsset((src as any).assetId)?.height}px
                  </span>
                </div>
              </div>
              <button className={styles.changeImageBtn} onClick={onOpenPicker}>
                Change
              </button>
            </div>
          ) : (
            <button className={styles.setImageBtn} onClick={onOpenPicker}>
              <span className={styles.setImageIcon}>⬚</span>
              <span>Set image</span>
            </button>
          )}
        </div>
      )}

      {/* Fit mode */}
      <PropRow label="Fit">
        <select
          className={styles.select}
          value={el.props.fit}
          onChange={(e) => onChange({
            props: { ...el.props, fit: e.target.value as 'cover' | 'contain' | 'fill' }
          })}
        >
          <option value="cover">Cover</option>
          <option value="contain">Contain</option>
          <option value="fill">Fill</option>
        </select>
      </PropRow>
    </div>
  )
}

type Props = {
  canvasWidth: number
  canvasHeight: number
}

export function PropertiesPanel({ canvasWidth, canvasHeight }: Props) {
  const [collapsed, setCollapsed] = useState(false)
  const [showPicker,   setShowPicker]   = useState(false)
  const { template, selectedId, updateElement } = useEditorStore()
  const selected = template.elements.find((el) => el.id === selectedId)

  const onChange = (changes: Partial<Element>) => {
    if (selected) updateElement(selected.id, changes)
  }

  const handleAssetSelect = (asset: ImageAsset, dims: { width: number; height: number }) => {
    if (selected?.type === 'image') {
      onChange({
        width:  dims.width,
        height: dims.height,
        props: {
          ...(selected as ImageElement).props,
          src: { type: 'asset', assetId: asset.id }
        }
      } as any)
    }
    setShowPicker(false)
  }

  return (
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
            <div 
              className={styles.content}
              onKeyDown={(e) => {
                if (e.key === 'Escape' || e.key === 'Enter') {
                  (e.target as HTMLElement).blur();
                  e.stopPropagation();
                }
              }}
              >
              <TransformSection el={selected} onChange={onChange} />
              {selected.type === 'rect' && (
                <RectProperties el={selected} onChange={(c) => onChange(c as Partial<Element>)} />
              )}
              {selected.type === 'text' && (
                <TextProperties el={selected} onChange={(c) => onChange(c as Partial<Element>)} />
              )}
              {selected?.type === 'image' && (
                <ImageProperties
                  el={selected as ImageElement}
                  onChange={(c) => onChange(c as Partial<Element>)}
                  onOpenPicker={() => setShowPicker(true)}
                />
              )}
            </div>
          )}

          {showPicker && (
            <AssetPickerModal
              onSelect={handleAssetSelect}
              onClose={() => setShowPicker(false)}
              canvasWidth={canvasWidth}
              canvasHeight={canvasHeight}
            />
          )}
        </>
      )}
    </div>
  )
}