'use client'

import React from 'react'
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
} from '@react-pdf/renderer'
// Tipo local — evita dependência de caminho relativo que varia conforme a
// localização do arquivo no projeto. Mantém compatibilidade com DadosLaudo.
type DadosLaudo = Record<string, any>

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fd(data?: string) {
  if (!data) return ''
  const [ano, mes, dia] = data.split('-')
  return `${dia}/${mes}/${ano}`
}
function fm(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function cn(valor?: string) {
  if (!valor) return 0
  const limpo = valor
    .replace(/[R$\s]/g, '')
    .replace(/\.(?=\d{3}[,.])/g, '')
    .replace(/\.(?=\d{3}$)/g, '')
    .replace(',', '.')
    .replace(/[^\d.-]/g, '')
  return Number(limpo) || 0
}
function numeroPorExtenso(valor: number): string {
  const un = ['','um','dois','três','quatro','cinco','seis','sete','oito','nove','dez','onze','doze','treze','quatorze','quinze','dezesseis','dezessete','dezoito','dezenove']
  const dz = ['','','vinte','trinta','quarenta','cinquenta','sessenta','setenta','oitenta','noventa']
  const ct = ['','cento','duzentos','trezentos','quatrocentos','quinhentos','seiscentos','setecentos','oitocentos','novecentos']
  function ate999(n: number): string {
    if (n===0) return ''
    if (n===100) return 'cem'
    if (n<20) return un[n]
    if (n<100) { const d=Math.floor(n/10),r=n%10; return r?`${dz[d]} e ${un[r]}`:dz[d] }
    const c=Math.floor(n/100),r=n%100
    return r===0?ct[c]:`${ct[c]} e ${ate999(r)}`
  }
  function inteiro(n: number): string {
    if (n===0) return 'zero'
    const mi=Math.floor(n/1_000_000),ml=Math.floor((n%1_000_000)/1_000),re=n%1_000
    const p: string[]=[]
    if (mi>0) p.push(mi===1?'um milhão':`${ate999(mi)} milhões`)
    if (ml>0) p.push(ml===1?'mil':`${ate999(ml)} mil`)
    if (re>0) p.push(ate999(re))
    if (p.length===1) return p[0]
    if (p.length===2) return `${p[0]} e ${p[1]}`
    return p.slice(0,-1).join(', ')+' e '+p[p.length-1]
  }
  return `${inteiro(Math.round(valor))} reais`
}
function cap(s: string) { return s.charAt(0).toUpperCase()+s.slice(1) }
function metLabel(m?: string) {
  if (m==='comparativo') return 'Método Comparativo Direto de Dados de Mercado - Tratamento por fatores'
  if (m==='evolutivo')   return 'Método Evolutivo'
  return m||'-'
}
function arredondar(v: number) { return Math.round(v * 100) / 100 }
function fa(valor?: string) {
  if (!valor) return '-'
  const n = parseFloat(valor.replace(',','.'))
  if (isNaN(n)) return valor
  return n.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})+' m²'
}
function chunkArray<T>(arr: T[], n: number): T[][] {
  const out: T[][]=[]
  for(let i=0;i<arr.length;i+=n) out.push(arr.slice(i,i+n))
  return out
}

// ─── Paleta ───────────────────────────────────────────────────────────────────

const AZUL   = '#1a3564'
const AZUL2  = '#2347C6'
const AZULLT = '#EAF0FB'
const CINZA  = '#C9D3E6'
const BRANCO = '#ffffff'
const TEXTO  = '#1e293b'

