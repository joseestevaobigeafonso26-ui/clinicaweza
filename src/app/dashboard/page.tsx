'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import AppLayout from '@/components/AppLayout'
import { Users, PawPrint, Calendar, DollarSign, AlertCircle } from 'lucide-react'
import type { Agendamento, Vacina } from '@/types'

interface Stats { totalClientes: number; totalPets: number; agendamentosHoje: number; receitaMes: number }

function StatCard({ icon: Icon, title, value, color, subtitle }: { icon: any; title: string; value: string | number; color: string; subtitle?: string }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{title}</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{value}</p>
          {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${color}`}>
          <Icon size={22} className="text-white" />
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { userRole } = useAuth()
  const [stats, setStats] = useState<Stats>({ totalClientes: 0, totalPets: 0, agendamentosHoje: 0, receitaMes: 0 })
  const [nextAppointments, setNextAppointments] = useState<Agendamento[]>([])
  const [pendingVaccines, setPendingVaccines] = useState<Vacina[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      const [{ count: c }, { count: p }] = await Promise.all([
        supabase.from('clientes').select('*', { count: 'exact', head: true }),
        supabase.from('pets').select('*', { count: 'exact', head: true }),
      ])

      const hoje = new Date().toISOString().split('T')[0]
      const { count: ag } = await supabase.from('agendamentos').select('*', { count: 'exact', head: true }).eq('data', hoje)

      const primeiroDia = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
      const { data: pags } = await supabase.from('pagamentos').select('valor').gte('data_pagamento', primeiroDia).eq('status', 'pago')
      const receita = pags?.reduce((s, x) => s + parseFloat(x.valor), 0) ?? 0

      setStats({ totalClientes: c ?? 0, totalPets: p ?? 0, agendamentosHoje: ag ?? 0, receitaMes: receita })

      const { data: appointments } = await supabase
        .from('agendamentos')
        .select('*, pets(nome, especie, clientes(nome))')
        .gte('data', hoje)
        .in('status', ['agendado', 'confirmado'])
        .order('data').order('hora').limit(5)
      setNextAppointments((appointments as Agendamento[]) ?? [])

      const in30 = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
      const { data: vaccines } = await supabase
        .from('vacinas')
        .select('*, pets(nome, clientes(nome))')
        .gte('proxima_dose', hoje)
        .lte('proxima_dose', in30)
        .order('proxima_dose').limit(5)
      setPendingVaccines((vaccines as Vacina[]) ?? [])
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <AppLayout>
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-emerald-500 border-t-transparent" />
      </div>
    </AppLayout>
  )

  const roleLabel = (value?: string) => {
    if (value === 'admin') return 'Administrador'
    if (value === 'veterinario') return 'Veterinário'
    if (value === 'rececionista') return 'Rececionista'
    if (value === 'cliente') return 'Cliente'
    return value ?? ''
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Bem-vindo, {roleLabel(userRole?.role)}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard icon={Users} title="Total de Clientes" value={stats.totalClientes} color="bg-blue-500" />
          <StatCard icon={PawPrint} title="Total de Pets" value={stats.totalPets} color="bg-emerald-500" />
          <StatCard icon={Calendar} title="Agendamentos Hoje" value={stats.agendamentosHoje} color="bg-purple-500" />
          <StatCard icon={DollarSign} title="Receita do Mês" value={`${stats.receitaMes.toFixed(2)} Kz`} color="bg-amber-500" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Próximos Agendamentos</h2>
              <Calendar size={18} className="text-emerald-600" />
            </div>
            {nextAppointments.length > 0 ? (
              <div className="space-y-2">
                {nextAppointments.map((a) => (
                  <div key={a.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{(a.pets as any)?.nome}</p>
                      <p className="text-xs text-slate-500">{(a.pets as any)?.clientes?.nome}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{new Date(a.data + 'T00:00:00').toLocaleDateString('pt-PT')}</p>
                      <p className="text-xs text-slate-500">{a.hora}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-slate-400 text-sm text-center py-8">Nenhum agendamento próximo</p>}
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Vacinas Pendentes (30 dias)</h2>
              <AlertCircle size={18} className="text-amber-500" />
            </div>
            {pendingVaccines.length > 0 ? (
              <div className="space-y-2">
                {pendingVaccines.map((v) => (
                  <div key={v.id} className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-800/30">
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{(v.pets as any)?.nome}</p>
                      <p className="text-xs text-slate-500">{v.tipo_vacina}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{new Date(v.proxima_dose! + 'T00:00:00').toLocaleDateString('pt-PT')}</p>
                      <span className="badge badge-warning">Pendente</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-slate-400 text-sm text-center py-8">Nenhuma vacina pendente</p>}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
