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
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
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

  async function baixarLaudoPdf() {
    if (!dados) return
    setBaixandoPdf(true)
    try {
      const [{ pdf }, { LaudoPdf }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('../LaudoPdf'),
      ])
      const logoUrl = window.location.origin + '/logo-lesath.png'

      // Pré-renderiza PDFs anexados como imagens para embed no PDF gerado
      const [documentacaoPdfPaginas] = await Promise.all([
        dados.documentacaoPdf ? pdfPagesToImages(dados.documentacaoPdf) : Promise.resolve([]),
      ])

      const dadosComPaginas = {
        ...dados,
        documentacaoPdfPaginas,
      }

      const blob = await pdf(
        React.createElement(LaudoPdf, { dados: dadosComPaginas, logoUrl }) as any
      ).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `laudo-${dados.matricula || 'avaliacao'}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error(error)
      alert('Erro ao gerar o PDF do laudo.')
    } finally {
      setBaixandoPdf(false)
    }
  }


  useEffect(() => {
    async function carregarLaudo() {
      try {
        // Prioriza o ID passado na URL (?id=...), fallback para localStorage
        const urlParams = new URL(window.location.href)
        const idParam = urlParams.searchParams.get('id')
        const parsed = (idParam
          ? await buscarLaudo(idParam)
          : await obterLaudoAtual()) as DadosLaudo
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
          const [docPdf, locComp, imgBenf] = await Promise.all([
            resolverRef(parsed.documentacaoPdf || ''),
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
            <h1 className="text-2xl font-bold mb-4">Nenhum laudo encontrado</h1>
            <div className="flex gap-3 justify-center">
              <Link href="/meus-laudos" className="border px-4 py-2 rounded-xl">Meus laudos</Link>
              <Link href="/novo-laudo" className="bg-green-600 text-white px-4 py-2 rounded-xl">Novo laudo</Link>
            </div>
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
  // ── Dados CDDM/Evolutivo inline ─────────────────────────────────────
  const cddm = (dados as any).dadosCalculoCDDM as any | undefined
  const ev = (dados as any).dadosCalculoEvolutivo as any | undefined
  const isEvolutivo = dados.metodoAvaliacao === 'evolutivo'
  const elementosCddm: any[] = cddm?.elementos || []
  const elementosEv: any[] = ev?.elementos || []
  const elementosExibir: any[] = isEvolutivo ? elementosEv : elementosCddm
  const temCddm = elementosCddm.length > 0
  const temElementos = elementosExibir.length > 0

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
                  laudoId ? `/novo-laudo?id=${laudoId}` : '/novo-laudo'
                }
                className="bg-blue-50 px-3 py-2 rounded-xl text-blue-700"
              >
                Editar laudo
              </Link>
              <button
                type="button"
                onClick={baixarLaudoPdf}
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

            {/* Laudo detalhado */}
            <>
            <Pagina pagina={proximaPagina()} dataLaudo={dados.dataLaudo}>
              {/* Cabeçalho geométrico — faixas diagonais via skewX, igual ao layout aprovado */}
              <div className="capa-geo-header relative overflow-hidden bg-[#17325C]" style={{ height: '130px' }}>
                <div className="absolute" style={{ top: '-10px', right: '11.54%', width: '50%',    height: '180px', background: '#1e4a85',              transform: 'skewX(-18deg)' }} />
                <div className="absolute" style={{ top: '-10px', right: '1.92%',  width: '28.85%', height: '180px', background: '#2347C6', opacity: 0.55, transform: 'skewX(-18deg)' }} />
                <div className="absolute" style={{ top: '0',     right: '34.62%', width: '17.31%', height: '180px', background: '#2e5ea3', opacity: 0.6,  transform: 'skewX(-18deg)' }} />
                <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#2347C6]" />
                <div className="absolute z-10" style={{ top: '18px', left: '28px' }}>
                  <div className="font-bold text-[15px] leading-tight" style={{ color: '#ffffff' }}>Lesath Engenharia</div>
                  <div className="text-[9px] mt-0.5 tracking-wide" style={{ color: '#b8cce4' }}>Precisão técnica que gera confiança</div>
                </div>
              </div>

              {/* Corpo — sem px em tela (o padding vem do laudo-conteudo); px-10 ativa só na impressão */}
              <div className="pt-14 pb-12 print:px-10">
                <div className="text-[9px] font-bold tracking-[0.18em] text-[#8FA4C7] mb-7">NBR 14653</div>
                <h2
                  className="font-bold text-[#17325C] leading-[1.1] mb-2 titulo-laudo"
                  style={{ fontSize: '38px', whiteSpace: 'pre-line' }}
                >
                  {'Laudo de\nAvaliação'}
                </h2>
                <div className="text-[13px] font-bold text-[#2347C6] tracking-wide mb-12">
                  {dados.finalidade === 'garantia'
                    ? 'Avaliação para fins de garantia'
                    : dados.finalidade === 'execucao'
                    ? 'Avaliação para fins de execução'
                    : dados.finalidade || 'Avaliação'}
                </div>

                <div className="text-[8px] font-bold tracking-[0.18em] text-[#8FA4C7] mb-1.5">LOCALIZAÇÃO DO IMÓVEL</div>
                <div className="text-[13px] font-bold text-[#17325C]">{extrairCidadeDoEndereco(dados.endereco, dados.cidadePrincipal)}</div>

                <div className="w-8 h-[3px] bg-[#2347C6] mt-6 mb-7 rounded-full" />

                <div className="grid grid-cols-2 gap-x-10 gap-y-6">
                  {[
                    { lbl: 'PROPRIETÁRIO',        val: dados.proprietario || '-' },
                    { lbl: 'SOLICITANTE',          val: dados.solicitante || 'Não informado' },
                    { lbl: 'FINALIDADE',           val: dados.finalidade === 'garantia' ? 'Avaliação para fins de garantia' : dados.finalidade === 'execucao' ? 'Avaliação para fins de execução' : dados.finalidade || '-' },
                    { lbl: 'MATRÍCULA',            val: dados.matricula || '-' },
                    { lbl: 'RESPONSÁVEL TÉCNICO',  val: dados.responsavelNome || '-' },
                    { lbl: 'DATA DO LAUDO',        val: formatarData(dados.dataLaudo || '') },
                  ].map((item, i) => (
                    <div key={i}>
                      <div className="text-[8px] font-bold tracking-[0.16em] text-[#8FA4C7] mb-1">{item.lbl}</div>
                      <div className="text-[11.5px] text-slate-800">{item.val}</div>
                    </div>
                  ))}
                </div>
              </div>
            </Pagina>

            {/* ══ CAPA RESUMO ══════════════════════════════════════ */}
            <div className="mt-10 mb-2 h-[1px] bg-[#C9D3E6]" />
            <Pagina pagina={proximaPagina()} dataLaudo={dados.dataLaudo}>
              {/* Barra superior */}
              <div className="cr-bar flex overflow-hidden" style={{ height: '8px', background: '#17325C' }}>
                <div style={{ flex: 1 }} />
                <div style={{ width: '45%', background: '#2347C6' }} />
              </div>
              {/* Cabeçalho */}
              <div className="cr-bar flex justify-between items-start gap-4 px-6 py-3" style={{ background: '#17325C' }}>
                <div>
                  <div style={{ fontSize: '7px', fontWeight: 700, color: '#8FA4C7', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: '2px' }}>NBR 14653</div>
                  <div style={{ fontSize: '17px', fontWeight: 700, color: '#ffffff', lineHeight: 1.1 }}>Capa Resumo</div>
                  <div style={{ fontSize: '8px', color: '#b8cce4', marginTop: '2px' }}>Laudo de Avaliação — {extrairCidadeDoEndereco(dados.endereco, dados.cidadePrincipal) || 'Joinville'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ display: 'inline-block', fontSize: '7px', fontWeight: 700, letterSpacing: '0.14em', padding: '3px 8px', borderRadius: '3px', marginBottom: '4px', background: '#1a3a6e', color: '#b8cce4' }}>LAUDO DE AVALIAÇÃO</div>
                  <div style={{ fontSize: '9.5px', fontWeight: 700, color: '#ffffff' }}>Lesath Engenharia</div>
                  <div style={{ fontSize: '7.5px', color: '#8FA4C7', marginTop: '1px' }}>Precisão técnica que gera confiança</div>
                </div>
              </div>
              {/* Barra de endereço */}
              <div className="cr-bar flex items-center gap-2 px-6 py-1.5" style={{ background: '#2347C6' }}>
                <span style={{ fontSize: '6.5px', fontWeight: 700, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.12em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Endereço</span>
                <span style={{ fontSize: '9px', fontWeight: 700, color: '#ffffff' }}>{dados.endereco}</span>
              </div>
              {/* Corpo */}
              <div className="pt-3 pb-4">
                {/* Grid: Fachada + Identificação */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="rounded overflow-hidden" style={{ border: '1px solid #d0daea' }}>
                    <div className="px-2 py-1" style={{ background: '#17325C' }}>
                      <span style={{ fontSize: '7px', fontWeight: 700, color: '#ffffff', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Fachada do Imóvel</span>
                    </div>
                    {fotoFachada ? (
                      <img src={fotoFachada.preview} alt="Fachada" className="w-full object-cover" style={{ height: '114px' }} />
                    ) : (
                      <div className="flex items-center justify-center" style={{ height: '114px', background: '#c9d8e8', color: '#6b87a8', fontSize: '8px' }}>
                        Foto da fachada do imóvel avaliando
                      </div>
                    )}
                  </div>
                  <div className="rounded overflow-hidden" style={{ border: '1px solid #d0daea' }}>
                    <div className="px-2 py-1" style={{ background: '#17325C' }}>
                      <span style={{ fontSize: '7px', fontWeight: 700, color: '#ffffff', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Identificação</span>
                    </div>
                    <table className="w-full" style={{ borderCollapse: 'collapse', fontSize: '7.5px' }}>
                      <tbody>
                        {([
                          ['Objetivo',      'Determinação de Valor de Mercado'],
                          ['Finalidade',    capaFinalidade],
                          ['Solicitante',   dados.solicitante || '-'],
                          ['Proprietário',  dados.proprietario || '-'],
                          ['Tipo do Imóvel',dados.tipo || '-'],
                          ['Metodologia',   capaMetodologia],
                          ['Matrícula',     dados.matricula || '-'],
                        ] as [string, string][]).map(([label, value], idx) => (
                          <tr key={idx} style={{ background: idx % 2 === 0 ? '#f5f8fc' : '#ffffff', borderBottom: '0.5px solid #e8eef7' }}>
                            <td style={{ width: '38%', padding: '3px 8px', fontWeight: 700, color: '#3a5070' }}>{label}</td>
                            <td style={{ padding: '3px 8px', color: '#17325C' }}>{value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                {/* Strip de áreas */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {([
                    { label: 'ÁREA DE TERRENO',     value: formatarArea(dados.areaTerrenoTotal) || '-', unit: '' },
                    { label: 'ÁREA CONSTRUÍDA',     value: formatarArea(dados.areaConstruidaTotal) || '0', unit: '' },
                    { label: 'FATOR DE LIQUIDAÇÃO FORÇADA', value: capaFatorLiquidacao,              unit: capaLiquidezDisplay },
                  ] as { label: string; value: string; unit: string }[]).map((card, idx) => (
                    <div key={idx} className="rounded text-center px-3 py-2" style={{ border: '1px solid #d0daea', background: '#f5f8fc' }}>
                      <div style={{ fontSize: '6px', fontWeight: 700, color: '#8FA4C7', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2px' }}>{card.label}</div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#17325C' }}>{card.value}</div>
                      <div style={{ fontSize: '7.5px', color: '#5a7090', marginTop: '1px' }}>{card.unit}</div>
                    </div>
                  ))}
                </div>
                {/* Cards de valores */}
                <div className="grid grid-cols-2 gap-2.5 mb-3">
                  <div className="value-box-dark">
                    <div className="vb-label">Valor de Avaliação</div>
                    <div className="vb-num">{formatarMoeda(valorArredondadoLaudo)}</div>
                    <div className="vb-ext">{valorArredondadoExtenso.charAt(0).toUpperCase() + valorArredondadoExtenso.slice(1)}</div>
                  </div>
                  <div className="value-box-light">
                    <div className="vb-label">Valor de Liquidez Forçada</div>
                    {valorLiquidezForcadaNumero > 0 ? (
                      <>
                        <div className="vb-num">{formatarMoeda(valorLiquidezForcadaNumero)}</div>
                        <div className="vb-ext">{valorLiquidezForcadaExtenso.charAt(0).toUpperCase() + valorLiquidezForcadaExtenso.slice(1)}</div>
                        <div className="mt-1 inline-flex items-center px-1.5 py-0.5 rounded" style={{ fontSize: '7.5px', fontWeight: 700, color: '#2347C6', background: '#fff', border: '0.5px solid #c2d0e8' }}>
                          Fator {capaFatorLiquidacao} · {capaLiquidezDisplay}
                        </div>
                      </>
                    ) : (
                      <div style={{ fontSize: '9px', color: '#8FA4C7' }}>Não informado</div>
                    )}
                  </div>
                </div>
                {/* Strip de especificação */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {([
                    { label: 'GRAU DE FUNDAMENTAÇÃO', value: capaGrauFund },
                    { label: 'GRAU DE PRECISÃO',      value: capaGrauPrec },
                    { label: 'METODOLOGIA APLICADA',  value: capaMetodologia },
                  ] as { label: string; value: string }[]).map((card, idx) => (
                    <div key={idx} className="rounded overflow-hidden" style={{ border: '1px solid #d0daea' }}>
                      <div className="px-2 py-1" style={{ background: '#EAF0FB' }}>
                        <span style={{ fontSize: '6px', fontWeight: 700, color: '#2347C6', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{card.label}</span>
                      </div>
                      <div className="px-2 py-1.5">
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#17325C' }}>{card.value}</span>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Assinaturas */}
                <div style={{ borderTop: '1px solid #d0daea', paddingTop: '10px' }}>
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <div style={{ height: '24px', borderBottom: '1px solid #17325C', marginBottom: '4px' }} />
                      <div style={{ fontSize: '9.5px', fontWeight: 700, color: '#17325C' }}>{dados.responsavelNome || 'Responsável Técnico'}</div>
                      <div style={{ fontSize: '8px', color: '#5a7090', marginTop: '1px' }}>Responsável Técnica</div>
                      {dados.responsavelRegistro && <div style={{ fontSize: '8px', color: '#5a7090', marginTop: '1px' }}>{dados.responsavelRegistro}</div>}
                      <div style={{ fontSize: '7.5px', color: '#5a7090', marginTop: '2px', fontStyle: 'italic' }}>Lesath Engenharia – Craveiro, Leandro e Palma Serviços de Engenharia Ltda</div>
                    </div>
                    <div>
                      <div style={{ height: '24px', borderBottom: '1px solid #17325C', marginBottom: '4px' }} />
                      <div style={{ fontSize: '9.5px', fontWeight: 700, color: '#17325C' }}>Gustavo Hènriqüe A. Leandro</div>
                      <div style={{ fontSize: '8px', color: '#5a7090', marginTop: '1px' }}>Responsável Legal</div>
                      <div style={{ fontSize: '8px', color: 'transparent', marginTop: '1px' }}>—</div>
                      <div style={{ fontSize: '7.5px', color: '#5a7090', marginTop: '2px', fontStyle: 'italic' }}>Lesath Engenharia – Craveiro, Leandro e Palma Serviços de Engenharia Ltda</div>
                    </div>
                  </div>
                  <div className="text-center mt-2.5" style={{ fontSize: '8px', color: '#6b87a8' }}>{capaDataImpressao}</div>
                </div>
              </div>
              {/* Barra inferior */}
              <div className="cr-bar flex" style={{ height: '5px', background: '#17325C' }}>
                <div style={{ width: '35%', background: '#2347C6' }} />
                <div style={{ flex: 1 }} />
              </div>
            </Pagina>
            {/* ══ FIM CAPA RESUMO ═══════════════════════════════════ */}

            {(() => {
              const ITENS_PRIMEIRA_PAGINA = 35
              const ITENS_DEMAIS_PAGINAS = 42
              const chunks: ItemSumario[][] = []
              if (sumario.length <= ITENS_PRIMEIRA_PAGINA) {
                chunks.push(sumario)
              } else {
                chunks.push(sumario.slice(0, ITENS_PRIMEIRA_PAGINA))
                let i = ITENS_PRIMEIRA_PAGINA
                while (i < sumario.length) {
                  chunks.push(sumario.slice(i, i + ITENS_DEMAIS_PAGINAS))
                  i += ITENS_DEMAIS_PAGINAS
                }
              }
              return chunks.map((chunk, chunkIndex) => (
                <Pagina key={`sumario-${chunkIndex}`} pagina={proximaPagina()} dataLaudo={dados.dataLaudo}>
                  <CabecalhoLaudo />
                  <div className="space-y-3">
                    {chunkIndex === 0 ? (
                      <div>
                        <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 titulo-laudo">SUMÁRIO</h2>
                      </div>
                    ) : (
                      <div>
                        <h2 className="text-base font-bold text-slate-400">SUMÁRIO (continuação)</h2>
                      </div>
                    )}
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="space-y-0 text-[12px] text-slate-700">
                        {chunk.map((item) => (
                          <a
                            key={item.id}
                            href={`#${item.id}`}
                            onClick={(e) => {
                              e.preventDefault()
                              const el = document.getElementById(item.id)
                              if (!el) return
                              const headerOffset = 80
                              const top = el.getBoundingClientRect().top + window.scrollY - headerOffset
                              window.scrollTo({ top, behavior: 'smooth' })
                            }}
                            className="group flex items-end gap-3 rounded-md px-2 py-[3px] transition hover:bg-slate-100 cursor-pointer"
                          >
                            <span className={`shrink-0 ${item.nivel === 2 ? 'pl-5 text-slate-600' : 'font-medium text-slate-800'}`}>{item.titulo}</span>
                            <span className="mb-[3px] h-px flex-1 border-b border-dotted border-slate-300 group-hover:border-slate-500"></span>
                            <span className="shrink-0 font-semibold text-slate-900">{item.pagina}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  </div>
                </Pagina>
              ))
            })()}

            <Pagina pagina={proximaPagina()} dataLaudo={dados.dataLaudo}>
              <CabecalhoLaudo />
              <div className="space-y-4">
                <div>
                  <h2 className="font-bold text-lg titulo-laudo">1. IMÓVEL</h2>
                  <p>A presente avaliação tem por objetivo determinar o valor de mercado do imóvel localizado em:</p>
                  <p>{dados.endereco}.</p>
                  <p>Trata-se de imóvel caracterizado como {dados.tipo}, conforme características observadas em vistoria.</p>
                </div>
                <div>
                  <h2 className="font-bold text-lg titulo-laudo">2. OBJETIVO</h2>
                  <p>Trata-se de avaliação para fins de {dados.finalidade === 'garantia' ? 'garantia' : 'execução'}.</p>
                </div>
                <div>
                  <h2 className="font-bold text-lg titulo-laudo">3. PROPRIETÁRIO</h2>
                  <p>{dados.proprietario || 'Não informado'}.</p>
                </div>
                {dados.solicitante?.trim() && (
                  <div>
                    <h2 className="font-bold text-lg titulo-laudo">3.1. SOLICITANTE / INTERESSADO</h2>
                    <p>{dados.solicitante}.</p>
                  </div>
                )}
                <div>
                  <h2 className="font-bold text-lg titulo-laudo">4. OBSERVAÇÕES PRELIMINARES</h2>
                  <div className="space-y-4">
                    <p>Este laudo fundamenta-se no que estabelecem as normas técnicas da ABNT, Avaliação de Bens, registradas como NBR 14653- Parte 1 (Procedimentos Gerais) e Parte 2 (Imóveis Urbanos), e baseia-se:</p>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>Na documentação fornecida;</li>
                      <li>Em informações constatadas &quot;in loco&quot; quando da vistoria ao imóvel.</li>
                      <li>Em informações obtidas junto a agentes do mercado imobiliário local (vendedores, compradores, intermediários e etc).</li>
                    </ul>
                    <p>Na presente avaliação considerou-se a documentação apresentada.</p>
                    <p>Considerou-se também que o imóvel está livre e desembaraçado de quaisquer ônus, em condições de ser imediatamente comercializado.</p>
                    <p>Não foram efetuadas investigações quanto a correção dos documentos fornecidos; as observações &quot;in loco&quot; foram feitas sem instrumentos de medição; as informações obtidas foram tomadas como de boa-fé, tanto referente às documentações como às informações obtidas de terceiros. Não foi realizado estudo ambiental e de contaminação para o imóvel avaliando, bem como análises estruturais nas edificações, como ensaios e análises físicas.</p>
                    <p>A avaliadora signatária não possui qualquer inclinação comercial referente ao imóvel em questão, sendo totalmente isenta de interesses. Não foram disponibilizadas informações contábeis, financeiras ou relativas ao fundo de comércio. O presente laudo desconsidera eventuais ativos intangíveis, marcas, dados financeiros, volume de vendas, carteira de clientes, softwares, investimentos, máquinas, equipamentos, produtos, matériasprimas, entre outros ativos que não estejam diretamente vinculados às edificações e ao terreno.</p>
                  </div>
                </div>
                <div>
                  <h2 className="font-bold text-lg titulo-laudo">5. CARACTERIZAÇÃO DA REGIÃO</h2>
                  <p>O imóvel avaliado encontra-se inserido em região com acesso a pontos de referência relevantes da localidade, destacando-se:</p>
                  <ul className="list-disc pl-6 mt-3 space-y-1">
                    {dados.referencia1 && dados.distancia1 && <li>Distância até {dados.referencia1}: {dados.distancia1}.</li>}
                    {dados.referencia2 && dados.distancia2 && <li>Distância até {dados.referencia2}: {dados.distancia2}.</li>}
                    {dados.referencia3 && dados.distancia3 && <li>Distância até {dados.referencia3}: {dados.distancia3}.</li>}
                    {dados.referencia4 && dados.distancia4 && <li>Distância até {dados.referencia4}: {dados.distancia4}.</li>}
                    {dados.referencia5 && dados.distancia5 && <li>Distância até {dados.referencia5}: {dados.distancia5}.</li>}
                    {dados.cidadePrincipal && dados.distanciaCidadePrincipal && <li>Distância até a cidade de {dados.cidadePrincipal}: {dados.distanciaCidadePrincipal}.</li>}
                  </ul>
                  {dados.coordenadasImovel && <p className="mt-4">Coordenadas Geográficas do imóvel avaliando: {dados.coordenadasImovel}</p>}
                </div>
              </div>
            </Pagina>

            <PaginaFlexivel pagina={proximaPagina()} dataLaudo={dados.dataLaudo}>
              <CabecalhoLaudo />
              <div className="mb-8">
                <h2 className="text-2xl font-bold mb-4 titulo-laudo">6. CARACTERIZAÇÃO DO IMÓVEL</h2>
                <table className="w-full border mt-4 text-sm border-collapse evitar-quebra">
                  <thead><tr className="bg-[#EAF0FB]"><th colSpan={2} className="border p-2 text-center font-bold">Características principais</th></tr></thead>
                  <tbody>
                    <tr><td className="border p-2 font-bold w-1/3">Tipo do Imóvel</td><td className="border p-2">{dados.tipo}</td></tr>
                    <tr><td className="border p-2 font-bold">Matrícula</td><td className="border p-2">{dados.matricula}</td></tr>
                    <tr><td className="border p-2 font-bold">Padrão</td><td className="border p-2">{dados.padrao}</td></tr>
                    <tr><td className="border p-2 font-bold">Idade aparente</td><td className="border p-2">{dados.idadeAparente ? `${dados.idadeAparente} anos` : ''}</td></tr>
                    <tr><td className="border p-2 font-bold">Estado de Conservação</td><td className="border p-2">{dados.estadoConservacao}</td></tr>
                    <tr><td className="border p-2 font-bold">IPTU</td><td className="border p-2">{dados.iptu}</td></tr>
                    <tr><td className="border p-2 font-bold">Especificações de divisões</td><td className="border p-2">{dados.divisoes?.filter((d) => d.quantidade && d.ambiente).map((d) => `${d.quantidade} ${d.ambiente}`).join(', ') || ''}</td></tr>
                    <tr><td className="border p-2 font-bold">Área construída total</td><td className="border p-2">{formatarArea(dados.areaConstruidaTotal)}</td></tr>
                    <tr><td className="border p-2 font-bold">Área construída averbada</td><td className="border p-2">{formatarArea(dados.areaConstruidaAverbada)}</td></tr>
                    <tr><td className="border p-2 font-bold">Área de terreno total</td><td className="border p-2">{formatarArea(dados.areaTerrenoTotal)}</td></tr>
                    <tr><td className="border p-2 font-bold">Área de terreno averbada</td><td className="border p-2">{formatarArea(dados.areaTerrenoAverbada)}</td></tr>
                  </tbody>
                </table>
                {dados.melhoramentosPublicos && (
                  <div className="mt-6">
                    <table className="w-full border text-sm border-collapse evitar-quebra">
                      <thead><tr className="bg-[#EAF0FB]"><th colSpan={4} className="border p-2 text-center font-bold">Melhoramentos públicos</th></tr></thead>
                      <tbody>
                        {[
                          ['Rede de água', 'redeAgua', 'Rede Elétrica', 'redeEletrica'],
                          ['Gás canalizado', 'gasCanalizado', 'Rede Telefônica', 'redeTelefonica'],
                          ['Esgoto Sanitário', 'esgotoSanitario', 'Iluminação Pública', 'iluminacaoPublica'],
                          ['Esgoto Pluvial', 'esgotoPluvial', 'Pavimentação', 'pavimentacao'],
                          ['Fossa', 'fossa', 'Passeio', 'passeio'],
                          ['Coleta de Lixo', 'coletaLixo', 'Guias', 'guias'],
                          ['Lazer', 'lazer', 'Sarjetas', 'sarjetas'],
                        ].map(([l1, c1, l2, c2]) => (
                          <tr key={c1 as string}><td className="border p-2">{l1}</td><td className="border p-2 text-center">{dados.melhoramentosPublicos?.[c1 as string] || '-'}</td><td className="border p-2">{l2}</td><td className="border p-2 text-center">{dados.melhoramentosPublicos?.[c2 as string] || '-'}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </PaginaFlexivel>

            {/* 6.1. CROQUI — uma página por imagem de croqui */}
            {dados.croquis && dados.croquis.length > 0 && dados.croquis.map((croqui, index) => (
              <PaginaFlexivel key={`croqui-${index}`} pagina={proximaPagina()} dataLaudo={dados.dataLaudo}>
                <CabecalhoLaudo />
                <div className="mb-8 mt-4">
                  {index === 0 && <h2 className="text-2xl font-bold mb-4 titulo-laudo">{sec6Croqui}. CROQUI</h2>}
                  <div className="flex justify-center">
                    <img
                      src={croqui.preview}
                      alt={`Croqui ${index + 1}`}
                      className="max-w-full max-h-[210mm] object-contain rounded border"
                    />
                  </div>
                </div>
              </PaginaFlexivel>
            ))}

            {/* 6.2. TERRENO ENCRAVADO — paginado para não cortar o texto */}
            {dados.terrenoEncravado && (() => {
              const paragrafosEncravado = [
                ...dividirTextoEmParagrafos(TEXTO_PADRAO_TERRENO_ENCRAVADO),
                ...(dados.observacoesTerrenoEncravado ? [`Observações específicas: ${dados.observacoesTerrenoEncravado}`] : []),
              ]
              const paginasEncravado = dividirParagrafosEmPaginas(paragrafosEncravado, 2800, 8)
              return paginasEncravado.map((chunk, i) => (
                <PaginaFlexivel key={`encravado-${i}`} pagina={proximaPagina()} dataLaudo={dados.dataLaudo}>
                  <CabecalhoLaudo />
                  <div className="mb-8 mt-4 space-y-4">
                    {i === 0 && (
                      <>
                        <h2 className="text-2xl font-bold titulo-laudo">{sec6Encravado}. CONDIÇÕES ESPECÍFICAS DO TERRENO</h2>
                        <h3 className="text-lg font-bold">Terreno Encravado</h3>
                      </>
                    )}
                    {i > 0 && <h3 className="text-base font-semibold text-slate-400">Terreno Encravado (continuação)</h3>}
                    <div className="space-y-3 text-justify leading-relaxed">
                      {chunk.map((paragrafo, j) => <p key={j}>{paragrafo}</p>)}
                    </div>
                  </div>
                </PaginaFlexivel>
              ))
            })()}

            {/* 6.3. CONFRONTAÇÃO COM CURSO D'ÁGUA — paginado para não cortar o texto */}
            {dados.confrontacaoCursoAgua && (() => {
              const paragrafosAgua = [
                ...dividirTextoEmParagrafos(TEXTO_PADRAO_CONFRONTACAO_CURSO_AGUA),
                ...(dados.observacoesConfrontacaoCursoAgua ? [`Observações específicas: ${dados.observacoesConfrontacaoCursoAgua}`] : []),
              ]
              const paginasAgua = dividirParagrafosEmPaginas(paragrafosAgua, 2800, 8)
              return paginasAgua.map((chunk, i) => (
                <PaginaFlexivel key={`agua-${i}`} pagina={proximaPagina()} dataLaudo={dados.dataLaudo}>
                  <CabecalhoLaudo />
                  <div className="mb-8 mt-4 space-y-4">
                    {i === 0 && (
                      <>
                        <h2 className="text-2xl font-bold titulo-laudo">{sec6CursoAgua}. CONDIÇÕES ESPECÍFICAS DO TERRENO</h2>
                        <h3 className="text-lg font-bold">Confrontação com Curso D&apos;Água</h3>
                      </>
                    )}
                    {i > 0 && <h3 className="text-base font-semibold text-slate-400">Confrontação com Curso D&apos;Água (continuação)</h3>}
                    <div className="space-y-3 text-justify leading-relaxed">
                      {chunk.map((paragrafo, j) => <p key={j}>{paragrafo}</p>)}
                    </div>
                  </div>
                </PaginaFlexivel>
              ))
            })()}

            {(() => {
              const acabFiltrados = (dados.acabamentos || []).filter(
                (a) => a.ambiente?.trim() || a.acabamento?.trim()
              )
              return acabFiltrados.length > 0 ? (
                <PaginaFlexivel pagina={proximaPagina()} dataLaudo={dados.dataLaudo}>
                  <CabecalhoLaudo />
                  <div className="mb-8 mt-8">
                    <h2 className="text-2xl font-bold mb-4 titulo-laudo">{sn.acabamentos}. ACABAMENTOS</h2>
                    <table className="w-full border text-sm border-collapse evitar-quebra">
                      <thead><tr className="bg-[#EAF0FB]"><th className="border p-2 text-left">Ambientes</th><th className="border p-2 text-left">Acabamentos</th></tr></thead>
                      <tbody>
                        {acabFiltrados.map((item, index) => (
                          <tr key={index}><td className="border p-2">{item.ambiente}</td><td className="border p-2">{item.acabamento}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </PaginaFlexivel>
              ) : null
            })()}

            {(paginasSecao8.some(chunk => chunk.length > 0) || dados.liquidez || dados.desempenhoMercado) && (() => {
              // Garante ao menos uma página para renderizar o cabeçalho + tabela
              const chunks = paginasSecao8.some(chunk => chunk.length > 0)
                ? paginasSecao8
                : [[]]
              return chunks.map((chunk, i) => (
              <PaginaFlexivel key={`sec8-${i}`} pagina={proximaPagina()} dataLaudo={dados.dataLaudo}>
                <CabecalhoLaudo />
                <div className="mb-6 mt-6">
                  {i === 0 && <h2 className="text-2xl font-bold mb-4 titulo-laudo">{sn.consideracoes}. CONSIDERAÇÕES SOBRE O MERCADO</h2>}

                  {i === 0 && (dados.liquidez || dados.desempenhoMercado) && (
                    <table className="w-full border text-sm border-collapse mb-4 evitar-quebra">
                      <thead>
                        <tr className="bg-[#EAF0FB]">
                          <th className="border p-2 text-left font-bold w-1/3">Campo</th>
                          <th className="border p-2 text-left">Descrição</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dados.liquidez && (
                          <tr>
                            <td className="border p-2 font-semibold">Liquidez</td>
                            <td className="border p-2">{dados.liquidez}</td>
                          </tr>
                        )}
                        {dados.desempenhoMercado && (
                          <tr>
                            <td className="border p-2 font-semibold">Desempenho do Mercado</td>
                            <td className="border p-2">{dados.desempenhoMercado}</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  )}

                  {chunk.length > 0 && (
                    <div className="space-y-1.5 text-justify leading-relaxed">{chunk.map((paragrafo, j) => <p key={j}>{paragrafo}</p>)}</div>
                  )}
                </div>
              </PaginaFlexivel>
              ))
            })()}

            {chunkArray(itensGlossario, 18).map((chunk, i) => (
              <PaginaFlexivel key={`sec9-${i}`} pagina={proximaPagina()} dataLaudo={dados.dataLaudo}>
                <CabecalhoLaudo />
                <div className="mb-8 mt-8">
                  {i === 0 && <h2 className="text-2xl font-bold mb-4 titulo-laudo">{sn.glossario}. GLOSSÁRIO DE TERMOS TÉCNICOS (ABNT NBR 14653-2)</h2>}
                  <div className="space-y-3 text-justify leading-relaxed">{chunk.map((item, j) => <p key={j}>{item}</p>)}</div>
                </div>
              </PaginaFlexivel>
            ))}

            <PaginaFlexivel pagina={proximaPagina()} dataLaudo={dados.dataLaudo}>
              <CabecalhoLaudo />
              <div className="mb-8 mt-8">
                <h2 className="text-2xl font-bold mb-4 titulo-laudo">{sn.metodologia}. METODOLOGIA, PESQUISAS E CÁLCULOS</h2>
                <div className="space-y-2">
                  {dados.periodoPesquisaInicio && dados.periodoPesquisaFim && <p>• <strong>Período de abrangência da pesquisa:</strong> {formatarData(dados.periodoPesquisaInicio)} a {formatarData(dados.periodoPesquisaFim)}</p>}
                  {dados.tipoInformacoesObtidas && <p>• <strong>Tipo de informações obtidas:</strong> {dados.tipoInformacoesObtidas}</p>}
                  {!temElementos && dados.caracteristicasTerreno && <p>• <strong>Características:</strong> {dados.caracteristicasTerreno}</p>}
                </div>
                {!temElementos && (
                  <div className="mt-4 space-y-2">
                    <p>Após os tratamentos e homogeneizações, foi desenvolvido um modelo com os seguintes fatores considerados:</p>
                    <ul className="list-disc pl-6 mt-2">{dados.fatoresSelecionados?.map((fator, index) => <li key={index}>{fator}</li>)}</ul>
                  </div>
                )}

                {/* ── Elementos CDDM/Evolutivo inline ─────────────────────────────── */}
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
              </div>
            </PaginaFlexivel>

            <PaginaFlexivel pagina={proximaPagina()} dataLaudo={dados.dataLaudo}>
              <CabecalhoLaudo />
              <div className="mb-8 mt-8">
                <h2 className="text-2xl font-bold mb-4 titulo-laudo">{sn.valor}. VALOR DO IMÓVEL</h2>
                <div className="space-y-3">
                  {modoTotal ? (
                    <p>a. <strong>Valor do Imóvel:</strong> {formatarMoeda(valorTotalNumero)}</p>
                  ) : (
                    <>
                      <p>a. <strong>Valor do Terreno:</strong> {formatarMoeda(valorTerrenoNumero)}</p>
                      <p>b. <strong>Valor das Benfeitorias:</strong> {formatarMoeda(valorBenfeitoriasNumero)}</p>
                    </>
                  )}
                  <p>{modoTotal ? 'b.' : 'c.'} <strong>Fator de Comercialização:</strong> {dados.fatorComercializacao || '1,00'}</p>
                  {produtoOutrosFatores !== 1 && <p><strong>Produto dos outros fatores:</strong> {produtoOutrosFatores.toLocaleString('pt-BR')}</p>}
                </div>
                <div className="grid grid-cols-2 gap-3 mt-4 evitar-quebra">
                  <div className="value-box-dark">
                    <div className="vb-label">Valor de Avaliação</div>
                    <div className="vb-num">{formatarMoeda(valorArredondadoLaudo)}</div>
                    <div className="vb-ext">{valorArredondadoExtenso.charAt(0).toUpperCase() + valorArredondadoExtenso.slice(1)}</div>
                  </div>
                  <div className="value-box-light">
                    <div className="vb-label">Valor de Liquidez Forçada</div>
                    {valorLiquidezForcadaNumero > 0 ? (
                      <>
                        <div className="vb-num">{formatarMoeda(valorLiquidezForcadaNumero)}</div>
                        <div className="vb-ext">{valorLiquidezForcadaExtenso.charAt(0).toUpperCase() + valorLiquidezForcadaExtenso.slice(1)}</div>
                      </>
                    ) : (
                      <div style={{ fontSize: '9px', color: '#8FA4C7' }}>Não informado</div>
                    )}
                  </div>
                </div>
              </div>
            </PaginaFlexivel>

            {(() => {
              // ─── Dados de fundamentação e precisão salvos no laudo ───────
              const fund       = dados.fundamentacao            || []
              const fundInf    = dados.fundamentacaoInferencia  || []
              const fundEvo    = dados.fundamentacaoEvolutivo   || []
              const prec       = dados.precisao                 || []

              const metodo     = dados.metodoAvaliacao  || ''
              const tratamento = dados.tratamentoDados  || ''

              // ─── Valor numérico do grau ──────────────────────────────────
              const gv = (g?: string) => g === 'III' ? 3 : g === 'II' ? 2 : g === 'I' ? 1 : 0

              // Usa pontos salvo; se for 0 mas grau estiver preenchido, deriva do grau
              const pts = (i: any) => i?.pontos || gv(i?.grau)

              const somaFund   = fund.reduce   ((s: number, i: any) => s + pts(i), 0)
              const somaInf    = fundInf.reduce((s: number, i: any) => s + pts(i), 0)
              const somaEvo    = fundEvo.reduce((s: number, i: any) => s + pts(i), 0)

              // ─── Lógica de exibição por combinação método + tratamento ───
              const exibirFatores    = !(metodo === 'evolutivo' && tratamento === 'inferencia_estatistica')
              const exibirEvolutivo  = metodo === 'evolutivo'
              const exibirInferencia = tratamento === 'inferencia_estatistica'

              // ─── Enquadramento – Fatores ─────────────────────────────────
              // Grau III: soma≥10 + itens 2 e 4 = III + demais ≥ II
              // Grau II : soma≥6  + itens 2 e 4 ≥ II + demais ≥ I
              // Grau I  : soma≥4  + todos ≥ I
              const encFatores = (() => {
                const g2 = gv(fund[1]?.grau), g4 = gv(fund[3]?.grau)
                const outros = [fund[0], fund[2]]
                if (somaFund >= 10 && g2 >= 3 && g4 >= 3 && outros.every((i: any) => gv(i?.grau) >= 2)) return 'III'
                if (somaFund >= 6  && g2 >= 2 && g4 >= 2 && outros.every((i: any) => gv(i?.grau) >= 1)) return 'II'
                if (somaFund >= 4  && fund.every((i: any) => gv(i?.grau) >= 1)) return 'I'
                return ''
              })()

              // ─── Enquadramento – Evolutivo ───────────────────────────────
              // Grau III: soma≥8 + todos ≥ II
              // Grau II : soma≥5 + itens 1 e 2 ≥ II
              // Grau I  : soma≥3 + todos ≥ I
              const encEvolutivo = (() => {
                if (somaEvo >= 8 && fundEvo.every((i: any) => gv(i?.grau) >= 2)) return 'III'
                if (somaEvo >= 5 && gv(fundEvo[0]?.grau) >= 2 && gv(fundEvo[1]?.grau) >= 2) return 'II'
                if (somaEvo >= 3 && fundEvo.every((i: any) => gv(i?.grau) >= 1)) return 'I'
                return ''
              })()

              // ─── Enquadramento – Inferência ──────────────────────────────
              // Grau III: soma≥16 + itens 2,4,5,6 = III + demais ≥ II
              // Grau II : soma≥10 + itens 2,4,5,6 ≥ II + demais ≥ I
              // Grau I  : soma≥6  + todos ≥ I
              const encInferencia = (() => {
                const man = [fundInf[1], fundInf[3], fundInf[4], fundInf[5]]
                const oth = [fundInf[0], fundInf[2]]
                if (somaInf >= 16 && man.every((i: any) => gv(i?.grau) >= 3) && oth.every((i: any) => gv(i?.grau) >= 2)) return 'III'
                if (somaInf >= 10 && man.every((i: any) => gv(i?.grau) >= 2) && oth.every((i: any) => gv(i?.grau) >= 1)) return 'II'
                if (somaInf >= 6  && fundInf.every((i: any) => gv(i?.grau) >= 1)) return 'I'
                return ''
              })()

              // ─── Estilo de célula ativo ──────────────────────────────────
              const ca = (cond: boolean) => cond ? 'bg-blue-600 text-white font-bold' : ''

              // ─── Linhas das tabelas ──────────────────────────────────────
              const linhasFund = [
                { item: 1, desc: 'Caracterização do imóvel avaliando',                                                                                                    iii: 'Completa quanto a todos os fatores analisados',                                                                                                                ii: 'Completa quanto aos fatores utilizados no tratamento',                                     i: 'Adoção de situação paradigma' },
                { item: 2, desc: 'Quantidade mínima de dados de mercado efetivamente utilizados',                                                                          iii: '12',                                                                                                                                                   ii: '5',                                                                                        i: '3' },
                { item: 3, desc: 'Identificação dos dados de mercado',                                                                                                    iii: 'Apresentação das informações relativas a todas as características dos dados analisados, com foto e características observadas pelo autor do laudo',   ii: 'Apresentação das informações relativas a todas as características dos dados analisados',   i: 'Apresentação das informações relativas a todas as características dos dados correspondentes aos fatores utilizados' },
                { item: 4, desc: 'Intervalo admissível de ajuste para o conjunto de fatores',                                                                              iii: '0,80 a 1,25',                                                                                                                                           ii: '0,5 a 2,00',                                                                               i: '0,40 a 2,50' },
              ]
              const linhasEvo = [
                { item: 1, desc: 'Estimativa do valor do terreno',     iii: 'Grau III de fundamentação no método comparativo ou no involutivo', ii: 'Grau II de fundamentação no método comparativo ou no involutivo', i: 'Grau I de fundamentação no método comparativo ou no involutivo' },
                { item: 2, desc: 'Estimativa dos Custos de Reedição',  iii: 'Grau III de fundamentação no método da quantificação de custo',   ii: 'Grau II de fundamentação no método da quantificação de custo',   i: 'Grau I de fundamentação no método da quantificação de custo' },
                { item: 3, desc: 'Fator de Comercialização',           iii: 'Inferido em mercado semelhante',                                  ii: 'Justificado',                                                     i: 'Arbitrado' },
              ]
              const linhasInf = [
                { item: 1, desc: 'Caracterização do imóvel avaliando',                                                                                                                    iii: 'Completa quanto a todas as variáveis analisadas',                                                                                                                                                                                                                        ii: 'Completa quanto às variáveis utilizadas no modelo',                                                                                                                                                                                                             i: 'Adoção da situação paradigma' },
                { item: 2, desc: 'Quantidade mínima de dados do mercado',                                                                                                                  iii: '6 (k+1), onde k é o número de variáveis independentes',                                                                                                                                                                                                                 ii: '4 (k+1), onde k é o número de variáveis independentes',                                                                                                                                                                                                        i: '3 (k+1), onde k é o número de variáveis independentes' },
                { item: 3, desc: 'Identificação dos dados de mercado',                                                                                                                    iii: 'Apresentação de informações relativas a todos os dados e variáveis analisados na modelagem, com foto e características observadas no local pelo autor do laudo',                                                                                                      ii: 'Apresentação de informações relativas a todos os dados e variáveis analisadas na modelagem',                                                                                                                                                                   i: 'Apresentação de informações relativas aos dados e variáveis efetivamente utilizados no modelo' },
                { item: 4, desc: 'Extrapolação',                                                                                                                                          iii: 'Não admitida',                                                                                                                                                                                                                                                          ii: 'Admitida para apenas uma variável, desde que: a) medidas do avaliando não superiores a 100% do limite amostral superior, nem inferiores à metade do inferior; b) valor estimado não ultrapasse 15% do calculado no limite da fronteira amostral, em módulo',   i: 'Admitida para apenas uma variável, desde que: a) medidas do avaliando não superiores a 100% do limite amostral superior, nem inferiores à metade do inferior; b) valor estimado não ultrapasse 20% do calculado no limite da fronteira amostral, em módulo' },
                { item: 5, desc: 'Nível de significância máximo para rejeição da hipótese nula de cada regressor (teste bicaudal)',                                                        iii: '10%',                                                                                                                                                                                                                                                            ii: '20%',                                                                                                                                                                                                                                                          i: '30%' },
                { item: 6, desc: 'Nível de significância máximo admitido para rejeição da hipótese nula do modelo (teste F de Snedecor)',                                                 iii: '1%',                                                                                                                                                                                                                                                            ii: '2%',                                                                                                                                                                                                                                                           i: '5%' },
              ]

              // ─── Tabela principal de fundamentação (genérica) ────────────
              function TabelaFund({ titulo, linhas, dadosGrau, soma, obs }: {
                titulo: string
                linhas: { item: number; desc: string; iii: string; ii: string; i: string }[]
                dadosGrau: any[]
                soma: number
                obs?: string
              }) {
                return (
                  <div className="mb-4">
                    <p className="mb-2 font-semibold text-[11px]">{titulo}</p>
                    <table className="w-full border text-[11px] border-collapse table-fixed">
                      <colgroup>
                        <col style={{ width: '5%' }} /><col style={{ width: '20%' }} />
                        <col style={{ width: '20%' }} /><col style={{ width: '20%' }} />
                        <col style={{ width: '20%' }} /><col style={{ width: '15%' }} />
                      </colgroup>
                      <thead>
                        <tr className="bg-gray-200">
                          <th rowSpan={2} className="border p-1 text-center align-middle">Item</th>
                          <th rowSpan={2} className="border p-1 text-center align-middle">Descrição</th>
                          <th colSpan={3} className="border p-1 text-center">GRAU</th>
                          <th rowSpan={2} className="border p-1 text-center align-middle">Pontuação</th>
                        </tr>
                        <tr className="bg-gray-200">
                          <th className="border p-1 text-center">III</th>
                          <th className="border p-1 text-center">II</th>
                          <th className="border p-1 text-center">I</th>
                        </tr>
                      </thead>
                      <tbody>
                        {linhas.map((l, idx) => {
                          const g = dadosGrau[idx]?.grau || ''
                          return (
                            <tr key={l.item}>
                              <td className="border p-1 text-center font-bold align-middle">{l.item}</td>
                              <td className="border p-1 align-middle text-[10px]">{l.desc}</td>
                              <td className={`border p-1 text-center text-[10px] align-middle ${ca(g === 'III')}`}>{l.iii}</td>
                              <td className={`border p-1 text-center text-[10px] align-middle ${ca(g === 'II')}`}>{l.ii}</td>
                              <td className={`border p-1 text-center text-[10px] align-middle ${ca(g === 'I')}`}>{l.i}</td>
                              <td className="border p-1 text-center font-bold align-middle">{g ? dadosGrau[idx].pontos : ''}</td>
                            </tr>
                          )
                        })}
                        <tr>
                          <td colSpan={5} className="border p-1 text-right font-bold">Somatória</td>
                          <td className="border p-1 text-center font-bold">{soma}</td>
                        </tr>
                      </tbody>
                    </table>
                    {obs && <p className="mt-1 text-[10px]"><strong>Obs:</strong> {obs}</p>}
                  </div>
                )
              }

              // ─── Tabela resultado – Fatores (estilo imagem 2) ────────────
              function ResultadoFatores({ enc }: { enc: string }) {
                return (
                  <div className="mt-3">
                    <p className="mb-2 text-[11px] font-semibold">Tabela 4 - Enquadramento do laudo segundo seu grau de fundamentação no caso de utilização de tratamento por fatores.</p>
                    <table className="w-full border text-[11px] border-collapse">
                      <tbody>
                        <tr className="bg-gray-100">
                          <td className="border p-2 text-center font-bold w-1/4">Graus</td>
                          <td className={`border p-2 text-center font-bold ${ca(enc === 'III')}`}>III</td>
                          <td className={`border p-2 text-center font-bold ${ca(enc === 'II')}`}>II</td>
                          <td className={`border p-2 text-center font-bold ${ca(enc === 'I')}`}>I</td>
                        </tr>
                        <tr>
                          <td className="border p-2 text-center bg-gray-50">Pontos mínimos</td>
                          <td className="border p-2 text-center">10</td>
                          <td className="border p-2 text-center">6</td>
                          <td className="border p-2 text-center">4</td>
                        </tr>
                        <tr>
                          <td className="border p-2 text-center bg-gray-50 align-middle">Itens obrigatórios</td>
                          <td className={`border p-2 text-center text-[10px] align-middle ${ca(enc === 'III')}`}>Itens 2 e 4 no grau III, com os demais no mínimo no grau II</td>
                          <td className={`border p-2 text-center text-[10px] align-middle ${ca(enc === 'II')}`}>Itens 2 e 4 no grau II, com os demais no mínimo no grau I</td>
                          <td className={`border p-2 text-center text-[10px] align-middle ${ca(enc === 'I')}`}>Todos, no mínimo no grau I.</td>
                        </tr>
                      </tbody>
                    </table>
                    <div className="mt-2 flex justify-end">
                      <table className="border text-[11px] border-collapse">
                        <tbody>
                          <tr>
                            <td className="border p-2 font-bold bg-slate-100 px-4">Enquadramento Fundamentação</td>
                            <td className={`border p-2 text-center font-bold px-8 ${enc ? 'bg-blue-600 text-white' : ''}`}>{enc || '-'}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              }

              // ─── Tabela resultado – Evolutivo (estilo imagem 3) ──────────
              function ResultadoEvolutivo({ enc }: { enc: string }) {
                return (
                  <div className="mt-3">
                    <p className="mb-2 text-[11px] font-semibold">Enquadramento do laudo segundo seu grau de fundamentação no caso de utilização do Método Evolutivo</p>
                    <table className="w-full border text-[11px] border-collapse">
                      <tbody>
                        <tr className="bg-gray-100">
                          <td className="border p-2 text-center font-bold w-1/5">Grau</td>
                          <td className={`border p-2 text-center font-bold ${ca(enc === 'III')}`}>III</td>
                          <td className={`border p-2 text-center font-bold ${ca(enc === 'II')}`}>II</td>
                          <td className={`border p-2 text-center font-bold ${ca(enc === 'I')}`}>I</td>
                          <td className="border p-2 text-center font-bold bg-gray-100" rowSpan={3}>Enquadramento</td>
                        </tr>
                        <tr>
                          <td className="border p-2 text-center bg-gray-50">Pontos mínimos</td>
                          <td className="border p-2 text-center">8</td>
                          <td className="border p-2 text-center">5</td>
                          <td className="border p-2 text-center">3</td>
                        </tr>
                        <tr>
                          <td className="border p-2 text-center bg-gray-50 align-middle">Itens obrigatórios</td>
                          <td className={`border p-2 text-center text-[10px] align-middle ${ca(enc === 'III')}`}>1, 2 e 3 no mínimo grau II</td>
                          <td className={`border p-2 text-center text-[10px] align-middle ${ca(enc === 'II')}`}>1 e 2, no mínimo no grau II</td>
                          <td className={`border p-2 text-center text-[10px] align-middle ${ca(enc === 'I')}`}>Todos, no mínimo no grau I</td>
                        </tr>
                      </tbody>
                    </table>
                    <div className="mt-2 flex justify-end">
                      <table className="border text-[11px] border-collapse">
                        <tbody>
                          <tr>
                            <td className="border p-2 font-bold bg-slate-100 px-4">Enquadramento Fundamentação</td>
                            <td className={`border p-2 text-center font-bold px-8 ${enc ? 'bg-blue-600 text-white' : ''}`}>{enc ? `Grau ${enc}` : '-'}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              }

              // ─── Tabela resultado – Inferência (estilo imagem 1) ─────────
              function ResultadoInferencia({ enc }: { enc: string }) {
                return (
                  <div className="mt-3">
                    <p className="mb-2 text-[11px] font-semibold">Enquadramento do laudo segundo seu grau de fundamentação no caso de utilização de modelos de regressão linear</p>
                    <table className="w-full border text-[11px] border-collapse">
                      <tbody>
                        <tr className="bg-gray-100">
                          <td className="border p-2 text-center font-bold w-1/5">Grau</td>
                          <td className={`border p-2 text-center font-bold ${ca(enc === 'III')}`}>III</td>
                          <td className={`border p-2 text-center font-bold ${ca(enc === 'II')}`}>II</td>
                          <td className={`border p-2 text-center font-bold ${ca(enc === 'I')}`}>I</td>
                          <td className="border p-2 text-center font-bold bg-gray-100" rowSpan={3}>Enquadramento</td>
                        </tr>
                        <tr>
                          <td className="border p-2 text-center bg-gray-50">Pontos mínimos</td>
                          <td className="border p-2 text-center">16</td>
                          <td className="border p-2 text-center">10</td>
                          <td className="border p-2 text-center">6</td>
                        </tr>
                        <tr>
                          <td className="border p-2 text-center bg-gray-50 align-middle">Itens obrigatórios</td>
                          <td className={`border p-2 text-center text-[10px] align-middle ${ca(enc === 'III')}`}>2, 4, 5 e 6 no grau III e os demais no mínimo no grau II</td>
                          <td className={`border p-2 text-center text-[10px] align-middle ${ca(enc === 'II')}`}>2, 4, 5 e 6 no mínimo no grau II e os demais no mínimo no grau I</td>
                          <td className={`border p-2 text-center text-[10px] align-middle ${ca(enc === 'I')}`}>Todos, no mínimo no grau I</td>
                        </tr>
                      </tbody>
                    </table>
                    <div className="mt-2 flex justify-end">
                      <table className="border text-[11px] border-collapse">
                        <tbody>
                          <tr>
                            <td className="border p-2 font-bold bg-slate-100 px-4">Enquadramento Fundamentação</td>
                            <td className={`border p-2 text-center font-bold px-8 ${enc ? 'bg-blue-600 text-white' : ''}`}>{enc ? `Grau ${enc}` : '-'}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              }

              // ─── Tabela de precisão ──────────────────────────────────────
              function TabelaPrecisao() {
                const gp = prec[0]?.grau || ''
                return (
                  <div className="mb-4">
                    <p className="mb-2 font-semibold text-[11px]">Grau de precisão</p>
                    <table className="w-full border text-[11px] border-collapse table-fixed">
                      <colgroup>
                        <col style={{ width: '6%' }} /><col style={{ width: '36%' }} />
                        <col style={{ width: '19%' }} /><col style={{ width: '19%' }} /><col style={{ width: '20%' }} />
                      </colgroup>
                      <thead>
                        <tr className="bg-gray-200">
                          <th rowSpan={2} className="border p-1 text-center align-middle">Item</th>
                          <th rowSpan={2} className="border p-1 text-center align-middle">Descrição</th>
                          <th colSpan={3} className="border p-1 text-center">GRAU</th>
                        </tr>
                        <tr className="bg-gray-200">
                          <th className="border p-1 text-center">III</th>
                          <th className="border p-1 text-center">II</th>
                          <th className="border p-1 text-center">I</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border p-1 text-center font-bold align-middle">1</td>
                          <td className="border p-1 align-middle text-[10px]">Amplitude do intervalo de confiança de 80% em torno da estimativa de tendência central</td>
                          <td className={`border p-1 text-center align-middle ${ca(gp === 'III')}`}>≤ 30%</td>
                          <td className={`border p-1 text-center align-middle ${ca(gp === 'II')}`}>≤ 40%</td>
                          <td className={`border p-1 text-center align-middle ${ca(gp === 'I')}`}>≤ 50%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )
              }

              // ─── Renderização das páginas ────────────────────────────────
              const primeiraTabelaExibida = exibirFatores ? 'fatores' : exibirEvolutivo ? 'evolutivo' : 'inferencia'

              return (
                <>
                  {/* Fatores: aparece para comparativo+fatores, comparativo+inferência, evolutivo+fatores */}
                  {exibirFatores && (
                    <PaginaFlexivel pagina={proximaPagina()} dataLaudo={dados.dataLaudo}>
                      <CabecalhoLaudo />
                      <div className="mt-3 mb-2">
                        {primeiraTabelaExibida === 'fatores' && (
                          <h2 className="text-2xl font-bold mb-4 titulo-laudo">{sn.fundamentacao}. DETERMINAÇÃO DO GRAU DE FUNDAMENTAÇÃO</h2>
                        )}
                        <TabelaFund
                          titulo="Grau de fundamentação no caso de utilização de fatores – Avaliação do terreno"
                          linhas={linhasFund}
                          dadosGrau={fund}
                          soma={somaFund}
                          obs="Para menos de 5 dados de mercado, o intervalo deverá ser 0,8 a 1,25."
                        />
                        <ResultadoFatores enc={encFatores} />
                      </div>
                    </PaginaFlexivel>
                  )}

                  {/* Evolutivo: aparece para evolutivo+fatores e evolutivo+inferência */}
                  {exibirEvolutivo && (
                    <PaginaFlexivel pagina={proximaPagina()} dataLaudo={dados.dataLaudo}>
                      <CabecalhoLaudo />
                      <div className="mt-3 mb-2">
                        {primeiraTabelaExibida === 'evolutivo' && (
                          <h2 className="text-2xl font-bold mb-4 titulo-laudo">{sn.fundamentacao}. DETERMINAÇÃO DO GRAU DE FUNDAMENTAÇÃO</h2>
                        )}
                        <TabelaFund
                          titulo="Grau de fundamentação no caso de utilização do Método Evolutivo"
                          linhas={linhasEvo}
                          dadosGrau={fundEvo}
                          soma={somaEvo}
                        />
                        <ResultadoEvolutivo enc={encEvolutivo} />
                      </div>
                    </PaginaFlexivel>
                  )}

                  {/* Inferência: aparece para comparativo+inferência e evolutivo+inferência */}
                  {exibirInferencia && (
                    <PaginaFlexivel pagina={proximaPagina()} dataLaudo={dados.dataLaudo}>
                      <CabecalhoLaudo />
                      <div className="mt-3 mb-2">
                        {primeiraTabelaExibida === 'inferencia' && (
                          <h2 className="text-2xl font-bold mb-4 titulo-laudo">{sn.fundamentacao}. DETERMINAÇÃO DO GRAU DE FUNDAMENTAÇÃO</h2>
                        )}
                        <TabelaFund
                          titulo="Grau de fundamentação no caso de utilização de modelos de regressão linear"
                          linhas={linhasInf}
                          dadosGrau={fundInf}
                          soma={somaInf}
                        />
                        <ResultadoInferencia enc={encInferencia} />
                      </div>
                    </PaginaFlexivel>
                  )}

                  {/* Fallback: nenhuma combinação reconhecida */}
                  {!exibirFatores && !exibirEvolutivo && !exibirInferencia && (
                    <PaginaFlexivel pagina={proximaPagina()} dataLaudo={dados.dataLaudo}>
                      <CabecalhoLaudo />
                      <div className="mt-3 mb-2">
                        <h2 className="text-2xl font-bold mb-4 titulo-laudo">{sn.fundamentacao}. DETERMINAÇÃO DO GRAU DE FUNDAMENTAÇÃO</h2>
                        <p className="text-sm text-slate-500">Método de avaliação e tratamento de dados não especificados.</p>
                      </div>
                    </PaginaFlexivel>
                  )}

                  {/* 12.02 Precisão — só aparece se preenchida */}
                  {prec.length > 0 && (
                    <PaginaFlexivel pagina={proximaPagina()} dataLaudo={dados.dataLaudo}>
                      <CabecalhoLaudo />
                      <div className="mt-3 mb-2">
                        <h2 className="text-xl font-bold mb-4 titulo-laudo">{sn.fundamentacao}.02 GRAU DE PRECISÃO</h2>
                        <TabelaPrecisao />
                      </div>
                    </PaginaFlexivel>
                  )}
                </>
              )
            })()}

            <PaginaFlexivel pagina={proximaPagina()} dataLaudo={dados.dataLaudo}>
              <CabecalhoLaudo />
              <div className="mb-8 mt-8">
                <h2 className="text-2xl font-bold mb-4 titulo-laudo">{sn.conclusao}. CONCLUSÃO</h2>
                <div className="space-y-3 text-justify">
                  <p>Fundamentados nos elementos e condições consignados no presente Laudo de Avaliação, atribuímos ao imóvel em questão o seguinte valor de mercado:</p>
                  <div className="grid grid-cols-2 gap-3 mt-2 evitar-quebra">
                    <div className="value-box-dark">
                      <div className="vb-label">Valor de Avaliação</div>
                      <div className="vb-num">{formatarMoeda(valorArredondadoLaudo)}</div>
                      <div className="vb-ext">{valorArredondadoExtenso.charAt(0).toUpperCase() + valorArredondadoExtenso.slice(1)}</div>
                    </div>
                    {valorLiquidezForcadaNumero > 0 ? (
                      <div className="value-box-light">
                        <div className="vb-label">Valor de Liquidez Forçada</div>
                        <div className="vb-num">{formatarMoeda(valorLiquidezForcadaNumero)}</div>
                        <div className="vb-ext">{valorLiquidezForcadaExtenso.charAt(0).toUpperCase() + valorLiquidezForcadaExtenso.slice(1)}</div>
                      </div>
                    ) : (
                      <div className="value-box-light">
                        <div className="vb-label">Subtotal</div>
                        <div className="vb-num">{formatarMoeda(valorFinalCalculado)}</div>
                        <div className="vb-ext">Antes do arredondamento</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {garantiaTexto.titulo && (
                <div className="mb-8 mt-8">
                  <h2 className="text-2xl font-bold mb-4 titulo-laudo">{sn.garantia}. GARANTIA</h2>
                  <div className="space-y-4 text-justify"><p><strong>{garantiaTexto.titulo}</strong></p><p>{garantiaTexto.texto}</p></div>
                </div>
              )}
              <div className="mb-8 mt-8">
                <h2 className="text-2xl font-bold mb-4 titulo-laudo">{sn.anexos}. ANEXOS E ASSINATURA RESPONSÁVEL TÉCNICO</h2>
                <div className="space-y-3 text-justify border rounded p-4">
                  <p>{formatarData(dados.dataLaudo || '')}</p>
                  <p><strong>Responsável Técnico:</strong> {dados.responsavelNome}</p>
                  <p><strong>CPF:</strong> {dados.responsavelCpf}</p>
                  <p><strong>CREA/CAU:</strong> {dados.responsavelRegistro}</p>
                  <p><strong>Empresa:</strong> LESATH ENGENHARIA</p>
                  <p><strong>CNPJ:</strong> 49.068.717/0001-64</p>
                </div>
              </div>
            </PaginaFlexivel>

            {dados.documentacaoPdf ? (
              <AnexoPdfPaginado file={dados.documentacaoPdf} titulo={`${sn.anexos}.1. DOCUMENTAÇÃO`} paginaInicial={Number(proximaPagina())} dataLaudo={dados.dataLaudo} onPageCount={setDocumentacaoNumPages} larguraPagina={600} />
            ) : null}

            {gruposFotos.length > 0 ? (
              gruposFotos.map((grupo, paginaIndex) => (
                <Pagina key={`fotos-${paginaIndex}`} pagina={proximaPagina()} dataLaudo={dados.dataLaudo}>
                  <CabecalhoLaudo />
                  <div className="mb-4">
                    {paginaIndex === 0 && <h2 className="text-2xl font-bold mb-4 titulo-laudo">{sn.anexos}.2. RELATÓRIO FOTOGRÁFICO</h2>}
                    <div className="grid grid-cols-2 gap-4">
                      {grupo.map((foto, index) => (
                        <div key={index} className="border p-2 rounded"><img src={foto.preview} alt={`Foto ${paginaIndex * 4 + index + 1}`} className="w-full h-[95mm] object-cover rounded mb-2" /><p className="text-sm leading-tight"><strong>Legenda:</strong> {foto.legenda || 'Sem legenda'}</p></div>
                      ))}
                    </div>
                  </div>
                </Pagina>
              ))
            ) : null}

            {dados.localizacaoComparativos ? (
              <Pagina pagina={proximaPagina()} dataLaudo={dados.dataLaudo}>
                <CabecalhoLaudo />
                <div className="mb-8">
                  <h2 className="text-2xl font-bold mb-4 titulo-laudo">{sn.anexos}.3. LOCALIZAÇÃO DOS ELEMENTOS COMPARATIVOS</h2>
                  <div className="border p-3 rounded"><img src={dados.localizacaoComparativos} alt="Localização dos elementos comparativos" className="w-full max-h-[215mm] object-contain rounded" /></div>
                </div>
              </Pagina>
            ) : null}



            {/* Rodapé único ao final do documento */}
            <div className="mt-10 pt-3">
              <div className="h-[1px] bg-[#C9D3E6]" />
              <div className="mt-2 flex items-center justify-between gap-4 text-[11px] text-[#5D6F8F]">
                <span className="truncate">www.lesathengenharia.com.br</span>
                <span className="text-center font-medium text-[#17325C]">Lesath Engenharia</span>
                <span className="text-right">{formatarData(dados.dataLaudo || '')}</span>
              </div>
            </div>
            </>
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
