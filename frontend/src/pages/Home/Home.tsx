import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore }    from '../../store/useAuthStore'
import { useProjectStore } from '../../store/useProjectStore'
import { useEditorStore }  from '../../store/useEditorStore'
import { useTheme }        from '../../hooks/useTheme'
import { useConfirm }      from '../../hooks/useConfirm'
import { ConfirmDialog }   from '../../components/ConfirmDialog/ConfirmDialog'
import { TemplateConfigModal } from '../../components/TemplateConfigModal/TemplateConfigModal'
import type { TemplateConfig } from '../../components/TemplateConfigModal/TemplateConfigModal'
import { templatesApi, type ApiTemplate } from '../../lib/api'
import type { Template } from '../../types/template'
import styles from './Home.module.scss'

export function Home() {
  const navigate                         = useNavigate()
  const { user, logout }                 = useAuthStore()
  const { theme, toggle }                = useTheme()
  const { confirm, dialogProps }         = useConfirm()
  const {
    projects, currentProject, loading: projectsLoading,
    fetchProjects, createProject, renameProject,
    deleteProject, selectProject,
  } = useProjectStore()
  const { initTemplate, loadTemplate, setProjectContext } = useEditorStore()

  const [templates,        setTemplates]        = useState<ApiTemplate[]>([])
  const [templatesLoading, setTemplatesLoading] = useState(false)
  const [showNewTemplate,  setShowNewTemplate]  = useState(false)
  const [showImport,       setShowImport]       = useState(false)
  const [importRaw,        setImportRaw]        = useState<Template | null>(null)
  const [newProjectName,   setNewProjectName]   = useState('')
  const [creatingProject,  setCreatingProject]  = useState(false)
  const [renamingProject,  setRenamingProject]  = useState<string | null>(null)
  const [renameValue,      setRenameValue]      = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load projects on mount
  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  // Load templates when project changes
  useEffect(() => {
    if (!currentProject) { setTemplates([]); return }
    setTemplatesLoading(true)
    templatesApi.list(currentProject.id)
      .then(setTemplates)
      .catch(() => setTemplates([]))
      .finally(() => setTemplatesLoading(false))
  }, [currentProject])

  // ── Project actions ───────────────────────────────────────────────────────

  const handleCreateProject = async () => {
    const name = newProjectName.trim()
    if (!name) return
    const project = await createProject(name)
    setNewProjectName('')
    setCreatingProject(false)
    selectProject(project)
  }

  const handleRenameProject = async (id: string) => {
    const name = renameValue.trim()
    if (name) await renameProject(id, name)
    setRenamingProject(null)
  }

  const handleDeleteProject = async (id: string, name: string) => {
    const ok = await confirm({
      title:        `Delete "${name}"?`,
      message:      'This will permanently delete the project and all its templates, assets, and datasets.',
      confirmLabel: 'Delete project',
      variant:      'danger',
    })
    if (!ok) return
    await deleteProject(id)
  }

  // ── Template actions ──────────────────────────────────────────────────────

  const handleCreateTemplate = async (config: TemplateConfig) => {
    if (!currentProject) return
    // Build the initial template JSON
    const tpl: Template = {
      id:       crypto.randomUUID(),
      name:     config.name,
      canvas:   { width: config.width, height: config.height, background: '#ffffff' },
      elements: [],
    }
    const saved = await templatesApi.create(currentProject.id, tpl.name, tpl)
    initTemplate(config)
    setProjectContext(currentProject.id, saved.id)
    setShowNewTemplate(false)
    navigate('/editor')
  }

  const handleOpenTemplate = async (tpl: ApiTemplate) => {
    if (!currentProject) return
    loadTemplate(tpl.canvasData as Template)
    setProjectContext(currentProject.id, tpl.id)
    navigate('/editor')
  }

  const handleDeleteTemplate = async (tpl: ApiTemplate, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!currentProject) return
    const ok = await confirm({
      title:        `Delete "${tpl.name}"?`,
      message:      'This template will be permanently deleted.',
      confirmLabel: 'Delete',
      variant:      'danger',
    })
    if (!ok) return
    await templatesApi.delete(currentProject.id, tpl.id)
    setTemplates((prev) => prev.filter((t) => t.id !== tpl.id))
  }

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const raw = JSON.parse(ev.target?.result as string) as Template
        if (!raw.canvas || !raw.elements) { alert('Invalid template file.'); return }
        setImportRaw(raw)
        setShowImport(true)
      } catch {
        alert('Could not parse template file.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleImportConfirm = async (config: TemplateConfig) => {
    if (!importRaw || !currentProject) return
    const tpl: Template = {
      ...importRaw,
      name:   config.name,
      canvas: { ...importRaw.canvas, width: config.width, height: config.height },
    }
    const saved = await templatesApi.create(currentProject.id, tpl.name, tpl)
    loadTemplate(tpl)
    setProjectContext(currentProject.id, saved.id)
    setShowImport(false)
    setImportRaw(null)
    navigate('/editor')
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, {
      day: '2-digit', month: 'short', year: 'numeric',
    })

  const getCanvasDims = (tpl: ApiTemplate): string => {
    const data = tpl.canvasData as any
    if (data?.canvas?.width && data?.canvas?.height) {
      return `${data.canvas.width} × ${data.canvas.height}px`
    }
    return ''
  }

  const initials = (name: string) => name.charAt(0).toUpperCase()

  return (
    <div className={styles.page}>

      {/* ── Header ── */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.logo}>Smart Generate</span>
        </div>
        <div className={styles.headerRight}>
          {user && (
            <div className={styles.userInfo}>
              <div className={styles.avatar}>
                {user.avatarUrl
                  ? <img src={user.avatarUrl} alt={user.name} referrerPolicy="no-referrer" />
                  : initials(user.name)
                }
              </div>
              <span className={styles.userName}>{user.name}</span>
            </div>
          )}
          <button className={styles.btn} onClick={toggle}>
            {theme === 'light' ? '◐ Dark' : '◑ Light'}
          </button>
          <button className={styles.btn} onClick={logout}>
            Sign out
          </button>
        </div>
      </header>

      <div className={styles.main}>

        {/* ── Sidebar: project list ── */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <span className={styles.sidebarTitle}>Projects</span>
            <button
              className={styles.newProjectBtn}
              onClick={() => setCreatingProject(true)}
              title="New project"
            >
              +
            </button>
          </div>

          <div className={styles.projectList}>

            {/* New project input */}
            {creatingProject && (
              <div style={{ padding: '8px 16px' }}>
                <input
                  className={styles.renameInput}
                  autoFocus
                  placeholder="Project name"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter')  handleCreateProject()
                    if (e.key === 'Escape') { setCreatingProject(false); setNewProjectName('') }
                    e.stopPropagation()
                  }}
                  onBlur={() => {
                    if (!newProjectName.trim()) setCreatingProject(false)
                  }}
                />
              </div>
            )}

            {projectsLoading && (
              <p className={styles.sidebarEmpty}>Loading…</p>
            )}

            {!projectsLoading && projects.length === 0 && !creatingProject && (
              <p className={styles.sidebarEmpty}>
                No projects yet. Click + to create one.
              </p>
            )}

            {projects.map((project) => (
              <div
                key={project.id}
                className={`${styles.projectItem} ${currentProject?.id === project.id ? styles.projectItemActive : ''}`}
                onClick={() => selectProject(project)}
              >
                <span className={styles.projectIcon}>◈</span>

                {renamingProject === project.id ? (
                  <input
                    className={styles.renameInput}
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter')  handleRenameProject(project.id)
                      if (e.key === 'Escape') setRenamingProject(null)
                      e.stopPropagation()
                    }}
                    onBlur={() => handleRenameProject(project.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span className={styles.projectName}>{project.name}</span>
                )}

                <div className={styles.projectActions}>
                  <button
                    className={styles.projectActionBtn}
                    title="Rename"
                    onClick={(e) => {
                      e.stopPropagation()
                      setRenamingProject(project.id)
                      setRenameValue(project.name)
                    }}
                  >
                    ✎
                  </button>
                  <button
                    className={`${styles.projectActionBtn} ${styles.projectActionDanger}`}
                    title="Delete project"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteProject(project.id, project.name)
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* ── Content: template grid ── */}
        <div className={styles.content}>

          {!currentProject ? (
            <div className={styles.contentArea}>
              <div className={styles.emptyState}>
                <span className={styles.emptyIcon}>◈</span>
                <p className={styles.emptyTitle}>Select a project</p>
                <p className={styles.emptyDesc}>
                  Choose a project from the sidebar, or create a new one to get started.
                </p>
                <button
                  className={styles.emptyBtn}
                  onClick={() => setCreatingProject(true)}
                >
                  + New project
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className={styles.contentHeader}>
                <span className={styles.contentTitle}>{currentProject.name}</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className={styles.btn}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    ↑ Import template
                  </button>
                  <button
                    className={`${styles.btn} ${styles.btnPrimary}`}
                    onClick={() => setShowNewTemplate(true)}
                  >
                    + New template
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,application/json"
                    style={{ display: 'none' }}
                    onChange={handleImportFile}
                  />
                </div>
              </div>

              <div className={styles.contentArea}>
                {templatesLoading ? (
                  <div className={styles.loading}>Loading templates…</div>
                ) : (
                  <div className={styles.templateGrid}>

                    {/* New template card */}
                    <div
                      className={styles.newTemplateCard}
                      onClick={() => setShowNewTemplate(true)}
                    >
                      <span className={styles.newTemplateIcon}>+</span>
                      <span className={styles.newTemplateLabel}>New template</span>
                    </div>

                    {/* Existing templates */}
                    {templates.map((tpl) => (
                      <div
                        key={tpl.id}
                        className={styles.templateCard}
                        onClick={() => handleOpenTemplate(tpl)}
                      >
                        <div className={styles.templateCardThumb}>
                          ✏
                          <div className={styles.templateCardActions}>
                            <button
                              className={styles.templateCardActionBtn}
                              title="Delete template"
                              onClick={(e) => handleDeleteTemplate(tpl, e)}
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                        <div className={styles.templateCardMeta}>
                          <span className={styles.templateCardName}>{tpl.name}</span>
                          <span className={styles.templateCardDims}>{getCanvasDims(tpl)}</span>
                          <span className={styles.templateCardDate}>{formatDate(tpl.updatedAt)}</span>
                        </div>
                      </div>
                    ))}

                    {templates.length === 0 && (
                      <div className={styles.emptyState} style={{ gridColumn: '1 / -1' }}>
                        <p className={styles.emptyDesc}>
                          No templates yet. Create one or import a JSON file.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Modals ── */}
      {showNewTemplate && (
        <TemplateConfigModal
          mode="create"
          onConfirm={handleCreateTemplate}
          onCancel={() => setShowNewTemplate(false)}
        />
      )}

      {showImport && importRaw && (
        <TemplateConfigModal
          mode="import"
          initialConfig={{
            name:   importRaw.name,
            width:  importRaw.canvas.width,
            height: importRaw.canvas.height,
          }}
          onConfirm={handleImportConfirm}
          onCancel={() => { setShowImport(false); setImportRaw(null) }}
        />
      )}

      {dialogProps && <ConfirmDialog {...dialogProps} />}
    </div>
  )
}