// ─── Estilos ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  // Página — fundo branco, flexColumn para header + content + footer
  page: {
    backgroundColor: BRANCO,
    flexDirection: 'column',
    fontSize: 8,
    fontFamily: 'Helvetica',
    color: TEXTO,
    lineHeight: 1.35,
  },
  // Área de conteúdo — cresce para ocupar o espaço entre header e footer
  content: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 8,
    paddingBottom: 6,
  },
  // Header
  header: {
    backgroundColor: AZUL,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 18,
  },
  headerAccent: { height: 2.5, backgroundColor: AZUL2 },
  headerLogoTxt: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: BRANCO },
  headerSub:     { fontSize: 8,  color: '#8FA4C7', marginTop: 1 },
  headerTag:     { fontSize: 8,  color: '#8FA4C7', letterSpacing: 1 },
  headerMeta:    { fontSize: 7.5,color: '#b8cce4', marginTop: 1 },
  // Footer
  footer: {
    backgroundColor: AZUL,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 18,
  },
  footerTxt: { fontSize: 7.5, color: '#8FA4C7' },
  footerPag: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: BRANCO },
  // Seção header
  secHeader: {
    backgroundColor: AZUL,
    paddingVertical: 3.5,
    paddingHorizontal: 8,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  secBadge: { backgroundColor: AZUL2, paddingVertical: 1.5, paddingHorizontal: 5, marginRight: 6 },
  secTitle: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: BRANCO, letterSpacing: 0.5 },
  // Título central
  titleBand: {
    backgroundColor: AZUL2,
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginBottom: 6,
    marginTop: 4,
  },
  titleTxt: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: BRANCO, textAlign: 'center' },
  // Tabela
  table:   { width: '100%', borderWidth: 0.5, borderColor: CINZA, marginTop: 3 },
  row:     { flexDirection: 'row', borderBottomWidth: 0.5, borderColor: CINZA },
  rowLast: { flexDirection: 'row' },
  cellLbl: { backgroundColor: AZULLT, paddingVertical: 3, paddingHorizontal: 5, fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: AZUL },
  cellVal: { paddingVertical: 3, paddingHorizontal: 5, fontSize: 7.5, color: TEXTO },
  cellHead:{ backgroundColor: AZULLT, paddingVertical: 3, paddingHorizontal: 5, fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: AZUL, textAlign: 'center' },
  // Valores
  valorRow:  { flexDirection: 'row', gap: 5, marginTop: 5, marginBottom: 4 },
  valorDark: { flex: 1, backgroundColor: AZUL, padding: 8, borderRadius: 2 },
  valorLight:{ flex: 1, backgroundColor: AZULLT, borderWidth: 0.5, borderColor: CINZA, padding: 8, borderRadius: 2 },
  valorLbl:  { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#8FA4C7', letterSpacing: 0.5 },
  valorLblD: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: AZUL2, letterSpacing: 0.5 },
  valorNum:  { fontSize: 14, fontFamily: 'Helvetica-Bold', color: BRANCO, marginTop: 3 },
  valorNumD: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: AZUL,   marginTop: 3 },
  valorExt:  { fontSize: 7, color: '#8FA4C7', marginTop: 1 },
  valorExtD: { fontSize: 7, color: '#5a7090', marginTop: 1 },
  // Graus
  grauRow: { flexDirection: 'row', gap: 5, marginTop: 4, marginBottom: 6 },
  grauBox: { flex: 1, borderWidth: 0.5, borderColor: CINZA },
  grauLbl: { backgroundColor: AZULLT, paddingVertical: 2.5, paddingHorizontal: 4, fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: AZUL, textAlign: 'center' },
  grauNum: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: AZUL2, textAlign: 'center', paddingVertical: 6 },
  // Assinatura
  signArea: { alignItems: 'center', marginTop: 18 },
  signLine: { width: 160, height: 0.5, backgroundColor: '#334155', marginBottom: 3 },
  signNome: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: AZUL },
  signSub:  { fontSize: 7.5, color: '#475569' },
  // Fotos
  foto:      { width: '100%', height: 120, objectFit: 'cover', borderWidth: 0.5, borderColor: CINZA, marginTop: 6, marginBottom: 4 },
  fotosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 6 },
  fotoItem:  { width: '48.5%' },
  fotoImg:   { height: 95, objectFit: 'cover', borderWidth: 0.5, borderColor: CINZA },
  fotoLeg:   { backgroundColor: AZULLT, paddingVertical: 2, paddingHorizontal: 4, fontSize: 7, color: AZUL, borderWidth: 0.5, borderColor: CINZA, borderTopWidth: 0 },
  // Texto
  txt:     { fontSize: 8, color: TEXTO, lineHeight: 1.5, marginTop: 4 },
  txtBold: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: AZUL },

  // ─── Estilos MK-style (Pesquisa + Homog + Memorial) ──────────────
  // Card de elemento comparativo
  elemHeader: {
    backgroundColor: AZUL,
    paddingVertical: 2.5,
    paddingHorizontal: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  elemHeaderTxt: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: BRANCO, letterSpacing: 0.5 },
  elemHeaderSub: { fontSize: 7, color: '#cfddef' },
  elemTable: { borderWidth: 0.5, borderColor: CINZA, borderTopWidth: 0 },
  elemRow: { flexDirection: 'row' },
  elemRowB: { flexDirection: 'row', borderBottomWidth: 0.5, borderColor: CINZA },
  elemCellLbl: { backgroundColor: AZULLT, paddingVertical: 2.5, paddingHorizontal: 4, fontSize: 6.8, fontFamily: 'Helvetica-Bold', color: AZUL, borderRightWidth: 0.5, borderColor: CINZA },
  elemCellVal: { paddingVertical: 2.5, paddingHorizontal: 4, fontSize: 6.8, color: TEXTO, borderRightWidth: 0.5, borderColor: CINZA },
  elemCellValLast: { paddingVertical: 2.5, paddingHorizontal: 4, fontSize: 6.8, color: TEXTO },
  elemLink: { fontSize: 6.5, color: AZUL2, paddingHorizontal: 4, paddingVertical: 2 },

  // Tabela de homogeneização
  homogTable: { borderWidth: 0.5, borderColor: CINZA, marginTop: 4 },
  homogRowH: { flexDirection: 'row', backgroundColor: AZUL2, borderBottomWidth: 0.5, borderColor: CINZA },
  homogRowB: { flexDirection: 'row', borderBottomWidth: 0.5, borderColor: CINZA },
  homogRow: { flexDirection: 'row' },
  homogTh: { fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: BRANCO, paddingVertical: 3, textAlign: 'center', borderRightWidth: 0.5, borderColor: '#475e9b' },
  homogThLast: { fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: BRANCO, paddingVertical: 3, textAlign: 'center' },
  homogTd: { fontSize: 6.5, color: TEXTO, paddingVertical: 2.5, textAlign: 'center', borderRightWidth: 0.5, borderColor: CINZA },
  homogTdLast: { fontSize: 6.5, color: TEXTO, paddingVertical: 2.5, textAlign: 'center' },
  homogTdOut: { fontSize: 6.5, color: '#9ca3af', fontFamily: 'Helvetica-Oblique', paddingVertical: 2.5, textAlign: 'center', borderRightWidth: 0.5, borderColor: CINZA },

  // Legenda + memorial
  legendaWrap: { marginTop: 4, marginBottom: 2, padding: 5, borderWidth: 0.5, borderColor: CINZA, backgroundColor: AZULLT },
  legendaTxt: { fontSize: 6.5, color: TEXTO, lineHeight: 1.4 },

  // Memorial de cálculos (estilo MK)
  memorialRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderColor: CINZA },
  memorialRowL: { flexDirection: 'row' },
  memorialLbl: { flex: 1.5, paddingVertical: 2.5, paddingHorizontal: 5, fontSize: 7, color: TEXTO, borderRightWidth: 0.5, borderColor: CINZA },
  memorialVal: { flex: 1, paddingVertical: 2.5, paddingHorizontal: 5, fontSize: 7, fontFamily: 'Helvetica-Bold', color: AZUL, textAlign: 'right' },
  memorialValMid: { flex: 0.6, paddingVertical: 2.5, paddingHorizontal: 5, fontSize: 7, color: TEXTO, textAlign: 'right', borderRightWidth: 0.5, borderColor: CINZA },

  // Tabela enquadramento (graus)
  grausTable: { borderWidth: 0.5, borderColor: CINZA, marginTop: 4 },
  grausHead: { flexDirection: 'row', backgroundColor: AZUL, borderBottomWidth: 0.5, borderColor: CINZA },
  grausItemRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderColor: CINZA },
  grausLastRow: { flexDirection: 'row' },
  grausThIdx: { width: 30, fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: BRANCO, textAlign: 'center', paddingVertical: 3, borderRightWidth: 0.5, borderColor: '#475e9b' },
  grausThDesc: { flex: 2, fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: BRANCO, paddingVertical: 3, paddingHorizontal: 4, borderRightWidth: 0.5, borderColor: '#475e9b' },
  grausThGrau: { flex: 1.7, fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: BRANCO, textAlign: 'center', paddingVertical: 3, borderRightWidth: 0.5, borderColor: '#475e9b' },
  grausThGrauLast: { flex: 1.7, fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: BRANCO, textAlign: 'center', paddingVertical: 3, borderRightWidth: 0.5, borderColor: '#475e9b' },
  grausThPts: { width: 44, fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: BRANCO, textAlign: 'center', paddingVertical: 3 },
  grausTdIdx: { width: 30, fontSize: 6.5, color: TEXTO, textAlign: 'center', paddingVertical: 3, borderRightWidth: 0.5, borderColor: CINZA },
  grausTdDesc: { flex: 2, fontSize: 6.5, color: TEXTO, paddingVertical: 3, paddingHorizontal: 4, borderRightWidth: 0.5, borderColor: CINZA },
  grausTdGrau: { flex: 1.7, fontSize: 6, color: TEXTO, paddingVertical: 3, paddingHorizontal: 3, borderRightWidth: 0.5, borderColor: CINZA, lineHeight: 1.3 },
  grausTdGrauLast: { flex: 1.7, fontSize: 6, color: TEXTO, paddingVertical: 3, paddingHorizontal: 3, borderRightWidth: 0.5, borderColor: CINZA, lineHeight: 1.3 },
  grausTdGrauOk: { flex: 1.7, fontSize: 6, color: AZUL, fontFamily: 'Helvetica-Bold', paddingVertical: 3, paddingHorizontal: 3, borderRightWidth: 0.5, borderColor: CINZA, lineHeight: 1.3, backgroundColor: '#dbeafe' },
  grausTdGrauOkLast: { flex: 1.7, fontSize: 6, color: AZUL, fontFamily: 'Helvetica-Bold', paddingVertical: 3, paddingHorizontal: 3, borderRightWidth: 0.5, borderColor: CINZA, lineHeight: 1.3, backgroundColor: '#dbeafe' },
  grausTdPts: { width: 44, fontSize: 7, fontFamily: 'Helvetica-Bold', color: AZUL, textAlign: 'center', paddingVertical: 3, backgroundColor: AZULLT },
  grausSomaRow: { flexDirection: 'row', backgroundColor: AZUL, borderTopWidth: 0.5, borderColor: CINZA },
  grausSomaLbl: { flex: 1, fontSize: 7, fontFamily: 'Helvetica-Bold', color: BRANCO, textAlign: 'right', paddingVertical: 3, paddingHorizontal: 6 },
  grausSomaVal: { width: 44, fontSize: 9, fontFamily: 'Helvetica-Bold', color: BRANCO, textAlign: 'center', paddingVertical: 2 },
  grausResRow: { flexDirection: 'row', backgroundColor: AZUL2, borderTopWidth: 0.5, borderColor: '#3a57d0' },
  grausResLbl: { flex: 1, fontSize: 7, fontFamily: 'Helvetica-Bold', color: BRANCO, textAlign: 'right', paddingVertical: 3, paddingHorizontal: 6 },
  grausResVal: { width: 44, fontSize: 10, fontFamily: 'Helvetica-Bold', color: BRANCO, textAlign: 'center', paddingVertical: 2 },
  // Tabela de precisão
  precTable: { borderWidth: 0.5, borderColor: CINZA, marginTop: 4 },
  precHeadRow: { flexDirection: 'row', backgroundColor: AZUL, borderBottomWidth: 0.5, borderColor: CINZA },
  precThGrau: { width: 50, fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: BRANCO, textAlign: 'center', paddingVertical: 3, borderRightWidth: 0.5, borderColor: '#475e9b' },
  precThDesc: { flex: 1, fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: BRANCO, paddingVertical: 3, paddingHorizontal: 5, borderRightWidth: 0.5, borderColor: '#475e9b' },
  precThRes: { width: 80, fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: BRANCO, textAlign: 'center', paddingVertical: 3 },
  precBodyRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderColor: CINZA },
  precTdGrau: { width: 50, fontSize: 7, fontFamily: 'Helvetica-Bold', color: AZUL, textAlign: 'center', paddingVertical: 3, borderRightWidth: 0.5, borderColor: CINZA },
  precTdDesc: { flex: 1, fontSize: 6.5, color: TEXTO, paddingVertical: 3, paddingHorizontal: 5, borderRightWidth: 0.5, borderColor: CINZA },
  precTdRes: { width: 80, fontSize: 6.5, color: TEXTO, textAlign: 'center', paddingVertical: 3 },
  precTdResOk: { width: 80, fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: AZUL, textAlign: 'center', paddingVertical: 3, backgroundColor: '#dbeafe' },
  precResRow: { flexDirection: 'row', backgroundColor: AZUL2 },
  precResLbl: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: BRANCO, textAlign: 'right', paddingVertical: 3, paddingHorizontal: 6 },
  precResVal: { width: 130, fontSize: 9, fontFamily: 'Helvetica-Bold', color: BRANCO, textAlign: 'center', paddingVertical: 2 },
})

