/**
 * SALVAR EM: src/app/api/upload/route.ts
 */

// Força o runtime Node.js — necessário para uploads de arquivo no Vercel
export const runtime = 'nodejs'
export const maxDuration = 30

import { put } from '@vercel/blob'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file || file.size === 0) {
      return NextResponse.json({ erro: 'Nenhum arquivo enviado.' }, { status: 400 })
    }

    // Converte para Buffer — mais compatível com Vercel Blob
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const extensao = file.name.split('.').pop()?.toLowerCase() || 'bin'
    const nomeUnico = `laudos/${Date.now()}-${Math.random().toString(36).slice(2)}.${extensao}`

    const blob = await put(nomeUnico, buffer, {
      access: 'public',
      contentType: file.type || 'application/octet-stream',
    })

    return NextResponse.json({ url: blob.url })
  } catch (erro: any) {
    console.error('[POST /api/upload]', erro?.message || erro)
    return NextResponse.json(
      { erro: `Erro ao fazer upload: ${erro?.message || 'erro desconhecido'}` },
      { status: 500 }
    )
  }
}
