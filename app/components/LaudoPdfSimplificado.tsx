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
import type { DadosLaudo } from '../visualizar-laudo/LaudoPdf'

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
  return Number(valor.replace(/\s/g,'').replace(/\./g,'').replace(',','.').replace(/[^\d.-]/g,'')) || 0
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
function arredondar(v: number) { return Math.round(v/100)*100 }
function fa(valor?: string) {
  if (!valor) return '-'
  const n = parseFloat(valor.replace(',','.'))
  if (isNaN(n)) return valor
  return n.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})+' m²'
}

// ─── Paleta ───────────────────────────────────────────────────────────────────

const AZUL   = '#17325C'
const AZUL2  = '#2347C6'
const AZULLT = '#EAF0FB'
const CINZA  = '#C9D3E6'
const BRANCO = '#ffffff'
const TEXTO  = '#1e293b'

// ─── Estilos ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: {
    backgroundColor: BRANCO,
    paddingHorizontal: 28,
    paddingTop: 14,
    paddingBottom: 40,
    fontSize: 8,
    fontFamily: 'Helvetica',
    color: TEXTO,
    lineHeight: 1.35,
  },
  header: {
    backgroundColor: AZUL,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  headerAccent: { height: 2.5, backgroundColor: AZUL2, marginBottom: 6 },
  headerLogoTxt: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: BRANCO },
  headerSub:     { fontSize: 8, color: '#8FA4C7', marginTop: 1 },
  headerTag:     { fontSize: 8, color: '#8FA4C7', letterSpacing: 1 },
  headerMeta:    { fontSize: 7.5, color: '#b8cce4', marginTop: 1 },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: AZUL,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  footerTxt: { fontSize: 7.5, color: '#8FA4C7' },
  footerPag: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: BRANCO },
  secHeader: {
    backgroundColor: AZUL,
    paddingVertical: 3.5,
    paddingHorizontal: 8,
    marginTop: 8,
    marginBottom: 0,
  },
  secTitle: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: BRANCO, textTransform: 'uppercase', letterSpacing: 0.5 },
  titleBand: {
    backgroundColor: AZUL2,
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginBottom: 6,
    marginTop: 4,
  },
  titleTxt: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: BRANCO, textAlign: 'center' },
  table: { width: '100%', borderWidth: 0.5, borderColor: CINZA, marginTop: 3 },
  row:   { flexDirection: 'row', borderBottomWidth: 0.5, borderColor: CINZA },
  rowLast: { flexDirection: 'row' },
  cellLbl: { backgroundColor: AZULLT, paddingVertical: 3, paddingHorizontal: 5, fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: AZUL },
  cellVal: { paddingVertical: 3, paddingHorizontal: 5, fontSize: 7.5, color: TEXTO },
  cellHead:{ backgroundColor: AZULLT, paddingVertical: 3, paddingHorizontal: 5, fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: AZUL, textAlign: 'center' },
  valorRow:  { flexDirection: 'row', gap: 5, marginTop: 5, marginBottom: 4 },
  valorDark: { flex: 1, backgroundColor: AZUL, padding: 8, borderRadius: 2 },
  valorLight:{ flex: 1, backgroundColor: AZULLT, borderWidth: 0.5, borderColor: CINZA, padding: 8, borderRadius: 2 },
  valorLbl:  { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#8FA4C7', letterSpacing: 0.5 },
  valorLblD: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: AZUL2, letterSpacing: 0.5 },
  valorNum:  { fontSize: 14, fontFamily: 'Helvetica-Bold', color: BRANCO, marginTop: 3 },
  valorNumD: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: AZUL, marginTop: 3 },
  valorExt:  { fontSize: 7, color: '#8FA4C7', marginTop: 1 },
  valorExtD: { fontSize: 7, color: '#5a7090', marginTop: 1 },
  grauRow: { flexDirection: 'row', gap: 5, marginTop: 4, marginBottom: 6 },
  grauBox: { flex: 1, borderWidth: 0.5, borderColor: CINZA },
  grauLbl: { backgroundColor: AZULLT, paddingVertical: 2.5, paddingHorizontal: 4, fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: AZUL, textAlign: 'center' },
  grauNum: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: AZUL2, textAlign: 'center', paddingVertical: 6 },
  signArea: { alignItems: 'center', marginTop: 18 },
  signLine: { width: 160, height: 0.5, backgroundColor: '#334155', marginBottom: 3 },
  signNome: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: AZUL },
  signSub:  { fontSize: 7.5, color: '#475569' },
  foto:     { height: 130, objectFit: 'cover', borderWidth: 0.5, borderColor: CINZA, marginTop: 6, marginBottom: 4 },
  fotosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 6 },
  fotoItem:  { width: '48.5%' },
  fotoImg:   { height: 95, objectFit: 'cover', borderWidth: 0.5, borderColor: CINZA },
  fotoLeg:   { backgroundColor: AZULLT, paddingVertical: 2, paddingHorizontal: 4, fontSize: 7, color: AZUL, borderWidth: 0.5, borderColor: CINZA, borderTopWidth: 0 },
  txt:     { fontSize: 8, color: TEXTO, lineHeight: 1.5, marginTop: 4 },
  txtBold: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: AZUL },
})

