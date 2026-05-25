/**
 * SALVAR EM: src/app/api/empresas/route.ts
 */

import { Redis } from '@upstash/redis'
import { NextRequest, NextResponse } from 'next/server'

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

// GET /api/empresas → lista todas as empresas
export async function GET() {
  try {
    const ids = await redis.smembers<string[]>('empresa_ids')

    if (!ids || ids.length === 0) return NextResponse.json([])

    const empresas = await Promise.all(ids.map((id) => redis.get<any>(`empresa:${id}`)))

    const resultado = empresas
      .filter(Boolean)
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))

    return NextResponse.json(resultado)
  } catch (erro) {
    console.error('[GET /api/empresas]', erro)
    return NextResponse.json({ erro: 'Erro ao buscar empresas.' }, { status: 500 })
  }
}

// POST /api/empresas → cria ou atualiza empresa (upsert por ID)
export async function POST(request: NextRequest) {
  try {
    const dados = await request.json()

    if (!dados.nome?.trim()) {
      return NextResponse.json({ erro: 'Nome da empresa é obrigatório.' }, { status: 400 })
    }

    const id = dados.id || crypto.randomUUID()
    const agora = new Date().toISOString()

    const existente = await redis.get<any>(`empresa:${id}`)

    const empresa = {
      ...dados,
      id,
      nome: dados.nome.trim(),
      criadoEm: existente?.criadoEm ?? agora,
      atualizadoEm: agora,
    }

    await Promise.all([
      redis.set(`empresa:${id}`, empresa),
      redis.sadd('empresa_ids', id),
    ])

    return NextResponse.json(empresa, { status: existente ? 200 : 201 })
  } catch (erro) {
    console.error('[POST /api/empresas]', erro)
    return NextResponse.json({ erro: 'Erro ao salvar empresa.' }, { status: 500 })
  }
}
