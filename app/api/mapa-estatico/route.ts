/**
 * SALVAR EM: src/app/api/mapa-estatico/route.ts
 *
 * Proxy server-side para buscar imagem do OpenStreetMap Static Maps.
 * Evita erro de CORS ao fazer fetch do browser diretamente.
 *
 * Uso: GET /api/mapa-estatico?lat=-23.55&lng=-46.63
 */

import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const lat = req.nextUrl.searchParams.get('lat')
  const lng = req.nextUrl.searchParams.get('lng')

  if (!lat || !lng) {
    return NextResponse.json({ erro: 'lat e lng são obrigatórios' }, { status: 400 })
  }

  const url = `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=16&size=600x400&maptype=mapnik&markers=${lat},${lng},red-pushpin`

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Lesath-Engenharia/1.0' },
    })

    if (!res.ok) {
      return NextResponse.json({ erro: 'Falha ao buscar mapa' }, { status: 502 })
    }

    const buffer = await res.arrayBuffer()
    const contentType = res.headers.get('content-type') || 'image/png'

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (err) {
    console.error('Erro ao buscar mapa:', err)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}
