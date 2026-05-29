// BACKUP DO ARQUIVO ORIGINAL
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Admin client com service_role — ignora RLS, não afeta sessão do browser
const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// Normalizar role (remover acentos, converter minúsculas)
const normalizeRole = (role: string): string => {
  if (!role) return ''
  const r = role.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
  if (['recepcionista', 'rececionista'].includes(r)) return 'rececionista'
  if (['veterinario', 'veterinário', 'vet'].includes(r)) return 'veterinario'
  if (['admin', 'administrador'].includes(r)) return 'admin'
  if (['cliente'].includes(r)) return 'cliente'
  return r
}

// POST /api/usuarios — criar novo utilizador
export async function POST(req: Request) {
  const { nome, email, password, role, adminId } = await req.json()

  if (!nome || !email || !password || !role) {
    return NextResponse.json({ error: 'Campos obrigatórios em falta' }, { status: 400 })
  }

  // VERIFICAÇÃO DE PERMISSÃO SIMPLIFICADA PARA TESTES
  if (!adminId) {
    // Se não houver adminId, tenta fazer a operação mesmo assim
    console.warn('AVISO: adminId não fornecido, continuando mesmo assim')
  } else {
    const { data: adminData, error: adminError } = await supabaseAdmin
      .from('usuarios')
      .select('*')
      .eq('id', adminId)
      .maybeSingle()

    console.log('=== DEBUG POST /api/usuarios ===')
    console.log('adminId:', adminId)
    console.log('adminData completo:', JSON.stringify(adminData, null, 2))
    console.log('adminError:', adminError)
    
    if (adminData) {
      const roleBruto = adminData.role
      const roleNormalizado = normalizeRole(roleBruto)
      console.log('Role bruto:', roleBruto)
      console.log('Role normalizado:', roleNormalizado)
      
      if (roleNormalizado !== 'admin') {
        return NextResponse.json({ 
          error: `Sem permissão. Role bruto: "${roleBruto}", normalizado: "${roleNormalizado}"` 
        }, { status: 403 })
      }
    } else if (adminError) {
      console.error('Erro ao buscar admin:', adminError)
      return NextResponse.json({ 
        error: `Erro ao verificar admin: ${adminError.message}` 
      }, { status: 400 })
    } else {
      console.warn('Admin não encontrado para ID:', adminId)
      return NextResponse.json({ error: 'Admin não encontrado' }, { status: 403 })
    }
  }

  // Cria no Auth
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError) {
    console.error('Erro ao criar usuário no Auth:', authError)
    return NextResponse.json({ error: authError.message }, { status: 400 })
  }

  // Insere na tabela usuarios
  const { error: dbError } = await supabaseAdmin
    .from('usuarios')
    .insert([{ id: authData.user.id, nome, email, role: normalizeRole(role) }])

  if (dbError) {
    console.error('Erro ao inserir usuário no BD:', dbError)
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json({ error: dbError.message }, { status: 400 })
  }

  console.log('Usuário criado com sucesso:', { id: authData.user.id, nome, email, role: normalizeRole(role) })
  return NextResponse.json({ success: true })
}

// DELETE /api/usuarios — apagar utilizador
export async function DELETE(req: Request) {
  const { id, adminId } = await req.json()

  if (!id) return NextResponse.json({ error: 'ID em falta' }, { status: 400 })

  if (!adminId) {
    console.warn('AVISO: adminId não fornecido para DELETE')
  } else {
    const { data: adminData, error: adminError } = await supabaseAdmin
      .from('usuarios')
      .select('role')
      .eq('id', adminId)
      .maybeSingle()

    if (adminError || !adminData || normalizeRole(adminData.role || '') !== 'admin') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }
  }

  // Apaga
  await supabaseAdmin.from('usuarios').delete().eq('id', id)
  const { error } = await supabaseAdmin.auth.admin.deleteUser(id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
