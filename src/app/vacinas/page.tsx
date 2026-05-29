'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import AppLayout from '@/components/AppLayout'
import { useAuth } from '@/contexts/AuthContext'
import { useForm } from 'react-hook-form'
import { Plus, X, AlertTriangle, CheckCircle, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Vacina } from '@/types'

export default function VacinasPage() {
  const { user } = useAuth()
  const [vacinas, setVacinas]   = useState<Vacina[]>([])
  const [pets, setPets]         = useState<any[]>([])
  const [showModal, setShowModal] = useState(false)
  const supabase = createClient()
  const { register, handleSubmit, reset } = useForm()

  useEffect(() => { load(); loadPets() }, [])

  const load = async () => {
    const { data, error } = await supabase
      .from('vacinas')
      .select('*, pets(id, nome, clientes(id, nome)), usuarios(id, nome)')
      .order('proxima_dose', { ascending: true, nullsFirst: false })

    if (error) toast.error('Erro ao carregar vacinas: ' + error.message)
    else setVacinas(data ?? [])
  }

  const loadPets = async () => {
    const { data } = await supabase
      .from('pets')
      .select('id, nome, especie, clientes(id, nome)')
      .order('nome')
    setPets(data ?? [])
  }

  const onSubmit = async (data: any) => {
    const payload = {
      ...data,
      veterinario_id: user?.id ?? null,
      proxima_dose:   data.proxima_dose || null,
      lote:           data.lote         || null,
      fabricante:     data.fabricante   || null,
      observacoes:    data.observacoes  || null,
    }
    const { error } = await supabase.from('vacinas').insert([payload])
    if (error) toast.error('Erro ao registar: ' + error.message)
    else { toast.success('Vacina registada!'); setShowModal(false); reset(); load() }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este registo de vacina?')) return
    const { error } = await supabase.from('vacinas').delete().eq('id', id)
    if (error) toast.error('Erro ao excluir')
    else { toast.success('Vacina excluída!'); load() }
  }

  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  const atrasadas = vacinas.filter(v => v.proxima_dose && new Date(v.proxima_dose + 'T00:00:00') < hoje)
  const emDia     = vacinas.filter(v => !v.proxima_dose || new Date(v.proxima_dose + 'T00:00:00') >= hoje)

  const VacinaCard = ({ v }: { v: Vacina }) => {
    const atrasada = v.proxima_dose && new Date(v.proxima_dose + 'T00:00:00') < hoje
    return (
      <div className={`card border-l-4 ${atrasada ? 'border-l-red-400' : 'border-l-emerald-400'}`}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-slate-900 dark:text-white">{(v.pets as any)?.nome}</h3>
              {atrasada
                ? <span className="badge badge-danger flex items-center gap-1"><AlertTriangle size={10} /> Atrasada</span>
                : <span className="badge badge-success flex items-center gap-1"><CheckCircle size={10} /> Em dia</span>
              }
            </div>
            <p className="text-sm text-slate-500 mt-0.5">Dono: {(v.pets as any)?.clientes?.nome}</p>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mt-1">{v.tipo_vacina}</p>
            {v.fabricante && <p className="text-xs text-slate-400">Fabricante: {v.fabricante}</p>}
            {v.lote       && <p className="text-xs text-slate-400">Lote: {v.lote}</p>}
            {(v as any).usuarios && <p className="text-xs text-slate-400">Vet: {(v as any).usuarios?.nome}</p>}
          </div>
          <div className="text-right ml-4 shrink-0">
            <p className="text-xs text-slate-400">Aplicação</p>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {new Date(v.data_aplicacao + 'T00:00:00').toLocaleDateString('pt-PT')}
            </p>
            {v.proxima_dose && (
              <>
                <p className="text-xs text-slate-400 mt-2">Próxima dose</p>
                <p className={`font-semibold text-sm ${atrasada ? 'text-red-600' : 'text-slate-700 dark:text-slate-300'}`}>
                  {new Date(v.proxima_dose + 'T00:00:00').toLocaleDateString('pt-PT')}
                </p>
              </>
            )}
            <button
              onClick={() => handleDelete(v.id)}
              className="mt-2 p-1.5 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Vacinas</h1>
            <p className="text-slate-500 text-sm mt-1">{vacinas.length} registo(s)</p>
          </div>
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <Plus size={16} /> Registar Vacina
          </button>
        </div>

        {atrasadas.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-red-600 mb-3 flex items-center gap-2">
              <AlertTriangle size={16} /> Vacinas Atrasadas ({atrasadas.length})
            </h2>
            <div className="space-y-3">
              {atrasadas.map(v => <VacinaCard key={v.id} v={v} />)}
            </div>
          </div>
        )}

        {emDia.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-emerald-600 mb-3 flex items-center gap-2">
              <CheckCircle size={16} /> Em Dia / Sem Data Próxima ({emDia.length})
            </h2>
            <div className="space-y-3">
              {emDia.map(v => <VacinaCard key={v.id} v={v} />)}
            </div>
          </div>
        )}

        {vacinas.length === 0 && (
          <div className="card text-center py-16">
            <p className="text-slate-400">Nenhuma vacina registada</p>
          </div>
        )}

        {showModal && (
          <div className="modal-overlay">
            <div className="modal-content max-w-lg">
              <div className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Registar Vacina</h2>
                  <button onClick={() => { setShowModal(false); reset() }} className="text-slate-400 hover:text-slate-600">
                    <X size={20} />
                  </button>
                </div>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Pet *</label>
                    <select {...register('pet_id', { required: true })} className="input-field">
                      <option value="">Selecione o pet</option>
                      {pets.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.nome} ({p.especie}) — {(p.clientes as any)?.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Tipo de Vacina *</label>
                    <input {...register('tipo_vacina', { required: true })} className="input-field" placeholder="Anti-rábica, V8, V10..." />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Data de Aplicação *</label>
                      <input {...register('data_aplicacao', { required: true })} type="date" className="input-field" defaultValue={new Date().toISOString().split('T')[0]} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Próxima Dose</label>
                      <input {...register('proxima_dose')} type="date" className="input-field" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Fabricante</label>
                      <input {...register('fabricante')} className="input-field" placeholder="MSD, Zoetis..." />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Lote</label>
                      <input {...register('lote')} className="input-field" placeholder="Nº do lote" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Observações</label>
                    <textarea {...register('observacoes')} className="input-field" rows={2} />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button type="submit" className="btn-primary flex-1 justify-center">Registar</button>
                    <button type="button" onClick={() => { setShowModal(false); reset() }} className="btn-secondary flex-1 justify-center">Cancelar</button>
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
