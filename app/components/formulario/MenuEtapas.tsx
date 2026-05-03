'use client'

import { useEffect, useRef } from 'react'
import { ETAPAS, EtapaId } from './etapas'

type MenuEtapasProps = {
  etapaAtual: EtapaId
  setEtapaAtual: (etapa: EtapaId) => void
  etapaConcluida: (etapa: EtapaId) => boolean
  tipoLaudo?: 'detalhado' | 'simplificado'
}

export default function MenuEtapas({
  etapaAtual,
  setEtapaAtual,
  etapaConcluida,
  tipoLaudo,
}: MenuEtapasProps) {
  // Etapas excluídas do laudo simplificado: 7 (Acabamentos)
  const ETAPAS_SIMPLIFICADO_EXCLUIR: EtapaId[] = ['7']
  const etapasFiltradas = tipoLaudo === 'simplificado'
    ? ETAPAS.filter((e) => !ETAPAS_SIMPLIFICADO_EXCLUIR.includes(e.id))
    : ETAPAS

  const indiceAtual = etapasFiltradas.findIndex((e) => e.id === etapaAtual)
  const scrollRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])

  // Centraliza a etapa ativa no scroll horizontal
  useEffect(() => {
    const el = itemRefs.current[indiceAtual]
    if (el && scrollRef.current) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }
  }, [indiceAtual])

  const pct = Math.round(((indiceAtual + 1) / etapasFiltradas.length) * 100)

  return (
    <div className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
      {/* Faixa de etapas com scroll horizontal */}
      <div
        ref={scrollRef}
        className="overflow-x-auto scrollbar-none"
        style={{ scrollbarWidth: 'none' }}
      >
        <div className="flex items-stretch min-w-max px-6">
          {etapasFiltradas.map((etapa, i) => {
            const ativa = etapaAtual === etapa.id
            const concluida = etapaConcluida(etapa.id)

            return (
              <button
                key={etapa.id}
                ref={(el) => { itemRefs.current[i] = el }}
                type="button"
                onClick={() => setEtapaAtual(etapa.id)}
                className={`
                  flex items-center gap-2 px-4 py-3.5 text-sm border-b-2 transition-all whitespace-nowrap
                  ${ativa
                    ? 'border-blue-600 text-blue-600 font-medium'
                    : concluida
                    ? 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                    : 'border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-200'
                  }
                `}
              >
                {/* Indicador numérico */}
                <span
                  className={`
                    flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold flex-shrink-0 transition-all
                    ${ativa
                      ? 'bg-blue-600 text-white'
                      : concluida
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-slate-100 text-slate-400'
                    }
                  `}
                >
                  {concluida && !ativa ? '✓' : etapa.id}
                </span>

                {/* Título curto */}
                <span className="text-xs">
                  {etapa.titulo.replace(/^\d[\d.–\s-]+/, '')}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Barra de progresso */}
      <div className="flex items-center gap-3 px-6 py-2 border-t border-slate-100">
        <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-blue-600 transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-xs text-slate-400 tabular-nums shrink-0">
          {indiceAtual + 1} / {etapasFiltradas.length}
        </span>
      </div>
    </div>
  )
}
