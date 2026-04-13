/**
 * SALVAR EM: src/app/api/laudos/[id]/route.ts
 *
 * A pasta deve se chamar literalmente [id] com os colchetes.
 */

import { Redis } from '@upstash/redis'
import { NextRequest, NextResponse } from 'next/server'

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

type Params = { params: { id: string } }

// GET /api/laudos/:id
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const laudo = await redis.get<any>(`laudo:${params.id}`)

    if (!laudo) {
      return NextResponse.json({ erro: 'Laudo não encontrado.' }, { status: 404 })
    }

    return NextResponse.json(laudo)
  } catch (erro) {
    console.error('[GET /api/laudos/:id]', erro)
    return NextResponse.json({ erro: 'Erro ao buscar laudo.' }, { status: 500 })
  }
}

// PUT /api/laudos/:id → atualiza laudo existente
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const existente = await redis.get<any>(`laudo:${params.id}`)

    if (!existente) {
      return NextResponse.json({ erro: 'Laudo não encontrado.' }, { status: 404 })
    }

    const dados = await request.json()

    const laudoAtualizado = {
      ...existente,
      ...dados,
      id: params.id,
      criadoEm: existente.criadoEm,
      atualizadoEm: new Date().toISOString(),
    }

    await redis.set(`laudo:${params.id}`, laudoAtualizado)

    return NextResponse.json(laudoAtualizado)
  } catch (erro) {
    console.error('[PUT /api/laudos/:id]', erro)
    return NextResponse.json({ erro: 'Erro ao atualizar laudo.' }, { status: 500 })
  }
}

// DELETE /api/laudos/:id
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const existente = await redis.get<any>(`laudo:${params.id}`)

    if (!existente) {
      return NextResponse.json({ erro: 'Laudo não encontrado.' }, { status: 404 })
    }

    await Promise.all([
      redis.del(`laudo:${params.id}`),
      redis.srem('laudo_ids', params.id),
    ])

    return NextResponse.json({ sucesso: true })
  } catch (erro) {
    console.error('[DELETE /api/laudos/:id]', erro)
    return NextResponse.json({ erro: 'Erro ao excluir laudo.' }, { status: 500 })
  }
}
