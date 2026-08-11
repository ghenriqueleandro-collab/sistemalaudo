/**
 * SALVAR EM: src/app/portal/page.tsx
 *
 * Portal de acompanhamento para usuários com perfil 'cliente'.
 * Não usa AppShell — tem layout próprio.
 */

'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import type { StatusAcompanhamento } from '../../lib/laudos-storage'

// ─── Tipos ────────────────────────────────────────────────────────────────────

type LaudoPortal = {
  id: string
  endereco: string
  tipo: string
  referenciaCliente: string
  statusAcompanhamento: StatusAcompanhamento
  observacaoCliente: string
  tipoLaudo: 'detalhado' | 'simplificado'
  criadoEm?: string
  atualizadoEm?: string
}

// ─── Configuração de status ───────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  StatusAcompanhamento,
  { label: string; classe: string; dot: string }
> = {
  levantamento_documentos: {
    label: 'Levantamento de documentos',
    classe: 'bg-amber-50 text-amber-800 ring-amber-300',
    dot: 'bg-amber-500',
  },
  atuando_vistoria: {
    label: 'Atuando na vistoria',
    classe: 'bg-purple-50 text-purple-800 ring-purple-300',
    dot: 'bg-purple-500',
  },
  atuando_pesquisa: {
    label: 'Atuando na pesquisa',
    classe: 'bg-blue-50 text-blue-800 ring-blue-300',
    dot: 'bg-blue-500',
  },
  concluido: {
    label: 'Concluído',
    classe: 'bg-emerald-50 text-emerald-800 ring-emerald-300',
    dot: 'bg-emerald-500',
  },
}

