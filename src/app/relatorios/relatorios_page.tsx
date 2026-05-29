'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import AppLayout from '@/components/AppLayout'
import { exportarParaPDF } from '@/lib/export_pdf'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend,
} from 'recharts'
import {
  Users, PawPrint, Stethoscope, DollarSign, Syringe, Calendar,
  Download, FileText, TrendingUp, Clock, ChevronDown, Loader2,
} from 'lucide-react'

// ─── tipos locais ────────────────────────────────────────────────────────────
type Periodo = 'semanal' | 'mensal' | 'anual'

interface FuncionarioStats {
  id: string
  nome: string
  role: string
  consultas: number
  vacinas: number
  agendamentos: number
  receitaGerada: number
}

// ─── helpers de data ──────────────────────────────────────────────────────────
function getRange(periodo: Periodo): { inicio: string; fim: string } {
  const now = new Date()
  const fim = now.toISOString().split('T')[0]
  let inicio = ''

  if (periodo === 'semanal') {
    const d = new Date(now)
    d.setDate(d.getDate() - 6)
    inicio = d.toISOString().split('T')[0]
  } else if (periodo === 'mensal') {
    inicio = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  } else {
    inicio = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]
  }

  return { inicio, fim }
}

function fmtData(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function fmtMoeda(v: number) {
  return new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA', maximumFractionDigits: 0 })
    .format(v)
    .replace('AOA', 'Kz')
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

const periodoLabel: Record<Periodo, string> = {
  semanal: 'Últimos 7 dias', mensal: 'Este mês', anual: 'Este ano',
}

// ─── componente principal ─────────────────────────────────────────────────────
export default function RelatoriosPage() {
  const supabase = createClient()

  const [periodo, setPeriodo]     = useState<Periodo>('mensal')
  const [loading, setLoading]     = useState(true)
  const [exporting, setExporting] = useState(false)
  const [activeTab, setActiveTab] = useState<'geral' | 'funcionarios'>('geral')

  const [stats, setStats] = useState({
    clientes: 0, pets: 0, consultas: 0, vacinas: 0,
    agendamentos: 0, receita: 0, receitaPendente: 0,
  })

  const [chartServicos, setChartServicos] = useState<{ name: string; total: number }[]>([])
  const [chartReceita,  setChartReceita]  = useState<{ name: string; valor: number }[]>([])
  const [chartStatus,   setChartStatus]   = useState<{ name: string; value: number }[]>([])
  const [funcionarios,  setFuncionarios]  = useState<FuncionarioStats[]>([])

  useEffect(() => { load() }, [periodo])

  const load = async () => {
    setLoading(true)
    const { inicio, fim } = getRange(periodo)

    try {
      const [
        { count: clientes },
        { count: pets },
        { count: consultas },
        { count: vacinas },
        { count: agendamentos },
      ] = await Promise.all([
        supabase.from('clientes').select('*', { count: 'exact', head: true }),
        supabase.from('pets').select('*', { count: 'exact', head: true }),
        supabase.from('consultas').select('*', { count: 'exact', head: true })
          .gte('data_consulta', inicio).lte('data_consulta', fim),
        supabase.from('vacinas').select('*', { count: 'exact', head: true })
          .gte('data_aplicacao', inicio).lte('data_aplicacao', fim),
        supabase.from('agendamentos').select('*', { count: 'exact', head: true })
          .gte('data', inicio).lte('data', fim),
      ])

      const { data: pags } = await supabase.from('pagamentos').select('valor, status, data_pagamento')
        .gte('data_pagamento', inicio).lte('data_pagamento', fim)
      const receita         = pags?.filter(p => p.status === 'pago').reduce((s, p) => s + +p.valor, 0) ?? 0
      const receitaPendente = pags?.filter(p => p.status === 'pendente').reduce((s, p) => s + +p.valor, 0) ?? 0

      setStats({
        clientes: clientes ?? 0, pets: pets ?? 0,
        consultas: consultas ?? 0, vacinas: vacinas ?? 0,
        agendamentos: agendamentos ?? 0, receita, receitaPendente,
      })

      const { data: servData } = await supabase.from('agendamentos').select('tipo_servico')
        .gte('data', inicio).lte('data', fim)
      const mapServ: Record<string, number> = {}
      servData?.forEach(s => { mapServ[s.tipo_servico] = (mapServ[s.tipo_servico] || 0) + 1 })
      setChartServicos(
        Object.entries(mapServ)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 7)
          .map(([name, total]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), total }))
      )

      buildChartReceita(pags ?? [], periodo, inicio)

      const { data: agData } = await supabase.from('agendamentos').select('status')
        .gte('data', inicio).lte('data', fim)
      const mapStatus: Record<string, number> = {}
      agData?.forEach(a => { mapStatus[a.status] = (mapStatus[a.status] || 0) + 1 })
      const statusLabels: Record<string, string> = {
        agendado: 'Agendado', confirmado: 'Confirmado',
        concluido: 'Concluído', cancelado: 'Cancelado',
      }
      setChartStatus(
        Object.entries(mapStatus).map(([k, v]) => ({ name: statusLabels[k] ?? k, value: v }))
      )

      await loadFuncionarios(inicio, fim)

    } finally {
      setLoading(false)
    }
  }

  const buildChartReceita = (
    pags: { valor: string | number; status: string; data_pagamento: string }[],
    per: Periodo,
    inicio: string
  ) => {
    const pagos = pags.filter(p => p.status === 'pago')
    if (per === 'anual') {
      const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
      const map: Record<number, number> = {}
      pagos.forEach(p => {
        const m = new Date(p.data_pagamento).getMonth()
        map[m] = (map[m] || 0) + +p.valor
      })
      setChartReceita(meses.map((name, i) => ({ name, valor: map[i] ?? 0 })))
    } else if (per === 'mensal') {
      const map: Record<string, number> = {}
      pagos.forEach(p => {
        const d = new Date(p.data_pagamento)
        const semana = `S${Math.ceil(d.getDate() / 7)}`
        map[semana] = (map[semana] || 0) + +p.valor
      })
      setChartReceita(Object.entries(map).sort().map(([name, valor]) => ({ name, valor })))
    } else {
      const map: Record<string, number> = {}
      pagos.forEach(p => {
        map[p.data_pagamento] = (map[p.data_pagamento] || 0) + +p.valor
      })
      setChartReceita(
        Object.entries(map).sort().map(([d, valor]) => ({ name: fmtData(d), valor }))
      )
    }
  }

  const loadFuncionarios = async (inicio: string, fim: string) => {
    const { data: users } = await supabase.from('usuarios')
      .select('id, nome, role').in('role', ['veterinario', 'rececionista']).eq('ativo', true)
    if (!users) return

    const result: FuncionarioStats[] = await Promise.all(
      users.map(async u => {
        if (u.role === 'veterinario') {
          const [{ count: consultas }, { count: vacinas }, { count: agendamentos }] = await Promise.all([
            supabase.from('consultas').select('*', { count: 'exact', head: true })
              .eq('veterinario_id', u.id).gte('data_consulta', inicio).lte('data_consulta', fim),
            supabase.from('vacinas').select('*', { count: 'exact', head: true })
              .eq('veterinario_id', u.id).gte('data_aplicacao', inicio).lte('data_aplicacao', fim),
            supabase.from('agendamentos').select('*', { count: 'exact', head: true })
              .eq('veterinario_id', u.id).gte('data', inicio).lte('data', fim),
          ])
          return { id: u.id, nome: u.nome, role: u.role, consultas: consultas ?? 0, vacinas: vacinas ?? 0, agendamentos: agendamentos ?? 0, receitaGerada: 0 }
        } else {
          const [{ count: agendamentos }, { data: pags }] = await Promise.all([
            supabase.from('agendamentos').select('*', { count: 'exact', head: true })
              .gte('data', inicio).lte('data', fim),
            supabase.from('pagamentos').select('valor').eq('status', 'pago')
              .gte('data_pagamento', inicio).lte('data_pagamento', fim),
          ])
          const receitaGerada = pags?.reduce((s, p) => s + +p.valor, 0) ?? 0
          return { id: u.id, nome: u.nome, role: u.role, consultas: 0, vacinas: 0, agendamentos: agendamentos ?? 0, receitaGerada }
        }
      })
    )
    setFuncionarios(result)
  }

  // ── exportar PDF: captura o conteúdo completo das duas secções ──────────────
  const exportarPDF = async () => {
    setExporting(true)
    const { inicio, fim } = getRange(periodo)

    try {
      // Mostrar as duas secções ao mesmo tempo durante a exportação
      const geralEl   = document.getElementById('pdf-secao-geral')
      const funcEl    = document.getElementById('pdf-secao-funcionarios')

      if (geralEl)  geralEl.style.display  = 'block'
      if (funcEl)   funcEl.style.display   = 'block'

      // Aguardar re-render dos gráficos
      await new Promise(r => setTimeout(r, 500))

      await exportarParaPDF('relatorio-print', {
        filename: `relatorio-weza-${periodo}-${new Date().toISOString().split('T')[0]}.pdf`,
        title: 'Clínica WEZA',
        subtitle: `Relatório ${periodoLabel[periodo]}`,
        periodo: `${fmtData(inicio)} a ${fmtData(fim)}`,
        incluirDataGeracao: true,
      })

    } catch (error) {
      console.error('Erro ao exportar PDF:', error)
      window.print()
    } finally {
      setExporting(false)
    }
  }

  const { inicio, fim } = getRange(periodo)

  // ─── render ───────────────────────────────────────────────────────────────
  return (
    <AppLayout>
      <style>{`
        @media print {
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          body { margin: 0; padding: 0; background: white; }
          body * { visibility: hidden !important; }
          #relatorio-print, #relatorio-print * { visibility: visible !important; }
          #relatorio-print { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
          .card { page-break-inside: avoid; border: 1px solid #e2e8f0; margin-bottom: 24px; background: white; }
          h1, h2, h3 { page-break-after: avoid; }
          svg { page-break-inside: avoid; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #e2e8f0; padding: 12px; text-align: left; }
          th { background-color: #f1f5f9; font-weight: bold; }
        }
      `}</style>

      <div className="space-y-6">

        {/* ── cabeçalho ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Relatórios</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              {fmtData(inicio)} → {fmtData(fim)}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <select
                value={periodo}
                onChange={e => setPeriodo(e.target.value as Periodo)}
                className="input-field pr-9 appearance-none cursor-pointer text-sm py-2"
              >
                <option value="semanal">Semanal</option>
                <option value="mensal">Mensal</option>
                <option value="anual">Anual</option>
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            <button
              onClick={exportarPDF}
              disabled={exporting || loading}
              className="btn-primary gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {exporting ? (
                <><Loader2 size={15} className="animate-spin" /> A gerar PDF...</>
              ) : (
                <><Download size={15} /> Exportar PDF</>
              )}
            </button>
          </div>
        </div>

        {/* ── abas ── */}
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800/50 rounded-xl p-1 w-fit no-print">
          {(['geral', 'funcionarios'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === tab
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              {tab === 'geral' ? 'Geral' : 'Por Funcionário'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-emerald-500 border-t-transparent" />
          </div>
        ) : (
          /* ══ CONTEÚDO PARA CAPTURA PDF ══ */
          <div id="relatorio-print">

            {/* Cabeçalho visível apenas na impressão */}
            <div className="hidden print:block mb-8 pb-4 border-b-2 border-slate-200">
              <h1 className="text-2xl font-bold">Clínica WEZA — {periodoLabel[periodo]}</h1>
              <p className="text-slate-500 mt-1">Período: {fmtData(inicio)} a {fmtData(fim)}</p>
              <p className="text-slate-400 text-sm">Gerado em {fmtData(new Date().toISOString().split('T')[0])}</p>
            </div>

            {/* ══ SECÇÃO GERAL ══ */}
            <div
              id="pdf-secao-geral"
              style={{ display: activeTab === 'geral' ? 'block' : 'none' }}
            >
              {/* Título da secção (só no PDF) */}
              <div className="hidden print:block mb-4">
                <h2 className="text-lg font-bold text-slate-800 border-b border-slate-200 pb-2">
                  📊 Relatório Geral
                </h2>
              </div>

              {/* cards de resumo */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { icon: Users,       label: 'Total Clientes',    value: stats.clientes,                             color: 'bg-blue-500',    sub: 'registados' },
                  { icon: PawPrint,    label: 'Total Pets',        value: stats.pets,                                 color: 'bg-emerald-500', sub: 'registados' },
                  { icon: Stethoscope, label: 'Consultas',         value: stats.consultas,                            color: 'bg-purple-500',  sub: periodoLabel[periodo] },
                  { icon: Syringe,     label: 'Vacinas',           value: stats.vacinas,                              color: 'bg-pink-500',    sub: periodoLabel[periodo] },
                  { icon: Calendar,    label: 'Agendamentos',      value: stats.agendamentos,                         color: 'bg-amber-500',   sub: periodoLabel[periodo] },
                  { icon: DollarSign,  label: 'Receita Recebida',  value: fmtMoeda(stats.receita),                    color: 'bg-green-600',   sub: 'pagamentos concluídos' },
                  { icon: Clock,       label: 'Receita Pendente',  value: fmtMoeda(stats.receitaPendente),            color: 'bg-orange-500',  sub: 'a receber' },
                  { icon: TrendingUp,  label: 'Total Movimentado', value: fmtMoeda(stats.receita + stats.receitaPendente), color: 'bg-slate-600', sub: 'pago + pendente' },
                ].map(({ icon: Icon, label, value, color, sub }) => (
                  <div key={label} className="card">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">{label}</p>
                        <p className="text-xl font-bold text-slate-900 dark:text-white mt-0.5 truncate">{value}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
                      </div>
                      <div className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center ${color}`}>
                        <Icon size={18} className="text-white" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* gráfico receita */}
              <div className="card mt-6">
                <h2 className="text-base font-bold text-slate-900 dark:text-white mb-5 flex items-center gap-2">
                  <DollarSign size={16} className="text-emerald-500" />
                  Evolução da Receita
                  <span className="text-xs font-normal text-slate-400 ml-1">({periodoLabel[periodo]})</span>
                </h2>
                {chartReceita.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={chartReceita} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                      <Tooltip
                        formatter={(v: any) => [fmtMoeda(v), 'Receita']}
                        contentStyle={{ borderRadius: '10px', border: 'none', background: '#1e293b', color: '#f1f5f9', fontSize: 12 }}
                      />
                      <Line type="monotone" dataKey="valor" stroke="#10b981" strokeWidth={2.5} dot={{ fill: '#10b981', r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : <p className="text-slate-400 text-center py-12 text-sm">Sem dados de receita para este período</p>}
              </div>

              {/* 2 gráficos lado a lado */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                <div className="card">
                  <h2 className="text-base font-bold text-slate-900 dark:text-white mb-5 flex items-center gap-2">
                    <FileText size={16} className="text-blue-500" />
                    Serviços Realizados
                  </h2>
                  {chartServicos.length > 0 ? (
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={chartServicos} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                        <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#94a3b8' }} width={80} />
                        <Tooltip contentStyle={{ borderRadius: '10px', border: 'none', background: '#1e293b', color: '#f1f5f9', fontSize: 12 }} />
                        <Bar dataKey="total" fill="#3b82f6" radius={[0, 6, 6, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <p className="text-slate-400 text-center py-12 text-sm">Sem serviços no período</p>}
                </div>

                <div className="card">
                  <h2 className="text-base font-bold text-slate-900 dark:text-white mb-5 flex items-center gap-2">
                    <Calendar size={16} className="text-amber-500" />
                    Status dos Agendamentos
                  </h2>
                  {chartStatus.length > 0 ? (
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie data={chartStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85}
                          label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                          {chartStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '10px', border: 'none', background: '#1e293b', color: '#f1f5f9', fontSize: 12 }} />
                        <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : <p className="text-slate-400 text-center py-12 text-sm">Sem agendamentos no período</p>}
                </div>
              </div>
            </div>

            {/* ══ SECÇÃO FUNCIONÁRIOS ══ */}
            <div
              id="pdf-secao-funcionarios"
              style={{ display: activeTab === 'funcionarios' ? 'block' : 'none' }}
            >
              {/* Separador para o PDF (quando ambas as secções estão visíveis) */}
              <div className="hidden print:block mt-8 mb-4 pt-4 border-t-2 border-slate-200">
                <h2 className="text-lg font-bold text-slate-800">👥 Relatório por Funcionário</h2>
              </div>

              <div className="space-y-6">
                <div className="card p-0 overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
                    <Users size={16} className="text-slate-400" />
                    <span className="font-semibold text-sm text-slate-700 dark:text-slate-300">
                      Relatório de Trabalho — {periodoLabel[periodo]}
                    </span>
                    <span className="ml-auto text-xs text-slate-400">{funcionarios.length} funcionário(s)</span>
                  </div>

                  {funcionarios.length === 0 ? (
                    <p className="text-slate-400 text-center py-12 text-sm">Sem funcionários registados</p>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-700">
                      {funcionarios.map(f => (
                        <div key={f.id} className="px-6 py-5">
                          <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-700 dark:text-emerald-400 font-bold">
                                {f.nome.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{f.nome}</p>
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                  f.role === 'veterinario'
                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                }`}>
                                  {f.role === 'veterinario' ? 'Veterinário' : 'Rececionista'}
                                </span>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-3">
                              {f.role === 'veterinario' ? (
                                <>
                                  <Metrica icon={Stethoscope} label="Consultas"    value={f.consultas}    color="text-purple-500" />
                                  <Metrica icon={Syringe}     label="Vacinas"      value={f.vacinas}      color="text-pink-500" />
                                  <Metrica icon={Calendar}    label="Agendamentos" value={f.agendamentos} color="text-amber-500" />
                                  <Metrica icon={TrendingUp}  label="Total actos"  value={f.consultas + f.vacinas} color="text-emerald-500" />
                                </>
                              ) : (
                                <>
                                  <Metrica icon={Calendar}   label="Agendamentos"  value={f.agendamentos}          color="text-amber-500" />
                                  <Metrica icon={DollarSign} label="Receita gerida" value={fmtMoeda(f.receitaGerada)} color="text-green-600" />
                                </>
                              )}
                            </div>
                          </div>

                          {f.role === 'veterinario' && f.consultas + f.vacinas > 0 && (
                            <div className="mt-4">
                              <div className="flex gap-1 text-xs text-slate-400 mb-1.5">
                                <span>Distribuição de actos clínicos</span>
                              </div>
                              <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
                                {f.consultas > 0 && (
                                  <div
                                    className="bg-purple-500 rounded-full"
                                    style={{ width: `${(f.consultas / (f.consultas + f.vacinas)) * 100}%` }}
                                    title={`Consultas: ${f.consultas}`}
                                  />
                                )}
                                {f.vacinas > 0 && (
                                  <div
                                    className="bg-pink-500 rounded-full"
                                    style={{ width: `${(f.vacinas / (f.consultas + f.vacinas)) * 100}%` }}
                                    title={`Vacinas: ${f.vacinas}`}
                                  />
                                )}
                              </div>
                              <div className="flex gap-4 mt-1.5 text-xs text-slate-400">
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500 inline-block" />Consultas</span>
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-pink-500 inline-block" />Vacinas</span>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Tabela resumo (boa para PDF) */}
                {funcionarios.length > 0 && (
                  <div className="card overflow-hidden">
                    <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4">
                      Resumo Tabular
                    </h2>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800">
                          <th className="text-left px-4 py-3 text-slate-600 dark:text-slate-400 font-semibold">Funcionário</th>
                          <th className="text-left px-4 py-3 text-slate-600 dark:text-slate-400 font-semibold">Cargo</th>
                          <th className="text-center px-4 py-3 text-slate-600 dark:text-slate-400 font-semibold">Consultas</th>
                          <th className="text-center px-4 py-3 text-slate-600 dark:text-slate-400 font-semibold">Vacinas</th>
                          <th className="text-center px-4 py-3 text-slate-600 dark:text-slate-400 font-semibold">Agendamentos</th>
                          <th className="text-right px-4 py-3 text-slate-600 dark:text-slate-400 font-semibold">Receita/Actos</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {funcionarios.map(f => (
                          <tr key={f.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{f.nome}</td>
                            <td className="px-4 py-3">
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                f.role === 'veterinario'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-emerald-100 text-emerald-700'
                              }`}>
                                {f.role === 'veterinario' ? 'Veterinário' : 'Rececionista'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center text-slate-700 dark:text-slate-300">{f.role === 'veterinario' ? f.consultas : '—'}</td>
                            <td className="px-4 py-3 text-center text-slate-700 dark:text-slate-300">{f.role === 'veterinario' ? f.vacinas : '—'}</td>
                            <td className="px-4 py-3 text-center text-slate-700 dark:text-slate-300">{f.agendamentos}</td>
                            <td className="px-4 py-3 text-right font-semibold text-slate-800 dark:text-slate-200">
                              {f.role === 'veterinario'
                                ? `${f.consultas + f.vacinas} actos`
                                : fmtMoeda(f.receitaGerada)
                              }
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* gráfico comparativo */}
                {funcionarios.length > 1 && (
                  <div className="card">
                    <h2 className="text-base font-bold text-slate-900 dark:text-white mb-5">Comparativo Visual</h2>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart
                        data={funcionarios.map(f => ({
                          name: f.nome.split(' ')[0],
                          Consultas: f.consultas,
                          Vacinas: f.vacinas,
                          Agendamentos: f.agendamentos,
                        }))}
                        margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                        <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                        <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} />
                        <Tooltip contentStyle={{ borderRadius: '10px', border: 'none', background: '#1e293b', color: '#f1f5f9', fontSize: 12 }} />
                        <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
                        <Bar dataKey="Consultas"    fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Vacinas"      fill="#ec4899" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Agendamentos" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}
      </div>
    </AppLayout>
  )
}

// ─── sub-componente ────────────────────────────────────────────────────────────
function Metrica({ icon: Icon, label, value, color }: {
  icon: any; label: string; value: string | number; color: string
}) {
  return (
    <div className="flex flex-col items-center bg-slate-50 dark:bg-slate-800/50 rounded-xl px-4 py-2.5 min-w-[80px]">
      <Icon size={15} className={`${color} mb-1`} />
      <p className="text-base font-bold text-slate-900 dark:text-white leading-tight">{value}</p>
      <p className="text-xs text-slate-400 mt-0.5">{label}</p>
    </div>
  )
}
