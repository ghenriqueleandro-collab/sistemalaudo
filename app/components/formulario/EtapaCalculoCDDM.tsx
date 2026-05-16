'use client'

import React, { useState, useMemo, useCallback, useEffect } from 'react'

// ─── Tipos ────────────────────────────────────────────────────────────────────

type FOCLetra = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | ''

export type ElementoCDDM = {
  id: number
  tipo: string
  empreendimento: string
  logradouro: string
  bairro: string
  cidade: string
  uf: string
  data: string
  padraoConstrutivo: string
  estadoConservacao: FOCLetra
  idade: string
  andar: string
  area: string
  dormitorios: string
  suites: string
  vagas: string
  valorOferta: string
  fatorOferta: string
  fatorLocal: string
  fatorAndar: string
  fatorVaga: string
  tipoOferta: string
  status: string
  fonte: string
  telefone: string
  link: string
  coordenadas: string
  distanciaAvaliando: string
  observacoes: string
}

export type AvalianoCDDM = {
  area: string
  padraoConstrutivo: string
  estadoConservacao: FOCLetra
  fatorLocal: string
  fatorAndar: string
  vagas: string
}

type ResultElem = {
  vu: number
  fatorArea: number
  fatorLocal: number
  fatorPadrao: number
  fatorFOC: number
  fatorAndar: number
  fatorVaga: number
  coefGeral: number
  vuHomog: number
  residuo: number
  saneado: boolean
}

type Resultado = {
  elementos: ResultElem[]
  media: number
  mediaSaneada: number
  desvioPadrao: number
  coefVariacao: number
  tStudent: number
  resultado: number
  intervaloConfianca: number
  limiteInferior: number
  limiteSuperior: number
  limiteInf30: number
  limiteSup30: number
  grauPrecisao: 'III' | 'II' | 'I' | '-'
}

// ─── Tabelas de coeficientes (conforme Apoio_Novo e Apoio da planilha) ────────

// Depreciação FOC (Fator de Obsolescência e Conservação)
const FOC_DEPR: Record<string, number> = {
  A: 0,
  B: 0.0032,
  C: 0.0252,
  D: 0.0809,
  E: 0.1810,
  F: 0.3320,
  G: 0.5260,
  H: 0.7520,
  I: 1.0000,
}

const FOC_LABEL: Record<string, string> = {
  A: 'A – Novo',
  B: 'B – Entre novo e regular',
  C: 'C – Regular',
  D: 'D – Entre regular e reparos simples',
  E: 'E – Reparos simples',
  F: 'F – Entre reparos simples e importantes',
  G: 'G – Reparos importantes',
  H: 'H – Entre reparos importantes e sem valor',
  I: 'I – Sem valor',
}

// Mapeamento estado conservação textual → FOC letra
const CONSERVACAO_PARA_FOC: Record<string, FOCLetra> = {
  'Novo': 'A',
  'Entre novo e regular': 'B',
  'Regular': 'C',
  'Entre regular e reparos simples': 'D',
  'Reparos simples': 'E',
  'Entre reparos simples e importantes': 'F',
  'Reparos importantes': 'G',
  'Entre reparos importantes e sem valor': 'H',
  'Sem valor': 'I',
}

// ─── Tabela completa de Padrão Construtivo (ref_padrao da planilha) ──────────
// Pc = Coeficiente de Padrão Construtivo | Ir = Vida Referencial (anos) | R = Valor Residual
const PADRAO_TABLE: Record<string, { Pc: number; Ir: number; R: number }> = {
  'Escritório Econômico -':             { Pc: 2.0810, Ir: 70, R: 0.2 },
  'Escritório Econômico':               { Pc: 2.3130, Ir: 70, R: 0.2 },
  'Escritório Econômico +':             { Pc: 2.5440, Ir: 70, R: 0.2 },
  'Escritório Simples s/Elevador -':    { Pc: 3.3780, Ir: 70, R: 0.2 },
  'Escritório Simples s/Elevador':      { Pc: 3.7530, Ir: 70, R: 0.2 },
  'Escritório Simples s/Elevador +':    { Pc: 4.0130, Ir: 70, R: 0.2 },
  'Escritório Simples c/Elevador -':    { Pc: 3.7420, Ir: 70, R: 0.2 },
  'Escritório Simples c/Elevador':      { Pc: 4.1580, Ir: 70, R: 0.2 },
  'Escritório Simples c/Elevador +':    { Pc: 4.5730, Ir: 70, R: 0.2 },
  'Escritório Médio s/Elevador -':      { Pc: 4.0140, Ir: 60, R: 0.2 },
  'Escritório Médio s/Elevador':        { Pc: 4.3300, Ir: 60, R: 0.2 },
  'Escritório Médio s/Elevador +':      { Pc: 4.7630, Ir: 60, R: 0.2 },
  'Escritório Médio c/Elevador -':      { Pc: 4.7450, Ir: 60, R: 0.2 },
  'Escritório Médio c/Elevador':        { Pc: 5.2730, Ir: 60, R: 0.2 },
  'Escritório Médio c/Elevador +':      { Pc: 5.7670, Ir: 60, R: 0.2 },
  'Escritório Superior s/Elevador -':   { Pc: 5.2060, Ir: 60, R: 0.2 },
  'Escritório Superior s/Elevador':     { Pc: 5.7840, Ir: 60, R: 0.2 },
  'Escritório Superior s/Elevador +':   { Pc: 6.3630, Ir: 60, R: 0.2 },
  'Escritório Superior c/Elevador -':   { Pc: 5.7680, Ir: 60, R: 0.2 },
  'Escritório Superior c/Elevador':     { Pc: 6.3710, Ir: 60, R: 0.2 },
  'Escritório Superior c/Elevador +':   { Pc: 7.0720, Ir: 60, R: 0.2 },
  'Escritório Fino -':                  { Pc: 7.0730, Ir: 50, R: 0.2 },
  'Escritório Fino':                    { Pc: 7.9290, Ir: 50, R: 0.2 },
  'Escritório Fino +':                  { Pc: 8.7220, Ir: 50, R: 0.2 },
  'Escritório Luxo':                    { Pc: 9.9350, Ir: 50, R: 0.2 },
  'CASA | Fino':                        { Pc: 3.8650, Ir: 50, R: 0.2 },
  'CASA | Fino +':                      { Pc: 4.3990, Ir: 50, R: 0.2 },
  'CASA | Luxo -':                      { Pc: 4.8430, Ir: 50, R: 0.2 },
  'GALPÃO | Econômico -':               { Pc: 0.5180, Ir: 60, R: 0.2 },
  'GALPÃO | Econômico':                 { Pc: 0.6090, Ir: 60, R: 0.2 },
  'GALPÃO | Econômico +':               { Pc: 0.7000, Ir: 60, R: 0.2 },
  'GALPÃO | Simples -':                 { Pc: 0.9820, Ir: 60, R: 0.2 },
  'GALPÃO | Simples':                   { Pc: 1.1250, Ir: 60, R: 0.2 },
  'GALPÃO | Simples +':                 { Pc: 1.2680, Ir: 60, R: 0.2 },
  'GALPÃO | Médio -':                   { Pc: 1.3680, Ir: 80, R: 0.2 },
  'GALPÃO | Médio':                     { Pc: 1.6590, Ir: 80, R: 0.2 },
  'GALPÃO | Médio +':                   { Pc: 1.8710, Ir: 80, R: 0.2 },
  'GALPÃO | Superior -':                { Pc: 1.8720, Ir: 80, R: 0.2 },
  'COBERTURA | Simples -':              { Pc: 0.0710, Ir: 20, R: 0.2 },
  'COBERTURA | Simples':                { Pc: 0.1420, Ir: 20, R: 0.2 },
  'COBERTURA | Simples +':              { Pc: 0.2130, Ir: 20, R: 0.2 },
  'COBERTURA | Médio -':                { Pc: 0.2290, Ir: 20, R: 0.2 },
  'COBERTURA | Médio':                  { Pc: 0.2930, Ir: 20, R: 0.2 },
  'COBERTURA | Médio +':                { Pc: 0.3570, Ir: 20, R: 0.2 },
  'COBERTURA | Superior -':             { Pc: 0.3330, Ir: 30, R: 0.2 },
  'COBERTURA | Superior':               { Pc: 0.4860, Ir: 30, R: 0.2 },
  'COBERTURA | Superior +':             { Pc: 0.6390, Ir: 30, R: 0.2 },
  'Apto. Econômico -':                  { Pc: 0.6000, Ir: 60, R: 0.2 },
  'Apto. Econômico':                    { Pc: 0.8100, Ir: 60, R: 0.2 },
  'Apto. Econômico +':                  { Pc: 1.0200, Ir: 60, R: 0.2 },
  'Apto. Simples s/elev. -':            { Pc: 1.0260, Ir: 60, R: 0.2 },
  'Apto. Simples s/elev.':              { Pc: 1.0320, Ir: 60, R: 0.2 },
  'Apto. Simples s/elev. +':            { Pc: 1.2660, Ir: 60, R: 0.2 },
  'Apto. Simples c/elev. -':            { Pc: 1.5000, Ir: 60, R: 0.2 },
  'Apto. Simples c/elev.':              { Pc: 1.4700, Ir: 60, R: 0.2 },
  'Apto. Simples c/elev. +':            { Pc: 1.6800, Ir: 60, R: 0.2 },
  'Apto. Médio s/elev. -':              { Pc: 1.5123, Ir: 60, R: 0.2 },
  'Apto. Médio s/elev.':                { Pc: 1.7460, Ir: 60, R: 0.2 },
  'Apto. Médio s/elev. +':              { Pc: 1.9800, Ir: 60, R: 0.2 },
  'Apto. Médio c/elev. -':              { Pc: 1.6920, Ir: 60, R: 0.2 },
  'Apto. Médio c/elev.':                { Pc: 1.9260, Ir: 60, R: 0.2 },
  'Apto. Médio c/elev. +':              { Pc: 2.1600, Ir: 60, R: 0.2 },
  'Apto. Superior s/elev. -':           { Pc: 1.9920, Ir: 60, R: 0.2 },
  'Apto. Superior s/elev.':             { Pc: 2.2260, Ir: 60, R: 0.2 },
  'Apto. Superior s/elev. +':           { Pc: 2.4600, Ir: 60, R: 0.2 },
  'Apto. Superior c/elev. -':           { Pc: 2.1720, Ir: 60, R: 0.2 },
  'Apto. Superior c/elev.':             { Pc: 2.4060, Ir: 60, R: 0.2 },
  'Apto. Superior c/elev. +':           { Pc: 2.6400, Ir: 60, R: 0.2 },
  'Apto. Fino -':                       { Pc: 2.6520, Ir: 50, R: 0.2 },
  'Apto. Fino':                         { Pc: 3.0660, Ir: 50, R: 0.2 },
  'Apto. Fino +':                       { Pc: 3.4800, Ir: 50, R: 0.2 },
  'Apto. Luxo':                         { Pc: 4.3280, Ir: 50, R: 0.2 },
  'Casa Padrão Rústico Mínimo':         { Pc: 0.3600, Ir: 60, R: 0.2 },
  'Casa Padrão Rústico Médio':          { Pc: 0.4200, Ir: 60, R: 0.2 },
  'Casa Padrão Rústico Máximo':         { Pc: 0.4800, Ir: 60, R: 0.2 },
  'Casa Padrão Proletário Mínimo':      { Pc: 0.4920, Ir: 60, R: 0.2 },
  'Casa Padrão Proletário Médio':       { Pc: 0.5760, Ir: 60, R: 0.2 },
  'Casa Padrão Proletário Máximo':      { Pc: 0.6600, Ir: 60, R: 0.2 },
  'Casa Padrão Econômico Mínimo':       { Pc: 0.6720, Ir: 70, R: 0.2 },
  'Casa Padrão Econômico Médio':        { Pc: 0.7860, Ir: 70, R: 0.2 },
  'Casa Padrão Econômico Máximo':       { Pc: 0.8490, Ir: 70, R: 0.2 },
  'Casa Padrão Simples Mínimo':         { Pc: 0.9120, Ir: 70, R: 0.2 },
  'Casa Padrão Simples Médio':          { Pc: 1.0560, Ir: 70, R: 0.2 },
  'Casa Padrão Simples Máximo':         { Pc: 1.2000, Ir: 70, R: 0.2 },
  'Casa Padrão Médio Mínimo':           { Pc: 1.2120, Ir: 70, R: 0.2 },
  'Casa Padrão Médio Médio':            { Pc: 1.3860, Ir: 70, R: 0.2 },
  'Casa Padrão Médio Máximo':           { Pc: 1.5600, Ir: 70, R: 0.2 },
  'Casa Padrão Superior Mínimo':        { Pc: 1.6680, Ir: 60, R: 0.2 },
  'Casa Padrão Superior Médio':         { Pc: 1.7760, Ir: 60, R: 0.2 },
  'Casa Padrão Superior Máximo':        { Pc: 1.9800, Ir: 60, R: 0.2 },
  'Casa Padrão Fino Mínimo':            { Pc: 2.2080, Ir: 60, R: 0.2 },
  'Casa Padrão Fino Médio':             { Pc: 2.4360, Ir: 60, R: 0.2 },
  'Casa Padrão Fino Máximo':            { Pc: 2.8800, Ir: 60, R: 0.2 },
  'Casa Padrão Luxo':                   { Pc: 3.3360, Ir: 60, R: 0.2 },
}

