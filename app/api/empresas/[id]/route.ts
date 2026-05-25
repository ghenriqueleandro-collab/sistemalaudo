/**
 * SALVAR EM: src/app/api/empresas/[id]/route.ts
 *
 * A pasta deve se chamar literalmente [id] com os colchetes.
 */

import { Redis } from '@upstash/redis'
import { NextRequest, NextResponse } from 'next/server'

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

type Params = { params: Promise<{ id: string }> }

// GET /api/empresas/:id
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const empresa = await redis.get<any>(`empresa:${id}`)
    if (!empresa) {
      return NextResponse.json({ erro: 'Empresa não encontrada.' }, { status: 404 })
    }
    return NextResponse.json(empresa)
  } catch (erro) {
    console.error('[GET /api/empresas/:id]', erro)
    return NextResponse.json({ erro: 'Erro ao buscar empresa.' }, { status: 500 })
  }
}

// PUT /api/empresas/:id → atualiza empresa existente
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const existente = await redis.get<any>(`empresa:${id}`)
    if (!existente) {
      return NextResponse.json({ erro: 'Empresa não encontrada.' }, { status: 404 })
    }

    const dados = await request.json()

    const empresaAtualizada = {
      ...existente,
      ...dados,
      id,
      criadoEm: existente.criadoEm,
      atualizadoEm: new Date().toISOString(),
    }

    await redis.set(`empresa:${id}`, empresaAtualizada)
    return NextResponse.json(empresaAtualizada)
  } catch (erro) {
    console.error('[PUT /api/empresas/:id]', erro)
    return NextResponse.json({ erro: 'Erro ao atualizar empresa.' }, { status: 500 })
  }
}

// DELETE /api/empresas/:id
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    await Promise.all([
      redis.del(`empresa:${id}`),
      redis.srem('empresa_ids', id),
    ])
    return NextResponse.json({ sucesso: true })
  } catch (erro) {
    console.error('[DELETE /api/empresas/:id]', erro)
    return NextResponse.json({ erro: 'Erro ao excluir empresa.' }, { status: 500 })
  }
}
