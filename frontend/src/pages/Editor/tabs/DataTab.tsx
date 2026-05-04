import styles from './PlaceholderTab.module.scss'

export function DataTab() {
  return (
    <div className={styles.tab}>
      <div className={styles.content}>
        <span className={styles.icon}>⊞</span>
        <p className={styles.title}>Data</p>
        <p className={styles.desc}>
          Upload a CSV dataset, bind columns to template elements, and preview each row on the canvas
        </p>
      </div>
    </div>
  )
}