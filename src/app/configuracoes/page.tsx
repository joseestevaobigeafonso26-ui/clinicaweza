'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import AppLayout from '@/components/AppLayout'
import { useAuth } from '@/contexts/AuthContext'
import { useForm } from 'react-hook-form'
import { Plus, Trash2, X, Shield, AlertCircle, ToggleLeft, ToggleRight } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Usuario } from '@/types'
import { useRouter } from 'next/navigation'

const roleBadge: Record<string, string> = {
  admin:        'badge bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  veterinario:  'badge bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  rececionista: 'badge bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
}

const roleLabel: Record<string, string> = {
  admin:        'Administrador',
  veterinario:  'Veterinário',
  rececionista: 'Rececionista',
}

export default function ConfiguracoesPage() {
  const router = useRouter()
  const { user, userRole, loading } = useAuth()
  const [usuarios, setUsuarios]     = useState<Usuario[]>([])
  const [showModal, setShowModal]   = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const supabase = createClient()
  const { register, handleSubmit, reset } = useForm()

  const load = async () => {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) toast.error('Erro ao carregar utilizadores')
    setUsuarios(data ?? [])
  }

  useEffect(() => {
    if (!loading && userRole?.role !== 'admin') {
      router.replace('/dashboard')
    } else if (!loading && userRole?.role === 'admin') {
      load()
    }
  }, [loading, userRole, router])

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500" />
        </div>
      </AppLayout>
    )
  }

  if (userRole?.role !== 'admin') {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <div className="card max-w-md p-8 text-center">
            <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Acesso Negado</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Apenas administradores podem aceder às configurações.
            </p>
            <button onClick={() => router.replace('/dashboard')} className="btn-primary">
              Voltar
            </button>
          </div>
        </div>
      </AppLayout>
    )
  }

  const onSubmit = async (data: any) => {
    setSubmitting(true)
    try {
      const res = await fetch('/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome:     data.nome,
          email:    data.email,
          password: data.password,
          role:     data.role,
          adminId:  user?.id,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Erro ao criar utilizador')
      toast.success(`${roleLabel[data.role]} criado com sucesso!`)
      setShowModal(false)
      reset()
      load()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleAtivo = async (u: Usuario) => {
    if (u.id === user?.id) {
      toast.error('Não pode desativar a sua própria conta')
      return
    }
    try {
      const res = await fetch('/api/usuarios', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: u.id, ativo: !u.ativo, adminId: user?.id }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      toast.success(u.ativo ? 'Utilizador desativado' : 'Utilizador ativado')
      load()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const handleDelete = async (id: string, nome: string) => {
    if (id === user?.id) {
      toast.error('Não pode apagar a sua própria conta')
      return
    }
    if (!confirm(`Apagar "${nome}"? Esta ação não pode ser desfeita.`)) return
    try {
      const res = await fetch('/api/usuarios', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, adminId: user?.id }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      toast.success('Utilizador apagado!')
      load()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Configurações</h1>
            <p className="text-slate-500 text-sm mt-1">Gerir utilizadores e permissões</p>
          </div>
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <Plus size={16} /> Novo Utilizador
          </button>
        </div>

        <div className="card p-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
            <Shield size={16} className="text-slate-400" />
            <span className="font-semibold text-sm text-slate-700 dark:text-slate-300">
              Utilizadores do Sistema
            </span>
            <span className="ml-auto text-xs text-slate-400">{usuarios.length} utilizador(es)</span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {usuarios.map(u => (
              <div key={u.id} className={`flex items-center justify-between px-6 py-4 transition-colors ${!u.ativo ? 'opacity-50' : 'hover:bg-slate-50 dark:hover:bg-slate-700/30'}`}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center text-emerald-700 dark:text-emerald-400 font-bold text-sm">
                    {u.nome.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                      {u.nome}
                      {u.id === user?.id && <span className="ml-2 text-xs text-slate-400">(você)</span>}
                    </p>
                    <p className="text-xs text-slate-400">{u.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={roleBadge[u.role] ?? 'badge'}>
                    {roleLabel[u.role] ?? u.role}
                  </span>
                  {!u.ativo && <span className="badge bg-slate-100 text-slate-500 text-xs">Inativo</span>}
                  {u.id !== user?.id && (
                    <>
                      <button
                        onClick={() => handleToggleAtivo(u)}
                        className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
                        title={u.ativo ? 'Desativar' : 'Ativar'}
                      >
                        {u.ativo ? <ToggleRight size={18} className="text-emerald-500" /> : <ToggleLeft size={18} />}
                      </button>
                      <button
                        onClick={() => handleDelete(u.id, u.nome)}
                        className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Apagar utilizador"
                      >
                        <Trash2 size={15} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
            {usuarios.length === 0 && (
              <div className="px-6 py-12 text-center text-slate-400 text-sm">
                Nenhum utilizador registado
              </div>
            )}
          </div>
        </div>

        {showModal && (
          <div className="modal-overlay">
            <div className="modal-content max-w-md">
              <div className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Novo Utilizador</h2>
                  <button onClick={() => { setShowModal(false); reset() }} className="text-slate-400 hover:text-slate-600">
                    <X size={20} />
                  </button>
                </div>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Nome completo *</label>
                    <input {...register('nome', { required: true })} className="input-field" placeholder="Nome Completo" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Email *</label>
                    <input {...register('email', { required: true })} type="email" className="input-field" placeholder="email@clinica.ao" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Senha *</label>
                    <input {...register('password', { required: true, minLength: 6 })} type="password" className="input-field" placeholder="Mínimo 6 caracteres" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Perfil *</label>
                    <select {...register('role', { required: true })} className="input-field" defaultValue="">
                      <option value="" disabled>Selecione o perfil</option>
                      <option value="admin">Administrador</option>
                      <option value="veterinario">Veterinário</option>
                      <option value="rececionista">Rececionista</option>
                    </select>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button type="submit" disabled={submitting} className="btn-primary flex-1 justify-center">
                      {submitting ? 'A criar...' : 'Criar Utilizador'}
                    </button>
                    <button type="button" onClick={() => { setShowModal(false); reset() }} className="btn-secondary flex-1 justify-center">
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
