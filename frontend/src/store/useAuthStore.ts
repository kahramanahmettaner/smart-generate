import { create } from 'zustand'
import { authApi, type ApiUser } from '../lib/api'

type AuthState = {
  user:    ApiUser | null
  loading: boolean  // true while checking session on app load

  // Actions
  fetchMe:  () => Promise<void>
  logout:   () => Promise<void>
  login:    () => void        // redirects to Google OAuth
}

export const useAuthStore = create<AuthState>((set) => ({
  user:    null,
  loading: true,

  fetchMe: async () => {
    try {
      const user = await authApi.me()
      set({ user, loading: false })
    } catch {
      // 401 means not logged in — not an error
      set({ user: null, loading: false })
    }
  },

  logout: async () => {
    try {
      await authApi.logout()
    } finally {
      set({ user: null })
      window.location.href = '/login'
    }
  },

  login: () => {
    window.location.href = authApi.loginUrl()
  },
}))