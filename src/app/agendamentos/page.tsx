'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import AppLayout from '@/components/AppLayout'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Edit2, Trash2, X, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Agendamento, Pet, Usuario } from '@/types'

const schema = z.object({
  pet_id:         z.string().min(1, 'Selecione um pet'),
  data:           z.string().min(1, 'Data obrigatória'),
  hora:           z.string().min(1, 'Hora obrigatória'),
  tipo_servico:   z.string().min(1, 'Tipo de serviço obrigatório'),
  veterinario_id: z.string().optional(),
  status: z.enum(['agendado', 'confirmado', 'concluido', 'cancelado']),
  observacoes:    z.string().optional(),
})
type FormData = z.infer<typeof schema>

const statusBadge: Record<string, string> = {
  agendado:  'badge badge-info',
  confirmado: 'badge badge-success',
  cancelado:  'badge badge-danger',
  concluido:  'badge badge-purple',
}

const statusLabel: Record<string, string> = {
  agendado:  'Agendado',
  confirmado: 'Confirmado',
  concluido:  'Concluído',
  cancelado:  'Cancelado',
}

export default function AgendamentosPage() {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [pets, setPets]   = useState<any[]>([])
  const [vets, setVets]   = useState<Usuario[]>([])
  const [filterDate, setFilterDate] = useState('')
  const [loading,   setLoading]   = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing,   setEditing]   = useState<Agendamento | null>(null)
  const supabase = createClient()

