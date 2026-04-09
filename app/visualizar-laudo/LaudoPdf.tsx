'use client'

import React from 'react'
import {
  Document,
  Page,
  View,
  Text,
  Image,
  Link,
  StyleSheet,
} from '@react-pdf/renderer'

// ─── Types ───────────────────────────────────────────────────────────────────

type Foto = { preview: string; legenda: string }
type AcabamentoItem = { ambiente: string; acabamento: string }
type ResumoMercadoItem = { campo: string; descricao: string }

export type DadosLaudo = {
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
  coordenadasImovel?: string
  terrenoEncravado?: boolean
  confrontacaoCursoAgua?: boolean
  observacoesTerrenoEncravado?: string
  observacoesConfrontacaoCursoAgua?: string
  melhoramentosPublicos?: Record<string, string | undefined>
  fotos: Foto[]
  croqui?: string
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
  fatorComercializacao: string
  valorLiquidezForcada?: string
  garantiaClassificacao?: string
  garantiaObservacoes?: string
  dataLaudo?: string
  responsavelNome?: string
  responsavelCpf?: string
  responsavelRegistro?: string
  documentacaoPdf?: string
  documentacaoPdfPaginas?: string[]
  localizacaoComparativos?: string
  calculoPdf?: string
  calculoPdfPaginas?: string[]
  outrosFatoresImovel: { descricao: string; valor: string }[]
  valorFinalImovel: number
  fundamentacao?: { item: number; grau: string; pontos: number }[]
  fundamentacaoInferencia?: { item: number; grau: string; pontos: number }[]
  fundamentacaoEvolutivo?: { item: number; grau: string; pontos: number }[]
  precisao?: { item: number; grau: string; pontos: number }[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fd(data: string) {
  if (!data) return ''
  const [ano, mes, dia] = data.split('-')
  return `${dia}/${mes}/${ano}`
}

function fm(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function cn(valor: string) {
  if (!valor) return 0
  return Number(valor.replace(/\s/g, '').replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '')) || 0
}

function arredondar(valor: number) {
  return Math.round(valor / 100) * 100
}

function numeroPorExtenso(valor: number): string {
  const unidades = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove',
    'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove']
  const dezenas = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa']
  const centenas = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos']
  function ate999(n: number): string {
    if (n === 0) return ''
    if (n === 100) return 'cem'
    if (n < 20) return unidades[n]
    if (n < 100) { const d = Math.floor(n / 10); const r = n % 10; return r ? `${dezenas[d]} e ${unidades[r]}` : dezenas[d] }
    const c = Math.floor(n / 100); const r = n % 100
    if (r === 0) return centenas[c]
    return `${centenas[c]} e ${ate999(r)}`
  }
  function inteiro(n: number): string {
    if (n === 0) return 'zero'
    const mi = Math.floor(n / 1_000_000)
    const mil = Math.floor((n % 1_000_000) / 1_000)
    const resto = n % 1_000
    const p: string[] = []
    if (mi > 0) p.push(mi === 1 ? 'um milhão' : `${ate999(mi)} milhões`)
    if (mil > 0) p.push(mil === 1 ? 'mil' : `${ate999(mil)} mil`)
    if (resto > 0) p.push(ate999(resto))
    if (p.length === 1) return p[0]
    if (p.length === 2) return `${p[0]} e ${p[1]}`
    return p.slice(0, -1).join(', ') + ' e ' + p[p.length - 1]
  }
  return `${inteiro(Math.round(valor))} reais`
}

function obterTextoGarantia(classificacao?: string, observacoes?: string) {
  if (classificacao === 'boa') return {
    titulo: 'O imóvel avaliado apresenta-se como boa garantia.',
    texto: 'Após análise dos elementos apresentados no presente laudo, entendemos que o imóvel em questão reúne condições satisfatórias para ser aceito como garantia.',
  }
  if (classificacao === 'observacoes') return {
    titulo: 'O imóvel avaliado apresenta observações relevantes quanto à garantia.',
    texto: `Após análise das características apresentada no presente laudo, verificamos que o imóvel poderá ser aceito como garantia, porém existem ressalvas que deverão ser avaliadas pelo interessado, ficando a aceitação final a seu critério.${observacoes ? ` Observações: ${observacoes}` : ''}`,
  }
  if (classificacao === 'negativa') return {
    titulo: 'O imóvel avaliado não é recomendado como garantia.',
    texto: `Após análise das características apresentada no presente laudo, entendemos que o imóvel em questão não apresenta condições adequadas para aceitação como garantia.${observacoes ? ` Justificativa: ${observacoes}` : ''}`,
  }
  return { titulo: '', texto: '' }
}

const TEXTO_TERRENO_ENCRAVADO = `O terreno encravado caracteriza-se por não possuir acesso oficial a qualquer via pública, podendo ser total ou parcial. A área com encravamento total, como é o caso do avaliando, não apresenta acesso em nenhuma de suas confrontações, dependendo, assim, de imóveis vizinhos para ser alcançado. Já o encravamento parcial é caracterizado por imóvel que possui acesso oficial, porém, por qualquer motivo, seja ele natural ou não, não é possível o acesso por esta via.

Seção III — Da Passagem Forçada. Art. 1.285. O dono do prédio que não tiver acesso à via pública, nascente ou porto, pode, mediante pagamento de indenização cabal, constranger o vizinho a lhe dar passagem, cujo rumo será judicialmente fixado, se necessário.

Diante do exposto, vale ressaltar que as características do imóvel podem gerar ônus judiciais no futuro, o que justifica a aplicação de fatores de depreciação ao valor inicial de avaliação.`

const TEXTO_CURSO_DAGUA = `Conforme a Lei nº 12.651, de 25 de maio de 2012 — Código Florestal, consideram-se Áreas de Preservação Permanente, em zonas rurais ou urbanas, as faixas marginais de qualquer curso d'água natural, perene ou intermitente, desde a borda da calha do leito regular, observadas as larguras mínimas previstas em lei.

A existência de confrontação com curso d'água exige avaliação técnica e jurídica quanto às possíveis restrições de uso, ocupação e aproveitamento do imóvel, especialmente em razão das limitações impostas pelas áreas de preservação permanente.

Dessa forma, a confrontação com curso d'água pode influenciar negativamente o aproveitamento econômico do imóvel, afetando sua liquidez, ocupação e potencial construtivo.`

const GLOSSARIO = [
  'Amostra: Conjunto de dados de mercado selecionados para representar o universo pesquisado e subsidiar a avaliação.',
  'Análise de Mercado: Estudo das condições de oferta e demanda de imóveis semelhantes, visando identificar tendências e valores praticados.',
  'Avaliação de Bens: Processo técnico destinado à determinação de valores de bens, direitos ou empreendimentos, para uma finalidade específica.',
  'Avaliação Direta: Avaliação baseada em dados de mercado de bens comparáveis ao bem avaliando.',
  'Bem Avaliando: Bem objeto da avaliação.',
  'Benfeitoria: Obra ou melhoria incorporada ao imóvel, podendo ser necessária, útil ou voluptuária.',
  'Coeficiente de Variação: Medida estatística que relaciona o desvio padrão à média, indicando a dispersão relativa dos dados.',
  'Correlação: Medida estatística que expressa o grau de associação entre variáveis.',
  'Depreciação: Perda de valor do bem em decorrência de deterioração física, funcional ou econômica.',
  'Elasticidade de Preços: Variação percentual do preço de um bem em função de variações em seus atributos.',
  'Estimativa de Tendência Central: Valor que melhor representa o conjunto de dados, podendo ser média, mediana ou moda.',
  'Fator de Comercialização: Razão entre o valor de mercado de um imóvel e o seu custo de reedição.',
  'Homogeneização: Tratamento dos dados de mercado para torná-los comparáveis ao bem avaliando.',
  'Inferência Estatística: Processo de estimação de parâmetros populacionais a partir de dados amostrais.',
  'Método Comparativo Direto: Método que identifica o valor de mercado do bem por meio de tratamento técnico de atributos comparáveis.',
  'Método Evolutivo: Método que identifica o valor do bem pelo somatório dos valores do terreno e das benfeitorias, após aplicação do fator de comercialização.',
  'Valor de Liquidação Forçada: Valor de comercialização compulsória do bem, em prazo significativamente menor do que os observados no mercado.',
  'Valor de Mercado: Quantia mais provável pela qual um bem pode ser negociado, em condições normais de mercado, na data de referência.',
]

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: {
    paddingTop: 82,
    paddingBottom: 46,
    paddingLeft: 36,
    paddingRight: 36,
    fontSize: 9.5,
    fontFamily: 'Helvetica',
    color: '#1e293b',
    lineHeight: 1.4,
  },

  // ── Fixed Header — Conceito A ──────────────────────────
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  headerBg: {
    backgroundColor: '#17325C',
    paddingTop: 10,
    paddingBottom: 10,
    paddingHorizontal: 36,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  logo: { width: 88, height: 24, objectFit: 'contain' },
  headerSlogan: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#d4e4f5', marginTop: 2 },
  headerRight: { alignItems: 'flex-end' },
  headerLabel: { fontSize: 6.5, color: '#8FA4C7', letterSpacing: 1.5 },
  headerTitle: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#ffffff' },
  divBlue: { height: 3, backgroundColor: '#2347C6' },
  divGray: { height: 0.5, backgroundColor: '#C9D3E6' },

  // ── Fixed Footer — barra azul fina ────────────────────
  fixedFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 20,
    backgroundColor: '#17325C',
  },
  footerLine: { height: 0 },
  footerRow: { flexDirection: 'row' },
  footerCenter: { color: '#ffffff' },
  footerPage: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#ffffff' },

  // ── Typography — Conceito A ────────────────────────────
  h1: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: '#0f172a', marginBottom: 8 },
  h2: { fontSize: 11.5, fontFamily: 'Helvetica-Bold', color: '#17325C' },
  h2Num: { fontSize: 11.5, fontFamily: 'Helvetica-Bold', color: '#2347C6' },
  h2Wrap: { marginTop: 16, marginBottom: 6 },
  h2Border: { height: 1.5, backgroundColor: '#2347C6', marginTop: 4 },
  h3: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#17325C' },
  h3Num: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#2347C6' },
  h3Wrap: { marginTop: 10, marginBottom: 4 },
  h3Border: { height: 1, backgroundColor: '#C9D3E6', marginTop: 3 },
  p: { fontSize: 9.5, marginBottom: 5, lineHeight: 1.5, textAlign: 'justify' },
  bullet: { fontSize: 9.5, marginBottom: 3, lineHeight: 1.4 },
  bold: { fontFamily: 'Helvetica-Bold' },
  label: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#2347C6', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },

  // ── Layout ────────────────────────────────────────────
  row2: { flexDirection: 'row', gap: 8 },
  col50: { width: '50%' },

  // ── Card ──────────────────────────────────────────────
  card: { border: '0.5pt solid #C9D3E6', borderRadius: 3, padding: 8, marginBottom: 8 },

  // ── Value boxes — Conceito A ──────────────────────────
  valueBoxDark: { backgroundColor: '#17325C', border: '0.5pt solid #17325C', borderRadius: 3, padding: 8, marginBottom: 8 },
  valueBoxLight: { backgroundColor: '#EAF0FB', border: '0.5pt solid #c2d0e8', borderRadius: 3, padding: 8, marginBottom: 8 },
  vbLabel: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#2347C6', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  vbLabelDark: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#8FA4C7', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  vbNum: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#17325C' },
  vbNumDark: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#ffffff' },
  vbExt: { fontSize: 7.5, color: '#5a7090', marginTop: 1 },
  vbExtDark: { fontSize: 7.5, color: '#8FA4C7', marginTop: 1 },

  // ── Table ──────────────────────────────────────────────
  tRow: { flexDirection: 'row' },
  tRowAlt: { flexDirection: 'row', backgroundColor: '#f5f8fc' },
  tHead: { flexDirection: 'row', backgroundColor: '#EAF0FB' },
  tCell: {
    flex: 1, padding: '3pt 5pt', fontSize: 8.5,
    borderRight: '0.5pt solid #C9D3E6',
    borderBottom: '0.5pt solid #C9D3E6',
  },
  tCellBold: {
    flex: 1, padding: '3pt 5pt', fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    borderRight: '0.5pt solid #C9D3E6',
    borderBottom: '0.5pt solid #C9D3E6',
  },
  tWrap: { border: '0.5pt solid #C9D3E6', borderRadius: 2, marginBottom: 10, overflow: 'hidden' },

  // ── Cover page (capa inicial) ──────────────────────────
  coverPage: { backgroundColor: '#ffffff', fontFamily: 'Helvetica' },
  coverGeoHeader: { height: 130, backgroundColor: '#17325C', position: 'relative' },
  coverLogoArea: { position: 'absolute', top: 20, left: 32 },
  coverLogoName: { fontSize: 15, fontFamily: 'Helvetica-Bold', color: '#ffffff' },
  coverLogoSlogan: { fontSize: 7.5, color: '#b8cce4', marginTop: 2 },
  coverAccentLine: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, backgroundColor: '#2347C6' },
  coverBody: { flex: 1, paddingHorizontal: 48, paddingTop: 52, paddingBottom: 48 },
  coverNorma: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#8FA4C7', marginBottom: 24 },
  coverMainTitle: { fontSize: 34, fontFamily: 'Helvetica-Bold', color: '#17325C', lineHeight: 1.1, marginBottom: 6 },
  coverSubtitle: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#2347C6', marginBottom: 44 },
  coverLocLabel: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#8FA4C7', marginBottom: 4 },
  coverLocVal: { fontSize: 12.5, fontFamily: 'Helvetica-Bold', color: '#17325C' },
  coverDivider: { width: 32, height: 3, backgroundColor: '#2347C6', marginTop: 24, marginBottom: 24 },
  coverGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  coverCell: { width: '50%', marginBottom: 18, paddingRight: 12 },
  coverCellLabel: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#8FA4C7', marginBottom: 3 },
  coverCellVal: { fontSize: 10.5, color: '#1e293b' },

  // ── Sumário ───────────────────────────────────────────
  sumBox: { marginTop: 8 },
  sumItem: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingVertical: 4,
    paddingHorizontal: 2,
    borderBottom: '0.5pt solid #EAF0FB',
  },
  sumItemSub: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingVertical: 3,
    paddingHorizontal: 2,
    paddingLeft: 16,
    borderBottom: '0.5pt solid #f1f5f9',
  },
  sumTxt: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#17325C', flex: 1 },
  sumSub: { fontSize: 8.5, color: '#5a7090', flex: 1 },
  sumDots: { flex: 1, marginHorizontal: 6, marginBottom: 2, borderBottom: '0.5pt dashed #C9D3E6' },
  sumNum: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#2347C6', minWidth: 18, textAlign: 'right' },

  // ── Photos ────────────────────────────────────────────
  fotoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  fotoItem: { width: '47%' },
  fotoImg: { width: '100%', height: 90, objectFit: 'cover', borderRadius: 2, marginBottom: 3, border: '0.5pt solid #e2e8f0' },
  fotoLegenda: { fontSize: 8, color: '#475569' },
})

