# 🔍 Diagnóstico: Usuário Não Consegue Entrar

## Checklist de Diagnóstico

Para encontrar por que o usuário não consegue entrar, verifique cada item:

### 1️⃣ Verificar se Usuário Existe no Supabase Auth

**Via Dashboard Supabase:**
1. Vá a **Authentication → Users**
2. Procure pelo email do usuário
3. Verifique o status (deve estar "Confirmed" ou similar)

**Via SQL (executar no Supabase SQL Editor):**
```sql
-- Ver se existe no auth.users (a tabela de autenticação)
SELECT id, email, email_confirmed_at, created_at 
FROM auth.users 
WHERE email = 'usuario@weza.com';
```

**Se não aparecer:** 
- O usuário nunca foi criado
- Vá para **Passo 4** (criar novo usuário)

---

### 2️⃣ Verificar se Usuário Existe na Tabela `usuarios`

**Via SQL:**
```sql
-- Ver se existe na tabela usuarios
SELECT id, nome, email, role, created_at 
FROM usuarios 
WHERE email = 'usuario@weza.com';
```

**O que verificar:**
- ✅ Existe registro?
- ✅ A coluna `role` tem valor? (não está NULL ou vazio)
- ✅ O email coincide com o do auth.users?

**Se não aparecer:**
- Usuário existe no auth mas não na tabela `usuarios`
- Vá para **Passo 3** (adicionar à tabela)

---

### 3️⃣ Usuário Existe em auth.users mas NÃO em usuarios

**Problema:** O usuário pode fazer login, mas é desconectado porque não está na tabela `usuarios`.

**Solução - Adicionar à tabela usuarios:**

```sql
-- Primeiro, obtenha o UUID do auth.users
SELECT id FROM auth.users WHERE email = 'usuario@weza.com';

-- Depois execute (substitua o UUID):
INSERT INTO usuarios (id, nome, email, role, created_at, updated_at)
VALUES (
  '12345678-1234-1234-1234-123456789012',  -- UUID do auth.users
  'Nome do Usuário',
  'usuario@weza.com',
  'admin',  -- ou 'veterinario', 'rececionista', 'cliente'
  NOW(),
  NOW()
);

-- Verifique se foi inserido:
SELECT * FROM usuarios WHERE email = 'usuario@weza.com';
```

---

### 4️⃣ Usuário NÃO Existe Nem em auth.users

**Solução - Criar novo usuário:**

**Via Dashboard Supabase:**
1. Authentication → Users → Add User
2. Email: usuario@weza.com
3. Password: (gerar senha)
4. Auto confirm: ✅ (marcar!)
5. Save

**Depois, adicione à tabela usuarios (ver Passo 3).**

**Ou via SQL direto:**

```sql
-- Usar a função SQL do Supabase para criar usuário
-- (se tiver permissões)
SELECT auth.uid();  -- Apenas para testar conexão
```

---

## 🛠️ Problemas Comuns e Soluções

### Erro: "Invalid login credentials"
```
Causas possíveis:
1. Email errado
2. Senha errada
3. Usuário não confirmou email
4. Usuário foi deletado

Solução:
- Verificar se email existe em auth.users (Passo 1)
- Se não existir, criar novo (Passo 4)
```

### Erro: "Usuário não encontrado na tabela usuarios"
```
Causa: Usuário existe em auth.users MAS não em usuarios

Solução:
- Executar SQL do Passo 3
- Adicionar usuário à tabela usuarios com role correto
```

### Erro: "Sem permissão"
```
Causa: Usuário é admin mas role está errado na tabela

Solução:
- Verificar role na tabela usuarios (Passo 2)
- UPDATE usuarios SET role = 'admin' WHERE email = '...';
```

### Entra, mas é desconectado imediatamente
```
Causa: role está NULL ou vazio na tabela usuarios

Solução:
UPDATE usuarios SET role = 'cliente' WHERE email = 'usuario@weza.com';
```

---

## 📋 Script Completo de Diagnóstico (SQL)

Execute isto e veja os resultados:

```sql
-- ============================================
-- DIAGNÓSTICO COMPLETO DE UM USUÁRIO
-- ============================================

-- Substitua 'usuario@weza.com' pelo email real
SET @email = 'usuario@weza.com';

-- 1. Existe em auth.users?
SELECT '=== AUTH.USERS ===' as check_name;
SELECT id, email, email_confirmed_at, created_at 
FROM auth.users 
WHERE email = @email;

-- 2. Existe em usuarios?
SELECT '=== USUARIOS TABLE ===' as check_name;
SELECT id, nome, email, role, created_at, updated_at
FROM usuarios 
WHERE email = @email;

-- 3. IDs não batem?
SELECT '=== ID MISMATCH CHECK ===' as check_name;
SELECT 
  a.id as auth_id, 
  u.id as usuarios_id,
  CASE WHEN a.id = u.id THEN '✅ OK' ELSE '❌ MISMATCH' END as status
FROM auth.users a
FULL OUTER JOIN usuarios u ON a.id = u.id
WHERE a.email = @email OR u.email = @email;
```

---

## 🚀 Passo a Passo: Criar Usuário Corretamente

Se o usuário não existe, crie assim:

### Via Dashboard Supabase (Mais Fácil):

1. **Authentication → Users → Add User**
   - Email: usuario@weza.com
   - Password: sua-senha-forte
   - ✅ Auto confirm: ON

2. **Copie o UUID do usuário criado**
   - Deve aparecer após salvar

3. **Execute SQL para adicionar à tabela usuarios:**

```sql
INSERT INTO usuarios (id, nome, email, role)
VALUES (
  'COPIE-O-UUID-AQUI',
  'Nome do Utilizador',
  'usuario@weza.com',
  'admin'  -- ou outro role
);
```

4. **Teste fazer login**

---

## ✅ Verificação Final

Depois de tudo, verifique:

```bash
# 1. Abra o navegador (modo incógnito)
# 2. Vá a: https://seu-app.com/login
# 3. Digite: usuario@weza.com
# 4. Digite a senha
# 5. Aperte Enter

# Se entrar com sucesso: ✅ Pronto!
# Se falhar: Verifique os logs do console (F12)
```

---

## 📝 Info para o Suporte

Se continuar não funcionando, recolha isto:

```sql
-- Seu email
SELECT id, email, role FROM usuarios WHERE email = 'usuario@weza.com';

-- Todos os usuários
SELECT id, email, role FROM usuarios;

-- Copie e cole aqui
```

E diga:
1. Qual é o email que não consegue entrar?
2. Qual é o erro exato?
3. Quando foi o último login bem-sucedido?