const ORDEM_STATUS: StatusAcompanhamento[] = [
  'levantamento_documentos',
  'atuando_vistoria',
  'atuando_pesquisa',
  'concluido',
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatarData(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR')
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PortalPage() {
  const { data: session, status: sessionStatus } = useSession()
  const router = useRouter()

  const perfil = (session?.user as any)?.perfil
  const empresaNome = (session?.user as any)?.empresaNome || (session?.user as any)?.name || 'Empresa'

  const [laudos, setLaudos] = useState<LaudoPortal[]>([])
  const [carregando, setCarregando] = useState(true)
  const [filtroStatus, setFiltroStatus] = useState<StatusAcompanhamento | ''>('')
  const [busca, setBusca] = useState('')
  const [erro, setErro] = useState('')

  // Redireciona se não for cliente
  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      router.push('/')
      return
    }
    if (sessionStatus === 'authenticated' && perfil && perfil !== 'cliente') {
      router.push('/meus-laudos')
    }
  }, [sessionStatus, perfil, router])

  const carregarLaudos = useCallback(async () => {
    try {
      const res = await fetch('/api/portal/laudos', { cache: 'no-store' })
      if (!res.ok) {
        const dados = await res.json().catch(() => ({}))
        setErro(dados.erro || 'Erro ao carregar laudos.')
        return
      }
      const dados: LaudoPortal[] = await res.json()
      setLaudos(dados)
    } catch {
      setErro('Não foi possível carregar os laudos. Tente novamente.')
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    if (sessionStatus === 'authenticated' && perfil === 'cliente') {
      carregarLaudos()
      const intervalo = setInterval(carregarLaudos, 30_000)
      return () => clearInterval(intervalo)
    }
  }, [sessionStatus, perfil, carregarLaudos])

  // Contadores por status
  const contadores = ORDEM_STATUS.reduce(
    (acc, st) => {
      acc[st] = laudos.filter((l) => l.statusAcompanhamento === st).length
      return acc
    },
    {} as Record<StatusAcompanhamento, number>
  )

  const norm = (v: string) => v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  const laudosFiltrados = laudos.filter((l) => {
    const porStatus = !filtroStatus || l.statusAcompanhamento === filtroStatus
    const termo = norm(busca.trim())
    const porBusca = !termo || [
      l.endereco, l.tipo, l.referenciaCliente, l.observacaoCliente,
    ].some((campo) => norm(campo || '').includes(termo))
    return porStatus && porBusca
  })

  // Loading / erro de sessão
  if (sessionStatus === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-500 text-sm">Carregando...</p>
      </div>
    )
  }

  if (perfil && perfil !== 'cliente') return null

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#eff6ff,white_45%,#e2e8f0)]">

      {/* ── Header ── */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[linear-gradient(135deg,#082f49_0%,#0f3d68_42%,#2563eb_100%)] shadow-[0_12px_45px_-24px_rgba(15,23,42,0.75)]">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-6 px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/50">
              Portal do cliente
            </p>
            <p className="text-sm font-medium text-white mt-0.5">{empresaNome}</p>
          </div>

          <button
            type="button"
            onClick={() => signOut({ callbackUrl: '/' })}
            className="rounded-full bg-white/15 px-4 py-2 text-xs font-medium text-white hover:bg-white/25 transition"
          >
            Sair
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10 lg:py-14">

        {/* Título */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
            Acompanhamento de laudos
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Consulte o andamento de cada laudo solicitado à Lesath Engenharia.
          </p>
        </div>

        {/* Cards de status — clicáveis como filtro */}
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {ORDEM_STATUS.map((st) => {
            const cfg = STATUS_CONFIG[st]
            const ativo = filtroStatus === st
            return (
              <button
                key={st}
                type="button"
                onClick={() => setFiltroStatus(ativo ? '' : st)}
                className={`rounded-[20px] border p-4 text-left transition ${
                  ativo
                    ? 'border-blue-300 bg-blue-50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <span
                  className={`inline-flex h-2.5 w-2.5 rounded-full ${cfg.dot} mb-2`}
                />
                <div className="text-2xl font-semibold text-slate-950">
                  {contadores[st]}
                </div>
                <div className="mt-1 text-xs text-slate-500 leading-tight">
                  {cfg.label}
                </div>
              </button>
            )
          })}
        </div>

        {/* Barra de pesquisa */}
        <div className="mb-6">
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por endereço, tipo, referência..."
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-400 transition shadow-sm"
          />
        </div>

        {/* Mensagem de erro */}
        {erro && (
          <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {erro}
          </div>
        )}

        {/* Lista de laudos */}
        <div className="rounded-[28px] border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <span className="font-semibold text-slate-900">Laudos</span>
            {filtroStatus && (
              <button
                type="button"
                onClick={() => setFiltroStatus('')}
                className="text-xs text-slate-400 hover:text-slate-600 transition"
              >
                Ver todos ×
              </button>
            )}
          </div>

          {carregando ? (
            <div className="px-6 py-16 text-center text-slate-400 text-sm">
              Carregando laudos...
            </div>
          ) : laudosFiltrados.length === 0 ? (
            <div className="px-6 py-16 text-center text-slate-400 text-sm">
              Nenhum laudo encontrado.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {laudosFiltrados.map((laudo) => {
                const cfg = STATUS_CONFIG[laudo.statusAcompanhamento] ?? STATUS_CONFIG.levantamento_documentos
                const concluido = laudo.statusAcompanhamento === 'concluido'
                const urlVisualizar =
                  laudo.tipoLaudo === 'simplificado'
                    ? `/visualizar-laudo/simplificado?id=${encodeURIComponent(laudo.id)}`
                    : `/visualizar-laudo?id=${encodeURIComponent(laudo.id)}`

                return (
                  <div
                    key={laudo.id}
                    className={`px-6 py-5 flex flex-wrap items-start gap-4 ${
                      concluido ? 'bg-emerald-50/30' : ''
                    }`}
                  >
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${cfg.classe}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                          {cfg.label}
                        </span>
                        {laudo.referenciaCliente && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
                            Ref. {laudo.referenciaCliente}
                          </span>
                        )}
                      </div>

                      <p className="font-medium text-slate-900">
                        {laudo.endereco}
                      </p>
                      <p className="text-sm text-slate-500 mt-0.5">
                        {laudo.tipo}
                        {laudo.atualizadoEm && (
                          <> · Atualizado em {formatarData(laudo.atualizadoEm)}</>
                        )}
                      </p>

                      {laudo.observacaoCliente && (
                        <div className="mt-2 rounded-xl border-l-2 border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 leading-relaxed">
                          {laudo.observacaoCliente}
                        </div>
                      )}
                    </div>

                    {/* Ação — download se concluído */}
                    {concluido && (
                      <div className="shrink-0">
                        <a
                          href={urlVisualizar}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100 transition"
                        >
                          <svg
                            className="h-4 w-4"
                            viewBox="0 0 16 16"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                          >
                            <path d="M8 2v8M5 7l3 3 3-3M3 13h10" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          Baixar PDF
                        </a>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <p className="mt-8 text-center text-xs text-slate-400">
          Lesath Engenharia · Dúvidas? Entre em contato com o responsável pelo laudo.
        </p>

      </main>
    </div>
  )
}
