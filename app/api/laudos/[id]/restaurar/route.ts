/**
 * GET  /api/laudos/:id/restaurar        → lista as versões de backup disponíveis
 * POST /api/laudos/:id/restaurar?versao=0 → restaura a versão (0=mais recente, 1, 2)
 */

import { Redis } from '@upstash/redis'
import { NextRequest, NextResponse } from 'next/server'

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

type Params = { params: Promise<{ id: string }> }

// GET /api/laudos/:id/restaurar → lista backups disponíveis
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const itens = await redis.lrange(`laudo:${id}:historico`, 0, 2)

    if (!itens || itens.length === 0) {
      return NextResponse.json([])
    }

    const versoes = itens.map((item: any, i: number) => {
      const dados = typeof item === 'string' ? JSON.parse(item) : item
      return {
        versao: i,
        backupEm: dados._backupEm ?? null,
        endereco: dados.enderecoImovel ?? dados.endereco ?? '(sem endereço)',
        proprietario: dados.proprietario ?? '(sem proprietário)',
      }
    })

    return NextResponse.json(versoes)
  } catch (erro) {
    console.error('[GET /api/laudos/:id/restaurar]', erro)
    return NextResponse.json({ erro: 'Erro ao listar backups.' }, { status: 500 })
  }
}

// POST /api/laudos/:id/restaurar?versao=0 → restaura a versão indicada
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const url = new URL(req.url)
    const versao = parseInt(url.searchParams.get('versao') ?? '0', 10)

    if (versao < 0 || versao > 2) {
      return NextResponse.json({ erro: 'Versão inválida. Use 0, 1 ou 2.' }, { status: 400 })
    }

    const itens = await redis.lrange(`laudo:${id}:historico`, 0, 2)

    if (!itens || itens.length === 0) {
      return NextResponse.json({ erro: 'Nenhum backup disponível para este laudo.' }, { status: 404 })
    }

    if (versao >= itens.length) {
      return NextResponse.json({ erro: `Backup versão ${versao} não existe. Disponíveis: ${itens.length}.` }, { status: 404 })
    }

    const item = itens[versao]
    const laudoBackup = typeof item === 'string' ? JSON.parse(item) : item

    // Remove o marcador interno antes de restaurar
    const { _backupEm, ...laudoRestaurado } = laudoBackup

    const agora = new Date().toISOString()

    // Salva o laudo atual como backup antes de restaurar
    const atual = await redis.get<any>(`laudo:${id}`)
    if (atual) {
      await redis.lpush(`laudo:${id}:historico`, JSON.stringify({ ...atual, _backupEm: agora }))
      await redis.ltrim(`laudo:${id}:historico`, 0, 2)
    }

    // Restaura a versão escolhida
    const laudoFinal = {
      ...laudoRestaurado,
      id,
      atualizadoEm: agora,
    }

    await redis.set(`laudo:${id}`, laudoFinal)

    return NextResponse.json({ ok: true, laudo: laudoFinal })
  } catch (erro) {
    console.error('[POST /api/laudos/:id/restaurar]', erro)
    return NextResponse.json({ erro: 'Erro ao restaurar backup.' }, { status: 500 })
  }
}
