/**
 * SALVAR EM: src/app/components/KanbanBoard.tsx
 *
 * Quadro Kanban de acompanhamento de demandas.
 * Embuta no topo da página Meus Laudos:
 *
 *   import KanbanBoard from '../components/KanbanBoard'
 *   ...
 *   <KanbanBoard onLaudoIniciado={carregarLaudos} />
 *
 * ATENÇÃO — os statusAcompanhamento do card devem ser os mesmos que os do laudo:
 *   'levantamento_documentos' | 'atuando_vistoria' | 'atuando_pesquisa' | 'concluido'
 *
 * Certifique-se de que api/cards/route.ts usa esses mesmos valores.
 */

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

// ─── Tipos ────────────────────────────────────────────────────────────────────

type StatusKanban =
  | 'levantamento_documentos'
  | 'atuando_vistoria'
  | 'atuando_pesquisa'
  | 'concluido'

interface Card {
  id: string
  titulo: string
  tipoImovel: string
  subtipo: string
  endereco: string
  cidade: string
  uf: string
  bairro: string
  cliente: string
  finalidade: string
  tipoLaudo: 'completo' | 'simplificado'
  responsavel: string
  prazoEntrega: string      // 'YYYY-MM-DD'
  prioridade: 'urgente' | 'normal' | 'baixa'
  descricao: string
  observacaoCliente: string
  statusAcompanhamento: StatusKanban
  laudoId: string | null
  arquivado: boolean
  criadoEm: string
  atualizadoEm: string
  criadoPor: string
}

type CardFormData = Omit<Card,
  'id' | 'laudoId' | 'arquivado' | 'criadoEm' | 'atualizadoEm' | 'criadoPor'>

// ─── Configuração das colunas ─────────────────────────────────────────────────

const COLUNAS: {
  status: StatusKanban
  label: string
  cor: string
  corFundo: string
  corBorda: string
  corHeader: string
}[] = [
  {
    status: 'levantamento_documentos',
    label: 'Levantamento',
    cor: 'text-amber-700',
    corFundo: 'bg-amber-50',
    corBorda: 'border-amber-200',
    corHeader: 'bg-amber-100 border-amber-300',
  },
  {
    status: 'atuando_vistoria',
    label: 'Em Vistoria',
    cor: 'text-purple-700',
    corFundo: 'bg-purple-50',
    corBorda: 'border-purple-200',
    corHeader: 'bg-purple-100 border-purple-300',
  },
  {
    status: 'atuando_pesquisa',
    label: 'Em Pesquisa',
    cor: 'text-blue-700',
    corFundo: 'bg-blue-50',
    corBorda: 'border-blue-200',
    corHeader: 'bg-blue-100 border-blue-300',
  },
  {
    status: 'concluido',
    label: 'Concluído',
    cor: 'text-emerald-700',
    corFundo: 'bg-emerald-50',
    corBorda: 'border-emerald-200',
    corHeader: 'bg-emerald-100 border-emerald-300',
  },
]

