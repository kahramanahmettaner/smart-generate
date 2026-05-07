import type { ImageAlign, ImageElement } from '../../../../types/template'
import styles from '../PropertiesPanel.module.scss'

type Props = {
  el: ImageElement
  onChange: (changes: Partial<ImageElement>) => void
}

// 3x3 grid of positions
const POSITIONS: Array<{
  h: ImageAlign['horizontal']
  v: ImageAlign['vertical']
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

export function ImageAlignControls({ el, onChange }: Props) {
  const align = el.props.align ?? { horizontal: 'center', vertical: 'center' }

  return (
    <div className={styles.alignBlock}>
      <p className={styles.miniLabel} style={{ marginBottom: 6 }}>Position</p>
      <div className={styles.alignGrid}>
        {POSITIONS.map(({ h, v }) => {
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