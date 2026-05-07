/**
 * SALVAR EM: src/app/api/mapa-estatico/route.ts
 *
 * Proxy server-side para tiles do OpenStreetMap.
 * Evita CORS ao buscar imagens de mapa no browser.
 *
 * Modo tile: GET /api/mapa-estatico?tile=1&z=16&x=37123&y=23456
 */

import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const z = req.nextUrl.searchParams.get('z')
  const x = req.nextUrl.searchParams.get('x')
  const y = req.nextUrl.searchParams.get('y')

  if (!z || !x || !y) {
    return NextResponse.json({ erro: 'z, x, y obrigatórios' }, { status: 400 })
  }

  // Alterna entre subdomínios a/b/c para não sobrecarregar um único servidor
  const sub = ['a', 'b', 'c'][parseInt(x) % 3]
  const url = `https://${sub}.tile.openstreetmap.org/${z}/${x}/${y}.png`

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Lesath-Engenharia/1.0 (sistema interno de avaliacao imobiliaria)',
        'Accept': 'image/png',
      },
    })

    if (!res.ok) return new NextResponse(null, { status: res.status })

    const buffer = await res.arrayBuffer()
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch (err) {
    console.error('Erro ao buscar tile OSM:', err)
    return new NextResponse(null, { status: 502 })
  }
}
