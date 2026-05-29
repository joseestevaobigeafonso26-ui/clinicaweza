'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import {
  Home, Users, PawPrint, Calendar, Stethoscope, Syringe,
  DollarSign, BarChart3, Settings, LogOut, Menu, X, Moon, Sun,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useState } from 'react'

const ALL_MENU_ITEMS = [
  { icon: Home,        label: 'Dashboard',     path: '/dashboard',     roles: ['admin'] },
  { icon: Users,       label: 'Clientes',       path: '/clientes',      roles: ['admin', 'rececionista'] },
  { icon: PawPrint,    label: 'Pets',           path: '/pets',          roles: ['admin', 'veterinario', 'rececionista'] },
  { icon: Calendar,    label: 'Agendamentos',   path: '/agendamentos',  roles: ['admin', 'veterinario', 'rececionista'] },
  { icon: Stethoscope, label: 'Consultas',      path: '/consultas',     roles: ['admin', 'veterinario'] },
  { icon: Syringe,     label: 'Vacinas',        path: '/vacinas',       roles: ['admin', 'veterinario'] },
  { icon: DollarSign,  label: 'Pagamentos',     path: '/pagamentos',    roles: ['admin', 'rececionista'] },
  { icon: BarChart3,   label: 'Relatórios',     path: '/relatorios',    roles: ['admin'] },
  { icon: Settings,    label: 'Configurações',  path: '/configuracoes', roles: ['admin'] },
]

const toRoleLabel = (r?: string) => {
  if (r === 'admin')        return 'Administrador'
  if (r === 'veterinario')  return 'Veterinário'
  if (r === 'rececionista') return 'Rececionista'
  return r ?? 'Utilizador'
}

const toRoleShort = (r?: string) => {
  if (r === 'admin')        return 'Admin'
  if (r === 'veterinario')  return 'Vet'
  if (r === 'rececionista') return 'Recep'
  return r ?? ''
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { userRole, signOut } = useAuth()
  const { dark, toggleTheme } = useTheme()
  const router   = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleSignOut = async () => {
    try {
      await signOut()
      toast.success('Sessão encerrada')
      router.push('/login')
    } catch {
      toast.error('Erro ao encerrar sessão')
    }
  }

  const role      = userRole?.role ?? ''
  const menuItems = role
    ? ALL_MENU_ITEMS.filter(i => i.roles.includes(role))
    : ALL_MENU_ITEMS

  const displayName  = userRole?.nome ?? 'Utilizador'
  const displayRole  = toRoleLabel(userRole?.role)
  const displayShort = toRoleShort(userRole?.role)

  const isActive = (path: string) =>
    pathname === path || (path === '/dashboard' && (pathname === '/' || pathname === '/dashboard'))

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#0d1117] text-slate-900 dark:text-slate-100 transition-colors duration-200">

      {/* ── HEADER ── */}
      <header className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-4
                         bg-white dark:bg-[#161b22]
                         border-b border-slate-200 dark:border-slate-700/60
                         shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(v => !v)}
            className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <PawPrint size={17} className="text-white" />
            </div>
            <span className="font-bold text-base tracking-tight text-slate-900 dark:text-white">
              Clínica WEZA
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={toggleTheme}
            title={dark ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
            className="p-2 rounded-xl text-slate-500 dark:text-slate-400
                       hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors"
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <div className="hidden sm:flex flex-col items-end px-2">
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-tight">
              {displayName}
            </span>
            <span className="text-xs text-slate-400 leading-tight">
              {displayShort || displayRole}
            </span>
          </div>

          <button
            onClick={handleSignOut}
            title="Sair"
            className="p-2 rounded-xl text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* ── SIDEBAR ── */}
      <aside className={`
        fixed left-0 top-16 z-40
        h-[calc(100vh-4rem)] w-60
        bg-white dark:bg-[#161b22]
        border-r border-slate-200 dark:border-slate-700/60
        flex flex-col
        transform transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        <div className="p-3 pt-4">
          <div className="rounded-2xl bg-slate-50 dark:bg-[#0d1117]
                          border border-slate-200/70 dark:border-slate-700/60 p-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-500 flex-shrink-0
                              flex items-center justify-center
                              shadow-md shadow-emerald-500/20">
                <PawPrint size={20} className="text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900 dark:text-white truncate leading-tight">
                  {displayName}
                </p>
                <p className="text-xs text-slate-400 truncate leading-tight mt-0.5">
                  {displayRole}
                </p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs font-semibold px-3 py-1 rounded-full
                               bg-emerald-100 dark:bg-emerald-900/30
                               text-emerald-700 dark:text-emerald-300">
                Acesso
              </span>
              <Link
                href="/configuracoes"
                onClick={() => setSidebarOpen(false)}
                className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                Perfil
              </Link>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-2 space-y-0.5">
          {menuItems.map(item => {
            const Icon   = item.icon
            const active = isActive(item.path)
            return (
              <Link
                key={item.path}
                href={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-xl
                  text-sm font-medium transition-all duration-150
                  ${active
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/40 hover:text-slate-900 dark:hover:text-slate-200'
                  }
                `}
              >
                <Icon size={18} className={active ? 'text-emerald-600 dark:text-emerald-400' : ''} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="p-3 border-t border-slate-100 dark:border-slate-700/60">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                       text-sm font-medium text-red-500
                       hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <LogOut size={18} />
            Sair
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── MAIN ── */}
      <main className="lg:ml-60 pt-16 min-h-screen">
        <div className="p-6 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
