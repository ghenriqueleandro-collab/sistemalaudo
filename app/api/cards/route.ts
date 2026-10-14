/**
 * SALVAR EM: src/app/api/cards/route.ts
 */

import { Redis } from '@upstash/redis'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

// GET /api/cards → lista todos os cards (não arquivados por padrão)
export async function GET(request: NextRequest) {
  try {
    const incluirArquivados = request.nextUrl.searchParams.get('arquivados') === 'true'

    const ids = await redis.smembers<string[]>('card_ids')
    if (!ids || ids.length === 0) return NextResponse.json([])

    const cards = await Promise.all(ids.map((id) => redis.get<any>(`card:${id}`)))

    const resultado = cards
      .filter(Boolean)
      .filter((c) => incluirArquivados || !c.arquivado)
      .sort(
        (a, b) =>
          new Date(b.criadoEm ?? 0).getTime() - new Date(a.criadoEm ?? 0).getTime()
      )

    return NextResponse.json(resultado)
  } catch (erro) {
    console.error('[GET /api/cards]', erro)
    return NextResponse.json({ erro: 'Erro ao buscar cards.' }, { status: 500 })
  }
}

// POST /api/cards → cria novo card
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const dados = await request.json()

    const id = crypto.randomUUID()
    const agora = new Date().toISOString()

    const card = {
      // Identificação
      id,
      criadoEm: agora,
      atualizadoEm: agora,
      criadoPor: session?.user?.email ?? 'desconhecido',

      // Dados do imóvel (pré-preenchimento do laudo futuro)
      titulo: dados.titulo?.trim() ?? '',
      tipoImovel: dados.tipoImovel ?? '',           // 'residencial' | 'comercial' | 'rural' | 'industrial'
      subtipo: dados.subtipo ?? '',                  // 'apartamento' | 'casa' | 'terreno' | 'galpão' etc.
      endereco: dados.endereco ?? '',
      cidade: dados.cidade ?? '',
      uf: dados.uf ?? '',
      bairro: dados.bairro ?? '',

      // Demanda
      cliente: dados.cliente ?? '',                  // solicitante / contratante
      finalidade: dados.finalidade ?? '',            // 'garantia_bancaria' | 'judicial' | 'financiamento' | 'particular'
      tipoLaudo: dados.tipoLaudo ?? 'completo',     // 'completo' | 'simplificado'

      // Gestão
      responsavel: dados.responsavel ?? '',          // email ou nome do responsável
      prazoEntrega: dados.prazoEntrega ?? '',        // ISO date string 'YYYY-MM-DD'
      prioridade: dados.prioridade ?? 'normal',      // 'urgente' | 'normal' | 'baixa'
      descricao: dados.descricao ?? '',              // observações, pendências, próximos passos

      // Status e vínculo
      // Valores válidos: 'levantamento_documentos' | 'atuando_vistoria' | 'atuando_pesquisa' | 'concluido'
      statusAcompanhamento: dados.statusAcompanhamento ?? 'levantamento_documentos',
      laudoId: null,       // preenchido quando o laudo for criado
      arquivado: false,    // true quando usuário confirma conclusão
    }

    await Promise.all([
      redis.set(`card:${id}`, card),
      redis.sadd('card_ids', id),
    ])

    return NextResponse.json(card, { status: 201 })
  } catch (erro) {
    console.error('[POST /api/cards]', erro)
    return NextResponse.json({ erro: 'Erro ao criar card.' }, { status: 500 })
  }
}
