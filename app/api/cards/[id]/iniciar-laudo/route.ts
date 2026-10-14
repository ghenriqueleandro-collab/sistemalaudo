/**
 * SALVAR EM: src/app/api/cards/[id]/iniciar-laudo/route.ts
 *
 * A estrutura de pastas deve ser:
 *   src/app/api/cards/[id]/iniciar-laudo/route.ts
 *
 * POST /api/cards/:id/iniciar-laudo
 *
 * Cria um laudo pré-preenchido com os dados do card e vincula os dois:
 *   card.laudoId = novoLaudoId
 *   laudo.cardId = cardId
 *
 * Retorna o laudo criado para que o frontend possa redirecionar para o editor.
 *
 * Erros possíveis:
 *   404 — card não encontrado
 *   409 — card já possui laudo vinculado
 *   500 — erro interno
 */

import { Redis } from '@upstash/redis'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

type Params = { params: Promise<{ id: string }> }

export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const { id: cardId } = await params
    const session = await getServerSession(authOptions)

    // 1. Busca o card
    const card = await redis.get<any>(`card:${cardId}`)
    if (!card) {
      return NextResponse.json({ erro: 'Card não encontrado.' }, { status: 404 })
    }

    // 2. Impede criar laudo duplicado
    if (card.laudoId) {
      return NextResponse.json(
        { erro: 'Este card já possui um laudo vinculado.', laudoId: card.laudoId },
        { status: 409 }
      )
    }

    // 3. Gera ID e timestamps
    const laudoId = crypto.randomUUID()
    const agora = new Date().toISOString()

    // 4. Monta o laudo com os dados do card
    //    Mapeamento: card → laudo
    //      card.titulo              → laudo.titulo
    //      card.endereco            → laudo.endereco
    //      card.cidade              → laudo.cidade
    //      card.uf                  → laudo.uf
    //      card.bairro              → laudo.bairro
    //      card.tipoImovel          → laudo.tipoImovel  (e laudo.tipo para retrocompatibilidade)
    //      card.subtipo             → laudo.subtipo
    //      card.cliente             → laudo.solicitante  (nome do contratante no laudo)
    //      card.finalidade          → laudo.finalidade
    //      card.tipoLaudo           → laudo.tipoLaudo
    //      card.responsavel         → laudo.responsavel
    //      card.prazoEntrega        → laudo.prazoEntrega
    //      card.prioridade          → laudo.prioridade
    //      card.descricao           → laudo.descricao
    //      card.statusAcompanhamento → laudo.statusAcompanhamento
    const laudo = {
      // Identificação
      id: laudoId,
      cardId,                                       // vínculo reverso
      criadoEm: agora,
      atualizadoEm: agora,
      criadoPor: session?.user?.email ?? card.criadoPor ?? 'desconhecido',

      // Dados do imóvel (vindos do card)
      titulo: card.titulo ?? '',
      endereco: card.endereco ?? '',
      cidade: card.cidade ?? '',
      uf: card.uf ?? '',
      bairro: card.bairro ?? '',
      tipoImovel: card.tipoImovel ?? '',            // campo novo
      tipo: card.tipoImovel ?? '',                  // retrocompatibilidade com Etapa01A06
      subtipo: card.subtipo ?? '',

      // Demanda
      solicitante: card.cliente ?? '',              // "cliente" no card → "solicitante" no laudo
      cliente: card.cliente ?? '',                  // mantém os dois por segurança
      finalidade: card.finalidade ?? '',
      tipoLaudo: card.tipoLaudo ?? 'completo',

      // Gestão
      responsavel: card.responsavel ?? '',
      prazoEntrega: card.prazoEntrega ?? '',
      prioridade: card.prioridade ?? 'normal',
      descricao: card.descricao ?? '',

      // Status
      statusAcompanhamento: card.statusAcompanhamento ?? 'levantamento_documentos',

      // Campos do laudo em branco (preenchidos nas etapas)
      // (demais campos ficam undefined — o editor preenche conforme o usuário avança)
    }

    // 5. Atualiza o card com o laudoId
    const cardAtualizado = {
      ...card,
      laudoId,
      atualizadoEm: agora,
    }

    // 6. Persiste tudo atomicamente
    await Promise.all([
      redis.set(`laudo:${laudoId}`, laudo),
      redis.sadd('laudo_ids', laudoId),
      redis.set(`card:${cardId}`, cardAtualizado),
    ])

    return NextResponse.json(laudo, { status: 201 })
  } catch (erro) {
    console.error('[POST /api/cards/:id/iniciar-laudo]', erro)
    return NextResponse.json({ erro: 'Erro ao iniciar laudo.' }, { status: 500 })
  }
}
