'use client'

/**
 * SALVAR EM: src/app/components/LaudoPdfSimplificado.tsx
 *
 * Versão compacta (modelo formulário) do laudo de avaliação.
 * Usa os mesmos dados do LaudoPdf.tsx — sem necessidade de campos extras.
 */

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
  return (
    Number(
      valor
        .replace(/\s/g, '')
        .replace(/\./g, '')
        .replace(',', '.')
        .replace(/[^\d.-]/g, '')
    ) || 0
  )
}

function numeroPorExtenso(valor: number): string {
  const unidades = ['','um','dois','três','quatro','cinco','seis','sete','oito','nove','dez','onze','doze','treze','quatorze','quinze','dezesseis','dezessete','dezoito','dezenove']
  const dezenas  = ['','','vinte','trinta','quarenta','cinquenta','sessenta','setenta','oitenta','noventa']
  const centenas = ['','cento','duzentos','trezentos','quatrocentos','quinhentos','seiscentos','setecentos','oitocentos','novecentos']
  function ate999(n: number): string {
    if (n === 0) return ''
    if (n === 100) return 'cem'
    if (n < 20) return unidades[n]
    if (n < 100) { const d = Math.floor(n/10); const r = n%10; return r ? `${dezenas[d]} e ${unidades[r]}` : dezenas[d] }
    const c = Math.floor(n/100); const r = n%100
    return r === 0 ? centenas[c] : `${centenas[c]} e ${ate999(r)}`
  }
  function inteiro(n: number): string {
    if (n === 0) return 'zero'
    const mi = Math.floor(n/1_000_000); const mil = Math.floor((n%1_000_000)/1_000); const resto = n%1_000
    const p: string[] = []
    if (mi > 0)    p.push(mi === 1 ? 'um milhão' : `${ate999(mi)} milhões`)
    if (mil > 0)   p.push(mil === 1 ? 'mil' : `${ate999(mil)} mil`)
    if (resto > 0) p.push(ate999(resto))
    if (p.length === 1) return p[0]
    if (p.length === 2) return `${p[0]} e ${p[1]}`
    return p.slice(0,-1).join(', ') + ' e ' + p[p.length-1]
  }
  return `${inteiro(Math.round(valor))} reais`
}

function metodologiaLabel(m?: string) {
  if (m === 'comparativo') return 'Método Comparativo Direto de Dados de Mercado - Tratamento por fatores'
  if (m === 'evolutivo')   return 'Método Evolutivo'
  return m || '-'
}

