/**
 * SALVAR EM: src/app/api/usuarios/route.ts
 */

export const runtime = 'nodejs'

import { Redis } from '@upstash/redis'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import bcrypt from 'bcryptjs'

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

// GET /api/usuarios — lista todos os usuários (só admin)
export async function GET(request: NextRequest) {
  try {
    const ids = await redis.smembers<string[]>('usuario_ids')
    if (!ids || ids.length === 0) return NextResponse.json([])

    const usuarios = await Promise.all(ids.map((id) => redis.get<any>(`usuario:${id}`)))

    const resultado = usuarios
      .filter(Boolean)
      .map(({ senhaHash, ...u }) => u) // nunca retorna o hash da senha

    return NextResponse.json(resultado)
  } catch (erro) {
    console.error('[GET /api/usuarios]', erro)
    return NextResponse.json({ erro: 'Erro ao buscar usuários.' }, { status: 500 })
  }
}

// POST /api/usuarios — cria novo usuário (só admin)
export async function POST(request: NextRequest) {
  try {
    const { nome, email, senha, perfil } = await request.json()

    if (!nome || !email || !senha || !perfil) {
      return NextResponse.json({ erro: 'Campos obrigatórios: nome, email, senha, perfil.' }, { status: 400 })
    }

    const emailNorm = email.trim().toLowerCase()

    // Verifica se já existe
    const existente = await redis.get(`usuario:${emailNorm}`)
    if (existente) {
      return NextResponse.json({ erro: 'Já existe um usuário com este e-mail.' }, { status: 409 })
    }

    const senhaHash = await bcrypt.hash(senha, 10)
    const id = crypto.randomUUID()
    const agora = new Date().toISOString()

    const novoUsuario = {
      id,
      nome: nome.trim(),
      email: emailNorm,
      senhaHash,
      perfil, // 'admin' | 'editor' | 'visualizador'
      ativo: true,
      criadoEm: agora,
      permissoes: {
        criarLaudos: perfil !== 'visualizador',
        editarLaudos: perfil !== 'visualizador',
        excluirLaudos: false, // sempre requer aprovação
        visualizarTodos: true,
        gerarPdf: true,
      },
    }

    await Promise.all([
      redis.set(`usuario:${emailNorm}`, novoUsuario),
      redis.sadd('usuario_ids', emailNorm),
    ])

    const { senhaHash: _, ...usuarioSemHash } = novoUsuario
    return NextResponse.json(usuarioSemHash, { status: 201 })
  } catch (erro) {
    console.error('[POST /api/usuarios]', erro)
    return NextResponse.json({ erro: 'Erro ao criar usuário.' }, { status: 500 })
  }
}
