import type { TextElement } from "../../../../types/template"
import { NumericInput } from '../controls/NumericInput'
import { ColorInput }   from '../controls/ColorInput'
import { PropRow }      from '../controls/PropRow'
import styles from '../PropertiesPanel.module.scss'

type Props = { 
    el: TextElement
    onChange: (c: Partial<TextElement>) => void 
}

export function TextProperties({ el, onChange }: Props) {
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