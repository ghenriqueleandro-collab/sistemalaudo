/**
 * SALVAR EM: src/app/meus-laudos/page.tsx
 *
 * Atualizado: adicionado card de destaque para o Mapa de Elementos
 * logo abaixo dos cards de status de acompanhamento.
 * O "Quadro de demandas" (kanban) foi movido para /demandas.
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

  // Total de elementos comparativos em todos os laudos
  const totalElementos = useMemo(() => {
    return laudos.reduce((acc, l) => {
      const elems = (l as any).elementosComparativos
      if (Array.isArray(elems)) return acc + elems.length
      const cddm = (l as any).dadosCalculoCDDM
      if (cddm && typeof cddm === 'object' && Array.isArray(cddm.elementos)) {
        return acc + cddm.elementos.length
      }
      return acc
    }, 0)
  }, [laudos])

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

          <Link
            href="/novo-laudo"
            className="inline-flex items-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#0f3d68,#2563eb)] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-900/20 transition hover:-translate-y-0.5"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Novo laudo
          </Link>
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

        {/* ── Card de destaque: Mapa de Elementos ── */}
        <div className="mt-5">
          <Link
            href="/mapa-elementos"
            className="group flex items-center justify-between gap-4 rounded-[28px] border border-slate-200 bg-gradient-to-r from-slate-900 via-blue-950 to-blue-900 px-6 py-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10">
                <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
                  <line x1="8" y1="2" x2="8" y2="18" /><line x1="16" y1="6" x2="16" y2="22" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-white">Mapa de Elementos Comparativos</p>
                  <span className="rounded-full bg-orange-500 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-white">
                    novo
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-white/60">
                  Visualize no mapa todos os imóveis usados como comparativos nos seus laudos
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {totalElementos > 0 && (
                <div className="rounded-xl bg-white/10 px-3 py-1.5 text-center">
                  <p className="text-lg font-bold text-white leading-none">{totalElementos}</p>
                  <p className="text-[9px] text-white/50 uppercase tracking-wide">elemento{totalElementos !== 1 ? 's' : ''}</p>
                </div>
              )}
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-white/50 transition group-hover:text-white group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
              </svg>
            </div>
          </Link>
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
                const cfg =
                  acompanhamentoConfig[laudo.statusAcompanhamento ?? 'levantamento_documentos']
                const urlVisualizar =
                  laudo.tipoLaudo === 'simplificado'
                    ? `/visualizar-laudo/simplificado?id=${encodeURIComponent(laudo.id)}`
                    : `/visualizar-laudo?id=${encodeURIComponent(laudo.id)}`
                const urlEditar =
                  laudo.tipoLaudo === 'simplificado'
                    ? `/laudo/simplificado?id=${encodeURIComponent(laudo.id)}`
                    : `/novo-laudo?id=${encodeURIComponent(laudo.id)}`
                const nomeCliente = laudo.proprietario || laudo.solicitante

                return (
                  <div
                    key={laudo.id}
                    className="flex flex-wrap items-center gap-4 px-6 py-4 hover:bg-slate-50/60 transition"
                  >
                    {/* Código */}
                    <div className="shrink-0 w-16">
                      <span className="text-xs font-mono text-slate-400">#{laudo.codigo}</span>
                    </div>

                    {/* Endereço + cliente */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {laudo.endereco || '—'}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {laudo.cidade || ''}
                        {nomeCliente ? ` · ${nomeCliente}` : ''}
                      </p>
                    </div>

                    {/* Status acompanhamento */}
                    <div className="shrink-0">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${cfg.classe}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${cfg.dotClasse}`} />
                        {cfg.label}
                      </span>
                    </div>

                    {/* Data */}
                    <div className="shrink-0 w-24 text-right">
                      <span className="text-xs text-slate-400">
                        {laudo.data ? formatarData(laudo.data) : '—'}
                      </span>
                    </div>

                    {/* Ações */}
                    <div className="flex shrink-0 items-center gap-2">
                      <Link
                        href={urlVisualizar}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
                      >
                        Visualizar
                      </Link>
                      <Link
                        href={urlEditar}
                        className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 transition"
                      >
                        Editar
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
                          className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50 transition disabled:opacity-50"
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
