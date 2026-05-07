import styles from '../../PropertiesPanel/PropertiesPanel.module.scss'

type Props = {
    value: string
    onChange: (v: string) => void
}

export function ColorInput({ value, onChange }: Props) {
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