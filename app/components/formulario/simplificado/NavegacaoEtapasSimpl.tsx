'use client'

import { useState, useEffect } from 'react'
import { ETAPAS_SIMPL, EtapaIdSimpl } from './etapas-simplificado'

type NavegacaoEtapasSimplProps = {
  etapaAtual: EtapaIdSimpl
  setEtapaAtual: (etapa: EtapaIdSimpl) => void
  laudoUuid?: string
}

export default function NavegacaoEtapasSimpl({
  etapaAtual,
  setEtapaAtual,
  laudoUuid,
}: NavegacaoEtapasSimplProps) {
  const indiceAtual = ETAPAS_SIMPL.findIndex((etapa) => etapa.id === etapaAtual)
  const etapaAnterior = indiceAtual > 0 ? ETAPAS_SIMPL[indiceAtual - 1] : null
  const proximaEtapa = indiceAtual < ETAPAS_SIMPL.length - 1 ? ETAPAS_SIMPL[indiceAtual + 1] : null

  // Lê o ID do sessionStorage (definido pelo laudo-simplificado-page quando salva)
  const [idSessao, setIdSessao] = useState('')
  useEffect(() => {
    const idUrl = new URLSearchParams(window.location.search).get('id') || ''
    const idSession = sessionStorage.getItem('lesath:laudoSimplId') || ''
    setIdSessao(laudoUuid || idSession || idUrl)
  }, [laudoUuid])

  const vizUrl = idSessao
    ? `/visualizar-laudo/simplificado?id=${encodeURIComponent(idSessao)}`
    : '/visualizar-laudo/simplificado'

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200 shadow-[0_-4px_24px_-8px_rgba(15,23,42,0.08)]">
      <div className="mx-auto max-w-4xl flex items-center justify-between gap-4 px-6 py-3">

        <div className="hidden sm:block min-w-0">
          <p className="text-[11px] text-slate-400 uppercase tracking-wide leading-none mb-0.5">
            Etapa {indiceAtual + 1} de {ETAPAS_SIMPL.length}
          </p>
          <p className="text-sm font-medium text-slate-700 truncate">
            {ETAPAS_SIMPL[indiceAtual]?.titulo}
          </p>
        </div>

        <div className="flex items-center gap-3 ml-auto">
          <a
            href={vizUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="8" cy="8" r="2"/>
            </svg>
            Visualizar laudo
          </a>

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
            <a
              href={vizUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-5 py-2 text-sm font-semibold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition"
            >
              Concluir e visualizar
              <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 8l3.5 3.5L13 5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