const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
  resolver: zodResolver(schema),
  defaultValues: { status: 'agendado' },  // ← adicionar aqui
})

  useEffect(() => { load(); loadPets(); loadVets() }, [])

  const load = async () => {
    // CORRIGIDO: join com usuarios (não com tabela 'veterinarios' que não existe)
    const { data, error } = await supabase
      .from('agendamentos')
      .select('*, pets(id, nome, especie, clientes(id, nome, telefone)), usuarios(id, nome)')
      .order('data', { ascending: true })
      .order('hora', { ascending: true })

    if (error) toast.error('Erro ao carregar agendamentos: ' + error.message)
    else setAgendamentos(data ?? [])
    setLoading(false)
  }

  const loadPets = async () => {
    const { data } = await supabase
      .from('pets')
      .select('id, nome, especie, clientes(id, nome)')
      .order('nome')
    setPets(data ?? [])
  }

  const loadVets = async () => {
    const { data } = await supabase
      .from('usuarios')
      .select('id, nome, role')
      .eq('role', 'veterinario')
      .eq('ativo', true)
      .order('nome')
      setVets((data ?? []) as Usuario[])
  }

  const onSubmit = async (data: FormData) => {
    try {
      const payload = {
        ...data,
        veterinario_id: data.veterinario_id || null,
        observacoes:    data.observacoes    || null,
      }
      if (editing) {
        const { error } = await supabase.from('agendamentos').update(payload).eq('id', editing.id)
        if (error) throw error
        toast.success('Agendamento atualizado!')
      } else {
        const { error } = await supabase.from('agendamentos').insert([payload])
        if (error) throw error
        toast.success('Agendamento criado!')
      }
      closeModal()
      load()
    } catch (e: any) {
      toast.error('Erro ao salvar: ' + (e.message ?? ''))
    }
  }

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('agendamentos').update({ status }).eq('id', id)
    if (error) toast.error('Erro ao atualizar status')
    else { toast.success('Status atualizado!'); load() }
  }

  const handleEdit = (a: Agendamento) => {
    setEditing(a)
    reset({
      pet_id:         a.pet_id,
      data:           a.data,
      hora:           a.hora,
      tipo_servico:   a.tipo_servico,
      veterinario_id: a.veterinario_id ?? '',
      status:         a.status,
      observacoes:    a.observacoes ?? '',
    })
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este agendamento?')) return
    const { error } = await supabase.from('agendamentos').delete().eq('id', id)
    if (error) toast.error('Erro ao excluir')
    else { toast.success('Agendamento excluído!'); load() }
  }

  const closeModal = () => { setShowModal(false); reset(); setEditing(null) }

  const filtered = filterDate
    ? agendamentos.filter(a => a.data === filterDate)
    : agendamentos

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
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Agendamentos</h1>
            <p className="text-slate-500 text-sm mt-1">{agendamentos.length} agendamento(s)</p>
          </div>
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <Plus size={16} /> Novo Agendamento
          </button>
        </div>

        {/* Filtro por data */}
        <div className="card py-3 flex items-center gap-3">
          <Calendar size={18} className="text-slate-400 shrink-0" />
          <input
            type="date"
            value={filterDate}
            onChange={e => setFilterDate(e.target.value)}
            className="input-field"
          />
          {filterDate && (
            <button onClick={() => setFilterDate('')} className="text-xs text-slate-400 hover:text-slate-600 shrink-0">
              Limpar filtro
            </button>
          )}
        </div>

        <div className="space-y-3">
          {filtered.map(a => (
            <div key={a.id} className="card hover:shadow-md transition-shadow">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
                <div className="flex items-start gap-4">
                  <div className="text-center bg-slate-100 dark:bg-slate-700 rounded-xl p-3 shrink-0">
                    <p className="text-xs text-slate-500 font-medium">
                      {new Date(a.data + 'T00:00:00').toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })}
                    </p>
                    <p className="text-lg font-bold text-slate-900 dark:text-white">{a.hora.slice(0, 5)}</p>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white">
                      {(a.pets as any)?.nome}
                      <span className="ml-2 text-xs text-slate-400 font-normal capitalize">
                        {(a.pets as any)?.especie}
                      </span>
                    </h3>
                    <p className="text-sm text-slate-500">Dono: {(a.pets as any)?.clientes?.nome}</p>
                    <p className="text-sm text-slate-500">Serviço: {a.tipo_servico}</p>
                    {(a as any).usuarios && (
                      <p className="text-xs text-slate-400 mt-0.5">Vet: {(a as any).usuarios?.nome}</p>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={statusBadge[a.status]}>{statusLabel[a.status]}</span>
                  {/* Botões de mudança de status */}
                  {a.status === 'agendado' && (
                    <button onClick={() => updateStatus(a.id, 'confirmado')} className="btn-secondary text-xs py-1 px-2">
                      Confirmar
                    </button>
                  )}
                  {a.status === 'confirmado' && (
                    <button onClick={() => updateStatus(a.id, 'concluido')} className="btn-secondary text-xs py-1 px-2">
                      Concluir
                    </button>
                  )}
                  {(a.status === 'agendado' || a.status === 'confirmado') && (
                    <button onClick={() => updateStatus(a.id, 'cancelado')} className="text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 py-1 px-2 rounded-lg">
                      Cancelar
                    </button>
                  )}
                  <button onClick={() => handleEdit(a)} className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg">
                    <Edit2 size={15} />
                  </button>
                  <button onClick={() => handleDelete(a.id)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="card text-center py-16">
            <p className="text-slate-400">{filterDate ? 'Nenhum agendamento nesta data' : 'Nenhum agendamento registado'}</p>
          </div>
        )}

        {showModal && (
          <div className="modal-overlay">
            <div className="modal-content max-w-lg">
              <div className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    {editing ? 'Editar Agendamento' : 'Novo Agendamento'}
                  </h2>
                  <button onClick={closeModal} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Pet *</label>
                    <select {...register('pet_id')} className="input-field">
                      <option value="">Selecione o pet</option>
                      {pets.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.nome} ({p.especie}) — {(p.clientes as any)?.nome}
                        </option>
                      ))}
                    </select>
                    {errors.pet_id && <p className="text-red-500 text-xs mt-1">{errors.pet_id.message}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Data *</label>
                      <input {...register('data')} type="date" className="input-field" />
                      {errors.data && <p className="text-red-500 text-xs mt-1">{errors.data.message}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Hora *</label>
                      <input {...register('hora')} type="time" className="input-field" />
                      {errors.hora && <p className="text-red-500 text-xs mt-1">{errors.hora.message}</p>}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Tipo de Serviço *</label>
                    <input {...register('tipo_servico')} className="input-field" placeholder="Consulta, Vacinação, Banho e Tosa..." />
                    {errors.tipo_servico && <p className="text-red-500 text-xs mt-1">{errors.tipo_servico.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Veterinário</label>
                    <select {...register('veterinario_id')} className="input-field">
                      <option value="">Sem veterinário atribuído</option>
                      {vets.map(v => (
                        <option key={v.id} value={v.id}>{v.nome}</option>
                      ))}
                    </select>
                  </div>
                  {editing && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Status</label>
                      <select {...register('status')} className="input-field">
                        <option value="agendado">Agendado</option>
                        <option value="confirmado">Confirmado</option>
                        <option value="concluido">Concluído</option>
                        <option value="cancelado">Cancelado</option>
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Observações</label>
                    <textarea {...register('observacoes')} className="input-field" rows={2} placeholder="Notas adicionais..." />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button type="submit" className="btn-primary flex-1 justify-center">
                      {editing ? 'Atualizar' : 'Criar'}
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