function extrairEnderecoParts(endereco?: string) {
  if (!endereco) return { logradouro: '', bairro: '', cidade: '', uf: '', cep: '' }
  const parts = endereco.split(' – ').map(p => p.trim())
  const logradouro = parts[0] || ''
  const bairro     = parts[1] || ''
  const cidade     = parts[2] || ''
  const uf         = parts[3] || ''
  const cepMatch   = endereco.match(/CEP\s*([\d-]+)/)
  return { logradouro, bairro, cidade, uf, cep: cepMatch ? cepMatch[1] : '' }
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const AZUL    = '#17325C'
const AZUL2   = '#2347C6'
const AZUL_LT = '#EAF0FB'
const CINZA   = '#C9D3E6'
const BRANCO  = '#ffffff'

const s = StyleSheet.create({
  page: {
    paddingTop: 64,
    paddingBottom: 40,
    paddingHorizontal: 30,
    fontSize: 8,
    fontFamily: 'Helvetica',
    color: '#1e293b',
    lineHeight: 1.35,
  },

  // Header fixo
  fixedHeader: { position: 'absolute', top: 0, left: 0, right: 0 },
  headerBg: { backgroundColor: AZUL, paddingVertical: 8, paddingHorizontal: 30, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLogo: { width: 80, height: 22, objectFit: 'contain' },
  headerRight: { alignItems: 'flex-end' },
  headerTag: { fontSize: 6, color: '#8FA4C7', letterSpacing: 1.2, fontFamily: 'Helvetica-Bold' },
  headerTitle: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: BRANCO },
  headerSub: { fontSize: 7, color: '#b8cce4', marginTop: 1 },
  headerLine: { height: 2.5, backgroundColor: AZUL2 },

  // Footer fixo
  fixedFooter: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  footerBg: { backgroundColor: AZUL, paddingVertical: 5, paddingHorizontal: 30, flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 6.5, color: '#8FA4C7' },
  footerPage: { fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: BRANCO },

  // Títulos de seção
  sectionHeader: { backgroundColor: AZUL, paddingVertical: 4, paddingHorizontal: 6, marginTop: 8, marginBottom: 0 },
  sectionTitle: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: BRANCO },

  // Tabelas
  table: { width: '100%', borderWidth: 0.5, borderColor: CINZA },
  row: { flexDirection: 'row', borderBottomWidth: 0.5, borderColor: CINZA },
  rowLast: { flexDirection: 'row' },
  cell: { paddingVertical: 3.5, paddingHorizontal: 5, fontSize: 8 },
  cellLabel: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: AZUL },
  cellValue: { fontSize: 8, color: '#1e293b' },
  cellHead: { backgroundColor: AZUL_LT, paddingVertical: 3.5, paddingHorizontal: 5, fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: AZUL },
  cellCenter: { textAlign: 'center' },

  // Valores em destaque
  valorBox: { backgroundColor: AZUL, padding: 8, flex: 1, marginRight: 4 },
  valorBoxLight: { backgroundColor: AZUL_LT, borderWidth: 0.5, borderColor: CINZA, padding: 8, flex: 1 },
  valorLabel: { fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: '#8FA4C7', letterSpacing: 0.5 },
  valorNum: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: BRANCO, marginTop: 2 },
  valorNumDark: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: AZUL, marginTop: 2 },
  valorExt: { fontSize: 7, color: '#b8cce4', marginTop: 1 },
  valorExtDark: { fontSize: 7, color: '#5a7090', marginTop: 1 },

  // Checkbox style
  checkRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  checkBox: { width: 8, height: 8, borderWidth: 0.5, borderColor: AZUL, marginRight: 3, backgroundColor: BRANCO },
  checkBoxFilled: { width: 8, height: 8, borderWidth: 0.5, borderColor: AZUL, marginRight: 3, backgroundColor: AZUL2 },
  checkLabel: { fontSize: 7.5, color: '#1e293b' },

  // Foto
  photoBox: { height: 140, marginVertical: 6, overflow: 'hidden' },
  photoImg: { width: '100%', height: 140, objectFit: 'cover' },
  
  // Grid 2 colunas
  grid2: { flexDirection: 'row' },
  col2: { flex: 1 },
  col2r: { flex: 1, marginLeft: 4 },

  // Texto simples
  txt: { fontSize: 8, color: '#1e293b', marginTop: 3 },
  txtBold: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: AZUL },
  spacer: { height: 4 },
  line: { height: 0.5, backgroundColor: CINZA, marginVertical: 4 },

  // Assinatura
  signLine: { height: 0.5, backgroundColor: '#334155', width: 160, marginTop: 28, marginBottom: 3 },
  signName: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: AZUL },
  signSub: { fontSize: 7.5, color: '#475569' },
})

// ─── Componentes auxiliares ───────────────────────────────────────────────────

const Header = ({ solicitante, proponente }: { solicitante?: string; proponente?: string }) => (
  <View style={s.fixedHeader} fixed>
    <View style={s.headerBg}>
      <View>
        <Text style={[s.headerTitle, { fontSize: 10 }]}>Lesath Engenharia</Text>
        <Text style={s.headerSub}>Precisão técnica que gera confiança</Text>
      </View>
      <View style={s.headerRight}>
        <Text style={s.headerTag}>LAUDO DE AVALIAÇÃO</Text>
        {solicitante ? <Text style={{ fontSize: 7, color: '#b8cce4', marginTop: 1 }}>Solicitante: {solicitante}</Text> : null}
        {proponente  ? <Text style={{ fontSize: 7, color: '#b8cce4', marginTop: 1 }}>Proponente: {proponente}</Text> : null}
      </View>
    </View>
    <View style={s.headerLine} />
  </View>
)

const Footer = ({ dataLaudo }: { dataLaudo?: string }) => (
  <View style={s.fixedFooter} fixed>
    <View style={s.footerBg}>
      <Text style={s.footerText}>www.lesathengenharia.com.br</Text>
      <Text style={s.footerText}>{dataLaudo ? fd(dataLaudo) : ''}</Text>
      <Text style={s.footerPage} render={({ pageNumber, totalPages }) => `Página ${pageNumber} / ${totalPages}`} />
    </View>
  </View>
)

const SecaoHeader = ({ numero, titulo }: { numero: string; titulo: string }) => (
  <View style={s.sectionHeader}>
    <Text style={s.sectionTitle}>{numero} - {titulo.toUpperCase()}</Text>
  </View>
)

const RowData = ({ label, value, flex1 = 1, flex2 = 3, last = false }: { label: string; value: string; flex1?: number; flex2?: number; last?: boolean }) => (
  <View style={last ? s.rowLast : s.row}>
    <View style={[s.cell, { flex: flex1, backgroundColor: AZUL_LT, borderRightWidth: 0.5, borderColor: CINZA }]}>
      <Text style={s.cellLabel}>{label}</Text>
    </View>
    <View style={[s.cell, { flex: flex2 }]}>
      <Text style={s.cellValue}>{value || '-'}</Text>
    </View>
  </View>
)

