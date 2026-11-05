import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { LoginRequest, LoginResponse, RefreshResponse, SetupAdminRequest, ModuloAsignado, Usuario } from '../types/auth'
import { login, refreshSession, setupAdmin } from '../services/authService'

function parseJwt(token: string): { exp?: number } | null {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(jsonPayload)
  } catch {
    return null
  }
}

export function isTokenExpired(token: string): boolean {
  return getTokenRemainingMs(token) <= 0
}

export function getTokenRemainingMs(token: string): number {
  const payload = parseJwt(token)
  if (!payload || !payload.exp) return 0
  return payload.exp * 1000 - Date.now()
}

interface AuthState {
  token: string | null
  usuario: Usuario | null
  modulos: ModuloAsignado[]
  isAuthenticated: boolean
  rehydrated: boolean
  login: (data: LoginRequest) => Promise<void>
  setupAdmin: (data: SetupAdminRequest) => Promise<void>
  refreshToken: () => Promise<RefreshResponse>
  logout: () => void
  checkAndLogoutIfExpired: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      usuario: null,
      modulos: [],
      isAuthenticated: false,
      rehydrated: false,
      login: async (data: LoginRequest) => {
        const response: LoginResponse = await login(data)
        localStorage.setItem('token', response.access_token)
        set({
          token: response.access_token,
          usuario: response.usuario,
          modulos: response.modulos,
          isAuthenticated: true,
        })
      },
      setupAdmin: async (data: SetupAdminRequest) => {
        const response: LoginResponse = await setupAdmin(data)
        localStorage.setItem('token', response.access_token)
        set({
          token: response.access_token,
          usuario: response.usuario,
          modulos: response.modulos,
          isAuthenticated: true,
        })
      },
      refreshToken: async () => {
        const previousToken = get().token
        const response = await refreshSession()
        if (!get().isAuthenticated || get().token !== previousToken) {
          return response
        }
        localStorage.setItem('token', response.access_token)
        set({ token: response.access_token, isAuthenticated: true })
        return response
      },
      logout: () => {
        localStorage.removeItem('token')
        set({ token: null, usuario: null, modulos: [], isAuthenticated: false })
      },
      checkAndLogoutIfExpired: () => {
        const { token, logout } = get()
        if (token && isTokenExpired(token)) {
          logout()
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        usuario: state.usuario,
        modulos: state.modulos,
      }),
      merge: (persistedState, currentState) => {
        const ps = (persistedState ?? {}) as Partial<{
          token: string | null
          isAuthenticated: boolean
          usuario: Usuario | null
          modulos: ModuloAsignado[]
        }>
        let token: string | null = ps.token ?? null
        let isAuthenticated = ps.isAuthenticated ?? false
        let usuario: Usuario | null = ps.usuario ?? null
        let modulos: ModuloAsignado[] = ps.modulos ?? []
        if (token && isTokenExpired(token)) {
          localStorage.removeItem('token')
          token = null
          isAuthenticated = false
          usuario = null
          modulos = []
        }
        return { ...currentState, token, isAuthenticated, usuario, modulos, rehydrated: true }
      },
    }
  )
)
