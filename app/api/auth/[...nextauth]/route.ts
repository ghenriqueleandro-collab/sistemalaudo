/**
 * SALVAR EM: src/app/api/auth/[...nextauth]/route.ts
 */

import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { Redis } from '@upstash/redis'
import bcrypt from 'bcryptjs'

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

const handler = NextAuth({
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: 'jwt', maxAge: 60 * 60 * 8 },
  pages: { signIn: '/', error: '/' },
  providers: [
    CredentialsProvider({
      name: 'Lesath Login',
      credentials: {
        email: { label: 'E-mail', type: 'email' },
        password: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase()
        const password = credentials?.password

        if (!email || !password) return null

        // Admin via variáveis de ambiente
        const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase()
        const adminPassword = process.env.ADMIN_PASSWORD
        if (email === adminEmail && password === adminPassword) {
          return {
            id: 'admin',
            name: 'Administrador Lesath',
            email: adminEmail,
            perfil: 'admin',
            permissoes: {},
            empresaClienteId: undefined,
            empresaNome: undefined,
          }
        }

        // Usuários no Redis
        const usuario = await redis.get<any>(`usuario:${email}`)
        if (!usuario || !usuario.ativo) return null

        const senhaCorreta = await bcrypt.compare(password, usuario.senhaHash)
        if (!senhaCorreta) return null

        return {
          id: usuario.id,
          name: usuario.nome,
          email: usuario.email,
          perfil: usuario.perfil,
          permissoes: usuario.permissoes ?? {},
          empresaClienteId: usuario.empresaClienteId ?? null,
          empresaNome: usuario.empresaNome ?? null,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      // No login: popula o token com todos os campos do usuário
      if (user) {
        token.id             = (user as any).id
        token.perfil         = (user as any).perfil
        token.permissoes     = (user as any).permissoes ?? {}
        token.empresaClienteId = (user as any).empresaClienteId ?? null
        token.empresaNome    = (user as any).empresaNome ?? null
      }

      // A cada renovação do token (update ou chamadas subsequentes):
      // re-lê o usuário do Redis para pegar empresaClienteId atualizado.
      // Isso garante que vinculações feitas após o login apareçam sem
      // precisar fazer logout/login.
      if (token.email && token.perfil === 'cliente') {
        try {
          const email = (token.email as string).trim().toLowerCase()
          const usuarioAtual = await redis.get<any>(`usuario:${email}`)
          if (usuarioAtual) {
            token.empresaClienteId = usuarioAtual.empresaClienteId ?? null
            token.empresaNome      = usuarioAtual.empresaNome ?? null
            token.permissoes       = usuarioAtual.permissoes ?? {}
            token.perfil           = usuarioAtual.perfil
          }
        } catch {
          // Silencioso — mantém o token como está
        }
      }

      return token
    },

    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id              = token.id
        session.user.name                     = token.name
        session.user.email                    = token.email as string
        ;(session.user as any).perfil         = token.perfil
        ;(session.user as any).permissoes     = token.permissoes ?? {}
        ;(session.user as any).empresaClienteId = token.empresaClienteId ?? null
        ;(session.user as any).empresaNome    = token.empresaNome ?? null
      }
      return session
    },
  },
})

export { handler as GET, handler as POST }
