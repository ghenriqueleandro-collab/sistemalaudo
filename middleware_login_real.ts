export { default } from 'next-auth/middleware'

export const config = {
  matcher: ['/meus-laudos/:path*', '/novo-laudo/:path*', '/relatorios/:path*'],
}
