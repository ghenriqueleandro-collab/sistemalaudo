/**
 * SALVAR EM: src/lib/laudos-storage.ts
 *
 * Substitui IndexedDB por chamadas à API do servidor (Vercel KV).
 * Todas as funções exportadas têm a mesma assinatura de antes —
 * nenhuma outra página precisa ser alterada.
 */

// ─── Tipos (idênticos ao original) ───────────────────────────────────────────

export type StatusLaudo =
  | 'rascunho'
  | 'em_preenchimento'
  | 'em_revisao'
  | 'finalizado'

export type LaudoResumo = {
  id: string
  codigo: string
  endereco: string
  cidade: string
  tipoImovel: string
  finalidade: string
  data: string
  status: StatusLaudo
  valor: number
  proprietario?: string
  solicitante?: string
}

export type FiltrosLaudo = {
  busca: string
  status: string
  cidade: string
  tipoImovel: string
  finalidade: string
}

// ─── Helpers de formatação (idênticos ao original) ───────────────────────────

function normalizarTexto(valor: string) {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function capitalizar(valor: string) {
  return valor.charAt(0).toUpperCase() + valor.slice(1)
}

export function formatarStatus(status: StatusLaudo) {
  switch (status) {
    case 'rascunho':
      return 'Rascunho'
    case 'em_preenchimento':
      return 'Em andamento'
    case 'em_revisao':
      return 'Em revisão'
    case 'finalizado':
      return 'Finalizado'
    default:
      return capitalizar(status)
  }
}

export function formatarMoeda(valor: number) {
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

export function formatarData(data?: string) {
  if (!data) return '-'
  const d = new Date(data)
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR')
}

// ─── Converte dado bruto da API em LaudoResumo ────────────────────────────────

function gerarResumoLaudo(valor: any): LaudoResumo | null {
  if (!valor || typeof valor !== 'object' || !valor.id) return null

  const codigoBase =
    valor.matricula?.trim() ||
    valor.codigo ||
    valor.id.toUpperCase().slice(0, 8)

  const cidade =
    valor.cidadePrincipal?.trim() ||
    valor.cidade?.trim() ||
    (valor.endereco?.includes(' - ') ? valor.endereco.split(' - ').at(-1) : '') ||
    'Não informado'

  const valorCalculado =
    Number(valor.valorFinalImovel) ||
    Number(valor.valorFinal) ||
    Number(valor.valor) ||
    0

  const status: StatusLaudo = valor.status || 'rascunho'

  return {
    id: valor.id,
    codigo: codigoBase,
    endereco: valor.endereco || 'Endereço não informado',
    cidade,
    tipoImovel: valor.tipo || valor.tipoImovel || 'Não informado',
    finalidade:
      valor.finalidade === 'garantia'
        ? 'Garantia'
        : valor.finalidade === 'execucao'
        ? 'Execução'
        : valor.finalidade || 'Não informado',
    data:
      valor.atualizadoEm ||
      valor.dataLaudo ||
      valor.data ||
      new Date().toISOString(),
    status,
    valor: valorCalculado,
    proprietario: valor.proprietario,
    solicitante: valor.solicitante,
  }
}

// ─── Chave localStorage: apenas o ID do laudo em edição ──────────────────────
// Os dados ficam no servidor; só o ID fica local para navegar entre páginas.
const CHAVE_ID_ATUAL = 'lesath_laudo_atual_id'

// ─── listarLaudos ─────────────────────────────────────────────────────────────

export async function listarLaudos(): Promise<LaudoResumo[]> {
  try {
    const res = await fetch('/api/laudos', { cache: 'no-store' })
    if (!res.ok) return []

    const dados: any[] = await res.json()

    return dados
      .map(gerarResumoLaudo)
      .filter(Boolean) as LaudoResumo[]
  } catch {
    return []
  }
}

// ─── filtrarLaudos (lógica idêntica ao original) ──────────────────────────────

export function filtrarLaudos(laudos: LaudoResumo[], filtros: FiltrosLaudo) {
  return laudos.filter((laudo) => {
    const termo = normalizarTexto(filtros.busca)
    const correspondeBusca =
      !termo ||
      [
        laudo.codigo,
        laudo.endereco,
        laudo.cidade,
        laudo.tipoImovel,
        laudo.proprietario || '',
      ].some((campo) => normalizarTexto(campo).includes(termo))

    const correspondeStatus = !filtros.status || laudo.status === filtros.status
    const correspondeCidade = !filtros.cidade || laudo.cidade === filtros.cidade
    const correspondeTipo = !filtros.tipoImovel || laudo.tipoImovel === filtros.tipoImovel
    const correspondeFinalidade =
      !filtros.finalidade || laudo.finalidade === filtros.finalidade

    return (
      correspondeBusca &&
      correspondeStatus &&
      correspondeCidade &&
      correspondeTipo &&
      correspondeFinalidade
    )
  })
}

// ─── salvarLaudo ──────────────────────────────────────────────────────────────

export async function salvarLaudo(dados: any): Promise<string | null> {
  try {
    const id = dados.id || crypto.randomUUID()
    const payload = {
      ...dados,
      id,
      criadoEm: dados.criadoEm || new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
    }

    const res = await fetch('/api/laudos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) return null

    const salvo = await res.json()
    return salvo.id
  } catch {
    return null
  }
}

// ─── excluirLaudo ─────────────────────────────────────────────────────────────

export async function excluirLaudo(id: string): Promise<void> {
  const res = await fetch(`/api/laudos/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const erro = await res.json().catch(() => ({}))
    throw new Error(erro.erro ?? 'Erro ao excluir o laudo.')
  }
}

// ─── lerLaudo (interno) ───────────────────────────────────────────────────────

async function lerLaudo(id: string): Promise<any | null> {
  try {
    const res = await fetch(`/api/laudos/${id}`, { cache: 'no-store' })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

// ─── definirLaudoAtual ────────────────────────────────────────────────────────

export async function definirLaudoAtual(id: string): Promise<boolean> {
  const laudo = await lerLaudo(id)
  if (!laudo) return false

  if (typeof window !== 'undefined') {
    localStorage.setItem(CHAVE_ID_ATUAL, id)
  }

  return true
}

// ─── obterLaudoAtual ──────────────────────────────────────────────────────────

export async function obterLaudoAtual(): Promise<any | null> {
  if (typeof window === 'undefined') return null

  const id = localStorage.getItem(CHAVE_ID_ATUAL)
  if (!id) return null

  return await lerLaudo(id)
}

// ─── limparLaudoAtual ─────────────────────────────────────────────────────────

export async function limparLaudoAtual(): Promise<void> {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(CHAVE_ID_ATUAL)
  }
}
