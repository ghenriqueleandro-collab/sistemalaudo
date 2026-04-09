'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import AppShell from '../components/AppShell'
import {
  definirLaudoAtual,
  excluirLaudo,
  filtrarLaudos,
  formatarData,
  formatarMoeda,
  formatarStatus,
  listarLaudos,
  limparLaudoAtual,
  type LaudoResumo,
  type StatusLaudo,
} from '../../lib/laudos-storage'

const statusConfig: Record<StatusLaudo, string> = {
  rascunho: 'bg-amber-50 text-amber-700 ring-amber-200',
  em_preenchimento: 'bg-blue-50 text-blue-700 ring-blue-200',
  em_revisao: 'bg-rose-50 text-rose-700 ring-rose-200',
  finalizado: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
}

function CardResumo({ titulo, valor, classe }: { titulo: string; valor: number; classe: string }) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_-42px_rgba(15,23,42,0.5)]">
      <div className={`inline-flex rounded-2xl px-3 py-1 text-xs font-semibold ${classe}`}>
        {titulo}
      </div>
      <div className="mt-5 text-4xl font-semibold tracking-tight text-slate-950">{valor}</div>
    </div>
  )
}

export default function MeusLaudosPage() {
  const [carregando, setCarregando] = useState(true)
  const [laudos, setLaudos] = useState<LaudoResumo[]>([])
  const [busca, setBusca] = useState('')
  const [status, setStatus] = useState('')
  const [cidade, setCidade] = useState('')
  const [tipoImovel, setTipoImovel] = useState('')
  const [finalidade, setFinalidade] = useState('')
  const [excluindoId, setExcluindoId] = useState<string | null>(null)

  useEffect(() => {
    listarLaudos().then((dados) => {
      setLaudos(dados)
      setCarregando(false)
    })
  }, [])

  const cidades = useMemo(
    () => [...new Set(laudos.map((item) => item.cidade).filter(Boolean))].sort(),
    [laudos]
  )
  const tipos = useMemo(
    () => [...new Set(laudos.map((item) => item.tipoImovel).filter(Boolean))].sort(),
    [laudos]
  )
  const finalidades = useMemo(
    () => [...new Set(laudos.map((item) => item.finalidade).filter(Boolean))].sort(),
    [laudos]
  )

  const filtrados = useMemo(
    () =>
      filtrarLaudos(laudos, {
        busca,
        status,
        cidade,
        tipoImovel,
        finalidade,
      }),
    [laudos, busca, status, cidade, tipoImovel, finalidade]
  )

  const resumo = useMemo(
    () => ({
      total: laudos.length,
      emAndamento: laudos.filter((item) => item.status === 'em_preenchimento').length,
      finalizados: laudos.filter((item) => item.status === 'finalizado').length,
      rascunhos: laudos.filter((item) => item.status === 'rascunho').length,
    }),
    [laudos]
  )

  async function handleExcluir(id: string) {
  const confirmar = window.confirm('Tem certeza que deseja excluir este laudo?')
  if (!confirmar) return

  try {
    setExcluindoId(id)
    await excluirLaudo(id)
    setLaudos((atual) => atual.filter((item) => item.id !== id))
  } catch (error) {
    console.error(error)
    alert('Erro ao excluir o laudo.')
  } finally {
    setExcluindoId(null)
  }
}

  async function prepararLaudo(id: string, destino: string) {
    const ok = await definirLaudoAtual(id)
    if (!ok) return
    window.location.href = destino
  }

  function limparFiltros() {
    setBusca('')
    setStatus('')
    setCidade('')
    setTipoImovel('')
    setFinalidade('')
  }

  return (
    <AppShell>
      <section className="mx-auto max-w-7xl px-6 pb-16 pt-10 lg:px-10 lg:pt-14">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-400">
              central operacional
            </div>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">
              Meus laudos
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
              Gerencie, edite e acompanhe todos os laudos cadastrados em uma
              estrutura offline organizada e pronta para futura sincronização.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="flex min-w-[280px] items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-slate-300" />
              <input
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
                placeholder="Buscar por código, endereço ou proprietário"
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
              />
            </label>

            <button
  type="button"
  onClick={async () => {
    await limparLaudoAtual()
    window.location.href = '/novo-laudo?modo=novo'
  }}
  className="inline-flex items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#15803d,#22c55e)] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-900/20"
>
  + Novo laudo
</button>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <CardResumo titulo="Total de laudos" valor={resumo.total} classe="bg-blue-50 text-blue-700" />
          <CardResumo titulo="Em andamento" valor={resumo.emAndamento} classe="bg-orange-50 text-orange-700" />
          <CardResumo titulo="Finalizados" valor={resumo.finalizados} classe="bg-emerald-50 text-emerald-700" />
          <CardResumo titulo="Rascunhos" valor={resumo.rascunhos} classe="bg-slate-100 text-slate-700" />
        </div>

        <div className="mt-8 rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.45)] lg:p-5">
          <div className="grid gap-3 lg:grid-cols-[repeat(4,minmax(0,1fr))_220px]">
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none">
              <option value="">Status</option>
              <option value="rascunho">Rascunho</option>
              <option value="em_preenchimento">Em preenchimento</option>
              <option value="em_revisao">Em revisão</option>
              <option value="finalizado">Finalizado</option>
            </select>

            <select value={cidade} onChange={(e) => setCidade(e.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none">
              <option value="">Cidade</option>
              {cidades.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <select value={tipoImovel} onChange={(e) => setTipoImovel(e.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none">
              <option value="">Tipo de imóvel</option>
              {tipos.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <select value={finalidade} onChange={(e) => setFinalidade(e.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none">
              <option value="">Finalidade</option>
              {finalidades.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={limparFiltros}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
            >
              Limpar filtros
            </button>
          </div>
        </div>

        <div className="mt-8 overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_24px_70px_-42px_rgba(15,23,42,0.45)]">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-6 py-4 font-semibold">Código</th>
                  <th className="px-6 py-4 font-semibold">Endereço</th>
                  <th className="px-6 py-4 font-semibold">Cidade</th>
                  <th className="px-6 py-4 font-semibold">Tipo</th>
                  <th className="px-6 py-4 font-semibold">Solicitante</th>
                  <th className="px-6 py-4 font-semibold">Data</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold">Valor</th>
                  <th className="px-6 py-4 font-semibold">Ações</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 text-slate-700">
                {carregando && (
  <tr>
    <td colSpan={9} className="px-6 py-12 text-center text-slate-500">
      Carregando laudos...
    </td>
  </tr>
)}

{!carregando && filtrados.length === 0 && (
  <tr>
    <td colSpan={9} className="px-6 py-12 text-center text-slate-500">
      Nenhum laudo encontrado com os filtros atuais.
    </td>
  </tr>
)}

                {filtrados.map((laudo) => (
                  <tr key={laudo.id} className="hover:bg-slate-50/70">
                    <td className="px-6 py-4 font-semibold text-slate-950">{laudo.codigo}</td>
                    <td className="px-6 py-4">{laudo.endereco}</td>
                    <td className="px-6 py-4">{laudo.cidade}</td>
                    <td className="px-6 py-4">{laudo.tipoImovel}</td>
                    <td className="px-6 py-4">{(laudo as any).solicitante || '—'}</td>
                    <td className="px-6 py-4">{formatarData(laudo.data)}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${statusConfig[laudo.status]}`}>
                        {formatarStatus(laudo.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium">{formatarMoeda(laudo.valor)}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => prepararLaudo(laudo.id, '/novo-laudo')}
                          className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => prepararLaudo(laudo.id, '/visualizar-laudo')}
                          className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700"
                        >
                          Visualizar
                        </button>
                        <button
  type="button"
  onClick={() => handleExcluir(laudo.id)}
  disabled={excluindoId === laudo.id}
  className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 disabled:opacity-60 disabled:cursor-not-allowed"
>
  {excluindoId === laudo.id ? 'Excluindo...' : 'Excluir'}
</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-100 px-6 py-4 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
            <div>
              Mostrando {Math.min(filtrados.length, 10)} de {filtrados.length} laudos encontrados.
            </div>
            <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Base preparada para futuro backend
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  )
}
