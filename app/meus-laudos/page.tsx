/**
 * SALVAR EM: src/app/meus-laudos/page.tsx
 */

'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import AppShell from '../components/AppShell'
import {
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

const vistoriaConfig: Record<string, { label: string; classe: string }> = {
  aguardando_agendamento: { label: 'Ag. agendamento', classe: 'bg-slate-100 text-slate-600' },
  agendada:               { label: 'Agendada',         classe: 'bg-amber-50 text-amber-700' },
  realizada:              { label: 'Realizada',         classe: 'bg-purple-50 text-purple-700' },
  fotos_disponiveis:      { label: 'Fotos prontas',     classe: 'bg-blue-50 text-blue-700' },
  finalizado:             { label: 'Finalizado',        classe: 'bg-emerald-50 text-emerald-700' },
}

function CardResumo({ titulo, valor, classe }: { titulo: string; valor: number; classe: string }) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_-42px_rgba(15,23,42,0.5)]">
      <div className={`inline-flex rounded-2xl px-3 py-1 text-xs font-semibold ${classe}`}>{titulo}</div>
      <div className="mt-5 text-4xl font-semibold tracking-tight text-slate-950">{valor}</div>
    </div>
  )
}

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

  const cidades = useMemo(() => [...new Set(laudos.map((i) => i.cidade).filter(Boolean))].sort(), [laudos])
  const tipos = useMemo(() => [...new Set(laudos.map((i) => i.tipoImovel).filter(Boolean))].sort(), [laudos])
  const finalidades = useMemo(() => [...new Set(laudos.map((i) => i.finalidade).filter(Boolean))].sort(), [laudos])

  const filtrados = useMemo(
    () => filtrarLaudos(laudos, { busca, status, cidade, tipoImovel, finalidade }),
    [laudos, busca, status, cidade, tipoImovel, finalidade]
  )

  const resumo = useMemo(() => ({
    total: laudos.length,
    emAndamento: laudos.filter((i) => i.status === 'em_preenchimento').length,
    finalizados: laudos.filter((i) => i.status === 'finalizado').length,
    rascunhos: laudos.filter((i) => i.status === 'rascunho').length,
  }), [laudos])

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
    if (!confirm(`Solicitar exclusão do laudo #${laudo.codigo}? O administrador precisará aprovar.`)) return
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
      if (!res.ok) { alert(dados.erro || 'Erro ao enviar solicitação.'); return }
      alert('Solicitação enviada. O administrador será notificado.')
    } finally {
      setSolicitandoId(null)
    }
  }

  function prepararLaudo(id: string, destino: string) {
    window.location.href = destino + '?id=' + encodeURIComponent(id)
  }

  function limparFiltros() {
    setBusca(''); setStatus(''); setCidade(''); setTipoImovel(''); setFinalidade('')
  }

  // Se perfil ainda não carregou, mostra tudo (evita piscar e sumir botões)
  const perfilCarregado = !!perfil
  const podeEditar = !perfilCarregado || perfil === 'admin' || perfil === 'editor'
  const podeExcluirDireto = !perfilCarregado || perfil === 'admin'
  const podeAgendar = !perfilCarregado || perfil === 'admin' || perfil === 'agendador'

  return (
    <AppShell>
      <section className="mx-auto max-w-7xl px-6 pb-16 pt-10 lg:px-10 lg:pt-14">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-400">central operacional</div>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">Meus laudos</h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">Gerencie, edite e acompanhe todos os laudos em tempo real.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="flex min-w-[280px] items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-slate-300" />
              <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por código, endereço ou proprietário" className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" />
            </label>
            <button type="button" onClick={carregarLaudos} className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm">↻ Atualizar</button>
            {podeEditar && (
              <button type="button" onClick={async () => { await limparLaudoAtual(); window.location.href = '/novo-laudo?modo=novo' }} className="inline-flex items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#15803d,#22c55e)] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-900/20">
                + Novo laudo
              </button>
            )}
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <CardResumo titulo="Total de laudos" valor={resumo.total} classe="bg-blue-50 text-blue-700" />
          <CardResumo titulo="Em andamento" valor={resumo.emAndamento} classe="bg-orange-50 text-orange-700" />
          <CardResumo titulo="Finalizados" valor={resumo.finalizados} classe="bg-emerald-50 text-emerald-700" />
          <CardResumo titulo="Rascunhos" valor={resumo.rascunhos} classe="bg-slate-100 text-slate-700" />
        </div>

        <div className="mt-8 rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm lg:p-5">
          <div className="grid gap-3 lg:grid-cols-[repeat(4,minmax(0,1fr))_220px]">
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none"><option value="">Status</option><option value="rascunho">Rascunho</option><option value="em_preenchimento">Em preenchimento</option><option value="em_revisao">Em revisão</option><option value="finalizado">Finalizado</option></select>
            <select value={cidade} onChange={(e) => setCidade(e.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none"><option value="">Cidade</option>{cidades.map((c) => <option key={c} value={c}>{c}</option>)}</select>
            <select value={tipoImovel} onChange={(e) => setTipoImovel(e.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none"><option value="">Tipo de imóvel</option>{tipos.map((t) => <option key={t} value={t}>{t}</option>)}</select>
            <select value={finalidade} onChange={(e) => setFinalidade(e.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none"><option value="">Finalidade</option>{finalidades.map((f) => <option key={f} value={f}>{f}</option>)}</select>
            <button type="button" onClick={limparFiltros} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">Limpar filtros</button>
          </div>
        </div>

        <div className="mt-8 space-y-3">
          {carregando && (
            <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-12 text-center text-slate-500 shadow-sm">
              Carregando laudos...
            </div>
          )}
          {!carregando && filtrados.length === 0 && (
            <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-12 text-center text-slate-500 shadow-sm">
              Nenhum laudo encontrado com os filtros atuais.
            </div>
          )}
          {filtrados.map((laudo) => {
            const sv = (laudo as any).statusVistoria || 'aguardando_agendamento'
            const vcfg = vistoriaConfig[sv]
            const responsavelNome = (laudo as any).responsavelNome
            return (
              <div key={laudo.id} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm hover:border-slate-300 transition-colors">
                {/* Linha 1 — endereço + badges */}
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-400 mb-0.5">Cód. {laudo.codigo}</p>
                    <p className="font-semibold text-slate-950 text-[15px] leading-snug">{laudo.endereco}</p>
                    {laudo.tipoImovel && (
                      <p className="text-xs text-slate-500 mt-0.5">{laudo.tipoImovel}{laudo.cidade ? ` · ${laudo.cidade}` : ''}</p>
                    )}
                  </div>
                  <div className="flex gap-2 flex-wrap shrink-0">
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${statusConfig[laudo.status]}`}>
                      {formatarStatus(laudo.status)}
                    </span>
                    {vcfg && (
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${vcfg.classe}`}>
                        {vcfg.label}
                      </span>
                    )}
                  </div>
                </div>

                {/* Linha 2 — metadados */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 border-t border-b border-slate-100">
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5">Solicitante</p>
                    <p className="text-sm font-medium text-slate-800">{(laudo as any).solicitante || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5">Responsável</p>
                    {responsavelNome ? (
                      <p className="text-sm font-medium text-slate-800 flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-400 shrink-0" />
                        {responsavelNome}
                      </p>
                    ) : (
                      <p className="text-sm text-slate-400">Não atribuído</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5">Data</p>
                    <p className="text-sm font-medium text-slate-800">{formatarData(laudo.data)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5">Valor</p>
                    <p className="text-sm font-semibold text-slate-900">{formatarMoeda(laudo.valor)}</p>
                  </div>
                </div>

                {/* Linha 3 — finalidade + ações */}
                <div className="flex items-center justify-between gap-4 mt-4">
                  <p className="text-xs text-slate-400 capitalize">{laudo.finalidade || '—'}</p>
                  <div className="flex flex-wrap gap-2">
                    {podeEditar && (
                      <button type="button" onClick={() => prepararLaudo(laudo.id, '/novo-laudo')}
                        className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                        Editar
                      </button>
                    )}
                    <button type="button" onClick={() => prepararLaudo(laudo.id, '/visualizar-laudo')}
                      className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100">
                      Visualizar
                    </button>
                    {podeExcluirDireto && (
                      <button type="button" onClick={() => handleExcluir(laudo.id)} disabled={excluindoId === laudo.id}
                        className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 disabled:opacity-60 hover:bg-rose-100">
                        {excluindoId === laudo.id ? 'Excluindo...' : 'Excluir'}
                      </button>
                    )}
                    {perfil === 'editor' && (
                      <button type="button" onClick={() => handleSolicitarExclusao(laudo)} disabled={solicitandoId === laudo.id}
                        className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 disabled:opacity-60 hover:bg-amber-100">
                        {solicitandoId === laudo.id ? 'Enviando...' : 'Solicitar exclusão'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}

          {!carregando && filtrados.length > 0 && (
            <p className="text-sm text-slate-400 text-center pt-2">
              Mostrando {filtrados.length} de {laudos.length} laudos
            </p>
          )}
        </div>
      </section>
    </AppShell>
  )
}
