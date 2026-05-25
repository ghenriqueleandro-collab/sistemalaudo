/**
 * SALVAR EM: src/app/meus-laudos/page.tsx
 */

'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import AppShell from '../components/AppShell'
import {
  excluirLaudo,
  filtrarLaudos,
  formatarData,
  formatarMoeda,
  formatarStatusAcompanhamento,
  listarLaudos,
  type LaudoResumo,
  type StatusAcompanhamento,
} from '../../lib/laudos-storage'

// ─── Status de acompanhamento ─────────────────────────────────────────────────

const acompanhamentoConfig: Record<
  StatusAcompanhamento,
  { label: string; classe: string; dotClasse: string }
> = {
  levantamento_documentos: {
    label: 'Levantamento',
    classe: 'bg-amber-50 text-amber-700 ring-amber-200',
    dotClasse: 'bg-amber-500',
  },
  atuando_vistoria: {
    label: 'Em vistoria',
    classe: 'bg-purple-50 text-purple-700 ring-purple-200',
    dotClasse: 'bg-purple-500',
  },
  atuando_pesquisa: {
    label: 'Em pesquisa',
    classe: 'bg-blue-50 text-blue-700 ring-blue-200',
    dotClasse: 'bg-blue-500',
  },
  concluido: {
    label: 'Concluído',
    classe: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    dotClasse: 'bg-emerald-500',
  },
}

const ORDEM_STATUS: StatusAcompanhamento[] = [
  'levantamento_documentos',
  'atuando_vistoria',
  'atuando_pesquisa',
  'concluido',
]

// ─── CardResumo ───────────────────────────────────────────────────────────────