const CheckItem = ({ label, checked }: { label: string; checked: boolean }) => (
  <View style={s.checkRow}>
    <View style={checked ? s.checkBoxFilled : s.checkBox}>
      {checked && <Text style={{ fontSize: 5, color: BRANCO, textAlign: 'center', marginTop: 1 }}>✓</Text>}
    </View>
    <Text style={s.checkLabel}>{label}</Text>
  </View>
)

// ─── Componente principal ─────────────────────────────────────────────────────

export default function LaudoPdfSimplificado({ dados }: { dados: DadosLaudo }) {
  const addr = extrairEnderecoParts(dados.endereco)
  const valorFinal = arredondar(dados.valorFinalImovel || 0)
  const vlf = cn(dados.valorLiquidezForcada)
  const vlfFinal = vlf > 0 ? vlf : Math.round(valorFinal * 0.7)
  const mel = dados.melhoramentosPublicos || {}
  const fotoFachada = (dados.fotos || []).find(f => f.legenda?.toLowerCase().includes('fachada')) || dados.fotos?.[0]
  const fotosAnexo  = dados.fotos || []

  // Grau de fundamentação resumido
  const somaFund = (dados.fundamentacao || []).reduce((a, i) => {
    const m: Record<string,number> = { III: 3, II: 2, I: 1 }
    return a + (m[i.grau] || 0)
  }, 0)
  const grauFund = somaFund >= 10 ? 'III' : somaFund >= 6 ? 'II' : somaFund >= 4 ? 'I' : '-'

  const somaPrecisao = (dados.precisao || []).reduce((a, i) => {
    const m: Record<string,number> = { III: 3, II: 2, I: 1 }
    return a + (m[i.grau] || 0)
  }, 0)
  const grauPrecisao = somaPrecisao >= 3 ? 'III' : somaPrecisao >= 2 ? 'II' : somaPrecisao >= 1 ? 'I' : '-'

  function arredondar(v: number) { return Math.round(v / 100) * 100 }

  const divisoesFiltradas = (dados.divisoes || []).filter(d => d.ambiente?.trim())

  return (
    <Document>
      {/* ══════════════════════════════════════════════════
          PÁGINA 1 — IDENTIFICAÇÃO + AVALIAÇÃO + DIMENSÕES
      ══════════════════════════════════════════════════ */}
      <Page size="A4" style={s.page}>
        <Header solicitante={dados.solicitante} proponente={dados.proprietario} />
        <Footer dataLaudo={dados.dataLaudo} />

        {/* Título central */}
        <View style={{ backgroundColor: AZUL2, paddingVertical: 5, paddingHorizontal: 10, marginBottom: 8 }}>
          <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold', color: BRANCO, textAlign: 'center' }}>
            LAUDO DE AVALIAÇÃO
          </Text>
        </View>

        {/* 1 - IDENTIFICAÇÃO */}
        <SecaoHeader numero="1" titulo="Identificação" />
        <View style={s.table}>
          <RowData label="Matrícula"    value={dados.matricula} />
          <RowData label="Solicitante"  value={dados.solicitante || ''} />
          <RowData label="Proponente"   value={dados.proprietario} />
          <RowData label="Logradouro"   value={addr.logradouro} flex1={1} flex2={3} />
          <View style={s.row}>
            <View style={[s.cell, { flex: 1, backgroundColor: AZUL_LT, borderRightWidth: 0.5, borderColor: CINZA }]}>
              <Text style={s.cellLabel}>CEP</Text>
              <Text style={s.cellValue}>{addr.cep || '-'}</Text>
            </View>
            <View style={[s.cell, { flex: 2, backgroundColor: AZUL_LT, borderRightWidth: 0.5, borderColor: CINZA }]}>
              <Text style={s.cellLabel}>Bairro</Text>
              <Text style={s.cellValue}>{addr.bairro || '-'}</Text>
            </View>
            <View style={[s.cell, { flex: 2, backgroundColor: AZUL_LT, borderRightWidth: 0.5, borderColor: CINZA }]}>
              <Text style={s.cellLabel}>Cidade</Text>
              <Text style={s.cellValue}>{addr.cidade || '-'}</Text>
            </View>
            <View style={[s.cell, { flex: 0.5 }]}>
              <Text style={s.cellLabel}>UF</Text>
              <Text style={s.cellValue}>{addr.uf || '-'}</Text>
            </View>
          </View>
        </View>

        {/* Foto fachada */}
        {fotoFachada && (
          <View style={s.photoBox}>
            <Image src={fotoFachada.preview} style={s.photoImg} />
          </View>
        )}

        {/* 2 - AVALIAÇÃO */}
        <SecaoHeader numero="2" titulo="Avaliação" />
        <View style={{ flexDirection: 'row', marginTop: 4, marginBottom: 4 }}>
          <View style={[s.valorBox, { marginRight: 6 }]}>
            <Text style={s.valorLabel}>VALOR DA AVALIAÇÃO</Text>
            <Text style={s.valorNum}>{fm(valorFinal)}</Text>
            <Text style={s.valorExt}>({numeroPorExtenso(valorFinal).charAt(0).toUpperCase() + numeroPorExtenso(valorFinal).slice(1)})</Text>
          </View>
          <View style={s.valorBoxLight}>
            <Text style={[s.valorLabel, { color: AZUL2 }]}>VALOR DE LIQUIDAÇÃO</Text>
            <Text style={s.valorNumDark}>{fm(vlfFinal)}</Text>
            <Text style={s.valorExtDark}>({numeroPorExtenso(vlfFinal).charAt(0).toUpperCase() + numeroPorExtenso(vlfFinal).slice(1)})</Text>
          </View>
        </View>
        <View style={[s.table, { marginBottom: 4 }]}>
          <RowData label="Metodologia de cálculo" value={metodologiaLabel(dados.metodoAvaliacao)} last />
        </View>

        {/* 3 - DIMENSÕES */}
        <SecaoHeader numero="3" titulo="Dimensões" />
        <View style={{ flexDirection: 'row', marginTop: 0 }}>
          {/* Imóvel isolado */}
          <View style={[s.table, { flex: 1, marginRight: 4 }]}>
            <View style={[s.row, { backgroundColor: AZUL_LT }]}>
              <Text style={[s.cellHead, { flex: 1 }]}>Imóvel isolado</Text>
              <Text style={[s.cellHead, { flex: 1, textAlign: 'right' }]}> </Text>
            </View>
            {[
              ['Averbada',      (dados.areaConstruidaAverbada || '0,00') + ' m²'],
              ['Não Averbada',  ((dados.areaConstruidaNaoAverbada ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })) + ' m²'],
              ['Total Construída', (dados.areaConstruidaTotal || '0,00') + ' m²'],
              ['Terreno',       (dados.areaTerrenoTotal || '0,00') + ' m²'],
            ].map(([l, v], i, arr) => (
              <View key={l} style={i === arr.length - 1 ? s.rowLast : s.row}>
                <View style={[s.cell, { flex: 1.5 }]}><Text style={s.cellLabel}>{l}</Text></View>
                <View style={[s.cell, { flex: 1, textAlign: 'right' }]}><Text style={[s.cellValue, { textAlign: 'right' }]}>{v}</Text></View>
              </View>
            ))}
          </View>

          {/* Data */}
          <View style={[s.table, { flex: 1 }]}>
            <View style={[s.row, { backgroundColor: AZUL_LT }]}>
              <Text style={[s.cellHead, { flex: 1 }]}>Referências</Text>
              <Text style={[s.cellHead, { flex: 1 }]}> </Text>
            </View>
            <RowData label="Padrão"       value={dados.padrao || '-'} flex1={1.5} flex2={1} />
            <RowData label="Idade"        value={dados.idadeAparente ? dados.idadeAparente + ' anos' : '-'} flex1={1.5} flex2={1} />
            <RowData label="Conservação"  value={dados.estadoConservacao || '-'} flex1={1.5} flex2={1} last />
          </View>
        </View>
      </Page>

      {/* ══════════════════════════════════════════════════
          PÁGINA 2 — REGIÃO + AVALIANDO + DIVISÕES
      ══════════════════════════════════════════════════ */}
      <Page size="A4" style={s.page}>
        <Header solicitante={dados.solicitante} proponente={dados.proprietario} />
        <Footer dataLaudo={dados.dataLaudo} />

        {/* 4 - CARACTERÍSTICAS DA REGIÃO */}
        <SecaoHeader numero="4" titulo="Características da Região" />
        <View style={{ marginTop: 4 }}>
          <Text style={[s.cellHead, { backgroundColor: AZUL_LT, paddingVertical: 3, paddingHorizontal: 6, marginBottom: 4 }]}>
            Infraestrutura urbana
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 4 }}>
            {[
              ['redeAgua',         'Água'],
              ['esgotoSanitario',  'Esgoto sanitário'],
              ['redeEletrica',     'Energia elétrica'],
              ['iluminacaoPublica','Iluminação Pública'],
              ['fossa',            'Fossa'],
              ['pavimentacao',     'Pavimentação'],
              ['esgotoPluvial',    'Esgoto pluvial'],
              ['redeTelefonica',   'Telefone'],
              ['gasCanalizado',    'Gás canalizado'],
              ['guias',            'Guias'],
              ['sarjetas',         'Sarjetas'],
              ['passeio',          'Passeio'],
              ['coletaLixo',       'Coleta de lixo'],
              ['lazer',            'Lazer'],
            ].map(([key, label]) => (
              <View key={key} style={{ width: '25%', marginBottom: 3 }}>
                <CheckItem label={label} checked={mel[key] === 'Sim'} />
              </View>
            ))}
          </View>
        </View>

        {/* 5 - CARACTERÍSTICAS DO AVALIANDO */}
        <SecaoHeader numero="5" titulo="Características e Dimensões do Avaliando" />
        <View style={{ flexDirection: 'row', marginTop: 2 }}>
          <View style={[s.table, { flex: 1, marginRight: 4 }]}>
            <View style={[s.row, { backgroundColor: AZUL_LT }]}>
              <Text style={[s.cellHead, { flex: 1 }]}>Implantação</Text>
            </View>
            <View style={s.rowLast}>
              <View style={[s.cell, { flex: 1 }]}>
                <Text style={s.cellValue}>{dados.tipo || 'Isolado'}</Text>
              </View>
            </View>
          </View>
          <View style={[s.table, { flex: 2 }]}>
            <View style={[s.row, { backgroundColor: AZUL_LT }]}>
              <Text style={[s.cellHead, { flex: 1 }]}>Características do Terreno</Text>
            </View>
            <View style={s.row}>
              <View style={[s.cell, { flex: 1, backgroundColor: AZUL_LT, borderRightWidth: 0.5, borderColor: CINZA }]}>
                <Text style={s.cellLabel}>Situação</Text>
              </View>
              <View style={[s.cell, { flex: 2 }]}>
                <Text style={s.cellValue}>Meio de quadra</Text>
              </View>
            </View>
            <View style={s.rowLast}>
              <View style={[s.cell, { flex: 1, backgroundColor: AZUL_LT, borderRightWidth: 0.5, borderColor: CINZA }]}>
                <Text style={s.cellLabel}>Consistência</Text>
              </View>
              <View style={[s.cell, { flex: 2 }]}>
                <Text style={s.cellValue}>Seco</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Dimensões do terreno */}
        <View style={[s.table, { marginTop: 4 }]}>
          <View style={[s.row, { backgroundColor: AZUL_LT }]}>
            <Text style={[s.cellHead, { flex: 1, textAlign: 'center' }]}>Dimensões do Terreno</Text>
          </View>
          <View style={s.rowLast}>
            <View style={[s.cell, { flex: 1, borderRightWidth: 0.5, borderColor: CINZA }]}>
              <Text style={s.cellLabel}>Área</Text>
              <Text style={s.cellValue}>{dados.areaTerrenoTotal || '-'} m²</Text>
            </View>
            <View style={[s.cell, { flex: 1, borderRightWidth: 0.5, borderColor: CINZA }]}>
              <Text style={s.cellLabel}>Padrão</Text>
              <Text style={s.cellValue}>{dados.padrao || '-'}</Text>
            </View>
            <View style={[s.cell, { flex: 1, borderRightWidth: 0.5, borderColor: CINZA }]}>
              <Text style={s.cellLabel}>Uso</Text>
              <Text style={s.cellValue}>{dados.tipo || '-'}</Text>
            </View>
            <View style={[s.cell, { flex: 1 }]}>
              <Text style={s.cellLabel}>IPTU</Text>
              <Text style={s.cellValue}>{dados.iptu || '-'}</Text>
            </View>
          </View>
        </View>

        {/* Edificações */}
        <View style={[s.table, { marginTop: 4 }]}>
          <View style={[s.row, { backgroundColor: AZUL_LT }]}>
            <Text style={[s.cellHead, { flex: 1, textAlign: 'center' }]}>Edificações</Text>
          </View>
          <View style={s.rowLast}>
            <View style={[s.cell, { flex: 1, borderRightWidth: 0.5, borderColor: CINZA }]}>
              <Text style={s.cellLabel}>Tipo</Text>
              <Text style={s.cellValue}>{dados.tipo || '-'}</Text>
            </View>
            <View style={[s.cell, { flex: 1, borderRightWidth: 0.5, borderColor: CINZA }]}>
              <Text style={s.cellLabel}>Idade aparente</Text>
              <Text style={s.cellValue}>{dados.idadeAparente ? dados.idadeAparente + ' anos' : '-'}</Text>
            </View>
            <View style={[s.cell, { flex: 1, borderRightWidth: 0.5, borderColor: CINZA }]}>
              <Text style={s.cellLabel}>Estado de conservação</Text>
              <Text style={s.cellValue}>{dados.estadoConservacao || '-'}</Text>
            </View>
            <View style={[s.cell, { flex: 1 }]}>
              <Text style={s.cellLabel}>Área construída</Text>
              <Text style={s.cellValue}>{dados.areaConstruidaTotal || '0,00'} m²</Text>
            </View>
          </View>
        </View>

        {/* 6 - DOCUMENTAÇÃO */}
        <SecaoHeader numero="6" titulo="Documentação Apresentada" />
        <View style={[s.table, { marginTop: 0 }]}>
          <RowData label="Matrícula"           value={dados.matricula} />
          <RowData label="Inscrição imobiliária" value={dados.iptu || '-'} last />
        </View>

        {/* 7 - DESCRIÇÃO DO IMÓVEL */}
        <SecaoHeader numero="7" titulo="Descrição do Imóvel Avaliando" />
        <View style={{ padding: 6, borderWidth: 0.5, borderColor: CINZA }}>
          <Text style={[s.txtBold, { marginBottom: 3 }]}>7.1 - Descrição do imóvel avaliando</Text>
          <Text style={s.txt}>
            {dados.consideracoesMercado
              ? dados.consideracoesMercado.substring(0, 400) + (dados.consideracoesMercado.length > 400 ? '...' : '')
              : `Imóvel avaliando do tipo ${dados.tipo || 'residencial'}, localizado em ${dados.endereco}.`
            }
          </Text>
        </View>

        {/* 8 - CARACTERÍSTICAS DO IMÓVEL (divisões) */}
        {divisoesFiltradas.length > 0 && (
          <>
            <SecaoHeader numero="8" titulo="Características do Imóvel Avaliando" />
            <View style={[s.table, { marginTop: 0 }]}>
              <View style={[s.row, { backgroundColor: AZUL_LT }]}>
                <Text style={[s.cellHead, { flex: 1 }]}>Divisão Interna</Text>
                <Text style={[s.cellHead, { flex: 0.5, textAlign: 'center' }]}>Qtd.</Text>
                <Text style={[s.cellHead, { flex: 2 }]}>Acabamentos</Text>
              </View>
              {divisoesFiltradas.map((div, i) => {
                const acabamento = dados.acabamentos?.find(a => a.ambiente?.includes(div.ambiente))
                return (
                  <View key={i} style={i === divisoesFiltradas.length - 1 ? s.rowLast : s.row}>
                    <View style={[s.cell, { flex: 1 }]}><Text style={s.cellValue}>{div.ambiente}</Text></View>
                    <View style={[s.cell, { flex: 0.5 }]}><Text style={[s.cellValue, { textAlign: 'center' }]}>{div.quantidade}</Text></View>
                    <View style={[s.cell, { flex: 2 }]}><Text style={s.cellValue}>{acabamento?.acabamento || '-'}</Text></View>
                  </View>
                )
              })}
            </View>
          </>
        )}
      </Page>

      {/* ══════════════════════════════════════════════════
          PÁGINA 3 — LOCALIZAÇÃO + PESQUISA + VALOR FINAL
      ══════════════════════════════════════════════════ */}
      <Page size="A4" style={s.page}>
        <Header solicitante={dados.solicitante} proponente={dados.proprietario} />
        <Footer dataLaudo={dados.dataLaudo} />

        {/* 9 - LOCALIZAÇÃO */}
        <SecaoHeader numero="9" titulo="Localização" />
        <View style={[s.table, { marginTop: 0, marginBottom: 6 }]}>
          <RowData label="Coordenadas" value={dados.coordenadasImovel || '-'} />
          {dados.referencia1 && <RowData label={`Ref. 1 (${dados.distancia1 || '-'})`} value={dados.referencia1} />}
          {dados.referencia2 && <RowData label={`Ref. 2 (${dados.distancia2 || '-'})`} value={dados.referencia2} />}
          {dados.referencia3 && <RowData label={`Ref. 3 (${dados.distancia3 || '-'})`} value={dados.referencia3} />}
          {dados.referencia4 && <RowData label={`Ref. 4 (${dados.distancia4 || '-'})`} value={dados.referencia4} />}
          {dados.referencia5 && <RowData label={`Ref. 5 (${dados.distancia5 || '-'})`} value={dados.referencia5} last />}
        </View>

        {/* 10 - PESQUISA IMOBILIÁRIA */}
        <SecaoHeader numero="10" titulo="Pesquisa Imobiliária" />
        <View style={[s.table, { marginTop: 0, marginBottom: 4 }]}>
          <View style={[s.row, { backgroundColor: AZUL_LT }]}>
            <Text style={[s.cellHead, { flex: 2 }]}>Período de pesquisa</Text>
            <Text style={[s.cellHead, { flex: 1.5 }]}>Tipo de informações</Text>
            <Text style={[s.cellHead, { flex: 1 }]}>Qtd. elementos</Text>
            <Text style={[s.cellHead, { flex: 2 }]}>Metodologia</Text>
          </View>
          <View style={s.rowLast}>
            <View style={[s.cell, { flex: 2, borderRightWidth: 0.5, borderColor: CINZA }]}>
              <Text style={s.cellValue}>
                {dados.periodoPesquisaInicio && dados.periodoPesquisaFim
                  ? `${fd(dados.periodoPesquisaInicio)} a ${fd(dados.periodoPesquisaFim)}`
                  : '-'}
              </Text>
            </View>
            <View style={[s.cell, { flex: 1.5, borderRightWidth: 0.5, borderColor: CINZA }]}>
              <Text style={s.cellValue}>{dados.tipoInformacoesObtidas || '-'}</Text>
            </View>
            <View style={[s.cell, { flex: 1, borderRightWidth: 0.5, borderColor: CINZA }]}>
              <Text style={[s.cellValue, { textAlign: 'center' }]}>{dados.quantidadeElementos || '-'}</Text>
            </View>
            <View style={[s.cell, { flex: 2 }]}>
              <Text style={s.cellValue}>{metodologiaLabel(dados.metodoAvaliacao)}</Text>
            </View>
          </View>
        </View>

        {/* Fatores utilizados */}
        {dados.fatoresSelecionados && dados.fatoresSelecionados.length > 0 && (
          <View style={{ borderWidth: 0.5, borderColor: CINZA, padding: 6, marginBottom: 6 }}>
            <Text style={[s.cellLabel, { marginBottom: 3 }]}>Fatores utilizados no modelo</Text>
            {dados.fatoresSelecionados.map((f, i) => (
              <Text key={i} style={[s.txt, { marginBottom: 1 }]}>• {f}</Text>
            ))}
          </View>
        )}

        {/* 11 - HOMOGENEIZAÇÃO resumida */}
        {dados.imagemBenfeitorias && (
          <>
            <SecaoHeader numero="11" titulo="Cálculo das Benfeitorias" />
            <Image src={dados.imagemBenfeitorias} style={{ maxHeight: 120, objectFit: 'contain', marginVertical: 4 }} />
          </>
        )}

        {/* 12 - VALOR FINAL */}
        <SecaoHeader numero="12" titulo="Valor Final da Avaliação" />
        <View style={{ marginTop: 4, marginBottom: 6 }}>
          <View style={{ flexDirection: 'row', marginBottom: 4 }}>
            <View style={[s.valorBox, { marginRight: 6 }]}>
              <Text style={s.valorLabel}>VALOR DA AVALIAÇÃO</Text>
              <Text style={s.valorNum}>{fm(valorFinal)}</Text>
              <Text style={s.valorExt}>({numeroPorExtenso(valorFinal).charAt(0).toUpperCase() + numeroPorExtenso(valorFinal).slice(1)})</Text>
            </View>
            <View style={s.valorBoxLight}>
              <Text style={[s.valorLabel, { color: AZUL2 }]}>VALOR DE LIQUIDAÇÃO FORÇADA</Text>
              <Text style={s.valorNumDark}>{fm(vlfFinal)}</Text>
              <Text style={s.valorExtDark}>({numeroPorExtenso(vlfFinal).charAt(0).toUpperCase() + numeroPorExtenso(vlfFinal).slice(1)})</Text>
            </View>
          </View>

          <View style={[s.table]}>
            <View style={[s.row, { backgroundColor: AZUL_LT }]}>
              <Text style={[s.cellHead, { flex: 1 }]}>Componente</Text>
              <Text style={[s.cellHead, { flex: 1, textAlign: 'right' }]}>Valor</Text>
            </View>
            <RowData label="Valor do terreno"         value={cn(dados.valorTerreno) > 0 ? fm(cn(dados.valorTerreno)) : '-'} />
            <RowData label="Valor das benfeitorias"   value={cn(dados.valorBenfeitorias) > 0 ? fm(cn(dados.valorBenfeitorias)) : '-'} />
            <RowData label="Fator de comercialização" value={dados.fatorComercializacao || '1,00'} />
            <RowData label="Valor final arredondado"  value={fm(valorFinal)} last />
          </View>
        </View>

        {/* 13 - GRAU DE FUNDAMENTAÇÃO E PRECISÃO */}
        <SecaoHeader numero="13" titulo="Grau de Fundamentação e Precisão" />
        <View style={{ flexDirection: 'row', marginTop: 4 }}>
          <View style={[s.table, { flex: 1, marginRight: 6 }]}>
            <View style={[s.row, { backgroundColor: AZUL_LT }]}>
              <Text style={[s.cellHead, { flex: 1, textAlign: 'center' }]}>Grau de Fundamentação</Text>
            </View>
            <View style={s.rowLast}>
              <View style={[s.cell, { flex: 1, alignItems: 'center' }]}>
                <Text style={{ fontSize: 18, fontFamily: 'Helvetica-Bold', color: AZUL2 }}>{grauFund}</Text>
              </View>
            </View>
          </View>
          <View style={[s.table, { flex: 1 }]}>
            <View style={[s.row, { backgroundColor: AZUL_LT }]}>
              <Text style={[s.cellHead, { flex: 1, textAlign: 'center' }]}>Grau de Precisão</Text>
            </View>
            <View style={s.rowLast}>
              <View style={[s.cell, { flex: 1, alignItems: 'center' }]}>
                <Text style={{ fontSize: 18, fontFamily: 'Helvetica-Bold', color: AZUL2 }}>{grauPrecisao}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 14 - CONSIDERAÇÕES FINAIS */}
        <SecaoHeader numero="14" titulo="Considerações Finais" />
        <View style={{ padding: 6, borderWidth: 0.5, borderColor: CINZA, marginTop: 0 }}>
          <Text style={[s.txtBold, { marginBottom: 4 }]}>INFORMAÇÕES FINAIS</Text>
          <Text style={s.txt}>
            Avaliação para determinação do valor de mercado do imóvel localizado em {dados.endereco}, 
            feita pelo {metodologiaLabel(dados.metodoAvaliacao)}. O presente laudo de avaliação 
            se enquadra no Grau de Fundamentação {grauFund} e Grau de Precisão {grauPrecisao} e 
            atende integralmente à Norma ABNT NBR 14.653.
          </Text>

          {/* Assinatura */}
          <View style={{ marginTop: 20, alignItems: 'center' }}>
            <View style={s.signLine} />
            <Text style={s.signName}>{dados.responsavelNome || 'Responsável Técnico'}</Text>
            <Text style={s.signSub}>{dados.responsavelRegistro ? `CREA/CAU: ${dados.responsavelRegistro}` : ''}</Text>
            <Text style={s.signSub}>Lesath Engenharia – CNPJ: 49.068.717/0001-64</Text>
            {dados.dataLaudo && (
              <Text style={[s.signSub, { marginTop: 4 }]}>
                {(() => {
                  const d = new Date(dados.dataLaudo + 'T12:00:00')
                  const meses = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro']
                  return `São Paulo, ${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}.`
                })()}
              </Text>
            )}
          </View>
        </View>
      </Page>

      {/* ══════════════════════════════════════════════════
          PÁGINAS DE FOTOS — ANEXO A
      ══════════════════════════════════════════════════ */}
      {fotosAnexo.length > 0 && (
        <>
          {Array.from({ length: Math.ceil(fotosAnexo.length / 6) }, (_, pageIdx) => {
            const grupo = fotosAnexo.slice(pageIdx * 6, pageIdx * 6 + 6)
            return (
              <Page key={`fotos-${pageIdx}`} size="A4" style={s.page}>
                <Header solicitante={dados.solicitante} proponente={dados.proprietario} />
                <Footer dataLaudo={dados.dataLaudo} />

                <View style={{ backgroundColor: AZUL2, paddingVertical: 4, paddingHorizontal: 6, marginBottom: 8 }}>
                  <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: BRANCO }}>
                    ANEXO A | DOCUMENTAÇÃO FOTOGRÁFICA
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {grupo.map((foto, i) => (
                    <View key={i} style={{ width: '48%', marginBottom: 6 }}>
                      <Image src={foto.preview} style={{ width: '100%', height: 100, objectFit: 'cover', borderWidth: 0.5, borderColor: CINZA }} />
                      <View style={{ backgroundColor: AZUL_LT, paddingVertical: 3, paddingHorizontal: 4, borderWidth: 0.5, borderColor: CINZA, borderTopWidth: 0 }}>
                        <Text style={{ fontSize: 7, color: AZUL }}>{foto.legenda || `Foto ${pageIdx * 6 + i + 1}`}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </Page>
            )
          })}
        </>
      )}
    </Document>
  )
}
