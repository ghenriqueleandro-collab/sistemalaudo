/**
 * SALVAR EM: src/app/api/debug-mapa/route.ts
 *
 * Endpoint temporário de diagnóstico — inspeciona laudos no Redis
 * e mostra o formato em que dadosCalculoCDDM e elementosComparativos
 * estão armazenados (inline, __ref__, __chunks__ ou ausente).
 *
 * GET /api/debug-mapa
 * GET /api/debug-mapa?id=<laudoId>  → resolve __ref__ daquele laudo e mostra elementos
 *
 * REMOVER após diagnóstico.
 */

import { Redis } from '@upstash/redis'
import { NextRequest, NextResponse } from 'next/server'

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

function parseCoord(s: string): [number, number] | null {
  if (!s || typeof s !== 'string') return null
  const str = s.trim()

  const m1 = str.match(/^(-?\d+\.\d+)\s*[,;]\s*(-?\d+\.\d+)$/)
  if (m1) {
    const lat = parseFloat(m1[1]), lon = parseFloat(m1[2])
    if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) return [lat, lon]
  }

  const m2 = str.match(/^(-?\d+),(\d+)\s+(-?\d+),(\d+)$/)
  if (m2) {
    const lat = parseFloat(`${m2[1]}.${m2[2]}`), lon = parseFloat(`${m2[3]}.${m2[4]}`)
    if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) return [lat, lon]
  }

  const m3 = str.match(/^(-?[\d.]+)\s*;\s*(-?[\d.]+)$/)
  if (m3) {
    const lat = parseFloat(m3[1]), lon = parseFloat(m3[2])
    if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) return [lat, lon]
  }

  const partes = str.split(',')
  if (partes.length === 2) {
    const lat = parseFloat(partes[0].trim()), lon = parseFloat(partes[1].trim())
    if (isFinite(lat) && isFinite(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) return [lat, lon]
  }
  if (partes.length === 4) {
    const lat = parseFloat(`${partes[0].trim()}.${partes[1].trim()}`)
    const lon = parseFloat(`${partes[2].trim()}.${partes[3].trim()}`)
    if (isFinite(lat) && isFinite(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) return [lat, lon]
  }
  return null
}

async function lerMidia(chave: string): Promise<any | null> {
  try {
    const dado = await redis.get<string>(chave)
    if (!dado) return null
    return typeof dado === 'string' ? JSON.parse(dado) : dado
  } catch { return null }
}

async function resolverCampo(valor: any): Promise<{ dados: any; erro?: string }> {
  if (!valor) return { dados: null }
  if (typeof valor !== 'string') return { dados: valor }

  if (valor.startsWith('__chunks__:')) {
    const sem = valor.replace('__chunks__:', '')
    const lastColon = sem.lastIndexOf(':')
    const chave = sem.slice(0, lastColon)
    const num = parseInt(sem.slice(lastColon + 1), 10)
    if (isNaN(num) || num <= 0) return { dados: null, erro: `chunks inválidos: ${valor}` }
    try {
      const partes = await Promise.all(
        Array.from({ length: num }, async (_, i) => {
          const d = await redis.get<string>(`${chave}__c${i}`)
          return d || ''
        })
      )
      const json = partes.join('')
      return { dados: json ? JSON.parse(json) : null }
    } catch (e) {
      return { dados: null, erro: String(e) }
    }
  }

  if (valor.startsWith('__ref__:')) {
    const chave = valor.replace('__ref__:', '')
    const dados = await lerMidia(chave)
    return { dados }
  }

  return { dados: null, erro: `formato desconhecido: ${valor.slice(0, 80)}` }
}

export async function GET(req: NextRequest) {
  try {
    const idParam = req.nextUrl.searchParams.get('id')

    // ── Modo: inspecionar um laudo específico e resolver refs ──
    if (idParam) {
      const laudo = await redis.get<any>(`laudo:${idParam}`)
      if (!laudo) return NextResponse.json({ erro: 'laudo não encontrado' }, { status: 404 })

      const rawCddm = laudo.dadosCalculoCDDM
      const rawElems = laudo.elementosComparativos

      let cddmResolvido: any = null
      let elemsResolvidos: any = null
      let cddmErro: string | undefined
      let elemsErro: string | undefined

      if (rawCddm && typeof rawCddm === 'string') {
        const r = await resolverCampo(rawCddm)
        cddmResolvido = r.dados
        cddmErro = r.erro
      } else if (rawCddm && typeof rawCddm === 'object') {
        cddmResolvido = rawCddm
      }

      if (rawElems && typeof rawElems === 'string') {
        const r = await resolverCampo(rawElems)
        elemsResolvidos = r.dados
        elemsErro = r.erro
      } else if (Array.isArray(rawElems)) {
        elemsResolvidos = rawElems
      }

      const elems: any[] = (cddmResolvido?.elementos) || elemsResolvidos || []
      const analise = elems.map((e: any) => ({
        id: e.id,
        coordenadas: e.coordenadas,
        parseResult: parseCoord(e.coordenadas),
        cidade: e.cidade,
        tipo: e.tipo,
      }))

      return NextResponse.json({
        laudoId: idParam,
        referencia: laudo.referencia,
        dadosCalculoCDDM: {
          tipo: rawCddm ? (typeof rawCddm === 'string' ? rawCddm.slice(0, 100) : 'objeto-inline') : 'ausente',
          resolvido: cddmResolvido ? `${typeof cddmResolvido} — elementos: ${cddmResolvido?.elementos?.length ?? 'N/A'}` : 'null',
          erro: cddmErro,
        },
        elementosComparativos: {
          tipo: rawElems ? (typeof rawElems === 'string' ? rawElems.slice(0, 100) : `array[${(rawElems as any[]).length}]`) : 'ausente',
          resolvido: elemsResolvidos ? `array[${Array.isArray(elemsResolvidos) ? elemsResolvidos.length : '?'}]` : 'null',
          erro: elemsErro,
        },
        totalElementos: elems.length,
        comCoord: analise.filter(e => e.parseResult).length,
        semCoord: analise.filter(e => !e.parseResult),
        elementos: analise,
      })
    }

    // ── Modo: visão geral de todos os laudos ──
    const ids = await redis.smembers<string[]>('laudo_ids')
    const unicos = Array.from(new Set(ids || []))

    const laudos = await Promise.all(unicos.map(id => redis.get<any>(`laudo:${id}`)))

    const resultado = laudos.map((laudo, i) => {
      if (!laudo) return { id: unicos[i], erro: 'não encontrado' }

      const rawCddm = laudo.dadosCalculoCDDM
      const rawElems = laudo.elementosComparativos

      let cddmTipo = 'ausente'
      let elemsTipo = 'ausente'
      let qtdInline = 0
      let qtdCoord = 0

      if (rawCddm) {
        if (typeof rawCddm === 'string') {
          cddmTipo = rawCddm.startsWith('__ref__:') ? '__ref__' : rawCddm.startsWith('__chunks__:') ? '__chunks__' : `string:${rawCddm.slice(0, 40)}`
        } else if (typeof rawCddm === 'object') {
          const n = rawCddm.elementos?.length ?? 0
          cddmTipo = `objeto-inline(${n})`
          qtdInline = n
          if (Array.isArray(rawCddm.elementos)) {
            rawCddm.elementos.forEach((e: any) => { if (parseCoord(e.coordenadas)) qtdCoord++ })
          }
        }
      }

      if (rawElems) {
        if (Array.isArray(rawElems)) {
          elemsTipo = `array-inline(${rawElems.length})`
          if (qtdInline === 0) {
            qtdInline = rawElems.length
            rawElems.forEach((e: any) => { if (parseCoord(e.coordenadas)) qtdCoord++ })
          }
        } else if (typeof rawElems === 'string') {
          elemsTipo = rawElems.startsWith('__ref__:') ? '__ref__' : rawElems.startsWith('__chunks__:') ? '__chunks__' : `string:${rawElems.slice(0, 40)}`
        }
      }

      return {
        id: laudo.id,
        referencia: laudo.referencia,
        dadosCalculoCDDM: cddmTipo,
        elementosComparativos: elemsTipo,
        elemsInline: qtdInline,
        elemsComCoord: qtdCoord,
        precisaResolucao: cddmTipo === '__ref__' || cddmTipo === '__chunks__' || elemsTipo === '__ref__' || elemsTipo === '__chunks__',
      }
    })

    return NextResponse.json({
      totalLaudos: resultado.length,
      laudos: resultado,
      resumo: {
        comDadosInline: resultado.filter(l => !('erro' in l) && !(l as any).precisaResolucao).length,
        precisamResolucao: resultado.filter(l => !('erro' in l) && (l as any).precisaResolucao).length,
        semElementos: resultado.filter(l => !('erro' in l) && (l as any).elemsInline === 0 && !(l as any).precisaResolucao).length,
      }
    })

  } catch (err) {
    console.error('[debug-mapa]', err)
    return NextResponse.json({ erro: String(err) }, { status: 500 })
  }
}