// ─── Fixed components ────────────────────────────────────────────────────────

function Header({ logoUrl }: { logoUrl: string }) {
  return (
    <View fixed style={s.fixedHeader}>
      <View style={s.headerBg}>
        <View style={s.headerRow}>
          <View>
            <Image src={logoUrl} style={s.logo} />
            <Text style={s.headerSlogan}>Precisão técnica que gera confiança</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.headerLabel}>LAUDO DE AVALIAÇÃO</Text>
            <Text style={s.headerTitle}>Lesath Engenharia</Text>
          </View>
        </View>
      </View>
      <View style={s.divBlue} />
      <View style={s.divGray} />
    </View>
  )
}

function Footer({ dataLaudo }: { dataLaudo?: string }) {
  return (
    <View fixed style={s.fixedFooter}>
      <Text style={{
        position: 'absolute', top: 6, left: 0, right: 0,
        textAlign: 'center', fontSize: 7.5, color: '#8FA4C7',
      }}>
        www.lesathengenharia.com.br
      </Text>
      <Text
        style={{
          position: 'absolute', top: 6, right: 36,
          fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#ffffff',
        }}
        render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
      />
    </View>
  )
}

// ─── Reusable primitives ─────────────────────────────────────────────────────

function H2({ children, id }: { children: React.ReactNode; id?: string }) {
  const text = Array.isArray(children)
    ? (children as unknown[]).map(String).join('')
    : typeof children === 'string' ? children : String(children ?? '')
  const m = text.match(/^(\d[\d.]*\.?)\s*(.+)$/)
  return (
    <View style={s.h2Wrap} id={id}>
      {m ? (
        <Text style={s.h2}>
          <Text style={s.h2Num}>{m[1]}{' '}</Text>
          <Text>{m[2]}</Text>
        </Text>
      ) : (
        <Text style={s.h2}>{text}</Text>
      )}
      <View style={s.h2Border} />
    </View>
  )
}

function H3({ children, id }: { children: React.ReactNode; id?: string }) {
  const text = Array.isArray(children)
    ? (children as unknown[]).map(String).join('')
    : typeof children === 'string' ? children : String(children ?? '')
  const m = text.match(/^(\d[\d.]*\.?)\s*(.+)$/)
  return (
    <View style={s.h3Wrap} id={id}>
      {m ? (
        <Text style={s.h3}>
          <Text style={s.h3Num}>{m[1]}{' '}</Text>
          <Text>{m[2]}</Text>
        </Text>
      ) : (
        <Text style={s.h3}>{text}</Text>
      )}
      <View style={s.h3Border} />
    </View>
  )
}

function P({ children }: { children: React.ReactNode }) {
  return <Text style={s.p}>{children}</Text>
}

function Bullet({ children }: { children: React.ReactNode }) {
  return <Text style={s.bullet}>• {children}</Text>
}

function TableWrap({ children }: { children: React.ReactNode }) {
  return <View style={s.tWrap}>{children}</View>
}

// ─── Main export ─────────────────────────────────────────────────────────────

