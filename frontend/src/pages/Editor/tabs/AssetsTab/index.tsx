import { useState, useRef, useCallback, useEffect } from 'react'
import { useAssetStore } from '../../../../store/useAssetStore'
import type { ImageAsset } from '../../../../types/asset'
import { AssetDetailModal } from './AssetDetailModal'
import styles from './AssetsTab.module.scss'

type ViewMode = 'grid' | 'list'
type SortKey  = 'name' | 'date' | 'size'

export function AssetsTab() {
  const { assets, addAsset, removeAsset, fetchAssets } = useAssetStore()
  const assetList = Object.values(assets)

  const [search,    setSearch]    = useState('')
  const [viewMode,  setViewMode]  = useState<ViewMode>('grid')
  const [sortKey,   setSortKey]   = useState<SortKey>('date')
  const [selected,  setSelected]  = useState<ImageAsset | null>(null)
  const [dragOver,  setDragOver]  = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load assets for current project on mount
  useEffect(() => {
    fetchAssets()
  }, [fetchAssets])

  const filtered = assetList
    .filter((a) => a.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortKey === 'name') return a.name.localeCompare(b.name)
      if (sortKey === 'size') return b.size - a.size
      return b.createdAt - a.createdAt
    })

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) continue
        await addAsset(file)
      }
    } finally {
      setUploading(false)
    }
  }, [addAsset])

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    handleFiles(e.dataTransfer.files)
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024)        return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleDateString(undefined, {
      day: '2-digit', month: 'short', year: 'numeric'
    })

  return (
    <div
      className={`${styles.tab} ${dragOver ? styles.globalDragOver : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false)
      }}
      onDrop={handleDrop}
    >
      {/* ── Toolbar ── */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <button
            className={styles.uploadBtn}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <span>{uploading ? '⊙' : '+'}</span>
            {uploading ? 'Uploading…' : 'Add images'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>

        <div className={styles.toolbarCenter}>
          <div className={styles.searchWrap}>
            <span className={styles.searchIcon}>⌕</span>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search assets…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className={styles.searchClear} onClick={() => setSearch('')}>✕</button>
            )}
          </div>
        </div>

        <div className={styles.toolbarRight}>
          <div className={styles.sortWrap}>
            <span className={styles.sortLabel}>Sort</span>
            <select
              className={styles.sortSelect}
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
            >
              <option value="date">Date added</option>
              <option value="name">Name</option>
              <option value="size">File size</option>
            </select>
          </div>
          <div className={styles.viewToggle}>
            <button
              className={`${styles.viewBtn} ${viewMode === 'grid' ? styles.viewBtnActive : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid view"
            >⊞</button>
            <button
              className={`${styles.viewBtn} ${viewMode === 'list' ? styles.viewBtnActive : ''}`}
              onClick={() => setViewMode('list')}
              title="List view"
            >≡</button>
          </div>
        </div>
      </div>

      {/* ── Stats bar ── */}
      {assetList.length > 0 && (
        <div className={styles.statsBar}>
          <span>
            {filtered.length === assetList.length
              ? `${assetList.length} asset${assetList.length !== 1 ? 's' : ''}`
              : `${filtered.length} of ${assetList.length} assets`}
          </span>
          <span>{formatSize(assetList.reduce((acc, a) => acc + a.size, 0))} total</span>
        </div>
      )}

      {/* ── Content ── */}
      <div className={styles.content}>

        {assetList.length === 0 && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>⬚</div>
            <p className={styles.emptyTitle}>No assets yet</p>
            <p className={styles.emptyDesc}>
              Upload images to use in your templates. Drag and drop anywhere or click below.
            </p>
            <button
              className={styles.emptyUploadBtn}
              onClick={() => fileInputRef.current?.click()}
            >
              + Upload images
            </button>
          </div>
        )}

        {assetList.length > 0 && filtered.length === 0 && (
          <div className={styles.emptyState}>
            <p className={styles.emptyTitle}>No results for "{search}"</p>
            <button className={styles.clearSearchBtn} onClick={() => setSearch('')}>
              Clear search
            </button>
          </div>
        )}

        {/* Grid view */}
        {viewMode === 'grid' && filtered.length > 0 && (
          <div className={styles.grid}>
            {filtered.map((asset) => (
              <div
                key={asset.id}
                className={styles.gridCard}
                onClick={() => setSelected(asset)}
              >
                <div className={styles.gridThumb}>
                  {/* url instead of dataUrl */}
                  <img src={asset.url} alt={asset.name} />
                  <div className={styles.gridOverlay}>
                    <span className={styles.gridDims}>{asset.width}×{asset.height}</span>
                  </div>
                </div>
                <div className={styles.gridMeta}>
                  <span className={styles.gridName} title={asset.name}>{asset.name}</span>
                  <span className={styles.gridSize}>{formatSize(asset.size)}</span>
                </div>
                <button
                  className={styles.gridRemoveBtn}
                  title="Remove asset"
                  onClick={(e) => { e.stopPropagation(); removeAsset(asset.id) }}
                >✕</button>
              </div>
            ))}
          </div>
        )}

        {/* List view */}
        {viewMode === 'list' && filtered.length > 0 && (
          <div className={styles.list}>
            <div className={styles.listHeader}>
              <span />
              <span>Name</span>
              <span>Dimensions</span>
              <span>Size</span>
              <span>Added</span>
              <span />
            </div>
            {filtered.map((asset) => (
              <div
                key={asset.id}
                className={styles.listRow}
                onClick={() => setSelected(asset)}
              >
                <div className={styles.listThumb}>
                  {/* url instead of dataUrl */}
                  <img src={asset.url} alt={asset.name} />
                </div>
                <span className={styles.listName} title={asset.name}>{asset.name}</span>
                <span className={styles.listDims}>{asset.width} × {asset.height}px</span>
                <span className={styles.listSize}>{formatSize(asset.size)}</span>
                <span className={styles.listDate}>{formatDate(asset.createdAt)}</span>
                <div className={styles.listActions}>
                  <button
                    className={styles.listActionBtn}
                    title="Remove asset"
                    onClick={(e) => { e.stopPropagation(); removeAsset(asset.id) }}
                  >✕</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Global drag overlay */}
      {dragOver && (
        <div className={styles.dragOverlay}>
          <div className={styles.dragOverlayContent}>
            <span className={styles.dragOverlayIcon}>⬆</span>
            <p className={styles.dragOverlayText}>Drop images to upload</p>
          </div>
        </div>
      )}

      {selected && (
        <AssetDetailModal
          asset={selected}
          onClose={() => setSelected(null)}
          onDeleted={() => setSelected(null)}
        />
      )}
    </div>
  )
}
