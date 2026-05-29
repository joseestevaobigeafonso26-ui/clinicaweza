'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import type { Usuario } from '@/types'

interface AuthContextType {
  user: User | null
  userRole: Pick<Usuario, 'nome' | 'email' | 'role'> | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType)

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user,     setUser]     = useState<User | null>(null)
  const [userRole, setUserRole] = useState<Pick<Usuario, 'nome' | 'email' | 'role'> | null>(null)
  const [loading,  setLoading]  = useState(true)
  const supabase = createClient()

  const fetchUserRole = async (u: User) => {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('role, nome, email')
        .eq('id', u.id)
        .maybeSingle()

      if (error || !data) {
        console.error('Utilizador não encontrado na tabela usuarios:', error)
        await supabase.auth.signOut()
        setUserRole(null)
        return
      }

      setUserRole({
        nome:  data.nome  ?? u.email ?? 'Utilizador',
        email: data.email ?? u.email ?? '',
        role:  data.role  as Usuario['role'],
      })
    } catch (e) {
      console.error('fetchUserRole error:', e)
      await supabase.auth.signOut()
      setUserRole(null)
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchUserRole(session.user).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        await fetchUserRole(session.user)
      } else {
        setUserRole(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUserRole(null)
  }

  return (
    <AuthContext.Provider value={{ user, userRole, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
