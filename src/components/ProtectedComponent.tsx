'use client'

import { ReactNode } from 'react'
import { usePermission } from '@/hooks/usePermission'
import type { Permission } from '@/lib/rbac'

interface ProtectedComponentProps {
  permission: Permission | Permission[]
  fallback?: ReactNode
  children: ReactNode
  requireAll?: boolean
}

/**
 * Component to conditionally render based on permissions
 */
export function ProtectedComponent({
  permission,
  fallback = null,
  children,
  requireAll = false,
}: ProtectedComponentProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermission()

  const permissions = Array.isArray(permission) ? permission : [permission]
  const hasAccess = requireAll
    ? hasAllPermissions(permissions)
    : permissions.length === 1
      ? hasPermission(permissions[0])
      : hasAnyPermission(permissions)

  return <>{hasAccess ? children : fallback}</>
}