// ─── Componentes ──────────────────────────────────────────────────────────────

const DocHeader = ({ solicitante, proprietario }: { solicitante?: string; proprietario?: string }) => (
  <>
    <View style={s.header}>
      <View>
        <Text style={s.headerLogoTxt}>Lesath Engenharia</Text>
        <Text style={s.headerSub}>Precisão técnica que gera confiança</Text>
      </View>
      <View>
        <Text style={[s.headerTag, { textAlign: 'right' }]}>LAUDO DE AVALIAÇÃO</Text>
        {solicitante ? <Text style={[s.headerMeta, { textAlign: 'right' }]}>Solicitante: {solicitante}</Text> : null}
        {proprietario ? <Text style={[s.headerMeta, { textAlign: 'right' }]}>Proponente: {proprietario}</Text> : null}
      </View>
    </View>
    <View style={s.headerAccent} />
  </>
)

const DocFooter = ({ dataLaudo }: { dataLaudo?: string }) => (
  <View fixed style={s.footer}>
    <Text style={s.footerTxt}>www.lesathengenharia.com.br</Text>
    <Text style={s.footerTxt}>{fd(dataLaudo)}</Text>
    <Text style={s.footerPag} render={({ pageNumber, totalPages }) => `Página ${pageNumber} / ${totalPages}`} />
  </View>
)

