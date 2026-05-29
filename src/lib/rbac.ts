import type { UserRole } from '@/types'

export type Permission =
  // Admin
  | 'manage_all'
  | 'manage_usuarios'
  | 'manage_system'
  // Veterinário
  | 'manage_pets'
  | 'manage_agendamentos'
  | 'manage_consultas'
  | 'manage_vacinas'
  // Rececionista
  | 'manage_clientes'
  | 'manage_pagamentos'
  // Partilhadas
  | 'view_agendamentos'
  | 'view_clientes'
  | 'view_pets'
  | 'view_dashboard'
  | 'view_relatorios'

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    'manage_all',
    'manage_usuarios',
    'manage_system',
    'manage_pets',
    'manage_agendamentos',
    'manage_consultas',
    'manage_vacinas',
    'manage_clientes',
    'manage_pagamentos',
    'view_agendamentos',
    'view_clientes',
    'view_pets',
    'view_dashboard',
    'view_relatorios',
  ],
  veterinario: [
    'manage_pets',
    'manage_agendamentos',
    'manage_consultas',
    'manage_vacinas',
    'view_clientes',
    'view_pets',
    'view_agendamentos',
  ],
  rececionista: [
    'manage_clientes',
    'manage_pets',
    'manage_pagamentos',
    'manage_agendamentos',
    'view_clientes',
    'view_pets',
    'view_agendamentos',
  ],
}

export const ROLE_ROUTES: Record<UserRole, string[]> = {
  admin: [
    '/dashboard',
    '/clientes',
    '/pets',
    '/agendamentos',
    '/consultas',
    '/vacinas',
    '/pagamentos',
    '/relatorios',
    '/configuracoes',
    '/api/usuarios',
  ],
  veterinario: [
    '/pets',
    '/agendamentos',
    '/consultas',
    '/vacinas',
  ],
  rececionista: [
    '/clientes',
    '/pets',
    '/agendamentos',
    '/pagamentos',
  ],
}

export function hasPermission(role: UserRole | null, permission: Permission): boolean {
  if (!role) return false
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false
}

export function hasAnyPermission(role: UserRole | null, permissions: Permission[]): boolean {
  if (!role) return false
  return permissions.some(p => hasPermission(role, p))
}

export function hasAllPermissions(role: UserRole | null, permissions: Permission[]): boolean {
  if (!role) return false
  return permissions.every(p => hasPermission(role, p))
}

export function canAccessRoute(role: UserRole | null, pathname: string): boolean {
  if (!role) return false
  const allowedRoutes = ROLE_ROUTES[role] ?? []
  if (allowedRoutes.includes(pathname)) return true
  return allowedRoutes.some(route => pathname.startsWith(route + '/'))
}

export function getDefaultRoute(role: UserRole | null): string {
  if (!role) return '/login'
  const routes = ROLE_ROUTES[role] ?? []
  return routes[0] ?? '/login'
}

export function getAccessibleRoutes(role: UserRole | null): string[] {
  if (!role) return []
  return ROLE_ROUTES[role] ?? []
}
