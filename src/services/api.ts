import axios from 'axios'
import { isTokenExpired } from '../stores/authStore'

const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL || ''}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
})

const PUBLIC_AUTH_URLS = ['/auth/login', '/auth/setup-admin', '/auth/session-config', '/auth/check-users']
const NO_REDIRECT_URLS = [...PUBLIC_AUTH_URLS, '/auth/refresh']

const matchesUrl = (url: string | undefined, paths: string[]) =>
  paths.some((path) => url?.includes(path))

const redirectToSessionExpired = (reason: 'idle' | 'expired') => {
  localStorage.removeItem('token')
  if (window.location.pathname !== '/session-expired') {
    window.location.assign(`/session-expired?reason=${reason}`)
  }
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  const isPublicAuth = matchesUrl(config.url, PUBLIC_AUTH_URLS)

  if (token && !isPublicAuth) {
    if (isTokenExpired(token)) {
      localStorage.removeItem('token')
      if (!matchesUrl(config.url, NO_REDIRECT_URLS)) {
        redirectToSessionExpired('expired')
        return Promise.reject(new Error('Token expirado'))
      }
    } else {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 &&
      !matchesUrl(error.config?.url, NO_REDIRECT_URLS)
    ) {
      redirectToSessionExpired('expired')
    }
    return Promise.reject(error)
  }
)

export default api
