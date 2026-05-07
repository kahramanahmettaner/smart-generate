import styles from '../../PropertiesPanel/PropertiesPanel.module.scss'

type Props = {
  label:    string
  children: React.ReactNode
}

export function PropRow({ label, children }: Props) {
  return (
    <div className={styles.propRow}>
      <span className={styles.propLabel}>{label}</span>
      <div className={styles.propControl}>{children}</div>
    </div>
  )
}