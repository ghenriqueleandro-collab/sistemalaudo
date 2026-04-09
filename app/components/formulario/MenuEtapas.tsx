'use client'

import { ETAPAS, EtapaId } from './etapas'

type MenuEtapasProps = {
  etapaAtual: EtapaId
  setEtapaAtual: (etapa: EtapaId) => void
  etapaConcluida: (etapa: EtapaId) => boolean
}

export default function MenuEtapas({
  etapaAtual,
  setEtapaAtual,
  etapaConcluida,
}: MenuEtapasProps) {
  return (
    <aside className="w-full lg:w-80 bg-white rounded-2xl shadow p-4 h-fit lg:sticky lg:top-6">
      <h2 className="text-xl font-bold mb-4">Etapas do laudo</h2>

      <div className="space-y-2">
        {ETAPAS.map((etapa) => {
          const ativa = etapaAtual === etapa.id
          const concluida = etapaConcluida(etapa.id)

          return (
            <button
              key={etapa.id}
              type="button"
              onClick={() => setEtapaAtual(etapa.id)}
              className={`w-full text-left px-4 py-3 rounded-xl border transition ${
                ativa
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white hover:bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium">{etapa.titulo}</span>
                <span
                  className={`text-sm font-bold ${
                    ativa
                      ? 'text-white'
                      : concluida
                      ? 'text-green-600'
                      : 'text-gray-300'
                  }`}
                >
                  {concluida ? '✓' : '○'}
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </aside>
  )
}