/**
 * SALVAR EM: src/app/api/mapa-estatico/route.ts
 *
 * Proxy para tiles ESRI World Imagery (satélite, gratuito, sem API key).
 * URL: /api/mapa-estatico?z=18&x=123&y=456
 */

import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const z = req.nextUrl.searchParams.get('z')
  const x = req.nextUrl.searchParams.get('x')
  const y = req.nextUrl.searchParams.get('y')

  if (!z || !x || !y) {
    return NextResponse.json({ erro: 'z, x, y obrigatórios' }, { status: 400 })
  }

  // ESRI World Imagery — satélite gratuito, sem API key
  // Nota: o formato de URL do ESRI é {z}/{y}/{x} (y antes de x)
  const url = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Lesath-Engenharia/1.0',
        'Accept': 'image/jpeg,image/png,image/*',
        'Referer': 'https://www.arcgis.com/',
      },
    })

    if (!res.ok) return new NextResponse(null, { status: res.status })

    const buffer = await res.arrayBuffer()
    const contentType = res.headers.get('content-type') || 'image/jpeg'

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch (err) {
    console.error('Erro ao buscar tile satélite:', err)
    return new NextResponse(null, { status: 502 })
  }
}
