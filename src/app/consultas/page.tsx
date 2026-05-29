'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import AppLayout from '@/components/AppLayout'
import { useAuth } from '@/contexts/AuthContext'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Search, Eye, X, Stethoscope } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Consulta } from '@/types'

const schema = z.object({
  pet_id:          z.string().min(1, 'Selecione um pet'),
  data_consulta:   z.string().min(1, 'Data obrigatória'),
  sintomas:        z.string().min(3, 'Descreva os sintomas'),
  diagnostico:     z.string().min(3, 'Diagnóstico obrigatório'),
  tratamento:      z.string().min(3, 'Tratamento obrigatório'),
  medicamentos:    z.string().optional(),
  observacoes:     z.string().optional(),
  proxima_consulta: z.string().optional(),
})
type FormData = z.infer<typeof schema>

export default function ConsultasPage() {
  const { user } = useAuth()
  const [consultas, setConsultas] = useState<Consulta[]>([])
  const [pets, setPets]     = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [viewing, setViewing] = useState<Consulta | null>(null)
  const supabase = createClient()

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  useEffect(() => { load(); loadPets() }, [])

  const load = async () => {
    const { data, error } = await supabase
      .from('consultas')
      .select('*, pets(id, nome, especie, clientes(id, nome)), usuarios(id, nome)')
      .order('data_consulta', { ascending: false })

    if (error) toast.error('Erro ao carregar consultas: ' + error.message)
    else setConsultas(data ?? [])
    setLoading(false)
  }

  const loadPets = async () => {
    const { data } = await supabase
      .from('pets')
      .select('id, nome, especie, clientes(id, nome)')
      .order('nome')
    setPets(data ?? [])
  }

  const onSubmit = async (data: FormData) => {
    try {
      const payload = {
        ...data,
        veterinario_id:  user?.id ?? null,
        proxima_consulta: data.proxima_consulta || null,
        medicamentos:    data.medicamentos     || null,
        observacoes:     data.observacoes      || null,
      }
      const { error } = await supabase.from('consultas').insert([payload])
      if (error) throw error
      toast.success('Consulta registada!')
      setShowModal(false)
      reset()
      load()
    } catch (e: any) {
      toast.error('Erro ao salvar: ' + (e.message ?? ''))
    }
  }

  const filtered = search
    ? consultas.filter(c =>
        (c.pets as any)?.nome?.toLowerCase().includes(search.toLowerCase()) ||
        (c.pets as any)?.clientes?.nome?.toLowerCase().includes(search.toLowerCase()) ||
        c.diagnostico?.toLowerCase().includes(search.toLowerCase())
      )
    : consultas

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
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Consultas</h1>
            <p className="text-slate-500 text-sm mt-1">{consultas.length} consulta(s) registada(s)</p>
          </div>
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <Plus size={16} /> Nova Consulta
          </button>
        </div>

        <div className="card py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Pesquisar por pet, dono ou diagnóstico..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input-field pl-10"
            />
          </div>
        </div>

        <div className="space-y-3">
          {filtered.map(c => (
            <div key={c.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center shrink-0">
                    <Stethoscope size={18} className="text-blue-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-slate-900 dark:text-white">
                        {(c.pets as any)?.nome}
                      </h3>
                      <span className="text-xs text-slate-400 capitalize">{(c.pets as any)?.especie}</span>
                    </div>
                    <p className="text-sm text-slate-500">Dono: {(c.pets as any)?.clientes?.nome}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 font-medium">{c.diagnostico}</p>
                    {(c as any).usuarios && (
                      <p className="text-xs text-slate-400 mt-0.5">Vet: {(c as any).usuarios?.nome}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <p className="text-sm text-slate-500">
                    {new Date(c.data_consulta + 'T00:00:00').toLocaleDateString('pt-PT')}
                  </p>
                  <button
                    onClick={() => setViewing(c)}
                    className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                  >
                    <Eye size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="card text-center py-16">
            <p className="text-slate-400">{search ? 'Nenhuma consulta encontrada' : 'Nenhuma consulta registada'}</p>
          </div>
        )}

        {/* Modal nova consulta */}
        {showModal && (
          <div className="modal-overlay">
            <div className="modal-content max-w-2xl">
              <div className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Nova Consulta</h2>
                  <button onClick={() => { setShowModal(false); reset() }} className="text-slate-400 hover:text-slate-600">
                    <X size={20} />
                  </button>
                </div>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Pet *</label>
                      <select {...register('pet_id')} className="input-field">
                        <option value="">Selecione o pet</option>
                        {pets.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.nome} — {(p.clientes as any)?.nome}
                          </option>
                        ))}
                      </select>
                      {errors.pet_id && <p className="text-red-500 text-xs mt-1">{errors.pet_id.message}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Data da Consulta *</label>
                      <input {...register('data_consulta')} type="date" className="input-field" defaultValue={new Date().toISOString().split('T')[0]} />
                      {errors.data_consulta && <p className="text-red-500 text-xs mt-1">{errors.data_consulta.message}</p>}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Sintomas *</label>
                    <textarea {...register('sintomas')} className="input-field" rows={2} placeholder="Descreva os sintomas apresentados..." />
                    {errors.sintomas && <p className="text-red-500 text-xs mt-1">{errors.sintomas.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Diagnóstico *</label>
                    <textarea {...register('diagnostico')} className="input-field" rows={2} placeholder="Diagnóstico clínico..." />
                    {errors.diagnostico && <p className="text-red-500 text-xs mt-1">{errors.diagnostico.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Tratamento *</label>
                    <textarea {...register('tratamento')} className="input-field" rows={2} placeholder="Tratamento prescrito..." />
                    {errors.tratamento && <p className="text-red-500 text-xs mt-1">{errors.tratamento.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Medicamentos</label>
                    <textarea {...register('medicamentos')} className="input-field" rows={2} placeholder="Medicamentos prescritos..." />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Próxima Consulta</label>
                      <input {...register('proxima_consulta')} type="date" className="input-field" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Observações</label>
                      <input {...register('observacoes')} className="input-field" placeholder="Notas adicionais..." />
                    </div>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button type="submit" className="btn-primary flex-1 justify-center">Registar Consulta</button>
                    <button type="button" onClick={() => { setShowModal(false); reset() }} className="btn-secondary flex-1 justify-center">Cancelar</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Modal de visualização */}
        {viewing && (
          <div className="modal-overlay">
            <div className="modal-content max-w-2xl">
              <div className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Ficha da Consulta</h2>
                  <button onClick={() => setViewing(null)} className="text-slate-400 hover:text-slate-600">
                    <X size={20} />
                  </button>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><p className="text-slate-400 text-xs">Pet</p><p className="font-semibold">{(viewing.pets as any)?.nome}</p></div>
                    <div><p className="text-slate-400 text-xs">Dono</p><p className="font-semibold">{(viewing.pets as any)?.clientes?.nome}</p></div>
                    <div><p className="text-slate-400 text-xs">Data</p><p className="font-semibold">{new Date(viewing.data_consulta + 'T00:00:00').toLocaleDateString('pt-PT')}</p></div>
                    <div><p className="text-slate-400 text-xs">Veterinário</p><p className="font-semibold">{(viewing as any).usuarios?.nome ?? '—'}</p></div>
                  </div>
                  {[
                    { label: 'Sintomas', value: viewing.sintomas },
                    { label: 'Diagnóstico', value: viewing.diagnostico },
                    { label: 'Tratamento', value: viewing.tratamento },
                    viewing.medicamentos && { label: 'Medicamentos', value: viewing.medicamentos },
                    viewing.observacoes  && { label: 'Observações',  value: viewing.observacoes  },
                    viewing.proxima_consulta && { label: 'Próxima Consulta', value: new Date(viewing.proxima_consulta + 'T00:00:00').toLocaleDateString('pt-PT') },
                  ].filter(Boolean).map((item: any) => (
                    <div key={item.label} className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4">
                      <p className="text-xs text-slate-400 mb-1 font-medium uppercase tracking-wide">{item.label}</p>
                      <p className="text-slate-700 dark:text-slate-300 text-sm">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
