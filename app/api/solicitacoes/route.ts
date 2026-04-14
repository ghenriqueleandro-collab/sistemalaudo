/**
 * SALVAR EM: src/app/api/solicitacoes/route.ts
 */

import { Redis } from '@upstash/redis'
import { NextRequest, NextResponse } from 'next/server'

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

// GET /api/solicitacoes — lista todas as solicitações pendentes
export async function GET() {
  try {
    const ids = await redis.smembers<string[]>('solicitacao_ids')
    if (!ids || ids.length === 0) return NextResponse.json([])

    const solicitacoes = await Promise.all(ids.map((id) => redis.get<any>(`solicitacao:${id}`)))

    const resultado = solicitacoes
      .filter(Boolean)
      .sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime())

    return NextResponse.json(resultado)
  } catch (erro) {
    console.error('[GET /api/solicitacoes]', erro)
    return NextResponse.json({ erro: 'Erro ao buscar solicitações.' }, { status: 500 })
  }
}

// POST /api/solicitacoes — cria nova solicitação de exclusão
export async function POST(request: NextRequest) {
  try {
    const { laudoId, laudoCodigo, laudoEndereco, usuarioEmail, usuarioNome } = await request.json()

    if (!laudoId || !usuarioEmail) {
      return NextResponse.json({ erro: 'laudoId e usuarioEmail são obrigatórios.' }, { status: 400 })
    }

    // Evita duplicata — um laudo só pode ter uma solicitação pendente por vez
    const ids = await redis.smembers<string[]>('solicitacao_ids')
    if (ids && ids.length > 0) {
      const existentes = await Promise.all(ids.map((id) => redis.get<any>(`solicitacao:${id}`)))
      const jaExiste = existentes.find(
        (s) => s?.laudoId === laudoId && s?.status === 'pendente'
      )
      if (jaExiste) {
        return NextResponse.json({ erro: 'Já existe uma solicitação pendente para este laudo.' }, { status: 409 })
      }
    }

    const id = crypto.randomUUID()
    const solicitacao = {
      id,
      laudoId,
      laudoCodigo: laudoCodigo || laudoId,
      laudoEndereco: laudoEndereco || '',
      usuarioEmail,
      usuarioNome: usuarioNome || usuarioEmail,
      status: 'pendente', // 'pendente' | 'aprovada' | 'negada'
      criadoEm: new Date().toISOString(),
    }

    await Promise.all([
      redis.set(`solicitacao:${id}`, solicitacao),
      redis.sadd('solicitacao_ids', id),
    ])

    return NextResponse.json(solicitacao, { status: 201 })
  } catch (erro) {
    console.error('[POST /api/solicitacoes]', erro)
    return NextResponse.json({ erro: 'Erro ao criar solicitação.' }, { status: 500 })
  }
}
