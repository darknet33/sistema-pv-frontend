import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSessionConfig } from '../services/authService'
import { getTokenRemainingMs, useAuthStore } from '../stores/authStore'

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click']
const DEFAULT_IDLE_TIMEOUT_MINUTES = 30
const CHECK_INTERVAL_MS = 5000
const REFRESH_BEFORE_EXPIRY_MS = 5 * 60 * 1000

export function useIdleSession(enabled: boolean) {
  const navigate = useNavigate()
  const lastActivityRef = useRef(Date.now())

  useEffect(() => {
    if (!enabled) return

    let cancelled = false
    let idleTimeoutMs = DEFAULT_IDLE_TIMEOUT_MINUTES * 60 * 1000
    let refreshBeforeExpiryMs = REFRESH_BEFORE_EXPIRY_MS
    let refreshing = false
    lastActivityRef.current = Date.now()

    const expireSession = (reason: 'idle' | 'expired') => {
      if (cancelled) return
      useAuthStore.getState().logout()
      if (window.location.pathname !== '/session-expired') {
        navigate(`/session-expired?reason=${reason}`, { replace: true })
      }
    }

    const resetActivity = () => {
      lastActivityRef.current = Date.now()
    }

    const refreshIfNeeded = async () => {
      if (refreshing) return

      const state = useAuthStore.getState()
      if (!state.isAuthenticated || !state.token) return
      if (getTokenRemainingMs(state.token) > refreshBeforeExpiryMs) return

      refreshing = true
      try {
        await state.refreshToken()
      } catch (error) {
        const status = (error as { response?: { status?: number } }).response?.status
        const currentToken = useAuthStore.getState().token
        if (status === 401 || !currentToken || getTokenRemainingMs(currentToken) <= 0) {
          expireSession('expired')
        }
      } finally {
        refreshing = false
      }
    }

    const checkSession = () => {
      if (cancelled) return

      const state = useAuthStore.getState()
      if (!state.isAuthenticated || !state.token) return

      if (Date.now() - lastActivityRef.current >= idleTimeoutMs) {
        expireSession('idle')
        return
      }

      void refreshIfNeeded()
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkSession()
      }
    }

    getSessionConfig()
      .then((config) => {
        if (cancelled) return

        const idleMinutes = Number(config.idle_timeout_minutes)
        if (idleMinutes > 0) {
          idleTimeoutMs = idleMinutes * 60 * 1000
        }

        const tokenMinutes = Number(config.token_expire_minutes)
        if (tokenMinutes > 0) {
          refreshBeforeExpiryMs = Math.min(
            REFRESH_BEFORE_EXPIRY_MS,
            (tokenMinutes * 60 * 1000) / 2
          )
        }
      })
      .catch(() => undefined)

    ACTIVITY_EVENTS.forEach((event) =>
      window.addEventListener(event, resetActivity, { passive: true })
    )
    document.addEventListener('visibilitychange', onVisibilityChange)

    const interval = window.setInterval(checkSession, CHECK_INTERVAL_MS)
    checkSession()

    return () => {
      cancelled = true
      window.clearInterval(interval)
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, resetActivity))
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [enabled, navigate])
}
