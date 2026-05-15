'use client'

import { ETAPAS, EtapaId } from './etapas'

type NavegacaoEtapasProps = {
  etapaAtual: EtapaId
  setEtapaAtual: (etapa: EtapaId) => void
  tipoLaudo?: 'detalhado' | 'simplificado'
  metodoAvaliacao?: string
  tratamentoDados?: string
}

const ETAPAS_APENAS_COMPARATIVO: EtapaId[] = ['9.2', '10']

export default function NavegacaoEtapas({
  etapaAtual,
  setEtapaAtual,
  tipoLaudo,
  metodoAvaliacao = '',
  tratamentoDados = '',
}: NavegacaoEtapasProps) {
  const isEvolutivo =
    metodoAvaliacao === 'evolutivo' && tratamentoDados === 'tratamento_por_fatores'

  const etapasVisiveis = ETAPAS.filter(
    e => !isEvolutivo || !ETAPAS_APENAS_COMPARATIVO.includes(e.id)
  )

  const indice = etapasVisiveis.findIndex(e => e.id === etapaAtual)
  const etapaAnterior = indice > 0 ? etapasVisiveis[indice - 1] : null
  const proximaEtapa = indice < etapasVisiveis.length - 1 ? etapasVisiveis[indice + 1] : null
  const etapaAtualObj = etapasVisiveis[indice]
  const total = etapasVisiveis.length

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200 shadow-[0_-1px_3px_rgba(0,0,0,.06)]">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-3 flex items-center justify-between gap-4">

        {/* Info da etapa atual */}
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-widest text-slate-400 leading-none mb-0.5">
            Etapa {indice + 1} de {total}
          </p>
          <p className="text-sm font-medium text-slate-700 truncate">
            {etapaAtualObj?.titulo ?? ''}
          </p>
        </div>

        {/* Botões */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => etapaAnterior && setEtapaAtual(etapaAnterior.id)}
            disabled={!etapaAnterior}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition"
          >
            ← Anterior
          </button>

          {proximaEtapa ? (
            <button
              type="button"
              onClick={() => setEtapaAtual(proximaEtapa.id)}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition"
            >
              Próximo →
            </button>
          ) : (
            <button
              type="submit"
              className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 transition"
            >
              Concluir laudo ✓
            </button>
          )}
        </div>

      </div>
    </div>
  )
}
