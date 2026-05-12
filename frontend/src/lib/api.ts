/**
 * api.ts — typed fetch wrapper for all backend calls
 *
 * All requests go to VITE_API_URL (defaults to http://localhost:3000).
 * Credentials (JWT cookie) are always included.
 * On 401 → redirect to /login automatically.
 */

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

// ── Core fetch wrapper ────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    credentials: 'include', // always send JWT cookie
    headers: body instanceof FormData
      ? undefined                          // let browser set multipart boundary
      : { 'Content-Type': 'application/json' },
    body: body instanceof FormData
      ? body
      : body !== undefined
        ? JSON.stringify(body)
        : undefined,
  })

  if (res.status === 401) {
    // Session expired or not logged in — redirect to login
    window.location.href = '/login'
    throw new ApiError(401, 'Unauthorized')
  }

  if (res.status === 204) {
    return undefined as unknown as T
  }

  const data = await res.json()

  if (!res.ok) {
    throw new ApiError(res.status, data?.error ?? 'Unknown error')
  }

  return data as T
}

const get  = <T>(path: string)                  => request<T>('GET',    path)
const post = <T>(path: string, body?: unknown)  => request<T>('POST',   path, body)
const put  = <T>(path: string, body?: unknown)  => request<T>('PUT',    path, body)
const patch = <T>(path: string, body?: unknown) => request<T>('PATCH',  path, body)
const del  = <T>(path: string)                  => request<T>('DELETE', path)

// ── Response types (mirror backend DB types) ──────────────────────────────────

export type ApiUser = {
  id:        string
  email:     string
  name:      string
  avatarUrl: string | null
  createdAt: string
}

export type ApiProject = {
  id:        string
  userId:    string
  name:      string
  createdAt: string
  updatedAt: string
}

export type ApiTemplate = {
  id:         string
  projectId:  string
  name:       string
  canvasData: unknown  // full Template JSON
  createdAt:  string
  updatedAt:  string
}

export type ApiAsset = {
  id:        string
  projectId: string
  name:      string
  url:       string   // served URL e.g. /files/projects/.../assets/image.jpg
  width:     number | null
  height:    number | null
  sizeBytes: number | null
  mimeType:  string | null
  createdAt: string
}

export type ApiDataset = {
  id:        string
  projectId: string
  name:      string
  storageKey: string
  columns:   { key: string; label: string }[]
  rowCount:  number
  createdAt: string
  updatedAt: string
}

export type ApiDatasetWithRows = ApiDataset & {
  rows: Record<string, string>[]
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export const authApi = {
  me:     () => get<ApiUser>('/auth/me'),
  logout: () => post<void>('/auth/logout'),
  // Login is a browser redirect, not a fetch call:
  loginUrl: () => `${BASE_URL}/auth/google`,
}

// ── Projects ──────────────────────────────────────────────────────────────────

export const projectsApi = {
  list:   ()                           => get<ApiProject[]>('/projects'),
  get:    (id: string)                 => get<ApiProject>(`/projects/${id}`),
  create: (name: string)               => post<ApiProject>('/projects', { name }),
  rename: (id: string, name: string)   => patch<ApiProject>(`/projects/${id}`, { name }),
  delete: (id: string)                 => del<void>(`/projects/${id}`),
}

// ── Templates ─────────────────────────────────────────────────────────────────

export const templatesApi = {
  list:   (pid: string)                          => get<ApiTemplate[]>(`/projects/${pid}/templates`),
  get:    (pid: string, id: string)              => get<ApiTemplate>(`/projects/${pid}/templates/${id}`),
  create: (pid: string, name: string, canvasData: unknown) =>
    post<ApiTemplate>(`/projects/${pid}/templates`, { name, canvasData }),
  update: (pid: string, id: string, name: string, canvasData: unknown) =>
    put<ApiTemplate>(`/projects/${pid}/templates/${id}`, { name, canvasData }),
  delete: (pid: string, id: string)              => del<void>(`/projects/${pid}/templates/${id}`),
}

// ── Assets ────────────────────────────────────────────────────────────────────

export const assetsApi = {
  list:   (pid: string) => get<ApiAsset[]>(`/projects/${pid}/assets`),

  upload: (pid: string, file: File, name: string, width?: number, height?: number) => {
    const form = new FormData()
    form.append('file', file)
    form.append('name', name)
    if (width  !== undefined) form.append('width',  String(width))
    if (height !== undefined) form.append('height', String(height))
    return post<ApiAsset>(`/projects/${pid}/assets`, form)
  },

  delete: (pid: string, id: string) => del<void>(`/projects/${pid}/assets/${id}`),

  // Build the full URL for serving a file — prepends BASE_URL for cross-origin
  fileUrl: (url: string) => url.startsWith('http') ? url : `${BASE_URL}${url}`,
}

// ── Datasets ──────────────────────────────────────────────────────────────────

export const datasetsApi = {
  list:   (pid: string)              => get<ApiDataset[]>(`/projects/${pid}/datasets`),
  get:    (pid: string, id: string)  => get<ApiDatasetWithRows>(`/projects/${pid}/datasets/${id}`),

  upload: (pid: string, file: File, name: string) => {
    const form = new FormData()
    form.append('file', file)
    form.append('name', name)
    return post<ApiDataset>(`/projects/${pid}/datasets`, form)
  },

  delete: (pid: string, id: string) => del<void>(`/projects/${pid}/datasets/${id}`),
}