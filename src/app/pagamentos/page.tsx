'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import AppLayout from '@/components/AppLayout'
import { useForm } from 'react-hook-form'
import { Plus, X, TrendingUp, Edit2, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Pagamento, Cliente, Agendamento } from '@/types'

const statusBadge: Record<string, string> = {
  pago:      'badge badge-success',
  pendente:  'badge badge-warning',
  cancelado: 'badge badge-danger',
}

const metodoBadge: Record<string, string> = {
  dinheiro:     'badge badge-success',
  transferencia: 'badge badge-info',
  cartao:       'badge badge-purple',
}

const metodoLabel: Record<string, string> = {
  dinheiro:     'Dinheiro',
  transferencia: 'Transferência',
  cartao:       'Cartão',
}

export default function PagamentosPage() {
  const [pagamentos, setPagamentos]   = useState<Pagamento[]>([])
  const [clientes, setClientes] = useState<Pick<Cliente, 'id' | 'nome' | 'telefone'>[]>([])
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [showModal,  setShowModal]    = useState(false)
  const [editing,    setEditing]      = useState<Pagamento | null>(null)
  const supabase = createClient()
  const { register, handleSubmit, reset } = useForm()

  useEffect(() => { load(); loadClientes(); loadAgendamentos() }, [])

  const load = async () => {
    const { data, error } = await supabase
      .from('pagamentos')
      .select('*, clientes(id, nome, telefone), agendamentos(id, tipo_servico)')
      .order('data_pagamento', { ascending: false })
    if (error) toast.error('Erro ao carregar pagamentos: ' + error.message)
    else setPagamentos(data ?? [])
  }

  const loadClientes = async () => {
    const { data } = await supabase.from('clientes').select('id, nome, telefone').order('nome')
    setClientes(data ?? [])
  }

  const loadAgendamentos = async () => {
  const { data } = await supabase
    .from('agendamentos')
    .select('*')  // Get all fields
    .in('status', ['confirmado', 'concluido'])
    .order('data', { ascending: false })
  setAgendamentos(data ?? [])
}

  const onSubmit = async (data: any) => {
    try {
      const payload = {
        cliente_id:       data.cliente_id,
        descricao:        data.descricao,
        valor:            parseFloat(data.valor),
        data_pagamento:   data.data_pagamento || new Date().toISOString().split('T')[0],
        metodo_pagamento: data.metodo_pagamento || null,
        status:           data.status,
        agendamento_id:   data.agendamento_id || null,
        observacoes:      data.observacoes    || null,
      }

      if (editing) {
        const { error } = await supabase.from('pagamentos').update(payload).eq('id', editing.id)
        if (error) throw error
        toast.success('Pagamento atualizado!')
      } else {
        const { error } = await supabase.from('pagamentos').insert([payload])
        if (error) throw error
        toast.success('Pagamento registado!')
      }
      closeModal()
      load()
    } catch (e: any) {
      toast.error('Erro ao salvar: ' + (e.message ?? ''))
    }
  }

  const handleEdit = (p: Pagamento) => {
    setEditing(p)
    reset({
      cliente_id:       p.cliente_id,
      descricao:        p.descricao,
      valor:            p.valor.toString(),
      data_pagamento:   p.data_pagamento,
      metodo_pagamento: p.metodo_pagamento ?? '',
      status:           p.status,
      agendamento_id:   p.agendamento_id ?? '',
      observacoes:      p.observacoes ?? '',
    })
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este pagamento?')) return
    const { error } = await supabase.from('pagamentos').delete().eq('id', id)
    if (error) toast.error('Erro ao excluir')
    else { toast.success('Pagamento excluído!'); load() }
  }

  const closeModal = () => { setShowModal(false); reset(); setEditing(null) }

  const total    = pagamentos.reduce((s, p) => s + Number(p.valor), 0)
  const pago     = pagamentos.filter(p => p.status === 'pago').reduce((s, p) => s + Number(p.valor), 0)
  const pendente = pagamentos.filter(p => p.status === 'pendente').reduce((s, p) => s + Number(p.valor), 0)

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Pagamentos</h1>
            <p className="text-slate-500 text-sm mt-1">{pagamentos.length} registo(s)</p>
          </div>
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <Plus size={16} /> Novo Pagamento
          </button>
        </div>

        {/* Cards de resumo */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Total Registado', value: total,    color: 'text-slate-900 dark:text-white' },
            { label: 'Recebido',        value: pago,     color: 'text-emerald-600' },
            { label: 'Pendente',        value: pendente, color: 'text-amber-600'   },
          ].map(({ label, value, color }) => (
            <div key={label} className="card">
              <div className="flex items-center gap-3">
                <TrendingUp size={20} className="text-slate-400 shrink-0" />
                <div>
                  <p className="text-xs text-slate-400">{label}</p>
                  <p className={`text-xl font-bold ${color}`}>{value.toFixed(2)} Kz</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Lista de pagamentos */}
        <div className="space-y-3">
          {pagamentos.map(p => (
            <div key={p.id} className="card hover:shadow-md transition-shadow">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-slate-900 dark:text-white">{p.descricao}</h3>
                    <span className={statusBadge[p.status]}>{p.status}</span>
                    {p.metodo_pagamento && (
                      <span className={metodoBadge[p.metodo_pagamento]}>{metodoLabel[p.metodo_pagamento]}</span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 mt-0.5">
                    Cliente: {(p.clientes as any)?.nome}
                  </p>
                  {(p.agendamentos as any)?.tipo_servico && (
                    <p className="text-xs text-slate-400">Serviço: {(p.agendamentos as any).tipo_servico}</p>
                  )}
                  <p className="text-xs text-slate-400">
                    {new Date(p.data_pagamento + 'T00:00:00').toLocaleDateString('pt-PT')}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <p className="text-xl font-bold text-slate-900 dark:text-white">{Number(p.valor).toFixed(2)} Kz</p>
                  <button onClick={() => handleEdit(p)} className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg">
                    <Edit2 size={15} />
                  </button>
                  <button onClick={() => handleDelete(p.id)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {pagamentos.length === 0 && (
          <div className="card text-center py-16">
            <p className="text-slate-400">Nenhum pagamento registado</p>
          </div>
        )}

        {showModal && (
          <div className="modal-overlay">
            <div className="modal-content max-w-lg">
              <div className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    {editing ? 'Editar Pagamento' : 'Novo Pagamento'}
                  </h2>
                  <button onClick={closeModal} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Cliente *</label>
                    <select {...register('cliente_id', { required: true })} className="input-field">
                      <option value="">Selecione o cliente</option>
                      {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Agendamento (opcional)</label>
                    <select {...register('agendamento_id')} className="input-field">
                      <option value="">Sem agendamento associado</option>
                      {agendamentos.map(a => (
                        <option key={a.id} value={a.id}>
                          {a.tipo_servico} — {(a.pets as any)?.nome} ({new Date(a.data + 'T00:00:00').toLocaleDateString('pt-PT')})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Descrição *</label>
                    <input {...register('descricao', { required: true })} className="input-field" placeholder="Consulta, Vacina, Banho..." />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Valor (Kz) *</label>
                      <input {...register('valor', { required: true, min: 0 })} type="number" step="0.01" className="input-field" placeholder="0.00" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Data *</label>
                      <input {...register('data_pagamento')} type="date" className="input-field" defaultValue={new Date().toISOString().split('T')[0]} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Método</label>
                      <select {...register('metodo_pagamento')} className="input-field">
                        <option value="">Sem método</option>
                        <option value="dinheiro">Dinheiro</option>
                        <option value="transferencia">Transferência</option>
                        <option value="cartao">Cartão</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Status *</label>
                      <select {...register('status', { required: true })} className="input-field" defaultValue="pendente">
                        <option value="pendente">Pendente</option>
                        <option value="pago">Pago</option>
                        <option value="cancelado">Cancelado</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Observações</label>
                    <textarea {...register('observacoes')} className="input-field" rows={2} />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button type="submit" className="btn-primary flex-1 justify-center">
                      {editing ? 'Atualizar' : 'Registar'}
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
