/**
 * SALVAR EM: app/api/cards/[id]/route.ts
 *
 * GET    /api/cards/:id  → busca um card
 * PUT    /api/cards/:id  → atualiza todos os campos do card
 * PATCH  /api/cards/:id  → ações pontuais: { acao: 'mover', statusAcompanhamento }
 *                                           { acao: 'arquivar' }
 * DELETE /api/cards/:id  → remove o card
 */

import { Redis } from '@upstash/redis'
import { NextRequest, NextResponse } from 'next/server'

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

type Params = { params: Promise<{ id: string }> }

// GET /api/cards/:id
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const card = await redis.get<any>(`card:${id}`)
    if (!card) return NextResponse.json({ erro: 'Card não encontrado.' }, { status: 404 })
    return NextResponse.json(card)
  } catch (erro) {
    console.error('[GET /api/cards/:id]', erro)
    return NextResponse.json({ erro: 'Erro ao buscar card.' }, { status: 500 })
  }
}

// PUT /api/cards/:id → atualização completa
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const dados = await req.json()

    const existente = await redis.get<any>(`card:${id}`)
    if (!existente) return NextResponse.json({ erro: 'Card não encontrado.' }, { status: 404 })

    const agora = new Date().toISOString()
    const cardAtualizado = {
      ...existente,
      ...dados,
      id,                          // nunca sobrescreve o id
      criadoEm: existente.criadoEm, // preserva data de criação
      atualizadoEm: agora,
    }

    await redis.set(`card:${id}`, cardAtualizado)
    return NextResponse.json(cardAtualizado)
  } catch (erro) {
    console.error('[PUT /api/cards/:id]', erro)
    return NextResponse.json({ erro: 'Erro ao atualizar card.' }, { status: 500 })
  }
}

// PATCH /api/cards/:id → ações pontuais
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const body = await req.json()

    const existente = await redis.get<any>(`card:${id}`)
    if (!existente) return NextResponse.json({ erro: 'Card não encontrado.' }, { status: 404 })

    const agora = new Date().toISOString()
    let cardAtualizado = { ...existente, atualizadoEm: agora }

    if (body.acao === 'mover') {
      const statusValidos = [
        'levantamento_documentos',
        'atuando_vistoria',
        'atuando_pesquisa',
        'concluido',
      ]
      if (!statusValidos.includes(body.statusAcompanhamento)) {
        return NextResponse.json({ erro: 'Status inválido.' }, { status: 400 })
      }
      cardAtualizado.statusAcompanhamento = body.statusAcompanhamento
    } else if (body.acao === 'arquivar') {
      cardAtualizado.arquivado = true
    } else {
      // PATCH genérico: merge dos campos enviados (sem acao)
      const { acao: _acao, ...campos } = body
      cardAtualizado = { ...cardAtualizado, ...campos }
    }

    await redis.set(`card:${id}`, cardAtualizado)
    return NextResponse.json(cardAtualizado)
  } catch (erro) {
    console.error('[PATCH /api/cards/:id]', erro)
    return NextResponse.json({ erro: 'Erro ao atualizar card.' }, { status: 500 })
  }
}

// DELETE /api/cards/:id
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    await Promise.all([
      redis.del(`card:${id}`),
      redis.srem('card_ids', id),
    ])
    return NextResponse.json({ ok: true })
  } catch (erro) {
    console.error('[DELETE /api/cards/:id]', erro)
    return NextResponse.json({ erro: 'Erro ao remover card.' }, { status: 500 })
  }
}
