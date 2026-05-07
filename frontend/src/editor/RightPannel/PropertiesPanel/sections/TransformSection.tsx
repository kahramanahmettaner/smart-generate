import type { Element } from '../../../../types/template'
import { NumericInput } from '../controls/NumericInput'
import styles from '../PropertiesPanel.module.scss'

type Props = {
    el: Element
    onChange: (changes: Partial<Element>) => void
} 

export function TransformSection({ el, onChange }: Props) {
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