import styles from './PlaceholderTab.module.scss'

export function RenderTab() {
  return (
    <div className={styles.tab}>
      <div className={styles.content}>
        <span className={styles.icon}>▶</span>
        <p className={styles.title}>Render</p>
        <p className={styles.desc}>
          Generate images in batch from your dataset and download as a ZIP
        </p>
      </div>
    </div>
  )
}