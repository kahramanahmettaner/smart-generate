import { useEditorStore } from '../../../../store/useEditorStore'
import { ColorInput } from '../controls/ColorInput'
import { PropRow }    from '../controls/PropRow'
import styles from '../PropertiesPanel.module.scss'

export function CanvasProperties() {
  const { template, updateElement } = useEditorStore()
  const { canvas } = template
  const isTransparent = canvas.background === 'transparent'

  const setBackground = (value: string) => {
    // We update the canvas config directly through a special store action
    useEditorStore.setState((state) => ({
      template: {
        ...state.template,
        canvas: { ...state.template.canvas, background: value },
      },
    }))
  }

  return (
    <div className={styles.section}>
      <p className={styles.sectionTitle}>Canvas</p>

      <PropRow label="Size">
        <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
          {canvas.width} × {canvas.height}px
        </span>
      </PropRow>

      <PropRow label="Background">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Transparent toggle */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={isTransparent}
              style={{ accentColor: 'var(--color-accent)', cursor: 'pointer' }}
              onChange={(e) => setBackground(e.target.checked ? 'transparent' : '#ffffff')}
            />
            <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Transparent</span>
          </label>
        </div>
      </PropRow>

      {!isTransparent && (
        <PropRow label="">
          <ColorInput
            value={canvas.background}
            onChange={setBackground}
          />
        </PropRow>
      )}
    </div>
  )
}