const SecHeader = ({ num, titulo }: { num: string; titulo: string }) => (
  <View style={s.secHeader}>
    <Text style={s.secTitle}>{num} — {titulo}</Text>
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
  const endParts = (dados.endereco||'').split(' – ').map(p=>p.trim())
  const logradouro = endParts[0]||''
  const bairro     = endParts[1]||''
  const cidade     = endParts[2]||''
  const uf         = endParts[3]||''
  const cepMatch   = (dados.endereco||'').match(/CEP\s*([\d-]+)/)
  const cep        = cepMatch?cepMatch[1]:''

  const valorTerreno   = cn(dados.valorTerreno)
  const valorBenfeits  = cn(dados.valorBenfeitorias)
  const fatorComercial = cn(dados.fatorComercializacao)||1
  const produto = (dados.outrosFatoresImovel||[]).reduce((a,i)=>a*(cn(i.valor)||1),1)
  const base    = dados.modoValorImovel==='total' ? cn((dados as any).valorTotal||'') : valorTerreno+valorBenfeits
  const vlFinal = arredondar(base*fatorComercial*produto)
  const vlf     = cn(dados.valorLiquidezForcada)

  const capaMetodologia = dados.metodoAvaliacao==='evolutivo'?'Evolutivo':dados.metodoAvaliacao==='comparativo'?'Comparativo Direto':dados.metodoAvaliacao||'-'

  const capaGrauFund = (()=>{
    if (dados.metodoAvaliacao==='evolutivo') {
      const soma=(dados.fundamentacaoEvolutivo||[]).reduce((s,i)=>s+(i.pontos||0),0)
      if(soma>=8)return'III';if(soma>=5)return'II';if(soma>=3)return'I';return'-'
    }
    const soma=(dados.fundamentacao||[]).reduce((s,i)=>s+(i.pontos||0),0)
    if(soma>=10)return'III';if(soma>=6)return'II';if(soma>=4)return'I';return'-'
  })()

  const capaGrauPrec = (()=>{
    const prec=dados.precisao||[]
    if(prec.length===0)return'-'
    if(prec.length===1)return prec[0].grau||'-'
    const soma=prec.reduce((s,i)=>s+(i.pontos||0),0)
    if(soma>=8)return'III';if(soma>=5)return'II';if(soma>=3)return'I';return'-'
  })()

  const capaFinalidade = dados.finalidade==='garantia'?'Avaliação para fins de garantia':dados.finalidade==='execucao'?'Avaliação para fins de execução':dados.finalidade||'-'

  const hoje = new Date()
  const meses=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro']
  const dataExtenso = `São Paulo, ${hoje.getDate()} de ${meses[hoje.getMonth()]} de ${hoje.getFullYear()}.`

  const fotoFachada = (dados.fotos||[]).find((f:any)=>(f.legenda||'').toLowerCase().includes('fachada'))||(dados.fotos||[])[0]
  const fotosAnexo  = dados.fotos||[]
  const divisoesFilt= (dados.divisoes||[]).filter((d:any)=>d.ambiente?.trim())

  function chunkArray<T>(arr: T[], n: number): T[][] {
    const out: T[][]=[]
    for(let i=0;i<arr.length;i+=n) out.push(arr.slice(i,i+n))
    return out
  }

  const temBenfeitorias = !!dados.imagemBenfeitorias
  const secValor = temBenfeitorias ? '11' : '10'
  const secGraus = temBenfeitorias ? '12' : '11'
  const secConcl = temBenfeitorias ? '13' : '12'

  return (
    <Document>

      {/* ══ PÁGINA 1 ════════════════════════════════════════════ */}
      <Page size="A4" style={s.page}>
        <DocHeader solicitante={dados.solicitante} proprietario={dados.proprietario} />
        <DocFooter dataLaudo={dados.dataLaudo} />

        <View style={s.titleBand}>
          <Text style={s.titleTxt}>LAUDO DE AVALIAÇÃO</Text>
        </View>

        <SecHeader num="1" titulo="Identificação" />
        <View style={s.table}>
          <Row label="Matrícula"   value={dados.matricula} />
          <Row label="Solicitante" value={dados.solicitante} />
          <Row label="Proponente"  value={dados.proprietario} />
          <Row label="Logradouro"  value={logradouro} />
          <View style={s.rowLast}>
            <View style={[s.cellLbl, { flex: 0.7, borderRightWidth: 0.5, borderColor: CINZA }]}><Text>CEP</Text></View>
            <View style={[s.cellVal, { flex: 1.2, borderRightWidth: 0.5, borderColor: CINZA }]}><Text>{cep||'-'}</Text></View>
            <View style={[s.cellLbl, { flex: 0.7, borderRightWidth: 0.5, borderColor: CINZA }]}><Text>Bairro</Text></View>
            <View style={[s.cellVal, { flex: 1.5, borderRightWidth: 0.5, borderColor: CINZA }]}><Text>{bairro||'-'}</Text></View>
            <View style={[s.cellLbl, { flex: 0.8, borderRightWidth: 0.5, borderColor: CINZA }]}><Text>Cidade</Text></View>
            <View style={[s.cellVal, { flex: 1.5, borderRightWidth: 0.5, borderColor: CINZA }]}><Text>{cidade||'-'}</Text></View>
            <View style={[s.cellLbl, { flex: 0.4, borderRightWidth: 0.5, borderColor: CINZA }]}><Text>UF</Text></View>
            <View style={[s.cellVal, { flex: 0.7 }]}><Text>{uf||'-'}</Text></View>
          </View>
        </View>

        {fotoFachada && <Image src={fotoFachada.preview} style={s.foto} />}

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

        <SecHeader num="3" titulo="Dimensões" />
        <View style={{ flexDirection: 'row', gap: 5, marginTop: 3 }}>
          <View style={[s.table, { flex: 1, marginTop: 0 }]}>
            <View style={s.row}><View style={[s.cellHead,{flex:1}]}><Text>Imóvel isolado</Text></View></View>
            <Row label="Averbada"        value={fa(dados.areaConstruidaAverbada)} flex1={1.5} flex2={1} />
            <Row label="Não Averbada"    value={fa(String(dados.areaConstruidaNaoAverbada??0))} flex1={1.5} flex2={1} />
            <Row label="Total Construída" value={fa(dados.areaConstruidaTotal)} flex1={1.5} flex2={1} />
            <Row label="Terreno"         value={fa(dados.areaTerrenoTotal)} flex1={1.5} flex2={1} last />
          </View>
          <View style={[s.table, { flex: 1, marginTop: 0 }]}>
            <View style={s.row}><View style={[s.cellHead,{flex:1}]}><Text>Referências</Text></View></View>
            <Row label="Padrão"      value={dados.padrao} flex1={1.5} flex2={1} />
            <Row label="Idade"       value={dados.idadeAparente ? dados.idadeAparente+' anos' : '-'} flex1={1.5} flex2={1} />
            <Row label="Conservação" value={dados.estadoConservacao} flex1={1.5} flex2={1} />
            <Row label="Finalidade"  value={capaFinalidade} flex1={1.5} flex2={1} last />
          </View>
        </View>
      </Page>

      {/* ══ PÁGINA 2 ════════════════════════════════════════════ */}
      <Page size="A4" style={s.page}>
        <DocHeader solicitante={dados.solicitante} proprietario={dados.proprietario} />
        <DocFooter dataLaudo={dados.dataLaudo} />

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

        <SecHeader num="5" titulo="Documentação Apresentada" />
        <View style={s.table}>
          <Row label="Matrícula"             value={dados.matricula} />
          <Row label="Inscrição imobiliária" value={dados.iptu} last />
        </View>

        <SecHeader num="6" titulo="Descrição do Imóvel Avaliando" />
        <View style={{ borderWidth: 0.5, borderColor: CINZA, padding: 6, marginTop: 3 }}>
          <Text style={s.txtBold}>6.1 - Descrição do imóvel avaliando</Text>
          <Text style={s.txt}>
            {dados.consideracoesMercado
              ? dados.consideracoesMercado.substring(0,500)+(dados.consideracoesMercado.length>500?'...':'')
              : `Imóvel do tipo ${dados.tipo||'residencial'}, localizado em ${dados.endereco}.`}
          </Text>
        </View>

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
      </Page>

      {/* ══ PÁGINA 3 ════════════════════════════════════════════ */}
      <Page size="A4" style={s.page}>
        <DocHeader solicitante={dados.solicitante} proprietario={dados.proprietario} />
        <DocFooter dataLaudo={dados.dataLaudo} />

        <SecHeader num="8" titulo="Localização" />
        <View style={s.table}>
          {dados.coordenadasImovel && <Row label="Coordenadas" value={dados.coordenadasImovel} />}
          {dados.referencia1 && <Row label={`Ref. 1 (${dados.distancia1||'-'})`} value={dados.referencia1} />}
          {dados.referencia2 && <Row label={`Ref. 2 (${dados.distancia2||'-'})`} value={dados.referencia2} />}
          {dados.referencia3 && <Row label={`Ref. 3 (${dados.distancia3||'-'})`} value={dados.referencia3} />}
          {dados.referencia4 && <Row label={`Ref. 4 (${dados.distancia4||'-'})`} value={dados.referencia4} />}
          {dados.referencia5
            ? <Row label={`Ref. 5 (${dados.distancia5||'-'})`} value={dados.referencia5} last />
            : null}
        </View>

        <SecHeader num="9" titulo="Pesquisa Imobiliária" />
        <View style={s.table}>
          <View style={s.row}>
            <View style={[s.cellHead,{flex:2,borderRightWidth:0.5,borderColor:CINZA}]}><Text>Período de pesquisa</Text></View>
            <View style={[s.cellHead,{flex:1.5,borderRightWidth:0.5,borderColor:CINZA}]}><Text>Tipo</Text></View>
            <View style={[s.cellHead,{flex:0.8,borderRightWidth:0.5,borderColor:CINZA}]}><Text>Qtd.</Text></View>
            <View style={[s.cellHead,{flex:2}]}><Text>Metodologia</Text></View>
          </View>
          <View style={s.rowLast}>
            <View style={[s.cellVal,{flex:2,borderRightWidth:0.5,borderColor:CINZA}]}>
              <Text>{dados.periodoPesquisaInicio&&dados.periodoPesquisaFim?`${fd(dados.periodoPesquisaInicio)} a ${fd(dados.periodoPesquisaFim)}`:'-'}</Text>
            </View>
            <View style={[s.cellVal,{flex:1.5,borderRightWidth:0.5,borderColor:CINZA}]}><Text>{dados.tipoInformacoesObtidas||'-'}</Text></View>
            <View style={[s.cellVal,{flex:0.8,borderRightWidth:0.5,borderColor:CINZA,textAlign:'center'}]}><Text>{dados.quantidadeElementos||'-'}</Text></View>
            <View style={[s.cellVal,{flex:2}]}><Text>{metLabel(dados.metodoAvaliacao)}</Text></View>
          </View>
        </View>

        {temBenfeitorias && (
          <>
            <SecHeader num="10" titulo="Cálculo das Benfeitorias" />
            <Image src={dados.imagemBenfeitorias!} style={{ maxHeight: 100, objectFit: 'contain', marginTop: 4 }} />
          </>
        )}

        <SecHeader num={secValor} titulo="Valor Final da Avaliação" />
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
        <View style={s.table}>
          <View style={s.row}>
            <View style={[s.cellLbl,{flex:1.5,borderRightWidth:0.5,borderColor:CINZA}]}><Text>Valor do terreno</Text></View>
            <View style={[s.cellVal,{flex:1.5,borderRightWidth:0.5,borderColor:CINZA}]}><Text>{valorTerreno>0?fm(valorTerreno):'-'}</Text></View>
            <View style={[s.cellLbl,{flex:1.5,borderRightWidth:0.5,borderColor:CINZA}]}><Text>Valor das benfeitorias</Text></View>
            <View style={[s.cellVal,{flex:1.5}]}><Text>{valorBenfeits>0?fm(valorBenfeits):'-'}</Text></View>
          </View>
          <View style={s.rowLast}>
            <View style={[s.cellLbl,{flex:1.5,borderRightWidth:0.5,borderColor:CINZA}]}><Text>Fator de comercialização</Text></View>
            <View style={[s.cellVal,{flex:1.5,borderRightWidth:0.5,borderColor:CINZA}]}><Text>{dados.fatorComercializacao||'1,00'}</Text></View>
            <View style={[s.cellLbl,{flex:1.5,borderRightWidth:0.5,borderColor:CINZA}]}><Text>Valor arredondado</Text></View>
            <View style={[s.cellVal,{flex:1.5}]}><Text style={{fontFamily:'Helvetica-Bold',color:AZUL}}>{fm(vlFinal)}</Text></View>
          </View>
        </View>

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
            <Text style={[s.signSub, { marginTop: 3 }]}>{dataExtenso}</Text>
          </View>
        </View>
      </Page>

      {/* ══ PÁGINAS DE FOTOS ════════════════════════════════════ */}
      {fotosAnexo.length > 0 && chunkArray(fotosAnexo, 6).map((grupo:any[], idx:number) => (
        <Page key={`fotos-${idx}`} size="A4" style={s.page}>
          <DocHeader solicitante={dados.solicitante} proprietario={dados.proprietario} />
          <DocFooter dataLaudo={dados.dataLaudo} />
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
        </Page>
      ))}

    </Document>
  )
}
