'use client'

/**
 * SALVAR EM: src/app/agendamentos/page.tsx
 */

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import AppShell from '../components/AppShell'

type StatusVistoria =
  | 'aguardando_agendamento'
  | 'agendada'
  | 'realizada'
  | 'fotos_disponiveis'
  | 'finalizado'

type EventoHistorico = {
  data: string
  usuario: string
  acao: string
}

type LaudoAgendamento = {
  id: string
  endereco: string
  proprietario: string
  tipo: string
  finalidade: string
  solicitante: string
  statusVistoria: StatusVistoria
  tokenVistoria?: string
  dataAgendamento?: string
  horarioAgendamento?: string
  nomeVistoriador?: string
  editorResponsavelNome?: string
  editorResponsavelEmail?: string
  criadoPorNome?: string
  historicoEventos?: EventoHistorico[]
  criadoEm: string
}

type Usuario = {
  id: string
  nome: string
  email: string
  perfil: string
  ativo: boolean
}

const statusLabel: Record<StatusVistoria, string> = {
  aguardando_agendamento: 'Aguardando agendamento',
  agendada: 'Vistoria agendada',
  realizada: 'Vistoria realizada',
  fotos_disponiveis: 'Fotos disponíveis',
  finalizado: 'Finalizado',
}

const statusClasse: Record<StatusVistoria, string> = {
  aguardando_agendamento: 'bg-slate-100 text-slate-600',
  agendada: 'bg-amber-50 text-amber-700',
  realizada: 'bg-purple-50 text-purple-700',
  fotos_disponiveis: 'bg-blue-50 text-blue-700',
  finalizado: 'bg-emerald-50 text-emerald-700',
}

function formatarData(iso: string) {
  if (!iso) return '-'
  return new Date(iso).toLocaleDateString('pt-BR')
}