const PRIORIDADE_CONFIG = {
  urgente: { label: 'Urgente', classe: 'bg-red-100 text-red-700 ring-1 ring-red-300' },
  normal:  { label: 'Normal',  classe: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200' },
  baixa:   { label: 'Baixa',   classe: 'bg-sky-100 text-sky-700 ring-1 ring-sky-200' },
}

const CARD_VAZIO: CardFormData = {
  titulo: '',
  tipoImovel: '',
  subtipo: '',
  endereco: '',
  cidade: '',
  uf: '',
  bairro: '',
  cliente: '',
  finalidade: '',
  tipoLaudo: 'completo',
  responsavel: '',
  prazoEntrega: '',
  prioridade: 'normal',
  descricao: '',
  observacaoCliente: '',
  statusAcompanhamento: 'levantamento_documentos',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatarData(iso?: string): string {
  if (!iso) return '—'
  const d = new Date(iso.includes('T') ? iso : iso + 'T00:00:00')
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function diasRestantes(prazo?: string): number | null {
  if (!prazo) return null
  const hoje = new Date(); hoje.setHours(0,0,0,0)
  const p = new Date(prazo + 'T00:00:00')
  return Math.round((p.getTime() - hoje.getTime()) / 86_400_000)
}

function PrazoChip({ prazo }: { prazo?: string }) {
  if (!prazo) return null
  const dias = diasRestantes(prazo)!
  const vencido = dias < 0
  const urgente = dias <= 2 && dias >= 0
  const classe = vencido
    ? 'bg-red-100 text-red-700 ring-1 ring-red-300'
    : urgente
    ? 'bg-orange-100 text-orange-700 ring-1 ring-orange-300'
    : 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'
  const texto = vencido
    ? `Vencido há ${Math.abs(dias)}d`
    : dias === 0
    ? 'Vence hoje'
    : `${dias}d restantes`
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${classe}`}>
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
      {texto}
    </span>
  )
}

// ─── API helpers ──────────────────────────────────────────────────────────────

async function apiListarCards(): Promise<Card[]> {
  const r = await fetch('/api/cards')
  if (!r.ok) throw new Error('Erro ao listar cards')
  return r.json()
}

async function apiCriarCard(dados: CardFormData): Promise<Card> {
  const r = await fetch('/api/cards', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados),
  })
  if (!r.ok) throw new Error('Erro ao criar card')
  return r.json()
}

async function apiAtualizarCard(id: string, dados: Partial<Card>): Promise<Card> {
  const r = await fetch(`/api/cards/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados),
  })
  if (!r.ok) throw new Error('Erro ao atualizar card')
  return r.json()
}

async function apiMoverCard(id: string, status: StatusKanban): Promise<Card> {
  const r = await fetch(`/api/cards/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ acao: 'mover', statusAcompanhamento: status }),
  })
  if (!r.ok) throw new Error('Erro ao mover card')
  return r.json()
}

async function apiArquivarCard(id: string): Promise<Card> {
  const r = await fetch(`/api/cards/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ acao: 'arquivar' }),
  })
  if (!r.ok) throw new Error('Erro ao arquivar card')
  return r.json()
}

async function apiListarEmpresas(): Promise<{ id: string; nome: string }[]> {
  const r = await fetch('/api/empresas')
  if (!r.ok) return []
  return r.json()
}

async function apiIniciarLaudo(cardId: string): Promise<{ id: string }> {
  const r = await fetch(`/api/cards/${cardId}/iniciar-laudo`, { method: 'POST' })
  if (!r.ok) {
    const err = await r.json().catch(() => ({}))
    // 409 = laudo já existe, retorna laudoId mesmo assim
    if (r.status === 409 && err.laudoId) return { id: err.laudoId }
    throw new Error(err.erro || 'Erro ao iniciar laudo')
  }
  return r.json()
}

// ─── Modal de Formulário ──────────────────────────────────────────────────────