// Grupos para exibição no select
const PADRAO_GRUPOS = [
  { grupo: 'Apartamento', prefixos: ['Apto.'] },
  { grupo: 'Casa', prefixos: ['Casa Padrão', 'CASA |'] },
  { grupo: 'Escritório', prefixos: ['Escritório'] },
  { grupo: 'Galpão', prefixos: ['GALPÃO |'] },
  { grupo: 'Cobertura', prefixos: ['COBERTURA |'] },
]

// T-Student 80% confiança (bilateral α=0.20, t(N-1, 0.10))
const T_STUDENT: Record<number, number> = {
  2: 3.078, 3: 1.886, 4: 1.638, 5: 1.533,
  6: 1.476, 7: 1.440, 8: 1.415, 9: 1.397,
  10: 1.383, 11: 1.372, 12: 1.363,
}

// ─── Funções auxiliares ───────────────────────────────────────────────────────

function pn(s: string): number {
  if (!s) return 0
  return parseFloat(s.replace(/[R$\s.]/g, '').replace(',', '.')) || 0
}

function fmt(v: number, dec = 2): string {
  if (!isFinite(v) || isNaN(v)) return '-'
  return v.toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec })
}

function fmtMoeda(v: number): string {
  if (!isFinite(v) || isNaN(v)) return '-'
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtFator(v: number): string {
  if (!isFinite(v) || isNaN(v)) return '-'
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })
}

function getPadraoData(padrao: string): { Pc: number; Ir: number; R: number } {
  return PADRAO_TABLE[padrao] ?? { Pc: 1, Ir: 60, R: 0.2 }
}

// VEIU (Tabela 1 do VEIU): Ka = 1 - ½×(Ie/Ir + Ie²/Ir²)
function calcularKa(Ie: number, Ir: number): number {
  if (Ir <= 0) return 1
  const v = Math.min(Ie / Ir, 1)
  return Math.max(0, 1 - 0.5 * (v + v * v))
}

function calcularK(Ie: number, Ir: number, Ec: number): number {
  return calcularKa(Ie, Ir) * (1 - Ec)
}

// Foc = R + K × (1-R) — fórmula da planilha: =(H5+O5*(1-H5))
function calcularFoc(Ie: number, Ir: number, R: number, Ec: number): number {
  return R + calcularK(Ie, Ir, Ec) * (1 - R)
}

function getFOCDepr(foc: string): number {
  return FOC_DEPR[foc] ?? 0
}

// ─── Motor de cálculo (replica exatamente as fórmulas da planilha) ───────────

