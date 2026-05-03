import { useState, useEffect } from 'react'
import styles from './TemplateConfigModal.module.scss'


export type TemplateConfig = {
  name:       string
  width:      number
  height:     number
}

type PresetResolution = {
  label:  string
  width:  number
  height: number
}

const PRESETS: PresetResolution[] = [
  { label: 'Instagram post',    width: 1080, height: 1080 },
  { label: 'Instagram story',   width: 1080, height: 1920 },
  { label: 'Facebook post',     width: 1200, height: 630  },
  { label: 'Twitter / X post',  width: 1600, height: 900  },
  { label: 'LinkedIn post',     width: 1200, height: 627  },
  { label: 'YouTube thumbnail', width: 1280, height: 720  },
  { label: 'A4 portrait',       width: 2480, height: 3508 },
  { label: 'Custom',            width: 0,    height: 0    },
]

type Props = {
  mode:           'create' | 'import'
  initialConfig?: Partial<TemplateConfig>
  onConfirm:      (config: TemplateConfig) => void
  onCancel:       () => void
}

export function TemplateConfigModal({
  mode,
  initialConfig,
  onConfirm,
  onCancel,
}: Props) {
  const [name,     setName]     = useState(initialConfig?.name   ?? 'Untitled template')
  const [width,    setWidth]    = useState(initialConfig?.width  ?? 1080)
  const [height,   setHeight]   = useState(initialConfig?.height ?? 1080)
  const [preset,   setPreset]   = useState<string>('Instagram post')
  const [errors,   setErrors]   = useState<Partial<Record<keyof TemplateConfig, string>>>({})

  // Sync preset selector when initialConfig comes in (import flow)
  useEffect(() => {
    if (!initialConfig) return
    const match = PRESETS.find(
      (p) => p.width === initialConfig.width && p.height === initialConfig.height
    )
    setPreset(match?.label ?? 'Custom')
  }, [initialConfig])

  const handlePresetChange = (label: string) => {
    setPreset(label)
    const found = PRESETS.find((p) => p.label === label)
    if (found && found.width !== 0) {
      setWidth(found.width)
      setHeight(found.height)
    }
  }

  const validate = (): boolean => {
    const errs: typeof errors = {}
    if (!name.trim())    errs.name   = 'Name is required'
    if (width  < 1)      errs.width  = 'Must be at least 1px'
    if (height < 1)      errs.height = 'Must be at least 1px'
    if (width  > 8000)   errs.width  = 'Max 8000px'
    if (height > 8000)   errs.height = 'Max 8000px'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    onConfirm({ name: name.trim(), width, height })
  }

  const isCustom = preset === 'Custom'

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="config-title"
      >
        <div className={styles.header}>
          <p className={styles.title} id="config-title">
            {mode === 'create' ? 'New template' : 'Import template'}
          </p>
          <button className={styles.closeBtn} onClick={onCancel}>✕</button>
        </div>

        <div className={styles.body}>

          {/* Name */}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="tpl-name">
              Template name
            </label>
            <input
              id="tpl-name"
              type="text"
              className={`${styles.input} ${errors.name ? styles.inputError : ''}`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit() }}
              autoFocus
            />
            {errors.name && <p className={styles.errorMsg}>{errors.name}</p>}
          </div>

          {/* Preset picker */}
          <div className={styles.field}>
            <label className={styles.label}>Resolution preset</label>
            <div className={styles.presetGrid}>
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  className={`${styles.presetBtn} ${preset === p.label ? styles.presetActive : ''}`}
                  onClick={() => handlePresetChange(p.label)}
                >
                  <span className={styles.presetLabel}>{p.label}</span>
                  {p.width > 0 && (
                    <span className={styles.presetDims}>
                      {p.width}×{p.height}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Custom dimensions */}
          {isCustom && (
            <div className={styles.dimsRow}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="tpl-width">Width (px)</label>
                <input
                  id="tpl-width"
                  type="number"
                  className={`${styles.input} ${errors.width ? styles.inputError : ''}`}
                  value={width}
                  min={1}
                  max={8000}
                  onChange={(e) => setWidth(parseInt(e.target.value) || 0)}
                />
                {errors.width && <p className={styles.errorMsg}>{errors.width}</p>}
              </div>
              <div className={styles.dimsSeparator}>×</div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="tpl-height">Height (px)</label>
                <input
                  id="tpl-height"
                  type="number"
                  className={`${styles.input} ${errors.height ? styles.inputError : ''}`}
                  value={height}
                  min={1}
                  max={8000}
                  onChange={(e) => setHeight(parseInt(e.target.value) || 0)}
                />
                {errors.height && <p className={styles.errorMsg}>{errors.height}</p>}
              </div>
            </div>
          )}

          {/* Resolution preview */}
          {!isCustom && (
            <div className={styles.resPreview}>
              <div
                className={styles.resPreviewBox}
                style={{
                  aspectRatio: `${width} / ${height}`,
                  maxWidth:  width > height ? 80 : Math.round(80 * width / height),
                  maxHeight: height > width ? 80 : Math.round(80 * height / width),
                }}
              />
              <span className={styles.resPreviewLabel}>
                {width} × {height}px
              </span>
            </div>
          )}

        </div>

        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onCancel}>
            Cancel
          </button>
          <button className={styles.confirmBtn} onClick={handleSubmit}>
            {mode === 'create' ? 'Create template' : 'Open template'}
          </button>
        </div>
      </div>
    </div>
  )
}