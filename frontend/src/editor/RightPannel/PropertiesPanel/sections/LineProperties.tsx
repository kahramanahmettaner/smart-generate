import type { LineElement } from '../../../../types/template'
import { ColorInput }   from '../controls/ColorInput'
import { NumericInput }  from '../controls/NumericInput'
import { PropRow }      from '../controls/PropRow'
import styles from '../PropertiesPanel.module.scss'

type Props = {
  el:       LineElement
  onChange: (changes: Partial<LineElement>) => void
}

// Preset dash patterns
const DASH_PRESETS: { label: string; value: number[] }[] = [
  { label: 'Solid',  value: [] },
  { label: 'Dashed', value: [8, 4] },
  { label: 'Dotted', value: [2, 6] },
]

function dashToLabel(dash: number[]): string {
  if (dash.length === 0) return 'Solid'
  const preset = DASH_PRESETS.find((p) => JSON.stringify(p.value) === JSON.stringify(dash))
  return preset?.label ?? 'Custom'
}

export function LineProperties({ el, onChange }: Props) {
  return (
    <div className={styles.section}>
      <p className={styles.sectionTitle}>Line</p>

      <PropRow label="Color">
        <ColorInput
          value={el.props.stroke}
          onChange={(v) => onChange({ props: { ...el.props, stroke: v } })}
        />
      </PropRow>

      <PropRow label="Width">
        <NumericInput
          value={el.props.strokeWidth} min={1} max={50}
          onChange={(v) => onChange({ props: { ...el.props, strokeWidth: v } })}
        />
      </PropRow>

      <PropRow label="Length">
        <NumericInput
          value={el.width} min={1}
          onChange={(v) => onChange({ width: v } as any)}
        />
      </PropRow>

      <PropRow label="Style">
        <select
          className={styles.select}
          value={dashToLabel(el.props.dash)}
          onChange={(e) => {
            const preset = DASH_PRESETS.find((p) => p.label === e.target.value)
            if (preset) onChange({ props: { ...el.props, dash: preset.value } })
          }}
        >
          {DASH_PRESETS.map((p) => (
            <option key={p.label} value={p.label}>{p.label}</option>
          ))}
        </select>
      </PropRow>
    </div>
  )
}
