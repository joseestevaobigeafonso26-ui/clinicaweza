# Documentação das Mudanças de RBAC

## 📋 Resumo

O sistema de controle de acesso baseado em papéis (RBAC) foi atualizado para aplicar as seguintes restrições:

- **Administrador**: Controla **tudo** do sistema
- **Veterinário**: Controla **apenas** Pets, Agendamentos, Consultas e Vacinas
- **Rececionista**: Controla **apenas** Clientes, Pets, Pagamentos e Agendamentos
- **Cliente**: Acesso apenas aos seus próprios dados

## 🔄 Mudanças Realizadas

### 1. `src/lib/rbac.ts` - Atualização de Permissões

#### Antes:
```typescript
veterinario: [
  'manage_pets',
  'manage_agendamentos',
  'manage_consultas',
  'manage_vacinas',
  'view_clientes',        // ❌ Removido
  'view_dashboard',       // ❌ Removido
  'view_relatorios',      // ❌ Removido
],

rececionista: [
  'manage_clientes',
  'manage_pagamentos',
  'manage_agendamentos',
  'view_pets',           // ✅ Alterado para manage_pets
  'view_consultas',      // ❌ Removido
  'view_vacinas',        // ❌ Removido
  'view_dashboard',      // ❌ Removido
],
```

#### Depois:
```typescript
veterinario: [
  'manage_pets',
  'manage_agendamentos',
  'manage_consultas',
  'manage_vacinas',
  // Sem Dashboard, Relatórios ou Cliente views
],

rececionista: [
  'manage_clientes',
  'manage_pets',         // ✅ manage, não view
  'manage_pagamentos',
  'manage_agendamentos',
  // Sem Consultas, Vacinas, Relatórios ou Dashboard
],
```

#### Mudanças em `ROLE_ROUTES`:

```typescript
veterinario: [
  '/pets',
  '/agendamentos',
  '/consultas',
  '/vacinas',
  // Sem /dashboard, /relatorios
],

rececionista: [
  '/clientes',
  '/pets',
  '/agendamentos',
  '/pagamentos',
  // Sem /dashboard, /consultas, /vacinas, /relatorios
],
```

### 2. `src/components/AppLayout.tsx` - Atualização do Menu

#### Antes:
```typescript
{ icon: Home,    label: 'Dashboard', path: '/dashboard', 
  roles: ['admin', 'veterinario', 'rececionista'] }, // ❌ VET e RECEP viam
```

#### Depois:
```typescript
{ icon: Home,    label: 'Dashboard', path: '/dashboard', 
  roles: ['admin'] }, // ✅ Apenas Admin
```

**Menu atualizado por papel:**

| Menu Item | Admin | Veterinário | Rececionista |
|-----------|-------|-------------|--------------|
| Dashboard | ✅ | ❌ | ❌ |
| Clientes | ✅ | ❌ | ✅ |
| Pets | ✅ | ✅ | ✅ |
| Agendamentos | ✅ | ✅ | ✅ |
| Consultas | ✅ | ✅ | ❌ |
| Vacinas | ✅ | ✅ | ❌ |
| Pagamentos | ✅ | ❌ | ✅ |
| Relatórios | ✅ | ❌ | ❌ |
| Configurações | ✅ | ❌ | ❌ |

### 3. `src/middleware.ts` - Proteção de Rotas (Server-side)

**Adicionado:**
- Verificação de RBAC no middleware (server-side)
- Controle de acesso baseado em `ROLE_ROUTES`
- Redirecionamento automático para primeira rota permitida se usuário tenta acessar rota não autorizada

```typescript
// Novo: verifica role do usuário na database
const userRole = /* fetch from usuarios table */

// Novo: valida se rota é permitida para o role
const isAllowed = allowedRoutes.some(route => pathname.startsWith(route))

// Novo: redireciona para rota permitida se não autorizado
if (!isAllowed) {
  return NextResponse.redirect(firstAllowedRoute)
}
```

## 🔒 Fluxo de Segurança

1. **Autenticação** → Usuário faz login
2. **Middleware** → Verifica role e valida acesso à rota
3. **Navigation** → Menu exibe apenas itens permitidos
4. **Components** → `ProtectedComponent` e `usePermission()` validam permissões
5. **API** → Rotas de API devem validar no backend

## 🚀 Como Testar

### Teste 1: Menu do Veterinário
1. Faça login como veterinário
2. Verifique que vê **apenas**: Pets, Agendamentos, Consultas, Vacinas
3. Dashboard, Clientes, Pagamentos não devem aparecer

### Teste 2: Menu do Rececionista
1. Faça login como rececionista
2. Verifique que vê **apenas**: Clientes, Pets, Agendamentos, Pagamentos
3. Consultas, Vacinas, Dashboard não devem aparecer

### Teste 3: Proteção de Rota
1. Faça login como veterinário
2. Tente acessar `/pagamentos` diretamente na URL
3. Deve ser redirecionado para `/pets` (primeira rota permitida)

### Teste 4: Proteção de Componente
1. Use `<ProtectedComponent permission="manage_pagamentos">` numa página
2. Para veterinário: conteúdo não deve aparecer
3. Para rececionista e admin: conteúdo deve aparecer

## 📝 Arquivos Modificados

- ✅ `src/lib/rbac.ts` - Permissões e rotas
- ✅ `src/components/AppLayout.tsx` - Menu items
- ✅ `src/middleware.ts` - Proteção de rotas (server-side)
- ✅ `SUPABASE_SETUP.md` - Schema e RLS queries (novo)

## 📚 Próximos Passos Recomendados

### 1. Aplicar RLS no Supabase (Recomendado)
Ver arquivo `SUPABASE_SETUP.md` para queries SQL completas.

```bash
# RLS protege dados a nível de database
# Mesmo que alguém burle a UI, os dados estão protegidos
```

### 2. Validar APIs
Cada rota `/api` deve:
```typescript
// Usar getUser() para autenticação
const { data: { user } } = await supabase.auth.getUser()

// Buscar role do usuário
const { data: usuario } = await supabase
  .from('usuarios')
  .select('role')
  .eq('id', user.id)
  .single()

// Validar permissão antes de processar
if (usuario.role !== 'admin' && usuario.role !== 'veterinario') {
  return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
}
```

### 3. Testes Automatizados (Opcional)
Criar testes E2E para validar RBAC em cada página.

## 🔍 Verificação Rápida

Para verificar se as permissões estão corretas:

```bash
# Abrir DevTools (F12)
# Ir para Console e digitar:

import { usePermission } from '@/hooks/usePermission'
const { hasPermission } = usePermission()

# Testar permissão
hasPermission('manage_pets')        // true ou false
hasPermission('manage_pagamentos')  // true ou false
```

## ⚠️ Notas Importantes

1. **Rececionista NÃO vê mais Dashboard** - Foi removido conforme requisitos
2. **Veterinário NÃO vê mais Dashboard e Relatórios** - Foi removido conforme requisitos
3. **Rececionista agora gerencia (não apenas vê) Pets** - Alterado de `view_pets` para `manage_pets`
4. **Middleware protege rotas no servidor** - Não apenas no cliente
5. **RLS do Supabase é fortemente recomendado** - Proteção em dobro

## 📞 Suporte

Se houver dúvidas sobre as permissões:

1. Consultar `src/lib/rbac.ts` - Fonte de verdade
2. Consultar `ALL_MENU_ITEMS` em `AppLayout.tsx` - O que aparece na UI
3. Consultar `ROLE_ROUTES` em `rbac.ts` - Rotas permitidas
4. Verificar `middleware.ts` - Proteção server-side
