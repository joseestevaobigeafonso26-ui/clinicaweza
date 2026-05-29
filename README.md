# Clínica WEZA - Sistema de Controlo de Pets (Next.js)

Sistema de gestão para clínica veterinária migrado de React/Vite para **Next.js 15 (App Router)**.

## Stack

- **Framework**: Next.js 15 (App Router)
- **Estilização**: Tailwind CSS v4
- **Base de dados**: Supabase (PostgreSQL) — mesmo esquema original
- **Autenticação**: Supabase Auth + middleware Next.js
- **Formulários**: React Hook Form + Zod
- **Gráficos**: Recharts
- **Ícones**: Lucide React

## Configuração

### 1. Instalar dependências
```bash
npm install
```

### 2. Variáveis de ambiente
Copie `.env.local.example` para `.env.local` e preencha:
```
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key
```

### 3. Base de dados
Execute o ficheiro `supabase-schema.sql` no Supabase SQL Editor.

### 4. Executar em desenvolvimento
```bash
npm run dev
```

Acede em http://localhost:3000

## Estrutura

```
src/
├── app/                    # Rotas (App Router)
│   ├── login/             
│   ├── dashboard/         
│   ├── clientes/          
│   ├── pets/              
│   ├── agendamentos/      
│   ├── consultas/         
│   ├── vacinas/           
│   ├── pagamentos/        
│   ├── relatorios/        
│   └── configuracoes/     
├── components/
│   └── AppLayout.tsx       # Sidebar + Header
├── contexts/
│   └── AuthContext.tsx     # Autenticação global
├── lib/supabase/
│   ├── client.ts           # Cliente browser
│   └── server.ts           # Cliente server
└── types/index.ts          # Tipos TypeScript
```

## Credenciais de Teste

| Perfil | Email | Senha |
|--------|-------|-------|
| Admin | admin@weza.ao | admin123 |
| Veterinário | vet@weza.ao | vet123 |
| Rececionista | recep@weza.ao | recep123 |
