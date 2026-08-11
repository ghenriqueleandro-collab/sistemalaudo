import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const isAuthenticated = !!token
    const pathname = req.nextUrl.pathname
    const isLoginPage = pathname === '/'
    const perfil = (token as any)?.perfil

    // Login: redireciona conforme perfil
    if (isLoginPage && isAuthenticated) {
      if (perfil === 'cliente') {
        return NextResponse.redirect(new URL('/portal', req.url))
      }
      return NextResponse.redirect(new URL('/meus-laudos', req.url))
    }

    // Clientes só podem acessar /portal e /visualizar-laudo
    // Bloqueia acesso a rotas de edição
    if (perfil === 'cliente') {
      const rotasBloqueadas = [
        '/novo-laudo',
        '/laudo/simplificado',
        '/meus-laudos',
        '/agendamentos',
        '/aprovacoes',
        '/empresas',
        '/usuarios',
        '/relatorios',
      ]
      const bloqueado = rotasBloqueadas.some((r) => pathname.startsWith(r))
      if (bloqueado) {
        return NextResponse.redirect(new URL('/portal', req.url))
      }
    }

    return NextResponse.next()
  },
  {
    pages: {
      signIn: '/',
    },
    callbacks: {
      authorized: ({ req, token }) => {
        const pathname = req.nextUrl.pathname

        if (pathname === '/') return true
        if (pathname.startsWith('/api/auth')) return true

        return !!token
      },
    },
  }
)

export const config = {
  matcher: ['/', '/meus-laudos/:path*', '/novo-laudo/:path*', '/laudo/:path*', '/relatorios/:path*', '/visualizar-laudo/:path*', '/portal/:path*', '/aprovacoes/:path*', '/empresas/:path*', '/usuarios/:path*'],
}
