/**
 * SALVAR EM: src/app/api/usuarios/[id]/route.ts
 * (pasta [id] com colchetes)
 */

export const runtime = 'nodejs'

import { Redis } from '@upstash/redis'
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

type Params = { params: Promise<{ id: string }> }

// PUT /api/usuarios/:id — atualiza permissões / perfil / status
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const dados = await request.json()

    const existente = await redis.get<any>(`usuario:${id}`)
    if (!existente) {
      return NextResponse.json({ erro: 'Usuário não encontrado.' }, { status: 404 })
    }

    // Se vier nova senha, faz o hash
    let senhaHash = existente.senhaHash
    if (dados.senha) {
      senhaHash = await bcrypt.hash(dados.senha, 10)
      delete dados.senha
    }

    const atualizado = {
      ...existente,
      ...dados,
      senhaHash,
      id: existente.id,
      email: existente.email,
      atualizadoEm: new Date().toISOString(),
    }

    await redis.set(`usuario:${id}`, atualizado)

    const { senhaHash: _, ...semHash } = atualizado
    return NextResponse.json(semHash)
  } catch (erro) {
    console.error('[PUT /api/usuarios/:id]', erro)
    return NextResponse.json({ erro: 'Erro ao atualizar usuário.' }, { status: 500 })
  }
}

// DELETE /api/usuarios/:id — remove usuário
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params

    await Promise.all([
      redis.del(`usuario:${id}`),
      redis.srem('usuario_ids', id),
    ])

    return NextResponse.json({ sucesso: true })
  } catch (erro) {
    console.error('[DELETE /api/usuarios/:id]', erro)
    return NextResponse.json({ erro: 'Erro ao remover usuário.' }, { status: 500 })
  }
}
