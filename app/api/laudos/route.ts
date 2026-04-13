/**
 * SALVAR EM: src/app/api/laudos/route.ts
 */

import { Redis } from '@upstash/redis'
import { NextRequest, NextResponse } from 'next/server'

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

// GET /api/laudos → retorna todos os laudos
export async function GET() {
  try {
    const ids = await redis.smembers<string[]>('laudo_ids')

    if (!ids || ids.length === 0) {
      return NextResponse.json([])
    }

    const laudos = await Promise.all(
      ids.map((id) => redis.get<any>(`laudo:${id}`))
    )

    const resultado = laudos
      .filter(Boolean)
      .sort(
        (a, b) =>
          new Date(b.atualizadoEm ?? b.criadoEm ?? 0).getTime() -
          new Date(a.atualizadoEm ?? a.criadoEm ?? 0).getTime()
      )

    return NextResponse.json(resultado)
  } catch (erro) {
    console.error('[GET /api/laudos]', erro)
    return NextResponse.json({ erro: 'Erro ao buscar laudos.' }, { status: 500 })
  }
}

// POST /api/laudos → cria ou atualiza laudo (upsert por ID)
export async function POST(request: NextRequest) {
  try {
    const dados = await request.json()

    const id = dados.id || crypto.randomUUID()
    const agora = new Date().toISOString()

    const existente = await redis.get<any>(`laudo:${id}`)

    const laudo = {
      ...dados,
      id,
      criadoEm: existente?.criadoEm ?? dados.criadoEm ?? agora,
      atualizadoEm: agora,
    }

    await Promise.all([
      redis.set(`laudo:${id}`, laudo),
      redis.sadd('laudo_ids', id),
    ])

    return NextResponse.json(laudo, { status: existente ? 200 : 201 })
  } catch (erro) {
    console.error('[POST /api/laudos]', erro)
    return NextResponse.json({ erro: 'Erro ao salvar laudo.' }, { status: 500 })
  }
}
