import api from './api'
import type { CheckUsersResponse, LoginRequest, LoginResponse, RefreshResponse, SessionConfig, SetupAdminRequest } from '../types/auth'

export const login = async (data: LoginRequest): Promise<LoginResponse> => {
  const response = await api.post<LoginResponse>('/auth/login', data)
  return response.data
}

export const checkUsers = async (): Promise<CheckUsersResponse> => {
  const response = await api.get<CheckUsersResponse>('/auth/check-users')
  return response.data
}

export const setupAdmin = async (data: SetupAdminRequest): Promise<LoginResponse> => {
  const response = await api.post<LoginResponse>('/auth/setup-admin', data)
  return response.data
}

export const getSessionConfig = async (): Promise<SessionConfig> => {
  const response = await api.get<SessionConfig>('/auth/session-config')
  return response.data
}

export const refreshSession = async (): Promise<RefreshResponse> => {
  const response = await api.post<RefreshResponse>('/auth/refresh')
  return response.data
}
