/**
 * SALVAR EM: src/app/api/solicitacoes/[id]/route.ts
 * (pasta [id] com colchetes)
 */

import { Redis } from '@upstash/redis'
import { NextRequest, NextResponse } from 'next/server'

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

type Params = { params: Promise<{ id: string }> }

// PUT /api/solicitacoes/:id — admin aprova ou nega
// body: { acao: 'aprovar' | 'negar' }
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const { acao } = await request.json()

    if (!['aprovar', 'negar'].includes(acao)) {
      return NextResponse.json({ erro: 'Ação inválida. Use: aprovar ou negar.' }, { status: 400 })
    }

    const solicitacao = await redis.get<any>(`solicitacao:${id}`)
    if (!solicitacao) {
      return NextResponse.json({ erro: 'Solicitação não encontrada.' }, { status: 404 })
    }

    if (solicitacao.status !== 'pendente') {
      return NextResponse.json({ erro: 'Solicitação já foi processada.' }, { status: 409 })
    }

    const novoStatus = acao === 'aprovar' ? 'aprovada' : 'negada'

    const solicitacaoAtualizada = {
      ...solicitacao,
      status: novoStatus,
      resolvidoEm: new Date().toISOString(),
    }

    await redis.set(`solicitacao:${id}`, solicitacaoAtualizada)

    // Se aprovado, exclui o laudo do Redis
    if (acao === 'aprovar') {
      await Promise.all([
        redis.del(`laudo:${solicitacao.laudoId}`),
        redis.srem('laudo_ids', solicitacao.laudoId),
      ])
    }

    // Cria notificação para o usuário que solicitou
    const notifId = crypto.randomUUID()
    const notificacao = {
      id: notifId,
      destinatarioEmail: solicitacao.usuarioEmail,
      tipo: acao === 'aprovar' ? 'exclusao_aprovada' : 'exclusao_negada',
      titulo: acao === 'aprovar' ? 'Exclusão aprovada' : 'Exclusão negada',
      mensagem:
        acao === 'aprovar'
          ? `O laudo ${solicitacao.laudoCodigo} (${solicitacao.laudoEndereco}) foi excluído com sucesso.`
          : `Sua solicitação de exclusão do laudo ${solicitacao.laudoCodigo} foi negada pelo administrador.`,
      lida: false,
      criadoEm: new Date().toISOString(),
    }

    await Promise.all([
      redis.set(`notificacao:${notifId}`, notificacao),
      redis.sadd(`notificacoes:${solicitacao.usuarioEmail}`, notifId),
    ])

    return NextResponse.json(solicitacaoAtualizada)
  } catch (erro) {
    console.error('[PUT /api/solicitacoes/:id]', erro)
    return NextResponse.json({ erro: 'Erro ao processar solicitação.' }, { status: 500 })
  }
}
