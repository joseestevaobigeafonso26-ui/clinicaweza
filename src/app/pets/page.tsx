'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import AppLayout from '@/components/AppLayout'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Search, Edit2, Trash2, X } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Pet, Cliente } from '@/types'

const schema = z.object({
  nome: z.string().min(2, 'Mínimo 2 caracteres'),
  especie: z.string().min(1, 'Selecione uma espécie'),
  raca: z.string().optional(),
  sexo: z.string().min(1, 'Selecione o sexo'),
  data_nascimento: z.string().min(1, 'Data obrigatória'),
  peso: z.string().optional(),
  cor: z.string().optional(),
  cliente_id: z.string().min(1, 'Selecione o dono'),
  observacoes: z.string().optional(),
})
type FormData = z.infer<typeof schema>

function calcAge(dob: string) {
  const hoje = new Date(); const nasc = new Date(dob)
  let anos = hoje.getFullYear() - nasc.getFullYear()
  const m = hoje.getMonth() - nasc.getMonth()
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) anos--
  if (anos === 0) { const meses = m < 0 ? 12 + m : m; return `${meses} ${meses === 1 ? 'mês' : 'meses'}` }
  return `${anos} ${anos === 1 ? 'ano' : 'anos'}`
}

const especieEmoji: Record<string, string> = { cao: '🐕', gato: '🐈', ave: '🐦', roedor: '🐹', reptil: '🦎', outro: '🐾' }

export default function PetsPage() {
  const [pets, setPets] = useState<Pet[]>([])
  const [clientes, setClientes] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Pet | null>(null)
  const supabase = createClient()

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) })

  useEffect(() => { loadPets(); loadClientes() }, [])

  const loadPets = async () => {
    const { data, error } = await supabase.from('pets').select('*, clientes(*)').order('created_at', { ascending: false })
    if (error) toast.error('Erro ao carregar pets')
    else setPets(data ?? [])
    setLoading(false)
  }

  const loadClientes = async () => {
    const { data } = await supabase.from('clientes').select('*').order('nome')
    setClientes(data ?? [])
  }

  const onSubmit = async (data: FormData) => {
    try {
      if (editing) {
        const { error } = await supabase.from('pets').update(data).eq('id', editing.id)
        if (error) throw error
        toast.success('Pet atualizado!')
      } else {
        const { error } = await supabase.from('pets').insert([data])
        if (error) throw error
        toast.success('Pet cadastrado!')
      }
      closeModal(); loadPets()
    } catch { toast.error('Erro ao salvar pet') }
  }

  const handleEdit = (p: Pet) => { setEditing(p); reset({ ...p, data_nascimento: p.data_nascimento?.split('T')[0], peso: p.peso?.toString() }); setShowModal(true) }
  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este pet?')) return
    const { error } = await supabase.from('pets').delete().eq('id', id)
    if (error) toast.error('Erro ao excluir')
    else { toast.success('Pet excluído!'); loadPets() }
  }
  const closeModal = () => { setShowModal(false); reset(); setEditing(null) }

  const filtered = search
    ? pets.filter(p => p.nome.toLowerCase().includes(search.toLowerCase()) || p.especie.toLowerCase().includes(search.toLowerCase()) || (p.clientes as any)?.nome?.toLowerCase().includes(search.toLowerCase()))
    : pets

  if (loading) return <AppLayout><div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-2 border-emerald-500 border-t-transparent" /></div></AppLayout>

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Pets</h1>
            <p className="text-slate-500 text-sm mt-1">{pets.length} animal(is) cadastrado(s)</p>
          </div>
          <button onClick={() => setShowModal(true)} className="btn-primary"><Plus size={16} /> Novo Pet</button>
        </div>

        <div className="card py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" placeholder="Pesquisar por nome, espécie ou dono..." value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-10" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(p => (
            <div key={p.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center text-xl">
                    {especieEmoji[p.especie] ?? '🐾'}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white">{p.nome}</h3>
                    <p className="text-xs text-slate-500">Dono: {(p.clientes as any)?.nome}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleEdit(p)} className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"><Edit2 size={15} /></button>
                  <button onClick={() => handleDelete(p.id)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><Trash2 size={15} /></button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-2">
                  <p className="text-slate-400">Espécie</p>
                  <p className="font-semibold text-slate-700 dark:text-slate-300 capitalize">{p.especie}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-2">
                  <p className="text-slate-400">Sexo</p>
                  <p className="font-semibold text-slate-700 dark:text-slate-300 capitalize">{p.sexo}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-2">
                  <p className="text-slate-400">Idade</p>
                  <p className="font-semibold text-slate-700 dark:text-slate-300">{calcAge(p.data_nascimento)}</p>
                </div>
                {p.peso && <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-2">
                  <p className="text-slate-400">Peso</p>
                  <p className="font-semibold text-slate-700 dark:text-slate-300">{p.peso} kg</p>
                </div>}
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && <div className="card text-center py-16"><p className="text-slate-400">{search ? 'Nenhum pet encontrado' : 'Nenhum pet cadastrado'}</p></div>}

        {showModal && (
          <div className="modal-overlay">
            <div className="modal-content max-w-2xl">
              <div className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">{editing ? 'Editar Pet' : 'Novo Pet'}</h2>
                  <button onClick={closeModal} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Nome *</label>
                      <input {...register('nome')} className="input-field" placeholder="Rex" />
                      {errors.nome && <p className="text-red-500 text-xs mt-1">{errors.nome.message}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Dono *</label>
                      <select {...register('cliente_id')} className="input-field">
                        <option value="">Selecione</option>
                        {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                      </select>
                      {errors.cliente_id && <p className="text-red-500 text-xs mt-1">{errors.cliente_id.message}</p>}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Espécie *</label>
                      <select {...register('especie')} className="input-field">
                        <option value="">Selecione</option>
                        <option value="cao">Cão</option>
                        <option value="gato">Gato</option>
                        <option value="ave">Ave</option>
                        <option value="roedor">Roedor</option>
                        <option value="reptil">Réptil</option>
                        <option value="outro">Outro</option>
                      </select>
                      {errors.especie && <p className="text-red-500 text-xs mt-1">{errors.especie.message}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Raça</label>
                      <input {...register('raca')} className="input-field" placeholder="Labrador, Persa..." />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Sexo *</label>
                      <select {...register('sexo')} className="input-field">
                        <option value="">Selecione</option>
                        <option value="macho">Macho</option>
                        <option value="femea">Fêmea</option>
                      </select>
                      {errors.sexo && <p className="text-red-500 text-xs mt-1">{errors.sexo.message}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Nascimento *</label>
                      <input {...register('data_nascimento')} type="date" className="input-field" />
                      {errors.data_nascimento && <p className="text-red-500 text-xs mt-1">{errors.data_nascimento.message}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Peso (kg)</label>
                      <input {...register('peso')} type="number" step="0.01" className="input-field" placeholder="5.5" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Cor</label>
                    <input {...register('cor')} className="input-field" placeholder="Marrom, Preto e Branco..." />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Observações</label>
                    <textarea {...register('observacoes')} className="input-field" rows={2} placeholder="Alergias, comportamento..." />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button type="submit" className="btn-primary flex-1 justify-center">{editing ? 'Atualizar' : 'Cadastrar'}</button>
                    <button type="button" onClick={closeModal} className="btn-secondary flex-1 justify-center">Cancelar</button>
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
