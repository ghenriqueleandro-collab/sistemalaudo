'use client'

import { useState } from 'react'

type VersaoBackup = {
  versao: number
  backupEm: string | null
  endereco: string
  proprietario: string
}

type Props = {
  laudoId: string
  onRestaurado: () => void
  onFechar: () => void
}

export default function ModalRestaurarLaudo({ laudoId, onRestaurado, onFechar }: Props) {
  const [versoes, setVersoes] = useState<VersaoBackup[] | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [restaurando, setRestaurando] = useState<number | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  async function buscarVersoes() {
    setCarregando(true)
    setErro(null)
    try {
      const res = await fetch(`/api/laudos/${laudoId}/restaurar`)
      const dados = await res.json()
      if (!res.ok) throw new Error(dados.erro ?? 'Erro ao buscar backups')
      setVersoes(dados)
    } catch (e: any) {
      setErro(e.message)
    } finally {
      setCarregando(false)
    }
  }

  async function restaurar(versao: number) {
    setRestaurando(versao)
    setErro(null)
    try {
      const res = await fetch(`/api/laudos/${laudoId}/restaurar?versao=${versao}`, {
        method: 'POST',
      })
      const dados = await res.json()
      if (!res.ok) throw new Error(dados.erro ?? 'Erro ao restaurar')
      onRestaurado()
    } catch (e: any) {
      setErro(e.message)
      setRestaurando(null)
    }
  }

  function formatarData(iso: string | null) {
    if (!iso) return 'Data desconhecida'
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Cabeçalho */}
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-4 flex items-center gap-3">
          <div className="text-2xl">🔄</div>
          <div>
            <h2 className="font-bold text-slate-800 text-lg">Recuperar versão anterior</h2>
            <p className="text-sm text-slate-500">Até 3 versões automáticas são mantidas</p>
          </div>
          <button
            onClick={onFechar}
            className="ml-auto text-slate-400 hover:text-slate-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Conteúdo */}
        <div className="px-6 py-5">
          {versoes === null && (
            <div className="text-center py-4">
              <p className="text-slate-600 mb-4">
                Clique abaixo para ver as versões disponíveis para restauração.
              </p>
              <button
                onClick={buscarVersoes}
                disabled={carregando}
                className="bg-amber-500 hover:bg-amber-600 text-white font-medium px-5 py-2 rounded-lg disabled:opacity-50"
              >
                {carregando ? 'Buscando...' : 'Ver versões disponíveis'}
              </button>
            </div>
          )}

          {versoes !== null && versoes.length === 0 && (
            <div className="text-center py-4">
              <div className="text-4xl mb-2">📭</div>
              <p className="text-slate-600">
                Nenhum backup disponível ainda. Os backups são criados automaticamente a partir do
                próximo salvamento.
              </p>
            </div>
          )}

          {versoes !== null && versoes.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm text-slate-500 mb-3">
                Escolha uma versão para restaurar. O laudo atual será salvo como backup antes da
                restauração.
              </p>
              {versoes.map((v) => (
                <div
                  key={v.versao}
                  className="border rounded-lg p-4 flex items-center justify-between gap-3 hover:bg-slate-50"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="bg-amber-100 text-amber-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                        {v.versao === 0 ? 'Mais recente' : `Versão −${v.versao + 1}`}
                      </span>
                      <span className="text-xs text-slate-400">{formatarData(v.backupEm)}</span>
                    </div>
                    <p className="text-sm text-slate-700 mt-1 font-medium truncate">
                      {v.endereco}
                    </p>
                    <p className="text-xs text-slate-500 truncate">{v.proprietario}</p>
                  </div>
                  <button
                    onClick={() => restaurar(v.versao)}
                    disabled={restaurando !== null}
                    className="shrink-0 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50"
                  >
                    {restaurando === v.versao ? 'Restaurando...' : 'Restaurar'}
                  </button>
                </div>
              ))}
            </div>
          )}

          {erro && (
            <div className="mt-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
              {erro}
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div className="border-t px-6 py-3 bg-slate-50 text-xs text-slate-400">
          Após restaurar, a página será recarregada com os dados da versão selecionada.
        </div>
      </div>
    </div>
  )
}
