/**
 * SALVAR EM: src/app/api/mapa-estatico/route.ts
 *
 * Proxy server-side para Geoapify Static Maps com suporte a múltiplos pins.
 *
 * Query params:
 *  - lat, lng        → coordenada do imóvel avaliando (obrigatório)
 *  - comparativos    → "lat1,lng1|lat2,lng2|..." (opcional)
 *  - style           → estilo do mapa (default: osm-bright)
 *                      ex: osm-bright, osm-carto, satellite, klokantech-basic
 *  - width / height  → dimensões em px (default 900x600, máx 2000)
 *  - zoom            → usado apenas quando NÃO há comparativos (default 17)
 *
 * Comportamento:
 *  - 1 pin vermelho com ícone de casa no avaliando
 *  - N pins azuis numerados (1, 2, 3…) nos comparativos
 *  - Se houver comparativos → enquadramento automático (bounding box)
 *  - Se não → centraliza no avaliando com zoom configurável
 *
 * Backward-compatible com a chamada antiga (?lat=&lng=).
 */

import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const GEOAPIFY_BASE = 'https://maps.geoapify.com/v1/staticmap'

type Ponto = { lat: number; lng: number }

function parsePontos(raw: string | null): Ponto[] {
  if (!raw) return []
  return raw
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((par) => {
      const [la, lo] = par.split(',').map((s) => Number(s.trim()))
      return { lat: la, lng: lo }
    })
    .filter((p) => isFinite(p.lat) && isFinite(p.lng))
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)

  const lat = Number(searchParams.get('lat'))
  const lng = Number(searchParams.get('lng'))
  const comparativos = parsePontos(searchParams.get('comparativos'))
  const style = searchParams.get('style') || 'osm-bright'
  const width = Math.min(2000, Math.max(200, Number(searchParams.get('width') || 900)))
  const height = Math.min(2000, Math.max(200, Number(searchParams.get('height') || 600)))

  if (!isFinite(lat) || !isFinite(lng)) {
    return NextResponse.json(
      { error: 'lat e lng são obrigatórios e numéricos' },
      { status: 400 }
    )
  }

  const apiKey = process.env.GEOAPIFY_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'GEOAPIFY_KEY ausente no servidor' },
      { status: 500 }
    )
  }

  // ── Markers ────────────────────────────────────────────────────────────────
  // Geoapify aceita múltiplos markers separados por "|". Cada marker é uma
  // string no formato "lonlat:LNG,LAT;prop1:val1;prop2:val2..."
  // Importante: separadores `:` e `;` NÃO devem ser URL-encoded; apenas o `#`
  // do hex de cor (que vira %23).
  const markers: string[] = []

  // Avaliando — pin vermelho com ícone de casa, tamanho extra-grande
  markers.push(
    `lonlat:${lng},${lat};type:material;color:%23dc2626;icon:home;iconcolor:%23ffffff;size:x-large`
  )

  // Comparativos — pins azuis com número (1, 2, 3...), tamanho grande
  comparativos.forEach((p, i) => {
    markers.push(
      `lonlat:${p.lng},${p.lat};type:material;color:%232563eb;contentsize:medium;text:${i + 1};textsize:medium;size:large`
    )
  })

  const markerParam = markers.join('|')

  // ── Enquadramento ──────────────────────────────────────────────────────────
  // Com comparativos → bounding box (área retangular contendo todos os pontos
  // + ~18% de padding pra os pins não ficarem cortados nas bordas).
  // Sem comparativos → center+zoom como antes.
  let viewportParams: string
  if (comparativos.length > 0) {
    const allLats = [lat, ...comparativos.map((c) => c.lat)]
    const allLngs = [lng, ...comparativos.map((c) => c.lng)]
    const minLat = Math.min(...allLats)
    const maxLat = Math.max(...allLats)
    const minLng = Math.min(...allLngs)
    const maxLng = Math.max(...allLngs)
    const padLat = Math.max(0.0008, (maxLat - minLat) * 0.18)
    const padLng = Math.max(0.0008, (maxLng - minLng) * 0.18)
    viewportParams = `area=rect:${minLng - padLng},${minLat - padLat},${maxLng + padLng},${maxLat + padLat}`
  } else {
    const zoom = searchParams.get('zoom') || '17'
    viewportParams = `center=lonlat:${lng},${lat}&zoom=${zoom}`
  }

  // ── URL final ──────────────────────────────────────────────────────────────
  const url =
    `${GEOAPIFY_BASE}` +
    `?style=${encodeURIComponent(style)}` +
    `&width=${width}&height=${height}` +
    `&${viewportParams}` +
    `&marker=${markerParam}` +
    `&apiKey=${apiKey}`

  try {
    const r = await fetch(url, { cache: 'no-store' })

    if (!r.ok) {
      const detail = await r.text().catch(() => '')
      // Retorna 502 quando a Geoapify devolve 403 (problema de chave/plano)
      // pra não confundir com 403 do nosso servidor.
      const status = r.status === 403 ? 502 : r.status
      return NextResponse.json(
        {
          error: `Geoapify retornou ${r.status}`,
          detail: detail.slice(0, 500),
          urlDebug: url.replace(apiKey, '***'),
        },
        { status }
      )
    }

    const buf = await r.arrayBuffer()
    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': r.headers.get('Content-Type') || 'image/jpeg',
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch (e: any) {
    return NextResponse.json(
      { error: 'Falha ao buscar mapa', detail: String(e?.message ?? e) },
      { status: 502 }
    )
  }
}
