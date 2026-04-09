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

const DB_NAME = 'laudosDB'
const STORE_NAME = 'laudos'

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

async function abrirBanco(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function gerarResumoLaudo(chave: string, valor: any): LaudoResumo | null {
  if (!valor || typeof valor !== 'object') return null

  const codigoBase =
    valor.matricula?.trim() ||
    valor.codigo ||
    (chave === 'laudoAtual' ? 'LAUDO-ATUAL' : chave.toUpperCase().replace(/_/g, '-'))

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

  const status: StatusLaudo =
    valor.status || (chave === 'laudoAtual' ? 'em_preenchimento' : 'rascunho')

  return {
    id: chave,
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

export async function listarLaudos(): Promise<LaudoResumo[]> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return []
  }

  try {
    const db = await abrirBanco()
    const transaction = db.transaction(STORE_NAME, 'readonly')
    const store = transaction.objectStore(STORE_NAME)

    const itens = await new Promise<{ key: string; value: any }[]>((resolve, reject) => {
      const resultados: { key: string; value: any }[] = []
      const request = store.openCursor()

      request.onsuccess = () => {
        const cursor = request.result
        if (!cursor) {
          resolve(resultados)
          return
        }

        resultados.push({ key: String(cursor.key), value: cursor.value })
        cursor.continue()
      }

      request.onerror = () => reject(request.error)
    })

    const laudos = itens
      .filter(({ key }) => key !== 'laudoAtual')
      .map(({ key, value }) => gerarResumoLaudo(key, value))
      .filter(Boolean) as LaudoResumo[]

    return laudos.sort(
      (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()
    )
  } catch {
    return []
  }
}

export type FiltrosLaudo = {
  busca: string
  status: string
  cidade: string
  tipoImovel: string
  finalidade: string
}

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

export async function excluirLaudo(id: string) {
  if (typeof window === 'undefined' || !('indexedDB' in window)) return

  const db = await abrirBanco()
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.delete(id)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export async function salvarLaudo(dados: any) {
  if (typeof window === 'undefined' || !('indexedDB' in window)) return null

  const db = await abrirBanco()

  const matricula = String(dados?.matricula || '').trim()
  const chave = matricula || dados?.id || 'laudoAtual'

  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)

    const request = store.put(dados, chave)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })

  return chave
}

async function lerLaudo(chave: string): Promise<any | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) return null

  try {
    const db = await abrirBanco()
    return await new Promise<any>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.get(chave)
      request.onsuccess = () => resolve(request.result ?? null)
      request.onerror = () => reject(request.error)
    })
  } catch {
    return null
  }
}

export async function definirLaudoAtual(id: string) {
  const laudo = await lerLaudo(id)
  if (!laudo) return false

  const db = await abrirBanco()
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.put(laudo, 'laudoAtual')
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })

  return true
}

export async function obterLaudoAtual() {
  return await lerLaudo('laudoAtual')
}

export async function limparLaudoAtual() {
  if (typeof window === 'undefined' || !('indexedDB' in window)) return

  const db = await abrirBanco()
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.delete('laudoAtual')
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}
