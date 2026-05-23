'use client'

import { useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { obterLaudoAtual, buscarLaudo } from '@/lib/laudos-storage'
import { Suspense } from 'react'

function VisualizarRoteador() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const laudoId = searchParams.get('id')

  useEffect(() => {
    async function redirecionar() {
      try {
        let parsed: any = null
        if (laudoId) {
          const raw = await buscarLaudo(laudoId)
          if (raw) parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
        }
        if (!parsed) {
          const raw = await obterLaudoAtual()
          if (raw) parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
        }
        if (!parsed) {
          router.replace('/meus-laudos')
          return
        }
        const gp = (g?: string) => g === 'III' ? 3 : g === 'II' ? 2 : g === 'I' ? 1 : 0
        const pts = (arr: any[]) => arr.reduce((s: number, i: any) => s + (i.grau ? gp(i.grau) : (i.pontos || 0)), 0)
        const ehDetalhado =
          (parsed.croquis && parsed.croquis.length > 0) ||
          (parsed.acabamentos && parsed.acabamentos.length > 0) ||
          (parsed.responsavelCpf && parsed.responsavelCpf.trim() !== '') ||
          (parsed.fundamentacao && parsed.fundamentacao.length > 0) ||
          (parsed.resumoMercado && parsed.resumoMercado.length > 0)
        const tipo: string = parsed.tipoLaudo === 'detalhado' || ehDetalhado
          ? 'detalhado'
          : 'simplificado'
        const idParam = laudoId ? `?id=${encodeURIComponent(laudoId)}` : ''
        router.replace(`/visualizar-laudo/${tipo}${idParam}`)
      } catch (e) {
        router.replace('/meus-laudos')
      }
    }
    redirecionar()
  }, [laudoId, router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-slate-400 text-sm animate-pulse">Carregando laudo…</div>
    </div>
  )
}

export default function VisualizarLaudoPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="text-slate-400 text-sm">Carregando…</div></div>}>
      <VisualizarRoteador />
    </Suspense>
  )
}
