export type UserRole = 'admin' | 'veterinario' | 'rececionista'

export interface Usuario {
  id: string
  nome: string
  email: string
  role: UserRole
  ativo: boolean
  created_at: string
  updated_at: string
}

export interface Cliente {
  id: string
  nome: string
  email?: string
  telefone: string
  endereco?: string
  nif?: string
  created_at: string
  updated_at: string
  pets?: Pet[]
}

export interface Pet {
  id: string
  cliente_id: string
  nome: string
  especie: string
  raca?: string
  sexo?: 'macho' | 'femea'
  data_nascimento?: string
  peso?: number
  cor?: string
  observacoes?: string
  created_at: string
  updated_at: string
  clientes?: Pick<Cliente, 'id' | 'nome' | 'telefone' | 'email'>
}

export interface Agendamento {
  id: string
  pet_id: string
  veterinario_id?: string
  data: string
  hora: string
  tipo_servico: string
  status: 'agendado' | 'confirmado' | 'concluido' | 'cancelado'
  observacoes?: string
  created_at: string
  updated_at: string
  pets?: Pick<Pet, 'id' | 'nome' | 'especie'> & {
    clientes?: Pick<Cliente, 'id' | 'nome' | 'telefone'>
  }
  usuarios?: Pick<Usuario, 'id' | 'nome'>
}

export interface Consulta {
  id: string
  pet_id: string
  veterinario_id?: string
  agendamento_id?: string
  data_consulta: string
  sintomas: string
  diagnostico: string
  tratamento: string
  medicamentos?: string
  observacoes?: string
  proxima_consulta?: string
  created_at: string
  updated_at: string
  pets?: Pick<Pet, 'id' | 'nome' | 'especie'> & {
    clientes?: Pick<Cliente, 'id' | 'nome'>
  }
  usuarios?: Pick<Usuario, 'id' | 'nome'>
}

export interface Vacina {
  id: string
  pet_id: string
  veterinario_id?: string
  tipo_vacina: string
  data_aplicacao: string
  proxima_dose?: string
  lote?: string
  fabricante?: string
  observacoes?: string
  created_at: string
  updated_at: string
  pets?: Pick<Pet, 'id' | 'nome'> & {
    clientes?: Pick<Cliente, 'id' | 'nome'>
  }
  usuarios?: Pick<Usuario, 'id' | 'nome'>
}

export interface Pagamento {
  id: string
  cliente_id: string
  agendamento_id?: string
  descricao: string
  valor: number
  data_pagamento: string
  metodo_pagamento?: 'dinheiro' | 'transferencia' | 'cartao'
  status: 'pago' | 'pendente' | 'cancelado'
  observacoes?: string
  created_at: string
  updated_at: string
  clientes?: Pick<Cliente, 'id' | 'nome' | 'telefone'>
  agendamentos?: Pick<Agendamento, 'id' | 'tipo_servico'>
}
