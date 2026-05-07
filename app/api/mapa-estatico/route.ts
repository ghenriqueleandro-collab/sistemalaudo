/**
 * SALVAR EM: src/app/api/mapa-estatico/route.ts
 *
 * Proxy para Geoapify Static Maps API.
 * Retorna imagem JPEG com pin na coordenada exata.
 */

import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const lat = req.nextUrl.searchParams.get('lat')
  const lng = req.nextUrl.searchParams.get('lng')

  if (!lat || !lng) {
    return NextResponse.json({ erro: 'lat e lng obrigatórios' }, { status: 400 })
  }

  const apiKey = process.env.GEOAPIFY_KEY
  if (!apiKey) {
    return NextResponse.json({ erro: 'GEOAPIFY_KEY não configurada' }, { status: 500 })
  }

  // Marker: lonlat:LNG,LAT — NÃO usar encodeURIComponent no marcador completo
  // pois : e ; são separadores da API. Apenas # vira %23
  const markerColor = '%23ff0000'
  const url = `https://maps.geoapify.com/v1/staticmap?style=satellite&width=600&height=400&center=lonlat:${lng},${lat}&zoom=18&marker=lonlat:${lng},${lat};type:material;color:${markerColor};size:large&apiKey=${apiKey}`

  try {
    const res = await fetch(url)
    if (!res.ok) return new NextResponse(null, { status: res.status })

    const buffer = await res.arrayBuffer()
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch (err) {
    console.error('Erro ao buscar mapa Geoapify:', err)
    return new NextResponse(null, { status: 502 })
  }
}
