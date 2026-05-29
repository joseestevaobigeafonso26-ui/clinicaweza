import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const VALID_ROLES = ['admin', 'veterinario', 'rececionista'] as const
type ValidRole = typeof VALID_ROLES[number]

function isValidRole(role: string): role is ValidRole {
  return VALID_ROLES.includes(role as ValidRole)
}

async function verificarAdmin(adminId: string | undefined) {
  if (!adminId) {
    return { ok: false, status: 400, error: 'Sessão inválida. Faça logout e login novamente.' }
  }

  const { data, error } = await supabaseAdmin
    .from('usuarios')
    .select('id, role, ativo')
    .eq('id', adminId)
    .maybeSingle()

  if (error) {
    return { ok: false, status: 500, error: `Erro ao verificar administrador: ${error.message}` }
  }

  if (!data) {
    return { ok: false, status: 403, error: 'Administrador não encontrado.' }
  }

  if (data.role !== 'admin') {
    return { ok: false, status: 403, error: 'Sem permissão. Apenas administradores podem gerir utilizadores.' }
  }

  if (!data.ativo) {
    return { ok: false, status: 403, error: 'Conta de administrador desativada.' }
  }

  return { ok: true, status: 200, error: null }
}

// POST /api/usuarios — criar novo utilizador (apenas admin)
export async function POST(req: Request) {
  try {
    const { nome, email, password, role, adminId } = await req.json()

    if (!nome || !email || !password || !role) {
      return NextResponse.json({ error: 'Campos obrigatórios em falta' }, { status: 400 })
    }

    if (!isValidRole(role)) {
      return NextResponse.json({ error: `Role inválido: "${role}". Use: admin, veterinario ou rececionista` }, { status: 400 })
    }

    const adminCheck = await verificarAdmin(adminId)
    if (!adminCheck.ok) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status })
    }

    // Criar no Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nome, role },
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    // Upsert na tabela — o trigger pode já ter inserido com role errado
    // ON CONFLICT garante que nome e role ficam correctos
    const { error: dbError } = await supabaseAdmin
      .from('usuarios')
      .upsert(
        { id: authData.user.id, nome, email, role, ativo: true },
        { onConflict: 'id' }
      )

    if (dbError) {
      // Reverter criação no Auth se falhar no BD
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json({ error: dbError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, id: authData.user.id })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Erro interno' }, { status: 500 })
  }
}

// PATCH /api/usuarios — activar/desactivar ou mudar role (apenas admin)
export async function PATCH(req: Request) {
  try {
    const { id, role, ativo, adminId } = await req.json()

    if (!id) {
      return NextResponse.json({ error: 'ID do utilizador em falta' }, { status: 400 })
    }

    const adminCheck = await verificarAdmin(adminId)
    if (!adminCheck.ok) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status })
    }

    const updates: Record<string, unknown> = {}
    if (role !== undefined) {
      if (!isValidRole(role)) {
        return NextResponse.json({ error: `Role inválido: "${role}"` }, { status: 400 })
      }
      updates.role = role
    }
    if (ativo !== undefined) updates.ativo = ativo

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Nenhum campo para actualizar' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('usuarios')
      .update(updates)
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Erro interno' }, { status: 500 })
  }
}

// DELETE /api/usuarios — apagar utilizador (apenas admin)
export async function DELETE(req: Request) {
  try {
    const { id, adminId } = await req.json()

    if (!id) {
      return NextResponse.json({ error: 'ID do utilizador em falta' }, { status: 400 })
    }

    if (id === adminId) {
      return NextResponse.json({ error: 'Não pode apagar a sua própria conta' }, { status: 400 })
    }

    const adminCheck = await verificarAdmin(adminId)
    if (!adminCheck.ok) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status })
    }

    // Apagar da tabela primeiro
    const { error: dbError } = await supabaseAdmin
      .from('usuarios')
      .delete()
      .eq('id', id)

    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 400 })

    // Apagar do Auth
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id)
    if (authError) return NextResponse.json({ error: authError.message }, { status: 400 })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Erro interno' }, { status: 500 })
  }
}