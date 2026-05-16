import type { EllipseElement } from '../../../../types/template'
import { ColorInput }  from '../controls/ColorInput'
import { NumericInput } from '../controls/NumericInput'
import { PropRow }     from '../controls/PropRow'
import styles from '../PropertiesPanel.module.scss'

type Props = {
  el:       EllipseElement
  onChange: (changes: Partial<EllipseElement>) => void
}

export function EllipseProperties({ el, onChange }: Props) {
  return (
    <div className={styles.section}>
      <p className={styles.sectionTitle}>Appearance</p>
      <PropRow label="Fill">
        <ColorInput
          value={el.props.fill}
          onChange={(v) => onChange({ props: { ...el.props, fill: v } })}
        />
      </PropRow>
      <PropRow label="Stroke">
        <ColorInput
          value={el.props.stroke}
          onChange={(v) => onChange({ props: { ...el.props, stroke: v } })}
        />
      </PropRow>
      <PropRow label="Stroke W">
        <NumericInput
          value={el.props.strokeWidth} min={0} max={20}
          onChange={(v) => onChange({ props: { ...el.props, strokeWidth: v } })}
        />
      </PropRow>
    </div>
  )
}
