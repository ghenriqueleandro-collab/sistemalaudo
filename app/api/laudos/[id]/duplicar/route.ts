/**
 * SALVAR EM: src/app/api/laudos/[id]/duplicar/route.ts
 *
 * POST /api/laudos/:id/duplicar
 *
 * Cria um novo laudo com as mesmas informações do original, com
 * novo ID, nova referência e status resetado.
 *
 * Dados de cálculo (__ref__ / __chunks__):
 *   Os dados ficam em chaves Redis separadas (ex: laudo:{id}:dadosCalculoCDDM).
 *   A duplicação lê o conteúdo original e escreve novas chaves para o novo ID,
 *   apontando as refs do novo laudo para as novas chaves.
 *
 * Mídias (fotos, croquis, PDFs, imagens):
 *   NÃO são duplicadas — são arquivos grandes e raramente mudam entre cópias.
 *   O novo laudo começa sem mídias (arrays/campos vazios).
 *
 * Campos resetados no duplicado:
 *   - id                   → novo UUID
 *   - referencia           → "(Cópia) <referencia original>"
 *   - codigo               → null
 *   - criadoEm             → agora
 *   - atualizadoEm         → agora
 *   - statusAcompanhamento → "levantamento_documentos"
 *   - status               → "rascunho"
 *   - fotos                → []
 *   - croquis              → []
 *   - documentacaoPdf      → null
 *   - calculoPdf           → null
 *   - localizacaoComparativos → null
 *   - imagemBenfeitorias   → null
 */

import { Redis } from '@upstash/redis'
import { NextRequest, NextResponse } from 'next/server'

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

type Params = { params: Promise<{ id: string }> }

// Extrai a chave Redis de um valor __ref__ ou __chunks__
function extrairChave(v: unknown): { chave: string; tipo: 'ref' | 'chunks'; numChunks?: number } | null {
  if (typeof v !== 'string') return null
  if (v.startsWith('__ref__:')) {
    return { chave: v.replace('__ref__:', ''), tipo: 'ref' }
  }
  if (v.startsWith('__chunks__:')) {
    // formato: __chunks__:chave:numChunks
    const partes = v.replace('__chunks__:', '').split(':')
    const numChunks = parseInt(partes.pop() ?? '0', 10)
    const chave = partes.join(':')
    return { chave, tipo: 'chunks', numChunks }
  }
  return null
}

/**
 * Lê o conteúdo de uma chave Redis (ref simples ou chunks) e escreve
 * em uma nova chave destino. Retorna a ref para o novo laudo.
 */
async function copiarChaveRedis(
  chaveOrigem: string,
  chaveDestino: string,
  tipo: 'ref' | 'chunks',
  numChunks?: number
): Promise<string | null> {
  try {
    if (tipo === 'ref') {
      const conteudo = await redis.get<string>(chaveOrigem)
      if (conteudo == null) return null
      await redis.set(chaveDestino, conteudo)
      return `__ref__:${chaveDestino}`
    }

    // chunks: copia manifesto e cada chunk individualmente
    const total = numChunks ?? 0
    if (total === 0) return null

    const operacoes: Promise<any>[] = []
    for (let i = 0; i < total; i++) {
      operacoes.push(
        redis.get<string>(`${chaveOrigem}__c${i}`).then((chunk) => {
          if (chunk != null) return redis.set(`${chaveDestino}__c${i}`, chunk)
        })
      )
    }
    operacoes.push(redis.set(`${chaveDestino}__manifest`, String(total)))
    await Promise.all(operacoes)
    return `__chunks__:${chaveDestino}:${total}`

  } catch (err) {
    console.error(`[duplicar] Erro ao copiar ${chaveOrigem} → ${chaveDestino}:`, err)
    return null
  }
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

    const refOriginal: string = original.referencia || original.codigo || id.slice(0, 8)
    const novaReferencia = `(Cópia) ${refOriginal}`

    // ── Copiar dados de cálculo para novas chaves Redis ──────────────────────

    // dadosCalculoCDDM
    let novoDadosCDDM: any = original.dadosCalculoCDDM ?? null
    const refCDDM = extrairChave(original.dadosCalculoCDDM)
    if (refCDDM) {
      const novaChaveCDDM = `laudo:${novoId}:dadosCalculoCDDM`
      const novaRef = await copiarChaveRedis(refCDDM.chave, novaChaveCDDM, refCDDM.tipo, refCDDM.numChunks)
      novoDadosCDDM = novaRef ?? null
    }

    // dadosCalculoEvolutivo
    let novoDadosEv: any = original.dadosCalculoEvolutivo ?? null
    const refEv = extrairChave(original.dadosCalculoEvolutivo)
    if (refEv) {
      const novaChaveEv = `laudo:${novoId}:dadosCalculoEvolutivo`
      const novaRef = await copiarChaveRedis(refEv.chave, novaChaveEv, refEv.tipo, refEv.numChunks)
      novoDadosEv = novaRef ?? null
    }

    // elementosComparativos
    let novosElementos: any = Array.isArray(original.elementosComparativos)
      ? original.elementosComparativos
      : []
    const refElems = extrairChave(original.elementosComparativos)
    if (refElems) {
      const novaChaveElems = `laudo:${novoId}:elementosComparativos`
      const novaRef = await copiarChaveRedis(refElems.chave, novaChaveElems, refElems.tipo, refElems.numChunks)
      novosElementos = novaRef ?? []
    }

    // ── Montar novo laudo ────────────────────────────────────────────────────

    const novoLaudo = {
      ...original,

      // Identidade
      id: novoId,
      referencia: novaReferencia,
      codigo: null,

      // Timestamps
      criadoEm: agora,
      atualizadoEm: agora,

      // Status
      statusAcompanhamento: 'levantamento_documentos',
      status: 'rascunho',

      // Mídias não duplicadas
      fotos: [],
      croquis: [],
      documentacaoPdf: null,
      calculoPdf: null,
      localizacaoComparativos: null,
      imagemBenfeitorias: null,

      // Dados de cálculo — copiados para novas chaves
      dadosCalculoCDDM: novoDadosCDDM,
      dadosCalculoEvolutivo: novoDadosEv,
      elementosComparativos: novosElementos,
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