function ModalCard({
  card,
  onSalvar,
  onFechar,
}: {
  card: CardFormData & { id?: string }
  onSalvar: (dados: CardFormData) => Promise<void>
  onFechar: () => void
}) {
  const [form, setForm] = useState<CardFormData>({
    titulo: card.titulo,
    tipoImovel: card.tipoImovel,
    subtipo: card.subtipo,
    endereco: card.endereco,
    cidade: card.cidade,
    uf: card.uf,
    bairro: card.bairro,
    cliente: card.cliente,
    finalidade: card.finalidade,
    tipoLaudo: card.tipoLaudo,
    responsavel: card.responsavel,
    prazoEntrega: card.prazoEntrega,
    prioridade: card.prioridade,
    descricao: card.descricao,
    observacaoCliente: card.observacaoCliente ?? '',
    statusAcompanhamento: card.statusAcompanhamento,
  })
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [empresas, setEmpresas] = useState<{ id: string; nome: string }[]>([])
  const [clienteCustom, setClienteCustom] = useState(false)

  useEffect(() => {
    apiListarEmpresas().then(lista => {
      setEmpresas(lista)
      // Se o valor atual não está na lista, mostra campo livre
      if (card.cliente && !lista.find(e => e.nome === card.cliente)) {
        setClienteCustom(true)
      }
    })
  }, [])

  function campo(k: keyof CardFormData) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setForm(f => ({ ...f, [k]: e.target.value }))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.titulo.trim()) { setErro('O título é obrigatório.'); return }
    setSalvando(true)
    setErro('')
    try {
      await onSalvar(form)
      onFechar()
    } catch (err: any) {
      setErro(err.message || 'Erro ao salvar.')
    } finally {
      setSalvando(false)
    }
  }

  const inputCls = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition'
  const labelCls = 'block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(15,23,42,0.5)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onFechar() }}
    >
      <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">
            {card.id ? 'Editar card' : 'Nova demanda'}
          </h2>
          <button onClick={onFechar} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {/* Título */}
          <div>
            <label className={labelCls}>Título <span className="text-red-500">*</span></label>
            <input
              className={inputCls}
              value={form.titulo}
              onChange={campo('titulo')}
              placeholder="Ex: Apt. Jd. América — João Silva"
            />
          </div>

          {/* Endereço */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelCls}>Endereço</label>
              <input className={inputCls} value={form.endereco} onChange={campo('endereco')} placeholder="Rua, número" />
            </div>
            <div>
              <label className={labelCls}>Bairro</label>
              <input className={inputCls} value={form.bairro} onChange={campo('bairro')} placeholder="Bairro" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className={labelCls}>Cidade</label>
                <input className={inputCls} value={form.cidade} onChange={campo('cidade')} placeholder="Cidade" />
              </div>
              <div>
                <label className={labelCls}>UF</label>
                <input className={inputCls} value={form.uf} onChange={campo('uf')} placeholder="SP" maxLength={2} />
              </div>
            </div>
          </div>

          {/* Tipo do imóvel */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Tipo do imóvel</label>
              <select className={inputCls} value={form.tipoImovel} onChange={campo('tipoImovel')}>
                <option value="">Selecione</option>
                <option value="residencial">Residencial</option>
                <option value="comercial">Comercial</option>
                <option value="rural">Rural</option>
                <option value="industrial">Industrial</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Subtipo</label>
              <input className={inputCls} value={form.subtipo} onChange={campo('subtipo')} placeholder="Ex: apartamento, casa, galpão" />
            </div>
          </div>

          {/* Demanda */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Cliente / Contratante</label>
              {!clienteCustom ? (
                <div className="flex gap-1.5">
                  <select
                    className={`${inputCls} flex-1`}
                    value={form.cliente}
                    onChange={e => {
                      if (e.target.value === '__outro__') {
                        setClienteCustom(true)
                        setForm(f => ({ ...f, cliente: '' }))
                      } else {
                        setForm(f => ({ ...f, cliente: e.target.value }))
                      }
                    }}
                  >
                    <option value="">Selecione a empresa</option>
                    {empresas.map(e => (
                      <option key={e.id} value={e.nome}>{e.nome}</option>
                    ))}
                    <option value="__outro__">+ Digitar nome…</option>
                  </select>
                </div>
              ) : (
                <div className="flex gap-1.5">
                  <input
                    className={`${inputCls} flex-1`}
                    value={form.cliente}
                    onChange={campo('cliente')}
                    placeholder="Nome do contratante"
                    autoFocus
                  />
                  {empresas.length > 0 && (
                    <button
                      type="button"
                      onClick={() => { setClienteCustom(false); setForm(f => ({ ...f, cliente: '' })) }}
                      className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-500 hover:bg-slate-50 transition whitespace-nowrap"
                    >
                      ← Lista
                    </button>
                  )}
                </div>
              )}
            </div>
            <div>
              <label className={labelCls}>Finalidade</label>
              <select className={inputCls} value={form.finalidade} onChange={campo('finalidade')}>
                <option value="">Selecione</option>
                <option value="garantia_bancaria">Garantia bancária</option>
                <option value="judicial">Judicial</option>
                <option value="financiamento">Financiamento</option>
                <option value="particular">Particular</option>
              </select>
            </div>
          </div>

          {/* Gestão */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Tipo de laudo</label>
              <select className={inputCls} value={form.tipoLaudo} onChange={campo('tipoLaudo')}>
                <option value="completo">Completo</option>
                <option value="simplificado">Simplificado</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Prioridade</label>
              <select className={inputCls} value={form.prioridade} onChange={campo('prioridade')}>
                <option value="urgente">🔴 Urgente</option>
                <option value="normal">🟡 Normal</option>
                <option value="baixa">🟢 Baixa</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Prazo de entrega</label>
              <input type="date" className={inputCls} value={form.prazoEntrega} onChange={campo('prazoEntrega')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Responsável</label>
              <input className={inputCls} value={form.responsavel} onChange={campo('responsavel')} placeholder="E-mail ou nome" />
            </div>
            <div>
              <label className={labelCls}>Coluna inicial</label>
              <select className={inputCls} value={form.statusAcompanhamento} onChange={campo('statusAcompanhamento')}>
                {COLUNAS.map(c => (
                  <option key={c.status} value={c.status}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Descrição interna */}
          <div>
            <label className={labelCls}>Descrição / Observações internas</label>
            <textarea
              className={`${inputCls} resize-none`}
              rows={2}
              value={form.descricao}
              onChange={campo('descricao')}
              placeholder="Pendências, próximos passos, informações internas…"
            />
          </div>

          {/* Observação para o cliente */}
          <div>
            <label className={labelCls}>
              Observação para o cliente
              <span className="ml-1.5 normal-case font-normal text-slate-400">(visível no portal)</span>
            </label>
            <textarea
              className={`${inputCls} resize-none`}
              rows={2}
              value={form.observacaoCliente}
              onChange={campo('observacaoCliente')}
              placeholder="Ex: Aguardando matrícula atualizada. Daremos continuidade após o recebimento."
            />
          </div>

          {erro && (
            <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700 ring-1 ring-red-200">{erro}</p>
          )}

          {/* Footer */}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onFechar}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando}
              className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {salvando ? 'Salvando…' : card.id ? 'Salvar alterações' : 'Criar card'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Descrição inline editável ───────────────────────────────────────────────

function DescricaoInline({
  card,
  onSalvar,
}: {
  card: Card
  onSalvar: (id: string, observacaoCliente: string) => void
}) {
  const [editando, setEditando] = useState(false)
  const [texto, setTexto] = useState(card.observacaoCliente ?? '')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { setTexto(card.observacaoCliente ?? '') }, [card.observacaoCliente])

  function handleFoco() {
    setEditando(true)
    setTimeout(() => textareaRef.current?.focus(), 0)
  }

  function handleBlur() {
    setEditando(false)
    if (texto !== (card.observacaoCliente ?? '')) onSalvar(card.id, texto)
  }

  return (
    <div className="mb-2">
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        Obs. para o cliente
      </p>
      {editando ? (
        <textarea
          ref={textareaRef}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onBlur={handleBlur}
          rows={3}
          placeholder="Mensagem visível ao cliente no portal…"
          className="w-full resize-none rounded-lg border border-blue-300 bg-white px-2 py-1.5 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
        />
      ) : (
        <button
          type="button"
          onClick={handleFoco}
          className={`w-full rounded-lg border border-dashed px-2 py-1.5 text-left text-xs transition hover:border-blue-300 hover:bg-blue-50 ${
            texto
              ? 'border-slate-200 text-slate-500 italic'
              : 'border-slate-200 text-slate-400'
          }`}
        >
          {texto || 'Adicionar observação para o cliente…'}
        </button>
      )}
    </div>
  )
}

// ─── Card Kanban ──────────────────────────────────────────────────────────────

function KanbanCard({
  card,
  onMover,
  onEditar,
  onIniciarLaudo,
  onArquivar,
  onSalvarDescricao,
}: {
  card: Card
  onMover: (status: StatusKanban) => void
  onEditar: () => void
  onIniciarLaudo: () => void
  onArquivar: () => void
  onSalvarDescricao: (id: string, descricao: string) => void
}) {
  const [menuAberto, setMenuAberto] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const concluido = card.statusAcompanhamento === 'concluido'
  const temLaudo = !!card.laudoId

  // Fecha menu ao clicar fora
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuAberto(false)
      }
    }
    if (menuAberto) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuAberto])

  const statusOptions = COLUNAS.filter(c => c.status !== card.statusAcompanhamento)

  return (
    <div
      className={`group relative rounded-xl border p-3.5 shadow-sm transition-all hover:shadow-md ${
        concluido
          ? 'border-emerald-200 bg-emerald-50'
          : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      {/* Header do card */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className={`text-sm font-semibold leading-snug ${concluido ? 'text-emerald-800' : 'text-slate-900'}`}>
          {card.titulo || 'Sem título'}
        </p>
        <div className="relative flex-shrink-0" ref={menuRef}>
          <button
            onClick={() => setMenuAberto(m => !m)}
            className="rounded-md p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition opacity-0 group-hover:opacity-100"
            title="Opções"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
            </svg>
          </button>
          {menuAberto && (
            <div className="absolute right-0 top-6 z-10 w-48 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
              <button
                onClick={() => { setMenuAberto(false); onEditar() }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Editar card
              </button>
              {/* Mover para coluna */}
              {statusOptions.map(c => (
                <button
                  key={c.status}
                  onClick={() => { setMenuAberto(false); onMover(c.status) }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                  Mover para {c.label}
                </button>
              ))}
              {/* Arquivar — só mostra quando concluído */}
              {concluido && (
                <button
                  onClick={() => { setMenuAberto(false); onArquivar() }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-emerald-700 hover:bg-emerald-50 border-t border-slate-100 mt-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12a2 2 0 002 2h8a2 2 0 002-2l1-12" />
                  </svg>
                  Arquivar (encerrar)
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Endereço */}
      {card.endereco && (
        <p className="text-xs text-slate-500 truncate mb-2">
          📍 {card.endereco}{card.cidade ? `, ${card.cidade}` : ''}{card.uf ? `/${card.uf}` : ''}
        </p>
      )}

      {/* Cliente */}
      {card.cliente && (
        <p className="text-xs text-slate-500 truncate mb-2">
          👤 {card.cliente}
        </p>
      )}

      {/* Descrição */}
      {/* Observação — sempre visível, editável inline */}
      <DescricaoInline card={card} onSalvar={onSalvarDescricao} />

      {/* Chips de prazo e prioridade */}
      <div className="flex flex-wrap items-center gap-1.5 mb-3">
        <PrazoChip prazo={card.prazoEntrega} />
        {card.prioridade !== 'normal' && (
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${PRIORIDADE_CONFIG[card.prioridade].classe}`}>
            {PRIORIDADE_CONFIG[card.prioridade].label}
          </span>
        )}
        {card.tipoLaudo === 'simplificado' && (
          <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-indigo-200">
            Simpl.
          </span>
        )}
      </div>

      {/* Botão Iniciar laudo / Abrir laudo */}
      {temLaudo ? (
        <a
          href={card.tipoLaudo === 'simplificado'
            ? `/laudo/simplificado?id=${card.laudoId}`
            : `/novo-laudo?id=${card.laudoId}`}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Abrir laudo
        </a>
      ) : (
        <button
          onClick={onIniciarLaudo}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Iniciar laudo
        </button>
      )}
    </div>
  )
}