// ─── Componentes auxiliares ───────────────────────────────────────────────────

const DocHeader = ({ solicitante, proprietario }: { solicitante?: string; proprietario?: string }) => (
  <View>
    <View style={s.header}>
      <View>
        <Text style={s.headerLogoTxt}>Lesath Engenharia</Text>
        <Text style={s.headerSub}>Precisão técnica que gera confiança</Text>
      </View>
      <View>
        <Text style={[s.headerTag, { textAlign: 'right' }]}>LAUDO DE AVALIAÇÃO</Text>
        {solicitante  ? <Text style={[s.headerMeta, { textAlign: 'right' }]}>Solicitante: {solicitante}</Text>  : null}
        {proprietario ? <Text style={[s.headerMeta, { textAlign: 'right' }]}>Proponente: {proprietario}</Text> : null}
      </View>
    </View>
    <View style={s.headerAccent} />
  </View>
)

const DocFooter = ({ pagina, total, dataLaudo }: { pagina: number; total: number; dataLaudo?: string }) => (
  <View style={s.footer}>
    <Text style={s.footerTxt}>www.lesathengenharia.com.br</Text>
    <Text style={s.footerTxt}>{fd(dataLaudo)}</Text>
    <Text style={s.footerPag}>Página {pagina} / {total}</Text>
  </View>
)

const SecHeader = ({ num, titulo }: { num: string; titulo: string }) => (
  <View style={s.secHeader}>
    <View style={s.secBadge}><Text style={[s.secTitle, { fontSize: 7.5 }]}>{num}</Text></View>
    <Text style={s.secTitle}>{titulo.toUpperCase()}</Text>
  </View>
)

type RowProps = { label: string; value?: string; flex1?: number; flex2?: number; last?: boolean }
const Row = ({ label, value, flex1=1, flex2=3, last=false }: RowProps) => (
  <View style={last ? s.rowLast : s.row}>
    <View style={[s.cellLbl, { flex: flex1, borderRightWidth: 0.5, borderColor: CINZA }]}>
      <Text>{label}</Text>
    </View>
    <View style={[s.cellVal, { flex: flex2 }]}>
      <Text>{value||'-'}</Text>
    </View>
  </View>
)

// ─── Componente principal ─────────────────────────────────────────────────────

