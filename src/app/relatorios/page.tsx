'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import AppLayout from '@/components/AppLayout'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Users, PawPrint, Stethoscope, DollarSign } from 'lucide-react'

export default function RelatoriosPage() {
  const [stats, setStats] = useState({ clientes: 0, pets: 0, consultas: 0, receita: 0 })
  const [chartData, setChartData] = useState<{ name: string; total: number }[]>([])
  const supabase = createClient()

  useEffect(() => { load() }, [])

  const load = async () => {
    const [{ count: c }, { count: p }] = await Promise.all([
      supabase.from('clientes').select('*', { count: 'exact', head: true }),
      supabase.from('pets').select('*', { count: 'exact', head: true }),
    ])

    const primeiroDia = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
    const [{ count: cons }, { data: pags }, { data: servicos }] = await Promise.all([
      supabase.from('consultas').select('*', { count: 'exact', head: true }).gte('data_consulta', primeiroDia),
      supabase.from('pagamentos').select('valor').gte('data_pagamento', primeiroDia).eq('status', 'pago'),
      supabase.from('agendamentos').select('tipo_servico'),
    ])

    const receita = pags?.reduce((s: number, x: any) => s + parseFloat(x.valor), 0) ?? 0
    const map: Record<string, number> = {}
    servicos?.forEach((s: any) => { map[s.tipo_servico] = (map[s.tipo_servico] || 0) + 1 })
    const chart = Object.entries(map).map(([name, total]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), total }))

    setStats({ clientes: c ?? 0, pets: p ?? 0, consultas: cons ?? 0, receita })
    setChartData(chart)
  }

  const cards = [
    { icon: Users, label: 'Total de Clientes', value: stats.clientes, color: 'bg-blue-500' },
    { icon: PawPrint, label: 'Total de Pets', value: stats.pets, color: 'bg-emerald-500' },
    { icon: Stethoscope, label: 'Consultas do Mês', value: stats.consultas, color: 'bg-purple-500' },
    { icon: DollarSign, label: 'Receita do Mês', value: `${stats.receita.toFixed(2)} Kz`, color: 'bg-amber-500' },
  ]

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Relatórios</h1>
          <p className="text-slate-500 text-sm mt-1">Visão geral da clínica</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {cards.map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 font-medium">{label}</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{value}</p>
                </div>
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
                  <Icon size={20} className="text-white" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="card">
          <h2 className="text-base font-bold text-slate-900 dark:text-white mb-6">Serviços Mais Realizados</h2>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="total" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-slate-400 text-center py-12">Sem dados disponíveis</p>}
        </div>
      </div>
    </AppLayout>
  )
}
