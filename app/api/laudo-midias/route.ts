/**
 * SALVAR EM: src/app/api/laudo-midias/route.ts
 *
 * Armazena binários grandes (fotos, PDFs) em chaves Redis separadas.
 * Evita que o payload do laudo principal ultrapasse o limite de 4.5MB do Vercel.
 */

import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

// POST /api/laudo-midias — salva um binário
export async function POST(req: NextRequest) {
  try {
    const { chave, dado } = await req.json()
    if (!chave || !dado) {
      return NextResponse.json({ erro: 'chave e dado são obrigatórios' }, { status: 400 })
    }
    await redis.set(chave, dado)
    return NextResponse.json({ ok: true, chave })
  } catch (err) {
    console.error('Erro ao salvar mídia:', err)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}

// GET /api/laudo-midias?chave=xxx — recupera um binário
export async function GET(req: NextRequest) {
  try {
    const chave = req.nextUrl.searchParams.get('chave')
    if (!chave) {
      return NextResponse.json({ erro: 'chave obrigatória' }, { status: 400 })
    }
    const dado = await redis.get<string>(chave)
    if (!dado) {
      return NextResponse.json({ erro: 'Não encontrado' }, { status: 404 })
    }
    return NextResponse.json({ chave, dado })
  } catch (err) {
    console.error('Erro ao buscar mídia:', err)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}

// DELETE /api/laudo-midias?chave=xxx — remove um binário
export async function DELETE(req: NextRequest) {
  try {
    const chave = req.nextUrl.searchParams.get('chave')
    if (!chave) return NextResponse.json({ erro: 'chave obrigatória' }, { status: 400 })
    await redis.del(chave)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}
