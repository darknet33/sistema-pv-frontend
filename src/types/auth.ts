import type { Usuario } from './configuracion'

export type { Usuario }

export interface LoginRequest {
  username: string
  password: string
}

export interface SetupAdminRequest {
  username: string
  password: string
  nombres: string
  apellidos: string
}

export interface ModuloAsignado {
  id: number
  nombre: string
}

export interface LoginResponse {
  access_token: string
  token_type: string
  usuario: Usuario
  modulos: ModuloAsignado[]
}

export interface CheckUsersResponse {
  has_users: boolean
  needs_setup: boolean
}

export interface SessionConfig {
  idle_timeout_minutes: number
  token_expire_minutes: number
}

export interface RefreshResponse {
  access_token: string
  token_type: string
  expires_in_minutes: number
  idle_timeout_minutes: number
}
