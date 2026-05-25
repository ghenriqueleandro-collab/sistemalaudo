/**
 * SALVAR EM: src/app/api/usuarios/vincular-empresa/route.ts
 *
 * Vincula um usuário (perfil cliente) a uma empresa,
 * salvando empresaClienteId e empresaNome no registro do usuário.
 * Esses campos são incluídos no JWT pelo callback jwt() do NextAuth.
 */

import { Redis } from '@upstash/redis'
import { NextRequest, NextResponse } from 'next/server'

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

export async function POST(request: NextRequest) {
  try {
    const { email, empresaClienteId, empresaNome } = await request.json()

    if (!email || !empresaClienteId) {
      return NextResponse.json(
        { erro: 'email e empresaClienteId são obrigatórios.' },
        { status: 400 }
      )
    }

    // Busca o usuário pelo e-mail
    const usuarioKey = `usuario:${email.toLowerCase().trim()}`
    const usuario = await redis.get<any>(usuarioKey)

    if (!usuario) {
      return NextResponse.json(
        { erro: `Usuário não encontrado: ${email}` },
        { status: 404 }
      )
    }

    const atualizado = {
      ...usuario,
      empresaClienteId,
      empresaNome: empresaNome || usuario.nome || email,
      atualizadoEm: new Date().toISOString(),
    }

    await redis.set(usuarioKey, atualizado)

    return NextResponse.json({ sucesso: true })
  } catch (erro) {
    console.error('[POST /api/usuarios/vincular-empresa]', erro)
    return NextResponse.json({ erro: 'Erro interno.' }, { status: 500 })
  }
}
