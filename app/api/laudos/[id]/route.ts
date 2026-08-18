/**
 * SALVAR EM: src/app/api/laudos/[id]/route.ts
 *
 * Atualizado: DELETE agora limpa todas as chaves Redis associadas ao laudo,
 * evitando acúmulo de mídias órfãs que consomem storage desnecessariamente.
 */

import { Redis } from '@upstash/redis'
import { NextRequest, NextResponse } from 'next/server'

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

type Params = { params: Promise<{ id: string }> }

// ─── Helper: limpa todas as chaves Redis de um laudo ─────────────────────────
// Inclui payload principal, mídias binárias e todos os seus chunks.
export async function limparChavesLaudo(id: string): Promise<void> {
  // Padrão de chaves diretas (sem chunks)
  const chavesDiretas = [
    `laudo:${id}`,
    `laudo:${id}:dadosCalculoCDDM`,
    `laudo:${id}:dadosCalculoEvolutivo`,
    `laudo:${id}:elementosComparativos`,
    `anexo:${id}:documentacaoPdf`,
    `anexo:${id}:calculoPdf`,
    `anexo:${id}:localizacaoComparativos`,
    `anexo:${id}:imagemBenfeitorias`,
  ]

  // Fotos do laudo (até 50 fotos por segurança)
  const MAX_FOTOS = 50
  for (let i = 0; i < MAX_FOTOS; i++) {
    chavesDiretas.push(`foto:${id}:${i}`)
    chavesDiretas.push(`foto:${id}:${i}__manifest`)
  }

  // Croquis (até 20)
  const MAX_CROQUIS = 20
  for (let i = 0; i < MAX_CROQUIS; i++) {
    chavesDiretas.push(`croqui:${id}:${i}`)
    chavesDiretas.push(`croqui:${id}:${i}__manifest`)
  }

  // Fotos dos elementos CDDM (até 30 elementos)
  const MAX_ELEMS = 30
  for (let i = 0; i < MAX_ELEMS; i++) {
    chavesDiretas.push(`anexo:${id}:cddm:foto:${i}`)
    chavesDiretas.push(`anexo:${id}:cddm:foto:${i}__manifest`)
  }

  // Para cada chave base, deletar também seus chunks (__c0, __c1, ...)
  // Lê o manifesto para saber quantos chunks existem — se não houver, tenta até 20
  const MAX_CHUNKS = 20

  const todasAsChaves: string[] = [...chavesDiretas]

  // Adicionar chunks de chaves que podem ser chunkeadas
  const chavesPodeChunkar = [
    `laudo:${id}:dadosCalculoCDDM`,
    `laudo:${id}:dadosCalculoEvolutivo`,
    `laudo:${id}:elementosComparativos`,
    `anexo:${id}:documentacaoPdf`,
    `anexo:${id}:calculoPdf`,
    `anexo:${id}:localizacaoComparativos`,
    `anexo:${id}:imagemBenfeitorias`,
  ]

  for (const chave of chavesPodeChunkar) {
    for (let c = 0; c < MAX_CHUNKS; c++) {
      todasAsChaves.push(`${chave}__c${c}`)
    }
    todasAsChaves.push(`${chave}__manifest`)
  }

  // Chunks de fotos e croquis
  for (let i = 0; i < MAX_FOTOS; i++) {
    for (let c = 0; c < MAX_CHUNKS; c++) {
      todasAsChaves.push(`foto:${id}:${i}__c${c}`)
    }
  }
  for (let i = 0; i < MAX_CROQUIS; i++) {
    for (let c = 0; c < MAX_CHUNKS; c++) {
      todasAsChaves.push(`croqui:${id}:${i}__c${c}`)
    }
  }
  for (let i = 0; i < MAX_ELEMS; i++) {
    for (let c = 0; c < MAX_CHUNKS; c++) {
      todasAsChaves.push(`anexo:${id}:cddm:foto:${i}__c${c}`)
    }
  }

  // Deletar em lotes de 100 (limite seguro do Upstash pipeline)
  const LOTE = 100
  for (let i = 0; i < todasAsChaves.length; i += LOTE) {
    const lote = todasAsChaves.slice(i, i + LOTE)
    try {
      await redis.del(...lote)
    } catch {
      // Silencioso — chaves inexistentes não causam erro no del
    }
  }
}

// GET /api/laudos/:id
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const laudo = await redis.get<any>(`laudo:${id}`)

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
    const { id } = await params
    const existente = await redis.get<any>(`laudo:${id}`)

    if (!existente) {
      return NextResponse.json({ erro: 'Laudo não encontrado.' }, { status: 404 })
    }

    const dados = await request.json()

    const laudoAtualizado = {
      ...existente,
      ...dados,
      id,
      criadoEm: existente.criadoEm,
      atualizadoEm: new Date().toISOString(),
    }

    await redis.set(`laudo:${id}`, laudoAtualizado)

    return NextResponse.json(laudoAtualizado)
  } catch (erro) {
    console.error('[PUT /api/laudos/:id]', erro)
    return NextResponse.json({ erro: 'Erro ao atualizar laudo.' }, { status: 500 })
  }
}

// DELETE /api/laudos/:id
// Remove o laudo E todas as mídias associadas (fotos, PDFs, cálculos, chunks)
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params

    // Remove da lista de IDs primeiro
    await redis.srem('laudo_ids', id)

    // Limpa todas as chaves associadas ao laudo (em background, não bloqueia resposta)
    limparChavesLaudo(id).catch((err) =>
      console.error(`[DELETE /api/laudos/${id}] Erro ao limpar mídias:`, err)
    )

    return NextResponse.json({ sucesso: true })
  } catch (erro) {
    console.error('[DELETE /api/laudos/:id]', erro)
    return NextResponse.json({ erro: 'Erro ao excluir laudo.' }, { status: 500 })
  }
}
