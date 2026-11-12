/**
 * SALVAR EM: src/app/demandas/page.tsx
 *
 * Página dedicada ao Quadro de Demandas (kanban de acompanhamento de laudos).
 * Exibe os laudos agrupados por statusAcompanhamento em 4 colunas.
 * Permite mover um laudo entre colunas clicando no card e selecionando novo status.
 */

'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import AppShell from '../components/AppShell'
import {
  listarLaudos,
  type LaudoResumo,
  type StatusAcompanhamento,
} from '../../lib/laudos-storage'

// ─── Configuração das colunas ─────────────────────────────────────────────────

type ColConfig = {
  status: StatusAcompanhamento
  label: string
  labelCurto: string
  cabecalhoBg: string
  labelCor: string
  contadorBg: string
  contadorCor: string
  iconePath: string
  iconeCor: string
  bordaAtiva: string
}

const COLUNAS: ColConfig[] = [
  {
    status: 'levantamento_documentos',
    label: 'Levantamento',
    labelCurto: 'Levantamento',
    cabecalhoBg: 'bg-amber-50',
    labelCor: 'text-amber-800',
    contadorBg: 'bg-amber-100',
    contadorCor: 'text-amber-700',
    iconePath: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6',
    iconeCor: '#b45309',
    bordaAtiva: 'border-amber-300',
  },
  {
    status: 'atuando_vistoria',
    label: 'Em Vistoria',
    labelCurto: 'Em Vistoria',
    cabecalhoBg: 'bg-purple-50',
    labelCor: 'text-purple-800',
    contadorBg: 'bg-purple-100',
    contadorCor: 'text-purple-700',
    iconePath: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
    iconeCor: '#7e22ce',
    bordaAtiva: 'border-purple-300',
  },
  {
    status: 'atuando_pesquisa',
    label: 'Em Pesquisa',
    labelCurto: 'Em Pesquisa',
    cabecalhoBg: 'bg-blue-50',
    labelCor: 'text-blue-800',
    contadorBg: 'bg-blue-100',
    contadorCor: 'text-blue-700',
    iconePath: 'M21 21l-4.35-4.35M11 19A8 8 0 1 0 11 3a8 8 0 0 0 0 16z',
    iconeCor: '#1d4ed8',
    bordaAtiva: 'border-blue-300',
  },
  {
    status: 'concluido',
    label: 'Concluído',
    labelCurto: 'Concluído',
    cabecalhoBg: 'bg-emerald-50',
    labelCor: 'text-emerald-800',
    contadorBg: 'bg-emerald-100',
    contadorCor: 'text-emerald-700',
    iconePath: 'M20 6L9 17l-5-5',
    iconeCor: '#065f46',
    bordaAtiva: 'border-emerald-300',
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatarData(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR')
}

// ─── CardDemanda ──────────────────────────────────────────────────────────────

function CardDemanda({
  laudo,
  onMover,
}: {
  laudo: LaudoResumo
  onMover: (laudo: LaudoResumo) => void
}) {
  const endereco = [(laudo as any).logradouro || laudo.endereco, laudo.cidade]
    .filter(Boolean)
    .join(' · ') || 'Endereço não informado'

  return (
    <button
      type="button"
      onClick={() => onMover(laudo)}
      className="w-full text-left rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm hover:shadow-md hover:border-slate-300 transition-all group"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
          {(laudo as any).referencia || (laudo as any).codigo || laudo.id.slice(0, 8).toUpperCase()}
        </span>
        <svg
          className="h-3.5 w-3.5 shrink-0 text-slate-300 group-hover:text-blue-400 transition mt-0.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      </div>
      <p className="mt-1.5 text-sm font-semibold text-slate-900 leading-tight line-clamp-2">
        {endereco}
      </p>
      {(laudo as any).nomeCliente && (
        <p className="mt-1 text-xs text-slate-500 truncate">{(laudo as any).nomeCliente}</p>
      )}
      <p className="mt-2 text-[10px] text-slate-400">
        {formatarData(laudo.criadoEm)}
      </p>
    </button>
  )
}

// ─── Modal de movimentação ────────────────────────────────────────────────────

function ModalMover({
  laudo,
  onConfirmar,
  onFechar,
  salvando,
}: {
  laudo: LaudoResumo
  onConfirmar: (novoStatus: StatusAcompanhamento) => void
  onFechar: () => void
  salvando: boolean
}) {
  const [selecionado, setSelecionado] = useState<StatusAcompanhamento>(
    laudo.statusAcompanhamento || 'levantamento_documentos'
  )

  const opts: { value: StatusAcompanhamento; label: string; dot: string }[] = [
    { value: 'levantamento_documentos', label: 'Levantamento de documentos', dot: 'bg-amber-500' },
    { value: 'atuando_vistoria', label: 'Em vistoria', dot: 'bg-purple-500' },
    { value: 'atuando_pesquisa', label: 'Em pesquisa', dot: 'bg-blue-500' },
    { value: 'concluido', label: 'Concluído', dot: 'bg-emerald-500' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-[20px] border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4 border-b border-slate-100">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Mover demanda
            </p>
            <p className="mt-0.5 text-sm font-semibold text-slate-900 line-clamp-1">
              {(laudo as any).referencia || (laudo as any).codigo || laudo.id.slice(0, 8).toUpperCase()}
            </p>
          </div>
          <button
            onClick={onFechar}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-2">
          {opts.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setSelecionado(opt.value)}
              className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition ${
                selecionado === opt.value
                  ? 'border-blue-300 bg-blue-50 text-blue-900'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${opt.dot}`} />
              {opt.label}
              {selecionado === opt.value && (
                <svg className="ml-auto h-4 w-4 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
          ))}
        </div>

        <div className="flex gap-2 px-5 pb-5">
          <button
            type="button"
            onClick={onFechar}
            className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onConfirmar(selecionado)}
            disabled={salvando || selecionado === laudo.statusAcompanhamento}
            className="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {salvando ? 'Salvando…' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DemandasPage() {
  const { data: session, status: sessionStatus } = useSession()

  const [laudos, setLaudos] = useState<LaudoResumo[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [laudoParaMover, setLaudoParaMover] = useState<LaudoResumo | null>(null)
  const [salvando, setSalvando] = useState(false)

  const carregarLaudos = useCallback(async () => {
    try {
      const lista = await listarLaudos()
      setLaudos(lista)
    } catch {
      setErro('Não foi possível carregar os laudos.')
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    if (sessionStatus === 'authenticated') carregarLaudos()
  }, [sessionStatus, carregarLaudos])

  async function moverLaudo(novoStatus: StatusAcompanhamento) {
    if (!laudoParaMover) return
    setSalvando(true)
    try {
      const res = await fetch('/api/laudos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...laudoParaMover,
          statusAcompanhamento: novoStatus,
          atualizadoEm: new Date().toISOString(),
        }),
      })
      if (!res.ok) throw new Error()
      setLaudos((prev) =>
        prev.map((l) =>
          l.id === laudoParaMover.id
            ? { ...l, statusAcompanhamento: novoStatus }
            : l
        )
      )
      setLaudoParaMover(null)
    } catch {
      alert('Erro ao atualizar status. Tente novamente.')
    } finally {
      setSalvando(false)
    }
  }

  // Laudos que ainda não têm status ficam na coluna Levantamento
  const laudosPorStatus = (status: StatusAcompanhamento) =>
    laudos.filter(
      (l) => (l.statusAcompanhamento || 'levantamento_documentos') === status
    )

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-6 py-8 lg:px-10">

        {/* Cabeçalho da página */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
              GESTÃO DE LAUDOS
            </p>
            <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-slate-950">
              Demandas
            </h1>
            <p className="mt-1 text-sm font-medium text-blue-600">
              {carregando ? 'Carregando…' : `${laudos.length} laudos no total`}
            </p>
          </div>
          <Link
            href="/meus-laudos"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
            Ver lista de laudos
          </Link>
        </div>

        {/* Erro */}
        {erro && (
          <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {erro}
          </div>
        )}

        {/* Kanban */}
        {carregando ? (
          <div className="flex items-center justify-center py-20 text-sm text-slate-400">
            Carregando demandas…
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {COLUNAS.map((col) => {
              const itens = laudosPorStatus(col.status)
              return (
                <div
                  key={col.status}
                  className="flex flex-col rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden"
                >
                  {/* Cabeçalho da coluna */}
                  <div className={`flex items-center gap-2 px-4 py-3 ${col.cabecalhoBg} border-b border-black/5`}>
                    <svg
                      viewBox="0 0 24 24"
                      className="h-3.5 w-3.5 shrink-0"
                      fill="none"
                      stroke={col.iconeCor}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d={col.iconePath} />
                    </svg>
                    <span className={`text-xs font-bold uppercase tracking-wide ${col.labelCor}`}>
                      {col.label}
                    </span>
                    <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold ${col.contadorBg} ${col.contadorCor}`}>
                      {itens.length}
                    </span>
                  </div>

                  {/* Corpo */}
                  <div className="flex flex-1 flex-col gap-2 p-3 min-h-[160px]">
                    {itens.length === 0 ? (
                      <div className="flex flex-1 items-center justify-center rounded-xl border-2 border-dashed border-slate-200 py-6">
                        <span className="text-xs text-slate-400">Nenhuma demanda</span>
                      </div>
                    ) : (
                      itens.map((laudo) => (
                        <CardDemanda
                          key={laudo.id}
                          laudo={laudo}
                          onMover={setLaudoParaMover}
                        />
                      ))
                    )}
                  </div>

                  {/* Rodapé com atalho para novo laudo */}
                  <div className="border-t border-slate-200/60 px-3 py-2.5">
                    <Link
                      href="/novo-laudo"
                      className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 transition"
                    >
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                      Novo laudo
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal de movimentação */}
      {laudoParaMover && (
        <ModalMover
          laudo={laudoParaMover}
          onConfirmar={moverLaudo}
          onFechar={() => setLaudoParaMover(null)}
          salvando={salvando}
        />
      )}
    </AppShell>
  )
}
