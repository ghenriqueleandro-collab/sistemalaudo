/**
 * SALVAR EM: src/app/api/vistoria/route.ts
 */

import { Redis } from '@upstash/redis'
import { NextRequest, NextResponse } from 'next/server'

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

// GET /api/vistoria?token=xxx → retorna dados do laudo pelo token
export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token')
    if (!token) return NextResponse.json({ erro: 'Token não informado.' }, { status: 400 })

    const laudoIdRaw = await redis.get(`vistoria_token:${token}`)
    if (!laudoIdRaw) return NextResponse.json({ erro: 'Link inválido ou expirado.' }, { status: 404 })
    // Upstash às vezes retorna { value: "xxx" } — normalizamos para string
    const laudoId = typeof laudoIdRaw === 'object' && laudoIdRaw !== null
      ? String((laudoIdRaw as any).value ?? JSON.stringify(laudoIdRaw))
      : String(laudoIdRaw)

    const laudo = await redis.get<any>(`laudo:${laudoId}`)
    if (!laudo) return NextResponse.json({ erro: 'Laudo não encontrado.' }, { status: 404 })

    return NextResponse.json({
      laudoId,
      endereco: laudo.endereco || '',
      proprietario: laudo.proprietario || '',
      tipo: laudo.tipo || '',
      statusVistoria: laudo.statusVistoria || 'aguardando_agendamento',
    })
  } catch (erro) {
    console.error('[GET /api/vistoria]', erro)
    return NextResponse.json({ erro: 'Erro ao buscar vistoria.' }, { status: 500 })
  }
}

// POST /api/vistoria → gera token para um laudo
export async function POST(request: NextRequest) {
  try {
    const { laudoId } = await request.json()
    if (!laudoId) return NextResponse.json({ erro: 'laudoId obrigatório.' }, { status: 400 })

    const laudo = await redis.get<any>(`laudo:${laudoId}`)
    if (!laudo) return NextResponse.json({ erro: 'Laudo não encontrado.' }, { status: 404 })

    // Reutiliza token existente se já tiver
    if (laudo.tokenVistoria) {
      return NextResponse.json({ token: laudo.tokenVistoria })
    }

    const token = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

    // Salva mapeamento token → laudoId (expira em 90 dias)
    await redis.set(`vistoria_token:${token}`, laudoId, { ex: 60 * 60 * 24 * 90 })

    // Atualiza laudo com o token
    const laudoAtualizado = {
      ...laudo,
      tokenVistoria: token,
      atualizadoEm: new Date().toISOString(),
    }
    await redis.set(`laudo:${laudoId}`, laudoAtualizado)

    return NextResponse.json({ token })
  } catch (erro) {
    console.error('[POST /api/vistoria]', erro)
    return NextResponse.json({ erro: 'Erro ao gerar token.' }, { status: 500 })
  }
}

// PUT /api/vistoria → atualiza status/agendamento/fotos do laudo
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { laudoId, token, ...atualizacao } = body

    let id = laudoId
    if (!id && token) {
      const raw = await redis.get(`vistoria_token:${token}`)
      id = raw
        ? (typeof raw === 'object' && raw !== null ? String((raw as any).value ?? raw) : String(raw))
        : null
    }
    if (!id) return NextResponse.json({ erro: 'laudoId ou token obrigatório.' }, { status: 400 })

    const laudo = await redis.get<any>(`laudo:${id}`)
    if (!laudo) return NextResponse.json({ erro: 'Laudo não encontrado.' }, { status: 404 })

    const agora = new Date().toISOString()
    const historicoAtual = laudo.historicoEventos || []

    // Adiciona evento ao histórico se houver ação descrita
    const novoHistorico = atualizacao.eventoHistorico
      ? [...historicoAtual, { data: agora, ...atualizacao.eventoHistorico }]
      : historicoAtual

    const { eventoHistorico, ...camposLaudo } = atualizacao

    const laudoAtualizado = {
      ...laudo,
      ...camposLaudo,
      historicoEventos: novoHistorico,
      atualizadoEm: agora,
    }

    await redis.set(`laudo:${id}`, laudoAtualizado)
    return NextResponse.json(laudoAtualizado)
  } catch (erro) {
    console.error('[PUT /api/vistoria]', erro)
    return NextResponse.json({ erro: 'Erro ao atualizar vistoria.' }, { status: 500 })
  }
}