function formatarDataHora(iso: string) {
  if (!iso) return '-'
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR') + ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export default function AgendamentosPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const perfil = (session?.user as any)?.perfil

  const [laudos, setLaudos] = useState<LaudoAgendamento[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [carregando, setCarregando] = useState(true)
  const [laudoSelecionado, setLaudoSelecionado] = useState<LaudoAgendamento | null>(null)
  const [filtroStatus, setFiltroStatus] = useState<StatusVistoria | ''>('')
  const [salvando, setSalvando] = useState(false)
  const [linkCopiado, setLinkCopiado] = useState(false)

  // Campos do modal de agendamento
  const [dataAgendamento, setDataAgendamento] = useState('')
  const [horarioAgendamento, setHorarioAgendamento] = useState('')
  const [nomeVistoriador, setNomeVistoriador] = useState('')
  const [editorResponsavelEmail, setEditorResponsavelEmail] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/')
    if (status === 'authenticated' && perfil && perfil !== 'admin' && perfil !== 'agendador') {
      router.push('/meus-laudos')
    }
  }, [status, perfil])

  useEffect(() => {
    if (status === 'authenticated') {
      carregarDados()
    }
  }, [status])

  async function carregarDados() {
    setCarregando(true)
    try {
      const [resLaudos, resUsuarios] = await Promise.all([
        fetch('/api/laudos', { cache: 'no-store' }),
        fetch('/api/usuarios', { cache: 'no-store' }),
      ])
      const dadosLaudos = await resLaudos.json()
      const dadosUsuarios = await resUsuarios.json()
      setLaudos(dadosLaudos.filter(Boolean))
      setUsuarios(dadosUsuarios.filter((u: Usuario) => u.ativo && (u.perfil === 'editor' || u.perfil === 'admin')))
    } finally {
      setCarregando(false)
    }
  }

  function selecionarLaudo(laudo: LaudoAgendamento) {
    setLaudoSelecionado(laudo)
    setDataAgendamento(laudo.dataAgendamento || '')
    setHorarioAgendamento(laudo.horarioAgendamento || '')
    setNomeVistoriador(laudo.nomeVistoriador || '')
    setEditorResponsavelEmail(laudo.editorResponsavelEmail || '')
    setLinkCopiado(false)
  }

  async function gerarLink() {
    if (!laudoSelecionado) return
    setSalvando(true)
    try {
      const res = await fetch('/api/vistoria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ laudoId: laudoSelecionado.id }),
      })
      const { token } = await res.json()
      const laudo = { ...laudoSelecionado, tokenVistoria: token }
      setLaudoSelecionado(laudo)
      setLaudos((prev) => prev.map((l) => l.id === laudo.id ? laudo : l))
    } finally {
      setSalvando(false)
    }
  }

  function copiarLink() {
    if (!laudoSelecionado?.tokenVistoria) return
    const link = `${window.location.origin}/vistoria/${laudoSelecionado.tokenVistoria}`
    navigator.clipboard.writeText(link)
    setLinkCopiado(true)
    setTimeout(() => setLinkCopiado(false), 3000)
  }

  async function salvarAgendamento() {
    if (!laudoSelecionado) return
    if (!dataAgendamento || !horarioAgendamento) {
      alert('Preencha data e horário da vistoria.')
      return
    }
    setSalvando(true)
    try {
      const usuarioResp = usuarios.find((u) => u.email === editorResponsavelEmail)
      const nomeResponsavel = session?.user?.name || 'Agendador'

      await fetch('/api/vistoria', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          laudoId: laudoSelecionado.id,
          statusVistoria: 'agendada',
          dataAgendamento,
          horarioAgendamento,
          nomeVistoriador,
          editorResponsavelEmail,
          editorResponsavelNome: usuarioResp?.nome || '',
          eventoHistorico: {
            usuario: nomeResponsavel,
            acao: `Vistoria agendada para ${dataAgendamento} às ${horarioAgendamento}${nomeVistoriador ? ` — Vistoriador: ${nomeVistoriador}` : ''}`,
          },
        }),
      })

      // Notifica o responsável pelo laudo
      if (editorResponsavelEmail) {
        await fetch('/api/notificacoes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: editorResponsavelEmail,
            tipo: 'vistoria_agendada',
            titulo: 'Vistoria agendada',
            mensagem: `A vistoria do imóvel em ${laudoSelecionado.endereco} foi agendada para ${dataAgendamento} às ${horarioAgendamento}.`,
          }),
        })
      }

      await carregarDados()
      setLaudoSelecionado(null)
      alert('Agendamento salvo com sucesso!')
    } finally {
      setSalvando(false)
    }
  }

  async function marcarRealizada() {
    if (!laudoSelecionado) return
    if (!confirm('Confirmar que a vistoria foi realizada?')) return
    setSalvando(true)
    try {
      const nomeResponsavel = session?.user?.name || 'Agendador'
      await fetch('/api/vistoria', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          laudoId: laudoSelecionado.id,
          statusVistoria: 'realizada',
          eventoHistorico: {
            usuario: nomeResponsavel,
            acao: 'Vistoria marcada como realizada',
          },
        }),
      })
      await carregarDados()
      setLaudoSelecionado(null)
    } finally {
      setSalvando(false)
    }
  }

  const laudosFiltrados = laudos
    .filter((l) => !filtroStatus || l.statusVistoria === filtroStatus || (!l.statusVistoria && filtroStatus === 'aguardando_agendamento'))

  const contadores = {
    aguardando_agendamento: laudos.filter((l) => !l.statusVistoria || l.statusVistoria === 'aguardando_agendamento').length,
    agendada: laudos.filter((l) => l.statusVistoria === 'agendada').length,
    realizada: laudos.filter((l) => l.statusVistoria === 'realizada').length,
    fotos_disponiveis: laudos.filter((l) => l.statusVistoria === 'fotos_disponiveis').length,
    finalizado: laudos.filter((l) => l.statusVistoria === 'finalizado').length,
  }

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

        {/* Cabeçalho */}
        <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm mb-8">
          <div className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-400">gestão de vistorias</div>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">Agendamentos</h1>
          <p className="mt-2 text-slate-500 text-sm">Acompanhe e gerencie as vistorias de cada laudo.</p>
        </div>

        {/* Cards de resumo */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {(Object.entries(contadores) as [StatusVistoria, number][]).map(([st, qtd]) => (
            <button
              key={st}
              onClick={() => setFiltroStatus(filtroStatus === st ? '' : st)}
              className={`rounded-2xl border p-4 text-left transition ${filtroStatus === st ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
            >
              <div className="text-2xl font-semibold text-slate-950">{qtd}</div>
              <div className="text-xs text-slate-500 mt-1 leading-tight">{statusLabel[st]}</div>
            </button>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
          {/* Lista de laudos */}
          <div className="rounded-[28px] border border-slate-200 bg-white overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <span className="font-semibold text-slate-900">Laudos</span>
              <span className="text-sm text-slate-400">{laudosFiltrados.length} {filtroStatus ? statusLabel[filtroStatus] : 'no total'}</span>
            </div>

            {laudosFiltrados.length === 0 ? (
              <div className="px-6 py-16 text-center text-slate-400 text-sm">Nenhum laudo encontrado.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {laudosFiltrados.map((laudo) => {
                  const st = laudo.statusVistoria || 'aguardando_agendamento'
                  return (
                    <div
                      key={laudo.id}
                      onClick={() => selecionarLaudo(laudo)}
                      className={`px-6 py-4 flex items-start justify-between gap-4 cursor-pointer hover:bg-slate-50 transition ${laudoSelecionado?.id === laudo.id ? 'bg-blue-50/50' : ''}`}
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900 truncate">{laudo.endereco || 'Endereço não informado'}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {laudo.proprietario || '—'}
                          {laudo.editorResponsavelNome && ` · Resp: ${laudo.editorResponsavelNome}`}
                        </p>
                        {laudo.dataAgendamento && (
                          <p className="text-xs text-amber-600 mt-0.5">
                            {laudo.horarioAgendamento ? `${laudo.dataAgendamento} às ${laudo.horarioAgendamento}` : laudo.dataAgendamento}
                          </p>
                        )}
                      </div>
                      <span className={`shrink-0 inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusClasse[st as StatusVistoria]}`}>
                        {statusLabel[st as StatusVistoria]}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Painel lateral */}
          {laudoSelecionado ? (
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm space-y-5 h-fit">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">Imóvel</p>
                <p className="font-semibold text-slate-900">{laudoSelecionado.endereco}</p>
                <p className="text-sm text-slate-500">{laudoSelecionado.proprietario}</p>
                {laudoSelecionado.tipo && <p className="text-xs text-slate-400 mt-0.5">{laudoSelecionado.tipo}</p>}
              </div>

              {/* Link de vistoria */}
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Link para vistoriador</p>
                {laudoSelecionado.tokenVistoria ? (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        readOnly
                        value={`${typeof window !== 'undefined' ? window.location.origin : ''}/vistoria/${laudoSelecionado.tokenVistoria}`}
                        className="flex-1 text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-600 outline-none"
                      />
                      <button
                        onClick={copiarLink}
                        className={`shrink-0 rounded-xl px-3 py-2 text-xs font-semibold transition ${linkCopiado ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-blue-600 text-white'}`}
                      >
                        {linkCopiado ? '✓ Copiado' : 'Copiar'}
                      </button>
                    </div>
                    <p className="text-xs text-slate-400">Envie este link ao vistoriador via WhatsApp ou SMS.</p>
                  </div>
                ) : (
                  <button
                    onClick={gerarLink}
                    disabled={salvando}
                    className="w-full rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {salvando ? 'Gerando...' : 'Gerar link de vistoria'}
                  </button>
                )}
              </div>

              {/* Dados do agendamento */}
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Agendamento</p>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Data</label>
                    <input type="date" value={dataAgendamento} onChange={(e) => setDataAgendamento(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-400" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Horário</label>
                    <input type="time" value={horarioAgendamento} onChange={(e) => setHorarioAgendamento(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-400" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-500 mb-1">Nome do vistoriador</label>
                  <input type="text" value={nomeVistoriador} onChange={(e) => setNomeVistoriador(e.target.value)}
                    placeholder="Quem fará a visita presencial"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-400" />
                </div>

                <div>
                  <label className="block text-xs text-slate-500 mb-1">Responsável pelo laudo</label>
                  <select value={editorResponsavelEmail} onChange={(e) => setEditorResponsavelEmail(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-400 bg-white">
                    <option value="">Selecione o editor responsável</option>
                    {usuarios.map((u) => (
                      <option key={u.email} value={u.email}>{u.nome}</option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={salvarAgendamento}
                  disabled={salvando}
                  className="w-full rounded-2xl bg-[linear-gradient(135deg,#0f3d68,#2563eb)] py-3 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {salvando ? 'Salvando...' : 'Salvar agendamento'}
                </button>

                {laudoSelecionado.statusVistoria === 'agendada' && (
                  <button
                    onClick={marcarRealizada}
                    disabled={salvando}
                    className="w-full rounded-2xl border border-purple-200 bg-purple-50 py-3 text-sm font-semibold text-purple-700 disabled:opacity-60"
                  >
                    Marcar vistoria como realizada
                  </button>
                )}
              </div>

              {/* Histórico */}
              {laudoSelecionado.historicoEventos && laudoSelecionado.historicoEventos.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Histórico</p>
                  <div className="space-y-3">
                    {[...laudoSelecionado.historicoEventos].reverse().map((ev, i) => (
                      <div key={i} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className="w-2 h-2 rounded-full bg-blue-400 mt-1 shrink-0" />
                          {i < laudoSelecionado.historicoEventos!.length - 1 && (
                            <div className="w-px flex-1 bg-slate-200 mt-1" />
                          )}
                        </div>
                        <div className="pb-3">
                          <p className="text-sm text-slate-700">{ev.acao}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{formatarDataHora(ev.data)} · {ev.usuario}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-6 flex items-center justify-center text-sm text-slate-400">
              Selecione um laudo para gerenciar
            </div>
          )}
        </div>
      </section>
    </AppShell>
  )
}
