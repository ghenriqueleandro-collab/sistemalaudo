'use client'

import React, { useEffect, useState, Suspense } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import AppShell from '../../components/AppShell'
import dynamic from 'next/dynamic'
import { obterLaudoAtual, buscarLaudo } from '@/lib/laudos-storage'

const PdfViewer = dynamic(() => import('../../components/PdfViewer'), {
  ssr: false,
})

const AnexoPdfPaginado = dynamic(
  () => import('../../components/AnexoPdfPaginado'),
  { ssr: false }
)

// Converte cada página de um PDF (data URL) em PNG data URLs usando pdfjs-dist
async function pdfPagesToImages(pdfDataUrl: string, scale = 2): Promise<string[]> {
  if (!pdfDataUrl) return []
  try {
    const pdfjsLib = await import('pdfjs-dist')
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`
    const loadingTask = pdfjsLib.getDocument(pdfDataUrl)
    const pdfDoc = await loadingTask.promise
    const pages: string[] = []
    for (let i = 1; i <= pdfDoc.numPages; i++) {
      const page = await pdfDoc.getPage(i)
      const viewport = page.getViewport({ scale })
      const canvas = document.createElement('canvas')
      canvas.width = viewport.width
      canvas.height = viewport.height
      const ctx = canvas.getContext('2d')!
      await page.render({ canvas, canvasContext: ctx, viewport }).promise
      pages.push(canvas.toDataURL('image/jpeg', 0.92))
    }
    return pages
  } catch (e) {
    console.error('Erro ao converter PDF para imagens:', e)
    return []
  }
}

type ItemSumario = {
  id: string
  titulo: string
  pagina: string
  nivel: number
}

function normalizarTituloSumario(texto: string) {
  return texto.replace(/\s+/g, ' ').trim()
}

function slugifyTituloSumario(texto: string) {
  return normalizarTituloSumario(texto)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function calcularNivelSumario(el: HTMLElement, titulo: string) {
  const tag = el.tagName.toLowerCase()
  if (/^\d+\.\d+/.test(titulo)) return 2
  if (/^\d+\./.test(titulo)) return 1
  if (tag === 'h3' || tag === 'h4' || tag === 'h5' || tag === 'h6') return 2
  return 1
}

// Wrapper semântico transparente — só existe para o sumário poder ler data-pagina.
// O CSS `display: contents` o torna invisível no layout,
// fazendo o conteúdo de todas as seções fluir continuamente dentro de .laudo-conteudo.
const PaginaBase = ({
  pagina,
  children,
}: {
  pagina: string
  totalPaginas?: number
  dataLaudo?: string
  children: React.ReactNode
}) => (
  <div data-pagina={pagina} className="pagina-laudo">
    {children}
  </div>
)

const Pagina = PaginaBase
const PaginaFlexivel = PaginaBase

// Cabeçalho completo — exibido uma única vez no topo do documento HTML.
const CabecalhoLaudoCompleto = () => (
  <div className="mb-6">
    <div className="flex items-start justify-between gap-4">
      <Image
        src="/logo-lesath.png"
        alt="Lesath Engenharia"
        width={140}
        height={40}
        priority
        className="h-8 w-auto object-contain"
      />
      <div className="text-right leading-tight">
        <div className="text-[10px] uppercase tracking-[0.28em] text-[#8FA4C7]">LAUDO DE AVALIAÇÃO</div>
        <div className="text-[12px] font-semibold text-[#17325C]">Lesath Engenharia</div>
      </div>
    </div>
    <div className="mt-3 h-[4px] rounded-full bg-[#2347C6]" />
    <div className="mt-2 h-[1px] bg-[#C9D3E6]" />
  </div>
)

// Separador de seção — Conceito A: linha azul + linha cinza.
const CabecalhoLaudo = () => (
  <div className="mt-8 mb-2">
    <div className="h-[2px] bg-[#2347C6]" />
    <div className="mt-1 h-[0.5px] bg-[#C9D3E6]" />
  </div>
)

const RodapeLaudo = ({
  pagina,
  totalPaginas,
  dataLaudo,
}: {
  pagina?: string
  totalPaginas?: number
  dataLaudo?: string
}) => {
  return (
    <div className="mt-6 pt-3">
      <div className="h-[1px] bg-[#C9D3E6]"></div>

      <div className="mt-2 flex items-center justify-between gap-4 text-[11px] text-[#5D6F8F]">
        <span className="truncate">www.lesathengenharia.com.br</span>
        <span className="text-center font-medium text-[#17325C]">Lesath Engenharia</span>
        <span className="text-right">
          {pagina
            ? `Página ${pagina}${totalPaginas ? ` de ${totalPaginas}` : ''}${dataLaudo ? ` • ${formatarData(dataLaudo)}` : ''}`
            : ''}
        </span>
      </div>
    </div>
  )
}

function extrairCidadeDoEndereco(endereco?: string, fallback?: string): string {
  if (!endereco) return fallback || ''
  const partes = endereco.split(' – ').map(p => p.trim()).filter(Boolean)
  const filtradas = partes.filter(p => !p.startsWith('CEP') && !/^[A-Z]{2}$/.test(p))
  return filtradas.length >= 2 ? filtradas[filtradas.length - 2] : filtradas[filtradas.length - 1] || fallback || ''
}

function chunkArray<T>(items: T[], size: number) {
  if (!items.length) return [] as T[][]
  const groups: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    groups.push(items.slice(i, i + size))
  }
  return groups
}

function dividirTextoEmParagrafos(texto: string) {
  return (texto || '')
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n+/)
    .map((parte) => parte.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
}

function dividirParagrafosEmPaginas(
  paragrafos: string[],
  maxChars = 1800,
  maxParagrafos = 10
): string[][] {
  if (paragrafos.length === 0) return [[]]
  const paginas: string[][] = []
  let atual: string[] = []
  let chars = 0
  for (const p of paragrafos) {
    const charLimit = chars + p.length > maxChars && atual.length > 0
    const countLimit = atual.length >= maxParagrafos
    if ((charLimit || countLimit) && atual.length > 0) {
      paginas.push(atual)
      atual = [p]
      chars = p.length
    } else {
      atual.push(p)
      chars += p.length
    }
  }
  if (atual.length > 0) paginas.push(atual)
  return paginas
}

function dividirGlossarioEmItens(texto: string) {
  return (texto || '')
    .split(/\n+/)
    .map((parte) => parte.trim())
    .filter(Boolean)
}

type Foto = {
  preview: string
  legenda: string
}

type AcabamentoItem = {
  ambiente: string
  acabamento: string
}

type ResumoMercadoItem = {
  campo: string
  descricao: string
}

const TEXTO_PADRAO_TERRENO_ENCRAVADO = `O terreno encravado caracteriza-se por não possuir acesso oficial a qualquer via pública, podendo ser total ou parcial. A área com encravamento total, como é o caso do avaliando, não apresenta acesso em nenhuma de suas confrontações, dependendo, assim, de imóveis vizinhos para ser alcançado. Já o encravamento parcial é caracterizado por imóvel que possui acesso oficial, porém, por qualquer motivo, seja ele natural ou não, não é possível o acesso por esta via, como por exemplo, acesso pantanoso, estreito, entre outras possibilidades.

Seção III — Da Passagem Forçada. Art. 1.285. O dono do prédio que não tiver acesso à via pública, nascente ou porto, pode, mediante pagamento de indenização cabal, constranger o vizinho a lhe dar passagem, cujo rumo será judicialmente fixado, se necessário. § 1º Sofrerá o constrangimento o vizinho cujo imóvel mais natural e facilmente se prestar à passagem.

Diante do exposto, vale ressaltar que as características do imóvel podem gerar ônus judiciais no futuro, o que justifica a aplicação de fatores de depreciação ao valor inicial de avaliação.

Nesse contexto, adotam-se os parâmetros definidos na Tabela III, anexa à Lei nº 10.235/1986, com redação dada pela Lei nº 11.152/1991, a qual estabelece fatores diversos aplicáveis a situações que influenciam negativamente o valor dos terrenos.

Considerando que o imóvel avaliando se enquadra na condição de terreno encravado, aplica-se o fator correspondente, refletindo de forma objetiva e técnica as restrições de acesso e os riscos jurídicos inerentes, em conformidade com a legislação vigente e as boas práticas de avaliação imobiliária.`

const TEXTO_PADRAO_CONFRONTACAO_CURSO_AGUA = `Conforme a Lei nº 12.651, de 25 de maio de 2012 — Código Florestal, consideram-se Áreas de Preservação Permanente, em zonas rurais ou urbanas, as faixas marginais de qualquer curso d’água natural, perene ou intermitente, desde a borda da calha do leito regular, observadas as larguras mínimas previstas em lei.

A existência de confrontação com curso d’água exige avaliação técnica e jurídica quanto às possíveis restrições de uso, ocupação e aproveitamento do imóvel, especialmente em razão das limitações impostas pelas áreas de preservação permanente.

Dessa forma, a confrontação com curso d’água pode influenciar negativamente o aproveitamento econômico do imóvel, afetando sua liquidez, ocupação e potencial construtivo, devendo tal condição ser considerada na análise mercadológica e na formação do valor.`

type DadosLaudo = {
  tipoLaudo?: 'detalhado' | 'simplificado'
  divisoes?: { quantidade: string; ambiente: string }[]
  fatoresSelecionados?: string[]
  metodoAvaliacao?: string
  tratamentoDados?: string
  endereco: string
  proprietario: string
  tipo: string
  finalidade: string
  matricula: string
  solicitante?: string
  idadeAparente: string
  estadoConservacao: string
  iptu?: string
  padrao: string
  quantidadeDivisoes?: string
  especificacoesDivisoes?: string
  areaConstruidaTotal?: string
  areaConstruidaAverbada?: string
  areaConstruidaNaoAverbada?: number
  areaTerrenoTotal?: string
  areaTerrenoAverbada?: string
  areaTerrenoNaoAverbada?: number
  cidadePrincipal: string
  distanciaCidadePrincipal: string
  referencia1: string
  distancia1: string
  referencia2: string
  distancia2: string
  referencia3: string
  distancia3: string
  referencia4?: string
  distancia4?: string
  referencia5?: string
  distancia5?: string
  coordenadasImovel?: string
  terrenoEncravado?: boolean
  confrontacaoCursoAgua?: boolean
  observacoesTerrenoEncravado?: string
  observacoesConfrontacaoCursoAgua?: string
  melhoramentosPublicos?: Record<string, string | undefined>
  fotos: Foto[]
  croqui: string
  croquis?: { preview: string }[]
  acabamentos: AcabamentoItem[]
  consideracoesMercado: string
  liquidez?: string
  desempenhoMercado?: string
  resumoMercado: ResumoMercadoItem[]
  metodologiaCalculos: string
  periodoPesquisaInicio: string
  periodoPesquisaFim: string
  tipoInformacoesObtidas: string
  quantidadeElementos: string
  caracteristicasTerreno: string
  imagemBenfeitorias: string
  valorTerreno: string
  valorBenfeitorias: string
  valorTotal?: string
  modoValorImovel?: 'separado' | 'total'
  fatorComercializacao: string
  valorLiquidezForcada?: string
  garantiaClassificacao?: string
  garantiaObservacoes?: string
  dataLaudo?: string
  responsavelNome?: string
  responsavelCpf?: string
  responsavelRegistro?: string
  documentacaoPdf?: string
  localizacaoComparativos?: string
  calculoPdf?: string
  outrosFatoresImovel: { descricao: string; valor: string }[]
  valorFinalImovel: number
  fundamentacao?: { item: number; grau: string; pontos: number }[]
  fundamentacaoInferencia?: { item: number; grau: string; pontos: number }[]
  fundamentacaoEvolutivo?: { item: number; grau: string; pontos: number }[]
  precisao?: { item: number; grau: string; pontos: number }[]
}

function formatarData(data: string) {
  if (!data) return ''
  const [ano, mes, dia] = data.split('-')
  return `${dia}/${mes}/${ano}`
}

function converterNumero(valor: string) {
  if (!valor) return 0
  return Number(valor.replace(/\s/g, '').replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '')) || 0
}

function formatarMoeda(valor: number) {
  const v = Math.round(valor * 100) / 100
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// Garante que medidas de área sempre mostrem 2 casas decimais (ex: 900 m² → 900,00 m²)
function formatarArea(valor?: string): string {
  if (!valor) return ''
  // Remove "m²", espaços e separadores de milhar (ponto), troca vírgula decimal por ponto
  const numStr = valor
    .replace(/m²/g, '')
    .replace(/\s/g, '')
    .trim()
    .replace(/\.(?=\d{3})/g, '')   // remove pontos de milhar (ex: 1.771 → 1771)
    .replace(',', '.')              // converte vírgula decimal em ponto
  const num = parseFloat(numStr)
  if (isNaN(num)) return valor
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' m²'
}

function obterTextoGarantia(classificacao?: string, observacoes?: string) {
  if (classificacao === 'boa') {
    return {
      titulo: 'O imóvel avaliado apresenta-se como boa garantia.',
      texto: 'Após análise das características apresentadas no presente laudo, entendemos que o imóvel em questão reúne condições satisfatórias para ser aceito como garantia.',
    }
  }
  if (classificacao === 'observacoes') {
    return {
      titulo: 'O imóvel avaliado apresenta observações relevantes quanto à garantia.',
      texto: `Após análise das características apresentada no presente laudo, verificamos que o imóvel poderá ser aceito como garantia, porém existem ressalvas que deverão ser avaliadas pelo interessado, ficando a aceitação final a seu critério.${observacoes ? ` Observações: ${observacoes}` : ''}`,
    }
  }
  if (classificacao === 'negativa') {
    return {
      titulo: 'O imóvel avaliado não é recomendado como garantia.',
      texto: `Após análise das características apresentada no presente laudo, entendemos que o imóvel em questão não apresenta condições adequadas para aceitação como garantia.${observacoes ? ` Justificativa: ${observacoes}` : ''}`,
    }
  }
  return { titulo: '', texto: '' }
}

function arredondarValorLaudo(valor: number) {
  return Math.round(valor / 100) * 100
}

function numeroPorExtenso(valor: number) {
  const unidades = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove']
  const dezenas = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa']
  const centenas = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos']
  function extensoAte999(n: number): string {
    if (n === 0) return ''
    if (n === 100) return 'cem'
    if (n < 20) return unidades[n]
    if (n < 100) {
      const d = Math.floor(n / 10)
      const r = n % 10
      return r ? `${dezenas[d]} e ${unidades[r]}` : dezenas[d]
    }
    const c = Math.floor(n / 100)
    const r = n % 100
    if (r === 0) return centenas[c]
    return `${centenas[c]} e ${extensoAte999(r)}`
  }
  function extensoInteiro(n: number): string {
    if (n === 0) return 'zero'
    const milhoes = Math.floor(n / 1000000)
    const milhares = Math.floor((n % 1000000) / 1000)
    const resto = n % 1000
    const partes: string[] = []
    if (milhoes > 0) partes.push(milhoes === 1 ? 'um milhão' : `${extensoAte999(milhoes)} milhões`)
    if (milhares > 0) partes.push(milhares === 1 ? 'mil' : `${extensoAte999(milhares)} mil`)
    if (resto > 0) partes.push(extensoAte999(resto))
    if (partes.length === 1) return partes[0]
    if (partes.length === 2) return `${partes[0]} e ${partes[1]}`
    return partes.slice(0, -1).join(', ') + ' e ' + partes[partes.length - 1]
  }
  const reais = Math.round(valor)
  return `${extensoInteiro(reais)} reais`
}

function obterPontosFundamentacao(grau?: string) {
  if (grau === 'III') return 3
  if (grau === 'II') return 2
  if (grau === 'I') return 1
  return 0
}



function VisualizarLaudoContent() {
  let contadorPagina = 0
  const proximaPagina = () => {
    contadorPagina += 1
    return String(contadorPagina)
  }

  const searchParams = useSearchParams()
  const laudoId = searchParams.get('id')

  const [dados, setDados] = useState<DadosLaudo | null>(null)
  const [sumario, setSumario] = useState<ItemSumario[]>([])
  const [documentacaoNumPages, setDocumentacaoNumPages] = useState(0)
  const [calculoNumPages, setCalculoNumPages] = useState(0)
  const [baixandoPdf, setBaixandoPdf] = useState(false)


  async function baixarLaudoPdfSimplificado() {
    if (!dados) return
    setBaixandoPdf(true)
    try {
      const [{ pdf }, { default: LaudoPdfSimplificado }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('../../components/LaudoPdfSimplificado'),
      ])
      const blob = await pdf(
        React.createElement(LaudoPdfSimplificado, { dados }) as any
      ).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `laudo-simplificado-${dados.matricula || 'avaliacao'}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error(error)
      alert('Erro ao gerar o PDF simplificado.')
    } finally {
      setBaixandoPdf(false)
    }
  }

  useEffect(() => {
    async function carregarLaudo() {
      try {
        // Prioriza o ID passado na URL (?id=...), fallback para laudoAtual
        const urlParams = new URL(window.location.href)
        const idParam = urlParams.searchParams.get('id')
        // Retry: tenta até 5x com intervalo de 1s (resolve race condition com auto-save)
        let parsed: DadosLaudo | null = null
        const maxTentativas = idParam ? 5 : 1
        for (let t = 0; t < maxTentativas; t++) {
          parsed = (idParam
            ? await buscarLaudo(idParam)
            : await obterLaudoAtual()) as DadosLaudo | null
          if (parsed) break
          if (t < maxTentativas - 1) {
            await new Promise(r => setTimeout(r, 1000))
          }
        }
        if (parsed) {

          async function resolverRef(val: string): Promise<string> {
            if (!val) return val
            if (val.startsWith('__chunks__:')) {
              const sem = val.replace('__chunks__:', '')
              const lastColon = sem.lastIndexOf(':')
              const chave = sem.slice(0, lastColon)
              const num = parseInt(sem.slice(lastColon + 1))
              const partes = await Promise.all(
                Array.from({ length: num }, async (_, i) => {
                  try {
                    const res = await fetch(`/api/laudo-midias?chave=${encodeURIComponent(`${chave}__c${i}`)}`)
                    if (!res.ok) return ''
                    const { dado } = await res.json()
                    return dado || ''
                  } catch { return '' }
                })
              )
              return partes.join('')
            }
            if (!val?.startsWith('__ref__:')) return val
            const chave = val.replace('__ref__:', '')
            try {
              const res = await fetch(`/api/laudo-midias?chave=${encodeURIComponent(chave)}`)
              if (!res.ok) return ''
              const { dado } = await res.json()
              return dado || ''
            } catch { return '' }
          }

          const fotosResolvidas = await Promise.all(
            (parsed.fotos || []).map(async (f: any) => ({
              ...f, preview: await resolverRef(f.preview),
            }))
          )
          const croquisResolvidos = await Promise.all(
            (parsed.croquis || []).map(async (c: any) => ({
              preview: await resolverRef(c.preview),
            }))
          )
          const [docPdf, calcPdf, locComp, imgBenf] = await Promise.all([
            resolverRef(parsed.documentacaoPdf || ''),
            resolverRef(parsed.calculoPdf || ''),
            resolverRef(parsed.localizacaoComparativos || ''),
            resolverRef(parsed.imagemBenfeitorias || ''),
          ])

          setDados({
            ...parsed,
            // Determina tipoLaudo: usa o campo salvo, mas se houver indicadores de laudo
            // detalhado (croquis, acabamentos, responsavelCpf), força 'detalhado'
            // mesmo que o campo salvo diga 'simplificado' (bug de laudos antigos)
            tipoLaudo: (() => {
              const salvo = parsed.tipoLaudo as string
              if (salvo === 'detalhado') return 'detalhado'
              // Indicadores de laudo detalhado
              const ehDetalhado =
                (parsed.croquis && parsed.croquis.length > 0) ||
                (parsed.acabamentos && parsed.acabamentos.length > 0) ||
                (parsed.responsavelCpf && parsed.responsavelCpf.trim() !== '') ||
                (parsed.fundamentacao && parsed.fundamentacao.length > 0) ||
                (parsed.resumoMercado && parsed.resumoMercado.length > 0)
              if (ehDetalhado) return 'detalhado'
              return (salvo as 'detalhado' | 'simplificado') || 'detalhado'
            })(),
            fotos: fotosResolvidas,
            croquis: croquisResolvidos,
            documentacaoPdf: docPdf,
            calculoPdf: calcPdf,
            localizacaoComparativos: locComp,
            imagemBenfeitorias: imgBenf,
            observacoesTerrenoEncravado: parsed.observacoesTerrenoEncravado || '',
            observacoesConfrontacaoCursoAgua: parsed.observacoesConfrontacaoCursoAgua || '',
            coordenadasImovel: parsed.coordenadasImovel || '',
            terrenoEncravado: parsed.terrenoEncravado || false,
            confrontacaoCursoAgua: parsed.confrontacaoCursoAgua || false,
            melhoramentosPublicos: parsed.melhoramentosPublicos || {},
            fatoresSelecionados: parsed.fatoresSelecionados || [],
            divisoes: parsed.divisoes || [],
            iptu: parsed.iptu || '',
            solicitante: parsed.solicitante || '',
            acabamentos: parsed.acabamentos || [],
            resumoMercado: parsed.resumoMercado || [],
            consideracoesMercado: parsed.consideracoesMercado || '',
            liquidez: parsed.liquidez || '',
            desempenhoMercado: parsed.desempenhoMercado || '',
            metodologiaCalculos: parsed.metodologiaCalculos || '',
            periodoPesquisaInicio: parsed.periodoPesquisaInicio || '',
            periodoPesquisaFim: parsed.periodoPesquisaFim || '',
            tipoInformacoesObtidas: parsed.tipoInformacoesObtidas || '',
            quantidadeElementos: parsed.quantidadeElementos || '',
            caracteristicasTerreno: parsed.caracteristicasTerreno || '',
            valorTerreno: parsed.valorTerreno || '',
            valorBenfeitorias: parsed.valorBenfeitorias || '',
            valorTotal: parsed.valorTotal || '',
            modoValorImovel: parsed.modoValorImovel || 'separado',
            fatorComercializacao: parsed.fatorComercializacao || '1,00',
            valorLiquidezForcada: parsed.valorLiquidezForcada || '',
            outrosFatoresImovel: parsed.outrosFatoresImovel || [],
            valorFinalImovel: parsed.valorFinalImovel || 0,
            garantiaClassificacao: parsed.garantiaClassificacao || '',
            garantiaObservacoes: parsed.garantiaObservacoes || '',
            dataLaudo: parsed.dataLaudo || new Date().toISOString().split('T')[0],
            responsavelNome: parsed.responsavelNome || '',
            responsavelCpf: parsed.responsavelCpf || '',
            responsavelRegistro: parsed.responsavelRegistro || '',
            quantidadeDivisoes: parsed.quantidadeDivisoes || '',
            especificacoesDivisoes: parsed.especificacoesDivisoes || '',
            areaConstruidaTotal: parsed.areaConstruidaTotal || '',
            areaConstruidaAverbada: parsed.areaConstruidaAverbada || '',
            areaConstruidaNaoAverbada: parsed.areaConstruidaNaoAverbada || 0,
            areaTerrenoTotal: parsed.areaTerrenoTotal || '',
            areaTerrenoAverbada: parsed.areaTerrenoAverbada || '',
            areaTerrenoNaoAverbada: parsed.areaTerrenoNaoAverbada || 0,
            fundamentacao: parsed.fundamentacao || [],
            fundamentacaoInferencia: parsed.fundamentacaoInferencia || [],
            fundamentacaoEvolutivo: parsed.fundamentacaoEvolutivo || [],
            precisao: parsed.precisao || [],
          })
        }
      } catch (error) {
        console.error(error)
      }
    }
    carregarLaudo()
  }, [])

  useEffect(() => {
    if (!dados) return
    const timer = window.setTimeout(() => {
      const raiz = document.querySelector('.laudo-conteudo')
      if (!raiz) return
      const headings = Array.from(
        raiz.querySelectorAll('.pagina-laudo h1, .pagina-laudo h2, .pagina-laudo h3, .pagina-laudo h4, .pagina-laudo h5, .pagina-laudo h6')
      ) as HTMLElement[]
      const ignorar = new Set(['SUMÁRIO', 'Visualizar laudo'])
      const contagemIds = new Map<string, number>()
      const resultado = headings.map((el) => {
        const titulo = normalizarTituloSumario(el.textContent || '')
        if (!titulo || ignorar.has(titulo)) return null
        const paginaElemento = el.closest('.pagina-laudo') as HTMLElement | null
        const pagina = paginaElemento?.dataset?.pagina || '1'
        const nivel = calcularNivelSumario(el, titulo)
        const base = slugifyTituloSumario(titulo) || 'secao'
        const repeticao = (contagemIds.get(base) || 0) + 1
        contagemIds.set(base, repeticao)
        const id = repeticao === 1 ? `sumario-${base}` : `sumario-${base}-${repeticao}`
        el.id = id
        return { id, titulo, pagina, nivel }
      }).filter(Boolean) as ItemSumario[]
      setSumario(resultado)
    }, 180)
    return () => window.clearTimeout(timer)
  }, [dados, documentacaoNumPages, calculoNumPages])

  if (!dados) {
    return (
      <AppShell>
        <section className="mx-auto max-w-4xl px-6 pt-10">
          <div className="bg-white p-8 rounded-2xl shadow text-center">
            <div className="animate-pulse text-slate-400 mb-4">Carregando laudo…</div>
            <div className="text-sm text-slate-300">Aguarde alguns instantes</div>
          </div>
        </section>
      </AppShell>
    )
  }

  const valorTerrenoNumero = converterNumero(dados.valorTerreno)
  const valorBenfeitoriasNumero = converterNumero(dados.valorBenfeitorias)
  const valorTotalNumero = converterNumero(dados.valorTotal || '')
  const modoTotal = dados.modoValorImovel === 'total'
  const fatorComercializacaoNumero = converterNumero(dados.fatorComercializacao)
  const produtoOutrosFatores = (dados.outrosFatoresImovel || []).reduce((total, item) => total * (converterNumero(item.valor) || 1), 1)
  const baseCalculo = modoTotal ? valorTotalNumero : (valorTerrenoNumero + valorBenfeitoriasNumero)
  const subtotalImovel = baseCalculo * fatorComercializacaoNumero
  const valorFinalCalculado = subtotalImovel * produtoOutrosFatores
  const valorArredondadoLaudo = arredondarValorLaudo(valorFinalCalculado)
  const valorArredondadoExtenso = numeroPorExtenso(valorArredondadoLaudo)
  const valorLiquidezForcadaNumero = converterNumero(dados.valorLiquidezForcada || '')
  const valorLiquidezForcadaExtenso = valorLiquidezForcadaNumero > 0 ? numeroPorExtenso(valorLiquidezForcadaNumero) : ''
  const fotoFachada = (dados.fotos || []).find((foto) => (foto.legenda || '').trim().toLowerCase() === 'fachada')
  const garantiaTexto = obterTextoGarantia(dados.garantiaClassificacao, dados.garantiaObservacoes)

  // ── Capa Resumo — variáveis calculadas ──────────────────
  const capaFinalidade =
    dados.finalidade === 'garantia'   ? 'Avaliação para fins de garantia'
    : dados.finalidade === 'execucao' ? 'Avaliação para fins de execução'
    : dados.finalidade               || 'Não informado'

  const capaMetodologia =
    dados.metodoAvaliacao === 'evolutivo'    ? 'Evolutivo'
    : dados.metodoAvaliacao === 'comparativo'  ? 'Comparativo Direto'
    : dados.metodoAvaliacao                  || '-'

  const capaGrauFund = (() => {
    const gv2 = (i: any) => i.pontos || (i.grau === 'III' ? 3 : i.grau === 'II' ? 2 : i.grau === 'I' ? 1 : 0)
    if (dados.metodoAvaliacao === 'evolutivo') {
      const soma = (dados.fundamentacaoEvolutivo || []).reduce((s: number, i: any) => s + gv2(i), 0)
      if (soma >= 8) return 'III'; if (soma >= 5) return 'II'; if (soma >= 3) return 'I'; return '-'
    }
    const soma = (dados.fundamentacao || []).reduce((s: number, i: any) => s + gv2(i), 0)
    if (soma >= 10) return 'III'; if (soma >= 6) return 'II'; if (soma >= 4) return 'I'; return '-'
  })()

  const capaGrauPrec = (() => {
    const prec = dados.precisao || []
    if (prec.length === 0) return '-'
    if (prec.length === 1) return (prec[0] as any).grau || '-'
    const soma = prec.reduce((s: number, i: any) => s + (i.pontos || 0), 0)
    if (soma >= 8) return 'III'; if (soma >= 5) return 'II'; if (soma >= 3) return 'I'; return '-'
  })()

  const capaFatorLiquidacao =
    valorLiquidezForcadaNumero > 0 && valorArredondadoLaudo > 0
      ? (valorLiquidezForcadaNumero / valorArredondadoLaudo).toFixed(2).replace('.', ',')
      : '-'

  const capaLiquidezDisplay =
    dados.liquidez === 'alta'  ? 'Liquidez Alta'
    : dados.liquidez === 'media' ? 'Liquidez Média'
    : dados.liquidez === 'baixa' ? 'Liquidez Baixa'
    : dados.liquidez            ? dados.liquidez
    : 'Liquidez Média'

  const hoje = new Date()
  const mesesPt = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro']
  const capaDataImpressao = `São Paulo, ${hoje.getDate()} de ${mesesPt[hoje.getMonth()]} de ${hoje.getFullYear()}`
  // ────────────────────────────────────────────────────────
  const gruposFotos = chunkArray(dados.fotos || [], 4)
  const paragrafosConsideracoesMercado = dividirTextoEmParagrafos(dados.consideracoesMercado || '')
  const paginasSecao8 = dividirParagrafosEmPaginas(paragrafosConsideracoesMercado, 3200, 8)
  // Numeração dinâmica das subseções 6.x — só conta as que realmente existem
  let _s6 = 0
  const sec6Croqui    = (dados.croquis && dados.croquis.length > 0) ? `6.${++_s6}` : null
  const sec6Encravado = dados.terrenoEncravado   ? `6.${++_s6}` : null
  const sec6CursoAgua = dados.confrontacaoCursoAgua ? `6.${++_s6}` : null

  // Numeração dinâmica das seções principais a partir de 7
  const temAcabamentosSection = (dados.acabamentos || []).some(
    (a) => a.ambiente?.trim() || a.acabamento?.trim()
  )
  const temConsideracoesSection = paginasSecao8.some((chunk) => chunk.length > 0) || !!dados.liquidez || !!dados.desempenhoMercado
  const temFundamentacaoSection =
    (dados.fundamentacao?.length ?? 0) > 0 ||
    (dados.fundamentacaoEvolutivo?.length ?? 0) > 0 ||
    (dados.fundamentacaoInferencia?.length ?? 0) > 0 ||
    (dados.precisao?.length ?? 0) > 0
  const temGarantiaSection = !!garantiaTexto.titulo

  let _sn = 6
  const sn: Record<string, number> = {}
  if (temAcabamentosSection)   sn.acabamentos   = ++_sn
  if (temConsideracoesSection) sn.consideracoes = ++_sn
  sn.glossario   = ++_sn
  sn.metodologia = ++_sn
  sn.valor       = ++_sn
  if (temFundamentacaoSection) sn.fundamentacao = ++_sn
  sn.conclusao   = ++_sn
  if (temGarantiaSection)      sn.garantia      = ++_sn
  sn.anexos      = ++_sn

  const itensGlossario = dividirGlossarioEmItens(`Amostra: Conjunto de dados de mercado selecionados para representar o universo pesquisado e subsidiar a avaliação.
Análise de Mercado: Estudo das condições de oferta e demanda de imóveis semelhantes, visando identificar tendências e valores praticados.
Avaliação de Bens: Processo técnico destinado à determinação de valores de bens, direitos ou empreendimentos, para uma finalidade específica.
Avaliação Direta: Avaliação baseada em dados de mercado de bens comparáveis ao bem avaliando.
Bem Avaliando: Bem objeto da avaliação.
Benfeitoria: Obra ou melhoria incorporada ao imóvel, podendo ser necessária, útil ou voluptuária.
Coeficiente de Variação: Medida estatística que relaciona o desvio padrão à média, indicando a dispersão relativa dos dados.
Correlação: Medida estatística que expressa o grau de associação entre variáveis.
Depreciação: Perda de valor do bem em decorrência de deterioração física, funcional ou econômica.
Elasticidade de Preços: Variação percentual do preço de um bem em função de variações em seus atributos.
Estimativa de Tendência Central: Valor que melhor representa o conjunto de dados, podendo ser média, mediana ou moda.
Fator de Comercialização: Razão entre o valor de mercado de um imóvel e o seu custo de reedição.
Homogeneização: Tratamento dos dados de mercado para torná-los comparáveis ao bem avaliando.
Inferência Estatística: Processo de estimação de parâmetros populacionais a partir de dados amostrais.
Método Comparativo Direto: Método que identifica o valor de mercado do bem por meio de tratamento técnico de atributos comparáveis.
Método Evolutivo: Método que identifica o valor do bem pelo somatório dos valores do terreno e das benfeitorias, após aplicação do fator de comercialização.
Valor de Liquidação Forçada: Valor de comercialização compulsória do bem, em prazo significativamente menor do que os observados no mercado.
Valor de Mercado: Quantia mais provável pela qual um bem pode ser negociado, em condições normais de mercado, na data de referência.`)

  return (
    <AppShell>
      <section className="mx-auto max-w-7xl px-6 pt-10">
        <div className="max-w-[230mm] mx-auto p-4 md:p-6 print:p-0">
          <div className="bg-white p-6 rounded-2xl shadow mb-8 flex justify-between items-center print:hidden">
            <div>
              <div className="text-sm text-gray-400 uppercase">visualização do laudo</div>
              <h1 className="text-3xl font-bold">Visualizar laudo</h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/" className="border px-3 py-2 rounded-xl">Início</Link>
              <Link href="/meus-laudos" className="border px-3 py-2 rounded-xl">Meus laudos</Link>
              <Link
                href={
                  laudoId ? `/laudo/simplificado?id=${laudoId}` : '/laudo/simplificado'
                }
                className="bg-blue-50 px-3 py-2 rounded-xl text-blue-700"
              >
                Editar laudo
              </Link>
              <button
                type="button"
                onClick={baixarLaudoPdfSimplificado}
                disabled={baixandoPdf}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {baixandoPdf ? 'Gerando PDF...' : 'Baixar PDF'}
              </button>
            </div>
          </div>

          <div className="bg-white laudo-conteudo">
            {/* Estilos globais — Conceito A */}
            <style>{`
              @media screen {
                .capa-geo-header { margin: -10mm -12mm 0; }
                .cr-bar { margin-left: -12mm; margin-right: -12mm; }
              }
              @media print {
                .capa-geo-header { margin: 0; }
                .cr-bar { margin-left: 0; margin-right: 0; }
              }
              h2.titulo-laudo {
                color: #17325C;
                padding-bottom: 6px;
                border-bottom: 2px solid #2347C6;
                margin-bottom: 14px;
              }
              .value-box-dark {
                background: #17325C;
                border: 1px solid #17325C;
                border-radius: 4px;
                padding: 10px 14px;
              }
              .value-box-light {
                background: #EAF0FB;
                border: 1px solid #c2d0e8;
                border-radius: 4px;
                padding: 10px 14px;
              }
              .value-box-dark .vb-label { font-size: 9px; font-weight: 700; color: #8FA4C7; text-transform: uppercase; letter-spacing: .08em; margin-bottom: 3px; }
              .value-box-dark .vb-num   { font-size: 18px; font-weight: 700; color: #ffffff; line-height: 1.1; }
              .value-box-dark .vb-ext   { font-size: 9px; color: #8FA4C7; margin-top: 2px; }
              .value-box-light .vb-label { font-size: 9px; font-weight: 700; color: #2347C6; text-transform: uppercase; letter-spacing: .08em; margin-bottom: 3px; }
              .value-box-light .vb-num   { font-size: 18px; font-weight: 700; color: #17325C; line-height: 1.1; }
              .value-box-light .vb-ext   { font-size: 9px; color: #5a7090; margin-top: 2px; }
            `}</style>

            {/* Laudo simplificado */}
            {(() => {
              const SecHeader = ({ num, titulo }: { num: string; titulo: string }) => (
                <div style={{ background: '#17325C', padding: '4px 10px', margin: '10px 0 0' }}>
                  <span style={{ fontSize: '9px', fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {num} — {titulo}
                  </span>
                </div>
              )
              const TH = ({ children, style, colSpan }: { children: React.ReactNode; style?: React.CSSProperties; colSpan?: number }) => (
                <th colSpan={colSpan} style={{ background: '#EAF0FB', border: '0.5px solid #C9D3E6', padding: '3.5px 6px', fontSize: '8px', fontWeight: 700, color: '#17325C', textAlign: 'left', ...style }}>
                  {children}
                </th>
              )
              const TDL = ({ children }: { children: React.ReactNode }) => (
                <td style={{ background: '#EAF0FB', border: '0.5px solid #C9D3E6', padding: '3.5px 6px', fontSize: '8px', fontWeight: 700, color: '#17325C', width: '28%' }}>
                  {children}
                </td>
              )
              const TDV = ({ children, colSpan }: { children: React.ReactNode; colSpan?: number }) => (
                <td colSpan={colSpan} style={{ border: '0.5px solid #C9D3E6', padding: '3.5px 6px', fontSize: '8px', color: '#1e293b' }}>
                  {children || '—'}
                </td>
              )
              const DocHeader = () => (
                <div style={{ background: '#17325C', padding: '8px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#fff' }}>Lesath Engenharia</div>
                    <div style={{ fontSize: '9px', color: '#8FA4C7', marginTop: '1px' }}>Precisão técnica que gera confiança</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '8px', color: '#8FA4C7', letterSpacing: '1px', textTransform: 'uppercase' }}>LAUDO DE AVALIAÇÃO</div>
                    {dados.solicitante && <div style={{ fontSize: '8px', color: '#b8cce4', marginTop: '1px' }}>Solicitante: {dados.solicitante}</div>}
                    {dados.proprietario && <div style={{ fontSize: '8px', color: '#b8cce4', marginTop: '1px' }}>Proponente: {dados.proprietario}</div>}
                  </div>
                </div>
              )
              const DocFooter = ({ pag }: { pag: string }) => (
                <div style={{ background: '#17325C', padding: '4px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                  <span style={{ fontSize: '8px', color: '#8FA4C7' }}>www.lesathengenharia.com.br</span>
                  <span style={{ fontSize: '8px', color: '#8FA4C7' }}>{formatarData(dados.dataLaudo || '')}</span>
                  <span style={{ fontSize: '8px', fontWeight: 700, color: '#fff' }}>Página {pag}</span>
                </div>
              )

              const endParts = (dados.endereco || '').split(' – ').map((p: string) => p.trim())
              const logradouro = endParts[0] || ''
              const bairro     = endParts[1] || ''
              const cidade     = endParts[2] || ''
              const uf         = endParts[3] || ''
              const cepMatch   = (dados.endereco || '').match(/CEP\s*([\d-]+)/)
              const cep        = cepMatch ? cepMatch[1] : ''

              const metLabel =
                dados.metodoAvaliacao === 'comparativo' ? 'Método Comparativo Direto de Dados de Mercado'
                : dados.metodoAvaliacao === 'evolutivo'  ? 'Método Evolutivo'
                : dados.metodoAvaliacao || '—'

              const fotoFach = (dados.fotos || []).find((f: any) => (f.legenda || '').toLowerCase().includes('fachada')) || dados.fotos?.[0]
              const fotosAnexo = dados.fotos || []
              const divisoesFilt = (dados.divisoes || []).filter((d: any) => d.ambiente?.trim())

              const vlFinal = valorArredondadoLaudo
              const vlf = valorLiquidezForcadaNumero

              // Dados completos do CDDM (persistidos pelo EtapaCalculoCDDM)
              const cddm = (dados as any).dadosCalculoCDDM as {
                elementos: any[]
                avaliando: { area: number; padraoConstrutivo: string; estadoConservacao: string }
                media: number; mediaSaneada: number; desvioPadrao: number; coefVariacao: number
                tStudent: number; intervaloConfianca: number; limiteInferior: number; limiteSuperior: number
                limiteInf30: number; limiteSup30: number; grauPrecisao: string; valorImovel: number; outliersDescartados: number
              } | undefined
              const ev = (dados as any).dadosCalculoEvolutivo as any | undefined
              const evSnap = ev
              const elementosCddm = cddm?.elementos || []
              const elementosEv = ev?.elementos || []
              // Elementos a mostrar: CDDM para comparativo, evolutivo para método evolutivo
              const isEvolutivo = dados.metodoAvaliacao === 'evolutivo'
              const elementosExibir: any[] = isEvolutivo ? elementosEv : elementosCddm
              const temCddm = elementosCddm.length > 0
              const temElementos = elementosExibir.length > 0
              const formatarDataBR = (data?: string) => {
                if (!data) return ''
                const [ano, mes, dia] = data.split('-')
                return `${dia}/${mes}/${ano}`
              }

              return (
                <>
                  {/* ─── PÁGINA 1 ─────────────────────────────────────── */}
                  <Pagina pagina={proximaPagina()} dataLaudo={dados.dataLaudo}>
                    <DocHeader />
                    <div style={{ background: '#2347C6', textAlign: 'center', padding: '5px 12px', margin: '8px 0 6px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#fff' }}>LAUDO DE AVALIAÇÃO</span>
                    </div>

                    {/* 1 — Identificação */}
                    <SecHeader num="1" titulo="Identificação" />
                    <table style={{ width: '100%', borderCollapse: 'collapse', border: '0.5px solid #C9D3E6' }}>
                      <tbody>
                        <tr><TDL>Matrícula</TDL><TDV>{dados.matricula}</TDV></tr>
                        <tr><TDL>Solicitante</TDL><TDV>{dados.solicitante}</TDV></tr>
                        <tr><TDL>Proponente</TDL><TDV>{dados.proprietario}</TDV></tr>
                        <tr><TDL>Logradouro</TDL><TDV>{logradouro}</TDV></tr>
                        <tr>
                          <td colSpan={2} style={{ border: '0.5px solid #C9D3E6', padding: 0 }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                              <tbody>
                                <tr>
                                  <TDL>CEP</TDL><TDV>{cep}</TDV>
                                  <TDL>Bairro</TDL><TDV>{bairro}</TDV>
                                  <TDL>Cidade</TDL><TDV>{cidade}</TDV>
                                  <TDL>UF</TDL><TDV>{uf}</TDV>
                                </tr>
                              </tbody>
                            </table>
                          </td>
                        </tr>
                        {dados.coordenadasImovel && <tr><TDL>Coordenadas</TDL><TDV>{dados.coordenadasImovel}</TDV></tr>}
                      </tbody>
                    </table>

                    {/* Foto fachada */}
                    {fotoFach && (
                      <div style={{ height: '130px', margin: '8px 0', overflow: 'hidden', border: '0.5px solid #C9D3E6', borderRadius: '3px' }}>
                        <img src={fotoFach.preview} alt="Fachada" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    )}

                    {/* 2 — Avaliação */}
                    <SecHeader num="2" titulo="Avaliação" />
                    <div style={{ display: 'flex', gap: '6px', margin: '6px 0 4px' }}>
                      <div style={{ flex: 1, background: '#17325C', padding: '8px 10px', borderRadius: '3px' }}>
                        <div style={{ fontSize: '7.5px', color: '#8FA4C7', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>VALOR DA AVALIAÇÃO</div>
                        <div style={{ fontSize: '16px', fontWeight: 700, color: '#fff', margin: '3px 0 1px' }}>{formatarMoeda(vlFinal)}</div>
                        <div style={{ fontSize: '8px', color: '#8FA4C7' }}>({numeroPorExtenso(vlFinal).charAt(0).toUpperCase() + numeroPorExtenso(vlFinal).slice(1)})</div>
                      </div>
                      {vlf > 0 && (
                        <div style={{ flex: 1, background: '#EAF0FB', border: '0.5px solid #C9D3E6', padding: '8px 10px', borderRadius: '3px' }}>
                          <div style={{ fontSize: '7.5px', color: '#2347C6', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>VALOR DE LIQUIDAÇÃO</div>
                          <div style={{ fontSize: '16px', fontWeight: 700, color: '#17325C', margin: '3px 0 1px' }}>{formatarMoeda(vlf)}</div>
                          <div style={{ fontSize: '8px', color: '#5a7090' }}>({numeroPorExtenso(vlf).charAt(0).toUpperCase() + numeroPorExtenso(vlf).slice(1)})</div>
                        </div>
                      )}
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', border: '0.5px solid #C9D3E6', marginBottom: '6px' }}>
                      <tbody><tr><TDL>Metodologia</TDL><TDV>{metLabel}</TDV></tr></tbody>
                    </table>

                    {/* 3 — Características e Dimensões do Avaliando (unificado) */}
                    <SecHeader num="3" titulo="Características e Dimensões do Avaliando" />
                    <table style={{ width: '100%', borderCollapse: 'collapse', border: '0.5px solid #C9D3E6', marginTop: '4px' }}>
                      <tbody>
                        <tr>
                          <TDL>Tipo</TDL><TDV>{dados.tipo}</TDV>
                          <TDL>IPTU</TDL><TDV>{dados.iptu}</TDV>
                        </tr>
                        <tr>
                          <TDL>Área de terreno</TDL><TDV>{formatarArea(dados.areaTerrenoTotal)}</TDV>
                          <TDL>Área construída total</TDL><TDV>{formatarArea(dados.areaConstruidaTotal)}</TDV>
                        </tr>
                        <tr>
                          <TDL>Área averbada</TDL><TDV>{formatarArea(dados.areaConstruidaAverbada)}</TDV>
                          <TDL>Área não averbada</TDL><TDV>{formatarArea(dados.areaConstruidaNaoAverbada?.toString())}</TDV>
                        </tr>
                        <tr>
                          <TDL>Padrão construtivo</TDL><TDV>{dados.padrao}</TDV>
                          <TDL>Idade aparente</TDL><TDV>{dados.idadeAparente ? dados.idadeAparente + ' anos' : '—'}</TDV>
                        </tr>
                        <tr>
                          <TDL>Estado de conservação</TDL><TDV>{dados.estadoConservacao}</TDV>
                          <TDL>Finalidade</TDL><TDV>{capaFinalidade}</TDV>
                        </tr>
                      </tbody>
                    </table>
                    <DocFooter pag="1" />
                  </Pagina>

                  {/* ─── PÁGINA 2 ─────────────────────────────────────── */}
                  <Pagina pagina={proximaPagina()} dataLaudo={dados.dataLaudo}>
                    <DocHeader />

                    {/* 4 — Documentação (renumerada) */}
                    <SecHeader num="4" titulo="Documentação Apresentada" />
                    <table style={{ width: '100%', borderCollapse: 'collapse', border: '0.5px solid #C9D3E6', marginTop: '4px' }}>
                      <tbody>
                        <tr><TDL>Matrícula</TDL><TDV>{dados.matricula}</TDV></tr>
                        <tr><TDL>Inscrição imobiliária</TDL><TDV>{dados.iptu}</TDV></tr>
                      </tbody>
                    </table>

                    {/* 6 — Descrição */}
                    <SecHeader num="5" titulo="Descrição do Imóvel Avaliando" />
                    <div style={{ border: '0.5px solid #C9D3E6', padding: '8px', fontSize: '8.5px', lineHeight: '1.55', color: '#1e293b', marginTop: '4px' }}>
                      <strong style={{ color: '#17325C', fontSize: '8.5px' }}>6.1 — Descrição do imóvel avaliando</strong>
                      <div style={{ marginTop: '4px' }}>
                        {dados.consideracoesMercado
                          ? dados.consideracoesMercado.substring(0, 500) + (dados.consideracoesMercado.length > 500 ? '...' : '')
                          : `Imóvel do tipo ${dados.tipo || 'residencial'}, localizado em ${dados.endereco}.`}
                      </div>
                    </div>

                    {/* 7 — Divisões */}
                    {divisoesFilt.length > 0 && (
                      <>
                        <SecHeader num="6" titulo="Características do Imóvel Avaliando" />
                        <table style={{ width: '100%', borderCollapse: 'collapse', border: '0.5px solid #C9D3E6', marginTop: '4px' }}>
                          <thead>
                            <tr>
                              <TH style={{ width: '40%' }}>Divisão Interna</TH>
                              <TH style={{ width: '20%', textAlign: 'center' }}>Qtd.</TH>
                            </tr>
                          </thead>
                          <tbody>
                            {divisoesFilt.map((d: any, i: number) => (
                              <tr key={i}>
                                <TDV>{d.ambiente}</TDV>
                                <td style={{ border: '0.5px solid #C9D3E6', padding: '3.5px 6px', fontSize: '8px', textAlign: 'center', color: '#1e293b' }}>{d.quantidade}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </>
                    )}
                    <DocFooter pag="2" />
                  </Pagina>

                  {/* ─── PÁGINA 3 ─────────────────────────────────────── */}
                  <Pagina pagina={proximaPagina()} dataLaudo={dados.dataLaudo}>
                    <DocHeader />

                    

                    {/* 9 — Pesquisa imobiliária */}
                    <SecHeader num="8" titulo="Pesquisa Imobiliária" />


                    {/* Cards de elemento — blocos temáticos, até 3 colunas, campos vazios omitidos */}
                    {temElementos && elementosExibir.map((el: any, i: number) => {
                      const vOf  = el.valorOferta > 0 ? formatarMoeda(el.valorOferta)
                        : el.valorOferta ? formatarMoeda(Number(String(el.valorOferta).replace(/[^\d,]/g,'').replace(',','.'))) : ''
                      const fOf  = parseFloat(String(el.fatorOferta||'').replace(',','.')) || 1
                      const vLiq = el.valorOferta > 0 ? formatarMoeda(el.valorOferta * fOf) : ''
                      const vuOf = el.valorUnitarioOferta > 0 ? formatarMoeda(el.valorUnitarioOferta) : ''
                      const vuTer = el.vuTerreno > 0 ? formatarMoeda(el.vuTerreno) : ''
                      const cidadeUF = [el.cidade, el.uf].filter(Boolean).join(' · ')
                      const foto = el.foto || ''

                      const ok = (v: any) => { const s = String(v ?? '').trim(); return s && s !== '0' && s !== '-' ? s : '' }
                      const LBL: React.CSSProperties = { background: '#EAF0FB', padding: '3px 6px', fontSize: '7.5px', fontWeight: 700, color: '#1a3564', borderRight: '0.5px solid #C9D3E6', whiteSpace: 'nowrap' }
                      const VAL: React.CSSProperties = { padding: '3px 6px', fontSize: '7.5px', color: '#1e293b' }
                      const brd: React.CSSProperties = { borderTop: '0.5px solid #C9D3E6' }
                      const R = { borderRight: '0.5px solid #C9D3E6' }

                      const r1 = (l: string, v: any, extra?: React.CSSProperties) => {
                        const a = ok(v); if (!a) return null
                        return <tr style={brd}><td style={{ ...LBL, width: '18%' }}>{l}</td><td style={{ ...VAL, ...extra }}>{a}</td></tr>
                      }
                      const r2 = (l1: string, v1: any, l2: string, v2: any) => {
                        const a = ok(v1), b = ok(v2); if (!a && !b) return null
                        if (!b) return r1(l1, a); if (!a) return r1(l2, b)
                        return <tr style={brd}><td style={{ ...LBL, width: '18%' }}>{l1}</td><td style={{ ...VAL, width: '32%', ...R }}>{a}</td><td style={{ ...LBL, width: '18%', ...R }}>{l2}</td><td style={VAL}>{b}</td></tr>
                      }
                      const r3 = (l1: string, v1: any, l2: string, v2: any, l3: string, v3: any) => {
                        const a = ok(v1), b = ok(v2), c = ok(v3); if (!a && !b && !c) return null
                        if (!c) return r2(l1, a, l2, b); if (!b && !a) return r1(l3, c)
                        if (!a) return r2(l2, b, l3, c); if (!b) return r2(l1, a, l3, c)
                        return <tr style={brd}><td style={{ ...LBL, width: '14%' }}>{l1}</td><td style={{ ...VAL, width: '19%', ...R }}>{a}</td><td style={{ ...LBL, width: '14%', ...R }}>{l2}</td><td style={{ ...VAL, width: '19%', ...R }}>{b}</td><td style={{ ...LBL, width: '14%', ...R }}>{l3}</td><td style={VAL}>{c}</td></tr>
                      }

                      const linhas = [
                        r3('Tipo', el.tipo, 'Data', el.data ? formatarDataBR(el.data) : '', 'Empreendimento', el.empreendimento),
                        r1('Logradouro', el.logradouro || el.endereco),
                        r3('Bairro', el.bairro, 'Cidade · UF', cidadeUF, 'Distância', el.distanciaAvaliando || el.distancia),
                        r1('Coordenadas', el.coordenadas, { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }),
                      r1('Fonte', el.fonte),
                        r3('Conservação', el.estadoConservacao, 'Idade', el.idadeAparente > 0 ? `${el.idadeAparente} anos` : (el.idade ? `${el.idade} anos` : ''), 'Andar', el.andar > 0 ? el.andar : ''),
                        r2('Área terreno', el.areaTerreno > 0 ? `${Number(el.areaTerreno).toLocaleString('pt-BR')} m²` : '', 'Área constr./útil', el.area > 0 ? `${el.area.toLocaleString('pt-BR')} m²` : (el.areaConstruida ? `${el.areaConstruida} m²` : '')),
                        r2('Padrão constr.', el.padraoConstrutivo, 'FOC', el.foc ? el.foc.toString().replace('.',',') : ''),
                        r3('Dormitórios', el.dormitorios > 0 ? el.dormitorios : '', 'Suítes', el.suites > 0 ? el.suites : '', 'Vagas', el.vagas > 0 ? el.vagas : ''),
                        r3('Valor oferta', vOf, 'Valor líquido', vLiq !== vOf ? vLiq : '', 'V.U./m²', vuOf || vuTer),
                        r3('F. Oferta', ok(el.fatorOferta), 'F. Local/Nota', ok(el.fatorLocal || el.fatorLocalBruto || el.notaLocal), 'F. Andar', ok(el.fatorAndar || el.fatorAndarBruto)),
                        r3('Tipo oferta', el.tipoOferta, 'Status', el.status, 'Telefone', el.telefone),
                        el.link ? <tr key="link" style={brd}><td style={{ ...LBL, width: '18%' }}>Link</td><td style={{ ...VAL, fontSize: '6.5px', color: '#2347C6', wordBreak: 'break-all' }}>{String(el.link)}</td></tr> : null,
                        r1('Obs.', el.observacoes),
                      ].filter(Boolean)

                      if (linhas.length === 0) return null

                      return (
                        <div key={`elem-${i}`} style={{ marginBottom: '6px', breakInside: 'avoid', border: '1px solid #b8c4d8', borderRadius: '3px', overflow: 'hidden' }}>
                          {/* Cabeçalho do card — navy #1a3564 */}
                          <div style={{ background: '#1a3564', padding: '4px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '8px', fontWeight: 700, color: '#fff', letterSpacing: '0.5px' }}>
                              {isEvolutivo ? 'ELEMENTO' : 'ELEMENTO COMPARATIVO'} {String(i + 1).padStart(2, '0')}
                            </span>
                            <span style={{ fontSize: '7.5px', color: '#8fa4c7' }}>
                              {el.fonte || ''}{el.data ? ` • ${formatarDataBR(el.data)}` : ''}
                            </span>
                          </div>
                          {/* Corpo: campos + foto lateral */}
                          <div style={{ display: 'flex' }}>
                            <table style={{ flex: 1, borderCollapse: 'collapse', border: '0.5px solid #C9D3E6', borderTop: 'none', borderRight: foto ? '0.5px solid #C9D3E6' : 'none' }}>
                              <tbody>{linhas}</tbody>
                            </table>
                            {foto && (
                              <div style={{ width: '110px', flexShrink: 0, borderTop: 'none', borderLeft: '0.5px solid #C9D3E6', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9fc' }}>
                                <img src={foto} alt={`Elemento ${i+1}`} style={{ width: '110px', height: '100%', objectFit: 'cover' }} />
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}

                    {/* Mapa de localização — após os elementos */}
                    {dados.localizacaoComparativos && (
                      <div style={{ marginTop: '8px' }}>
                        <img
                          src={dados.localizacaoComparativos}
                          alt="Mapa de localização dos comparativos"
                          style={{ width: '100%', borderRadius: '6px', border: '0.5px solid #C9D3E6', objectFit: 'cover', maxHeight: '260px' }}
                        />
                      </div>
                    )}

                    {/* 9.1 — Homogeneização */}
                    {temCddm && (
                      <>
                        <SecHeader num="8.1" titulo="Homogeneização" />
                        <table style={{ width: '100%', borderCollapse: 'collapse', border: '0.5px solid #C9D3E6', marginTop: '4px' }}>
                          <thead>
                            <tr style={{ background: '#2347C6' }}>
                              <th style={{ padding: '3px 2px', fontSize: '7px', fontWeight: 700, color: '#fff', textAlign: 'center', borderRight: '0.5px solid #475e9b' }}>Elem.</th>
                              <th style={{ padding: '3px 2px', fontSize: '7px', fontWeight: 700, color: '#fff', textAlign: 'center', borderRight: '0.5px solid #475e9b' }}>VU/m²</th>
                              <th style={{ padding: '3px 2px', fontSize: '7px', fontWeight: 700, color: '#fff', textAlign: 'center', borderRight: '0.5px solid #475e9b' }}>F.Local</th>
                              <th style={{ padding: '3px 2px', fontSize: '7px', fontWeight: 700, color: '#fff', textAlign: 'center', borderRight: '0.5px solid #475e9b' }}>F.Padrão</th>
                              <th style={{ padding: '3px 2px', fontSize: '7px', fontWeight: 700, color: '#fff', textAlign: 'center', borderRight: '0.5px solid #475e9b' }}>F.FOC</th>
                              <th style={{ padding: '3px 2px', fontSize: '7px', fontWeight: 700, color: '#fff', textAlign: 'center', borderRight: '0.5px solid #475e9b' }}>F.Andar</th>
                              <th style={{ padding: '3px 2px', fontSize: '7px', fontWeight: 700, color: '#fff', textAlign: 'center', borderRight: '0.5px solid #475e9b' }}>F.Vaga</th>
                              <th style={{ padding: '3px 2px', fontSize: '7px', fontWeight: 700, color: '#fff', textAlign: 'center', borderRight: '0.5px solid #475e9b' }}>F.Área</th>
                              <th style={{ padding: '3px 2px', fontSize: '7px', fontWeight: 700, color: '#fff', textAlign: 'center' }}>VU/m² Hom.</th>
                            </tr>
                          </thead>
                          <tbody>
                            {elementosCddm.map((el: any, i: number) => {
                              const isSan = el.saneado
                              const cellStyle: React.CSSProperties = {
                                padding: '2.5px 2px', fontSize: '7px',
                                color: isSan ? '#1e293b' : '#9ca3af',
                                fontStyle: isSan ? 'normal' : 'italic',
                                textAlign: 'center', borderRight: '0.5px solid #C9D3E6', borderTop: '0.5px solid #C9D3E6',
                              }
                              return (
                                <tr key={`h-${i}`}>
                                  <td style={cellStyle}>{i + 1}</td>
                                  <td style={cellStyle}>{formatarMoeda(el.valorUnitarioOferta || 0)}</td>
                                  <td style={cellStyle}>{(el.fatorLocal || 1).toFixed(4).replace('.', ',')}</td>
                                  <td style={cellStyle}>{(el.fatorPadrao || 1).toFixed(4).replace('.', ',')}</td>
                                  <td style={cellStyle}>{(el.fatorFOC || 1).toFixed(4).replace('.', ',')}</td>
                                  <td style={cellStyle}>{(el.fatorAndar || 1).toFixed(4).replace('.', ',')}</td>
                                  <td style={cellStyle}>{(el.fatorVaga || 1).toFixed(4).replace('.', ',')}</td>
                                  <td style={cellStyle}>{(el.fatorArea || 1).toFixed(4).replace('.', ',')}</td>
                                  <td style={{ ...cellStyle, borderRight: 'none', fontWeight: 700, color: isSan ? '#17325C' : '#9ca3af' }}>
                                    {formatarMoeda(el.vuHomog || 0)}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>

                        <div style={{ background: '#EAF0FB', border: '0.5px solid #C9D3E6', padding: '5px', marginTop: '4px', fontSize: '7px', color: '#1e293b', lineHeight: 1.4 }}>
                          <div style={{ fontWeight: 700, marginBottom: 2 }}>Legenda dos fatores aplicados:</div>
                          <div>F.Local = Fator de Localização &nbsp;·&nbsp; F.Padrão = Fator de Padrão Construtivo &nbsp;·&nbsp; F.FOC = Fator de Obsolescência e Conservação</div>
                          <div>F.Andar = Fator de Andar &nbsp;·&nbsp; F.Vaga = Fator de Vaga de Garagem &nbsp;·&nbsp; F.Área = Fator de Adequação por Área</div>
                          {cddm && cddm.outliersDescartados > 0 && (
                            <div style={{ marginTop: 3, color: '#94a3b8', fontStyle: 'italic' }}>
                              Elementos em itálico/cinza foram descartados pelo saneamento estatístico (Critério de Chauvenet — fora do intervalo ±30% da média).
                            </div>
                          )}
                        </div>

                        {/* Memorial de cálculos (estilo MK) */}
                        {cddm && (
                          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                            <div style={{ flex: 1.3, border: '0.5px solid #C9D3E6' }}>
                              <div style={{ background: '#17325C', padding: '3px 5px', textAlign: 'center', fontSize: '8px', fontWeight: 700, color: '#fff' }}>
                                ENQUADRAMENTO DA AVALIAÇÃO
                              </div>
                              <div style={{ display: 'flex', borderBottom: '0.5px solid #C9D3E6' }}>
                                <div style={{ flex: 1.6, padding: '3px 5px', fontSize: '7px', color: '#1e293b', borderRight: '0.5px solid #C9D3E6' }}>
                                  Amplitude do intervalo de confiança de 80% em torno da estimativa central
                                </div>
                                <div style={{ flex: 1.5 }}>
                                  <div style={{ display: 'flex', background: '#EAF0FB', borderBottom: '0.5px solid #C9D3E6' }}>
                                    <div style={{ flex: 1, fontSize: '7px', fontWeight: 700, color: '#17325C', textAlign: 'center', padding: '2px', borderRight: '0.5px solid #C9D3E6' }}>III</div>
                                    <div style={{ flex: 1, fontSize: '7px', fontWeight: 700, color: '#17325C', textAlign: 'center', padding: '2px', borderRight: '0.5px solid #C9D3E6' }}>II</div>
                                    <div style={{ flex: 1, fontSize: '7px', fontWeight: 700, color: '#17325C', textAlign: 'center', padding: '2px' }}>I</div>
                                  </div>
                                  <div style={{ display: 'flex' }}>
                                    <div style={{ flex: 1, fontSize: '7px', color: '#1e293b', textAlign: 'center', padding: '2px', borderRight: '0.5px solid #C9D3E6' }}>≤ 30%</div>
                                    <div style={{ flex: 1, fontSize: '7px', color: '#1e293b', textAlign: 'center', padding: '2px', borderRight: '0.5px solid #C9D3E6' }}>≤ 40%</div>
                                    <div style={{ flex: 1, fontSize: '7px', color: '#1e293b', textAlign: 'center', padding: '2px' }}>≤ 50%</div>
                                  </div>
                                </div>
                              </div>
                              <div style={{ display: 'flex', borderBottom: '0.5px solid #C9D3E6' }}>
                                <div style={{ flex: 2, padding: '3px 5px', fontSize: '7px', fontWeight: 700, color: '#1e293b', borderRight: '0.5px solid #C9D3E6' }}>Intervalo de confiança</div>
                                <div style={{ flex: 1.1, padding: '3px 5px', fontSize: '7.5px', fontWeight: 700, color: '#2347C6', textAlign: 'center' }}>{cddm.intervaloConfianca.toFixed(2).replace('.', ',')}%</div>
                              </div>
                              <div style={{ display: 'flex' }}>
                                <div style={{ flex: 2, padding: '3px 5px', fontSize: '7px', fontWeight: 700, color: '#fff', background: '#17325C', borderRight: '0.5px solid #C9D3E6' }}>GRAU DE PRECISÃO</div>
                                <div style={{ flex: 1.1, padding: '3px 5px', fontSize: '10px', fontWeight: 700, color: '#2347C6', textAlign: 'center', background: '#dbeafe' }}>{cddm.grauPrecisao || '—'}</div>
                              </div>
                            </div>

                            <div style={{ flex: 1, border: '0.5px solid #C9D3E6' }}>
                              <div style={{ background: '#17325C', padding: '3px 5px', textAlign: 'center', fontSize: '8px', fontWeight: 700, color: '#fff' }}>
                                MEMORIAL DE CÁLCULOS
                              </div>
                              {[
                                ['Média Saneada', formatarMoeda(cddm.mediaSaneada)],
                                ['Limite superior (+30%)', formatarMoeda(cddm.limiteSup30)],
                                ['Limite inferior (-30%)', formatarMoeda(cddm.limiteInf30)],
                                ['Desvio Padrão', cddm.desvioPadrao.toFixed(2).replace('.', ',')],
                                ['Coef. de Variação', cddm.coefVariacao.toFixed(2).replace('.', ',') + '%'],
                                ['Elementos saneados', `${elementosCddm.filter((e: any) => e.saneado).length} de ${elementosCddm.length}`],
                                ['T de Student', cddm.tStudent.toFixed(3).replace('.', ',')],
                                ['Limite Sup. IC', formatarMoeda(cddm.limiteSuperior)],
                                ['Limite Inf. IC', formatarMoeda(cddm.limiteInferior)],
                              ].map(([lbl, val], idx, arr) => (
                                <div key={lbl} style={{ display: 'flex', borderBottom: idx === arr.length - 1 ? 'none' : '0.5px solid #C9D3E6' }}>
                                  <div style={{ flex: 1.5, padding: '2.5px 5px', fontSize: '7px', color: '#1e293b', borderRight: '0.5px solid #C9D3E6' }}>{lbl}</div>
                                  <div style={{ flex: 1, padding: '2.5px 5px', fontSize: '7px', fontWeight: 700, color: '#2347C6', textAlign: 'right' }}>{val}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Estatísticas e tabela de valores — Comparativo */}
                        {cddm && (() => {
                          const elSan = elementosCddm.filter((e: any) => e.saneado)
                          const vuMedio = cddm.mediaSaneada
                          const vuMin = cddm.limiteInferior
                          const vuMax = cddm.limiteSuperior
                          const vuLim30i = cddm.limiteInf30
                          const vuLim30s = cddm.limiteSup30
                          const area = cddm.avaliando.area
                          const tdC: React.CSSProperties = { padding: '3px 5px', fontSize: '7.5px', border: '0.5px solid #C9D3E6', textAlign: 'center' }
                          const tdCHl: React.CSSProperties = { ...tdC, background: '#EAF0FB', fontWeight: 700, color: '#17325C' }
                          return (
                            <>
                              {/* Estatísticas */}
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 5, margin: '6px 0' }}>
                                {[
                                  ['Desvio padrão', formatarMoeda(cddm.desvioPadrao)],
                                  ['Coef. variação', cddm.coefVariacao.toFixed(2).replace('.',',')+'%'],
                                  ['Grau de precisão', cddm.grauPrecisao || '—'],
                                  ['IC 80%', cddm.intervaloConfianca.toFixed(2).replace('.',',')+'%'],
                                ].map(([l,v]) => (
                                  <div key={l as string} style={{ background: '#EAF0FB', border: '0.5px solid #C9D3E6', borderRadius: 3, padding: '5px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '7px', color: '#5a7090', marginBottom: 2 }}>{l}</div>
                                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#17325C' }}>{v}</div>
                                  </div>
                                ))}
                              </div>
                              {/* Tabela de valores */}
                              <table style={{ width: '100%', borderCollapse: 'collapse', border: '0.5px solid #C9D3E6', marginBottom: 4 }}>
                                <thead>
                                  <tr style={{ background: '#1a3564' }}>
                                    <th style={{ padding: '3px 5px', fontSize: '7px', fontWeight: 700, color: '#fff', borderRight: '0.5px solid #475e9b' }}>Intervalo</th>
                                    <th style={{ padding: '3px 5px', fontSize: '7px', fontWeight: 700, color: '#fff', textAlign: 'center', borderRight: '0.5px solid #475e9b' }}>V.U. (R$/m²)</th>
                                    <th style={{ padding: '3px 5px', fontSize: '7px', fontWeight: 700, color: '#fff', textAlign: 'center' }}>Valor total (R$)</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr><td style={tdC}>Mínimo</td><td style={tdC}>{formatarMoeda(vuMin)}</td><td style={tdC}>{formatarMoeda(vuMin * area)}</td></tr>
                                  <tr><td style={tdCHl}>Médio (adotado)</td><td style={tdCHl}>{formatarMoeda(vuMedio)}</td><td style={tdCHl}>{formatarMoeda(vuMedio * area)}</td></tr>
                                  <tr><td style={tdC}>Máximo</td><td style={tdC}>{formatarMoeda(vuMax)}</td><td style={tdC}>{formatarMoeda(vuMax * area)}</td></tr>
                                  <tr><td style={tdC}>Limite −30%</td><td style={tdC}>{formatarMoeda(vuLim30i)}</td><td style={tdC}>{formatarMoeda(vuLim30i * area)}</td></tr>
                                  <tr><td style={tdC}>Limite +30%</td><td style={tdC}>{formatarMoeda(vuLim30s)}</td><td style={tdC}>{formatarMoeda(vuLim30s * area)}</td></tr>
                                </tbody>
                              </table>
                            </>
                          )
                        })()}
                        <div style={{ marginTop: 4, marginBottom: 2, fontSize: '7px', fontStyle: 'italic', color: '#475569' }}>
                          * Quando a amplitude do intervalo de confiança ultrapassar 50% não há classificação do resultado quanto à precisão e é necessária justificativa com base no diagnóstico do mercado. (ABNT 14653-2 - 2011 - Item 13.4)
                        </div>
                      </>
                    )}

                    {/* Seção de cálculo evolutivo */}
                    {isEvolutivo && evSnap && evSnap.resultado && (() => {
                      const pnEv = (s: any) => { if (!s && s !== 0) return 0; const n = parseFloat(String(s).replace(/[R$\s]/g,'').replace(/\.(?=\d{3})/g,'').replace(',','.')); return isNaN(n) ? 0 : n }
                      const res = evSnap.resultado
                      const elems = evSnap.elementos || []
                      const benfs = (evSnap.benfeitorias || []) as any[]
                      const area = pnEv(evSnap.avaliando?.area)
                      const vuMed = res.media || 0
                      const tdC: React.CSSProperties = { padding: '3px 5px', fontSize: '7.5px', border: '0.5px solid #C9D3E6', textAlign: 'center' }
                      const tdCHl: React.CSSProperties = { ...tdC, background: '#EAF0FB', fontWeight: 700, color: '#17325C' }
                      const thS: React.CSSProperties = { padding: '3px 4px', fontSize: '7px', fontWeight: 700, color: '#fff', textAlign: 'center', borderRight: '0.5px solid #475e9b' }
                      return (
                        <>
                          {/* 8.1 Homogeneização do terreno */}
                          <SecHeader num="8.1" titulo="Homogeneização — terreno" />
                          <table style={{ width: '100%', borderCollapse: 'collapse', border: '0.5px solid #C9D3E6', marginTop: 4 }}>
                            <thead>
                              <tr style={{ background: '#2347C6' }}>
                                <th style={thS}>Elem.</th>
                                <th style={thS}>V.U. (R$/m²)</th>
                                <th style={thS}>F. Local</th>
                                <th style={thS}>F. Topografia</th>
                                <th style={thS}>F. Visibilidade</th>
                                <th style={thS}>F. Acumulado</th>
                                <th style={{ ...thS, borderRight: 'none' }}>V.U. Homog. (R$/m²)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {elems.map((el: any, i: number) => {
                                const nLocalAv = pnEv(evSnap.avaliando?.notaLocal) || 100
                                const nTopoAv  = pnEv(evSnap.avaliando?.notaTopo)  || 100
                                const nVisAv   = pnEv(evSnap.avaliando?.notaVis)   || 100
                                const fLoc  = (pnEv(el.fatorLocal)       || 100) > 0 ? nLocalAv / (pnEv(el.fatorLocal)       || 100) : 1
                                const fTopo = (pnEv(el.fatorTopografia)  || 100) > 0 ? nTopoAv  / (pnEv(el.fatorTopografia)  || 100) : 1
                                const fVis  = (pnEv(el.fatorVisibilidade)|| 100) > 0 ? nVisAv   / (pnEv(el.fatorVisibilidade)|| 100) : 1
                                const fAcum = fLoc * fTopo * fVis
                                const atNum = pnEv(el.areaTerreno)
                                const voNum = pnEv(el.valorOferta)
                                const vuOrig = atNum > 0 ? voNum / atNum : 0
                                const vuH = Math.round(vuOrig * fAcum * 100) / 100
                                const tdS: React.CSSProperties = { padding: '2.5px 3px', fontSize: '7px', border: '0.5px solid #C9D3E6', textAlign: 'center' }
                                return (
                                  <tr key={i}>
                                    <td style={tdS}>{i+1}</td>
                                    <td style={tdS}>{formatarMoeda(vuOrig)}</td>
                                    <td style={tdS}>{fLoc.toFixed(4).replace('.', ',')}</td>
                                    <td style={tdS}>{fTopo.toFixed(4).replace('.', ',')}</td>
                                    <td style={tdS}>{fVis.toFixed(4).replace('.', ',')}</td>
                                    <td style={tdS}>{fAcum.toFixed(4).replace('.', ',')}</td>
                                    <td style={{ ...tdS, borderRight: 'none', fontWeight: 700, color: '#17325C' }}>{formatarMoeda(vuH)}</td>
                                  </tr>
                                )
                              })}
                              <tr style={{ background: '#EAF0FB' }}>
                                <td colSpan={6} style={{ padding: '3px 5px', fontSize: '7px', fontWeight: 700, color: '#17325C', textAlign: 'right', border: '0.5px solid #C9D3E6' }}>Média das amostras</td>
                                <td style={{ padding: '3px 5px', fontSize: '7.5px', fontWeight: 700, color: '#17325C', textAlign: 'center', border: '0.5px solid #C9D3E6' }}>{formatarMoeda(vuMed)}</td>
                              </tr>
                            </tbody>
                          </table>
                          {/* Estatísticas */}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 5, margin: '6px 0' }}>
                            {([
                              ['Desvio padrão', res.desvio != null ? formatarMoeda(res.desvio) : '—'],
                              ['Coef. variação', res.desvio != null && vuMed > 0 ? ((res.desvio/vuMed)*100).toFixed(2).replace('.',',')+'%' : '—'],
                              ['Grau de precisão', res.grauPrecisao || '—'],
                              ['IC 80%', res.intervaloConfianca != null ? res.intervaloConfianca.toFixed(2).replace('.',',')+'%' : '—'],
                            ] as [string,string][]).map(([l,v]) => (
                              <div key={l} style={{ background: '#EAF0FB', border: '0.5px solid #C9D3E6', borderRadius: 3, padding: '5px', textAlign: 'center' }}>
                                <div style={{ fontSize: '7px', color: '#5a7090', marginBottom: 2 }}>{l}</div>
                                <div style={{ fontSize: '11px', fontWeight: 700, color: '#17325C' }}>{v}</div>
                              </div>
                            ))}
                          </div>
                          {/* Tabela de valores */}
                          <table style={{ width: '100%', borderCollapse: 'collapse', border: '0.5px solid #C9D3E6', marginBottom: 4 }}>
                            <thead>
                              <tr style={{ background: '#1a3564' }}>
                                <th style={{ padding: '3px 5px', fontSize: '7px', fontWeight: 700, color: '#fff', textAlign: 'left', borderRight: '0.5px solid #475e9b' }}>Intervalo</th>
                                <th style={{ padding: '3px 5px', fontSize: '7px', fontWeight: 700, color: '#fff', textAlign: 'center', borderRight: '0.5px solid #475e9b' }}>V.U. (R$/m²)</th>
                                <th style={{ padding: '3px 5px', fontSize: '7px', fontWeight: 700, color: '#fff', textAlign: 'center' }}>Valor total (R$)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {([
                                ['Mínimo',          res.minimo||0,    false],
                                ['Médio (adotado)',  vuMed,            true],
                                ['Máximo',          res.maximo||0,    false],
                                ['Limite −30%',     res.lim30inf||0,  false],
                                ['Limite +30%',     res.lim30sup||0,  false],
                              ] as [string,number,boolean][]).map(([lbl,vu,hl]) => (
                                <tr key={lbl} style={hl ? { background: '#EAF0FB' } : {}}>
                                  <td style={{ ...tdC, textAlign: 'left', fontWeight: hl?700:400, color: hl?'#17325C':'#1e293b' }}>{lbl}</td>
                                  <td style={{ ...tdC, fontWeight: hl?700:400, color: hl?'#17325C':'#1e293b' }}>{formatarMoeda(vu)}</td>
                                  <td style={{ ...tdC, fontWeight: hl?700:400, color: hl?'#17325C':'#1e293b' }}>{formatarMoeda(vu * area)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {/* 8.2 VEIU */}
                          {benfs.length > 0 && (
                            <>
                              <SecHeader num="8.2" titulo="Valor das Edificações — CUB R8N Depreciado (VEIU)" />
                              <div style={{ overflowX: 'auto', marginTop: 4 }}>
                                <table style={{ width: '100%', minWidth: 700, borderCollapse: 'collapse', border: '0.5px solid #C9D3E6', fontSize: '7px' }}>
                                  <thead>
                                    <tr style={{ background: '#2347C6' }}>
                                      {(['Descrição','Padrão','CUB R8N','Pc','Ac (m²)','Ir','R','Ie','%v','Ka','Estado','Ec','K','Foc','Vb (R$)'] as string[]).map((h,i,a) => (
                                        <th key={h} style={{ padding: '3px 4px', fontSize: '7px', fontWeight: 700, color: '#fff', textAlign: i<2?'left':'center', borderRight: i<a.length-1?'0.5px solid #475e9b':'none', whiteSpace: 'nowrap' }}>{h}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {benfs.map((b: any, i: number) => {
                                      const cubVal = pnEv(b.cub)
                                      const acVal  = pnEv(b.area)
                                      const ieVal  = pnEv(b.idadeReal)
                                      const tdB: React.CSSProperties = { padding: '2.5px 4px', fontSize: '6.5px', border: '0.5px solid #C9D3E6', textAlign: 'center', whiteSpace: 'nowrap' }
                                      return (
                                        <tr key={i} style={{ background: i%2===0?'#fff':'#f8fafc' }}>
                                          <td style={{ ...tdB, textAlign: 'left', maxWidth: 120 }}>{b.descricao || `Benfeitoria ${i+1}`}</td>
                                          <td style={{ ...tdB, textAlign: 'left' }}>{b.padrao || '—'}</td>
                                          <td style={tdB}>{cubVal > 0 ? formatarMoeda(cubVal) : '—'}</td>
                                          <td style={tdB}>{b.Pc?.toFixed(3).replace('.', ',') || '—'}</td>
                                          <td style={tdB}>{acVal > 0 ? acVal.toLocaleString('pt-BR') : '—'}</td>
                                          <td style={tdB}>{b.Ir || '—'}</td>
                                          <td style={tdB}>{b.R != null ? (b.R*100).toFixed(0).replace('.', ',')+'%' : '—'}</td>
                                          <td style={tdB}>{ieVal > 0 ? ieVal : '—'}</td>
                                          <td style={tdB}>{b.pctVida != null ? b.pctVida.toFixed(1).replace('.', ',')+'%' : '—'}</td>
                                          <td style={tdB}>{b.Ka?.toFixed(3).replace('.', ',') || '—'}</td>
                                          <td style={tdB}>{b.estadoConservacao || '—'}</td>
                                          <td style={tdB}>{b.Ec != null ? (b.Ec*100).toFixed(2).replace('.', ',')+'%' : '—'}</td>
                                          <td style={tdB}>{b.K?.toFixed(3).replace('.', ',') || '—'}</td>
                                          <td style={tdB}>{b.Foc?.toFixed(4).replace('.', ',') || '—'}</td>
                                          <td style={{ ...tdB, fontWeight: 700, color: '#17325C', borderRight: 'none' }}>{formatarMoeda(b.valor || 0)}</td>
                                        </tr>
                                      )
                                    })}
                                    <tr style={{ background: '#1a3564' }}>
                                      <td colSpan={14} style={{ padding: '3px 5px', fontSize: '7px', fontWeight: 700, color: '#fff', textAlign: 'right', border: '0.5px solid #333' }}>Total das edificações</td>
                                      <td style={{ padding: '3px 5px', fontSize: '7.5px', fontWeight: 700, color: '#fff', textAlign: 'center', border: '0.5px solid #333' }}>{formatarMoeda(evSnap.valorBenfeitorias || 0)}</td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                            </>
                          )}

                        </>
                      )
                    })()}

                    {/* 9/10 — Valor final */}
                    <SecHeader num={isEvolutivo ? '9' : '9'} titulo="Valor Final da Avaliação" />
                    {isEvolutivo && evSnap && evSnap.resultado ? (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 6, margin: '6px 0' }}>
                        <div style={{ border: '0.5px solid #C9D3E6', borderRadius: 3, padding: '8px', textAlign: 'center' }}>
                          <div style={{ fontSize: '7px', color: '#5a7090', marginBottom: 3 }}>Valor do terreno</div>
                          <div style={{ fontSize: '11px', fontWeight: 700, color: '#17325C' }}>{formatarMoeda(evSnap.valorTerreno||0)}</div>
                          <div style={{ fontSize: '7px', color: '#94a3b8', marginTop: 2 }}>{(evSnap.avaliando?.area||0).toLocaleString('pt-BR')} m² × {formatarMoeda(evSnap.resultado?.media||0)}/m²</div>
                        </div>
                        <div style={{ border: '0.5px solid #C9D3E6', borderRadius: 3, padding: '8px', textAlign: 'center' }}>
                          <div style={{ fontSize: '7px', color: '#5a7090', marginBottom: 3 }}>Valor das edificações</div>
                          <div style={{ fontSize: '11px', fontWeight: 700, color: '#17325C' }}>{formatarMoeda(evSnap.valorBenfeitorias||0)}</div>
                          <div style={{ fontSize: '7px', color: '#94a3b8', marginTop: 2 }}>VEIU — CUB R8N depreciado</div>
                        </div>
                      </div>
                    ) : temCddm && cddm ? (
                      <table style={{ width: '100%', borderCollapse: 'collapse', border: '0.5px solid #C9D3E6', marginTop: '4px', marginBottom: '4px' }}>
                        <thead>
                          <tr>
                            <TH style={{ textAlign: 'center', width: '33%' }}>Área</TH>
                            <TH style={{ textAlign: 'center', width: '33%' }}>Valor/m²</TH>
                            <TH style={{ textAlign: 'center' }}>Valor Total</TH>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td style={{ border: '0.5px solid #C9D3E6', padding: '4px 6px', fontSize: '8px', textAlign: 'center' }}>{cddm.avaliando.area.toLocaleString('pt-BR')} m²</td>
                            <td style={{ border: '0.5px solid #C9D3E6', padding: '4px 6px', fontSize: '8px', textAlign: 'center' }}>{formatarMoeda(cddm.mediaSaneada)}</td>
                            <td style={{ border: '0.5px solid #C9D3E6', padding: '4px 6px', fontSize: '8.5px', textAlign: 'center', fontWeight: 700, color: '#17325C' }}>{formatarMoeda(cddm.valorImovel)}</td>
                          </tr>
                        </tbody>
                      </table>
                    ) : null}
                    <div style={{ display: 'flex', gap: '6px', margin: '6px 0 4px' }}>
                      <div style={{ flex: 1, background: '#17325C', padding: '8px 10px', borderRadius: '3px' }}>
                        <div style={{ fontSize: '7.5px', color: '#8FA4C7', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>VALOR DA AVALIAÇÃO</div>
                        <div style={{ fontSize: '16px', fontWeight: 700, color: '#fff', margin: '3px 0 1px' }}>{formatarMoeda(vlFinal)}</div>
                        <div style={{ fontSize: '8px', color: '#8FA4C7' }}>({numeroPorExtenso(vlFinal).charAt(0).toUpperCase() + numeroPorExtenso(vlFinal).slice(1)})</div>
                      </div>
                      {vlf > 0 && (
                        <div style={{ flex: 1, background: '#EAF0FB', border: '0.5px solid #C9D3E6', padding: '8px 10px', borderRadius: '3px' }}>
                          <div style={{ fontSize: '7.5px', color: '#2347C6', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>VALOR DE LIQUIDEZ FORÇADA</div>
                          <div style={{ fontSize: '16px', fontWeight: 700, color: '#17325C', margin: '3px 0 1px' }}>{formatarMoeda(vlf)}</div>
                          <div style={{ fontSize: '8px', color: '#5a7090' }}>({numeroPorExtenso(vlf).charAt(0).toUpperCase() + numeroPorExtenso(vlf).slice(1)})</div>
                        </div>
                      )}
                    </div>

                    {/* 11 — Graus */}
                    <SecHeader num="10" titulo="Grau de Fundamentação e Precisão" />
                    <div style={{ display: 'flex', gap: '6px', margin: '4px 0 6px' }}>
                      {[
                        { label: 'Grau de Fundamentação', valor: capaGrauFund },
                        { label: 'Grau de Precisão',      valor: capaGrauPrec },
                        { label: 'Metodologia aplicada',  valor: capaMetodologia },
                      ].map(({ label, valor }) => (
                        <div key={label} style={{ flex: 1, border: '0.5px solid #C9D3E6' }}>
                          <div style={{ background: '#EAF0FB', padding: '3px 6px', fontSize: '7.5px', fontWeight: 700, color: '#17325C', textAlign: 'center' }}>{label}</div>
                          <div style={{ padding: '8px 4px', textAlign: 'center', fontSize: '20px', fontWeight: 700, color: '#2347C6' }}>{valor}</div>
                        </div>
                      ))}
                    </div>

                    {/* 11.1 — Tabela detalhada de Fundamentação (sempre visível) */}
                    {(() => {
                      const fund = (dados.fundamentacao || []) as any[]
                      const itensPadrao = [
                        { id: '01', desc: 'Caracterização do imóvel avaliando', g3: 'Completa quanto a todos os fatores analisados', g2: 'Completa quanto aos fatores utilizados no tratamento', g1: 'Adoção de situação paradigma' },
                        { id: '02', desc: 'Quantidade mínima de dados de mercado efetivamente utilizados', g3: '12', g2: '5', g1: '3' },
                        { id: '03', desc: 'Identificação dos dados de mercado', g3: 'Informações de todas as características com foto e características observadas pelo autor do laudo', g2: 'Informações relativas a todas as características dos dados analisados', g1: 'Informações relativas às características dos fatores utilizados' },
                        { id: '04', desc: 'Intervalo admissível de ajuste para o conjunto de fatores', g3: '0,80 a 1,25', g2: '0,50 a 2,00', g1: '0,40 a 2,50' },
                      ]
                      const somaPts = fund.reduce((acc: number, f: any) => acc + (f?.pontos || 0), 0)
                      const grauFinal = somaPts >= 10 ? 'III' : somaPts >= 6 ? 'II' : somaPts >= 4 ? 'I' : '-'
                      const thBase: React.CSSProperties = { fontSize: '7px', fontWeight: 700, color: '#fff', textAlign: 'center', padding: '3px 4px', borderRight: '0.5px solid #475e9b' }
                      const tdBase: React.CSSProperties = { fontSize: '7px', padding: '3px 4px', textAlign: 'center', borderRight: '0.5px solid #C9D3E6', lineHeight: 1.3, verticalAlign: 'middle' }
                      const tdActive: React.CSSProperties = { ...tdBase, background: '#dbeafe', color: '#1a3564', fontWeight: 700 }
                      const tdPts: React.CSSProperties = { width: '7%', fontSize: '8px', fontWeight: 700, color: '#1a3564', textAlign: 'center', padding: '3px 4px', background: '#EAF0FB', borderRight: 'none' }
                      return (
                        <>
                          <SecHeader num="10.1" titulo="Grau de Fundamentação — Tratamento por Fatores" />
                          <table style={{ width: '100%', borderCollapse: 'collapse', border: '0.5px solid #C9D3E6', fontSize: '7px', marginTop: '4px' }}>
                            <thead>
                              <tr style={{ background: '#1a3564' }}>
                                <th style={{ ...thBase, width: '4%' }}>Item</th>
                                <th style={{ ...thBase, width: '22%', textAlign: 'left', padding: '3px 5px' }}>Descrição</th>
                                <th style={{ ...thBase, width: '21%' }}>Grau III</th>
                                <th style={{ ...thBase, width: '21%' }}>Grau II</th>
                                <th style={{ ...thBase, width: '21%' }}>Grau I</th>
                                <th style={{ ...thBase, width: '7%', borderRight: 'none' }}>Pontos obtidos</th>
                              </tr>
                            </thead>
                            <tbody>
                              {itensPadrao.map((it, idx) => {
                                const grauAtual = fund[idx]?.grau || ''
                                const pts = fund[idx]?.pontos ?? '-'
                                return (
                                  <tr key={it.id} style={{ borderTop: '0.5px solid #C9D3E6' }}>
                                    <td style={{ ...tdBase, width: '4%' }}>{it.id}</td>
                                    <td style={{ ...tdBase, textAlign: 'left', padding: '3px 5px' }}>{it.desc}</td>
                                    <td style={grauAtual === 'III' ? tdActive : tdBase}>{it.g3}</td>
                                    <td style={grauAtual === 'II' ? tdActive : tdBase}>{it.g2}</td>
                                    <td style={grauAtual === 'I' ? { ...tdActive, borderRight: '0.5px solid #C9D3E6' } : { ...tdBase }}>{it.g1}</td>
                                    <td style={tdPts}>{pts}</td>
                                  </tr>
                                )
                              })}
                              {/* Pontos mínimos + itens obrigatórios */}
                              <tr style={{ borderTop: '0.5px solid #C9D3E6', background: '#EAF0FB' }}>
                                <td colSpan={1} style={{ fontSize: '7px', fontWeight: 700, color: '#1a3564', padding: '3px 5px', borderRight: '0.5px solid #C9D3E6' }}>Pontos mínimos</td>
                                <td style={{ fontSize: '7px', padding: '3px 5px', borderRight: '0.5px solid #C9D3E6' }}> </td>
                                <td style={{ ...tdBase, fontWeight: 700, color: '#1a3564', background: '#EAF0FB' }}>10</td>
                                <td style={{ ...tdBase, fontWeight: 700, color: '#1a3564', background: '#EAF0FB' }}>6</td>
                                <td style={{ ...tdBase, fontWeight: 700, color: '#1a3564', background: '#EAF0FB' }}>4</td>
                                <td style={{ ...tdPts }}>—</td>
                              </tr>
                              <tr style={{ borderTop: '0.5px solid #C9D3E6', background: '#EAF0FB' }}>
                                <td colSpan={1} style={{ fontSize: '7px', fontWeight: 700, color: '#1a3564', padding: '3px 5px', borderRight: '0.5px solid #C9D3E6' }}>Itens obrigatórios</td>
                                <td style={{ fontSize: '7px', padding: '3px 5px', borderRight: '0.5px solid #C9D3E6' }}> </td>
                                <td style={{ fontSize: '6.5px', padding: '3px 4px', textAlign: 'center', borderRight: '0.5px solid #C9D3E6', lineHeight: 1.3 }}>2 e 4 no grau III, demais mín. grau II</td>
                                <td style={{ fontSize: '6.5px', padding: '3px 4px', textAlign: 'center', borderRight: '0.5px solid #C9D3E6', lineHeight: 1.3 }}>2 e 4 mín. grau II, demais mín. grau I</td>
                                <td style={{ fontSize: '6.5px', padding: '3px 4px', textAlign: 'center', borderRight: '0.5px solid #C9D3E6', lineHeight: 1.3 }}>Todos mín. grau I</td>
                                <td style={{ ...tdPts }}>—</td>
                              </tr>
                              {/* Somatória */}
                              <tr style={{ background: '#1a3564', borderTop: '0.5px solid #475e9b' }}>
                                <td colSpan={5} style={{ fontSize: '7px', fontWeight: 700, color: '#fff', textAlign: 'right', padding: '3px 8px', borderRight: '0.5px solid #475e9b' }}>Somatória de pontos</td>
                                <td style={{ fontSize: '10px', fontWeight: 700, color: '#fff', textAlign: 'center', padding: '2px 4px' }}>{somaPts}</td>
                              </tr>
                              {/* Grau obtido */}
                              <tr style={{ background: '#2347C6', borderTop: '0.5px solid #3a57d0' }}>
                                <td colSpan={5} style={{ fontSize: '7px', fontWeight: 700, color: '#fff', textAlign: 'right', padding: '3px 8px', borderRight: '0.5px solid #3a57d0' }}>Grau de fundamentação obtido</td>
                                <td style={{ fontSize: '11px', fontWeight: 700, color: '#fff', textAlign: 'center', padding: '2px 4px' }}>{grauFinal}</td>
                              </tr>
                            </tbody>
                          </table>
                          <div style={{ marginTop: '3px', fontSize: '7px', fontStyle: 'italic', color: '#475569' }}>
                            Para menos de 5 dados de mercado, o intervalo admissível de ajuste é de 0,80 a 1,25. (ABNT NBR 14653-2:2011)
                          </div>

                          <SecHeader num="10.2" titulo="Grau de Precisão — Tratamento por Fatores" />
                          <table style={{ width: '100%', borderCollapse: 'collapse', border: '0.5px solid #C9D3E6', fontSize: '7px', marginTop: '4px' }}>
                            <thead>
                              <tr style={{ background: '#1a3564' }}>
                                <th style={{ ...thBase, width: '8%' }}>Grau</th>
                                <th style={{ ...thBase, textAlign: 'left', padding: '3px 5px' }}>Amplitude do intervalo de confiança de 80% em torno da estimativa de tendência central</th>
                                <th style={{ ...thBase, width: '14%', borderRight: 'none' }}>Resultado obtido</th>
                              </tr>
                            </thead>
                            <tbody>
                              {([
                                { grau: 'III', limite: '≤ 30%' },
                                { grau: 'II',  limite: '≤ 40%' },
                                { grau: 'I',   limite: '≤ 50%' },
                              ] as const).map(({ grau, limite }) => {
                                const isOk = capaGrauPrec === grau
                                const ic = cddm ? `${cddm.intervaloConfianca.toFixed(2).replace('.', ',')}%` : '-'
                                return (
                                  <tr key={grau} style={{ borderTop: '0.5px solid #C9D3E6' }}>
                                    <td style={{ fontWeight: 700, color: '#1a3564', textAlign: 'center', padding: '3px 4px', borderRight: '0.5px solid #C9D3E6' }}>{grau}</td>
                                    <td style={{ padding: '3px 5px', borderRight: '0.5px solid #C9D3E6' }}>{limite}</td>
                                    <td style={isOk ? { ...tdActive, borderRight: 'none' } : { ...tdBase, borderRight: 'none' }}>{isOk ? `${ic} ✓` : '—'}</td>
                                  </tr>
                                )
                              })}
                              <tr style={{ background: '#2347C6', borderTop: '0.5px solid #3a57d0' }}>
                                <td colSpan={2} style={{ fontSize: '7px', fontWeight: 700, color: '#fff', textAlign: 'right', padding: '3px 8px', borderRight: '0.5px solid #3a57d0' }}>Grau de precisão obtido</td>
                                <td style={{ fontSize: '9px', fontWeight: 700, color: '#fff', textAlign: 'center', padding: '2px 4px' }}>{capaGrauPrec !== '-' ? `Precisão ${capaGrauPrec}` : '-'}</td>
                              </tr>
                            </tbody>
                          </table>
                          <div style={{ marginTop: '3px', fontSize: '7px', fontStyle: 'italic', color: '#475569' }}>
                            * Quando a amplitude ultrapassar 50%, não há classificação quanto à precisão e é necessária justificativa. (ABNT NBR 14653-2:2011 — item 13.4)
                          </div>
                        </>
                      )
                    })()}

                    {/* 12 — Conclusão + Assinatura */}
                    <SecHeader num="11" titulo="Considerações Finais" />
                    <div style={{ border: '0.5px solid #C9D3E6', padding: '8px', fontSize: '8.5px', lineHeight: '1.55', color: '#1e293b', marginTop: '4px' }}>
                      <strong style={{ color: '#17325C' }}>INFORMAÇÕES FINAIS</strong>
                      <div style={{ marginTop: '4px' }}>
                        Avaliação para determinação do valor de mercado do imóvel localizado em {dados.endereco},
                        feita pelo {metLabel}. O presente laudo se enquadra no Grau de Fundamentação {capaGrauFund} e
                        Grau de Precisão {capaGrauPrec}, atendendo à Norma ABNT NBR 14.653.
                      </div>
                      <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ width: '180px', height: '0.5px', background: '#334155', marginBottom: '4px' }} />
                        <div style={{ fontSize: '9px', fontWeight: 700, color: '#17325C' }}>{dados.responsavelNome || 'Responsável Técnico'}</div>
                        {dados.responsavelRegistro && <div style={{ fontSize: '8px', color: '#475569' }}>CREA/CAU: {dados.responsavelRegistro}</div>}
                        <div style={{ fontSize: '8px', color: '#475569' }}>Lesath Engenharia – CNPJ: 49.068.717/0001-64</div>
                        {dados.dataLaudo && (
                          <div style={{ fontSize: '8px', color: '#475569', marginTop: '4px' }}>{capaDataImpressao}.</div>
                        )}
                      </div>
                    </div>
                    <DocFooter pag="3" />
                  </Pagina>

                  {/* ─── PÁGINAS DE FOTOS ─────────────────────────────── */}
                  {fotosAnexo.length > 0 && chunkArray(fotosAnexo, 6).map((grupo: any[], pageIdx: number) => (
                    <Pagina key={`fotos-simpl-${pageIdx}`} pagina={proximaPagina()} dataLaudo={dados.dataLaudo}>
                      <DocHeader />
                      <div style={{ background: '#2347C6', padding: '4px 12px', margin: '8px 0 8px' }}>
                        <span style={{ fontSize: '9px', fontWeight: 700, color: '#fff' }}>ANEXO A | DOCUMENTAÇÃO FOTOGRÁFICA</span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {grupo.map((foto: any, i: number) => (
                          <div key={i} style={{ width: 'calc(50% - 3px)' }}>
                            <img src={foto.preview} alt={foto.legenda || ''} style={{ width: '100%', height: '110px', objectFit: 'cover', border: '0.5px solid #C9D3E6', display: 'block' }} />
                            <div style={{ background: '#EAF0FB', padding: '2px 5px', fontSize: '8px', color: '#17325C', border: '0.5px solid #C9D3E6', borderTop: 'none' }}>
                              {foto.legenda || `Foto ${pageIdx * 6 + i + 1}`}
                            </div>
                          </div>
                        ))}
                      </div>
                      <DocFooter pag={String(4 + pageIdx)} />
                    </Pagina>
                  ))}
                </>
              )
            })()}

            {/* ══════════════════════════════════════════════
                LAYOUT DETALHADO (apenas para laudos detalhados)
            ══════════════════════════════════════════════ */}
          </div>
        </div>
      </section>
    </AppShell>
  )
}

export default function VisualizarLaudoPage() {
  return (
    <Suspense fallback={null}>
      <VisualizarLaudoContent />
    </Suspense>
  )
}
