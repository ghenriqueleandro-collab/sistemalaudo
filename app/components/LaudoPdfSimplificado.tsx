'use client'

import React from 'react'
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'

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
  const limpo = valor.replace(/[R$\s]/g,'').replace(/\.(?=\d{3}[,.])/g,'').replace(/\.(?=\d{3}$)/g,'').replace(',','.').replace(/[^\d.-]/g,'')
  return Number(limpo) || 0
}
function fa(valor?: string) {
  if (!valor) return '–'
  const n = cn(valor)
  return n > 0 ? `${n.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})} m²` : '–'
}
function cap(s: string) { return s.charAt(0).toUpperCase()+s.slice(1) }
function metLabel(m?: string) {
  if (m==='evolutivo')    return 'Método Evolutivo'
  if (m==='comparativo')  return 'Método Comparativo Direto de Dados de Mercado'
  if (m==='inferencia')   return 'Inferência Estatística'
  return m || '–'
}
function arredondar(v: number) { return Math.round(v * 100) / 100 }
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
    const partes: string[]=[]
    if (mi>0) partes.push(mi===1?'um milhão':`${ate999(mi)} milhões`)
    if (ml>0) partes.push(ml===1?'mil':`${ate999(ml)} mil`)
    if (re>0) partes.push(ate999(re))
    return partes.join(' e ')
  }
  const reais=Math.floor(valor)
  const cts=Math.round((valor-reais)*100)
  const parteReais=reais>0?`${inteiro(reais)} ${reais===1?'real':'reais'}`:''
  const parteCts=cts>0?`${ate999(cts)} ${cts===1?'centavo':'centavos'}`:''
  return [parteReais,parteCts].filter(Boolean).join(' e ')
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
  // Página — padding reserva espaço para header (topo) e footer (baixo) fixos
  page: {
    backgroundColor: BRANCO,
    paddingTop: 58,      // altura do header fixo
    paddingBottom: 26,   // altura do footer fixo
    paddingLeft: 28,
    paddingRight: 28,
    fontSize: 8,
    fontFamily: 'Helvetica',
    color: TEXTO,
    lineHeight: 1.35,
  },
  // Header fixo — aparece em toda página automaticamente
  fixedHeader: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
  },
  headerBg: {
    backgroundColor: AZUL,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 18,
  },
  headerLogoTxt: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: BRANCO },
  headerSub:     { fontSize: 8,  color: '#8FA4C7', marginTop: 1 },
  headerTag:     { fontSize: 8,  color: '#8FA4C7', letterSpacing: 1 },
  headerMeta:    { fontSize: 7.5, color: '#b8cce4', marginTop: 1 },
  headerAccent:  { height: 2.5, backgroundColor: AZUL2 },
  // Footer fixo
  fixedFooter: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: 20,
    backgroundColor: AZUL,
    paddingHorizontal: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  // Tabelas
  table:    { width: '100%', borderWidth: 0.5, borderColor: CINZA, marginTop: 3, backgroundColor: BRANCO },
  row:      { flexDirection: 'row', borderBottomWidth: 0.5, borderColor: CINZA },
  rowLast:  { flexDirection: 'row' },
  cellLbl:  { backgroundColor: AZULLT, paddingVertical: 3, paddingHorizontal: 5, fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: AZUL },
  cellVal:  { paddingVertical: 3, paddingHorizontal: 5, fontSize: 7.5, color: TEXTO, backgroundColor: BRANCO },
  cellHead: { backgroundColor: AZULLT, paddingVertical: 3, paddingHorizontal: 5, fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: AZUL, textAlign: 'center' },
  // Valores em destaque
  valorRow:  { flexDirection: 'row', marginTop: 5, marginBottom: 4 },
  valorDark: { flex: 1, backgroundColor: AZUL, padding: 8, marginRight: 4 },
  valorLight:{ flex: 1, backgroundColor: AZULLT, borderWidth: 0.5, borderColor: CINZA, padding: 8 },
  valorLbl:  { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#8FA4C7', letterSpacing: 0.5 },
  valorLblD: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: AZUL2, letterSpacing: 0.5 },
  valorNum:  { fontSize: 14, fontFamily: 'Helvetica-Bold', color: BRANCO, marginTop: 3 },
  valorNumD: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: AZUL, marginTop: 3 },
  valorExt:  { fontSize: 7, color: '#8FA4C7', marginTop: 4 },
  valorExtD: { fontSize: 7, color: '#5a7090', marginTop: 4 },
  // Graus resumo
  grauRow: { flexDirection: 'row', marginTop: 4, marginBottom: 6 },
  grauBox: { flex: 1, borderWidth: 0.5, borderColor: CINZA, marginRight: 4, backgroundColor: BRANCO },
  grauLbl: { backgroundColor: AZULLT, paddingVertical: 2.5, paddingHorizontal: 4, fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: AZUL, textAlign: 'center' },
  grauNum: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: AZUL2, textAlign: 'center', paddingVertical: 5 },
  // Assinatura
  signArea: { alignItems: 'center', marginTop: 18 },
  signLine: { width: 160, height: 0.5, backgroundColor: '#334155', marginBottom: 3 },
  signNome: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: AZUL },
  signSub:  { fontSize: 7.5, color: '#475569' },
  // Fotos
  foto:      { width: '100%', height: 120, objectFit: 'cover', borderWidth: 0.5, borderColor: CINZA, marginTop: 6, marginBottom: 4 },
  fotosGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 6, justifyContent: 'space-between' },
  fotoItem:  { width: '49%', marginBottom: 8 },
  fotoImg:   { height: 175, objectFit: 'cover', borderWidth: 0.5, borderColor: CINZA },
  fotoLeg:   { backgroundColor: AZULLT, paddingVertical: 2, paddingHorizontal: 4, fontSize: 7, color: AZUL, borderWidth: 0.5, borderColor: CINZA, borderTopWidth: 0 },
  // Texto
  txt:     { fontSize: 8, color: TEXTO, lineHeight: 1.5, marginTop: 4 },
  txtBold: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: AZUL },
  // Cards de elemento
  elemCard:  { marginTop: 5, borderWidth: 1, borderColor: '#b8c4d8', backgroundColor: BRANCO },
  elemHeader: {
    backgroundColor: AZUL,
    paddingVertical: 2.5,
    paddingHorizontal: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  elemHeaderTxt: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: BRANCO, letterSpacing: 0.5 },
  elemHeaderSub: { fontSize: 7, color: '#cfddef' },
  elemBody:  { flexDirection: 'row' },
  elemTable: { flex: 1, borderTopWidth: 0.5, borderColor: CINZA, backgroundColor: BRANCO },
  elemRowB:  { flexDirection: 'row', borderBottomWidth: 0.5, borderColor: CINZA },
  elemCellLbl: { backgroundColor: AZULLT, paddingVertical: 2.5, paddingHorizontal: 3, fontSize: 6.8, fontFamily: 'Helvetica-Bold', color: AZUL, borderRightWidth: 0.5, borderColor: CINZA, overflow: 'hidden' },
  elemCellVal: { paddingVertical: 2.5, paddingHorizontal: 4, fontSize: 6.8, color: TEXTO, borderRightWidth: 0.5, borderColor: CINZA, backgroundColor: BRANCO, overflow: 'hidden' },
  elemCellValLast: { paddingVertical: 2.5, paddingHorizontal: 4, fontSize: 6.8, color: TEXTO, backgroundColor: BRANCO, overflow: 'hidden' },
  elemFotoCol: { width: 120, borderLeftWidth: 0.5, borderColor: CINZA, alignItems: 'center', justifyContent: 'center' },
  elemFotoImg: { width: 120, height: 120, objectFit: 'cover' },
  // Tabela homogeneização
  homogTable: { borderWidth: 0.5, borderColor: CINZA, marginTop: 4, backgroundColor: BRANCO },
  homogRowH:  { flexDirection: 'row', backgroundColor: AZUL2, borderBottomWidth: 0.5, borderColor: CINZA },
  homogRowB:  { flexDirection: 'row', borderBottomWidth: 0.5, borderColor: CINZA },
  homogRow:   { flexDirection: 'row' },
  homogTh:    { fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: BRANCO, paddingVertical: 3, textAlign: 'center', borderRightWidth: 0.5, borderColor: '#475e9b' },
  homogThLast:{ fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: BRANCO, paddingVertical: 3, textAlign: 'center' },
  homogTd:    { fontSize: 6.5, color: TEXTO, paddingVertical: 2.5, textAlign: 'center', borderRightWidth: 0.5, borderColor: CINZA, backgroundColor: BRANCO },
  homogTdLast:{ fontSize: 6.5, color: TEXTO, paddingVertical: 2.5, textAlign: 'center', backgroundColor: BRANCO },
  homogTdOut: { fontSize: 6.5, color: '#9ca3af', fontFamily: 'Helvetica-Oblique', paddingVertical: 2.5, textAlign: 'center', borderRightWidth: 0.5, borderColor: CINZA },
  // Legenda + memorial
  legendaWrap: { marginTop: 4, marginBottom: 2, padding: 5, borderWidth: 0.5, borderColor: CINZA, backgroundColor: AZULLT },
  legendaTxt:  { fontSize: 6.5, color: TEXTO, lineHeight: 1.4 },
  memorialRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderColor: CINZA },
  memorialRowL:{ flexDirection: 'row' },
  memorialLbl: { flex: 1.5, paddingVertical: 2.5, paddingHorizontal: 5, fontSize: 7, color: TEXTO, borderRightWidth: 0.5, borderColor: CINZA },
  memorialVal: { flex: 1, paddingVertical: 2.5, paddingHorizontal: 5, fontSize: 7, fontFamily: 'Helvetica-Bold', color: AZUL, textAlign: 'right' },
  // Tabela de fundamentação
  grausTable:  { borderWidth: 0.5, borderColor: CINZA, marginTop: 4, backgroundColor: BRANCO },
  grausHead:   { flexDirection: 'row', backgroundColor: AZUL, borderBottomWidth: 0.5, borderColor: CINZA },
  grausItemRow:{ flexDirection: 'row', borderBottomWidth: 0.5, borderColor: CINZA },
  grausThIdx:  { width: 30, fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: BRANCO, textAlign: 'center', paddingVertical: 3, borderRightWidth: 0.5, borderColor: '#475e9b' },
  grausThDesc: { flex: 2, fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: BRANCO, paddingVertical: 3, paddingHorizontal: 4, borderRightWidth: 0.5, borderColor: '#475e9b' },
  grausThGrau: { flex: 1.7, fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: BRANCO, textAlign: 'center', paddingVertical: 3, borderRightWidth: 0.5, borderColor: '#475e9b' },
  grausThPts:  { width: 44, fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: BRANCO, textAlign: 'center', paddingVertical: 3 },
  grausTdIdx:  { width: 30, fontSize: 6.5, color: TEXTO, textAlign: 'center', paddingVertical: 3, borderRightWidth: 0.5, borderColor: CINZA },
  grausTdDesc: { flex: 2, fontSize: 6.5, color: TEXTO, paddingVertical: 3, paddingHorizontal: 4, borderRightWidth: 0.5, borderColor: CINZA },
  grausTdGrau: { flex: 1.7, fontSize: 6, color: TEXTO, paddingVertical: 3, paddingHorizontal: 3, borderRightWidth: 0.5, borderColor: CINZA, lineHeight: 1.3, backgroundColor: BRANCO },
  grausTdGrauOk:{ flex: 1.7, fontSize: 6, color: AZUL, fontFamily: 'Helvetica-Bold', paddingVertical: 3, paddingHorizontal: 3, borderRightWidth: 0.5, borderColor: CINZA, lineHeight: 1.3, backgroundColor: '#dbeafe' },
  grausTdPts:  { width: 44, fontSize: 7, fontFamily: 'Helvetica-Bold', color: AZUL, textAlign: 'center', paddingVertical: 3, backgroundColor: AZULLT },
  grausSomaRow:{ flexDirection: 'row', backgroundColor: AZUL, borderTopWidth: 0.5, borderColor: CINZA },
  grausSomaLbl:{ flex: 1, fontSize: 7, fontFamily: 'Helvetica-Bold', color: BRANCO, textAlign: 'right', paddingVertical: 3, paddingHorizontal: 6 },
  grausSomaVal:{ width: 44, fontSize: 9, fontFamily: 'Helvetica-Bold', color: BRANCO, textAlign: 'center', paddingVertical: 2 },
  grausResRow: { flexDirection: 'row', backgroundColor: AZUL2, borderTopWidth: 0.5, borderColor: '#3a57d0' },
  grausResLbl: { flex: 1, fontSize: 7, fontFamily: 'Helvetica-Bold', color: BRANCO, textAlign: 'right', paddingVertical: 3, paddingHorizontal: 6 },
  grausResVal: { width: 44, fontSize: 10, fontFamily: 'Helvetica-Bold', color: BRANCO, textAlign: 'center', paddingVertical: 2 },
  // Tabela de precisão
  precTable:   { borderWidth: 0.5, borderColor: CINZA, marginTop: 4, backgroundColor: BRANCO },
  precHeadRow: { flexDirection: 'row', backgroundColor: AZUL, borderBottomWidth: 0.5, borderColor: CINZA },
  precThGrau:  { width: 50, fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: BRANCO, textAlign: 'center', paddingVertical: 3, borderRightWidth: 0.5, borderColor: '#475e9b' },
  precThDesc:  { flex: 1, fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: BRANCO, paddingVertical: 3, paddingHorizontal: 5, borderRightWidth: 0.5, borderColor: '#475e9b' },
  precThRes:   { width: 80, fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: BRANCO, textAlign: 'center', paddingVertical: 3 },
  precBodyRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderColor: CINZA },
  precTdGrau:  { width: 50, fontSize: 7, fontFamily: 'Helvetica-Bold', color: AZUL, textAlign: 'center', paddingVertical: 3, borderRightWidth: 0.5, borderColor: CINZA },
  precTdDesc:  { flex: 1, fontSize: 6.5, color: TEXTO, paddingVertical: 3, paddingHorizontal: 5, borderRightWidth: 0.5, borderColor: CINZA, backgroundColor: BRANCO },
  precTdRes:   { width: 80, fontSize: 6.5, color: TEXTO, textAlign: 'center', paddingVertical: 3, backgroundColor: BRANCO },
  precTdResOk: { width: 80, fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: AZUL, textAlign: 'center', paddingVertical: 3, backgroundColor: '#dbeafe' },
  precResRow:  { flexDirection: 'row', backgroundColor: AZUL2 },
  precResLbl:  { flex: 1, fontSize: 7, fontFamily: 'Helvetica-Bold', color: BRANCO, textAlign: 'right', paddingVertical: 3, paddingHorizontal: 6 },
  precResVal:  { width: 80, fontSize: 9, fontFamily: 'Helvetica-Bold', color: BRANCO, textAlign: 'center', paddingVertical: 2 },
})

