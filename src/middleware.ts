import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { ROLE_ROUTES } from '@/lib/rbac'
import type { UserRole } from '@/types'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const pathname  = request.nextUrl.pathname
  const isLogin   = pathname === '/login'
  const isPublic  = pathname.startsWith('/_next') || pathname.startsWith('/api/') || pathname === '/favicon.ico'

  if (isPublic) return supabaseResponse

  // Sem sessão → login
  if (!user && !isLogin) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Com sessão na página de login → redirecionar
  if (user && isLogin) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // Verificar permissão de rota
  if (user && !isLogin) {
    let role: UserRole | null = null

    try {
      const { data } = await supabase
        .from('usuarios')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

      role = (data?.role as UserRole) ?? null
    } catch (err) {
      console.error('Middleware - erro ao verificar role:', err)
    }

    if (!role) {
      // Utilizador não encontrado na tabela → forçar logout
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    const allowedRoutes = ROLE_ROUTES[role] ?? []
    const isAllowed = allowedRoutes.some(route => pathname.startsWith(route))

    if (!isAllowed) {
      // Redirecionar para a primeira rota permitida pelo role
      const fallback = allowedRoutes[0] ?? '/login'
      const url = request.nextUrl.clone()
      url.pathname = fallback
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
