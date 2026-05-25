/**
 * SALVAR EM: src/app/api/portal/laudos/route.ts
 *
 * Rota protegida — só responde a usuários com perfil 'cliente'.
 * Lê o empresaClienteId do JWT e retorna apenas os laudos daquela empresa.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    // Valida o JWT do NextAuth sem precisar das authOptions completas
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })

    if (!token) {
      return NextResponse.json({ erro: 'Não autenticado.' }, { status: 401 })
    }

    if (token.perfil !== 'cliente') {
      return NextResponse.json({ erro: 'Acesso restrito a clientes.' }, { status: 403 })
    }

    const empresaClienteId = token.empresaClienteId as string | undefined
    if (!empresaClienteId) {
      return NextResponse.json(
        { erro: 'Empresa não vinculada ao usuário. Contate o administrador.' },
        { status: 403 }
      )
    }

    // Busca todos os IDs e filtra por empresaClienteId
    const ids = await redis.smembers<string[]>('laudo_ids')
    if (!ids || ids.length === 0) return NextResponse.json([])

    const todos = await Promise.all(ids.map((id) => redis.get<any>(`laudo:${id}`)))

    const laudosDaEmpresa = todos
      .filter((l): l is NonNullable<typeof l> => !!l && l.empresaClienteId === empresaClienteId)
      .map((l) => ({
        // Expõe apenas campos necessários para o portal
        id: l.id,
        endereco: l.endereco || 'Endereço não informado',
        tipo: l.tipo || l.tipoImovel || 'Não informado',
        referenciaCliente: l.referenciaCliente || '',
        statusAcompanhamento: l.statusAcompanhamento || 'levantamento_documentos',
        observacaoCliente: l.observacaoCliente || '',
        tipoLaudo: l.tipoLaudo || 'detalhado',
        criadoEm: l.criadoEm,
        atualizadoEm: l.atualizadoEm,
      }))
      .sort(
        (a, b) =>
          new Date(b.atualizadoEm ?? 0).getTime() -
          new Date(a.atualizadoEm ?? 0).getTime()
      )

    return NextResponse.json(laudosDaEmpresa)
  } catch (erro) {
    console.error('[GET /api/portal/laudos]', erro)
    return NextResponse.json({ erro: 'Erro interno.' }, { status: 500 })
  }
}