export function LaudoPdf({
  dados,
  logoUrl,
}: {
  dados: DadosLaudo
  logoUrl: string
}) {
  const valorTerrenoN = cn(dados.valorTerreno)
  const valorBenfeitoriasN = cn(dados.valorBenfeitorias)
  const fatorComerc = cn(dados.fatorComercializacao)
  const prodOutros = (dados.outrosFatoresImovel || []).reduce(
    (t, i) => t * (cn(i.valor) || 1), 1
  )
  const subtotal = (valorTerrenoN + valorBenfeitoriasN) * fatorComerc
  const valorFinal = subtotal * prodOutros
  const valorArredondado = arredondar(valorFinal)
  const valorExtenso = numeroPorExtenso(valorArredondado)
  const vlf = cn(dados.valorLiquidezForcada || '')
  const vlfExtenso = vlf > 0 ? numeroPorExtenso(vlf) : ''
  const fotoFachada = (dados.fotos || []).find(
    (f) => f.legenda?.trim().toLowerCase() === 'fachada'
  )
  const gtex = obterTextoGarantia(dados.garantiaClassificacao, dados.garantiaObservacoes)
  const melhoramentos = dados.melhoramentosPublicos || {}

  // ── Capa Resumo — variáveis calculadas ──────────────────
  const metodologiaDisplay =
    dados.metodoAvaliacao === 'evolutivo'    ? 'Evolutivo'
    : dados.metodoAvaliacao === 'comparativo'? 'Comparativo Direto'
    : dados.metodoAvaliacao                 || '-'

  const capaGrauFund = (() => {
    if (dados.metodoAvaliacao === 'evolutivo') {
      const soma = (dados.fundamentacaoEvolutivo || []).reduce((s, i) => s + (i.pontos || 0), 0)
      if (soma >= 8) return 'III'; if (soma >= 5) return 'II'; if (soma >= 3) return 'I'; return '-'
    }
    const soma = (dados.fundamentacao || []).reduce((s, i) => s + (i.pontos || 0), 0)
    if (soma >= 10) return 'III'; if (soma >= 6) return 'II'; if (soma >= 4) return 'I'; return '-'
  })()

  const capaGrauPrec = (() => {
    const prec = dados.precisao || []
    if (prec.length === 0) return '-'
    if (prec.length === 1) return prec[0].grau || '-'
    const soma = prec.reduce((s, i) => s + (i.pontos || 0), 0)
    if (soma >= 8) return 'III'; if (soma >= 5) return 'II'; if (soma >= 3) return 'I'; return '-'
  })()

  const capaFatorLiq =
    vlf > 0 && valorArredondado > 0
      ? (vlf / valorArredondado).toFixed(2).replace('.', ',')
      : '-'

  const capaLiqDisplay =
    dados.liquidez === 'alta'  ? 'Liquidez Alta'
    : dados.liquidez === 'media' ? 'Liquidez Média'
    : dados.liquidez === 'baixa' ? 'Liquidez Baixa'
    : dados.liquidez            ? dados.liquidez
    : 'Liquidez Média'

  const hoje = new Date()
  const mesesPt = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro']
  const capaDataImpressao = `São Paulo, ${hoje.getDate()} de ${mesesPt[hoje.getMonth()]} de ${hoje.getFullYear()}`
  // ────────────────────────────────────────────────────────

  const finalidade = dados.finalidade === 'garantia'
    ? 'Avaliação para fins de garantia'
    : dados.finalidade === 'execucao'
    ? 'Avaliação para fins de execução'
    : dados.finalidade || 'Não informado'

  // Melhoramentos rows
  const melhorRows = [
    ['Rede de água', 'redeAgua', 'Rede Elétrica', 'redeEletrica'],
    ['Gás canalizado', 'gasCanalizado', 'Rede Telefônica', 'redeTelefonica'],
    ['Esgoto Sanitário', 'esgotoSanitario', 'Iluminação Pública', 'iluminacaoPublica'],
    ['Esgoto Pluvial', 'esgotoPluvial', 'Pavimentação', 'pavimentacao'],
    ['Fossa', 'fossa', 'Passeio', 'passeio'],
    ['Coleta de Lixo', 'coletaLixo', 'Guias', 'guias'],
    ['Lazer', 'lazer', 'Sarjetas', 'sarjetas'],
  ] as [string, string, string, string][]

  // Derived booleans for conditional sections
  const temSolicitante = !!dados.solicitante?.trim()
  const acabamentosPreenchidos = (dados.acabamentos || []).filter(
    (a) => a.ambiente?.trim() || a.acabamento?.trim()
  )
  const temAcabamentos = acabamentosPreenchidos.length > 0
  const temConsideracoes =
    (dados.resumoMercado && dados.resumoMercado.length > 0) ||
    !!dados.liquidez ||
    !!dados.desempenhoMercado ||
    !!(dados.consideracoesMercado || '').trim()
  const temFundamentacao =
    (dados.fundamentacao && dados.fundamentacao.length > 0) ||
    (dados.fundamentacaoEvolutivo && dados.fundamentacaoEvolutivo.length > 0) ||
    (dados.fundamentacaoInferencia && dados.fundamentacaoInferencia.length > 0)
  const temPrecisao = dados.precisao && dados.precisao.length > 0

  // Dynamic sub-section numbering for section 6
  let _sec6 = 0
  const sec6Croqui      = (dados.croquis && dados.croquis.length > 0) ? `6.${++_sec6}` : null
  const sec6Encravado   = dados.terrenoEncravado   ? `6.${++_sec6}` : null
  const sec6CursoAgua   = dados.confrontacaoCursoAgua ? `6.${++_sec6}` : null

  // Sumário items — cada item tem id de âncora para links internos
  const sumSections: { txt: string; sub: boolean; id: string }[] = [
    { txt: 'CAPA RESUMO',                                                         sub: false, id: 'capa-resumo' },
    { txt: 'SUMÁRIO',                                                              sub: false, id: 'sumario' },
    { txt: '1. IMÓVEL',                                                            sub: false, id: 's-1' },
    { txt: '2. OBJETIVO',                                                          sub: false, id: 's-2' },
    { txt: '3. PROPRIETÁRIO',                                                      sub: false, id: 's-3' },
    ...(temSolicitante ? [{ txt: '3.1. SOLICITANTE / INTERESSADO', sub: true, id: 's-3-1' }] : []),
    { txt: '4. OBSERVAÇÕES PRELIMINARES',                                          sub: false, id: 's-4' },
    { txt: '5. CARACTERIZAÇÃO DA REGIÃO',                                          sub: false, id: 's-5' },
    { txt: '6. CARACTERIZAÇÃO DO IMÓVEL',                                          sub: false, id: 's-6' },
    ...(sec6Croqui    ? [{ txt: `${sec6Croqui}. CROQUI`,                                         sub: true, id: 's-6-croqui' }]     : []),
    ...(sec6Encravado ? [{ txt: `${sec6Encravado}. CONDIÇÕES ESPECÍFICAS — Terreno Encravado`,   sub: true, id: 's-6-enc' }]        : []),
    ...(sec6CursoAgua ? [{ txt: `${sec6CursoAgua}. CONDIÇÕES ESPECÍFICAS — Curso D'Água`,        sub: true, id: 's-6-agua' }]       : []),
    ...(temAcabamentos ? [{ txt: '7. ACABAMENTOS',                                               sub: false, id: 's-7' }]            : []),
    ...(temConsideracoes ? [{ txt: '8. CONSIDERAÇÕES SOBRE O MERCADO',                           sub: false, id: 's-8' }]            : []),
    { txt: '9. GLOSSÁRIO DE TERMOS TÉCNICOS (ABNT NBR 14653-2)',                   sub: false, id: 's-9' },
    { txt: '10. METODOLOGIA, PESQUISAS E CÁLCULOS',                                sub: false, id: 's-10' },
    ...(dados.imagemBenfeitorias ? [{ txt: '10.1 CÁLCULO DAS BENFEITORIAS',        sub: true, id: 's-10-1' }]                        : []),
    { txt: '11. VALOR DO IMÓVEL',                                                  sub: false, id: 's-11' },
    ...(temFundamentacao ? [{ txt: '12. DETERMINAÇÃO DO GRAU DE FUNDAMENTAÇÃO',    sub: false, id: 's-12' }]                         : []),
    ...(temPrecisao ? [{ txt: '12.02 GRAU DE PRECISÃO',                            sub: true,  id: 's-12-02' }]                      : []),
    { txt: '13. CONCLUSÃO',                                                        sub: false, id: 's-13' },
    ...(gtex.titulo ? [{ txt: '14. GARANTIA',                                      sub: false, id: 's-14' }]                         : []),
    { txt: '15. ANEXOS E ASSINATURA RESPONSÁVEL TÉCNICO',                          sub: false, id: 's-15' },
    ...(dados.documentacaoPdf ? [{ txt: '15.1. DOCUMENTAÇÃO',                      sub: true,  id: 's-15-1' }]                       : []),
    ...(dados.fotos && dados.fotos.length > 0 ? [{ txt: '15.2. RELATÓRIO FOTOGRÁFICO', sub: true, id: 's-15-2' }]                    : []),
    ...(dados.localizacaoComparativos ? [{ txt: '15.3. LOCALIZAÇÃO DOS ELEMENTOS COMPARATIVOS', sub: true, id: 's-15-3' }]           : []),
    ...(dados.calculoPdf ? [{ txt: '15.4. CÁLCULO',                                sub: true,  id: 's-15-4' }]                       : []),
  ]

  return (
    <Document>

      {/* ════════════════════════════════════════════════════
          PÁGINA 1 — CAPA INICIAL (sem header/footer)
      ════════════════════════════════════════════════════ */}
      <Page size="A4" style={s.coverPage}>
        {/* Cabeçalho geométrico — faixas diagonais, igual à visualização */}
        <View style={{ height: 130, backgroundColor: '#17325C', overflow: 'hidden' }}>
          {/* Faixa diagonal 1 — azul médio */}
          <View style={{ position: 'absolute', top: -10, right: '11.54%', width: '50%', height: 180, backgroundColor: '#1e4a85', transform: 'skewX(-18deg)' }} />
          {/* Faixa diagonal 2 — azul vivo */}
          <View style={{ position: 'absolute', top: -10, right: '1.92%', width: '28.85%', height: 180, backgroundColor: '#2347C6', opacity: 0.55, transform: 'skewX(-18deg)' }} />
          {/* Faixa diagonal 3 — azul suave */}
          <View style={{ position: 'absolute', top: 0, right: '34.62%', width: '17.31%', height: 180, backgroundColor: '#2e5ea3', opacity: 0.6, transform: 'skewX(-18deg)' }} />
          {/* Linha de acento azul no rodapé do header */}
          <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, backgroundColor: '#2347C6' }} />
          {/* Textos */}
          <View style={{ position: 'absolute', top: 20, left: 32 }}>
            <Text style={{ fontSize: 15, fontFamily: 'Helvetica-Bold', color: '#ffffff' }}>Lesath Engenharia</Text>
            <Text style={{ fontSize: 7.5, color: '#b8cce4', marginTop: 2 }}>Precisão técnica que gera confiança</Text>
          </View>
        </View>
        <View style={s.coverBody}>
          <Text style={s.coverNorma}>NBR 14653</Text>
          <Text style={s.coverMainTitle}>{'Laudo de\nAvaliação'}</Text>
          <Text style={s.coverSubtitle}>{finalidade}</Text>
          <Text style={s.coverLocLabel}>LOCALIZAÇÃO DO IMÓVEL</Text>
          <Text style={s.coverLocVal}>{dados.cidadePrincipal}</Text>
          <View style={s.coverDivider} />
          <View style={s.coverGrid}>
            {[
              { lbl: 'PROPRIETÁRIO',       val: dados.proprietario || '-' },
              { lbl: 'SOLICITANTE',         val: dados.solicitante || 'Não informado' },
              { lbl: 'FINALIDADE',          val: finalidade },
              { lbl: 'MATRÍCULA',           val: dados.matricula || '-' },
              { lbl: 'RESPONSÁVEL TÉCNICO', val: dados.responsavelNome || '-' },
              { lbl: 'DATA DO LAUDO',       val: fd(dados.dataLaudo || '') },
            ].map((item, i) => (
              <View key={i} style={s.coverCell}>
                <Text style={s.coverCellLabel}>{item.lbl}</Text>
                <Text style={s.coverCellVal}>{item.val}</Text>
              </View>
            ))}
          </View>
        </View>
      </Page>

      {/* ════════════════════════════════════════════════════
          PÁGINA 2 — CAPA RESUMO (sem header/footer)
      ════════════════════════════════════════════════════ */}
      <Page size="A4" style={{ backgroundColor: '#ffffff', fontFamily: 'Helvetica', fontSize: 9 }}>

        {/* Barra superior */}
        <View style={{ height: 8, backgroundColor: '#17325C', flexDirection: 'row' }}>
          <View style={{ flex: 1 }} />
          <View style={{ width: '45%', backgroundColor: '#2347C6' }} />
        </View>

        {/* Cabeçalho */}
        <View style={{ backgroundColor: '#17325C', paddingHorizontal: 22, paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View>
            <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#8FA4C7', letterSpacing: 1.5, marginBottom: 2 }}>NBR 14653</Text>
            <Text style={{ fontSize: 16, fontFamily: 'Helvetica-Bold', color: '#ffffff', lineHeight: 1.1 }}>Capa Resumo</Text>
            <Text style={{ fontSize: 8, color: '#b8cce4', marginTop: 2 }}>Laudo de Avaliação — {dados.cidadePrincipal || 'Joinville'}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <View style={{ backgroundColor: '#1a3a6e', borderRadius: 3, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 4 }}>
              <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#b8cce4', letterSpacing: 1 }}>LAUDO DE AVALIAÇÃO</Text>
            </View>
            <Text style={{ fontSize: 9.5, fontFamily: 'Helvetica-Bold', color: '#ffffff' }}>Lesath Engenharia</Text>
            <Text style={{ fontSize: 7.5, color: '#8FA4C7', marginTop: 1 }}>Precisão técnica que gera confiança</Text>
          </View>
        </View>

        {/* Barra de endereço */}
        <View style={{ backgroundColor: '#2347C6', paddingHorizontal: 22, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: 'rgba(255,255,255,0.7)', letterSpacing: 1 }}>ENDEREÇO</Text>
          <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#ffffff', flex: 1 }}>{dados.endereco}</Text>
        </View>

        {/* Corpo */}
        <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 14 }}>

          {/* Grid: Fachada + Identificação */}
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 10 }}>
            {/* Fachada */}
            <View style={{ flex: 1, border: '1pt solid #d0daea', borderRadius: 3, overflow: 'hidden' }}>
              <View style={{ backgroundColor: '#17325C', paddingHorizontal: 8, paddingVertical: 4 }}>
                <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#ffffff', letterSpacing: 1 }}>FACHADA DO IMÓVEL</Text>
              </View>
              {fotoFachada ? (
                <Image src={fotoFachada.preview} style={{ width: '100%', height: 114, objectFit: 'cover' }} />
              ) : (
                <View style={{ height: 114, backgroundColor: '#c9d8e8', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 8, color: '#6b87a8' }}>Foto da fachada do imóvel avaliando</Text>
                </View>
              )}
            </View>

            {/* Tabela de identificação */}
            <View style={{ flex: 1, border: '1pt solid #d0daea', borderRadius: 3, overflow: 'hidden' }}>
              <View style={{ backgroundColor: '#17325C', paddingHorizontal: 8, paddingVertical: 4 }}>
                <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#ffffff', letterSpacing: 1 }}>IDENTIFICAÇÃO</Text>
              </View>
              {([
                ['Objetivo',      'Determinação de Valor de Mercado'],
                ['Finalidade',    finalidade],
                ['Solicitante',   dados.solicitante || '-'],
                ['Proprietário',  dados.proprietario || '-'],
                ['Tipo do Imóvel',dados.tipo || '-'],
                ['Metodologia',   metodologiaDisplay],
                ['Matrícula',     dados.matricula || '-'],
              ] as [string, string][]).map(([label, value], idx) => (
                <View key={idx} style={{ flexDirection: 'row', backgroundColor: idx % 2 === 0 ? '#f5f8fc' : '#ffffff', borderBottom: '0.5pt solid #e8eef7' }}>
                  <Text style={{ width: '38%', paddingHorizontal: 7, paddingVertical: 3, fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#3a5070' }}>{label}</Text>
                  <Text style={{ flex: 1, paddingHorizontal: 7, paddingVertical: 3, fontSize: 7.5, color: '#17325C' }}>{value}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Strip de áreas */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
            {([
              { label: 'ÁREA DE TERRENO',     value: dados.areaTerrenoTotal    || '-', unit: 'm²' },
              { label: 'ÁREA CONSTRUÍDA',     value: dados.areaConstruidaTotal || '0', unit: 'm²' },
              { label: 'FATOR DE LIQUIDAÇÃO', value: capaFatorLiq,                    unit: capaLiqDisplay },
            ] as { label: string; value: string; unit: string }[]).map((card, idx) => (
              <View key={idx} style={{ flex: 1, border: '1pt solid #d0daea', borderRadius: 3, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: '#f5f8fc', alignItems: 'center' }}>
                <Text style={{ fontSize: 6, fontFamily: 'Helvetica-Bold', color: '#8FA4C7', letterSpacing: 0.8, marginBottom: 2 }}>{card.label}</Text>
                <Text style={{ fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#17325C' }}>{card.value}</Text>
                <Text style={{ fontSize: 7.5, color: '#5a7090', marginTop: 1 }}>{card.unit}</Text>
              </View>
            ))}
          </View>

          {/* Cards de valores */}
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
            <View style={[s.valueBoxDark, { flex: 1 }]}>
              <Text style={s.vbLabelDark}>Valor de Avaliação</Text>
              <Text style={s.vbNumDark}>{fm(valorArredondado)}</Text>
              <Text style={s.vbExtDark}>{valorExtenso.charAt(0).toUpperCase() + valorExtenso.slice(1)}</Text>
            </View>
            <View style={[s.valueBoxLight, { flex: 1 }]}>
              <Text style={s.vbLabel}>Valor de Liquidez Forçada</Text>
              {vlf > 0 ? (
                <>
                  <Text style={s.vbNum}>{fm(vlf)}</Text>
                  <Text style={s.vbExt}>{vlfExtenso.charAt(0).toUpperCase() + vlfExtenso.slice(1)}</Text>
                  <View style={{ marginTop: 4, backgroundColor: '#fff', borderRadius: 2, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start', border: '0.5pt solid #c2d0e8' }}>
                    <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#2347C6' }}>Fator {capaFatorLiq} · {capaLiqDisplay}</Text>
                  </View>
                </>
              ) : (
                <Text style={{ fontSize: 9, color: '#8FA4C7' }}>Não informado</Text>
              )}
            </View>
          </View>

          {/* Strip de especificação */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
            {([
              { label: 'GRAU DE FUNDAMENTAÇÃO', value: capaGrauFund },
              { label: 'GRAU DE PRECISÃO',      value: capaGrauPrec },
              { label: 'METODOLOGIA APLICADA',  value: metodologiaDisplay },
            ] as { label: string; value: string }[]).map((card, idx) => (
              <View key={idx} style={{ flex: 1, border: '1pt solid #d0daea', borderRadius: 3, overflow: 'hidden' }}>
                <View style={{ backgroundColor: '#EAF0FB', paddingHorizontal: 8, paddingVertical: 3.5 }}>
                  <Text style={{ fontSize: 6, fontFamily: 'Helvetica-Bold', color: '#2347C6', letterSpacing: 0.8 }}>{card.label}</Text>
                </View>
                <View style={{ paddingHorizontal: 8, paddingVertical: 5 }}>
                  <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#17325C' }}>{card.value}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Rodapé: duas assinaturas */}
          <View style={{ borderTop: '1pt solid #d0daea', paddingTop: 10 }}>
            <View style={{ flexDirection: 'row', gap: 20 }}>
              <View style={{ flex: 1 }}>
                <View style={{ height: 24, borderBottom: '1pt solid #17325C', marginBottom: 4 }} />
                <Text style={{ fontSize: 9.5, fontFamily: 'Helvetica-Bold', color: '#17325C' }}>{dados.responsavelNome || 'Responsável Técnico'}</Text>
                <Text style={{ fontSize: 8, color: '#5a7090', marginTop: 1 }}>Responsável Técnica</Text>
                {dados.responsavelRegistro ? <Text style={{ fontSize: 8, color: '#5a7090', marginTop: 1 }}>{dados.responsavelRegistro}</Text> : null}
                <Text style={{ fontSize: 7.5, color: '#5a7090', marginTop: 2, fontFamily: 'Helvetica-Oblique' }}>Lesath Engenharia – Craveiro, Leandro e Palma Serviços de Engenharia Ltda</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ height: 24, borderBottom: '1pt solid #17325C', marginBottom: 4 }} />
                <Text style={{ fontSize: 9.5, fontFamily: 'Helvetica-Bold', color: '#17325C' }}>Gustavo Hènriqüe A. Leandro</Text>
                <Text style={{ fontSize: 8, color: '#5a7090', marginTop: 1 }}>Responsável Legal</Text>
                <Text style={{ fontSize: 8, color: 'transparent', marginTop: 1 }}>—</Text>
                <Text style={{ fontSize: 7.5, color: '#5a7090', marginTop: 2, fontFamily: 'Helvetica-Oblique' }}>Lesath Engenharia – Craveiro, Leandro e Palma Serviços de Engenharia Ltda</Text>
              </View>
            </View>
            <Text style={{ fontSize: 8, color: '#6b87a8', textAlign: 'center', marginTop: 10 }}>{capaDataImpressao}</Text>
          </View>

        </View>

        {/* Barra inferior */}
        <View style={{ height: 5, backgroundColor: '#17325C', flexDirection: 'row', position: 'absolute', bottom: 0, left: 0, right: 0 }}>
          <View style={{ width: '35%', backgroundColor: '#2347C6' }} />
          <View style={{ flex: 1 }} />
        </View>
      </Page>

      {/* ════════════════════════════════════════════════════
          PÁGINA 3 — SUMÁRIO (página exclusiva)
      ════════════════════════════════════════════════════ */}
      <Page size="A4" style={s.page}>
        <Header logoUrl={logoUrl} />
        <Footer dataLaudo={dados.dataLaudo} />

        {/* Título do sumário */}
        <H2 id="sumario">SUMÁRIO</H2>

        {/* Faixa de aviso de navegação */}
        <View style={{ backgroundColor: '#EAF0FB', border: '0.5pt solid #c2d0e8', borderRadius: 3, padding: '5pt 8pt', marginBottom: 10 }}>
          <Text style={{ fontSize: 7.5, color: '#2347C6', fontFamily: 'Helvetica-Bold' }}>
            Clique em qualquer item para navegar até a seção correspondente
          </Text>
        </View>

        <View style={s.sumBox}>
          {sumSections.map((sec, idx) => (
            <Link key={idx} src={`#${sec.id}`} style={{ textDecoration: 'none' }}>
              <View style={sec.sub ? s.sumItemSub : s.sumItem}>
                <Text style={sec.sub ? s.sumSub : s.sumTxt}>{sec.txt}</Text>
                <View style={s.sumDots} />
                <Text style={s.sumNum}>›</Text>
              </View>
            </Link>
          ))}
        </View>
      </Page>

      {/* ════════════════════════════════════════════════════
          DEMAIS PÁGINAS — com cabeçalho e rodapé fixos
      ════════════════════════════════════════════════════ */}
      <Page size="A4" style={s.page}>
        <Header logoUrl={logoUrl} />
        <Footer dataLaudo={dados.dataLaudo} />

        {/* ────────────────────────────────────────────────────
            SEÇÕES 1 – 5
        ──────────────────────────────────────────────────── */}
        <H2 id="s-1">1. IMÓVEL</H2>
        <P>A presente avaliação tem por objetivo determinar o valor de mercado do imóvel localizado em:</P>
        <P>{dados.endereco}.</P>
        <P>Trata-se de imóvel caracterizado como {dados.tipo}, conforme características observadas em vistoria.</P>

        <H2 id="s-2">2. OBJETIVO</H2>
        <P>Trata-se de avaliação para fins de {dados.finalidade === 'garantia' ? 'garantia' : 'execução'}.</P>

        <H2 id="s-3">3. PROPRIETÁRIO</H2>
        <P>{dados.proprietario || 'Não informado'}.</P>

        {temSolicitante && (
          <>
            <H2 id="s-3-1">3.1. SOLICITANTE / INTERESSADO</H2>
            <P>{dados.solicitante}.</P>
          </>
        )}

        <H2 id="s-4">4. OBSERVAÇÕES PRELIMINARES</H2>
        <P>O presente laudo fundamenta-se nas diretrizes da NBR 14653 da ABNT, com base nas informações constatadas em vistoria, nos documentos apresentados e em dados obtidos junto ao mercado.</P>
        <P>Para a presente avaliação, considerou-se o imóvel localizado em {dados.endereco}, caracterizado como {dados.tipo}, conforme características observadas na data da vistoria.</P>
        <P>Considerou-se, ainda, que o imóvel encontra-se livre e desembaraçado de ônus, em condições normais de comercialização, não tendo sido realizadas investigações específicas quanto à exatidão documental, aspectos estruturais ou eventuais passivos ambientais.</P>

        <H2 id="s-5">5. CARACTERIZAÇÃO DA REGIÃO</H2>
        <P>O imóvel avaliado encontra-se inserido em região com acesso a pontos de referência relevantes da localidade, destacando-se:</P>
        {dados.referencia1 && dados.distancia1 && <Bullet>Distância até {dados.referencia1}: {dados.distancia1}.</Bullet>}
        {dados.referencia2 && dados.distancia2 && <Bullet>Distância até {dados.referencia2}: {dados.distancia2}.</Bullet>}
        {dados.referencia3 && dados.distancia3 && <Bullet>Distância até {dados.referencia3}: {dados.distancia3}.</Bullet>}
        {dados.cidadePrincipal && dados.distanciaCidadePrincipal && (
          <Bullet>Distância até a cidade de {dados.cidadePrincipal}: {dados.distanciaCidadePrincipal}.</Bullet>
        )}
        {dados.coordenadasImovel && (
          <P>Coordenadas Geográficas do imóvel avaliando: {dados.coordenadasImovel}</P>
        )}

        {/* ────────────────────────────────────────────────────
            SEÇÃO 6 — CARACTERIZAÇÃO DO IMÓVEL
        ──────────────────────────────────────────────────── */}
        <H2 id="s-6">6. CARACTERIZAÇÃO DO IMÓVEL</H2>

        {/* Tabela principal */}
        <TableWrap>
          <View style={s.tHead}>
            <Text style={[s.tCellBold, { flex: 2, textAlign: 'center' }]}>Características principais</Text>
          </View>
          {[
            ['Tipo do Imóvel', dados.tipo],
            ['Matrícula', dados.matricula],
            ['Padrão', dados.padrao],
            ['Idade aparente', dados.idadeAparente ? `${dados.idadeAparente} anos` : '-'],
            ['Estado de Conservação', dados.estadoConservacao],
            ['IPTU', dados.iptu || '-'],
            ['Especificações de divisões',
              (dados.divisoes || []).filter(d => d.quantidade && d.ambiente)
                .map(d => `${d.quantidade} ${d.ambiente}`).join(', ') || '-'],
            ['Área construída total', dados.areaConstruidaTotal || '-'],
            ['Área construída averbada', dados.areaConstruidaAverbada || '-'],
            ...((dados.areaConstruidaNaoAverbada ?? 0) > 0
              ? [['Área construída não averbada', `${dados.areaConstruidaNaoAverbada} m²`]] : []),
            ['Área de terreno total', dados.areaTerrenoTotal || '-'],
            ['Área de terreno averbada', dados.areaTerrenoAverbada || '-'],
            ...((dados.areaTerrenoNaoAverbada ?? 0) > 0
              ? [['Área de terreno não averbada', `${dados.areaTerrenoNaoAverbada} m²`]] : []),
          ].map(([label, value], idx) => (
            <View key={idx} style={idx % 2 === 0 ? s.tRow : s.tRowAlt}>
              <Text style={[s.tCellBold, { flex: 1.2 }]}>{label}</Text>
              <Text style={[s.tCell, { flex: 2 }]}>{value}</Text>
            </View>
          ))}
        </TableWrap>

        {/* Melhoramentos Públicos */}
        {Object.keys(melhoramentos).length > 0 && (
          <TableWrap>
            <View style={s.tHead}>
              <Text style={[s.tCellBold, { flex: 4, textAlign: 'center' }]}>Melhoramentos Públicos</Text>
            </View>
            {melhorRows.map(([l1, c1, l2, c2], idx) => (
              <View key={idx} style={idx % 2 === 0 ? s.tRow : s.tRowAlt}>
                <Text style={[s.tCellBold, { flex: 1.2 }]}>{l1}</Text>
                <Text style={[s.tCell, { flex: 0.8, textAlign: 'center' }]}>{melhoramentos[c1] || '-'}</Text>
                <Text style={[s.tCellBold, { flex: 1.2 }]}>{l2}</Text>
                <Text style={[s.tCell, { flex: 0.8, textAlign: 'center' }]}>{melhoramentos[c2] || '-'}</Text>
              </View>
            ))}
          </TableWrap>
        )}

        {/* ────────────────────────────────────────────────────
            6.1 CROQUI
        ──────────────────────────────────────────────────── */}
        {sec6Croqui && dados.croquis && dados.croquis.length > 0 && (
          <>
            <H2 id="s-6-croqui">{sec6Croqui}. CROQUI</H2>
            {dados.croquis.map((c, idx) => (
              <View key={idx} style={{ marginBottom: 8 }}>
                <Image
                  src={c.preview}
                  style={{ width: '100%', maxHeight: 200, objectFit: 'contain', border: '0.5pt solid #C9D3E6', borderRadius: 2 }}
                />
              </View>
            ))}
          </>
        )}

        {/* ────────────────────────────────────────────────────
            6.2 TERRENO ENCRAVADO
        ──────────────────────────────────────────────────── */}
        {sec6Encravado && dados.terrenoEncravado && (
          <>
            <H2 id="s-6-enc">{sec6Encravado}. CONDIÇÕES ESPECÍFICAS DO TERRENO</H2>
            <H3>Terreno Encravado</H3>
            {TEXTO_TERRENO_ENCRAVADO.split('\n\n').map((paragrafo, idx) => (
              <P key={idx}>{paragrafo}</P>
            ))}
            {dados.observacoesTerrenoEncravado && (
              <P>Observações específicas: {dados.observacoesTerrenoEncravado}</P>
            )}
          </>
        )}

        {/* ────────────────────────────────────────────────────
            6.3 CONFRONTAÇÃO COM CURSO D'ÁGUA
        ──────────────────────────────────────────────────── */}
        {sec6CursoAgua && dados.confrontacaoCursoAgua && (
          <>
            <H2 id="s-6-agua">{sec6CursoAgua}. CONDIÇÕES ESPECÍFICAS DO TERRENO</H2>
            <H3>Confrontação com Curso D&apos;Água</H3>
            {TEXTO_CURSO_DAGUA.split('\n\n').map((paragrafo, idx) => (
              <P key={idx}>{paragrafo}</P>
            ))}
            {dados.observacoesConfrontacaoCursoAgua && (
              <P>Observações específicas: {dados.observacoesConfrontacaoCursoAgua}</P>
            )}
          </>
        )}

        {/* ────────────────────────────────────────────────────
            SEÇÃO 7 — ACABAMENTOS
        ──────────────────────────────────────────────────── */}
        {temAcabamentos && (
          <>
            <H2 id="s-7">7. ACABAMENTOS</H2>
            <TableWrap>
              <View style={s.tHead}>
                <Text style={[s.tCellBold, { flex: 1 }]}>Ambientes</Text>
                <Text style={[s.tCellBold, { flex: 2 }]}>Acabamentos</Text>
              </View>
              {acabamentosPreenchidos.map((item, idx) => (
                <View key={idx} style={s.tRow}>
                  <Text style={[s.tCell, { flex: 1 }]}>{item.ambiente}</Text>
                  <Text style={[s.tCell, { flex: 2 }]}>{item.acabamento}</Text>
                </View>
              ))}
            </TableWrap>
          </>
        )}

        {/* ────────────────────────────────────────────────────
            SEÇÃO 8 — CONSIDERAÇÕES SOBRE O MERCADO
        ──────────────────────────────────────────────────── */}
        {temConsideracoes && (
          <>
            <H2 id="s-8">8. CONSIDERAÇÕES SOBRE O MERCADO</H2>

            {(dados.resumoMercado?.length > 0 || dados.liquidez || dados.desempenhoMercado) && (
              <TableWrap>
                <View style={s.tHead}>
                  <Text style={[s.tCellBold, { flex: 1.5 }]}>Campo</Text>
                  <Text style={[s.tCellBold, { flex: 4 }]}>Descrição</Text>
                </View>
                {(dados.resumoMercado || []).map((r, idx) => (
                  <View key={idx} style={s.tRow}>
                    <Text style={[s.tCell, { flex: 1.5 }]}>{r.campo}</Text>
                    <Text style={[s.tCell, { flex: 4 }]}>{r.descricao}</Text>
                  </View>
                ))}
                {dados.liquidez && (
                  <View style={s.tRow}>
                    <Text style={[s.tCellBold, { flex: 1.5 }]}>Liquidez</Text>
                    <Text style={[s.tCell, { flex: 4 }]}>
                      {dados.liquidez === 'alta' ? 'Alta' : dados.liquidez === 'media' ? 'Média' : dados.liquidez === 'baixa' ? 'Baixa' : dados.liquidez}
                    </Text>
                  </View>
                )}
                {dados.desempenhoMercado && (
                  <View style={s.tRow}>
                    <Text style={[s.tCellBold, { flex: 1.5 }]}>Desempenho do Mercado</Text>
                    <Text style={[s.tCell, { flex: 4 }]}>
                      {dados.desempenhoMercado === 'alto' ? 'Alto' : dados.desempenhoMercado === 'medio' ? 'Médio' : dados.desempenhoMercado === 'baixo' ? 'Baixo' : dados.desempenhoMercado}
                    </Text>
                  </View>
                )}
              </TableWrap>
            )}

            {(dados.consideracoesMercado || '').split(/\n\s*\n+/).filter(Boolean).map((p, idx) => (
              <P key={idx}>{p.replace(/\n+/g, ' ').trim()}</P>
            ))}
          </>
        )}

        {/* ────────────────────────────────────────────────────
            SEÇÃO 9 — GLOSSÁRIO
        ──────────────────────────────────────────────────── */}
        <H2 id="s-9">9. GLOSSÁRIO DE TERMOS TÉCNICOS (ABNT NBR 14653-2)</H2>
        {GLOSSARIO.map((item, idx) => (
          <Text key={idx} style={[s.bullet, { marginBottom: 5 }]}>• {item}</Text>
        ))}

        {/* ────────────────────────────────────────────────────
            SEÇÃO 10 — METODOLOGIA, PESQUISAS E CÁLCULOS
        ──────────────────────────────────────────────────── */}
        <H2 id="s-10">10. METODOLOGIA, PESQUISAS E CÁLCULOS</H2>
        {dados.periodoPesquisaInicio && dados.periodoPesquisaFim && (
          <P>• <Text style={s.bold}>Período de abrangência da pesquisa:</Text> {fd(dados.periodoPesquisaInicio)} a {fd(dados.periodoPesquisaFim)}</P>
        )}
        {dados.tipoInformacoesObtidas && (
          <P>• <Text style={s.bold}>Tipo de informações obtidas:</Text> {dados.tipoInformacoesObtidas}</P>
        )}
        {dados.caracteristicasTerreno && (
          <P>• <Text style={s.bold}>Características:</Text> {dados.caracteristicasTerreno}</P>
        )}
        <P>Após os tratamentos e homogeneizações, foi desenvolvido um modelo com os seguintes fatores considerados:</P>
        {(dados.fatoresSelecionados || []).map((f, idx) => (
          <Bullet key={idx}>{f}</Bullet>
        ))}

        {/* ────────────────────────────────────────────────────
            SEÇÃO 10.1 — CÁLCULO DAS BENFEITORIAS
        ──────────────────────────────────────────────────── */}
        {dados.imagemBenfeitorias && (
          <>
            <H2 id="s-10-1">10.1 CÁLCULO DAS BENFEITORIAS</H2>
            <Image
              src={dados.imagemBenfeitorias}
              style={{ width: '100%', maxHeight: 180, objectFit: 'contain', border: '0.5pt solid #C9D3E6', borderRadius: 2, marginBottom: 8 }}
            />
          </>
        )}

        {/* ────────────────────────────────────────────────────
            SEÇÃO 11 — VALOR DO IMÓVEL
        ──────────────────────────────────────────────────── */}
        <H2 id="s-11">11. VALOR DO IMÓVEL</H2>
        <P>a. <Text style={s.bold}>Valor do Terreno:</Text> {fm(valorTerrenoN)}</P>
        <P>b. <Text style={s.bold}>Valor das Benfeitorias:</Text> {fm(valorBenfeitoriasN)}</P>
        <P>c. <Text style={s.bold}>Fator de Comercialização:</Text> {dados.fatorComercializacao || '1,00'}</P>
        {(() => {
          const fatoresValidos = (dados.outrosFatoresImovel || []).filter(
            f => f.descricao?.trim() || f.valor?.trim()
          )
          return fatoresValidos.length > 0 ? (
            <View>
              <H3>Outros fatores</H3>
              {fatoresValidos.map((f, idx) => (
                <P key={idx}>• <Text style={s.bold}>{f.descricao}:</Text> {f.valor}</P>
              ))}
            </View>
          ) : null
        })()}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
          <View style={[s.valueBoxDark, { flex: 1 }]}>
            <Text style={s.vbLabelDark}>Valor de Avaliação</Text>
            <Text style={s.vbNumDark}>{fm(valorArredondado)}</Text>
            <Text style={s.vbExtDark}>{valorExtenso.charAt(0).toUpperCase() + valorExtenso.slice(1)}</Text>
          </View>
          <View style={[s.valueBoxLight, { flex: 1 }]}>
            <Text style={s.vbLabel}>Valor de Liquidez Forçada</Text>
            {vlf > 0 ? (
              <>
                <Text style={s.vbNum}>{fm(vlf)}</Text>
                <Text style={s.vbExt}>{vlfExtenso.charAt(0).toUpperCase() + vlfExtenso.slice(1)}</Text>
              </>
            ) : (
              <Text style={{ fontSize: 9, color: '#8FA4C7' }}>Não informado</Text>
            )}
          </View>
        </View>

        {/* ────────────────────────────────────────────────────
            SEÇÃO 12 — FUNDAMENTAÇÃO E PRECISÃO
        ──────────────────────────────────────────────────── */}
        {(temFundamentacao || temPrecisao) && (() => {
          const fund    = dados.fundamentacao            || []
          const fundEvo = dados.fundamentacaoEvolutivo   || []
          const fundInf = dados.fundamentacaoInferencia  || []
          const metodo     = dados.metodoAvaliacao || ''
          const tratamento = dados.tratamentoDados || ''

          const gv = (g?: string) => g === 'III' ? 3 : g === 'II' ? 2 : g === 'I' ? 1 : 0

          const somaFund = fund.reduce((s, i) => s + (i.pontos || 0), 0)
          const somaEvo  = fundEvo.reduce((s, i) => s + (i.pontos || 0), 0)
          const somaInf  = fundInf.reduce((s, i) => s + (i.pontos || 0), 0)

          // Enquadramento — Fatores
          const encFatores = (() => {
            const g2 = gv(fund[1]?.grau), g4 = gv(fund[3]?.grau)
            const outros = [fund[0], fund[2]]
            if (somaFund >= 10 && g2 >= 3 && g4 >= 3 && outros.every(i => gv(i?.grau) >= 2)) return 'III'
            if (somaFund >= 6  && g2 >= 2 && g4 >= 2 && outros.every(i => gv(i?.grau) >= 1)) return 'II'
            if (somaFund >= 4  && fund.every(i => gv(i?.grau) >= 1)) return 'I'
            return ''
          })()

          // Enquadramento — Evolutivo
          const encEvolutivo = (() => {
            if (somaEvo >= 8 && fundEvo.every(i => gv(i?.grau) >= 2)) return 'III'
            if (somaEvo >= 5 && gv(fundEvo[0]?.grau) >= 2 && gv(fundEvo[1]?.grau) >= 2) return 'II'
            if (somaEvo >= 3 && fundEvo.every(i => gv(i?.grau) >= 1)) return 'I'
            return ''
          })()

          // Enquadramento — Inferência
          const encInferencia = (() => {
            const man = [fundInf[1], fundInf[3], fundInf[4], fundInf[5]]
            const oth = [fundInf[0], fundInf[2]]
            if (somaInf >= 16 && man.every(i => gv(i?.grau) >= 3) && oth.every(i => gv(i?.grau) >= 2)) return 'III'
            if (somaInf >= 10 && man.every(i => gv(i?.grau) >= 2) && oth.every(i => gv(i?.grau) >= 1)) return 'II'
            if (somaInf >= 6  && fundInf.every(i => gv(i?.grau) >= 1)) return 'I'
            return ''
          })()

          // Quais tabelas exibir — mesma lógica do viewer
          const exibirFatores    = fund.length > 0    && !(metodo === 'evolutivo' && tratamento === 'inferencia_estatistica')
          const exibirEvolutivo  = fundEvo.length > 0 && metodo === 'evolutivo'
          const exibirInferencia = fundInf.length > 0 && tratamento === 'inferencia_estatistica'

          // Cor ativa (azul)
          const ca = (cond: boolean): object => cond
            ? { backgroundColor: '#2347C6', color: '#ffffff', fontFamily: 'Helvetica-Bold' }
            : {}

          // ── Conteúdo das linhas ──────────────────────────────
          const linhasFund = [
            { item: 1, desc: 'Caracterização do imóvel avaliando',                           iii: 'Completa quanto a todos os fatores analisados',                                                                                             ii: 'Completa quanto aos fatores utilizados no tratamento',                                   i: 'Adoção de situação paradigma' },
            { item: 2, desc: 'Quantidade mínima de dados de mercado efetivamente utilizados', iii: '12',                                                                                                                                       ii: '5',                                                                                     i: '3' },
            { item: 3, desc: 'Identificação dos dados de mercado',                           iii: 'Apresentação das informações relativas a todas as características dos dados analisados, com foto e características observadas pelo autor do laudo', ii: 'Apresentação das informações relativas a todas as características dos dados analisados', i: 'Apresentação das informações relativas a todas as características dos dados correspondentes aos fatores utilizados' },
            { item: 4, desc: 'Intervalo admissível de ajuste para o conjunto de fatores',    iii: '0,80 a 1,25',                                                                                                                              ii: '0,5 a 2,00',                                                                           i: '0,40 a 2,50' },
          ]
          const linhasEvo = [
            { item: 1, desc: 'Estimativa do valor do terreno',    iii: 'Grau III de fundamentação no método comparativo ou no involutivo', ii: 'Grau II de fundamentação no método comparativo ou no involutivo', i: 'Grau I de fundamentação no método comparativo ou no involutivo' },
            { item: 2, desc: 'Estimativa dos Custos de Reedição', iii: 'Grau III de fundamentação no método da quantificação de custo',   ii: 'Grau II de fundamentação no método da quantificação de custo',   i: 'Grau I de fundamentação no método da quantificação de custo' },
            { item: 3, desc: 'Fator de Comercialização',          iii: 'Inferido em mercado semelhante',                                  ii: 'Justificado',                                                     i: 'Arbitrado' },
          ]
          const linhasInf = [
            { item: 1, desc: 'Caracterização do imóvel avaliando',                                                     iii: 'Completa quanto a todas as variáveis analisadas',                                                                                                                                                                        ii: 'Completa quanto às variáveis utilizadas no modelo',                                                                                                                                                                              i: 'Adoção da situação paradigma' },
            { item: 2, desc: 'Quantidade mínima de dados do mercado',                                                   iii: '6 (k+1), onde k é o número de variáveis independentes',                                                                                                                                                                  ii: '4 (k+1), onde k é o número de variáveis independentes',                                                                                                                                                                         i: '3 (k+1), onde k é o número de variáveis independentes' },
            { item: 3, desc: 'Identificação dos dados de mercado',                                                      iii: 'Apresentação de informações relativas a todos os dados e variáveis analisados na modelagem, com foto e características observadas no local pelo autor do laudo',                                                           ii: 'Apresentação de informações relativas a todos os dados e variáveis analisadas na modelagem',                                                                                                                                    i: 'Apresentação de informações relativas aos dados e variáveis efetivamente utilizados no modelo' },
            { item: 4, desc: 'Extrapolação',                                                                            iii: 'Não admitida',                                                                                                                                                                                                           ii: 'Admitida para apenas uma variável, desde que: a) medidas do avaliando não superiores a 100% do limite amostral superior, nem inferiores à metade do inferior; b) valor estimado não ultrapasse 15% do calculado no limite da fronteira amostral, em módulo', i: 'Admitida para apenas uma variável, desde que: a) medidas do avaliando não superiores a 100% do limite amostral superior, nem inferiores à metade do inferior; b) valor estimado não ultrapasse 20% do calculado no limite da fronteira amostral, em módulo' },
            { item: 5, desc: 'Nível de significância máximo para rejeição da hipótese nula de cada regressor (teste bicaudal)',  iii: '10%', ii: '20%', i: '30%' },
            { item: 6, desc: 'Nível de significância máximo admitido para rejeição da hipótese nula do modelo (teste F de Snedecor)', iii: '1%', ii: '2%', i: '5%' },
          ]

          // ── Componente: tabela detalhada ─────────────────────
          const TabelaFundPdf = ({ titulo, linhas, dadosGrau, soma, obs }: {
            titulo: string
            linhas: { item: number; desc: string; iii: string; ii: string; i: string }[]
            dadosGrau: { item: number; grau: string; pontos: number }[]
            soma: number
            obs?: string
          }) => (
            <View style={{ marginBottom: 8 }}>
              <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#17325C', marginBottom: 4 }}>{titulo}</Text>
              <View style={s.tWrap}>
                {/* Cabeçalho */}
                <View style={{ flexDirection: 'row', backgroundColor: '#d1d5db' }}>
                  <Text style={[s.tCellBold, { flex: 0.3, textAlign: 'center', fontSize: 7.5 }]}>Item</Text>
                  <Text style={[s.tCellBold, { flex: 1.5, fontSize: 7.5 }]}>Descrição</Text>
                  <Text style={[s.tCellBold, { flex: 0.8, textAlign: 'center', fontSize: 7.5 }]}>III</Text>
                  <Text style={[s.tCellBold, { flex: 0.8, textAlign: 'center', fontSize: 7.5 }]}>II</Text>
                  <Text style={[s.tCellBold, { flex: 0.8, textAlign: 'center', fontSize: 7.5 }]}>I</Text>
                  <Text style={[s.tCellBold, { flex: 0.35, textAlign: 'center', fontSize: 7.5 }]}>Pts</Text>
                </View>
                {/* Linhas de dados */}
                {linhas.map((l, idx) => {
                  const g = dadosGrau[idx]?.grau || ''
                  return (
                    <View key={idx} style={{ flexDirection: 'row', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f5f8fc' }}>
                      <Text style={[s.tCellBold, { flex: 0.3, textAlign: 'center', fontSize: 7.5 }]}>{l.item}</Text>
                      <Text style={[s.tCell, { flex: 1.5, fontSize: 7 }]}>{l.desc}</Text>
                      <Text style={[s.tCell, { flex: 0.8, textAlign: 'center', fontSize: 7, ...ca(g === 'III') }]}>{l.iii}</Text>
                      <Text style={[s.tCell, { flex: 0.8, textAlign: 'center', fontSize: 7, ...ca(g === 'II') }]}>{l.ii}</Text>
                      <Text style={[s.tCell, { flex: 0.8, textAlign: 'center', fontSize: 7, ...ca(g === 'I') }]}>{l.i}</Text>
                      <Text style={[s.tCellBold, { flex: 0.35, textAlign: 'center', fontSize: 7.5 }]}>{g ? dadosGrau[idx].pontos : ''}</Text>
                    </View>
                  )
                })}
                {/* Somatória */}
                <View style={{ flexDirection: 'row', backgroundColor: '#EAF0FB' }}>
                  <Text style={[s.tCellBold, { flex: 4.25, textAlign: 'right', fontSize: 7.5, paddingRight: 8 }]}>Somatória</Text>
                  <Text style={[s.tCellBold, { flex: 0.35, textAlign: 'center', fontSize: 7.5 }]}>{soma}</Text>
                </View>
              </View>
              {obs ? <Text style={{ fontSize: 7, color: '#5a7090', marginTop: 2 }}>Obs: {obs}</Text> : null}
            </View>
          )

          // ── Componente: enquadramento Fatores ────────────────
          const EnquadramentoFatores = ({ enc }: { enc: string }) => (
            <View style={{ marginBottom: 10 }}>
              <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', marginBottom: 3 }}>Tabela 4 - Enquadramento do laudo segundo seu grau de fundamentação no caso de utilização de tratamento por fatores.</Text>
              <View style={s.tWrap}>
                <View style={{ flexDirection: 'row', backgroundColor: '#f3f4f6' }}>
                  <Text style={[s.tCellBold, { flex: 1, textAlign: 'center', fontSize: 7.5 }]}>Graus</Text>
                  <Text style={[s.tCellBold, { flex: 1, textAlign: 'center', fontSize: 7.5, ...ca(enc === 'III') }]}>III</Text>
                  <Text style={[s.tCellBold, { flex: 1, textAlign: 'center', fontSize: 7.5, ...ca(enc === 'II') }]}>II</Text>
                  <Text style={[s.tCellBold, { flex: 1, textAlign: 'center', fontSize: 7.5, ...ca(enc === 'I') }]}>I</Text>
                </View>
                <View style={{ flexDirection: 'row', backgroundColor: '#f9fafb' }}>
                  <Text style={[s.tCellBold, { flex: 1, textAlign: 'center', fontSize: 7.5 }]}>Pontos mínimos</Text>
                  <Text style={[s.tCell, { flex: 1, textAlign: 'center', fontSize: 7.5, ...ca(enc === 'III') }]}>10</Text>
                  <Text style={[s.tCell, { flex: 1, textAlign: 'center', fontSize: 7.5, ...ca(enc === 'II') }]}>6</Text>
                  <Text style={[s.tCell, { flex: 1, textAlign: 'center', fontSize: 7.5, ...ca(enc === 'I') }]}>4</Text>
                </View>
                <View style={{ flexDirection: 'row' }}>
                  <Text style={[s.tCellBold, { flex: 1, textAlign: 'center', fontSize: 7 }]}>Itens obrigatórios</Text>
                  <Text style={[s.tCell, { flex: 1, textAlign: 'center', fontSize: 7, ...ca(enc === 'III') }]}>Itens 2 e 4 no grau III, com os demais no mínimo no grau II</Text>
                  <Text style={[s.tCell, { flex: 1, textAlign: 'center', fontSize: 7, ...ca(enc === 'II') }]}>Itens 2 e 4 no grau II, com os demais no mínimo no grau I</Text>
                  <Text style={[s.tCell, { flex: 1, textAlign: 'center', fontSize: 7, ...ca(enc === 'I') }]}>Todos, no mínimo no grau I.</Text>
                </View>
              </View>
              <View style={{ alignSelf: 'flex-end', marginTop: 4, flexDirection: 'row', border: '0.5pt solid #C9D3E6', borderRadius: 2 }}>
                <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', padding: '4pt 10pt', backgroundColor: '#f1f5f9', borderRight: '0.5pt solid #C9D3E6' }}>Enquadramento Fundamentação</Text>
                <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', padding: '4pt 16pt', ...(enc ? { backgroundColor: '#2347C6', color: '#ffffff' } : {}) }}>{enc || '-'}</Text>
              </View>
            </View>
          )

          // ── Componente: enquadramento Evolutivo ──────────────
          const EnquadramentoEvolutivo = ({ enc }: { enc: string }) => (
            <View style={{ marginBottom: 10 }}>
              <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', marginBottom: 3 }}>Enquadramento do laudo segundo seu grau de fundamentação no caso de utilização do Método Evolutivo</Text>
              <View style={s.tWrap}>
                <View style={{ flexDirection: 'row', backgroundColor: '#f3f4f6' }}>
                  <Text style={[s.tCellBold, { flex: 1, textAlign: 'center', fontSize: 7.5 }]}>Grau</Text>
                  <Text style={[s.tCellBold, { flex: 1, textAlign: 'center', fontSize: 7.5, ...ca(enc === 'III') }]}>III</Text>
                  <Text style={[s.tCellBold, { flex: 1, textAlign: 'center', fontSize: 7.5, ...ca(enc === 'II') }]}>II</Text>
                  <Text style={[s.tCellBold, { flex: 1, textAlign: 'center', fontSize: 7.5, ...ca(enc === 'I') }]}>I</Text>
                </View>
                <View style={{ flexDirection: 'row', backgroundColor: '#f9fafb' }}>
                  <Text style={[s.tCellBold, { flex: 1, textAlign: 'center', fontSize: 7.5 }]}>Pontos mínimos</Text>
                  <Text style={[s.tCell, { flex: 1, textAlign: 'center', fontSize: 7.5, ...ca(enc === 'III') }]}>8</Text>
                  <Text style={[s.tCell, { flex: 1, textAlign: 'center', fontSize: 7.5, ...ca(enc === 'II') }]}>5</Text>
                  <Text style={[s.tCell, { flex: 1, textAlign: 'center', fontSize: 7.5, ...ca(enc === 'I') }]}>3</Text>
                </View>
                <View style={{ flexDirection: 'row' }}>
                  <Text style={[s.tCellBold, { flex: 1, textAlign: 'center', fontSize: 7 }]}>Itens obrigatórios</Text>
                  <Text style={[s.tCell, { flex: 1, textAlign: 'center', fontSize: 7, ...ca(enc === 'III') }]}>1, 2 e 3 no mínimo grau II</Text>
                  <Text style={[s.tCell, { flex: 1, textAlign: 'center', fontSize: 7, ...ca(enc === 'II') }]}>1 e 2, no mínimo no grau II</Text>
                  <Text style={[s.tCell, { flex: 1, textAlign: 'center', fontSize: 7, ...ca(enc === 'I') }]}>Todos, no mínimo no grau I</Text>
                </View>
              </View>
              <View style={{ alignSelf: 'flex-end', marginTop: 4, flexDirection: 'row', border: '0.5pt solid #C9D3E6', borderRadius: 2 }}>
                <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', padding: '4pt 10pt', backgroundColor: '#f1f5f9', borderRight: '0.5pt solid #C9D3E6' }}>Enquadramento Fundamentação</Text>
                <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', padding: '4pt 16pt', ...(enc ? { backgroundColor: '#2347C6', color: '#ffffff' } : {}) }}>{enc ? `Grau ${enc}` : '-'}</Text>
              </View>
            </View>
          )

          // ── Componente: enquadramento Inferência ─────────────
          const EnquadramentoInferencia = ({ enc }: { enc: string }) => (
            <View style={{ marginBottom: 10 }}>
              <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', marginBottom: 3 }}>Enquadramento do laudo segundo seu grau de fundamentação no caso de utilização de modelos de regressão linear</Text>
              <View style={s.tWrap}>
                <View style={{ flexDirection: 'row', backgroundColor: '#f3f4f6' }}>
                  <Text style={[s.tCellBold, { flex: 1, textAlign: 'center', fontSize: 7.5 }]}>Grau</Text>
                  <Text style={[s.tCellBold, { flex: 1, textAlign: 'center', fontSize: 7.5, ...ca(enc === 'III') }]}>III</Text>
                  <Text style={[s.tCellBold, { flex: 1, textAlign: 'center', fontSize: 7.5, ...ca(enc === 'II') }]}>II</Text>
                  <Text style={[s.tCellBold, { flex: 1, textAlign: 'center', fontSize: 7.5, ...ca(enc === 'I') }]}>I</Text>
                </View>
                <View style={{ flexDirection: 'row', backgroundColor: '#f9fafb' }}>
                  <Text style={[s.tCellBold, { flex: 1, textAlign: 'center', fontSize: 7.5 }]}>Pontos mínimos</Text>
                  <Text style={[s.tCell, { flex: 1, textAlign: 'center', fontSize: 7.5, ...ca(enc === 'III') }]}>16</Text>
                  <Text style={[s.tCell, { flex: 1, textAlign: 'center', fontSize: 7.5, ...ca(enc === 'II') }]}>10</Text>
                  <Text style={[s.tCell, { flex: 1, textAlign: 'center', fontSize: 7.5, ...ca(enc === 'I') }]}>6</Text>
                </View>
                <View style={{ flexDirection: 'row' }}>
                  <Text style={[s.tCellBold, { flex: 1, textAlign: 'center', fontSize: 7 }]}>Itens obrigatórios</Text>
                  <Text style={[s.tCell, { flex: 1, textAlign: 'center', fontSize: 7, ...ca(enc === 'III') }]}>2, 4, 5 e 6 no grau III e os demais no mínimo no grau II</Text>
                  <Text style={[s.tCell, { flex: 1, textAlign: 'center', fontSize: 7, ...ca(enc === 'II') }]}>2, 4, 5 e 6 no mínimo no grau II e os demais no mínimo no grau I</Text>
                  <Text style={[s.tCell, { flex: 1, textAlign: 'center', fontSize: 7, ...ca(enc === 'I') }]}>Todos, no mínimo no grau I</Text>
                </View>
              </View>
              <View style={{ alignSelf: 'flex-end', marginTop: 4, flexDirection: 'row', border: '0.5pt solid #C9D3E6', borderRadius: 2 }}>
                <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', padding: '4pt 10pt', backgroundColor: '#f1f5f9', borderRight: '0.5pt solid #C9D3E6' }}>Enquadramento Fundamentação</Text>
                <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', padding: '4pt 16pt', ...(enc ? { backgroundColor: '#2347C6', color: '#ffffff' } : {}) }}>{enc ? `Grau ${enc}` : '-'}</Text>
              </View>
            </View>
          )

          // ── Componente: grau de precisão ─────────────────────
          const PrecisaoPdf = () => {
            const prec = dados.precisao || []
            const gp = prec[0]?.grau || ''
            return (
              <View style={{ marginBottom: 8 }}>
                <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', marginBottom: 3 }}>Grau de precisão</Text>
                <View style={s.tWrap}>
                  <View style={{ flexDirection: 'row', backgroundColor: '#d1d5db' }}>
                    <Text style={[s.tCellBold, { flex: 0.3, textAlign: 'center', fontSize: 7.5 }]}>Item</Text>
                    <Text style={[s.tCellBold, { flex: 2, fontSize: 7.5 }]}>Descrição</Text>
                    <Text style={[s.tCellBold, { flex: 0.7, textAlign: 'center', fontSize: 7.5, ...ca(gp === 'III') }]}>III</Text>
                    <Text style={[s.tCellBold, { flex: 0.7, textAlign: 'center', fontSize: 7.5, ...ca(gp === 'II') }]}>II</Text>
                    <Text style={[s.tCellBold, { flex: 0.7, textAlign: 'center', fontSize: 7.5, ...ca(gp === 'I') }]}>I</Text>
                  </View>
                  <View style={{ flexDirection: 'row' }}>
                    <Text style={[s.tCellBold, { flex: 0.3, textAlign: 'center', fontSize: 7.5 }]}>1</Text>
                    <Text style={[s.tCell, { flex: 2, fontSize: 7 }]}>Amplitude do intervalo de confiança de 80% em torno da estimativa de tendência central</Text>
                    <Text style={[s.tCell, { flex: 0.7, textAlign: 'center', fontSize: 7.5, ...ca(gp === 'III') }]}>{"<= 30%"}</Text>
                    <Text style={[s.tCell, { flex: 0.7, textAlign: 'center', fontSize: 7.5, ...ca(gp === 'II') }]}>{"<= 40%"}</Text>
                    <Text style={[s.tCell, { flex: 0.7, textAlign: 'center', fontSize: 7.5, ...ca(gp === 'I') }]}>{"<= 50%"}</Text>
                  </View>
                </View>
              </View>
            )
          }

          // ── Renderização ─────────────────────────────────────
          return (
            <>
              {temFundamentacao && (
                <>
                  <H2 id="s-12">12. DETERMINAÇÃO DO GRAU DE FUNDAMENTAÇÃO</H2>

                  {exibirFatores && (
                    <>
                      <TabelaFundPdf
                        titulo="Grau de fundamentação — tratamento por fatores (Avaliação do terreno)"
                        linhas={linhasFund}
                        dadosGrau={fund}
                        soma={somaFund}
                        obs="Para menos de 5 dados de mercado, o intervalo deverá ser 0,8 a 1,25."
                      />
                      <EnquadramentoFatores enc={encFatores} />
                    </>
                  )}

                  {exibirEvolutivo && (
                    <>
                      <TabelaFundPdf
                        titulo="Grau de fundamentação — Método Evolutivo"
                        linhas={linhasEvo}
                        dadosGrau={fundEvo}
                        soma={somaEvo}
                      />
                      <EnquadramentoEvolutivo enc={encEvolutivo} />
                    </>
                  )}

                  {exibirInferencia && (
                    <>
                      <TabelaFundPdf
                        titulo="Grau de fundamentação — Modelos de Regressão Linear"
                        linhas={linhasInf}
                        dadosGrau={fundInf}
                        soma={somaInf}
                      />
                      <EnquadramentoInferencia enc={encInferencia} />
                    </>
                  )}
                </>
              )}

              {temPrecisao && (
                <>
                  <H2 id="s-12-02">12.02 GRAU DE PRECISÃO</H2>
                  <PrecisaoPdf />
                </>
              )}
            </>
          )
        })()}

        {/* ────────────────────────────────────────────────────
            SEÇÃO 13 — CONCLUSÃO
        ──────────────────────────────────────────────────── */}
        <H2 id="s-13">13. CONCLUSÃO</H2>
        <P>Fundamentados nos elementos e condições consignados no presente Laudo de Avaliação, atribuímos ao imóvel em questão o seguinte valor de mercado:</P>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
          <View style={[s.valueBoxDark, { flex: 1 }]}>
            <Text style={s.vbLabelDark}>Valor de Avaliação</Text>
            <Text style={s.vbNumDark}>{fm(valorArredondado)}</Text>
            <Text style={s.vbExtDark}>{valorExtenso.charAt(0).toUpperCase() + valorExtenso.slice(1)}</Text>
          </View>
          {vlf > 0 ? (
            <View style={[s.valueBoxLight, { flex: 1 }]}>
              <Text style={s.vbLabel}>Valor de Liquidez Forçada</Text>
              <Text style={s.vbNum}>{fm(vlf)}</Text>
              <Text style={s.vbExt}>{vlfExtenso.charAt(0).toUpperCase() + vlfExtenso.slice(1)}</Text>
            </View>
          ) : (
            <View style={[s.valueBoxLight, { flex: 1 }]}>
              <Text style={s.vbLabel}>Subtotal</Text>
              <Text style={s.vbNum}>{fm(valorFinal)}</Text>
              <Text style={s.vbExt}>Antes do arredondamento</Text>
            </View>
          )}
        </View>

        {/* ────────────────────────────────────────────────────
            SEÇÃO 14 — GARANTIA
        ──────────────────────────────────────────────────── */}
        {gtex.titulo && (
          <>
            <H2 id="s-14">14. GARANTIA</H2>
            <P><Text style={s.bold}>{gtex.titulo}</Text></P>
            <P>{gtex.texto}</P>
          </>
        )}

        {/* ────────────────────────────────────────────────────
            SEÇÃO 15 — ANEXOS E ASSINATURA
        ──────────────────────────────────────────────────── */}
        <H2 id="s-15">15. ANEXOS E ASSINATURA RESPONSÁVEL TÉCNICO</H2>
        <View style={s.card}>
          <P>{fd(dados.dataLaudo || '')}</P>
          <P><Text style={s.bold}>Responsável Técnico:</Text> {dados.responsavelNome}</P>
          <P><Text style={s.bold}>CPF:</Text> {dados.responsavelCpf}</P>
          <P><Text style={s.bold}>CREA/CAU:</Text> {dados.responsavelRegistro}</P>
          <P><Text style={s.bold}>Empresa:</Text> LESATH ENGENHARIA</P>
          <P><Text style={s.bold}>CNPJ:</Text> 49.068.717/0001-64</P>
          <View style={{ marginTop: 24, borderTop: '0.5pt solid #94A3B8', paddingTop: 4, width: 160, alignSelf: 'center' }}>
            <Text style={{ fontSize: 8.5, textAlign: 'center', color: '#475569' }}>Assinatura</Text>
          </View>
        </View>

        {/* ────────────────────────────────────────────────────
            15.1 DOCUMENTAÇÃO
        ──────────────────────────────────────────────────── */}
        {dados.documentacaoPdfPaginas && dados.documentacaoPdfPaginas.length > 0 && (
          <>
            <H2 id="s-15-1">15.1. DOCUMENTAÇÃO</H2>
            {dados.documentacaoPdfPaginas.map((pagImg, idx) => (
              <View key={idx} break={idx === 0} style={{ width: '100%', height: 706 }}>
                <Image
                  src={pagImg}
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              </View>
            ))}
          </>
        )}

        {/* ────────────────────────────────────────────────────
            15.2 RELATÓRIO FOTOGRÁFICO
        ──────────────────────────────────────────────────── */}
        {dados.fotos && dados.fotos.length > 0 && (
          <>
            <H2>15.2. RELATÓRIO FOTOGRÁFICO</H2>
            <View style={s.fotoGrid}>
              {dados.fotos.map((foto, idx) => (
                <View key={idx} style={s.fotoItem}>
                  <Image src={foto.preview} style={s.fotoImg} />
                  <Text style={s.fotoLegenda}><Text style={s.bold}>Legenda:</Text> {foto.legenda || 'Sem legenda'}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* ────────────────────────────────────────────────────
            15.3 LOCALIZAÇÃO DOS ELEMENTOS COMPARATIVOS
        ──────────────────────────────────────────────────── */}
        {dados.localizacaoComparativos && (
          <>
            <H2>15.3. LOCALIZAÇÃO DOS ELEMENTOS COMPARATIVOS</H2>
            <Image
              src={dados.localizacaoComparativos}
              style={{ width: '100%', maxHeight: 220, objectFit: 'contain', border: '0.5pt solid #C9D3E6', borderRadius: 2 }}
            />
          </>
        )}

        {/* ────────────────────────────────────────────────────
            15.4 CÁLCULO
        ──────────────────────────────────────────────────── */}
        {dados.calculoPdfPaginas && dados.calculoPdfPaginas.length > 0 && (
          <>
            <H2 id="s-15-4">15.4. CÁLCULO</H2>
            {dados.calculoPdfPaginas.map((pagImg, idx) => (
              <View key={idx} break={idx === 0} style={{ width: '100%', height: 706 }}>
                <Image
                  src={pagImg}
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              </View>
            ))}
          </>
        )}
      </Page>
    </Document>
  )
}
