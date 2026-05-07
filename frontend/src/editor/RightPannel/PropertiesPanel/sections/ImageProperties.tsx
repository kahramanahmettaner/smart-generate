import { useAssetStore } from '../../../../store/useAssetStore'
import { useConfirm } from '../../../../hooks/useConfirm'
import { ConfirmDialog } from '../../../../components/ConfirmDialog/ConfirmDialog'
import { ImageAlignControls } from './ImageAlignControls'
import styles from '../PropertiesPanel.module.scss'
import type { ImageElement } from '../../../../types/template'

type Props = {
  el: ImageElement
  onChange: (changes: Partial<ImageElement>) => void
  onOpenPicker: (target: 'main' | 'placeholder') => void
}

export function ImageProperties({ el, onChange, onOpenPicker }: Props) {
  const { getAsset }             = useAssetStore()
  const { confirm, dialogProps } = useConfirm()
  const src                      = el.props.src
  const isBinding                = src.type === 'binding'

  const mainAsset = src.type === 'asset'
    ? getAsset(src.assetId)
    : null

  // Asset ID is set but not found in local store
  const isMainMissing = src.type === 'asset' && !mainAsset

  const placeholderAsset = src.type === 'binding' && src.placeholder
    ? getAsset(src.placeholder.assetId)
    : null

  const isPlaceholderMissing = src.type === 'binding'
    && src.placeholder
    && !placeholderAsset

  const switchToBinding = async () => {
    if (src.type === 'asset' && src.assetId) {
      const ok = await confirm({
        title:        'Switch to column binding?',
        message:      'The currently set image will be removed. You can set a placeholder image after switching.',
        confirmLabel: 'Switch',
        cancelLabel:  'Keep asset',
        variant:      'danger',
      })
      if (!ok) return
    }
    onChange({
      props: {
        ...el.props,
        src: { type: 'binding', column: '', placeholder: undefined }
      }
    })
  }

  const switchToAsset = async () => {
    if (src.type === 'binding' && (src.column || src.placeholder)) {
      const ok = await confirm({
        title:        'Switch to asset?',
        message:      'The column binding and placeholder will be removed.',
        confirmLabel: 'Switch',
        cancelLabel:  'Keep binding',
        variant:      'danger',
      })
      if (!ok) return
    }
    onChange({
      props: { ...el.props, src: { type: 'none' } }
    })
  }

  return (
    <>
      <div className={styles.section}>
        <p className={styles.sectionTitle}>Image</p>

        {/* Source mode segmented control */}
        <div className={styles.segmentedControl}>
          <button
            className={`${styles.segmentBtn} ${!isBinding ? styles.segmentActive : ''}`}
            onClick={switchToAsset}
          >
            Asset
          </button>
          <button
            className={`${styles.segmentBtn} ${isBinding ? styles.segmentActive : ''}`}
            onClick={switchToBinding}
          >
            {'{ } Column'}
          </button>
        </div>

        {/* ── Asset mode ── */}
        {!isBinding && (
          <div className={styles.imageSourceBlock}>
            {isMainMissing ? (
              // Reference exists but asset not in local store
              <div className={styles.missingAssetBlock}>
                <div className={styles.missingAssetInfo}>
                  <span className={styles.missingIcon}>⚠</span>
                  <div>
                    <p className={styles.missingTitle}>Image not found</p>
                    <p className={styles.missingDesc}>
                      This image was set but is not in your local library.
                      Import it to restore it.
                    </p>
                    <code className={styles.missingId}>
                      {(src as any).assetName}
                    </code>
                  </div>
                </div>
                <div className={styles.imageSourceBtns}>
                  <button
                    className={styles.imageSourceBtn}
                    onClick={() => onOpenPicker('main')}
                  >
                    Import image
                  </button>
                  <button
                    className={`${styles.imageSourceBtn} ${styles.imageSourceBtnDanger}`}
                    onClick={() => onChange({
                      props: { ...el.props, src: { type: 'none' } }
                    })}
                  >
                    Clear
                  </button>
                </div>
              </div>
            ) : mainAsset ? (
              <div className={styles.imageSourceSet}>
                <span className={styles.imageAssetName} title={mainAsset.name}>
                  {mainAsset.name}
                </span>
                <span className={styles.imageAssetDims}>
                  {mainAsset.width} × {mainAsset.height}px
                </span>
                <div className={styles.imageSourceBtns}>
                  <button
                    className={styles.imageSourceBtn}
                    onClick={() => onOpenPicker('main')}
                  >
                    Change
                  </button>
                  <button
                    className={`${styles.imageSourceBtn} ${styles.imageSourceBtnDanger}`}
                    onClick={() => onChange({
                      props: { ...el.props, src: { type: 'none' } }
                    })}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <button
                className={styles.setImageBtn}
                onClick={() => onOpenPicker('main')}
              >
                + Set image
              </button>
            )}
          </div>
        )}

        {/* ── Binding mode ── */}
        {isBinding && src.type === 'binding' && (
          <div className={styles.bindingBlock}>
            <div className={styles.bindingFieldGroup}>
              <p className={styles.miniLabel}>Dataset column</p>
              <input
                type="text"
                className={`${styles.input} ${styles.inputFull}`}
                placeholder="e.g. product_image"
                value={src.column}
                onChange={(e) => onChange({
                  props: { ...el.props, src: { ...src, column: e.target.value } }
                })}
              />
              {src.column.trim() && (
                <p className={styles.bindingHint}>
                  Reads from <code>{src.column}</code> at generation time
                </p>
              )}
            </div>

            <div className={styles.bindingFieldGroup}>
              <div className={styles.bindingPlaceholderHeader}>
                <p className={styles.miniLabel}>Preview placeholder</p>
                <span className={styles.bindingPlaceholderHint}>editor only</span>
              </div>

              {isPlaceholderMissing ? (
                <div className={styles.missingAssetBlock}>
                  <div className={styles.missingAssetInfo}>
                    <span className={styles.missingIcon}>⚠</span>
                    <div>
                      <p className={styles.missingTitle}>Placeholder not found</p>
                      <p className={styles.missingDesc}>
                        Import the image to restore this placeholder.
                      </p>
                    </div>
                  </div>
                  <div className={styles.imageSourceBtns}>
                    <button
                      className={styles.imageSourceBtn}
                      onClick={() => onOpenPicker('placeholder')}
                    >
                      Import image
                    </button>
                    <button
                      className={`${styles.imageSourceBtn} ${styles.imageSourceBtnDanger}`}
                      onClick={() => onChange({
                        props: { ...el.props, src: { ...src, placeholder: undefined } }
                      })}
                    >
                      Clear
                    </button>
                  </div>
                </div>
              ) : placeholderAsset ? (
                <div className={styles.imageSourceSet}>
                  <span className={styles.imageAssetName}>{placeholderAsset.name}</span>
                  <span className={styles.imageAssetDims}>
                    {placeholderAsset.width} × {placeholderAsset.height}px
                  </span>
                  <div className={styles.imageSourceBtns}>
                    <button
                      className={styles.imageSourceBtn}
                      onClick={() => onOpenPicker('placeholder')}
                    >
                      Change
                    </button>
                    <button
                      className={`${styles.imageSourceBtn} ${styles.imageSourceBtnDanger}`}
                      onClick={() => onChange({
                        props: { ...el.props, src: { ...src, placeholder: undefined } }
                      })}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  className={`${styles.setImageBtn} ${styles.setImageBtnSubtle}`}
                  onClick={() => onOpenPicker('placeholder')}
                >
                  + Set placeholder
                </button>
              )}
            </div>
          </div>
        )}

        {/* Fit + Alignment — always visible */}
        <div className={styles.propRow} style={{ marginTop: 8 }}>
          <span className={styles.propLabel}>Fit</span>
          <div className={styles.propControl}>
            <select
              className={styles.select}
              value={el.props.fit}
              onChange={(e) => onChange({
                props: { ...el.props, fit: e.target.value as any }
              })}
            >
              <option value="cover">Cover</option>
              <option value="contain">Contain</option>
              <option value="fill">Fill</option>
            </select>
          </div>
        </div>

        {(el.props.fit === 'cover' || el.props.fit === 'contain') && (
          <ImageAlignControls el={el} onChange={onChange} />
        )}
      </div>

      {dialogProps && <ConfirmDialog {...dialogProps} />}
    </>
  )
}