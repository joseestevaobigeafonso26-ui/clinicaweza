'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import AppLayout from '@/components/AppLayout'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Search, Edit2, Trash2, X, Phone, Mail, MapPin, PawPrint } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Cliente } from '@/types'

const schema = z.object({
  nome:     z.string().min(3, 'Mínimo 3 caracteres'),
  email:    z.string().email('Email inválido').optional().or(z.literal('')),
  telefone: z.string().min(9, 'Telefone inválido'),
  endereco: z.string().optional(),
  nif:      z.string().optional(),
})
type FormData = z.infer<typeof schema>

export default function ClientesPage() {
  const [clientes, setClientes] = useState<(Cliente & { _petsCount: number })[]>([])
  const [search,   setSearch]   = useState('')
  const [loading,  setLoading]  = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing,   setEditing]  = useState<Cliente | null>(null)
  const supabase = createClient()

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  useEffect(() => { load() }, [])

  const load = async () => {
    const { data, error } = await supabase
      .from('clientes')
      .select('*, pets(id)')
      .order('nome')

    if (error) {
      toast.error('Erro ao carregar clientes')
    } else {
      const mapped = (data ?? []).map((c: any) => ({
        ...c,
        _petsCount: c.pets?.length ?? 0,
      }))
      setClientes(mapped)
    }
    setLoading(false)
  }

  const onSubmit = async (data: FormData) => {
    try {
      const payload = { ...data, email: data.email || null }
      if (editing) {
        const { error } = await supabase.from('clientes').update(payload).eq('id', editing.id)
        if (error) throw error
        toast.success('Cliente atualizado!')
      } else {
        const { error } = await supabase.from('clientes').insert([payload])
        if (error) throw error
        toast.success('Cliente cadastrado!')
      }
      closeModal()
      load()
    } catch {
      toast.error('Erro ao salvar cliente')
    }
  }

  const handleEdit = (c: Cliente) => {
    setEditing(c)
    reset({ nome: c.nome, email: c.email ?? '', telefone: c.telefone, endereco: c.endereco ?? '', nif: c.nif ?? '' })
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este cliente? Todos os pets e dados associados serão apagados.')) return
    const { error } = await supabase.from('clientes').delete().eq('id', id)
    if (error) toast.error('Erro ao excluir: ' + error.message)
    else { toast.success('Cliente excluído!'); load() }
  }

  const closeModal = () => { setShowModal(false); reset(); setEditing(null) }

  const filtered = search
    ? clientes.filter(c =>
        c.nome.toLowerCase().includes(search.toLowerCase()) ||
        c.email?.toLowerCase().includes(search.toLowerCase()) ||
        c.telefone.includes(search)
      )
    : clientes

  if (loading) return (
    <AppLayout>
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-emerald-500 border-t-transparent" />
      </div>
    </AppLayout>
  )

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Clientes</h1>
            <p className="text-slate-500 text-sm mt-1">{clientes.length} cliente(s) cadastrado(s)</p>
          </div>
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <Plus size={16} /> Novo Cliente
          </button>
        </div>

        <div className="card py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Pesquisar por nome, email ou telefone..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input-field pl-10"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(c => (
            <div key={c.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">{c.nome}</h3>
                  <div className="flex items-center gap-1 mt-1">
                    <PawPrint size={12} className="text-emerald-500" />
                    <span className="badge badge-info">{c._petsCount} pet(s)</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleEdit(c)} className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg">
                    <Edit2 size={15} />
                  </button>
                  <button onClick={() => handleDelete(c.id)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Phone size={13} />{c.telefone}
                </div>
                {c.email && (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Mail size={13} />{c.email}
                  </div>
                )}
                {c.endereco && (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <MapPin size={13} />{c.endereco}
                  </div>
                )}
                {c.nif && <p className="text-xs text-slate-400">NIF: {c.nif}</p>}
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="card text-center py-16">
            <p className="text-slate-400">{search ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}</p>
          </div>
        )}

        {showModal && (
          <div className="modal-overlay">
            <div className="modal-content max-w-md">
              <div className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    {editing ? 'Editar Cliente' : 'Novo Cliente'}
                  </h2>
                  <button onClick={closeModal} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Nome Completo *</label>
                    <input {...register('nome')} className="input-field" placeholder="João Silva" />
                    {errors.nome && <p className="text-red-500 text-xs mt-1">{errors.nome.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Telefone *</label>
                    <input {...register('telefone')} className="input-field" placeholder="+244 923 456 789" />
                    {errors.telefone && <p className="text-red-500 text-xs mt-1">{errors.telefone.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Email</label>
                    <input {...register('email')} type="email" className="input-field" placeholder="joao@exemplo.com (opcional)" />
                    {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">NIF</label>
                    <input {...register('nif')} className="input-field" placeholder="123456789" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Endereço</label>
                    <textarea {...register('endereco')} className="input-field" rows={2} placeholder="Rua, Município, Luanda" />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button type="submit" className="btn-primary flex-1 justify-center">
                      {editing ? 'Atualizar' : 'Cadastrar'}
                    </button>
                    <button type="button" onClick={closeModal} className="btn-secondary flex-1 justify-center">
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