// ─── Componentes fixos ────────────────────────────────────────────────────────
function DocHeader({ solicitante, proprietario }: { solicitante?: string; proprietario?: string }) {
  return (
    <View fixed style={s.fixedHeader}>
      <View style={s.headerBg}>
        <View>
          <Text style={s.headerLogoTxt}>Lesath Engenharia</Text>
          <Text style={s.headerSub}>Precisão técnica que gera confiança</Text>
        </View>
        <View>
          <Text style={[s.headerTag, { textAlign: 'right' }]}>LAUDO DE AVALIAÇÃO</Text>
          {solicitante  && <Text style={[s.headerMeta, { textAlign: 'right' }]}>Solicitante: {solicitante}</Text>}
          {proprietario && <Text style={[s.headerMeta, { textAlign: 'right' }]}>Proponente: {proprietario}</Text>}
        </View>
      </View>
      <View style={s.headerAccent} />
    </View>
  )
}

function DocFooter({ dataLaudo }: { dataLaudo?: string }) {
  return (
    <View fixed style={s.fixedFooter}>
      <Text style={[s.footerTxt, { lineHeight: 1 }]}>www.lesathengenharia.com.br</Text>
      {dataLaudo ? <Text style={[s.footerTxt, { lineHeight: 1 }]}>{fd(dataLaudo)}</Text> : <Text />}
      <Text style={[s.footerPag, { lineHeight: 1 }]} render={({ pageNumber, totalPages }) => `Página ${pageNumber} / ${totalPages}`} />
    </View>
  )
}

