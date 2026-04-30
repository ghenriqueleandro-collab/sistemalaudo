'use client'

import { ETAPAS, EtapaId } from './etapas'

type NavegacaoEtapasProps = {
  etapaAtual: EtapaId
  setEtapaAtual: (etapa: EtapaId) => void
}

export default function NavegacaoEtapas({
  etapaAtual,
  setEtapaAtual,
}: NavegacaoEtapasProps) {
  const indiceAtual = ETAPAS.findIndex((etapa) => etapa.id === etapaAtual)
  const etapaAnterior = indiceAtual > 0 ? ETAPAS[indiceAtual - 1] : null
  const proximaEtapa = indiceAtual < ETAPAS.length - 1 ? ETAPAS[indiceAtual + 1] : null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200 shadow-[0_-4px_24px_-8px_rgba(15,23,42,0.08)]">
      <div className="mx-auto max-w-4xl flex items-center justify-between gap-4 px-6 py-3">

        {/* Etapa atual */}
        <div className="hidden sm:block min-w-0">
          <p className="text-[11px] text-slate-400 uppercase tracking-wide leading-none mb-0.5">
            Etapa {indiceAtual + 1} de {ETAPAS.length}
          </p>
          <p className="text-sm font-medium text-slate-700 truncate">
            {ETAPAS[indiceAtual]?.titulo}
          </p>
        </div>

        {/* Botões */}
        <div className="flex items-center gap-3 ml-auto">
          <button
            type="button"
            onClick={() => etapaAnterior && setEtapaAtual(etapaAnterior.id)}
            disabled={!etapaAnterior}
            className="flex items-center gap-1.5 px-4 py-2 text-sm border border-slate-200 rounded-xl bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M10 12L6 8l4-4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Anterior
          </button>

          {proximaEtapa ? (
            <button
              type="button"
              onClick={() => setEtapaAtual(proximaEtapa.id)}
              className="flex items-center gap-1.5 px-5 py-2 text-sm font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition"
            >
              Próximo
              <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          ) : (
            <button
              type="button"
              className="flex items-center gap-1.5 px-5 py-2 text-sm font-semibold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition"
            >
              Concluir laudo
              <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 8l3.5 3.5L13 5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