function calcularResultado(
  elementos: ElementoCDDM[],
  avaliando: AvalianoCDDM,
  fatores: { local: boolean; padrao: boolean; foc: boolean; andar: boolean; vaga: boolean }
): Resultado {
  const areaAv       = pn(avaliando.area)
  const dadosAv      = getPadraoData(avaliando.padraoConstrutivo)
  const deprAv       = getFOCDepr(avaliando.estadoConservacao)
  const fLocalAv     = pn(avaliando.fatorLocal) || 100
  const fAndarAv     = pn(avaliando.fatorAndar) || 100
  const idadeAv      = pn((avaliando as any).idadeAparente || '0')

  const elemsValidos = elementos.filter(e => pn(e.area) > 0 && pn(e.valorOferta) > 0)

  const parciais: ResultElem[] = elemsValidos.map(e => {
    const area        = pn(e.area)
    const valOfer     = pn(e.valorOferta)
    const fOfer       = pn(e.fatorOferta) || 0.90
    const fLocalElem  = pn(e.fatorLocal) || 100
    const fAndarElem  = pn(e.fatorAndar) || 100
    const fVagaElem   = pn(e.fatorVaga) || 100
    const dadosElem   = getPadraoData(e.padraoConstrutivo)
    const deprElem    = getFOCDepr(e.estadoConservacao)
    const idadeElem   = pn(e.idade || '0')

    // VU = Valor Líquido / Área
    const vu = area > 0 ? (valOfer * fOfer) / area : 0

    // Fator Área — fórmula exata da planilha:
    // E5 = ROUND((C5/C53)^exp / 0.001, 0) × 0.001
    // onde C5 = área do elemento, C53 = área do avaliando → ratio = elem/av
    // exp = 0.125 se ratio < 0.7 ou > 1.3; senão = 0.25
    const round3 = (v: number) => Math.round(v / 0.001) * 0.001
    const fatorArea = (() => {
      if (area <= 0 || areaAv <= 0) return 1
      const ratio = area / areaAv
      return round3(Math.pow(ratio, (ratio < 0.7 || ratio > 1.3) ? 0.125 : 0.25))
    })()

    // Fator Local
    const fatorLocal = fatores.local && fLocalElem > 0 ? fLocalAv / fLocalElem : 1

    // Fator Padrão: Pc_av / Pc_elem
    const fatorPadrao = fatores.padrao && dadosElem.Pc > 0 ? dadosAv.Pc / dadosElem.Pc : 1

    // Fator FOC (VEIU): Foc_av / Foc_elem
    const Foc_av   = calcularFoc(idadeAv,   dadosAv.Ir,   dadosAv.R,   deprAv)
    const Foc_elem = calcularFoc(idadeElem, dadosElem.Ir, dadosElem.R, deprElem)
    const fatorFOC = fatores.foc && Foc_elem > 0 ? Foc_av / Foc_elem : 1

    // Fator Andar
    const fatorAndar = fatores.andar && fAndarElem > 0 ? fAndarAv / fAndarElem : 1

    // Fator Vaga
    const fVagaAv  = 100
    const fatorVaga = fatores.vaga && fVagaElem > 0 ? fVagaAv / fVagaElem : 1

    // Coef. Geral — fórmula ADITIVA da planilha: 1 + Σ(fi - 1)
    // Equivale a: soma de todos os fatores menos (n_fatores - 1)
    const coefGeral = 1
      + (fatorArea   - 1)
      + (fatorLocal  - 1)
      + (fatorPadrao - 1)
      + (fatorFOC    - 1)
      + (fatorAndar  - 1)
      + (fatorVaga   - 1)

    // V.U. Homogeneizado
    const vuHomog = vu * coefGeral

    return {
      vu, fatorArea, fatorLocal, fatorPadrao, fatorFOC,
      fatorAndar, fatorVaga, coefGeral, vuHomog,
      residuo: 0, saneado: true,
    }
  })

  if (parciais.length === 0) {
    return {
      elementos: parciais, media: 0, mediaSaneada: 0, desvioPadrao: 0,
      coefVariacao: 0, tStudent: 1.533, resultado: 0, intervaloConfianca: 0,
      limiteInferior: 0, limiteSuperior: 0, limiteInf30: 0, limiteSup30: 0,
      grauPrecisao: '-',
    }
  }

  // Média bruta
  const vus = parciais.map(p => p.vuHomog).filter(v => v > 0)
  if (vus.length === 0) {
    return {
      elementos: parciais, media: 0, mediaSaneada: 0, desvioPadrao: 0,
      coefVariacao: 0, tStudent: 1.533, resultado: 0, intervaloConfianca: 0,
      limiteInferior: 0, limiteSuperior: 0, limiteInf30: 0, limiteSup30: 0,
      grauPrecisao: '-',
    }
  }

  const media     = vus.reduce((a, b) => a + b, 0) / vus.length
  const limInf30  = media * 0.70
  const limSup30  = media * 1.30

  // Saneamento: remove valores fora de ±30%
  parciais.forEach(p => { p.saneado = p.vuHomog >= limInf30 && p.vuHomog <= limSup30 })
  const vusSaneados = parciais.filter(p => p.saneado).map(p => p.vuHomog)
  const n = vusSaneados.length

  const mediaSaneada = n > 0
    ? vusSaneados.reduce((a, b) => a + b, 0) / n
    : media

  // Resíduos relativos = (VU_hom - media_saneada) / media_saneada
  parciais.forEach(p => {
    p.residuo = mediaSaneada > 0 ? (p.vuHomog - mediaSaneada) / mediaSaneada : 0
  })

  // Desvio padrão amostral
  const desvioPadrao = n > 1
    ? Math.sqrt(vusSaneados.reduce((acc, v) => acc + (v - mediaSaneada) ** 2, 0) / (n - 1))
    : 0

  const coefVariacao = mediaSaneada > 0 ? (desvioPadrao / mediaSaneada) * 100 : 0

  // T de Student para 80% de confiança (bilateral), n−1 graus de liberdade
  const tStudent = T_STUDENT[n] ?? 1.533

  // Intervalo de confiança: fórmula da planilha = T × S / sqrt(N-1)
  const resultado = n > 1 ? tStudent * desvioPadrao / Math.sqrt(n - 1) : 0
  const intervaloConfianca = mediaSaneada > 0 ? (resultado / mediaSaneada) * 100 : 0

  // Grau de precisão (NBR 14653-2, item 13.4)
  const grauPrecisao: 'III' | 'II' | 'I' | '-' =
    intervaloConfianca <= 30 ? 'III' :
    intervaloConfianca <= 40 ? 'II' :
    intervaloConfianca <= 50 ? 'I'  : '-'

  return {
    elementos: parciais, media, mediaSaneada, desvioPadrao, coefVariacao,
    tStudent, resultado, intervaloConfianca,
    limiteInferior: mediaSaneada - resultado,
    limiteSuperior: mediaSaneada + resultado,
    limiteInf30: limInf30,
    limiteSup30: limSup30,
    grauPrecisao,
  }
}

// ─── Elemento inicial padrão ──────────────────────────────────────────────────

function elemInicial(id: number): ElementoCDDM {
  return {
    id, tipo: '', empreendimento: '', logradouro: '', bairro: '', cidade: '',
    uf: '', data: new Date().toISOString().split('T')[0], padraoConstrutivo: '',
    estadoConservacao: '', idade: '', andar: '', area: '', dormitorios: '',
    suites: '', vagas: '', valorOferta: '', fatorOferta: '0,90',
    fatorLocal: '100', fatorAndar: '100', fatorVaga: '100',
    tipoOferta: 'Venda', status: 'Em oferta', fonte: '', telefone: '',
    link: '', coordenadas: '', distanciaAvaliando: '', observacoes: '',
  }
}

// ─── Gráfico Resíduos Relativos (SVG) ────────────────────────────────────────

function GraficoResiduos({ resultado }: { resultado: Resultado }) {
  const W = 460, H = 180, padL = 50, padR = 16, padT = 16, padB = 36
  const chartW = W - padL - padR
  const chartH = H - padT - padB

  const elems = resultado.elementos.filter(r => r.vuHomog > 0)
  if (elems.length === 0) return null

  const maxAbs = Math.max(35, ...elems.map(r => Math.abs(r.residuo * 100)))
  const yScale = (v: number) => padT + chartH / 2 - (v / maxAbs) * (chartH / 2)
  const xPos   = (i: number) => padL + (i + 0.5) * (chartW / elems.length)
  const barW   = Math.min(28, (chartW / elems.length) * 0.55)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
      {/* Grade */}
      {[-30, -15, 0, 15, 30].map(v => (
        <g key={v}>
          <line x1={padL} x2={W - padR} y1={yScale(v)} y2={yScale(v)}
            stroke={v === 0 ? '#475569' : '#e2e8f0'} strokeWidth={v === 0 ? 1 : 0.5} strokeDasharray={v !== 0 ? '4 3' : undefined} />
          <text x={padL - 6} y={yScale(v) + 4} textAnchor="end" fontSize={9} fill="#94a3b8">{v}%</text>
        </g>
      ))}
      {/* ±30% band */}
      <rect x={padL} y={yScale(30)} width={chartW} height={yScale(-30) - yScale(30)}
        fill="#f0fdf4" opacity={0.6} />
      <line x1={padL} x2={W - padR} y1={yScale(30)}  y2={yScale(30)}  stroke="#22c55e" strokeWidth={1} strokeDasharray="5 3" />
      <line x1={padL} x2={W - padR} y1={yScale(-30)} y2={yScale(-30)} stroke="#22c55e" strokeWidth={1} strokeDasharray="5 3" />

      {/* Barras */}
      {elems.map((r, i) => {
        const y0   = yScale(0)
        const yTop = yScale(r.residuo * 100)
        const fill = r.saneado ? '#2563eb' : '#f87171'
        return (
          <g key={i}>
            <rect x={xPos(i) - barW / 2} y={Math.min(y0, yTop)} width={barW}
              height={Math.abs(y0 - yTop)} fill={fill} opacity={0.8} />
            <text x={xPos(i)} y={H - padB + 14} textAnchor="middle" fontSize={10} fill="#475569">
              {i + 1}
            </text>
            <text x={xPos(i)} y={Math.min(y0, yTop) - 3} textAnchor="middle" fontSize={8.5} fill={fill}>
              {(r.residuo * 100).toFixed(1)}%
            </text>
          </g>
        )
      })}

      {/* Eixo X */}
      <line x1={padL} x2={W - padR} y1={yScale(0)} y2={yScale(0)} stroke="#475569" strokeWidth={1} />
      <text x={W / 2} y={H - 2} textAnchor="middle" fontSize={9.5} fill="#64748b">Elementos</text>
    </svg>
  )
}

// ─── Gráfico Scatter V.U. Observado × V.U. Calculado (SVG) ───────────────────