function CardResumo({
  titulo,
  valor,
  classe,
  ativo,
  onClick,
}: {
  titulo: string
  valor: number
  classe: string
  ativo: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[28px] border p-5 text-left transition ${
        ativo
          ? 'border-blue-300 bg-blue-50 shadow-sm'
          : 'border-slate-200 bg-white hover:border-slate-300 shadow-[0_20px_60px_-42px_rgba(15,23,42,0.5)]'
      }`}
    >
      <div className={`inline-flex rounded-2xl px-3 py-1 text-xs font-semibold ${classe}`}>
        {titulo}
      </div>
      <div className="mt-5 text-4xl font-semibold tracking-tight text-slate-950">{valor}</div>
    </button>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MeusLaudosPage() {
  const { data: session } = useSession()
  const perfil = (session?.user as any)?.perfil
  const usuarioEmail = session?.user?.email || ''
  const usuarioNome = session?.user?.name || usuarioEmail

  const [carregando, setCarregando] = useState(true)
  const [laudos, setLaudos] = useState<LaudoResumo[]>([])
  const [busca, setBusca] = useState('')
  const [status, setStatus] = useState('')
  const [cidade, setCidade] = useState('')
  const [tipoImovel, setTipoImovel] = useState('')
  const [finalidade, setFinalidade] = useState('')
  const [tipoLaudo, setTipoLaudo] = useState('')
  const [excluindoId, setExcluindoId] = useState<string | null>(null)
  const [solicitandoId, setSolicitandoId] = useState<string | null>(null)

  const carregarLaudos = useCallback(async () => {
    try {
      const dados = await listarLaudos()
      setLaudos(dados)
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    carregarLaudos()
    const intervalo = setInterval(carregarLaudos, 15_000)
    return () => clearInterval(intervalo)
  }, [carregarLaudos])

  const cidades = useMemo(
    () => [...new Set(laudos.map((i) => i.cidade).filter(Boolean))].sort(),
    [laudos]
  )
  const tipos = useMemo(
    () => [...new Set(laudos.map((i) => i.tipoImovel).filter(Boolean))].sort(),
    [laudos]
  )
  const finalidades = useMemo(
    () => [...new Set(laudos.map((i) => i.finalidade).filter(Boolean))].sort(),
    [laudos]
  )

  const filtrados = useMemo(
    () =>
      filtrarLaudos(laudos, { busca, status, cidade, tipoImovel, finalidade, tipoLaudo }),
    [laudos, busca, status, cidade, tipoImovel, finalidade, tipoLaudo]
  )

  // Contadores por statusAcompanhamento
  const contadores = useMemo(
    () =>
      Object.fromEntries(
        ORDEM_STATUS.map((st) => [
          st,
          laudos.filter(
            (l) => (l.statusAcompanhamento || 'levantamento_documentos') === st
          ).length,
        ])
      ) as Record<StatusAcompanhamento, number>,
    [laudos]
  )

  async function handleExcluir(id: string) {
    if (!confirm('Tem certeza que deseja excluir este laudo?')) return
    try {
      setExcluindoId(id)
      await excluirLaudo(id)
      setLaudos((atual) => atual.filter((item) => item.id !== id))
    } catch {
      alert('Erro ao excluir o laudo.')
    } finally {
      setExcluindoId(null)
    }
  }

  async function handleSolicitarExclusao(laudo: LaudoResumo) {
    if (
      !confirm(
        `Solicitar exclusão do laudo #${laudo.codigo}? O administrador precisará aprovar.`
      )
    )
      return
    setSolicitandoId(laudo.id)
    try {
      const res = await fetch('/api/solicitacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          laudoId: laudo.id,
          laudoCodigo: laudo.codigo,
          laudoEndereco: laudo.endereco,
          usuarioEmail,
          usuarioNome,
        }),
      })
      const dados = await res.json()
      if (!res.ok) {
        alert(dados.erro || 'Erro ao enviar solicitação.')
        return
      }
      alert('Solicitação enviada. O administrador será notificado.')
    } finally {
      setSolicitandoId(null)
    }
  }

  function limparFiltros() {
    setBusca('')
    setStatus('')
    setCidade('')
    setTipoImovel('')
    setFinalidade('')
    setTipoLaudo('')
  }

  const isAdmin = perfil === 'admin'
  const podeExcluirDireto = isAdmin

  return (
    <AppShell>
      <section className="mx-auto max-w-7xl px-6 pb-16 pt-10 lg:px-10 lg:pt-14">

        {/* Cabeçalho */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-400">
              gestão de laudos
            </div>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">
              Meus laudos
            </h1>
            <p className="mt-2 text-slate-500 text-sm">
              {carregando ? 'Carregando...' : `${laudos.length} laudo${laudos.length !== 1 ? 's' : ''} no total`}
            </p>
          </div>
        </div>

        {/* Cards de resumo — statusAcompanhamento */}
        <div className="mt-8 grid gap-4 grid-cols-2 xl:grid-cols-4">
          {ORDEM_STATUS.map((st) => {
            const cfg = acompanhamentoConfig[st]
            return (
              <CardResumo
                key={st}
                titulo={formatarStatusAcompanhamento(st)}
                valor={contadores[st]}
                classe={cfg.classe}
                ativo={status === st}
                onClick={() => setStatus(status === st ? '' : st)}
              />
            )
          })}
        </div>

        {/* Painel de filtros */}
        <div className="mt-8 rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm lg:p-5 space-y-3">
          <div className="grid gap-3 lg:grid-cols-[repeat(5,minmax(0,1fr))_auto]">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none"
            >
              <option value="">Status</option>
              <option value="levantamento_documentos">Levantamento de documentos</option>
              <option value="atuando_vistoria">Atuando na vistoria</option>
              <option value="atuando_pesquisa">Atuando na pesquisa</option>
              <option value="concluido">Concluído</option>
            </select>

            <select
              value={cidade}
              onChange={(e) => setCidade(e.target.value)}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none"
            >
              <option value="">Cidade</option>
              {cidades.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <select
              value={tipoImovel}
              onChange={(e) => setTipoImovel(e.target.value)}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none"
            >
              <option value="">Tipo de imóvel</option>
              {tipos.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>

            <select
              value={finalidade}
              onChange={(e) => setFinalidade(e.target.value)}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none"
            >
              <option value="">Finalidade</option>
              {finalidades.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>

            <select
              value={tipoLaudo}
              onChange={(e) => setTipoLaudo(e.target.value)}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none"
            >
              <option value="">Tipo de laudo</option>
              <option value="detalhado">Detalhado</option>
              <option value="simplificado">Simplificado</option>
            </select>

            <button
              type="button"
              onClick={limparFiltros}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-500 hover:bg-slate-50 transition whitespace-nowrap"
            >
              Limpar filtros
            </button>
          </div>

          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por endereço, matrícula, proprietário ou solicitante..."
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-300 focus:bg-white transition"
          />
        </div>

        {/* Lista de laudos */}
        <div className="mt-6 rounded-[28px] border border-slate-200 bg-white overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <span className="font-semibold text-slate-900">Laudos</span>
            <span className="text-sm text-slate-400">
              {filtrados.length} resultado{filtrados.length !== 1 ? 's' : ''}
            </span>
          </div>

          {carregando ? (
            <div className="px-6 py-16 text-center text-slate-400 text-sm">
              Carregando laudos...
            </div>
          ) : filtrados.length === 0 ? (
            <div className="px-6 py-16 text-center text-slate-400 text-sm">
              Nenhum laudo encontrado com os filtros aplicados.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtrados.map((laudo) => {
                const stAcomp =
                  laudo.statusAcompanhamento || 'levantamento_documentos'
                const cfg = acompanhamentoConfig[stAcomp]
                const rotaEditar =
                  laudo.tipoLaudo === 'simplificado'
                    ? `/laudo/simplificado?id=${encodeURIComponent(laudo.id)}`
                    : `/novo-laudo?id=${encodeURIComponent(laudo.id)}`
                const rotaVisualizar =
                  laudo.tipoLaudo === 'simplificado'
                    ? `/visualizar-laudo/simplificado?id=${encodeURIComponent(laudo.id)}`
                    : `/visualizar-laudo?id=${encodeURIComponent(laudo.id)}`

                return (
                  <div
                    key={laudo.id}
                    className="px-6 py-4 flex flex-wrap items-start justify-between gap-3 hover:bg-slate-50/60 transition"
                  >
                    {/* Info principal */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-0.5">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${cfg.classe}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${cfg.dotClasse}`} />
                          {cfg.label}
                        </span>
                        {laudo.tipoLaudo === 'simplificado' && (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                            Simplificado
                          </span>
                        )}
                      </div>
                      <p className="font-medium text-slate-900 truncate">
                        {laudo.endereco || 'Endereço não informado'}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {[laudo.solicitante || laudo.proprietario, laudo.tipoImovel, laudo.finalidade]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                      {laudo.observacaoCliente && (
                        <p className="mt-1 text-xs text-amber-700 bg-amber-50 rounded px-2 py-1 max-w-sm truncate">
                          {laudo.observacaoCliente}
                        </p>
                      )}
                      <p className="text-[11px] text-slate-400 mt-1">
                        {laudo.valor > 0 ? formatarMoeda(laudo.valor) + ' · ' : ''}
                        {formatarData(laudo.data)}
                      </p>
                    </div>

                    {/* Ações */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <Link
                        href={rotaEditar}
                        className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition"
                      >
                        Editar
                      </Link>
                      <Link
                        href={rotaVisualizar}
                        target="_blank"
                        className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 transition"
                      >
                        Visualizar
                      </Link>
                      {podeExcluirDireto ? (
                        <button
                          type="button"
                          onClick={() => handleExcluir(laudo.id)}
                          disabled={excluindoId === laudo.id}
                          className="rounded-xl border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 transition disabled:opacity-50"
                        >
                          {excluindoId === laudo.id ? '...' : 'Excluir'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSolicitarExclusao(laudo)}
                          disabled={solicitandoId === laudo.id}
                          className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-50 transition disabled:opacity-50"
                        >
                          {solicitandoId === laudo.id ? '...' : 'Solicitar exclusão'}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </section>
    </AppShell>
  )
}