// ─── KanbanBoard (componente principal) ───────────────────────────────────────

interface KanbanBoardProps {
  /** Chamado após iniciar um laudo, para recarregar a lista de laudos abaixo */
  onLaudoIniciado?: () => void
}

export default function KanbanBoard({ onLaudoIniciado }: KanbanBoardProps) {
  const router = useRouter()
  const { data: session } = useSession()

  const [cards, setCards] = useState<Card[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  // Modal
  const [modalAberto, setModalAberto] = useState(false)
  const [cardEditando, setCardEditando] = useState<(CardFormData & { id?: string }) | null>(null)

  // Confirmação de arquivar
  const [confirmArquivar, setConfirmArquivar] = useState<string | null>(null)

  // Iniciando laudo (loading por card)
  const [iniciandoId, setIniciandoId] = useState<string | null>(null)

  // Recolher/expandir board
  const [expandido, setExpandido] = useState(true)

  const carregarCards = useCallback(async () => {
    try {
      const dados = await apiListarCards()
      setCards(dados)
    } catch (e: any) {
      setErro(e.message)
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    carregarCards()
    const intervalo = setInterval(carregarCards, 20_000)
    return () => clearInterval(intervalo)
  }, [carregarCards])

  // Abre modal para novo card
  function handleNovoCard() {
    setCardEditando({ ...CARD_VAZIO })
    setModalAberto(true)
  }

  // Abre modal para editar card existente
  function handleEditar(card: Card) {
    setCardEditando({
      id: card.id,
      titulo: card.titulo,
      tipoImovel: card.tipoImovel,
      subtipo: card.subtipo,
      endereco: card.endereco,
      cidade: card.cidade,
      uf: card.uf,
      bairro: card.bairro,
      cliente: card.cliente,
      finalidade: card.finalidade,
      tipoLaudo: card.tipoLaudo,
      responsavel: card.responsavel,
      prazoEntrega: card.prazoEntrega,
      prioridade: card.prioridade,
      descricao: card.descricao,
      statusAcompanhamento: card.statusAcompanhamento,
    })
    setModalAberto(true)
  }

  // Salvar (criar ou atualizar)
  async function handleSalvar(dados: CardFormData) {
    if (cardEditando?.id) {
      const atualizado = await apiAtualizarCard(cardEditando.id, dados)
      setCards(cs => cs.map(c => c.id === atualizado.id ? atualizado : c))
    } else {
      const novo = await apiCriarCard(dados)
      setCards(cs => [novo, ...cs])
    }
  }

  // Mover coluna
  async function handleMover(cardId: string, status: StatusKanban) {
    try {
      const atualizado = await apiMoverCard(cardId, status)
      setCards(cs => cs.map(c => c.id === cardId ? atualizado : c))
    } catch (e: any) {
      alert(e.message || 'Erro ao mover card.')
    }
  }

  // Iniciar laudo
  async function handleIniciarLaudo(card: Card) {
    setIniciandoId(card.id)
    try {
      const laudo = await apiIniciarLaudo(card.id)
      // Atualiza card local com o laudoId
      setCards(cs => cs.map(c => c.id === card.id ? { ...c, laudoId: laudo.id } : c))
      onLaudoIniciado?.()
      const rota = card.tipoLaudo === 'simplificado'
        ? `/laudo/simplificado?id=${laudo.id}`
        : `/novo-laudo?id=${laudo.id}`
      router.push(rota)
    } catch (e: any) {
      alert(e.message || 'Erro ao iniciar laudo.')
    } finally {
      setIniciandoId(null)
    }
  }

  // Arquivar
  async function handleArquivar(cardId: string) {
    try {
      await apiArquivarCard(cardId)
      setCards(cs => cs.filter(c => c.id !== cardId))
      setConfirmArquivar(null)
    } catch (e: any) {
      alert(e.message || 'Erro ao arquivar card.')
    }
  }

  // Salvar observação para o cliente inline
  async function handleSalvarDescricao(cardId: string, observacaoCliente: string) {
    try {
      await apiAtualizarCard(cardId, { observacaoCliente })
      setCards(cs => cs.map(c => c.id === cardId ? { ...c, observacaoCliente } : c))
    } catch {
      // falha silenciosa
    }
  }

  const total = cards.length
  const concluidosNaoArquivados = cards.filter(c => c.statusAcompanhamento === 'concluido').length

  return (
    <div className="mb-8">
      {/* ── Cabeçalho do board ── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setExpandido(e => !e)}
            className="flex items-center gap-2 text-slate-700 hover:text-slate-900 transition"
          >
            <svg
              className={`w-4 h-4 text-slate-400 transition-transform ${expandido ? 'rotate-0' : '-rotate-90'}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            <span className="text-base font-semibold">Quadro de demandas</span>
          </button>
          {total > 0 && (
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
              {total} {total === 1 ? 'demanda' : 'demandas'}
            </span>
          )}
          {concluidosNaoArquivados > 0 && (
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
              {concluidosNaoArquivados} concluída{concluidosNaoArquivados > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <button
          onClick={handleNovoCard}
          className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nova demanda
        </button>
      </div>

      {expandido && (
        <>
          {erro && (
            <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
              {erro}{' '}
              <button onClick={carregarCards} className="underline font-medium">Tentar novamente</button>
            </div>
          )}

          {carregando ? (
            <div className="flex items-center justify-center py-12 text-slate-400 text-sm gap-2">
              <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Carregando demandas…
            </div>
          ) : (
            /* ── Colunas ── */
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 overflow-x-auto">
              {COLUNAS.map(coluna => {
                const cardsColuna = cards.filter(
                  c => c.statusAcompanhamento === coluna.status
                )
                return (
                  <div key={coluna.status} className="min-w-[220px]">
                    {/* Header da coluna */}
                    <div className={`flex items-center justify-between rounded-xl border px-3 py-2 mb-2 ${coluna.corHeader}`}>
                      <span className={`text-xs font-semibold uppercase tracking-wide ${coluna.cor}`}>
                        {coluna.label}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${coluna.corFundo} ${coluna.cor}`}>
                        {cardsColuna.length}
                      </span>
                    </div>

                    {/* Cards */}
                    <div className="space-y-2">
                      {cardsColuna.length === 0 ? (
                        <div className={`rounded-xl border-2 border-dashed px-3 py-6 text-center text-xs text-slate-400 ${coluna.corBorda}`}>
                          Nenhuma demanda
                        </div>
                      ) : (
                        cardsColuna.map(card => (
                          <KanbanCard
                            key={card.id}
                            card={iniciandoId === card.id
                              ? { ...card }
                              : card}
                            onMover={(status) => handleMover(card.id, status)}
                            onEditar={() => handleEditar(card)}
                            onIniciarLaudo={() => handleIniciarLaudo(card)}
                            onArquivar={() => setConfirmArquivar(card.id)}
                            onSalvarDescricao={(id, desc) => handleSalvarDescricao(id, desc)}
                          />
                        ))
                      )}
                    </div>

                    {/* Botão rápido de novo card na coluna */}
                    {coluna.status === 'levantamento_documentos' && (
                      <button
                        onClick={handleNovoCard}
                        className="mt-2 flex w-full items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-200 px-3 py-2 text-xs text-slate-400 hover:border-blue-300 hover:text-blue-500 transition"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Adicionar
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ── Modal criar/editar ── */}
      {modalAberto && cardEditando && (
        <ModalCard
          card={cardEditando}
          onSalvar={handleSalvar}
          onFechar={() => { setModalAberto(false); setCardEditando(null) }}
        />
      )}

      {/* ── Confirmação de arquivar ── */}
      {confirmArquivar && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(15,23,42,0.5)' }}
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex-shrink-0 rounded-full bg-emerald-100 p-2">
                <svg className="w-5 h-5 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12a2 2 0 002 2h8a2 2 0 002-2l1-12" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">Arquivar demanda</h3>
                <p className="text-sm text-slate-500">
                  O card será removido do quadro. O laudo vinculado continua acessível na lista de laudos.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmArquivar(null)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleArquivar(confirmArquivar)}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition"
              >
                Arquivar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
