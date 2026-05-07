import { useRef, useState } from 'react'
import { useAssetStore } from '../../store/useAssetStore'
import { fitDimensions } from '../../lib/imageUtils'
import type { ImageAsset } from '../../types/asset'
import styles from './AssetPickerModal.module.scss'
import { useEditorStore } from '../../store/useEditorStore'

type Props = {
  onSelect: (asset: ImageAsset, dims: { width: number; height: number }) => void
  onClose:  () => void
  canvasWidth:  number
  canvasHeight: number
  applyDimensions?: boolean  // ← default true
}

export function AssetPickerModal({ onSelect, onClose, canvasWidth, canvasHeight, applyDimensions = true }: Props) {
  const { assets, addAsset, removeAsset } = useAssetStore()
  const assetList = Object.values(assets).sort((a, b) => b.createdAt - a.createdAt)

  const [uploading,         setUploading]         = useState(false)
  const [dragOver,          setDragOver]           = useState(false)
  const [renamingId,        setRenamingId]         = useState<string | null>(null)
  const [renameValue,       setRenameValue]        = useState('')
  const [keepAspectRatio,   setKeepAspectRatio]   = useState(true)
  const [keepOriginalRes,   setKeepOriginalRes]   = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const getDims = (asset: ImageAsset) =>
    fitDimensions(asset.width, asset.height, canvasWidth, canvasHeight, {
      keepOriginalResolution: keepOriginalRes,
      keepAspectRatio,
    })

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setUploading(true)
    try {
      let last: ImageAsset | null = null
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) continue
        last = await addAsset(file)
      }
      if (last) onSelect(last, getDims(last))
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    handleFiles(e.dataTransfer.files)
  }

  const startRename = (asset: ImageAsset) => {
    setRenamingId(asset.id)
    setRenameValue(asset.name)
  }

  const commitRename = () => {
    if (renamingId && renameValue.trim()) {
      const oldName = assets[renamingId]?.name
      const newName = renameValue.trim()
      useAssetStore.getState().renameAsset(renamingId, newName)
      // Sync template references
      const safeName = useAssetStore.getState().assets[renamingId]?.name
      if (oldName && safeName) {
        useEditorStore.getState().syncAssetName(oldName, safeName)
      }
    }
    setRenamingId(null)
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>

        <div className={styles.header}>
          <span className={styles.title}>
            {applyDimensions ? 'Image library' : 'Choose placeholder image'}
          </span>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Upload zone */}
        <div
          className={`${styles.dropZone} ${dragOver ? styles.dragOver : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true)  }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={(e) => handleFiles(e.target.files)}
          />
          {uploading ? (
            <span className={styles.dropText}>Uploading…</span>
          ) : (
            <>
              <span className={styles.dropIcon}>⬆</span>
              <span className={styles.dropText}>Click to upload or drag images here</span>
              <span className={styles.dropHint}>PNG, JPG, SVG, WebP</span>
            </>
          )}
        </div>

        {/* Only show size options when dimensions will be applied */}
        {applyDimensions && (
          <div className={styles.sizeOptions}>
            <span className={styles.sizeOptionsLabel}>When adding to canvas:</span>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={keepAspectRatio}
                onChange={(e) => setKeepAspectRatio(e.target.checked)}
              />
              Keep aspect ratio
            </label>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={keepOriginalRes}
                onChange={(e) => {
                  setKeepOriginalRes(e.target.checked)
                  if (e.target.checked) setKeepAspectRatio(true)
                }}
              />
              Use original resolution
            </label>
          </div>
        )}

        {/* Placeholder context hint */}
        {!applyDimensions && (
          <p className={styles.placeholderHint}>
            This image will only appear in the editor as a preview.
            It won't affect the element size or appear in exports.
          </p>
        )}

        {/* Library grid */}
        {assetList.length > 0 ? (
          <div className={styles.grid}>
            {assetList.map((asset) => (
              <div
                key={asset.id}
                className={styles.assetCard}
                onClick={() => onSelect(asset, getDims(asset))}
              >
                <div className={styles.assetThumb}>
                  <img src={asset.dataUrl} alt={asset.name} />
                </div>

                <div className={styles.assetMeta}>
                  {renamingId === asset.id ? (
                    <input
                      className={styles.renameInput}
                      value={renameValue}
                      autoFocus
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={commitRename}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter')  commitRename()
                        if (e.key === 'Escape') setRenamingId(null)
                        e.stopPropagation()
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span
                      className={styles.assetName}
                      title={asset.name}
                      onDoubleClick={(e) => { e.stopPropagation(); startRename(asset) }}
                    >
                      {asset.name}
                    </span>
                  )}
                  <span className={styles.assetSize}>
                    {asset.width} × {asset.height}
                  </span>
                </div>

                <button
                  className={styles.removeBtn}
                  title="Remove from library"
                  onClick={(e) => { e.stopPropagation(); removeAsset(asset.id) }}
                >✕</button>
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.emptyLibrary}>No images yet — upload one above</p>
        )}
      </div>
    </div>
  )
}