export default function LaudoPdfSimplificado({ dados }: { dados: DadosLaudo }) {
  const endParts = (dados.endereco||'').split(' – ').map((p:string)=>p.trim())
  const logradouro = endParts[0]||''
  const bairro     = endParts[1]||''
  const cidade     = endParts[2]||''
  const uf         = endParts[3]||''
  const cepMatch   = (dados.endereco||'').match(/CEP\s*([\d-]+)/)
  const cep        = cepMatch ? cepMatch[1] : ''

  const valorTerreno   = cn(dados.valorTerreno)
  const valorBenfeits  = cn(dados.valorBenfeitorias)
  const fatorComercial = cn(dados.fatorComercializacao) || 1
  const produto = (dados.outrosFatoresImovel||[]).reduce((a:number,i:any)=>a*(cn(i.valor)||1), 1)
  const base    = dados.modoValorImovel==='total' ? cn((dados as any).valorTotal||'') : valorTerreno+valorBenfeits
  const vlFinal = arredondar(base * fatorComercial * produto)
  const vlf     = cn(dados.valorLiquidezForcada)

  // Dados completos do CDDM (persistidos pelo EtapaCalculoCDDM)
  const cddm = (dados as any).dadosCalculoCDDM as {
    elementos: any[]
    avaliando: { area: number; padraoConstrutivo: string; estadoConservacao: string }
    media: number
    mediaSaneada: number
    desvioPadrao: number
    coefVariacao: number
    tStudent: number
    intervaloConfianca: number
    limiteInferior: number
    limiteSuperior: number
    limiteInf30: number
    limiteSup30: number
    grauPrecisao: string
    valorImovel: number
    outliersDescartados: number
  } | undefined

  const evSnap = (dados as any).dadosCalculoEvolutivo as { elementos: any[] } | undefined
  const isEvolutivo = dados.metodoAvaliacao === 'evolutivo'
  const elementosCddm = cddm?.elementos || []
  const elementosEv   = evSnap?.elementos || []
  const elementosExibir: any[] = isEvolutivo ? elementosEv : elementosCddm
  const temCddm = elementosCddm.length > 0
  const temElementos = elementosExibir.length > 0

  const capaMetodologia = dados.metodoAvaliacao==='evolutivo'?'Evolutivo':dados.metodoAvaliacao==='comparativo'?'Comparativo Direto':dados.metodoAvaliacao||'-'

  const capaGrauFund = (()=>{
    if (dados.metodoAvaliacao==='evolutivo') {
      const soma=(dados.fundamentacaoEvolutivo||[]).reduce((s:number,i:any)=>s+(i.pontos||0),0)
      if(soma>=8)return'III';if(soma>=5)return'II';if(soma>=3)return'I';return'-'
    }
    const soma=(dados.fundamentacao||[]).reduce((s:number,i:any)=>s+(i.pontos||0),0)
    if(soma>=10)return'III';if(soma>=6)return'II';if(soma>=4)return'I';return'-'
  })()

  const capaGrauPrec = (()=>{
    const prec=dados.precisao||[]
    if(prec.length===0)return'-'
    if(prec.length===1)return prec[0].grau||'-'
    const soma=prec.reduce((s:number,i:any)=>s+(i.pontos||0),0)
    if(soma>=8)return'III';if(soma>=5)return'II';if(soma>=3)return'I';return'-'
  })()

  const capaFinalidade = dados.finalidade==='garantia'?'Avaliação para fins de garantia':dados.finalidade==='execucao'?'Avaliação para fins de execução':dados.finalidade||'-'

  const hoje = new Date()
  const meses=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro']
  const dataExtenso = `São Paulo, ${hoje.getDate()} de ${meses[hoje.getMonth()]} de ${hoje.getFullYear()}.`

  const fotoFachada  = (dados.fotos||[]).find((f:any)=>(f.legenda||'').toLowerCase().includes('fachada'))||(dados.fotos||[])[0]
  const fotosAnexo   = dados.fotos||[]
  const divisoesFilt = (dados.divisoes||[]).filter((d:any)=>d.ambiente?.trim())
  const temBenfeitorias = !!dados.imagemBenfeitorias

  // Número total de páginas: 5 fixas + páginas de fotos
  const paginasFotos = chunkArray(fotosAnexo, 6)
  const totalPaginas = 5 + paginasFotos.length

  const secValor = temBenfeitorias ? '11' : '10'
  const secGraus = temBenfeitorias ? '12' : '11'
  const secConcl = temBenfeitorias ? '13' : '12'

  return (
    <Document>

      {/* ══ PÁGINA 1 ════════════════════════════════════════════ */}
      <Page size="A4" style={s.page}>
        <DocHeader solicitante={dados.solicitante} proprietario={dados.proprietario} />

        <View style={s.content}>
          <View style={s.titleBand}>
            <Text style={s.titleTxt}>LAUDO DE AVALIAÇÃO</Text>
          </View>

          {/* 1 — Identificação */}
          <SecHeader num="1" titulo="Identificação" />
          <View style={s.table}>
            <Row label="Matrícula"   value={dados.matricula} />
            <Row label="Solicitante" value={dados.solicitante} />
            <Row label="Proponente"  value={dados.proprietario} />
            <Row label="Logradouro"  value={logradouro} />
            <View style={s.rowLast}>
              <View style={[s.cellLbl,{flex:0.7,borderRightWidth:0.5,borderColor:CINZA}]}><Text>CEP</Text></View>
              <View style={[s.cellVal,{flex:1.2,borderRightWidth:0.5,borderColor:CINZA}]}><Text>{cep||'-'}</Text></View>
              <View style={[s.cellLbl,{flex:0.7,borderRightWidth:0.5,borderColor:CINZA}]}><Text>Bairro</Text></View>
              <View style={[s.cellVal,{flex:1.5,borderRightWidth:0.5,borderColor:CINZA}]}><Text>{bairro||'-'}</Text></View>
              <View style={[s.cellLbl,{flex:0.8,borderRightWidth:0.5,borderColor:CINZA}]}><Text>Cidade</Text></View>
              <View style={[s.cellVal,{flex:1.5,borderRightWidth:0.5,borderColor:CINZA}]}><Text>{cidade||'-'}</Text></View>
              <View style={[s.cellLbl,{flex:0.4,borderRightWidth:0.5,borderColor:CINZA}]}><Text>UF</Text></View>
              <View style={[s.cellVal,{flex:0.7}]}><Text>{uf||'-'}</Text></View>
            </View>
          </View>

          {fotoFachada && <Image src={fotoFachada.preview} style={s.foto} />}

          {/* 2 — Avaliação */}
          <SecHeader num="2" titulo="Avaliação" />
          <View style={s.valorRow}>
            <View style={s.valorDark}>
              <Text style={s.valorLbl}>VALOR DA AVALIAÇÃO</Text>
              <Text style={s.valorNum}>{fm(vlFinal)}</Text>
              <Text style={s.valorExt}>({cap(numeroPorExtenso(vlFinal))})</Text>
            </View>
            {vlf > 0 && (
              <View style={s.valorLight}>
                <Text style={s.valorLblD}>VALOR DE LIQUIDAÇÃO</Text>
                <Text style={s.valorNumD}>{fm(vlf)}</Text>
                <Text style={s.valorExtD}>({cap(numeroPorExtenso(vlf))})</Text>
              </View>
            )}
          </View>
          <View style={s.table}>
            <Row label="Metodologia de cálculo" value={metLabel(dados.metodoAvaliacao)} last />
          </View>

          {/* 3 — Dimensões */}
          <SecHeader num="3" titulo="Dimensões" />
          <View style={{ flexDirection: 'row', gap: 5, marginTop: 3 }}>
            <View style={[s.table, { flex: 1, marginTop: 0 }]}>
              <View style={s.row}><View style={[s.cellHead,{flex:1}]}><Text>Imóvel isolado</Text></View></View>
              <Row label="Averbada"         value={fa(dados.areaConstruidaAverbada)} flex1={1.5} flex2={1} />
              <Row label="Não Averbada"     value={fa(String(dados.areaConstruidaNaoAverbada??0))} flex1={1.5} flex2={1} />
              <Row label="Total Construída" value={fa(dados.areaConstruidaTotal)} flex1={1.5} flex2={1} />
              <Row label="Terreno"          value={fa(dados.areaTerrenoTotal)} flex1={1.5} flex2={1} last />
            </View>
            <View style={[s.table, { flex: 1, marginTop: 0 }]}>
              <View style={s.row}><View style={[s.cellHead,{flex:1}]}><Text>Referências</Text></View></View>
              <Row label="Padrão"      value={dados.padrao} flex1={1.5} flex2={1} />
              <Row label="Idade"       value={dados.idadeAparente ? dados.idadeAparente+' anos' : '-'} flex1={1.5} flex2={1} />
              <Row label="Conservação" value={dados.estadoConservacao} flex1={1.5} flex2={1} />
              <Row label="Finalidade"  value={capaFinalidade} flex1={1.5} flex2={1} last />
            </View>
          </View>
        </View>

        <DocFooter pagina={1} total={totalPaginas} dataLaudo={dados.dataLaudo} />
      </Page>

      {/* ══ PÁGINA 2 ════════════════════════════════════════════ */}
      <Page size="A4" style={s.page}>
        <DocHeader solicitante={dados.solicitante} proprietario={dados.proprietario} />

        <View style={s.content}>
          {/* 4 — Características */}
          <SecHeader num="4" titulo="Características e Dimensões do Avaliando" />
          <View style={s.table}>
            <View style={s.row}>
              <View style={[s.cellLbl,{flex:1,borderRightWidth:0.5,borderColor:CINZA}]}><Text>Tipo</Text></View>
              <View style={[s.cellVal,{flex:1.5,borderRightWidth:0.5,borderColor:CINZA}]}><Text>{dados.tipo||'-'}</Text></View>
              <View style={[s.cellLbl,{flex:1,borderRightWidth:0.5,borderColor:CINZA}]}><Text>IPTU</Text></View>
              <View style={[s.cellVal,{flex:1.5}]}><Text>{dados.iptu||'-'}</Text></View>
            </View>
            <View style={s.row}>
              <View style={[s.cellLbl,{flex:1,borderRightWidth:0.5,borderColor:CINZA}]}><Text>Área terreno</Text></View>
              <View style={[s.cellVal,{flex:1.5,borderRightWidth:0.5,borderColor:CINZA}]}><Text>{fa(dados.areaTerrenoTotal)}</Text></View>
              <View style={[s.cellLbl,{flex:1,borderRightWidth:0.5,borderColor:CINZA}]}><Text>Área construída</Text></View>
              <View style={[s.cellVal,{flex:1.5}]}><Text>{fa(dados.areaConstruidaTotal)}</Text></View>
            </View>
            <View style={s.row}>
              <View style={[s.cellLbl,{flex:1,borderRightWidth:0.5,borderColor:CINZA}]}><Text>Padrão</Text></View>
              <View style={[s.cellVal,{flex:1.5,borderRightWidth:0.5,borderColor:CINZA}]}><Text>{dados.padrao||'-'}</Text></View>
              <View style={[s.cellLbl,{flex:1,borderRightWidth:0.5,borderColor:CINZA}]}><Text>Idade aparente</Text></View>
              <View style={[s.cellVal,{flex:1.5}]}><Text>{dados.idadeAparente ? dados.idadeAparente+' anos' : '-'}</Text></View>
            </View>
            <View style={s.rowLast}>
              <View style={[s.cellLbl,{flex:1,borderRightWidth:0.5,borderColor:CINZA}]}><Text>Conservação</Text></View>
              <View style={[s.cellVal,{flex:4}]}><Text>{dados.estadoConservacao||'-'}</Text></View>
            </View>
          </View>

          {/* 5 — Documentação */}
          <SecHeader num="5" titulo="Documentação Apresentada" />
          <View style={s.table}>
            <Row label="Matrícula"             value={dados.matricula} />
            <Row label="Inscrição imobiliária" value={dados.iptu} last />
          </View>

          {/* 6 — Descrição */}
          <SecHeader num="6" titulo="Descrição do Imóvel Avaliando" />
          <View style={{ borderWidth: 0.5, borderColor: CINZA, padding: 6, marginTop: 3 }}>
            <Text style={s.txtBold}>6.1 - Descrição do imóvel avaliando</Text>
            <Text style={s.txt}>
              {dados.consideracoesMercado
                ? dados.consideracoesMercado.substring(0,500)+(dados.consideracoesMercado.length>500?'...':'')
                : `Imóvel do tipo ${dados.tipo||'residencial'}, localizado em ${dados.endereco}.`}
            </Text>
          </View>

          {/* 7 — Divisões */}
          {divisoesFilt.length > 0 && (
            <>
              <SecHeader num="7" titulo="Características do Imóvel Avaliando" />
              <View style={s.table}>
                <View style={s.row}>
                  <View style={[s.cellHead,{flex:2,borderRightWidth:0.5,borderColor:CINZA}]}><Text>Divisão Interna</Text></View>
                  <View style={[s.cellHead,{flex:1}]}><Text>Qtd.</Text></View>
                </View>
                {divisoesFilt.map((d:any,i:number)=>(
                  <View key={i} style={i===divisoesFilt.length-1?s.rowLast:s.row}>
                    <View style={[s.cellVal,{flex:2,borderRightWidth:0.5,borderColor:CINZA}]}><Text>{d.ambiente}</Text></View>
                    <View style={[s.cellVal,{flex:1,textAlign:'center'}]}><Text>{d.quantidade}</Text></View>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>

        <DocFooter pagina={2} total={totalPaginas} dataLaudo={dados.dataLaudo} />
      </Page>

      {/* ══ PÁGINA 3 — Localização + Pesquisa Imobiliária (cards) ══
           Esta Page usa wrap automático: cards individuais com wrap={false}
           garantem que cada elemento não seja cortado no meio. O footer é
           fixed (aparece em toda página gerada por este Page). */}
      <Page size="A4" style={{ ...s.page, paddingHorizontal: 28, paddingTop: 0, paddingBottom: 26 }}>
        <DocHeader solicitante={dados.solicitante} proprietario={dados.proprietario} />

        <View style={{ paddingTop: 8 }}>
          {/* 8 — Localização */}
          <SecHeader num="8" titulo="Localização" />
          {dados.coordenadasImovel && (
            <View style={s.table}>
              <Row label="Coordenadas" value={dados.coordenadasImovel} last />
            </View>
          )}
          {dados.localizacaoComparativos && (
            <View wrap={false}>
              <Image src={dados.localizacaoComparativos} style={{ width: '100%', height: 220, objectFit: 'cover', marginTop: 4, borderWidth: 0.5, borderColor: CINZA }} />
            </View>
          )}

          {/* 9 — Pesquisa Imobiliária */}
          <SecHeader num="9" titulo="Pesquisa Imobiliária" />

          {/* Resumo */}
          <View style={s.table}>
            <View style={s.row}>
              <View style={[s.cellHead,{flex:2,borderRightWidth:0.5,borderColor:CINZA}]}><Text>Período</Text></View>
              <View style={[s.cellHead,{flex:1.5,borderRightWidth:0.5,borderColor:CINZA}]}><Text>Tipo</Text></View>
              <View style={[s.cellHead,{flex:0.8,borderRightWidth:0.5,borderColor:CINZA}]}><Text>Qtd.</Text></View>
              <View style={[s.cellHead,{flex:2}]}><Text>Metodologia</Text></View>
            </View>
            <View style={s.rowLast}>
              <View style={[s.cellVal,{flex:2,borderRightWidth:0.5,borderColor:CINZA}]}>
                <Text>{dados.periodoPesquisaInicio&&dados.periodoPesquisaFim?`${fd(dados.periodoPesquisaInicio)} a ${fd(dados.periodoPesquisaFim)}`:'-'}</Text>
              </View>
              <View style={[s.cellVal,{flex:1.5,borderRightWidth:0.5,borderColor:CINZA}]}><Text>{dados.tipoInformacoesObtidas||'-'}</Text></View>
              <View style={[s.cellVal,{flex:0.8,borderRightWidth:0.5,borderColor:CINZA,textAlign:'center'}]}>
                <Text>{(temCddm ? elementosCddm.length : Number(dados.quantidadeElementos||0)) || '-'}</Text>
              </View>
              <View style={[s.cellVal,{flex:2}]}><Text>{metLabel(dados.metodoAvaliacao)}</Text></View>
            </View>
          </View>

          {/* Cards de elemento — blocos temáticos, até 3 colunas, campos vazios omitidos */}
          {temElementos && elementosExibir.map((el: any, i: number) => {
            const valorOf  = el.valorOferta > 0 ? fm(el.valorOferta) : ''
            const valorLiq = el.valorOferta > 0 && el.fatorOferta
              ? fm(el.valorOferta * (parseFloat(String(el.fatorOferta).replace(',', '.')) || 1))
              : ''
            const cidadeUF = [el.cidade, el.uf].filter(Boolean).join(' · ')

            // ── Larguras para cada layout de colunas (total = 539pt) ──────────
            // 1 col:  L1=65  V1=474                               = 539
            // 2 cols: L1=65  V1=200  L2=65  V2=209               = 539
            // 3 cols: L1=50  V1=120  L2=50  V2=120  L3=50  V3=149 = 539
            const C1L=65, C1V=474
            const C2L=65, C2V=200, C2L2=65, C2V2=209
            const C3L=50, C3V=120, C3L2=50, C3V2=120, C3L3=50, C3V3=149

            const bl = s.elemCellLbl
            const bv = s.elemCellVal
            const bvL = s.elemCellValLast
            const sep = { borderRightWidth: 0.5, borderColor: CINZA }

            // Helpers de linha — retornam null se todos os valores estiverem vazios
            // Helpers de linha — colapsam colunas vazias automaticamente
            const ok = (v: any) => {
              const s = String(v ?? '').trim()
              return s && s !== '0' && s !== '-' ? s : ''
            }

            // Linha 1 coluna (rótulo + valor cheio)
            const r1 = (l1: string, v1: any, extra?: object) => {
              const a = ok(v1)
              if (!a) return null
              return (
                <View style={s.elemRowB}>
                  <View style={[bl,{width:C1L}]}><Text>{l1}</Text></View>
                  <View style={extra ? [bvL,{width:C1V,...extra}] : [bvL,{width:C1V}]}><Text>{a}</Text></View>
                </View>
              )
            }

            // Linha 2 colunas — colapsa para 1 se 2ª coluna vazia
            const r2 = (l1: string, v1: any, l2: string, v2: any) => {
              const a = ok(v1), b = ok(v2)
              if (!a && !b) return null
              if (!b) return r1(l1, a) // colapsa para 1 coluna
              if (!a) return r1(l2, b)
              return (
                <View style={s.elemRowB}>
                  <View style={[bl,{width:C2L}]}><Text>{l1}</Text></View>
                  <View style={[bv,{width:C2V,...sep}]}><Text>{a}</Text></View>
                  <View style={[bl,{width:C2L2,...sep}]}><Text>{l2}</Text></View>
                  <View style={[bvL,{width:C2V2}]}><Text>{b}</Text></View>
                </View>
              )
            }

            // Linha 3 colunas — colapsa automaticamente conforme valores vazios
            const r3 = (l1: string, v1: any, l2: string, v2: any, l3: string, v3: any) => {
              const a = ok(v1), b = ok(v2), c = ok(v3)
              if (!a && !b && !c) return null
              // Se apenas 1 ou 2 valores preenchidos, usa layout menor
              if (!c) return r2(l1, a, l2, b)
              if (!b && !a) return r1(l3, c)
              if (!a) return r2(l2, b, l3, c)
              if (!b) return r2(l1, a, l3, c)
              // 3 valores preenchidos
              return (
                <View style={s.elemRowB}>
                  <View style={[bl,{width:C3L}]}><Text>{l1}</Text></View>
                  <View style={[bv,{width:C3V,...sep}]}><Text>{a}</Text></View>
                  <View style={[bl,{width:C3L2,...sep}]}><Text>{l2}</Text></View>
                  <View style={[bv,{width:C3V2,...sep}]}><Text>{b}</Text></View>
                  <View style={[bl,{width:C3L3,...sep}]}><Text>{l3}</Text></View>
                  <View style={[bvL,{width:C3V3}]}><Text>{c}</Text></View>
                </View>
              )
            }

            // Linha de link (fonte menor)
            const rLink = () => {
              if (!el.link) return null
              const txt = String(el.link).slice(0, 165) + (String(el.link).length > 165 ? '...' : '')
              return (
                <View style={s.elemRowB}>
                  <View style={[bl,{width:C1L}]}><Text>Link</Text></View>
                  <View style={[bvL,{width:C1V}]}><Text style={{fontSize:6.3,color:AZUL2}}>{txt}</Text></View>
                </View>
              )
            }

            const linhas = [
              // Bloco 1 — Identificação
              r3('Tipo', el.tipo, 'Data', el.data ? fd(el.data) : '', 'Empreendimento', el.empreendimento),

              // Bloco 2 — Endereço
              r1('Logradouro', el.logradouro || el.endereco),
              r3('Bairro', el.bairro, 'Cidade · UF', cidadeUF, 'Distância', el.distanciaAvaliando),
              r2('Coordenadas', el.coordenadas, 'Fonte', el.fonte),

              // Bloco 3 — Características físicas
              r3('Conserv.', el.estadoConservacao, 'Idade', el.idadeAparente > 0 ? `${el.idadeAparente} anos` : '', 'Andar', el.andar > 0 ? el.andar : ''),
              r2('Área constr./útil', el.area > 0 ? `${el.area.toLocaleString('pt-BR')} m²` : '', 'Padrão constr.', el.padraoConstrutivo),
              r3('Dormitórios', el.dormitorios > 0 ? el.dormitorios : '', 'Suítes', el.suites > 0 ? el.suites : '', 'Vagas', el.vagas > 0 ? el.vagas : ''),

              // Bloco 4 — Financeiro
              // Para evolutivo: areaTerreno e vuTerreno; para CDDM: area e valorUnitarioOferta
              el.areaTerreno > 0 ? r2('Área terreno', `${Number(el.areaTerreno).toLocaleString('pt-BR')} m²`, 'Área construída', el.areaConstruida > 0 ? `${Number(el.areaConstruida).toLocaleString('pt-BR')} m²` : '') : null,
              r3('Valor oferta', valorOf, 'Valor líquido', valorLiq !== valorOf ? valorLiq : '', 'V.U./m²', el.valorUnitarioOferta > 0 ? fm(el.valorUnitarioOferta) : (el.vuTerreno > 0 ? fm(el.vuTerreno) : '')),
              r3('F. Oferta', (el.fatorOferta||'').toString().replace('.', ','), 'Nota local', ok(el.fatorLocalBruto || el.notaLocal), 'F. Andar', ok(el.fatorAndarBruto || el.fatorAndar)),

              // Bloco 5 — Contato / tipo
              r3('Tipo oferta', el.tipoOferta, 'Status', el.status, 'Telefone', el.telefone),

              // Link e observações — linha inteira
              rLink(),
              r1('Obs.', el.observacoes),
            ].filter(Boolean)

            if (linhas.length === 0) return null

            const foto = el.foto || ''
            return (
              <View key={`elem-${i}`} wrap={false} style={{ marginTop: 5, borderWidth: 1, borderColor: '#b8c4d8' }}>
                <View style={[s.elemHeader, { backgroundColor: AZUL }]}>
                  <Text style={s.elemHeaderTxt}>{isEvolutivo ? 'ELEMENTO' : 'ELEMENTO COMPARATIVO'} {String(i+1).padStart(2,'0')}</Text>
                  <Text style={s.elemHeaderSub}>
                    {el.fonte ? el.fonte : ''}{el.data ? ` • ${fd(el.data)}` : ''}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row' }}>
                  <View style={{ flex: 1 }}><View style={s.elemTable}>{linhas}</View></View>
                  {foto ? (
                    <View style={{ width: 100, borderLeftWidth: 0.5, borderColor: CINZA }}>
                      <Image src={foto} style={{ width: 100, height: '100%', objectFit: 'cover' }} />
                    </View>
                  ) : null}
                </View>
              </View>
            )
          })}
        </View>

        {/* Footer fixed: aparece em toda página gerada por esta <Page>,
            inclusive nas páginas extras criadas por wrap natural dos cards. */}
        <View fixed style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
          <DocFooter pagina={3} total={totalPaginas} dataLaudo={dados.dataLaudo} />
        </View>
      </Page>

      {/* ══ PÁGINAS 4-5 — Homogeneização + Valor + Graus + Conclusão (conteúdo fluido) ══ */}
      <Page size="A4" style={s.page} wrap>
        <DocHeader solicitante={dados.solicitante} proprietario={dados.proprietario} />

        <View style={s.content}>
          {/* Homogeneização (estilo MK seção 14) */}
          {temCddm && (
            <>
              <SecHeader num="9.1" titulo="Homogeneização" />
              <View style={s.homogTable}>
                <View style={s.homogRowH}>
                  <Text style={[s.homogTh,{flex:0.6}]}>Elem.</Text>
                  <Text style={[s.homogTh,{flex:1.1}]}>VU/m²</Text>
                  <Text style={[s.homogTh,{flex:0.8}]}>F.Local</Text>
                  <Text style={[s.homogTh,{flex:0.8}]}>F.Padrão</Text>
                  <Text style={[s.homogTh,{flex:0.8}]}>F.FOC</Text>
                  <Text style={[s.homogTh,{flex:0.8}]}>F.Andar</Text>
                  <Text style={[s.homogTh,{flex:0.8}]}>F.Vaga</Text>
                  <Text style={[s.homogTh,{flex:0.8}]}>F.Área</Text>
                  <Text style={[s.homogThLast,{flex:1.2}]}>VU/m² Hom.</Text>
                </View>
                {elementosCddm.map((el: any, i: number) => {
                  const isLast = i === elementosCddm.length - 1
                  const tdStyle = el.saneado ? s.homogTd : s.homogTdOut
                  return (
                    <View key={`h-${i}`} style={isLast ? s.homogRow : s.homogRowB}>
                      <Text style={[tdStyle,{flex:0.6}]}>{i+1}</Text>
                      <Text style={[tdStyle,{flex:1.1}]}>{fm(el.valorUnitarioOferta || 0)}</Text>
                      <Text style={[tdStyle,{flex:0.8}]}>{(el.fatorLocal||1).toFixed(4)}</Text>
                      <Text style={[tdStyle,{flex:0.8}]}>{(el.fatorPadrao||1).toFixed(4)}</Text>
                      <Text style={[tdStyle,{flex:0.8}]}>{(el.fatorFOC||1).toFixed(4)}</Text>
                      <Text style={[tdStyle,{flex:0.8}]}>{(el.fatorAndar||1).toFixed(4)}</Text>
                      <Text style={[tdStyle,{flex:0.8}]}>{(el.fatorVaga||1).toFixed(4)}</Text>
                      <Text style={[tdStyle,{flex:0.8}]}>{(el.fatorArea||1).toFixed(4)}</Text>
                      <Text style={[el.saneado ? s.homogTdLast : {...s.homogTdOut, borderRightWidth: 0},{flex:1.2}]}>{fm(el.vuHomog || 0)}</Text>
                    </View>
                  )
                })}
              </View>

              {/* Legenda */}
              <View style={s.legendaWrap}>
                <Text style={[s.legendaTxt,{fontFamily:'Helvetica-Bold',marginBottom:2}]}>Legenda dos fatores aplicados:</Text>
                <Text style={s.legendaTxt}>F.Local = Fator de Localização    F.Padrão = Fator de Padrão Construtivo    F.FOC = Fator de Obsolescência e Conservação</Text>
                <Text style={s.legendaTxt}>F.Andar = Fator de Andar    F.Vaga = Fator de Vaga de Garagem    F.Área = Fator de Adequação por Área</Text>
                {cddm && cddm.outliersDescartados > 0 && (
                  <Text style={[s.legendaTxt,{marginTop:3,color:'#94a3b8',fontFamily:'Helvetica-Oblique'}]}>
                    Elementos em itálico/cinza foram descartados pelo saneamento estatístico (Critério de Chauvenet — fora do intervalo ±30% da média).
                  </Text>
                )}
              </View>
            </>
          )}

          {/* Memorial de Cálculos (estilo MK) */}
          {temCddm && cddm && (
            <View style={{ flexDirection: 'row', gap: 5, marginTop: 6 }}>
              {/* Bloco esquerdo — Enquadramento */}
              <View style={{ flex: 1.3, borderWidth: 0.5, borderColor: CINZA }}>
                <View style={{ backgroundColor: AZUL, paddingVertical: 3, paddingHorizontal: 5 }}>
                  <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: BRANCO, textAlign: 'center' }}>ENQUADRAMENTO DA AVALIAÇÃO</Text>
                </View>
                <View style={s.memorialRow}>
                  <Text style={[s.memorialLbl,{flex:1.6,fontSize:6.5}]}>Amplitude do intervalo de confiança de 80% em torno da estimativa central</Text>
                  <View style={{flex:1.5,flexDirection:'column'}}>
                    <View style={{flexDirection:'row',backgroundColor:AZULLT}}>
                      <Text style={{flex:1,fontSize:6.5,fontFamily:'Helvetica-Bold',color:AZUL,textAlign:'center',paddingVertical:2,borderRightWidth:0.5,borderColor:CINZA}}>III</Text>
                      <Text style={{flex:1,fontSize:6.5,fontFamily:'Helvetica-Bold',color:AZUL,textAlign:'center',paddingVertical:2,borderRightWidth:0.5,borderColor:CINZA}}>II</Text>
                      <Text style={{flex:1,fontSize:6.5,fontFamily:'Helvetica-Bold',color:AZUL,textAlign:'center',paddingVertical:2}}>I</Text>
                    </View>
                    <View style={{flexDirection:'row'}}>
                      <Text style={{flex:1,fontSize:6.5,color:TEXTO,textAlign:'center',paddingVertical:2,borderTopWidth:0.5,borderRightWidth:0.5,borderColor:CINZA}}>≤ 30%</Text>
                      <Text style={{flex:1,fontSize:6.5,color:TEXTO,textAlign:'center',paddingVertical:2,borderTopWidth:0.5,borderRightWidth:0.5,borderColor:CINZA}}>≤ 40%</Text>
                      <Text style={{flex:1,fontSize:6.5,color:TEXTO,textAlign:'center',paddingVertical:2,borderTopWidth:0.5,borderColor:CINZA}}>≤ 50%</Text>
                    </View>
                  </View>
                </View>
                <View style={s.memorialRow}>
                  <Text style={[s.memorialLbl,{flex:2,fontFamily:'Helvetica-Bold'}]}>Intervalo de confiança</Text>
                  <Text style={[s.memorialVal,{flex:1.1,textAlign:'center'}]}>{cddm.intervaloConfianca.toFixed(2).replace('.', ',')}%</Text>
                </View>
                <View style={s.memorialRowL}>
                  <Text style={[s.memorialLbl,{flex:2,fontFamily:'Helvetica-Bold',backgroundColor:AZUL,color:BRANCO}]}>GRAU DE PRECISÃO</Text>
                  <Text style={[s.memorialVal,{flex:1.1,textAlign:'center',backgroundColor:'#dbeafe',fontSize:9}]}>{cddm.grauPrecisao || '-'}</Text>
                </View>
              </View>

              {/* Bloco direito — Memorial */}
              <View style={{ flex: 1, borderWidth: 0.5, borderColor: CINZA }}>
                <View style={{ backgroundColor: AZUL, paddingVertical: 3, paddingHorizontal: 5 }}>
                  <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: BRANCO, textAlign: 'center' }}>MEMORIAL DE CÁLCULOS</Text>
                </View>
                <View style={s.memorialRow}><Text style={s.memorialLbl}>Média Saneada</Text><Text style={s.memorialVal}>{fm(cddm.mediaSaneada)}</Text></View>
                <View style={s.memorialRow}><Text style={s.memorialLbl}>Limite superior (+30%)</Text><Text style={s.memorialVal}>{fm(cddm.limiteSup30)}</Text></View>
                <View style={s.memorialRow}><Text style={s.memorialLbl}>Limite inferior (-30%)</Text><Text style={s.memorialVal}>{fm(cddm.limiteInf30)}</Text></View>
                <View style={s.memorialRow}><Text style={s.memorialLbl}>Desvio Padrão</Text><Text style={s.memorialVal}>{cddm.desvioPadrao.toFixed(2).replace('.', ',')}</Text></View>
                <View style={s.memorialRow}><Text style={s.memorialLbl}>Coeficiente de Variação</Text><Text style={s.memorialVal}>{cddm.coefVariacao.toFixed(2).replace('.', ',')}%</Text></View>
                <View style={s.memorialRow}><Text style={s.memorialLbl}>Elementos saneados</Text><Text style={s.memorialVal}>{elementosCddm.filter((e: any) => e.saneado).length} de {elementosCddm.length}</Text></View>
                <View style={s.memorialRow}><Text style={s.memorialLbl}>T de Student</Text><Text style={s.memorialVal}>{cddm.tStudent.toFixed(3).replace('.', ',')}</Text></View>
                <View style={s.memorialRow}><Text style={s.memorialLbl}>Limite Sup. IC</Text><Text style={s.memorialVal}>{fm(cddm.limiteSuperior)}</Text></View>
                <View style={s.memorialRowL}><Text style={s.memorialLbl}>Limite Inf. IC</Text><Text style={s.memorialVal}>{fm(cddm.limiteInferior)}</Text></View>
              </View>
            </View>
          )}

          <Text style={[s.legendaTxt,{marginTop:4,marginBottom:2,fontStyle:'italic',color:'#475569'}]}>
            * Quando a amplitude do intervalo de confiança ultrapassar 50% não há classificação do resultado quanto à precisão e é necessária justificativa com base no diagnóstico do mercado. (ABNT 14653-2 - 2011 - Item 13.4)
          </Text>

          {/* Valor final */}
          <SecHeader num={secValor} titulo="Valor Final da Avaliação" />
          {temCddm && cddm && (
            <View style={s.table}>
              <View style={s.row}>
                <View style={[s.cellHead,{flex:1,borderRightWidth:0.5,borderColor:CINZA}]}><Text>Área</Text></View>
                <View style={[s.cellHead,{flex:1,borderRightWidth:0.5,borderColor:CINZA}]}><Text>Valor/m²</Text></View>
                <View style={[s.cellHead,{flex:1}]}><Text>Valor Total</Text></View>
              </View>
              <View style={s.rowLast}>
                <View style={[s.cellVal,{flex:1,borderRightWidth:0.5,borderColor:CINZA,textAlign:'center'}]}><Text>{cddm.avaliando.area.toLocaleString('pt-BR')} m²</Text></View>
                <View style={[s.cellVal,{flex:1,borderRightWidth:0.5,borderColor:CINZA,textAlign:'center'}]}><Text>{fm(cddm.mediaSaneada)}</Text></View>
                <View style={[s.cellVal,{flex:1,textAlign:'center',fontFamily:'Helvetica-Bold',color:AZUL}]}><Text>{fm(cddm.valorImovel)}</Text></View>
              </View>
            </View>
          )}
          <View style={s.valorRow}>
            <View style={s.valorDark}>
              <Text style={s.valorLbl}>VALOR DA AVALIAÇÃO</Text>
              <Text style={s.valorNum}>{fm(vlFinal)}</Text>
              <Text style={s.valorExt}>({cap(numeroPorExtenso(vlFinal))})</Text>
            </View>
            {vlf > 0 && (
              <View style={s.valorLight}>
                <Text style={s.valorLblD}>VALOR DE LIQUIDEZ FORÇADA</Text>
                <Text style={s.valorNumD}>{fm(vlf)}</Text>
                <Text style={s.valorExtD}>({cap(numeroPorExtenso(vlf))})</Text>
              </View>
            )}
          </View>

          {/* Resumo de Graus */}
          <SecHeader num={secGraus} titulo="Grau de Fundamentação e Precisão" />
          <View style={s.grauRow}>
            {[
              { label: 'Grau de Fundamentação', valor: capaGrauFund },
              { label: 'Grau de Precisão',      valor: capaGrauPrec },
              { label: 'Metodologia aplicada',  valor: capaMetodologia },
            ].map(({ label, valor }) => (
              <View key={label} style={s.grauBox}>
                <View style={s.grauLbl}><Text>{label}</Text></View>
                <Text style={s.grauNum}>{valor}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ↓ conteúdo continua — graus + conclusão na mesma página fluida */}
          {/* Tabela de Fundamentação detalhada (estilo MK seção 17) */}
          <SecHeader num={`${secGraus}.1`} titulo="Grau de Fundamentação — Tratamento por Fatores" />
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
            return (
              <View style={s.grausTable}>
                <View style={s.grausHead}>
                  <Text style={s.grausThIdx}>Item</Text>
                  <Text style={s.grausThDesc}>Descrição</Text>
                  <Text style={s.grausThGrau}>Grau III</Text>
                  <Text style={s.grausThGrau}>Grau II</Text>
                  <Text style={s.grausThGrauLast}>Grau I</Text>
                  <Text style={s.grausThPts}>Pontos obtidos</Text>
                </View>
                {itensPadrao.map((it, idx) => {
                  const itemAtual = fund[idx]
                  const grauAtual = itemAtual?.grau || ''
                  return (
                    <View key={it.id} style={s.grausItemRow}>
                      <Text style={s.grausTdIdx}>{it.id}</Text>
                      <Text style={s.grausTdDesc}>{it.desc}</Text>
                      <Text style={grauAtual === 'III' ? s.grausTdGrauOk : s.grausTdGrau}>{it.g3}</Text>
                      <Text style={grauAtual === 'II' ? s.grausTdGrauOk : s.grausTdGrau}>{it.g2}</Text>
                      <Text style={grauAtual === 'I' ? s.grausTdGrauOkLast : s.grausTdGrauLast}>{it.g1}</Text>
                      <Text style={s.grausTdPts}>{itemAtual?.pontos ?? '-'}</Text>
                    </View>
                  )
                })}
                {/* Pontos mínimos — linha informativa */}
                <View style={{flexDirection:'row',borderTopWidth:0.5,borderColor:CINZA,backgroundColor:AZULLT}}>
                  <Text style={{flex:1,fontSize:6,color:AZUL,paddingVertical:3,paddingHorizontal:4,borderRightWidth:0.5,borderColor:CINZA,fontFamily:'Helvetica-Bold'}}>Pontos mínimos</Text>
                  <Text style={{flex:1.7,fontSize:6.5,color:AZUL,textAlign:'center',paddingVertical:3,borderRightWidth:0.5,borderColor:CINZA,fontFamily:'Helvetica-Bold'}}>10</Text>
                  <Text style={{flex:1.7,fontSize:6.5,color:AZUL,textAlign:'center',paddingVertical:3,borderRightWidth:0.5,borderColor:CINZA,fontFamily:'Helvetica-Bold'}}>6</Text>
                  <Text style={{flex:1.7,fontSize:6.5,color:AZUL,textAlign:'center',paddingVertical:3,borderRightWidth:0.5,borderColor:CINZA,fontFamily:'Helvetica-Bold'}}>4</Text>
                  <Text style={{width:44,fontSize:6,color:AZUL,textAlign:'center',paddingVertical:3,fontFamily:'Helvetica-Bold'}}>—</Text>
                </View>
                <View style={{flexDirection:'row',borderTopWidth:0.5,borderColor:CINZA,backgroundColor:AZULLT}}>
                  <Text style={{flex:1,fontSize:6,color:AZUL,paddingVertical:3,paddingHorizontal:4,borderRightWidth:0.5,borderColor:CINZA,fontFamily:'Helvetica-Bold'}}>Itens obrigatórios</Text>
                  <Text style={{flex:1.7,fontSize:5.5,color:TEXTO,paddingVertical:3,paddingHorizontal:3,textAlign:'center',borderRightWidth:0.5,borderColor:CINZA,lineHeight:1.3}}>2 e 4 no grau III, demais mín. grau II</Text>
                  <Text style={{flex:1.7,fontSize:5.5,color:TEXTO,paddingVertical:3,paddingHorizontal:3,textAlign:'center',borderRightWidth:0.5,borderColor:CINZA,lineHeight:1.3}}>2 e 4 mín. grau II, demais mín. grau I</Text>
                  <Text style={{flex:1.7,fontSize:5.5,color:TEXTO,paddingVertical:3,paddingHorizontal:3,textAlign:'center',borderRightWidth:0.5,borderColor:CINZA,lineHeight:1.3}}>Todos mín. grau I</Text>
                  <Text style={{width:44,fontSize:6,color:AZUL,textAlign:'center',paddingVertical:3}}>—</Text>
                </View>
                <View style={s.grausSomaRow}>
                  <Text style={s.grausSomaLbl}>Somatória de pontos</Text>
                  <Text style={s.grausSomaVal}>{somaPts}</Text>
                </View>
                <View style={s.grausResRow}>
                  <Text style={s.grausResLbl}>Grau de fundamentação obtido</Text>
                  <Text style={s.grausResVal}>{grauFinal}</Text>
                </View>
              </View>
            )
          })()}
          <Text style={[s.legendaTxt,{marginTop:3,fontStyle:'italic',color:'#475569'}]}>
            Para menos de 5 dados de mercado, o intervalo admissível de ajuste é de 0,80 a 1,25. (ABNT NBR 14653-2:2011)
          </Text>

          {/* Tabela de Precisão — nova versão com linha de resultado */}
          <SecHeader num={`${secGraus}.2`} titulo="Grau de Precisão — Tratamento por Fatores" />
          <View style={s.precTable}>
            <View style={s.precHeadRow}>
              <Text style={s.precThGrau}>Grau</Text>
              <Text style={s.precThDesc}>Amplitude do intervalo de confiança de 80% em torno da estimativa de tendência central</Text>
              <Text style={s.precThRes}>Resultado obtido</Text>
            </View>
            {[
              { grau: 'III', limite: '≤ 30%' },
              { grau: 'II',  limite: '≤ 40%' },
              { grau: 'I',   limite: '≤ 50%' },
            ].map(({ grau, limite }, i) => {
              const isOk = capaGrauPrec === grau
              const ic = cddm ? `${cddm.intervaloConfianca.toFixed(2).replace('.', ',')}%` : '-'
              return (
                <View key={grau} style={s.precBodyRow}>
                  <Text style={[s.precTdGrau, isOk ? { color: AZUL2 } : {}]}>{grau}</Text>
                  <Text style={s.precTdDesc}>{limite}</Text>
                  <Text style={isOk ? s.precTdResOk : s.precTdRes}>{isOk ? ic + ' ✓' : '—'}</Text>
                </View>
              )
            })}
            <View style={s.precResRow}>
              <View style={{ flex: 1, flexDirection: 'row' }}>
                <Text style={{ width: 50, fontSize: 7, fontFamily: 'Helvetica-Bold', color: BRANCO, paddingVertical: 3 }}> </Text>
                <Text style={[s.precResLbl, { flex: 1 }]}>Grau de precisão obtido</Text>
              </View>
              <Text style={s.precResVal}>{capaGrauPrec !== '-' ? `Precisão ${capaGrauPrec}` : '-'}</Text>
            </View>
          </View>
          <Text style={[s.legendaTxt,{marginTop:3,fontStyle:'italic',color:'#475569'}]}>
            * Quando a amplitude do intervalo de confiança ultrapassar 50%, não há classificação quanto à precisão e é necessária justificativa com base no diagnóstico do mercado. (ABNT NBR 14653-2:2011 — item 13.4)
          </Text>

          {/* Benfeitorias (opcional) */}
          {temBenfeitorias && (
            <>
              <SecHeader num="10" titulo="Cálculo das Benfeitorias" />
              <Image src={dados.imagemBenfeitorias!} style={{ maxHeight: 90, objectFit: 'contain', marginTop: 4 }} />
            </>
          )}

          {/* Conclusão */}
          <SecHeader num={secConcl} titulo="Considerações Finais" />
          <View style={{ borderWidth: 0.5, borderColor: CINZA, padding: 6, marginTop: 3 }}>
            <Text style={s.txtBold}>INFORMAÇÕES FINAIS</Text>
            <Text style={s.txt}>
              Avaliação para determinação do valor de mercado do imóvel localizado em {dados.endereco},
              feita pelo {metLabel(dados.metodoAvaliacao)}. O presente laudo se enquadra no Grau de
              Fundamentação {capaGrauFund} e Grau de Precisão {capaGrauPrec}, atendendo à Norma ABNT NBR 14.653.
            </Text>
            <View style={s.signArea}>
              <View style={s.signLine} />
              <Text style={s.signNome}>{dados.responsavelNome||'Responsável Técnico'}</Text>
              {dados.responsavelRegistro ? <Text style={s.signSub}>CREA/CAU: {dados.responsavelRegistro}</Text> : null}
              <Text style={s.signSub}>Lesath Engenharia – CNPJ: 49.068.717/0001-64</Text>
              {dados.dataLaudo && <Text style={[s.signSub,{marginTop:3}]}>{dataExtenso}</Text>}
            </View>
        </View>

        <View fixed style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
          <DocFooter pagina={4} total={totalPaginas} dataLaudo={dados.dataLaudo} />
        </View>
      </Page>

      {/* ══ PÁGINAS DE FOTOS ════════════════════════════════════ */}
      {paginasFotos.map((grupo:any[], idx:number) => (
        <Page key={`fotos-${idx}`} size="A4" style={s.page}>
          <DocHeader solicitante={dados.solicitante} proprietario={dados.proprietario} />

          <View style={s.content}>
            <View style={{ backgroundColor: AZUL2, paddingVertical: 4, paddingHorizontal: 8, marginBottom: 8, marginTop: 4 }}>
              <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: BRANCO }}>ANEXO A | DOCUMENTAÇÃO FOTOGRÁFICA</Text>
            </View>
            <View style={s.fotosGrid}>
              {grupo.map((foto:any, i:number) => (
                <View key={i} style={s.fotoItem}>
                  <Image src={foto.preview} style={s.fotoImg} />
                  <View style={s.fotoLeg}><Text>{foto.legenda||`Foto ${idx*6+i+1}`}</Text></View>
                </View>
              ))}
            </View>
          </View>

          <DocFooter pagina={6+idx} total={totalPaginas} dataLaudo={dados.dataLaudo} />
        </Page>
      ))}

    </Document>
  )
}