function SecHeader({ num, titulo }: { num: string; titulo: string }) {
  return (
    <View style={s.secHeader}>
      <View style={s.secBadge}><Text style={[s.secTitle, { fontSize: 7.5 }]}>{num}</Text></View>
      <Text style={s.secTitle}>{titulo.toUpperCase()}</Text>
    </View>
  )
}

type RowProps = { label: string; value?: string | null; flex1?: number; flex2?: number; last?: boolean }
function Row({ label, value, flex1 = 1, flex2 = 2, last = false }: RowProps) {
  return (
    <View style={last ? s.rowLast : s.row}>
      <View style={[s.cellLbl, { flex: flex1, borderRightWidth: 0.5, borderColor: CINZA }]}>
        <Text>{label}</Text>
      </View>
      <View style={[s.cellVal, { flex: flex2 }]}>
        <Text>{value || '–'}</Text>
      </View>
    </View>
  )
}

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

  // Dados CDDM e Evolutivo
  const cddm        = (dados as any).dadosCalculoCDDM as any | undefined
  const evSnap      = (dados as any).dadosCalculoEvolutivo as any | undefined
  const isEvolutivo = dados.metodoAvaliacao === 'evolutivo'
  const elementosCddm   = cddm?.elementos || []
  const elementosEv     = evSnap?.elementos || []
  const elementosExibir = isEvolutivo ? elementosEv : elementosCddm
  const temCddm    = elementosCddm.length > 0
  const temElementos = elementosExibir.length > 0

  const capaMetodologia = isEvolutivo ? 'Evolutivo' : dados.metodoAvaliacao==='comparativo' ? 'Comparativo Direto' : dados.metodoAvaliacao||'–'
  const capaFinalidade  = dados.finalidade==='garantia' ? 'Avaliação para fins de garantia' : dados.finalidade==='execucao' ? 'Avaliação para fins de execução' : dados.finalidade||'–'

  const capaGrauFund = (()=>{
    if (isEvolutivo) {
      const soma=(dados.fundamentacaoEvolutivo||[]).reduce((s:number,i:any)=>s+(i.pontos||0),0)
      if(soma>=8)return'III';if(soma>=5)return'II';if(soma>=3)return'I';return'–'
    }
    const soma=(dados.fundamentacao||[]).reduce((s:number,i:any)=>s+(i.pontos||0),0)
    if(soma>=10)return'III';if(soma>=6)return'II';if(soma>=4)return'I';return'–'
  })()

  const capaGrauPrec = (()=>{
    const prec=dados.precisao||[]
    if(prec.length===0)return'–'
    if(prec.length===1)return (prec[0] as any).grau||'–'
    const soma=prec.reduce((s:number,i:any)=>s+(i.pontos||0),0)
    if(soma>=8)return'III';if(soma>=5)return'II';if(soma>=3)return'I';return'–'
  })()

  const hoje = new Date()
  const meses=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro']
  const dataExtenso = `São Paulo, ${hoje.getDate()} de ${meses[hoje.getMonth()]} de ${hoje.getFullYear()}.`

  const fotoFachada  = (dados.fotos||[]).find((f:any)=>(f.legenda||'').toLowerCase().includes('fachada'))||(dados.fotos||[])[0]
  const fotosAnexo   = dados.fotos||[]
  const divisoesFilt = (dados.divisoes||[]).filter((d:any)=>d.ambiente?.trim())
  const temBenfeitorias = !!dados.imagemBenfeitorias

  const secValor = temBenfeitorias ? '10' : '9'
  const secGraus = temBenfeitorias ? '11' : '10'
  const secConcl = temBenfeitorias ? '12' : '11'

  // ─── Helper: card de elemento (evolutivo e comparativo) ─────────────────────
  const renderElemento = (el: any, i: number) => {
    const ok = (v: any) => { const sv = String(v ?? '').trim(); return sv && sv !== '0' && sv !== '-' ? sv : '' }
    const vOf  = el.valorOferta > 0 ? fm(el.valorOferta) : ''
    const fOf  = parseFloat(String(el.fatorOferta||'').replace(',','.')) || 1
    const vLiq = el.valorOferta > 0 ? fm(el.valorOferta * fOf) : ''
    const vuOf = el.valorUnitarioOferta > 0 ? fm(el.valorUnitarioOferta) : (el.vuTerreno > 0 ? fm(el.vuTerreno) : '')
    const cidadeUF = [el.cidade, el.uf].filter(Boolean).join(' · ')
    const foto = el.foto || ''

    const bl = s.elemCellLbl
    const bv = s.elemCellVal
    const bvL = s.elemCellValLast
    const sep = { borderRightWidth: 0.5, borderColor: CINZA }


    // ── Labels: largura fixa calibrada para o texto mais longo de cada tipo
    //    Valores: flex:1 — preenche o restante automaticamente, com ou sem foto
    //    wrap={false} em todos os Text → nunca quebra linha dentro da célula
    const L1 = 76  // r1: 'Logradouro' (10c), 'Obs.' (4c)
    const L2 = 76  // r2: 'Coordenadas' (12c), 'Área construída' (15c max)
    const L3 = 60  // r3: 'Conservação' (11c), 'Dormitórios' (11c), 'Distância' (9c)

    const r1 = (l1: string, v1: any) => {
      const a = ok(v1); if (!a) return null
      return (
        <View style={s.elemRowB}>
          <View style={[bl,{width:L1}]}><Text wrap={false}>{l1}</Text></View>
          <View style={[bvL,{flex:1}]}><Text wrap={false}>{a}</Text></View>
        </View>
      )
    }
    const r2 = (l1: string, v1: any, l2: string, v2: any) => {
      const a=ok(v1),b=ok(v2); if(!a&&!b) return null
      if(!b) return r1(l1,a); if(!a) return r1(l2,b)
      return (
        <View style={s.elemRowB}>
          <View style={[bl,{width:L2}]}><Text wrap={false}>{l1}</Text></View>
          <View style={[bv,{flex:1,...sep}]}><Text wrap={false}>{a}</Text></View>
          <View style={[bl,{width:L2,...sep}]}><Text wrap={false}>{l2}</Text></View>
          <View style={[bvL,{flex:1}]}><Text wrap={false}>{b}</Text></View>
        </View>
      )
    }
    const r3 = (l1: string, v1: any, l2: string, v2: any, l3: string, v3: any) => {
      const a=ok(v1),b=ok(v2),c=ok(v3); if(!a&&!b&&!c) return null
      if(!c) return r2(l1,a,l2,b); if(!b&&!a) return r1(l3,c)
      if(!a) return r2(l2,b,l3,c); if(!b) return r2(l1,a,l3,c)
      return (
        <View style={s.elemRowB}>
          <View style={[bl,{width:L3}]}><Text wrap={false}>{l1}</Text></View>
          <View style={[bv,{flex:1,...sep}]}><Text wrap={false}>{a}</Text></View>
          <View style={[bl,{width:L3,...sep}]}><Text wrap={false}>{l2}</Text></View>
          <View style={[bv,{flex:1,...sep}]}><Text wrap={false}>{b}</Text></View>
          <View style={[bl,{width:L3,...sep}]}><Text wrap={false}>{l3}</Text></View>
          <View style={[bvL,{flex:1}]}><Text wrap={false}>{c}</Text></View>
        </View>
      )
    }

    const linhas = [
      r3('Tipo', el.tipo, 'Data', el.data ? fd(el.data) : '', 'Empreen.', el.empreendimento),
      r1('Logradouro', el.logradouro || el.endereco),
      r3('Bairro', el.bairro, 'Cidade/UF', cidadeUF, 'Distância', el.distanciaAvaliando || el.distancia),
      r2('Coordenadas', el.coordenadas, 'Fonte', el.fonte),
      r3('Conservação', el.estadoConservacao, 'Idade', el.idadeAparente > 0 ? `${el.idadeAparente} anos` : (el.idade ? `${el.idade} anos` : ''), 'Andar', el.andar > 0 ? String(el.andar) : ''),
      el.areaTerreno > 0 ? r2('Área terreno', `${Number(el.areaTerreno).toLocaleString('pt-BR')} m²`, 'Área construída', el.areaConstruida > 0 ? `${Number(el.areaConstruida).toLocaleString('pt-BR')} m²` : '') : null,
      r2('Área c./útil', el.area > 0 ? `${el.area.toLocaleString('pt-BR')} m²` : '', 'Padrão', el.padraoConstrutivo),
      r3('Dormitórios', el.dormitorios > 0 ? String(el.dormitorios) : '', 'Suítes', el.suites > 0 ? String(el.suites) : '', 'Vagas', el.vagas > 0 ? String(el.vagas) : ''),
      r3('Valor oferta', vOf, 'Vl. líquido', vLiq !== vOf ? vLiq : '', 'V.U./m²', vuOf),
      r3('F. Oferta', ok(el.fatorOferta), 'Nota local', ok(el.fatorLocalBruto || el.notaLocal || el.fatorLocal), 'F. Andar', ok(el.fatorAndarBruto || el.fatorAndar)),
      r3('Tipo oferta', el.tipoOferta, 'Status', el.status, 'Telefone', el.telefone),
      el.link ? (
        <View key="link" style={s.elemRowB}>
          <View style={[bl,{width:L1}]}><Text wrap={false}>Link</Text></View>
          <View style={[bvL,{flex:1}]}>
            <Text wrap={false} style={{fontSize:6.3,color:AZUL2}}>{String(el.link).slice(0,100)}</Text>
          </View>
        </View>
      ) : null,
      r1('Obs.', el.observacoes),
    ].filter(Boolean)

    if (linhas.length === 0) return null

    return (
      <View key={`elem-${i}`} wrap={false} style={s.elemCard}>
        <View style={[s.elemHeader, { marginTop: 0 }]}>
          <Text style={s.elemHeaderTxt}>{isEvolutivo ? 'ELEMENTO' : 'ELEMENTO COMPARATIVO'} {String(i+1).padStart(2,'0')}</Text>
          <Text style={s.elemHeaderSub}>{el.fonte||''}{el.data ? ` • ${fd(el.data)}` : ''}</Text>
        </View>
        <View style={s.elemBody}>
          <View style={s.elemTable}>{linhas}</View>
          {foto ? (
            <View style={s.elemFotoCol}>
              <Image src={foto} style={s.elemFotoImg} />
            </View>
          ) : null}
        </View>
      </View>
    )
  }

  return (
    <Document>
      {/* ── ÚNICA PÁGINA PRINCIPAL — header e footer fixos, conteúdo flui naturalmente ── */}
      <Page size="A4" style={s.page}>
        <DocHeader solicitante={dados.solicitante} proprietario={dados.proprietario} />
        <DocFooter dataLaudo={dados.dataLaudo} />

        {/* ── TÍTULO ───────────────────────────────────────────────────────── */}
        <View style={s.titleBand}>
          <Text style={s.titleTxt}>LAUDO DE AVALIAÇÃO</Text>
        </View>

        {/* ── 1. IDENTIFICAÇÃO ─────────────────────────────────────────────── */}
        <SecHeader num="1" titulo="Identificação" />
        <View style={s.table}>
          <Row label="Matrícula"   value={dados.matricula} />
          <Row label="Solicitante" value={dados.solicitante} />
          <Row label="Proponente"  value={dados.proprietario} />
          <Row label="Logradouro"  value={logradouro} />
          {dados.coordenadasImovel && <Row label="Coordenadas" value={dados.coordenadasImovel} />}
          <View style={s.rowLast}>
            <View style={[s.cellLbl,{flex:0.7,borderRightWidth:0.5,borderColor:CINZA}]}><Text>CEP</Text></View>
            <View style={[s.cellVal,{flex:1.2,borderRightWidth:0.5,borderColor:CINZA}]}><Text>{cep||'–'}</Text></View>
            <View style={[s.cellLbl,{flex:0.7,borderRightWidth:0.5,borderColor:CINZA}]}><Text>Bairro</Text></View>
            <View style={[s.cellVal,{flex:1.5,borderRightWidth:0.5,borderColor:CINZA}]}><Text>{bairro||'–'}</Text></View>
            <View style={[s.cellLbl,{flex:0.8,borderRightWidth:0.5,borderColor:CINZA}]}><Text>Cidade</Text></View>
            <View style={[s.cellVal,{flex:1.5,borderRightWidth:0.5,borderColor:CINZA}]}><Text>{cidade||'–'}</Text></View>
            <View style={[s.cellLbl,{flex:0.4,borderRightWidth:0.5,borderColor:CINZA}]}><Text>UF</Text></View>
            <View style={[s.cellVal,{flex:0.7}]}><Text>{uf||'–'}</Text></View>
          </View>
        </View>

        {fotoFachada && <Image src={fotoFachada.preview} style={s.foto} />}

        {/* ── 2. AVALIAÇÃO ─────────────────────────────────────────────────── */}
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

        {/* ── 3. CARACTERÍSTICAS E DIMENSÕES DO AVALIANDO (unificado) ────────── */}
        <SecHeader num="3" titulo="Características e Dimensões do Avaliando" />
        <View style={[s.table, { marginTop: 3 }]}>
          {/* Linha 1: Tipo + IPTU */}
          <View style={s.row}>
            <View style={[s.cellLbl,{flex:1,borderRightWidth:0.5,borderColor:CINZA}]}><Text>Tipo</Text></View>
            <View style={[s.cellVal,{flex:1.5,borderRightWidth:0.5,borderColor:CINZA}]}><Text>{dados.tipo||'–'}</Text></View>
            <View style={[s.cellLbl,{flex:1,borderRightWidth:0.5,borderColor:CINZA}]}><Text>IPTU</Text></View>
            <View style={[s.cellVal,{flex:1.5}]}><Text>{dados.iptu||'–'}</Text></View>
          </View>
          {/* Linha 2: Área terreno + Área construída */}
          <View style={s.row}>
            <View style={[s.cellLbl,{flex:1,borderRightWidth:0.5,borderColor:CINZA}]}><Text>Área de terreno</Text></View>
            <View style={[s.cellVal,{flex:1.5,borderRightWidth:0.5,borderColor:CINZA}]}><Text>{fa(dados.areaTerrenoTotal)}</Text></View>
            <View style={[s.cellLbl,{flex:1,borderRightWidth:0.5,borderColor:CINZA}]}><Text>Área construída total</Text></View>
            <View style={[s.cellVal,{flex:1.5}]}><Text>{fa(dados.areaConstruidaTotal)}</Text></View>
          </View>
          {/* Linha 3: Área averbada + Área não averbada */}
          <View style={s.row}>
            <View style={[s.cellLbl,{flex:1,borderRightWidth:0.5,borderColor:CINZA}]}><Text>Área averbada</Text></View>
            <View style={[s.cellVal,{flex:1.5,borderRightWidth:0.5,borderColor:CINZA}]}><Text>{fa(dados.areaConstruidaAverbada)}</Text></View>
            <View style={[s.cellLbl,{flex:1,borderRightWidth:0.5,borderColor:CINZA}]}><Text>Área não averbada</Text></View>
            <View style={[s.cellVal,{flex:1.5}]}><Text>{fa(String(dados.areaConstruidaNaoAverbada??0))}</Text></View>
          </View>
          {/* Linha 4: Padrão + Idade aparente */}
          <View style={s.row}>
            <View style={[s.cellLbl,{flex:1,borderRightWidth:0.5,borderColor:CINZA}]}><Text>Padrão construtivo</Text></View>
            <View style={[s.cellVal,{flex:1.5,borderRightWidth:0.5,borderColor:CINZA}]}><Text>{dados.padrao||'–'}</Text></View>
            <View style={[s.cellLbl,{flex:1,borderRightWidth:0.5,borderColor:CINZA}]}><Text>Idade aparente</Text></View>
            <View style={[s.cellVal,{flex:1.5}]}><Text>{dados.idadeAparente ? dados.idadeAparente+' anos' : '–'}</Text></View>
          </View>
          {/* Linha 5: Conservação + Finalidade */}
          <View style={s.rowLast}>
            <View style={[s.cellLbl,{flex:1,borderRightWidth:0.5,borderColor:CINZA}]}><Text>Estado de conservação</Text></View>
            <View style={[s.cellVal,{flex:1.5,borderRightWidth:0.5,borderColor:CINZA}]}><Text>{dados.estadoConservacao||'–'}</Text></View>
            <View style={[s.cellLbl,{flex:1,borderRightWidth:0.5,borderColor:CINZA}]}><Text>Finalidade</Text></View>
            <View style={[s.cellVal,{flex:1.5}]}><Text>{capaFinalidade}</Text></View>
          </View>
        </View>

        {/* ── 4. DOCUMENTAÇÃO (renumerada de 5 para 4) ─────────────────────── */}
        <SecHeader num="4" titulo="Documentação Apresentada" />
        <View style={s.table}>
          <Row label="Matrícula"             value={dados.matricula} />
          <Row label="Inscrição imobiliária" value={dados.iptu} last />
        </View>

        {/* ── 6. DESCRIÇÃO ─────────────────────────────────────────────────── */}
        <SecHeader num="5" titulo="Descrição do Imóvel Avaliando" />
        <View style={{ borderWidth: 0.5, borderColor: CINZA, padding: 6, marginTop: 3 }}>
          <Text style={s.txtBold}>6.1 - Descrição do imóvel avaliando</Text>
          <Text style={s.txt}>
            {dados.consideracoesMercado
              ? dados.consideracoesMercado.substring(0,500)+(dados.consideracoesMercado.length>500?'...':'')
              : `Imóvel do tipo ${dados.tipo||'residencial'}, localizado em ${dados.endereco}.`}
          </Text>
        </View>

        {/* ── 7. DIVISÕES ──────────────────────────────────────────────────── */}
        {divisoesFilt.length > 0 && (
          <>
            <SecHeader num="6" titulo="Características do Imóvel Avaliando" />
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

        {/* Mapa de localização (se disponível) — sem título de seção separado */}
        {dados.localizacaoComparativos && (
          <View wrap={false} style={{ marginTop: 6 }}>
            <Image src={dados.localizacaoComparativos} style={{ width: '100%', height: 180, objectFit: 'cover', borderWidth: 0.5, borderColor: CINZA }} />
          </View>
        )}

        {/* ── 8. PESQUISA IMOBILIÁRIA (renumerado de 9 para 8) ─────────────── */}
        <SecHeader num="7" titulo="Pesquisa Imobiliária" />
        <View style={s.table}>
          <View style={s.row}>
            <View style={[s.cellHead,{flex:2,borderRightWidth:0.5,borderColor:CINZA}]}><Text>Período</Text></View>
            <View style={[s.cellHead,{flex:1.5,borderRightWidth:0.5,borderColor:CINZA}]}><Text>Tipo</Text></View>
            <View style={[s.cellHead,{flex:0.8,borderRightWidth:0.5,borderColor:CINZA}]}><Text>Qtd.</Text></View>
            <View style={[s.cellHead,{flex:2}]}><Text>Metodologia</Text></View>
          </View>
          <View style={s.rowLast}>
            <View style={[s.cellVal,{flex:2,borderRightWidth:0.5,borderColor:CINZA}]}>
              <Text>{dados.periodoPesquisaInicio&&dados.periodoPesquisaFim?`${fd(dados.periodoPesquisaInicio)} a ${fd(dados.periodoPesquisaFim)}`:'–'}</Text>
            </View>
            <View style={[s.cellVal,{flex:1.5,borderRightWidth:0.5,borderColor:CINZA}]}><Text>{dados.tipoInformacoesObtidas||'–'}</Text></View>
            <View style={[s.cellVal,{flex:0.8,borderRightWidth:0.5,borderColor:CINZA,textAlign:'center'}]}>
              <Text>{(temCddm ? elementosCddm.length : Number(dados.quantidadeElementos||0)) || '–'}</Text>
            </View>
            <View style={[s.cellVal,{flex:2}]}><Text>{metLabel(dados.metodoAvaliacao)}</Text></View>
          </View>
        </View>

        {/* ── Cards de elementos ───────────────────────────────────────────── */}
        {temElementos && elementosExibir.map((el: any, i: number) => renderElemento(el, i))}

        {/* ── 9.1. HOMOGENEIZAÇÃO (só comparativo) ────────────────────────── */}
        {temCddm && (
          <>
            <SecHeader num="7.1" titulo="Homogeneização" />
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
                const td = el.saneado ? s.homogTd : s.homogTdOut
                return (
                  <View key={`h-${i}`} style={isLast ? s.homogRow : s.homogRowB}>
                    <Text style={[td,{flex:0.6}]}>{i+1}</Text>
                    <Text style={[td,{flex:1.1}]}>{fm(el.valorUnitarioOferta || 0)}</Text>
                    <Text style={[td,{flex:0.8}]}>{(el.fatorLocal||1).toFixed(4)}</Text>
                    <Text style={[td,{flex:0.8}]}>{(el.fatorPadrao||1).toFixed(4)}</Text>
                    <Text style={[td,{flex:0.8}]}>{(el.fatorFOC||1).toFixed(4)}</Text>
                    <Text style={[td,{flex:0.8}]}>{(el.fatorAndar||1).toFixed(4)}</Text>
                    <Text style={[td,{flex:0.8}]}>{(el.fatorVaga||1).toFixed(4)}</Text>
                    <Text style={[td,{flex:0.8}]}>{(el.fatorArea||1).toFixed(4)}</Text>
                    <Text style={[el.saneado ? s.homogTdLast : {...s.homogTdOut,borderRightWidth:0},{flex:1.2}]}>{fm(el.vuHomog || 0)}</Text>
                  </View>
                )
              })}
            </View>
            <View style={s.legendaWrap}>
              <Text style={[s.legendaTxt,{fontFamily:'Helvetica-Bold',marginBottom:2}]}>Legenda dos fatores aplicados:</Text>
              <Text style={s.legendaTxt}>F.Local = Fator de Localização    F.Padrão = Fator de Padrão Construtivo    F.FOC = Fator de Obsolescência e Conservação</Text>
              <Text style={s.legendaTxt}>F.Andar = Fator de Andar    F.Vaga = Fator de Vaga de Garagem    F.Área = Fator de Adequação por Área</Text>
            </View>
          </>
        )}

        {/* ── Memorial de cálculos (comparativo) ──────────────────────────── */}
        {temCddm && cddm && (
          <View style={{ flexDirection: 'row', marginTop: 6 }}>
            <View style={{ flex: 1.3, borderWidth: 0.5, borderColor: CINZA, marginRight: 4 }}>
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
                    <Text style={{flex:1,fontSize:6.5,color:TEXTO,textAlign:'center',paddingVertical:2,borderTopWidth:0.5,borderRightWidth:0.5,borderColor:CINZA}}>{'<= 30%'}</Text>
                    <Text style={{flex:1,fontSize:6.5,color:TEXTO,textAlign:'center',paddingVertical:2,borderTopWidth:0.5,borderRightWidth:0.5,borderColor:CINZA}}>{'<= 40%'}</Text>
                    <Text style={{flex:1,fontSize:6.5,color:TEXTO,textAlign:'center',paddingVertical:2,borderTopWidth:0.5,borderColor:CINZA}}>{'<= 50%'}</Text>
                  </View>
                </View>
              </View>
              <View style={s.memorialRow}>
                <Text style={[s.memorialLbl,{flex:2,fontFamily:'Helvetica-Bold'}]}>Intervalo de confiança</Text>
                <Text style={[s.memorialVal,{flex:1.1,textAlign:'center'}]}>{cddm.intervaloConfianca.toFixed(2).replace('.',',')}%</Text>
              </View>
              <View style={s.memorialRowL}>
                <Text style={[s.memorialLbl,{flex:2,fontFamily:'Helvetica-Bold',backgroundColor:AZUL,color:BRANCO}]}>GRAU DE PRECISÃO</Text>
                <Text style={[s.memorialVal,{flex:1.1,textAlign:'center',backgroundColor:'#dbeafe',fontSize:9}]}>{cddm.grauPrecisao || '–'}</Text>
              </View>
            </View>
            <View style={{ flex: 1, borderWidth: 0.5, borderColor: CINZA }}>
              <View style={{ backgroundColor: AZUL, paddingVertical: 3, paddingHorizontal: 5 }}>
                <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: BRANCO, textAlign: 'center' }}>MEMORIAL DE CÁLCULOS</Text>
              </View>
              <View style={s.memorialRow}><Text style={s.memorialLbl}>Média Saneada</Text><Text style={s.memorialVal}>{fm(cddm.mediaSaneada)}</Text></View>
              <View style={s.memorialRow}><Text style={s.memorialLbl}>Limite superior (+30%)</Text><Text style={s.memorialVal}>{fm(cddm.limiteSup30)}</Text></View>
              <View style={s.memorialRow}><Text style={s.memorialLbl}>Limite inferior (-30%)</Text><Text style={s.memorialVal}>{fm(cddm.limiteInf30)}</Text></View>
              <View style={s.memorialRow}><Text style={s.memorialLbl}>Desvio Padrão</Text><Text style={s.memorialVal}>{cddm.desvioPadrao.toFixed(2).replace('.',',')}</Text></View>
              <View style={s.memorialRow}><Text style={s.memorialLbl}>Coeficiente de Variação</Text><Text style={s.memorialVal}>{cddm.coefVariacao.toFixed(2).replace('.',',')}%</Text></View>
              <View style={s.memorialRow}><Text style={s.memorialLbl}>Elementos saneados</Text><Text style={s.memorialVal}>{elementosCddm.filter((e: any) => e.saneado).length} de {elementosCddm.length}</Text></View>
              <View style={s.memorialRow}><Text style={s.memorialLbl}>T de Student</Text><Text style={s.memorialVal}>{cddm.tStudent.toFixed(3).replace('.',',')}</Text></View>
              <View style={s.memorialRow}><Text style={s.memorialLbl}>Limite Sup. IC</Text><Text style={s.memorialVal}>{fm(cddm.limiteSuperior)}</Text></View>
              <View style={s.memorialRowL}><Text style={s.memorialLbl}>Limite Inf. IC</Text><Text style={s.memorialVal}>{fm(cddm.limiteInferior)}</Text></View>
            </View>
          </View>
        )}

        <Text style={[s.legendaTxt,{marginTop:4,marginBottom:2,fontStyle:'italic',color:'#475569'}]}>
          * Quando a amplitude do intervalo de confiança ultrapassar 50% não há classificação do resultado quanto à precisão e é necessária justificativa com base no diagnóstico do mercado. (ABNT 14653-2 - 2011 - Item 13.4)
        </Text>

        {/* ── 10. VALOR FINAL DA AVALIAÇÃO ─────────────────────────────────── */}
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

        {/* Benfeitorias */}
        {temBenfeitorias && (
          <>
            <SecHeader num="10" titulo="Cálculo das Benfeitorias" />
            <Image src={dados.imagemBenfeitorias!} style={{ maxHeight: 90, objectFit: 'contain', marginTop: 4 }} />
          </>
        )}

        {/* ── 11. GRAU DE FUNDAMENTAÇÃO E PRECISÃO ────────────────────────── */}
        <SecHeader num={secGraus} titulo="Grau de Fundamentação e Precisão" />
        <View style={s.grauRow}>
          {[
            { label: 'Grau de Fundamentação', valor: capaGrauFund },
            { label: 'Grau de Precisão',      valor: capaGrauPrec },
            { label: 'Metodologia aplicada',  valor: capaMetodologia },
          ].map(({ label, valor }) => (
            <View key={label} style={s.grauBox}>
              <Text style={s.grauLbl}>{label}</Text>
              <Text style={[s.grauNum, valor && valor.length > 5 ? { fontSize: 10 } : {}]}>{valor}</Text>
            </View>
          ))}
        </View>

        {/* 11.1 — Tabela de fundamentação */}
        <SecHeader num={`${secGraus}.1`} titulo="Grau de Fundamentação — Tratamento por Fatores" />
        {(()=>{
          const fund = (dados.fundamentacao || []) as any[]
          const itensPadrao = [
            { id: '01', desc: 'Caracterização do imóvel avaliando', g3: 'Completa quanto a todos os fatores analisados', g2: 'Completa quanto aos fatores utilizados no tratamento', g1: 'Adoção de situação paradigma' },
            { id: '02', desc: 'Quantidade mínima de dados de mercado efetivamente utilizados', g3: '12', g2: '5', g1: '3' },
            { id: '03', desc: 'Identificação dos dados de mercado', g3: 'Informações de todas as características com foto e características observadas pelo autor do laudo', g2: 'Informações relativas a todas as características dos dados analisados', g1: 'Informações relativas às características dos fatores utilizados' },
            { id: '04', desc: 'Intervalo admissível de ajuste para o conjunto de fatores', g3: '0,80 a 1,25', g2: '0,50 a 2,00', g1: '0,40 a 2,50' },
          ]
          const somaPts = fund.reduce((acc: number, f: any) => acc + (f?.pontos || 0), 0)
          const grauFinal = somaPts >= 10 ? 'III' : somaPts >= 6 ? 'II' : somaPts >= 4 ? 'I' : '–'
          return (
            <View style={s.grausTable}>
              <View style={s.grausHead}>
                <Text style={s.grausThIdx}>Item</Text>
                <Text style={s.grausThDesc}>Descrição</Text>
                <Text style={s.grausThGrau}>Grau III</Text>
                <Text style={s.grausThGrau}>Grau II</Text>
                <Text style={s.grausThGrau}>Grau I</Text>
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
                    <Text style={grauAtual === 'I' ? s.grausTdGrauOk : s.grausTdGrau}>{it.g1}</Text>
                    <Text style={s.grausTdPts}>{itemAtual?.pontos ?? '–'}</Text>
                  </View>
                )
              })}
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

        {/* 11.2 — Tabela de precisão */}
        <SecHeader num={`${secGraus}.2`} titulo="Grau de Precisão — Tratamento por Fatores" />
        <View style={s.precTable}>
          <View style={s.precHeadRow}>
            <Text style={s.precThGrau}>Grau</Text>
            <Text style={s.precThDesc}>Amplitude do intervalo de confiança de 80% em torno da estimativa de tendência central</Text>
            <Text style={s.precThRes}>Resultado obtido</Text>
          </View>
          {([
            { grau: 'III', limite: '<= 30%' },
            { grau: 'II',  limite: '<= 40%' },
            { grau: 'I',   limite: '<= 50%' },
          ] as const).map(({ grau, limite }) => {
            const isOk = capaGrauPrec === grau
            const ic = cddm ? `${cddm.intervaloConfianca.toFixed(2).replace('.',',')}%` : '–'
            return (
              <View key={grau} style={s.precBodyRow}>
                <Text style={[s.precTdGrau, isOk ? { color: AZUL2 } : {}]}>{grau}</Text>
                <Text style={s.precTdDesc}>{limite}</Text>
                <Text style={isOk ? s.precTdResOk : s.precTdRes}>{isOk ? `${ic} ✓` : '—'}</Text>
              </View>
            )
          })}
          <View style={s.precResRow}>
            <Text style={s.precResLbl}>Grau de precisão obtido</Text>
            <Text style={s.precResVal}>{capaGrauPrec !== '–' ? `Precisão ${capaGrauPrec}` : '–'}</Text>
          </View>
        </View>
        <Text style={[s.legendaTxt,{marginTop:3,fontStyle:'italic',color:'#475569'}]}>
          * Quando a amplitude do intervalo de confiança ultrapassar 50%, não há classificação quanto à precisão e é necessária justificativa com base no diagnóstico do mercado. (ABNT NBR 14653-2:2011 — item 13.4)
        </Text>

        {/* ── 12. CONCLUSÃO ────────────────────────────────────────────────── */}
        <SecHeader num={secConcl} titulo="Considerações Finais" />
        <View style={{ borderWidth: 0.5, borderColor: CINZA, padding: 8, marginTop: 3 }}>
          <Text style={s.txtBold}>INFORMAÇÕES FINAIS</Text>
          <Text style={[s.txt,{marginTop:4}]}>
            Avaliação para determinação do valor de mercado do imóvel localizado em {dados.endereco},
            feita pelo {metLabel(dados.metodoAvaliacao)}. O presente laudo se enquadra no Grau de Fundamentação {capaGrauFund} e
            Grau de Precisão {capaGrauPrec}, atendendo à Norma ABNT NBR 14.653.
          </Text>
          {dados.observacoesFinais && <Text style={[s.txt,{marginTop:4}]}>{dados.observacoesFinais}</Text>}
        </View>
        <View style={s.signArea}>
          <View style={s.signLine} />
          <Text style={s.signNome}>{dados.responsavelNome||'Responsável Técnico'}</Text>
          {dados.responsavelRegistro ? <Text style={s.signSub}>CREA/CAU: {dados.responsavelRegistro}</Text> : null}
          <Text style={s.signSub}>Lesath Engenharia – CNPJ: 49.068.717/0001-64</Text>
          {dados.dataLaudo && <Text style={[s.signSub,{marginTop:3}]}>{dataExtenso}</Text>}
        </View>
      </Page>

      {/* ── PÁGINA DE FOTOS — sequenciadas, sem limite por página ────────── */}
      {fotosAnexo.length > 0 && (
        <Page size="A4" style={s.page}>
          <DocHeader solicitante={dados.solicitante} proprietario={dados.proprietario} />
          <DocFooter dataLaudo={dados.dataLaudo} />
          <View style={{ backgroundColor: AZUL2, paddingVertical: 4, paddingHorizontal: 8, marginBottom: 8, marginTop: 4 }}>
            <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: BRANCO }}>ANEXO | DOCUMENTAÇÃO FOTOGRÁFICA</Text>
          </View>
          <View style={s.fotosGrid}>
            {fotosAnexo.map((f:any, fi:number) => (
              <View key={fi} style={s.fotoItem} wrap={false}>
                <Image src={f.preview} style={s.fotoImg} />
                <Text style={s.fotoLeg}>{f.legenda || `Foto ${fi+1}`}</Text>
              </View>
            ))}
          </View>
        </Page>
      )}
    </Document>
  )
}
