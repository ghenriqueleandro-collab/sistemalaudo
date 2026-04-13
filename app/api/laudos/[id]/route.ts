/**
 * SALVAR EM: src/app/api/upload/route.ts
 */

import { put } from '@vercel/blob'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ erro: 'Nenhum arquivo enviado.' }, { status: 400 })
    }

    // Gera um nome único para evitar colisões
    const extensao = file.name.split('.').pop() || 'bin'
    const nomeUnico = `laudos/${Date.now()}-${Math.random().toString(36).slice(2)}.${extensao}`

    const blob = await put(nomeUnico, file, {
      access: 'public',
      contentType: file.type,
    })

    return NextResponse.json({ url: blob.url })
  } catch (erro) {
    console.error('[POST /api/upload]', erro)
    return NextResponse.json({ erro: 'Erro ao fazer upload do arquivo.' }, { status: 500 })
  }
}
