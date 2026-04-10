import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const isAuthenticated = !!token
    const isLoginPage = req.nextUrl.pathname === '/'

    if (isLoginPage && isAuthenticated) {
      return NextResponse.redirect(new URL('/meus-laudos', req.url))
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
  matcher: ['/', '/meus-laudos/:path*', '/novo-laudo/:path*', '/relatorios/:path*', '/visualizar-laudo/:path*'],
}
