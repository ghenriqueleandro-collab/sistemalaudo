/**
 * SALVAR EM: src/app/aprovacoes/page.tsx
 */

'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import AppShell from '../components/AppShell'

type Solicitacao = {
  id: string
  laudoId: string
  laudoCodigo: string
  laudoEndereco: string
  usuarioEmail: string
  usuarioNome: string
  status: 'pendente' | 'aprovada' | 'negada'
  criadoEm: string
  resolvidoEm?: string
}

const statusConfig = {
  pendente: 'bg-amber-50 text-amber-700 ring-amber-200',
  aprovada: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  negada: 'bg-rose-50 text-rose-700 ring-rose-200',
}

const statusLabel = {
  pendente: 'Pendente',
  aprovada: 'Aprovada',
  negada: 'Negada',
}

function formatarData(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR')
}

export default function AprovacoesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const perfil = (session?.user as any)?.perfil

  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([])
  const [carregando, setCarregando] = useState(true)
  const [processando, setProcessando] = useState<string | null>(null)
  const [filtro, setFiltro] = useState<'todas' | 'pendente' | 'aprovada' | 'negada'>('pendente')

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/')
    // Só redireciona se perfil foi carregado E não é admin
    if (status === 'authenticated' && perfil && perfil !== 'admin') router.push('/meus-laudos')
  }, [status, perfil])

  const carregar = useCallback(async () => {
    try {
      const res = await fetch('/api/solicitacoes', { cache: 'no-store' })
      const dados = await res.json()
      setSolicitacoes(dados)
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    if (status === 'authenticated') {
      carregar()
      const intervalo = setInterval(carregar, 15_000)
      return () => clearInterval(intervalo)
    }
  }, [status, carregar])

  async function processar(id: string, acao: 'aprovar' | 'negar') {
    setProcessando(id)
    try {
      const res = await fetch(`/api/solicitacoes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao }),
      })
      if (res.ok) {
        const atualizada = await res.json()
        setSolicitacoes((prev) => prev.map((s) => s.id === id ? atualizada : s))
      } else {
        alert('Erro ao processar solicitação.')
      }
    } finally {
      setProcessando(null)
    }
  }

  const filtradas = solicitacoes.filter((s) => filtro === 'todas' || s.status === filtro)
  const pendentes = solicitacoes.filter((s) => s.status === 'pendente').length

  if (status === 'loading' || carregando) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-24 text-slate-400 text-sm">Carregando...</div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <section className="mx-auto max-w-7xl px-6 pb-16 pt-10 lg:px-10 lg:pt-14">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between mb-8">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-400">administração</div>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">Aprovações</h1>
            <p className="mt-3 text-slate-600">Gerencie as solicitações de exclusão de laudos.</p>
          </div>
          {pendentes > 0 && (
            <div className="inline-flex items-center gap-2 rounded-2xl bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 ring-1 ring-amber-200">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              {pendentes} solicitação{pendentes > 1 ? 'ões' : ''} pendente{pendentes > 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* Filtros */}
        <div className="mb-6 flex gap-2">
          {(['pendente', 'todas', 'aprovada', 'negada'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${filtro === f ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
            >
              {f === 'todas' ? 'Todas' : statusLabel[f]}
            </button>
          ))}
        </div>

        <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-6 py-4 font-semibold">Usuário</th>
                <th className="px-6 py-4 font-semibold">Laudo</th>
                <th className="px-6 py-4 font-semibold">Data da solicitação</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtradas.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    Nenhuma solicitação encontrada.
                  </td>
                </tr>
              )}
              {filtradas.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/70">
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-950">{s.usuarioNome}</div>
                    <div className="text-xs text-slate-400">{s.usuarioEmail}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-950">#{s.laudoCodigo}</div>
                    <div className="text-xs text-slate-400">{s.laudoEndereco}</div>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{formatarData(s.criadoEm)}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${statusConfig[s.status]}`}>
                      {statusLabel[s.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {s.status === 'pendente' ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => processar(s.id, 'aprovar')}
                          disabled={processando === s.id}
                          className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 disabled:opacity-60"
                        >
                          {processando === s.id ? '...' : 'Aprovar'}
                        </button>
                        <button
                          onClick={() => processar(s.id, 'negar')}
                          disabled={processando === s.id}
                          className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 disabled:opacity-60"
                        >
                          {processando === s.id ? '...' : 'Negar'}
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">
                        {s.resolvidoEm ? formatarData(s.resolvidoEm) : '—'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  )
}
