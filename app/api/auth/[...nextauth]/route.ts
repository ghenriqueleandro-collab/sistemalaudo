/**
 * SALVAR EM: src/app/api/auth/[...nextauth]/route.ts
 * (substitui o route.ts atual do NextAuth)
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

        // Verifica admin via variáveis de ambiente (conta raiz)
        const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase()
        const adminPassword = process.env.ADMIN_PASSWORD
        if (email === adminEmail && password === adminPassword) {
          return {
            id: 'admin',
            name: 'Administrador Lesath',
            email: adminEmail,
            perfil: 'admin',
          }
        }

        // Verifica usuários cadastrados no Redis
        const usuario = await redis.get<any>(`usuario:${email}`)
        if (!usuario) return null
        if (!usuario.ativo) return null

        const senhaCorreta = await bcrypt.compare(password, usuario.senhaHash)
        if (!senhaCorreta) return null

        return {
          id: usuario.id,
          name: usuario.nome,
          email: usuario.email,
          perfil: usuario.perfil,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id
        token.name = user.name
        token.email = user.email
        token.perfil = (user as any).perfil
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id
        session.user.name = token.name
        session.user.email = token.email as string
        ;(session.user as any).perfil = token.perfil
      }
      return session
    },
  },
})

export { handler as GET, handler as POST }
