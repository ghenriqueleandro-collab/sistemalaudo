'use client'

import { useEffect, useRef } from 'react'
import { ETAPAS, EtapaId } from './etapas'

type MenuEtapasProps = {
  etapaAtual: EtapaId
  setEtapaAtual: (etapa: EtapaId) => void
  etapaConcluida: (etapa: EtapaId) => boolean
  metodoAvaliacao?: string
  tratamentoDados?: string
  tipoLaudo?: 'detalhado' | 'simplificado'
}

// 9.2 sempre oculto — benfeitorias agora calculadas dentro do motor CDDM/Evolutivo
const ETAPAS_SEMPRE_OCULTAS: EtapaId[] = ['9.2']
// 10 (Valor do imóvel) oculto no método evolutivo
const ETAPAS_APENAS_COMPARATIVO: EtapaId[] = ['10']

export default function MenuEtapas({
  etapaAtual,
  setEtapaAtual,
  etapaConcluida,
  metodoAvaliacao = '',
  tratamentoDados = '',
  tipoLaudo,
}: MenuEtapasProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef<HTMLButtonElement>(null)

  const isEvolutivo =
    (metodoAvaliacao || 'comparativo') === 'evolutivo' &&
    (tratamentoDados || 'tratamento_por_fatores') === 'tratamento_por_fatores'

  const etapasVisiveis = ETAPAS
    .filter(e => !ETAPAS_SEMPRE_OCULTAS.includes(e.id))
    .filter(e => !isEvolutivo || !ETAPAS_APENAS_COMPARATIVO.includes(e.id))
    .map(e => {
      if (isEvolutivo && e.id === '9.1') {
        return { ...e, titulo: '10. Metodologia — Método Evolutivo' }
      }
      return e
    })

  const indiceAtual = etapasVisiveis.findIndex(e => e.id === etapaAtual)
  const progresso = etapasVisiveis.length > 1
    ? Math.round((indiceAtual / (etapasVisiveis.length - 1)) * 100)
    : 0

  // Centraliza a etapa ativa no scroll
  useEffect(() => {
    if (activeRef.current && scrollRef.current) {
      const container = scrollRef.current
      const btn = activeRef.current
      const containerCenter = container.offsetWidth / 2
      const btnCenter = btn.offsetLeft + btn.offsetWidth / 2
      container.scrollTo({ left: btnCenter - containerCenter, behavior: 'smooth' })
    }
  }, [etapaAtual])

  return (
    <nav className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
      <div ref={scrollRef} className="overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1 px-3 py-2 min-w-max">
          {etapasVisiveis.map((etapa) => {
            const ativa = etapaAtual === etapa.id
            const concluida = etapaConcluida(etapa.id)

            return (
              <button
                key={etapa.id}
                ref={ativa ? activeRef : undefined}
                type="button"
                onClick={() => setEtapaAtual(etapa.id)}
                className={[
                  'flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
                  ativa
                    ? 'bg-blue-600 text-white shadow-sm'
                    : concluida
                    ? 'text-slate-600 hover:bg-slate-100'
                    : 'text-slate-400 hover:bg-slate-50',
                ].join(' ')}
              >
                {concluida && !ativa && (
                  <span className="text-green-500 text-[10px]">✓</span>
                )}
                <span className="max-w-[160px] truncate">{etapa.titulo}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Barra de progresso */}
      <div className="h-0.5 bg-slate-100">
        <div
          className="h-full bg-blue-600 transition-all duration-300"
          style={{ width: `${progresso}%` }}
        />
      </div>
    </nav>
  )
}
