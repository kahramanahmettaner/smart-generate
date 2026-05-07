import styles from '../../PropertiesPanel/PropertiesPanel.module.scss'

type Props = {
    value: number
    onChange: (v: number) => void
    min?: number
    max?: number
    step?: number
}

export function NumericInput({ value, onChange, min, max, step = 1 }: Props) {
    return (
        <input
            type="number"
            className={styles.input}
            value={value}
            min={min}
            max={max}
            step={step}
            onChange={(e) => 
                onChange(parseFloat(e.target.value) || 0)
            }
            onKeyDown={(e) => {
                if (e.key === 'Escape') (e.target as HTMLElement).blur()
            }}
        />
    )
}