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
  const proximaEtapa =
    indiceAtual < ETAPAS.length - 1 ? ETAPAS[indiceAtual + 1] : null

  return (
    <div className="flex items-center justify-between mt-8 gap-4">
      <button
        type="button"
        onClick={() => etapaAnterior && setEtapaAtual(etapaAnterior.id)}
        disabled={!etapaAnterior}
        className="px-4 py-2 rounded border bg-white disabled:opacity-40"
      >
        Voltar
      </button>

      <button
        type="button"
        onClick={() => proximaEtapa && setEtapaAtual(proximaEtapa.id)}
        disabled={!proximaEtapa}
        className="px-4 py-2 rounded border bg-blue-600 text-white disabled:opacity-40"
      >
        Avançar
      </button>
    </div>
  )
}