function GraficoScatter({ resultado }: { resultado: Resultado }) {
  const W = 460, H = 220, pad = 50

  const elems = resultado.elementos.filter(r => r.vu > 0 && r.vuHomog > 0)
  if (elems.length === 0) return null

  const xs = elems.map(r => r.vu)
  const ys = elems.map(r => r.vuHomog)
  const allV = [...xs, ...ys]
  const minV = Math.min(...allV) * 0.9
  const maxV = Math.max(...allV) * 1.1
  const range = maxV - minV || 1

  const toX = (v: number) => pad + ((v - minV) / range) * (W - pad * 2)
  const toY = (v: number) => (H - pad) - ((v - minV) / range) * (H - pad * 1.5)

  // Linha de identidade (x=y)
  const lineX1 = toX(minV), lineY1 = toY(minV)
  const lineX2 = toX(maxV), lineY2 = toY(maxV)

  // Ticks
  const ticks = 5
  const tickStep = range / ticks

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
      {/* Grade */}
      {Array.from({ length: ticks + 1 }, (_, i) => {
        const v = minV + i * tickStep
        const x = toX(v)
        const y = toY(v)
        return (
          <g key={i}>
            <line x1={x} x2={x} y1={pad / 2} y2={H - pad} stroke="#e2e8f0" strokeWidth={0.5} />
            <line x1={pad} x2={W - pad / 2} y1={y} y2={y} stroke="#e2e8f0" strokeWidth={0.5} />
            <text x={x} y={H - pad + 14} textAnchor="middle" fontSize={8.5} fill="#94a3b8">
              {(v / 1000).toFixed(0)}k
            </text>
            <text x={pad - 8} y={y + 3} textAnchor="end" fontSize={8.5} fill="#94a3b8">
              {(v / 1000).toFixed(0)}k
            </text>
          </g>
        )
      })}

      {/* Linha identidade */}
      <line x1={lineX1} y1={lineY1} x2={lineX2} y2={lineY2}
        stroke="#94a3b8" strokeWidth={1} strokeDasharray="5 3" />

      {/* Pontos */}
      {elems.map((r, i) => (
        <g key={i}>
          <circle cx={toX(r.vu)} cy={toY(r.vuHomog)} r={6}
            fill={r.saneado ? '#2563eb' : '#f87171'} opacity={0.85} />
          <text x={toX(r.vu) + 8} y={toY(r.vuHomog) + 4} fontSize={9} fill="#475569">{i + 1}</text>
        </g>
      ))}

      {/* Eixos */}
      <line x1={pad} x2={W - pad / 2} y1={H - pad} y2={H - pad} stroke="#475569" strokeWidth={1} />
      <line x1={pad} x2={pad} y1={pad / 2} y2={H - pad} stroke="#475569" strokeWidth={1} />

      {/* Labels */}
      <text x={W / 2} y={H - 2} textAnchor="middle" fontSize={9.5} fill="#64748b">V.U. Observado (R$/m²)</text>
      <text x={12} y={H / 2} textAnchor="middle" fontSize={9.5} fill="#64748b"
        transform={`rotate(-90, 12, ${H / 2})`}>V.U. Calculado (R$/m²)</text>
    </svg>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

type Props = {
  form: any
  setForm?: React.Dispatch<React.SetStateAction<any>>
  fatoresCDDMAtivos?: { local: boolean; padrao: boolean; foc: boolean; andar: boolean; vaga: boolean }
  onSave?: (elementos: ElementoCDDM[], resultado: Resultado) => void
}

export default function EtapaCalculoCDDM({ form, setForm, fatoresCDDMAtivos, onSave }: Props) {
  const fatores = fatoresCDDMAtivos ?? { local: true, padrao: true, foc: true, andar: true, vaga: true }
  const [elementos, setElementos] = useState<ElementoCDDM[]>(() => {
    const saved = form?.elementosComparativos
    if (Array.isArray(saved) && saved.length > 0) {
      return saved.map((e: any, i: number) => ({ ...elemInicial(i + 1), ...e }))
    }
    return [elemInicial(1), elemInicial(2), elemInicial(3), elemInicial(4), elemInicial(5)]
  })
  const [abaAtiva, setAbaAtiva] = useState(0)
  const [mostrarCalculo, setMostrarCalculo] = useState<'cddm' | 'homog' | 'fund'>('cddm')

  // Persiste elementos no form para sobreviver à navegação entre etapas
  useEffect(() => {
    if (!setForm) return
    setForm((prev: any) => ({ ...prev, elementosComparativos: elementos }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elementos])

  // ── Estados editáveis do avaliando (inicializam do form, editáveis no componente) ──
  const areaAvInit = form.areaTerrenoTotal || form.areaConstruidaTotal || ''
  const [avArea,        setAvArea]        = useState(areaAvInit)
  const [avFatorLocal,  setAvFatorLocal]  = useState(form.fatorLocalAvaliando  || '100')
  const [avFatorAndar,  setAvFatorAndar]  = useState(form.fatorAndarAvaliando  || '100')
  const [avVagas,       setAvVagas]       = useState(form.vagasAvaliando       || '0')
  const [avIdade,       setAvIdade]       = useState(form.idadeAparente        || '0')

  // Atualiza o form quando o usuário edita o avaliando aqui
  useEffect(() => {
    if (!setForm) return
    setForm((prev: any) => ({
      ...prev,
      areaTerrenoTotal:    avArea,
      fatorLocalAvaliando: avFatorLocal,
      fatorAndarAvaliando: avFatorAndar,
      vagasAvaliando:      avVagas,
      idadeAparente:       avIdade,
    }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avArea, avFatorLocal, avFatorAndar, avVagas, avIdade])

  const avaliando = useMemo<AvalianoCDDM>(() => ({
    area:             avArea,
    padraoConstrutivo: form.padraoCDDM || form.padrao || '',
    estadoConservacao: (CONSERVACAO_PARA_FOC[form.estadoConservacao] ?? '') as FOCLetra,
    fatorLocal:       avFatorLocal,
    fatorAndar:       avFatorAndar,
    vagas:            avVagas,
    idadeAparente:    avIdade,
  }), [avArea, avFatorLocal, avFatorAndar, avVagas, avIdade,
       form.padraoCDDM, form.padrao, form.estadoConservacao])

  const resultado = useMemo(
    () => calcularResultado(elementos, avaliando, fatores),
    [elementos, avaliando, fatores]
  )

  function updateElem(idx: number, campo: keyof ElementoCDDM, val: string) {
    setElementos(prev => prev.map((e, i) => i === idx ? { ...e, [campo]: val } : e))
  }

  function adicionarElemento() {
    if (elementos.length >= 12) return
    setElementos(prev => [...prev, elemInicial(prev.length + 1)])
    setAbaAtiva(elementos.length)
  }

  function removerElemento(idx: number) {
    if (elementos.length <= 3) return
    const novos = elementos.filter((_, i) => i !== idx).map((e, i) => ({ ...e, id: i + 1 }))
    setElementos(novos)
    setAbaAtiva(Math.min(abaAtiva, novos.length - 1))
  }

  const cls = 'w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition'
  const clsSelect = cls + ' appearance-none'

  const elemsValidos = resultado.elementos.filter(r => r.vuHomog > 0)
  const elem = elementos[abaAtiva]
  const res  = resultado.elementos[abaAtiva]

  return (
    <div className="space-y-5">

      {/* Cabeçalho */}
      <div>
        <h2 className="text-xl font-semibold text-slate-900 mb-1">
          10. Metodologia, pesquisas e cálculos
        </h2>
        <p className="text-sm text-slate-500">
          Método Comparativo Direto · Tratamento por Fatores · CUB-R8-N
        </p>
      </div>

      {/* Dados do avaliando — editáveis diretamente aqui */}
      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
        <p className="text-xs font-semibold text-blue-800 mb-3 uppercase tracking-wide">
          Dados do avaliando — referência para o cálculo
        </p>
        <p className="text-[11px] text-blue-600 mb-3">
          Estes campos vêm da seção 1–6 mas podem ser ajustados aqui diretamente.
        </p>
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div>
            <span className="text-xs text-blue-700 font-semibold block mb-1">Área do avaliando (m²)</span>
            <input
              className="w-full bg-white border border-blue-300 rounded-xl px-3 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-300"
              value={avArea}
              onChange={e => setAvArea(e.target.value)}
              placeholder="Ex: 250"
            />
          </div>
          <div>
            <span className="text-xs text-blue-600 font-medium block mb-1">Padrão construtivo (CDDM)</span>
            <div className="bg-white border border-blue-200 rounded-xl px-3 py-2 font-medium text-slate-800 truncate text-xs">
              {form.padraoCDDM || form.padrao || <span className="text-red-400">Não preenchido na seção 1–6</span>}
            </div>
          </div>
          <div>
            <span className="text-xs text-blue-600 font-medium block mb-1">Estado de conservação</span>
            <div className="bg-white border border-blue-200 rounded-xl px-3 py-2 font-medium text-slate-800 text-xs">
              {form.estadoConservacao || <span className="text-red-400">Não preenchido</span>}
            </div>
          </div>
          <div>
            <span className="text-xs text-blue-600 font-medium block mb-1">Idade aparente (anos)</span>
            <input
              className="w-full bg-white border border-blue-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-300"
              value={avIdade}
              onChange={e => setAvIdade(e.target.value)}
              placeholder="0"
            />
          </div>
          <div>
            <span className="text-xs text-blue-600 font-medium block mb-1">Fator local</span>
            <input
              className="w-full bg-white border border-blue-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-300"
              value={avFatorLocal}
              onChange={e => setAvFatorLocal(e.target.value)}
              placeholder="100"
            />
          </div>
          <div>
            <span className="text-xs text-blue-600 font-medium block mb-1">Fator andar / Vagas</span>
            <div className="flex gap-2">
              <input
                className="w-full bg-white border border-blue-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-300"
                value={avFatorAndar}
                onChange={e => setAvFatorAndar(e.target.value)}
                placeholder="100"
              />
              <input
                className="w-20 bg-white border border-blue-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-300"
                value={avVagas}
                onChange={e => setAvVagas(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>
        </div>
        {(!form.padraoCDDM && !form.padrao) && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-3">
            ⚠ Preencha o <strong>Padrão construtivo (CDDM)</strong> na seção 1–6 para que o Fator Padrão seja calculado corretamente.
          </p>
        )}
      </div>

      {/* Abas de elementos */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="border-b border-slate-100 px-4 pt-4 pb-0">
          <div className="flex flex-wrap gap-1.5 mb-0">
            {elementos.map((_, i) => {
              const r = resultado.elementos[i]
              const preenchido = pn(elementos[i].area) > 0 && pn(elementos[i].valorOferta) > 0
              return (
                <button key={i} type="button" onClick={() => setAbaAtiva(i)}
                  className={`px-3 py-1.5 rounded-t-xl text-xs font-semibold border transition
                    ${abaAtiva === i
                      ? 'bg-blue-600 text-white border-blue-600'
                      : preenchido
                      ? 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                    }`}>
                  {i + 1}
                  {preenchido && r?.saneado === false && (
                    <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-orange-400" title="Elemento fora do intervalo de saneamento" />
                  )}
                  {preenchido && r?.saneado === true && (
                    <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  )}
                </button>
              )
            })}
            {elementos.length < 12 && (
              <button type="button" onClick={adicionarElemento}
                className="px-3 py-1.5 rounded-t-xl text-xs font-semibold border border-dashed border-slate-300 text-slate-400 hover:text-blue-600 hover:border-blue-400 transition">
                + Adicionar
              </button>
            )}
          </div>
        </div>

        {/* Formulário do elemento ativo */}
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-700">Elemento comparativo {abaAtiva + 1}</span>
            {elementos.length > 3 && (
              <button type="button" onClick={() => removerElemento(abaAtiva)}
                className="text-xs text-red-500 hover:text-red-700 border border-red-200 rounded-lg px-2.5 py-1 transition">
                Remover elemento
              </button>
            )}
          </div>

          {/* Identificação */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Tipo</label>
              <input value={elem.tipo} onChange={e => updateElem(abaAtiva, 'tipo', e.target.value)}
                placeholder="Ex: Apartamento, Casa…" className={cls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Data</label>
              <input type="date" value={elem.data} onChange={e => updateElem(abaAtiva, 'data', e.target.value)} className={cls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Distância do avaliando</label>
              <input value={elem.distanciaAvaliando} onChange={e => updateElem(abaAtiva, 'distanciaAvaliando', e.target.value)}
                placeholder="Ex: 1,2 km" className={cls} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Logradouro</label>
              <input value={elem.logradouro} onChange={e => updateElem(abaAtiva, 'logradouro', e.target.value)} className={cls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Bairro</label>
              <input value={elem.bairro} onChange={e => updateElem(abaAtiva, 'bairro', e.target.value)} className={cls} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Cidade</label>
              <input value={elem.cidade} onChange={e => updateElem(abaAtiva, 'cidade', e.target.value)} className={cls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">UF</label>
              <input value={elem.uf} onChange={e => updateElem(abaAtiva, 'uf', e.target.value)} className={cls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Coordenadas</label>
              <input value={elem.coordenadas} onChange={e => updateElem(abaAtiva, 'coordenadas', e.target.value)}
                placeholder="-23.55, -46.63" className={cls} />
            </div>
          </div>

          {/* Características */}
          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Características</p>
            <div className="grid grid-cols-4 gap-3">
              {fatores.padrao && (
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Padrão construtivo</label>
                  <select value={elem.padraoConstrutivo} onChange={e => updateElem(abaAtiva, 'padraoConstrutivo', e.target.value)} className={clsSelect}>
                    <option value="">Selecione</option>
                    {PADRAO_GRUPOS.map(({ grupo, prefixos }) => {
                      const opts = Object.keys(PADRAO_TABLE).filter(k => prefixos.some(p => k.startsWith(p)))
                      return opts.length > 0 ? (
                        <optgroup key={grupo} label={grupo}>
                          {opts.map(k => <option key={k} value={k}>{k}</option>)}
                        </optgroup>
                      ) : null
                    })}
                  </select>
                </div>
              )}
              {fatores.foc && (
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Estado de conservação (FOC)</label>
                  <select value={elem.estadoConservacao} onChange={e => updateElem(abaAtiva, 'estadoConservacao', e.target.value as FOCLetra)} className={clsSelect}>
                    <option value="">Selecione</option>
                    {Object.entries(FOC_LABEL).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
              )}
              {fatores.foc && (
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Idade (anos)</label>
                  <input type="number" value={elem.idade} onChange={e => updateElem(abaAtiva, 'idade', e.target.value)}
                    placeholder="0" className={cls} />
                </div>
              )}
              {fatores.andar && (
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Andar</label>
                  <input type="text" value={elem.andar} onChange={e => updateElem(abaAtiva, 'andar', e.target.value)}
                    placeholder="n/a" className={cls} />
                </div>
              )}
            </div>

            <div className="grid grid-cols-5 gap-3 mt-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Área (m²) *</label>
                <input type="number" value={elem.area} onChange={e => updateElem(abaAtiva, 'area', e.target.value)}
                  placeholder="0,00" className={cls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Dormitórios</label>
                <input type="number" value={elem.dormitorios} onChange={e => updateElem(abaAtiva, 'dormitorios', e.target.value)} className={cls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Suítes</label>
                <input type="number" value={elem.suites} onChange={e => updateElem(abaAtiva, 'suites', e.target.value)} className={cls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Vagas</label>
                <input type="number" value={elem.vagas} onChange={e => updateElem(abaAtiva, 'vagas', e.target.value)} className={cls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Empreendimento</label>
                <input value={elem.empreendimento} onChange={e => updateElem(abaAtiva, 'empreendimento', e.target.value)} className={cls} />
              </div>
            </div>
          </div>

          {/* Valores e fatores */}
          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Valores e fatores</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Valor de oferta (R$) *</label>
                <input value={elem.valorOferta} onChange={e => updateElem(abaAtiva, 'valorOferta', e.target.value)}
                  placeholder="R$ 0,00" className={cls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Fator oferta (padrão 0,90)</label>
                <input value={elem.fatorOferta} onChange={e => updateElem(abaAtiva, 'fatorOferta', e.target.value)}
                  placeholder="0,90" className={cls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Valor líquido (auto)</label>
                <div className="bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 text-sm font-semibold text-blue-800">
                  {res && pn(elem.area) > 0 && pn(elem.valorOferta) > 0
                    ? fmtMoeda(pn(elem.valorOferta) * (pn(elem.fatorOferta) || 0.9))
                    : '—'}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3 mt-3">
              {fatores.local && (
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Fator local (100 = mesmo)</label>
                  <input type="number" value={elem.fatorLocal} onChange={e => updateElem(abaAtiva, 'fatorLocal', e.target.value)}
                    placeholder="100" className={cls} />
                </div>
              )}
              {fatores.andar && (
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Fator andar (100 = neutro)</label>
                  <input type="number" value={elem.fatorAndar} onChange={e => updateElem(abaAtiva, 'fatorAndar', e.target.value)}
                    placeholder="100" className={cls} />
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">
                  Vagas {!fatores.vaga && <span className="text-slate-300 text-[10px]">(apenas informação)</span>}
                </label>
                <input type="number" value={elem.fatorVaga} onChange={e => updateElem(abaAtiva, 'fatorVaga', e.target.value)}
                  placeholder="100" className={cls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">V.U. (auto)</label>
                <div className={`rounded-xl px-3 py-2 text-sm font-semibold border ${
                  res && res.vu > 0 ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-50 border-slate-100 text-slate-400'
                }`}>
                  {res && res.vu > 0 ? `${fmtMoeda(res.vu)}/m²` : '—'}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mt-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Tipo de oferta</label>
                <select value={elem.tipoOferta} onChange={e => updateElem(abaAtiva, 'tipoOferta', e.target.value)} className={clsSelect}>
                  <option>Venda</option>
                  <option>Locação</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Status</label>
                <select value={elem.status} onChange={e => updateElem(abaAtiva, 'status', e.target.value)} className={clsSelect}>
                  <option>Em oferta</option>
                  <option>Transacionado</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Link</label>
                <input value={elem.link} onChange={e => updateElem(abaAtiva, 'link', e.target.value)}
                  placeholder="https://..." className={cls} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Fonte</label>
                <input value={elem.fonte} onChange={e => updateElem(abaAtiva, 'fonte', e.target.value)} className={cls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Telefone</label>
                <input value={elem.telefone} onChange={e => updateElem(abaAtiva, 'telefone', e.target.value)} className={cls} />
              </div>
            </div>

            <div className="mt-3">
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Observações</label>
              <input value={elem.observacoes} onChange={e => updateElem(abaAtiva, 'observacoes', e.target.value)}
                placeholder="Observações sobre o elemento comparativo" className={cls} />
            </div>
          </div>

          {/* Preview dos fatores calculados para este elemento */}
          {res && res.vu > 0 && (
            <div className="border-t border-slate-100 pt-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Fatores calculados — Elemento {abaAtiva + 1}</p>
              <div className="grid grid-cols-7 gap-2 text-center text-xs">
                {[
                  { label: 'F. Área', value: res.fatorArea },
                  { label: 'F. Local', value: res.fatorLocal },
                  { label: 'F. Padrão', value: res.fatorPadrao },
                  { label: 'F. FOC', value: res.fatorFOC },
                  { label: 'F. Andar', value: res.fatorAndar },
                  { label: 'F. Vaga', value: res.fatorVaga },
                  { label: 'Coef. Geral', value: res.coefGeral },
                ].map(({ label, value }) => {
                  const ok = value >= 0.5 && value <= 2.0
                  return (
                    <div key={label} className={`rounded-xl p-2 border ${ok ? 'bg-slate-50 border-slate-200' : 'bg-red-50 border-red-200'}`}>
                      <div className="text-slate-500 mb-1">{label}</div>
                      <div className={`font-semibold ${ok ? 'text-slate-800' : 'text-red-700'}`}>
                        {fmtFator(value)}
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className={`mt-2 rounded-xl px-4 py-2 text-sm font-semibold text-center ${
                res.saneado ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-orange-50 text-orange-800 border border-orange-200'
              }`}>
                V.U. Homogeneizado: {fmtMoeda(res.vuHomog)}/m²
                {!res.saneado && ' · Fora do intervalo de saneamento (±30%)'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Seção de resultados — visível quando há elementos suficientes */}
      {elemsValidos.length >= 3 && (
        <>
          {/* Tabs de resultados */}
          <div className="flex gap-2">
            {[
              { key: 'cddm',  label: 'Cálculo de homogenização' },
              { key: 'homog', label: 'Tabela de homogeneização' },
              { key: 'fund',  label: 'Fundamentação & Precisão' },
            ].map(t => (
              <button key={t.key} type="button"
                onClick={() => setMostrarCalculo(t.key as any)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold border transition ${
                  mostrarCalculo === t.key
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                }`}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Tabela de cálculo de homogeneização detalhada */}
          {mostrarCalculo === 'cddm' && (
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
              <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50">
                <h3 className="text-sm font-semibold text-slate-700">Cálculo de homogeneização por fator</h3>
              </div>

              {/* Fator Área */}
              <div className="px-5 py-4 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                  Fator Área — F = (Área<sub>elem</sub>/Área<sub>av</sub>)<sup>exp</sup> · exp=0,125 se ratio&lt;0,7 ou &gt;1,3; senão 0,25
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-blue-50">
                        <th className="border border-slate-200 px-3 py-2 text-left text-blue-800">Elemento</th>
                        <th className="border border-slate-200 px-3 py-2 text-blue-800">Área (m²)</th>
                        <th className="border border-slate-200 px-3 py-2 text-blue-800">Coeficiente</th>
                        <th className="border border-slate-200 px-3 py-2 text-blue-800">Diferença (R$/m²)</th>
                        <th className="border border-slate-200 px-3 py-2 text-blue-800">V.U. Calculado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultado.elementos.map((r, i) => r.vu > 0 && (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="border border-slate-200 px-3 py-2 font-medium text-slate-700">{i + 1}</td>
                          <td className="border border-slate-200 px-3 py-2 text-center">{fmt(pn(elementos[i].area))}</td>
                          <td className="border border-slate-200 px-3 py-2 text-center">{fmtFator(r.fatorArea)}</td>
                          <td className="border border-slate-200 px-3 py-2 text-center">{fmtMoeda((r.fatorArea - 1) * r.vu)}</td>
                          <td className="border border-slate-200 px-3 py-2 text-center font-medium">{fmtMoeda(r.vu * r.fatorArea)}/m²</td>
                        </tr>
                      ))}
                      <tr className="bg-blue-50 font-semibold">
                        <td colSpan={2} className="border border-slate-200 px-3 py-2 text-blue-800">Avaliando</td>
                        <td colSpan={3} className="border border-slate-200 px-3 py-2 text-center text-blue-800">
                          Área: {fmt(pn(avaliando.area))} m²
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Fator Local */}
              {fatores.local && (
              <div className="px-5 py-4 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Fator Local — F = Local<sub>av</sub> / Local<sub>elem</sub></p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-blue-50">
                        <th className="border border-slate-200 px-3 py-2 text-left text-blue-800">Elemento</th>
                        <th className="border border-slate-200 px-3 py-2 text-blue-800">Local</th>
                        <th className="border border-slate-200 px-3 py-2 text-blue-800">Coeficiente</th>
                        <th className="border border-slate-200 px-3 py-2 text-blue-800">Diferença</th>
                        <th className="border border-slate-200 px-3 py-2 text-blue-800">V.U. Calculado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultado.elementos.map((r, i) => r.vu > 0 && (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="border border-slate-200 px-3 py-2 font-medium">{i + 1}</td>
                          <td className="border border-slate-200 px-3 py-2 text-center">{pn(elementos[i].fatorLocal) || 100}</td>
                          <td className="border border-slate-200 px-3 py-2 text-center">{fmtFator(r.fatorLocal)}</td>
                          <td className="border border-slate-200 px-3 py-2 text-center">{fmtMoeda((r.fatorLocal - 1) * r.vu)}</td>
                          <td className="border border-slate-200 px-3 py-2 text-center font-medium">{fmtMoeda(r.vu * r.fatorLocal)}/m²</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              )}

              {fatores.padrao && (
              <div className="px-5 py-4 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Fator Padrão — F = Pc<sub>av</sub> / Pc<sub>elem</sub></p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-blue-50">
                        <th className="border border-slate-200 px-3 py-2 text-left text-blue-800">Elemento</th>
                        <th className="border border-slate-200 px-3 py-2 text-blue-800">Padrão</th>
                        <th className="border border-slate-200 px-3 py-2 text-blue-800">Pc (elem)</th>
                        <th className="border border-slate-200 px-3 py-2 text-blue-800">Coeficiente</th>
                        <th className="border border-slate-200 px-3 py-2 text-blue-800">Diferença (R$/m²)</th>
                        <th className="border border-slate-200 px-3 py-2 text-blue-800">V.U. Calculado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultado.elementos.map((r, i) => r.vu > 0 && (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="border border-slate-200 px-3 py-2 font-medium">{i + 1}</td>
                          <td className="border border-slate-200 px-3 py-2">{elementos[i].padraoConstrutivo || '—'}</td>
                          <td className="border border-slate-200 px-3 py-2 text-center">{getPadraoData(elementos[i].padraoConstrutivo).Pc || '—'}</td>
                          <td className="border border-slate-200 px-3 py-2 text-center">{fmtFator(r.fatorPadrao)}</td>
                          <td className="border border-slate-200 px-3 py-2 text-center">{fmtMoeda((r.fatorPadrao - 1) * r.vu)}</td>
                          <td className="border border-slate-200 px-3 py-2 text-center font-medium">
                            {fmtMoeda(r.vu * r.fatorPadrao)}/m²
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-blue-50">
                        <td colSpan={2} className="border border-slate-200 px-3 py-2 font-semibold text-blue-800">Avaliando</td>
                        <td className="border border-slate-200 px-3 py-2 text-center text-blue-800">{getPadraoData(avaliando.padraoConstrutivo).Pc}</td>
                        <td colSpan={3} className="border border-slate-200 px-3 py-2 text-blue-800 text-center">{avaliando.padraoConstrutivo || '—'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              )}

              {/* Fator FOC */}
              {fatores.foc && (
              <div className="px-5 py-4 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                  Fator FOC (VEIU) — Ka = 1 - ½×(Ie/Ir + Ie²/Ir²) | K = Ka×(1-Ec) | Foc = R + K×(1-R) | F = Foc<sub>av</sub> / Foc<sub>elem</sub>
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-blue-50">
                        <th className="border border-slate-200 px-3 py-2 text-left text-blue-800">Elem.</th>
                        <th className="border border-slate-200 px-3 py-2 text-blue-800">FOC</th>
                        <th className="border border-slate-200 px-3 py-2 text-blue-800">Ie</th>
                        <th className="border border-slate-200 px-3 py-2 text-blue-800">Ir</th>
                        <th className="border border-slate-200 px-3 py-2 text-blue-800">Ec</th>
                        <th className="border border-slate-200 px-3 py-2 text-blue-800">Ka</th>
                        <th className="border border-slate-200 px-3 py-2 text-blue-800">Foc</th>
                        <th className="border border-slate-200 px-3 py-2 text-blue-800">F.FOC</th>
                        <th className="border border-slate-200 px-3 py-2 text-blue-800">Diferença (R$/m²)</th>
                        <th className="border border-slate-200 px-3 py-2 text-blue-800">V.U. Calc.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultado.elementos.map((r, i) => {
                        if (!r.vu) return null
                        const e = elementos[i]
                        const dados = getPadraoData(e.padraoConstrutivo)
                        const Ec  = getFOCDepr(e.estadoConservacao)
                        const Ie  = pn(e.idade || '0')
                        const Ka  = calcularKa(Ie, dados.Ir)
                        const Foc = calcularFoc(Ie, dados.Ir, dados.R, Ec)
                        return (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="border border-slate-200 px-3 py-2 font-medium">{i + 1}</td>
                            <td className="border border-slate-200 px-3 py-2">{e.estadoConservacao || '—'}</td>
                            <td className="border border-slate-200 px-3 py-2 text-center">{Ie}</td>
                            <td className="border border-slate-200 px-3 py-2 text-center">{dados.Ir}</td>
                            <td className="border border-slate-200 px-3 py-2 text-center">{Ec.toFixed(4)}</td>
                            <td className="border border-slate-200 px-3 py-2 text-center">{Ka.toFixed(4)}</td>
                            <td className="border border-slate-200 px-3 py-2 text-center">{Foc.toFixed(4)}</td>
                            <td className="border border-slate-200 px-3 py-2 text-center">{fmtFator(r.fatorFOC)}</td>
                            <td className="border border-slate-200 px-3 py-2 text-center font-medium">
                              {fmtMoeda((r.fatorFOC - 1) * r.vu)}/m²
                            </td>
                            <td className="border border-slate-200 px-3 py-2 text-center font-medium">
                              {fmtMoeda(r.vu * r.fatorFOC)}/m²
                            </td>
                          </tr>
                        )
                      })}
                      <tr className="bg-blue-50">
                        {(() => {
                          const dav = getPadraoData(avaliando.padraoConstrutivo)
                          const Ec  = getFOCDepr(avaliando.estadoConservacao)
                          const Ie  = pn((avaliando as any).idadeAparente || '0')
                          const Ka  = calcularKa(Ie, dav.Ir)
                          const Foc = calcularFoc(Ie, dav.Ir, dav.R, Ec)
                          return (
                            <>
                              <td colSpan={2} className="border border-slate-200 px-3 py-2 font-semibold text-blue-800">Avaliando</td>
                              <td className="border border-slate-200 px-3 py-2 text-center text-blue-800">{Ie}</td>
                              <td className="border border-slate-200 px-3 py-2 text-center text-blue-800">{dav.Ir}</td>
                              <td className="border border-slate-200 px-3 py-2 text-center text-blue-800">{Ec.toFixed(4)}</td>
                              <td className="border border-slate-200 px-3 py-2 text-center text-blue-800">{Ka.toFixed(4)}</td>
                              <td className="border border-slate-200 px-3 py-2 text-center text-blue-800">{Foc.toFixed(4)}</td>
                              <td colSpan={2} className="border border-slate-200 px-3 py-2 text-center text-blue-800">
                                {avaliando.estadoConservacao ? FOC_LABEL[avaliando.estadoConservacao] : '—'}
                              </td>
                            </>
                          )
                        })()}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              )}

              {/* Fator Andar */}
              {fatores.andar && (
              <div className="px-5 py-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Fator Andar — F = Andar<sub>av</sub> / Andar<sub>elem</sub></p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-blue-50">
                        <th className="border border-slate-200 px-3 py-2 text-left text-blue-800">Elemento</th>
                        <th className="border border-slate-200 px-3 py-2 text-blue-800">Andar</th>
                        <th className="border border-slate-200 px-3 py-2 text-blue-800">Coeficiente</th>
                        <th className="border border-slate-200 px-3 py-2 text-blue-800">Diferença</th>
                        <th className="border border-slate-200 px-3 py-2 text-blue-800">V.U. Calculado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultado.elementos.map((r, i) => r.vu > 0 && (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="border border-slate-200 px-3 py-2 font-medium">{i + 1}</td>
                          <td className="border border-slate-200 px-3 py-2 text-center">{pn(elementos[i].fatorAndar) || 100}</td>
                          <td className="border border-slate-200 px-3 py-2 text-center">{fmtFator(r.fatorAndar)}</td>
                          <td className="border border-slate-200 px-3 py-2 text-center">{fmtMoeda((r.fatorAndar - 1) * r.vu)}</td>
                          <td className="border border-slate-200 px-3 py-2 text-center font-medium">
                            {fmtMoeda(r.vu * r.fatorAndar)}/m²
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              )}
            </div>
          )}

          {/* Tabela de homogeneização consolidada */}
          {mostrarCalculo === 'homog' && (
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
              <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50">
                <h3 className="text-sm font-semibold text-slate-700">Tabela de homogeneização</h3>
              </div>
              <div className="p-5 space-y-5">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-blue-50">
                        <th className="border border-slate-200 px-3 py-2 text-blue-800">Elem.</th>
                        <th className="border border-slate-200 px-3 py-2 text-blue-800">V.U. (R$/m²)</th>
                        <th className="border border-slate-200 px-3 py-2 text-blue-800">F. Área</th>
                        {fatores.local && <th className="border border-slate-200 px-3 py-2 text-blue-800">F. Local</th>}
                        {fatores.padrao && <th className="border border-slate-200 px-3 py-2 text-blue-800">F. Padrão</th>}
                        {fatores.foc && <th className="border border-slate-200 px-3 py-2 text-blue-800">F. FOC</th>}
                        {fatores.andar && <th className="border border-slate-200 px-3 py-2 text-blue-800">F. Andar</th>}
                        {fatores.vaga && <th className="border border-slate-200 px-3 py-2 text-blue-800">F. Vaga</th>}
                        {!fatores.vaga && <th className="border border-slate-200 px-3 py-2 text-slate-300">Vagas</th>}
                        <th className="border border-slate-200 px-3 py-2 text-blue-800">Coef. Geral</th>
                        <th className="border border-slate-200 px-3 py-2 text-blue-800">V.U. Hom.</th>
                        <th className="border border-slate-200 px-3 py-2 text-blue-800">Saneado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultado.elementos.map((r, i) => r.vu > 0 && (
                        <tr key={i} className={!r.saneado ? 'bg-orange-50' : 'hover:bg-slate-50'}>
                          <td className="border border-slate-200 px-3 py-2 text-center font-medium">{i + 1}</td>
                          <td className="border border-slate-200 px-3 py-2 text-right">{fmtMoeda(r.vu)}</td>
                          <td className="border border-slate-200 px-3 py-2 text-center">{fmt(r.fatorArea, 4)}</td>
                          {fatores.local && <td className="border border-slate-200 px-3 py-2 text-center">{fmt(r.fatorLocal, 4)}</td>}
                          {fatores.padrao && <td className="border border-slate-200 px-3 py-2 text-center">{fmt(r.fatorPadrao, 4)}</td>}
                          {fatores.foc && <td className="border border-slate-200 px-3 py-2 text-center">{fmt(r.fatorFOC, 4)}</td>}
                          {fatores.andar && <td className="border border-slate-200 px-3 py-2 text-center">{fmt(r.fatorAndar, 4)}</td>}
                          {fatores.vaga
                            ? <td className="border border-slate-200 px-3 py-2 text-center">{fmt(r.fatorVaga, 4)}</td>
                            : <td className="border border-slate-200 px-3 py-2 text-center text-slate-300">{fmt(r.fatorVaga, 4)}</td>
                          }
                          <td className={`border border-slate-200 px-3 py-2 text-center font-semibold ${
                            r.coefGeral < 0.5 || r.coefGeral > 2.0 ? 'text-red-700' : 'text-slate-700'
                          }`}>{fmt(r.coefGeral, 4)}</td>
                          <td className="border border-slate-200 px-3 py-2 text-right font-semibold">{fmtMoeda(r.vuHomog)}</td>
                          <td className="border border-slate-200 px-3 py-2 text-center">
                            {r.saneado
                              ? <span className="text-emerald-700 font-semibold">✓</span>
                              : <span className="text-orange-600 font-semibold">✗</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-100 font-semibold">
                        <td colSpan={9} className="border border-slate-200 px-3 py-2 text-right text-slate-700">Média saneada</td>
                        <td className="border border-slate-200 px-3 py-2 text-right text-blue-800 text-sm">
                          {fmtMoeda(resultado.mediaSaneada)}/m²
                        </td>
                        <td className="border border-slate-200" />
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Memorial de cálculos */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Memorial de cálculos</p>
                    <div className="space-y-1.5 text-xs">
                      {[
                        ['Média saneada', `${fmtMoeda(resultado.mediaSaneada)}/m²`],
                        ['Limite superior (+30%)', `${fmtMoeda(resultado.limiteInf30)}/m²`],
                        ['Limite inferior (-30%)',  `${fmtMoeda(resultado.limiteInf30)}/m²`],
                        ['Desvio padrão', fmt(resultado.desvioPadrao, 2)],
                        ['Coef. de variação', `${fmt(resultado.coefVariacao, 2)}%`],
                        ['Total elementos saneados', `${elemsValidos.filter(r => r.saneado).length}`],
                        ['T de Student', fmt(resultado.tStudent, 3)],
                        ['Intervalo de confiança', `${fmt(resultado.intervaloConfianca, 2)}%`],
                        ['Limite superior IC 80%', `${fmtMoeda(resultado.limiteSuperior)}/m²`],
                        ['Limite inferior IC 80%', `${fmtMoeda(resultado.limiteInferior)}/m²`],
                      ].map(([label, value]) => (
                        <div key={label} className="flex justify-between py-1 border-b border-slate-100 last:border-0">
                          <span className="text-slate-500">{label}</span>
                          <span className="font-semibold text-slate-800">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Valor do imóvel</p>
                    <div className="space-y-2 text-xs mb-4">
                      {[
                        ['Mínimo', fmtMoeda(resultado.mediaSaneada * pn(avaliando.area) * 0.97)],
                        ['Médio', fmtMoeda(resultado.mediaSaneada * pn(avaliando.area))],
                        ['Máximo', fmtMoeda(resultado.mediaSaneada * pn(avaliando.area) * 1.03)],
                        ['Limite inferior (−30%)', fmtMoeda(resultado.limiteInf30 * pn(avaliando.area))],
                        ['Limite superior (+30%)', fmtMoeda(resultado.limiteSup30 * pn(avaliando.area))],
                      ].map(([l, v]) => (
                        <div key={l} className="flex justify-between py-1 border-b border-slate-100 last:border-0">
                          <span className="text-slate-500">{l}</span>
                          <span className="font-semibold text-slate-800">{v}</span>
                        </div>
                      ))}
                    </div>
                    <div className="bg-blue-700 rounded-xl p-3 text-center">
                      <p className="text-xs text-blue-200 mb-1 font-medium uppercase tracking-wide">Valor unitário homogeneizado</p>
                      <p className="text-lg font-semibold text-white">{fmtMoeda(resultado.mediaSaneada)}/m²</p>
                    </div>
                  </div>
                </div>

                {/* Gráfico Resíduos Relativos */}
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Resíduos relativos (%)</p>
                  <GraficoResiduos resultado={resultado} />
                </div>

                {/* Gráfico Scatter */}
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">V.U. observado × V.U. calculado</p>
                  <GraficoScatter resultado={resultado} />
                </div>
              </div>
            </div>
          )}

          {/* Fundamentação e Precisão */}
          {mostrarCalculo === 'fund' && (
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
              <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50">
                <h3 className="text-sm font-semibold text-slate-700">Grau de fundamentação e precisão — NBR 14653-2</h3>
              </div>
              <div className="p-5 space-y-5">
                {/* Grau de fundamentação */}
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                    Grau de fundamentação — tratamento por fatores (avaliação do imóvel)
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-blue-50">
                          <th className="border border-slate-200 px-3 py-2 w-12 text-blue-800">Item</th>
                          <th className="border border-slate-200 px-3 py-2 text-left text-blue-800">Descrição</th>
                          <th className="border border-slate-200 px-3 py-2 text-blue-800 w-28">III</th>
                          <th className="border border-slate-200 px-3 py-2 text-blue-800 w-28">II</th>
                          <th className="border border-slate-200 px-3 py-2 text-blue-800 w-28">I</th>
                          <th className="border border-slate-200 px-3 py-2 text-blue-800 w-20">Pontuação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          {
                            item: 1,
                            desc: 'Caracterização do imóvel avaliando',
                            III: 'Completa quanto a todos os fatores analisados',
                            II: 'Completa quanto aos fatores utilizados no tratamento',
                            I: 'Adoção de situação paradigma',
                            pontos: 2,
                          },
                          {
                            item: 2,
                            desc: 'Quantidade mínima de dados de mercado efetivamente utilizados',
                            III: '12',
                            II: '5',
                            I: '3',
                            pontos: elemsValidos.length >= 12 ? 3 : elemsValidos.length >= 5 ? 2 : 1,
                            auto: true,
                          },
                          {
                            item: 3,
                            desc: 'Identificação dos dados de mercado',
                            III: 'Informações de todas as características com foto e características observadas',
                            II: 'Informações relativas a todas as características dos dados analisados',
                            I: 'Informações relativas a características dos dados correspondentes aos fatores utilizados',
                            pontos: 2,
                          },
                          {
                            item: 4,
                            desc: 'Intervalo admissível de ajuste para o conjunto de fatores',
                            III: '0,80 a 1,25',
                            II: '0,50 a 2,00',
                            I: '0,40 a 2,50',
                            pontos: (() => {
                              const coefs = elemsValidos.map(r => r.coefGeral)
                              if (coefs.every(c => c >= 0.8 && c <= 1.25)) return 3
                              if (coefs.every(c => c >= 0.5 && c <= 2.0)) return 2
                              if (coefs.every(c => c >= 0.4 && c <= 2.5)) return 1
                              return 1
                            })(),
                            auto: true,
                          },
                        ].map(row => {
                          const grau = row.pontos >= 3 ? 'III' : row.pontos >= 2 ? 'II' : 'I'
                          return (
                            <tr key={row.item} className="hover:bg-slate-50">
                              <td className="border border-slate-200 px-3 py-2 text-center font-semibold text-slate-700">{row.item}</td>
                              <td className="border border-slate-200 px-3 py-2">{row.desc}</td>
                              {(['III', 'II', 'I'] as const).map(g => (
                                <td key={g} className={`border border-slate-200 px-3 py-2 text-center text-xs ${
                                  grau === g ? 'bg-blue-100 font-semibold text-blue-800' : ''
                                }`}>
                                  {(row as any)[g]}
                                  {grau === g && row.auto && (
                                    <div className="mt-0.5 text-[10px] text-blue-600 font-medium">← auto</div>
                                  )}
                                </td>
                              ))}
                              <td className="border border-slate-200 px-3 py-2 text-center font-semibold text-blue-800">{row.pontos}</td>
                            </tr>
                          )
                        })}
                        <tr className="bg-slate-100 font-semibold">
                          <td colSpan={5} className="border border-slate-200 px-3 py-2 text-right text-slate-700">Somatória</td>
                          <td className="border border-slate-200 px-3 py-2 text-center text-blue-800 text-sm">
                            {2 + (elemsValidos.length >= 12 ? 3 : elemsValidos.length >= 5 ? 2 : 1) + 2 + (() => {
                              const coefs = elemsValidos.map(r => r.coefGeral)
                              if (coefs.every(c => c >= 0.8 && c <= 1.25)) return 3
                              if (coefs.every(c => c >= 0.5 && c <= 2.0)) return 2
                              return 1
                            })()}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Enquadramento */}
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100">
                          <th className="border border-slate-200 px-3 py-2 text-slate-700">Graus</th>
                          <th className="border border-slate-200 px-3 py-2 text-slate-700">III</th>
                          <th className="border border-slate-200 px-3 py-2 text-slate-700">II</th>
                          <th className="border border-slate-200 px-3 py-2 text-slate-700">I</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border border-slate-200 px-3 py-2 font-semibold">Pontos mínimos</td>
                          <td className="border border-slate-200 px-3 py-2 text-center">10</td>
                          <td className="border border-slate-200 px-3 py-2 text-center">6</td>
                          <td className="border border-slate-200 px-3 py-2 text-center">4</td>
                        </tr>
                        <tr>
                          <td className="border border-slate-200 px-3 py-2 font-semibold">Itens obrigatórios</td>
                          <td className="border border-slate-200 px-3 py-2 text-center">Itens 2 e 4 no grau III, demais no mínimo no grau II</td>
                          <td className="border border-slate-200 px-3 py-2 text-center">Itens 2 e 4 no grau II, demais no mínimo no grau I</td>
                          <td className="border border-slate-200 px-3 py-2 text-center">Todos no mínimo no grau I</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Grau de Precisão */}
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Grau de precisão</p>
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-blue-50">
                        <th className="border border-slate-200 px-3 py-2 text-left text-blue-800">Descrição</th>
                        <th className="border border-slate-200 px-3 py-2 text-blue-800 w-24">III</th>
                        <th className="border border-slate-200 px-3 py-2 text-blue-800 w-24">II</th>
                        <th className="border border-slate-200 px-3 py-2 text-blue-800 w-24">I</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-slate-200 px-3 py-2">
                          Amplitude do intervalo de confiança de 80% em torno da estimativa de tendência central
                        </td>
                        {(['III', 'II', 'I'] as const).map(g => (
                          <td key={g} className={`border border-slate-200 px-3 py-2 text-center ${
                            resultado.grauPrecisao === g ? 'bg-blue-100 font-semibold text-blue-800' : ''
                          }`}>
                            {g === 'III' ? '≤ 30%' : g === 'II' ? '≤ 40%' : '≤ 50%'}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Badges de resultado */}
                <div className="flex gap-4">
                  <div className="flex-1 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-center">
                    <p className="text-xs text-blue-600 font-semibold uppercase tracking-wide mb-1">Enquadramento</p>
                    <p className="text-3xl font-semibold text-blue-700">II</p>
                    <p className="text-xs text-blue-500 mt-1">Grau de fundamentação</p>
                  </div>
                  <div className="flex-1 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center">
                    <p className="text-xs text-emerald-600 font-semibold uppercase tracking-wide mb-1">Precisão</p>
                    <p className="text-3xl font-semibold text-emerald-700">{resultado.grauPrecisao}</p>
                    <p className="text-xs text-emerald-500 mt-1">IC: {fmt(resultado.intervaloConfianca, 2)}%</p>
                  </div>
                  <div className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
                    <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-1">Norma</p>
                    <p className="text-sm font-semibold text-slate-700 mt-1">ENTRE 0,5 E 2,0</p>
                    <p className="text-xs text-slate-400 mt-1">Intervalo admissível</p>
                  </div>
                </div>

                {resultado.grauPrecisao === '-' && (
                  <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
                    ⚠ Quando a amplitude do intervalo de confiança ultrapassar 50% não há classificação do resultado quanto à precisão e é necessária justificativa com base no diagnóstico do mercado. (ABNT 14653-2 - 2011 - Item 13.4)
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {elemsValidos.length < 3 && elemsValidos.length > 0 && (
        <div className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800">
          Preencha pelo menos 3 elementos comparativos com área e valor de oferta para visualizar os cálculos.
          ({elemsValidos.length}/3 preenchidos)
        </div>
      )}

    </div>
  )
}
