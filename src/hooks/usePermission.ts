'use client'

import { useAuth } from '@/contexts/AuthContext'
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  canAccessRoute,
  getAccessibleRoutes,
  type Permission,
} from '@/lib/rbac'

/**
 * Hook to check permissions and access control
 */
export function usePermission() {
  const { userRole } = useAuth()
  const role = userRole?.role ?? null

  return {
    hasPermission: (permission: Permission) => hasPermission(role, permission),
    hasAnyPermission: (permissions: Permission[]) => hasAnyPermission(role, permissions),
    hasAllPermissions: (permissions: Permission[]) => hasAllPermissions(role, permissions),
    canAccessRoute: (pathname: string) => canAccessRoute(role, pathname),
    getAccessibleRoutes: () => getAccessibleRoutes(role),
    role,
  }
}
