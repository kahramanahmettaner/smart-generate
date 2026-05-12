import { useState, useEffect } from 'react'
import { useAssetStore }  from '../../../../store/useAssetStore'
import { useEditorStore } from '../../../../store/useEditorStore'
import { useConfirm }     from '../../../../hooks/useConfirm'
import { ConfirmDialog }  from '../../../../components/ConfirmDialog/ConfirmDialog'
import type { ImageAsset } from '../../../../types/asset'
import styles from './AssetDetailModal.module.scss'

type Props = {
  asset:     ImageAsset
  onClose:   () => void
  onDeleted: () => void
}

export function AssetDetailModal({ asset, onClose, onDeleted }: Props) {
  const { renameAsset, removeAsset } = useAssetStore()
  const { syncAssetName, template }  = useEditorStore()
  const { confirm, dialogProps }     = useConfirm()

  const [name,    setName]    = useState(asset.name)
  const [editing, setEditing] = useState(false)
  const [nameErr, setNameErr] = useState('')

  const usageCount = template.elements.filter((el) => {
    if (el.type !== 'image') return false
    const src = (el as any).props.src
    return (
      (src.type === 'asset'   && src.assetName === asset.name) ||
      (src.type === 'binding' && src.placeholder?.assetName === asset.name)
    )
  }).length

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (editing) { setEditing(false); setName(asset.name) }
        else onClose()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [editing, asset.name, onClose])

  const commitRename = () => {
    const trimmed = name.trim()
    if (!trimmed) { setNameErr('Name cannot be empty'); return }
    if (trimmed === asset.name) { setEditing(false); return }

    const oldName = asset.name
    renameAsset(asset.id, trimmed)
    const actualName = useAssetStore.getState().assets[asset.id]?.name ?? trimmed
    syncAssetName(oldName, actualName)
    setName(actualName)
    setNameErr('')
    setEditing(false)
  }

  const handleDelete = async () => {
    const message = usageCount > 0
      ? `This image is used in ${usageCount} element${usageCount !== 1 ? 's' : ''} in your template. Removing it will show a "missing" state on those elements.`
      : 'This image will be permanently removed from your library.'

    const ok = await confirm({
      title: 'Remove image?', message, confirmLabel: 'Remove', variant: 'danger',
    })
    if (!ok) return
    await removeAsset(asset.id)
    onDeleted()
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024)        return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <>
      <div className={styles.overlay} onClick={onClose}>
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>

          {/* Preview — url instead of dataUrl */}
          <div className={styles.preview}>
            <img src={asset.url} alt={asset.name} />
          </div>

          <div className={styles.info}>
            <div className={styles.nameRow}>
              {editing ? (
                <div className={styles.nameEditWrap}>
                  <input
                    className={`${styles.nameInput} ${nameErr ? styles.nameInputError : ''}`}
                    value={name}
                    autoFocus
                    onChange={(e) => { setName(e.target.value); setNameErr('') }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter')  commitRename()
                      if (e.key === 'Escape') { setEditing(false); setName(asset.name) }
                      e.stopPropagation()
                    }}
                    onBlur={commitRename}
                  />
                  {nameErr && <p className={styles.nameErr}>{nameErr}</p>}
                </div>
              ) : (
                <>
                  <h2 className={styles.assetName}>{asset.name}</h2>
                  <button className={styles.renameBtn} onClick={() => setEditing(true)} title="Rename">
                    ✎
                  </button>
                </>
              )}
            </div>

            <div className={styles.metaGrid}>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Dimensions</span>
                <span className={styles.metaValue}>{asset.width} × {asset.height}px</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>File size</span>
                <span className={styles.metaValue}>{formatSize(asset.size)}</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Added</span>
                <span className={styles.metaValue}>
                  {new Date(asset.createdAt).toLocaleDateString(undefined, {
                    day: '2-digit', month: 'short', year: 'numeric'
                  })}
                </span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Used in template</span>
                <span className={`${styles.metaValue} ${usageCount > 0 ? styles.metaUsed : ''}`}>
                  {usageCount > 0 ? `${usageCount} element${usageCount !== 1 ? 's' : ''}` : 'Not used'}
                </span>
              </div>
            </div>

            <div className={styles.idRow}>
              <span className={styles.idLabel}>Asset name (used for template matching)</span>
              <code className={styles.idValue}>{asset.name}</code>
            </div>

            <div className={styles.actions}>
              <button className={styles.closeBtn} onClick={onClose}>Close</button>
              <button className={styles.deleteBtn} onClick={handleDelete}>Remove asset</button>
            </div>
          </div>
        </div>
      </div>
      {dialogProps && <ConfirmDialog {...dialogProps} />}
    </>
  )
}
