/**
 * SALVAR EM: src/app/api/laudos/[id]/duplicar/route.ts
 *
 * POST /api/laudos/:id/duplicar
 *
 * Cria um novo laudo com as mesmas informações do original, porém com
 * um novo ID, nova referência e status resetado para "levantamento_documentos".
 *
 * Campos de referência Redis (__ref__ / __chunks__) são nulificados no novo
 * laudo porque as chaves apontam para dados do laudo original. Os dados
 * inline (objetos/arrays pequenos) são copiados normalmente.
 *
 * Campos resetados no duplicado:
 *   - id          → novo UUID
 *   - referencia  → "(Cópia) <referencia original>"
 *   - codigo      → null (será gerado ao salvar)
 *   - criadoEm    → agora
 *   - atualizadoEm → agora
 *   - statusAcompanhamento → "levantamento_documentos"
 *   - status      → "rascunho"
 *   - fotos       → [] (imagens não são duplicadas — são grandes e têm ref própria)
 *   - croquis     → []
 *   - documentacaoPdf → null
 *   - calculoPdf  → null
 *   - localizacaoComparativos → null
 *   - imagemBenfeitorias → null
 *
 * Campos de cálculo (dadosCalculoCDDM, dadosCalculoEvolutivo, elementosComparativos):
 *   se estiverem inline (objeto/array), são copiados.
 *   se forem __ref__ ou __chunks__, são nulificados (os dados ficam no laudo original).
 */

import { Redis } from '@upstash/redis'
import { NextRequest, NextResponse } from 'next/server'

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

type Params = { params: Promise<{ id: string }> }

function isRef(v: unknown): boolean {
  if (typeof v !== 'string') return false
  return v.startsWith('__ref__:') || v.startsWith('__chunks__:')
}

export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params

    const original = await redis.get<any>(`laudo:${id}`)
    if (!original) {
      return NextResponse.json({ erro: 'Laudo original não encontrado.' }, { status: 404 })
    }

    const novoId = crypto.randomUUID()
    const agora = new Date().toISOString()

    // Monta referência do duplicado
    const refOriginal: string = original.referencia || original.codigo || id.slice(0, 8)
    const novaReferencia = `(Cópia) ${refOriginal}`

    // Campos de cálculo: copiar se inline, nulificar se ref
    const dadosCalculoCDDM = isRef(original.dadosCalculoCDDM)
      ? null
      : original.dadosCalculoCDDM ?? null

    const dadosCalculoEvolutivo = isRef(original.dadosCalculoEvolutivo)
      ? null
      : original.dadosCalculoEvolutivo ?? null

    const elementosComparativos = isRef(original.elementosComparativos)
      ? []
      : (Array.isArray(original.elementosComparativos) ? original.elementosComparativos : [])

    const novoLaudo = {
      ...original,

      // Identidade do novo laudo
      id: novoId,
      referencia: novaReferencia,
      codigo: null,

      // Timestamps
      criadoEm: agora,
      atualizadoEm: agora,

      // Status resetado
      statusAcompanhamento: 'levantamento_documentos',
      status: 'rascunho',

      // Mídias não são duplicadas (são arquivos grandes com chaves próprias no Redis)
      fotos: [],
      croquis: [],
      documentacaoPdf: null,
      calculoPdf: null,
      localizacaoComparativos: null,
      imagemBenfeitorias: null,

      // Dados de cálculo: inline → copia, ref → nulo
      dadosCalculoCDDM,
      dadosCalculoEvolutivo,
      elementosComparativos,
    }

    await Promise.all([
      redis.set(`laudo:${novoId}`, novoLaudo),
      redis.sadd('laudo_ids', novoId),
    ])

    return NextResponse.json({ id: novoId, referencia: novaReferencia }, { status: 201 })
  } catch (erro) {
    console.error('[POST /api/laudos/:id/duplicar]', erro)
    return NextResponse.json({ erro: 'Erro ao duplicar laudo.' }, { status: 500 })
  }
}
