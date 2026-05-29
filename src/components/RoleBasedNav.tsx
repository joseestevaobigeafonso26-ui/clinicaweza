'use client'

import { ReactNode } from 'react'
import { usePermission } from '@/hooks/usePermission'

interface NavItem {
  href: string
  label: string
  icon?: ReactNode
  requiredPermission?: string
}

interface RoleBasedNavProps {
  items: NavItem[]
  renderItem: (item: NavItem) => ReactNode
}

/**
 * Component to filter and render navigation items based on role
 */
export function RoleBasedNav({ items, renderItem }: RoleBasedNavProps) {
  const { hasPermission } = usePermission()

  const visibleItems = items.filter((item) => {
    if (!item.requiredPermission) return true
    return hasPermission(item.requiredPermission as any)
  })

  return <>{visibleItems.map(renderItem)}</>
}
