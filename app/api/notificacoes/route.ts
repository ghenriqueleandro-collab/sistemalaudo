/**
 * SALVAR EM: src/app/api/notificacoes/route.ts
 */

import { Redis } from '@upstash/redis'
import { NextRequest, NextResponse } from 'next/server'

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

// GET /api/notificacoes?email=usuario@lesath.com
export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get('email')
    if (!email) {
      return NextResponse.json({ erro: 'Parâmetro email obrigatório.' }, { status: 400 })
    }

    const ids = await redis.smembers<string[]>(`notificacoes:${email}`)
    if (!ids || ids.length === 0) return NextResponse.json([])

    const notificacoes = await Promise.all(ids.map((id) => redis.get<any>(`notificacao:${id}`)))

    const resultado = notificacoes
      .filter(Boolean)
      .sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime())

    return NextResponse.json(resultado)
  } catch (erro) {
    console.error('[GET /api/notificacoes]', erro)
    return NextResponse.json({ erro: 'Erro ao buscar notificações.' }, { status: 500 })
  }
}

// PUT /api/notificacoes — marca uma ou todas como lidas
// body: { id?: string, email: string, marcarTodas?: boolean }
export async function PUT(request: NextRequest) {
  try {
    const { id, email, marcarTodas } = await request.json()

    if (!email) {
      return NextResponse.json({ erro: 'Campo email obrigatório.' }, { status: 400 })
    }

    if (marcarTodas) {
      const ids = await redis.smembers<string[]>(`notificacoes:${email}`)
      if (ids && ids.length > 0) {
        await Promise.all(
          ids.map(async (nid) => {
            const notif = await redis.get<any>(`notificacao:${nid}`)
            if (notif) await redis.set(`notificacao:${nid}`, { ...notif, lida: true })
          })
        )
      }
      return NextResponse.json({ sucesso: true })
    }

    if (id) {
      const notif = await redis.get<any>(`notificacao:${id}`)
      if (!notif) return NextResponse.json({ erro: 'Notificação não encontrada.' }, { status: 404 })
      await redis.set(`notificacao:${id}`, { ...notif, lida: true })
      return NextResponse.json({ sucesso: true })
    }

    return NextResponse.json({ erro: 'Informe id ou marcarTodas.' }, { status: 400 })
  } catch (erro) {
    console.error('[PUT /api/notificacoes]', erro)
    return NextResponse.json({ erro: 'Erro ao atualizar notificações.' }, { status: 500 })
  }
}
