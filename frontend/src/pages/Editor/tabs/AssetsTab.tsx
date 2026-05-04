import styles from './PlaceholderTab.module.scss'

export function AssetsTab() {
  return (
    <div className={styles.tab}>
      <div className={styles.content}>
        <span className={styles.icon}>⬚</span>
        <p className={styles.title}>Assets</p>
        <p className={styles.desc}>
          Manage your image library — upload, organize, and reuse assets across templates
        </p>
      </div>
    </div>
  )
}