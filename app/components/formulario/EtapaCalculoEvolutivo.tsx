'use client'
import React, { useState, useMemo, useEffect } from 'react'

// ─── Tabelas (idênticas ao EtapaCalculoCDDM) ─────────────────────────────────
const FOC_DEPR: Record<string, number> = {
  A:0, B:0.0032, C:0.0252, D:0.0809, E:0.1810, F:0.3320, G:0.5260, H:0.7520, I:1.0000,
}
const FOC_LABEL: Record<string, string> = {
  A:'A – Novo', B:'B – Entre novo e regular', C:'C – Regular',
  D:'D – Entre regular e reparos simples', E:'E – Reparos simples',
  F:'F – Entre reparos simples e importantes', G:'G – Reparos importantes',
  H:'H – Entre reparos importantes e sem valor', I:'I – Sem valor',
}
const PADRAO_TABLE: Record<string, { Pc: number; Ir: number; R: number }> = {
  'GALPÃO | Econômico -':{ Pc:0.5180,Ir:60,R:0.2 },'GALPÃO | Econômico':{ Pc:0.6090,Ir:60,R:0.2 },
  'GALPÃO | Econômico +':{ Pc:0.7000,Ir:60,R:0.2 },'GALPÃO | Simples -':{ Pc:0.9820,Ir:60,R:0.2 },
  'GALPÃO | Simples':{ Pc:1.1250,Ir:60,R:0.2 },'GALPÃO | Simples +':{ Pc:1.2680,Ir:60,R:0.2 },
  'GALPÃO | Médio -':{ Pc:1.3680,Ir:80,R:0.2 },'GALPÃO | Médio':{ Pc:1.6590,Ir:80,R:0.2 },
  'GALPÃO | Médio +':{ Pc:1.8710,Ir:80,R:0.2 },'GALPÃO | Superior -':{ Pc:1.8720,Ir:80,R:0.2 },
  'COBERTURA | Simples -':{ Pc:0.0710,Ir:20,R:0.1 },'COBERTURA | Simples':{ Pc:0.1420,Ir:20,R:0.1 },
  'COBERTURA | Simples +':{ Pc:0.2130,Ir:20,R:0.1 },'COBERTURA | Médio -':{ Pc:0.2290,Ir:20,R:0.1 },
  'COBERTURA | Médio':{ Pc:0.2930,Ir:20,R:0.1 },'COBERTURA | Médio +':{ Pc:0.3570,Ir:20,R:0.1 },
  'COBERTURA | Superior -':{ Pc:0.3330,Ir:30,R:0.1 },'COBERTURA | Superior':{ Pc:0.4860,Ir:30,R:0.1 },
  'COBERTURA | Superior +':{ Pc:0.6390,Ir:30,R:0.1 },
  'Escritório Econômico -':{ Pc:2.0810,Ir:70,R:0.2 },'Escritório Econômico':{ Pc:2.3130,Ir:70,R:0.2 },
  'Escritório Econômico +':{ Pc:2.5440,Ir:70,R:0.2 },'Escritório Simples s/Elevador -':{ Pc:3.3780,Ir:70,R:0.2 },
  'Escritório Simples s/Elevador':{ Pc:3.7530,Ir:70,R:0.2 },'Escritório Simples s/Elevador +':{ Pc:4.0130,Ir:70,R:0.2 },
  'Escritório Simples c/Elevador -':{ Pc:3.7420,Ir:70,R:0.2 },'Escritório Simples c/Elevador':{ Pc:4.1580,Ir:70,R:0.2 },
  'Escritório Simples c/Elevador +':{ Pc:4.5730,Ir:70,R:0.2 },'Escritório Médio s/Elevador -':{ Pc:4.0140,Ir:60,R:0.2 },
  'Escritório Médio s/Elevador':{ Pc:4.3300,Ir:60,R:0.2 },'Escritório Médio c/Elevador':{ Pc:5.2730,Ir:60,R:0.2 },
  'Escritório Superior s/Elevador':{ Pc:5.7840,Ir:60,R:0.2 },'Escritório Superior c/Elevador':{ Pc:6.3710,Ir:60,R:0.2 },
  'Escritório Fino':{ Pc:7.9290,Ir:50,R:0.2 },'Escritório Luxo':{ Pc:9.9350,Ir:50,R:0.2 },
  'Apto. Econômico':{ Pc:0.8100,Ir:60,R:0.2 },'Apto. Simples s/elev.':{ Pc:1.0320,Ir:60,R:0.2 },
  'Apto. Simples c/elev.':{ Pc:1.4700,Ir:60,R:0.2 },'Apto. Médio s/elev.':{ Pc:1.7460,Ir:60,R:0.2 },
  'Apto. Médio c/elev.':{ Pc:1.9260,Ir:60,R:0.2 },'Apto. Superior c/elev.':{ Pc:2.4060,Ir:60,R:0.2 },
  'Apto. Fino':{ Pc:3.0660,Ir:50,R:0.2 },'Apto. Luxo':{ Pc:4.3280,Ir:50,R:0.2 },
  'Casa Padrão Simples Médio':{ Pc:1.0560,Ir:70,R:0.2 },'Casa Padrão Médio Médio':{ Pc:1.3860,Ir:70,R:0.2 },
  'Casa Padrão Superior Médio':{ Pc:1.7760,Ir:60,R:0.2 },'Casa Padrão Fino Médio':{ Pc:2.4360,Ir:60,R:0.2 },
  'Casa Padrão Luxo':{ Pc:3.3360,Ir:60,R:0.2 },
}
const PADRAO_GRUPOS = [
  { grupo: 'Galpão',     prefixos: ['GALPÃO |'] },
  { grupo: 'Cobertura',  prefixos: ['COBERTURA |'] },
  { grupo: 'Escritório', prefixos: ['Escritório'] },
  { grupo: 'Apartamento',prefixos: ['Apto.'] },
  { grupo: 'Casa',       prefixos: ['Casa Padrão'] },
]
const T_STUDENT: Record<number, number> = {
  1:3.078, 2:1.886, 3:1.638, 4:1.533, 5:1.476, 6:1.440, 7:1.415, 8:1.397, 9:1.383, 10:1.372, 11:1.363
}

// ─── Tipos ────────────────────────────────────────────────────────────────────
type ElementoEv = {
  id: number; tipo: string; logradouro: string; bairro: string; cidade: string; uf: string
  coordenadas: string; distancia: string; areaTerreno: string; areaConstruida: string
  valorOferta: string; benfElem: string; fatorOferta: string
  fatorLocal: string; fatorTopografia: string; fatorVisibilidade: string
  fonte: string; telefone: string; link: string; data: string; tipoOferta: string; observacoes: string
}
type BenfeitoriaCUB = {
  id: number; descricao: string; padrao: string
  pc: string   // Coef. Padrão — pré-preenchido da tabela, editável
  ir: string   // Vida referencial (anos) — pré-preenchido da tabela, editável
  r: string    // Valor residual — pré-preenchido da tabela, editável
  area: string; idadeReal: string; estadoConservacao: string
}
type Props = {
  form: any
  setForm?: React.Dispatch<React.SetStateAction<any>>
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function pn(s: any): number {
  if (s == null || s === '') return 0
  if (typeof s === 'number') return isFinite(s) ? s : 0
  return parseFloat(String(s).replace(/[R$\s.]/g, '').replace(',', '.')) || 0
}
// Para o CUB: aceita vírgula OU ponto decimal (ex: 2111,61 ou 2111.61)
// Detecta se há vírgula → formato BR; senão trata o último ponto como decimal
function pnCub(s: any): number {
  if (s == null || s === '') return 0
  if (typeof s === 'number') return isFinite(s) ? s : 0
  const str = String(s).replace(/[R$\s]/g, '').trim()
  if (str.includes(',')) {
    // Formato BR: pontos são separadores de milhar, vírgula é decimal
    return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0
  }
  // Sem vírgula: pontos são decimais (ex: 2111.61) ou sem decimal (ex: 2111)
  return parseFloat(str) || 0
}
function fmt(v: number, dec = 2) {
  if (!isFinite(v)||isNaN(v)) return '-'
  return v.toLocaleString('pt-BR',{minimumFractionDigits:dec,maximumFractionDigits:dec})
}
function fmtM(v: number) {
  if (!isFinite(v)||isNaN(v)) return '-'
  return v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})
}
function fmtF(v: number) {
  if (!isFinite(v)||isNaN(v)) return '-'
  return v.toLocaleString('pt-BR',{minimumFractionDigits:4,maximumFractionDigits:4})
}
function round3(v: number) { return Math.round(v/0.001)*0.001 }
// Formata número em padrão BR ao sair do campo (onBlur)
function fmtBR(s: any, dec = 2): string {
  const n = pn(s)
  if (!n || !isFinite(n)) return String(s ?? '')
  return n.toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec })
}
function getPadrao(p: string) { return PADRAO_TABLE[p] ?? { Pc:1, Ir:60, R:0.2 } }
// Ka VEIU: K=(1-0.5*(v+v²)) | Foc=R+K*(1-R)   (fórmulas exatas da planilha)
function calcKaFoc(Ie: number, Ir: number, estadoConserv: string, R: number) {
  const v  = Ir > 0 ? Math.min(Ie/Ir, 1) : 0
  const Ka = Math.max(0, 1 - 0.5*(v + v*v))
  const Ec = FOC_DEPR[estadoConserv] ?? 0
  const K  = (1 - Ec) * Ka
  const Foc = R + K*(1-R)
  return { Ka, Ec, K, Foc }
}

function elemInicial(id: number): ElementoEv {
  return { id, tipo:'Terreno', logradouro:'', bairro:'', cidade:'', uf:'', coordenadas:'',
    distancia:'', areaTerreno:'', areaConstruida:'', valorOferta:'', benfElem:'',
    fatorOferta:'0,9000', fatorLocal:'100,00', fatorTopografia:'100,00', fatorVisibilidade:'100,00',
    fonte:'', telefone:'', link:'', data:'', tipoOferta:'Venda', observacoes:'' }
}

function benfInicial(id: number): BenfeitoriaCUB {
  return { id, descricao:'', padrao:'', pc:'', ir:'', r:'', area:'', idadeReal:'', estadoConservacao:'C' }
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function EtapaCalculoEvolutivo({ form, setForm }: Props) {
  // ─── estado elementos (restaura do snapshot) ─────────────────────────────
  const savedSnap = (form as any)?.dadosCalculoEvolutivo
  const [elementos, setElementos] = useState<ElementoEv[]>(() => {
    // Restaura elementos brutos do snapshot (campos do usuário, não os calculados)
    const saved = savedSnap?.elementos
    if (Array.isArray(saved) && saved.length > 0) {
      // Garante que cada elemento tem todos os campos (compatibilidade com snapshots antigos)
      return saved.map((e: any, i: number) => ({ ...elemInicial(i + 1), ...e }))
    }
    return [1,2,3,4,5].map(elemInicial)
  })
  const [abaAtiva, setAbaAtiva]   = useState(0)
  const [mostrarCalc, setMostrarCalc] = useState<'cddm'|'benf'>('cddm')

  // ─── avaliando (editável) ─────────────────────────────────────────────────
  const [areaAv,    setAreaAv]    = useState<string>(savedSnap?.avaliando?.area     ? String(savedSnap.avaliando.area)     : (form?.areaTerrenoTotal ?? ''))
  const [notaLocal, setNotaLocal] = useState<string>(savedSnap?.avaliando?.notaLocal ? String(savedSnap.avaliando.notaLocal) : (form?.notaLocalAvaliando || '100'))
  const [notaTopo,  setNotaTopo]  = useState<string>(savedSnap?.avaliando?.notaTopo  ? String(savedSnap.avaliando.notaTopo)  : (form?.notaTopografiaAvaliando || '100'))
  const [notaVis,   setNotaVis]   = useState<string>(savedSnap?.avaliando?.notaVis   ? String(savedSnap.avaliando.notaVis)   : (form?.notaVisibilidadeAvaliando || '100'))

  // ─── benfeitorias + CUB ───────────────────────────────────────────────────
  const [cubR8N,       setCubR8N]      = useState<string>(savedSnap?.cubR8N ? String(savedSnap.cubR8N) : '')
  const [benfeitorias, setBenfeitorias] = useState<BenfeitoriaCUB[]>(() => {
    const saved = savedSnap?.benfeitoriasInput
    if (Array.isArray(saved) && saved.length > 0) {
      return saved.map((b: any, i: number) => {
        const base: BenfeitoriaCUB = { ...benfInicial(i + 1), ...b }
        // Pré-preenche pc/ir/r da tabela Antigo quando estão ausentes ou com valor inválido
        if (base.padrao) {
          const t = getPadrao(base.padrao)
          const isBlank = (v: string) => !v || v === '0' || v === ''
          if (isBlank(base.pc)) base.pc = t.Pc.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })
          if (isBlank(base.ir)) base.ir = String(t.Ir)
          if (isBlank(base.r))  base.r  = t.R.toLocaleString('pt-BR',  { minimumFractionDigits: 4, maximumFractionDigits: 4 })
        }
        return base
      })
    }
    return []
  })

  function updateElem(idx: number, campo: keyof ElementoEv, val: string) {
    setElementos(prev => prev.map((e,i) => i===idx ? {...e,[campo]:val} : e))
  }
  function addElem() {
    if (elementos.length >= 12) return
    setElementos(prev => [...prev, elemInicial(prev.length+1)])
    setAbaAtiva(elementos.length)
  }
  function removeElem(idx: number) {
    if (elementos.length <= 3) return
    const n = elementos.filter((_,i)=>i!==idx).map((e,i)=>({...e,id:i+1}))
    setElementos(n); setAbaAtiva(Math.min(abaAtiva, n.length-1))
  }
  function addBenf() { setBenfeitorias(prev => [...prev, benfInicial(prev.length+1)]) }
  function removeBenf(idx: number) { setBenfeitorias(prev => prev.filter((_,i)=>i!==idx).map((b,i)=>({...b,id:i+1}))) }
  function updateBenf(idx: number, campo: keyof BenfeitoriaCUB, val: string) {
    setBenfeitorias(prev => prev.map((b,i)=>i===idx ? {...b,[campo]:val} : b))
  }
  // Atualização ATÔMICA ao selecionar padrão — evita condições de corrida com múltiplos setState
  function selecionarPadrao(idx: number, padrao: string) {
    setBenfeitorias(prev => prev.map((b, i) => {
      if (i !== idx) return b
      if (!padrao) return { ...b, padrao: '' }
      const t = getPadrao(padrao)
      return {
        ...b,
        padrao,
        pc: t.Pc.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 }),
        ir: String(t.Ir),
        r:  t.R.toLocaleString('pt-BR',  { minimumFractionDigits: 4, maximumFractionDigits: 4 }),
      }
    }))
  }

  // ─── Motor de cálculo: terreno ────────────────────────────────────────────
  const resultado = useMemo(() => {
    const av = pn(areaAv)
    const nLocal = pn(notaLocal) || 100
    const nTopo  = pn(notaTopo)  || 100
    const nVis   = pn(notaVis)   || 100

    const res = elementos.map(e => {
      const aE  = pn(e.areaTerreno)
      const vO  = pn(e.valorOferta)
      const fO  = pn(e.fatorOferta) || 1
      const bE  = e.tipo === 'Terreno c/ benfeitoria' ? pn(e.benfElem) : 0
      if (aE <= 0 || vO <= 0) return null

      // VU terreno (fórmula planilha: F12 = (valorOferta×fOferta - benf) / área)
      const vu = (vO * fO - bE) / aE
      if (vu <= 0) return null

      // Fator Área — fórmula exata da planilha: ratio = elem/av (C5/C53)
      const ratio = av > 0 ? aE/av : 1
      const fA    = round3(Math.pow(ratio, (ratio<0.7||ratio>1.3) ? 0.125 : 0.25))

      // Fator Local, Topografia, Visibilidade: Cav/Celem
      const fL = (pn(e.fatorLocal)||100) > 0 ? nLocal/(pn(e.fatorLocal)||100) : 1
      const fT = (pn(e.fatorTopografia)||100) > 0 ? nTopo/(pn(e.fatorTopografia)||100) : 1
      const fV = (pn(e.fatorVisibilidade)||100) > 0 ? nVis/(pn(e.fatorVisibilidade)||100) : 1

      // Somatória: E42 = VU × (1+(fA-1)+(fL-1)+(fT-1)+(fV-1))
      const soma   = vu * (1 + (fA-1) + (fL-1) + (fT-1) + (fV-1))
      const coef   = soma / vu

      // Saneamento IBAPE: coef entre 0,5 e 2,0
      const valido = coef >= 0.5 && coef <= 2.0

      return { vu, fA, fL, fT, fV, soma, coef, valido }
    })

    const validos = res.filter((r): r is NonNullable<typeof r> => r !== null && r.valido)
    const N = validos.length
    if (N < 2) return { elementos: res, N, media: 0, desvio: 0, T: 0, resultIC: 0,
      minimo:0, medio:0, maximo:0, lim30inf:0, lim30sup:0, grauPrecisao:'—',
      intervaloConfianca:0, valorTerreno:0 }

    // Estatísticas sobre as somatórias (igual à planilha: média E42:E46)
    const somas     = validos.map(r => r.soma)
    const media     = somas.reduce((a,b)=>a+b,0) / N
    const devSq     = somas.map(s=>(s-media)**2).reduce((a,b)=>a+b,0)
    const desvio    = Math.sqrt(devSq / (N-1))   // STDEV.S

    // T(N-1) e IC: C56 = C53 × C54 / (C52)^0.5  → T×S/√(N-1)
    const df        = N - 1
    const T         = T_STUDENT[df] ?? T_STUDENT[Math.min(df, 11)]
    const resultIC  = T * desvio / Math.sqrt(df)

    const minimo    = media - resultIC  // F60
    const maximo    = media + resultIC  // F62
    const lim30inf  = media * 0.7       // F63
    const lim30sup  = media * 1.3       // F64

    // Grau Precisão: H52+H54 amplitude %  (comparar min-med e med-max)
    const H52 = minimo > 0 ? ((media/minimo)-1)*100 : 0
    const H54 = media > 0  ? ((maximo/media)-1)*100  : 0
    const H56 = H52 + H54
    const grauPrecisao = H56 < 30 ? 'III' : H56 <= 40 ? 'II' : H56 < 50 ? 'I' : 'Inconsistente'

    const valorTerreno = media * (pn(areaAv) || 0)

    return { elementos: res, N, media, desvio, T, resultIC, minimo, medio: media,
      maximo, lim30inf, lim30sup, grauPrecisao, intervaloConfianca: H56, valorTerreno }
  }, [elementos, areaAv, notaLocal, notaTopo, notaVis])

  // ─── Motor de cálculo: benfeitorias ──────────────────────────────────────
  const calcBenfeitorias = useMemo(() => {
    const cub = pnCub(cubR8N)
    return benfeitorias.map(b => {
      if (!b.area || !b.idadeReal) return null
      // Usa valores editáveis do usuário; fallback para tabela se não preenchido
      const tabela = getPadrao(b.padrao)
      const Pc  = pn(b.pc)  || tabela.Pc
      const Ir  = pn(b.ir)  || tabela.Ir
      const R   = pn(b.r)   || tabela.R
      const area = pn(b.area)
      const Ie   = pn(b.idadeReal)
      const pctVida = Ir > 0 ? Math.min(Ie/Ir, 1) * 100 : 0
      const { Ka, Ec, K, Foc } = calcKaFoc(Ie, Ir, b.estadoConservacao, R)
      // P = ROUND(CUB × Pc × Área × Foc, 2)  — fórmula exata da planilha
      const valor = Math.round(cub * Pc * area * Foc * 100) / 100
      return { Pc, Ir, R, pctVida, Ka, Ec, K, Foc, valor }
    })
  }, [benfeitorias, cubR8N])

  const totalBenfeitorias = useMemo(() =>
    calcBenfeitorias.reduce((s, b) => s + (b?.valor ?? 0), 0),
    [calcBenfeitorias]
  )

  // ─── Valor Final ──────────────────────────────────────────────────────────
  const valorFinal     = resultado.valorTerreno + totalBenfeitorias
  const valorArredond  = Math.round(valorFinal / 1000) * 1000

  // ─── Snapshot → form: salva SEMPRE (inclusive dados parciais) ───────────
  useEffect(() => {
    if (!setForm) return
    const snap = {
      // campos do avaliando como string para restaurar nos inputs
      avaliando: {
        area: areaAv, notaLocal, notaTopo, notaVis,
      },
      cubR8N,
      // elementos brutos (com todos os campos preenchidos pelo usuário)
      elementos,
      benfeitoriasInput: benfeitorias,
      // resultado calculado (pode estar zerado se N < 2)
      benfeitorias: benfeitorias.map((b, i) => ({ ...b, ...(calcBenfeitorias[i] ?? {}) })),
      resultado: resultado.N >= 2 ? {
        N: resultado.N, media: resultado.media, desvio: resultado.desvio,
        T: resultado.T, resultIC: resultado.resultIC, minimo: resultado.minimo, maximo: resultado.maximo,
        lim30inf: resultado.lim30inf, lim30sup: resultado.lim30sup,
        grauPrecisao: resultado.grauPrecisao, intervaloConfianca: resultado.intervaloConfianca,
      } : null,
      valorTerreno: resultado.valorTerreno,
      valorBenfeitorias: totalBenfeitorias,
      valorFinal, valorArredondado: valorArredond,
    }
    setForm((prev: any) => ({
      ...prev,
      dadosCalculoEvolutivo: snap,
      // só preenche valorTerreno/Benfeitorias se há resultado válido
      ...(resultado.valorTerreno > 0 && {
        valorTerreno: resultado.valorTerreno.toFixed(2).replace('.', ','),
      }),
      ...(totalBenfeitorias > 0 && {
        valorBenfeitorias: totalBenfeitorias.toFixed(2).replace('.', ','),
      }),
    }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elementos, areaAv, notaLocal, notaTopo, notaVis, benfeitorias, cubR8N])

  // ─── Layout auxiliar ─────────────────────────────────────────────────────
  const inp = 'border border-slate-200 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white'
  const lbl = 'text-xs font-medium text-slate-500 block mb-1'
  const tHead = 'bg-blue-50 text-blue-800 text-xs font-medium px-3 py-2 border border-slate-200 text-center'
  const tCell = 'px-3 py-2 border border-slate-200 text-xs text-center text-slate-600'
  const tCellE = 'px-3 py-2 border border-slate-200 text-xs font-medium text-slate-800 text-left'
  const tAv   = 'bg-blue-50 px-3 py-2 border border-slate-200 text-xs text-center font-medium text-blue-800'

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── Tabs Cálculo/Benfeitorias ─────────────────────────────────────── */}
      <div>
        <h2 className="text-2xl font-bold mb-4">10. MÉTODO EVOLUTIVO — Cálculo</h2>
        <div className="flex gap-2 p-1 bg-slate-100 rounded-xl w-fit mb-4">
          {([['cddm','Terreno (CDDM)'],['benf','Benfeitorias + Valor Final']] as const).map(([k,l]) => (
            <button key={k} type="button" onClick={()=>setMostrarCalc(k)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${mostrarCalc===k?'bg-white text-slate-900 shadow-sm':'text-slate-500 hover:text-slate-700'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ABA 1: CDDM TERRENO                                                */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {mostrarCalc === 'cddm' && (
        <div className="space-y-6">

          {/* Card Avaliando */}
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
            <p className="text-xs font-semibold text-blue-800 mb-3 uppercase tracking-wide">
              Dados do avaliando
            </p>
            <div className="grid grid-cols-4 gap-3">
              <div>
                <label className={lbl}>Área terreno (m²)</label>
                <input className={inp} value={areaAv}
                  onChange={e=>setAreaAv(e.target.value)}
                  onBlur={e=>setAreaAv(fmtBR(e.target.value, 2))}
                  placeholder="6.680,00"/>
              </div>
              <div>
                <label className={lbl}>Nota local (100=neutro)</label>
                <input className={inp} value={notaLocal}
                  onChange={e=>setNotaLocal(e.target.value)}
                  onBlur={e=>setNotaLocal(fmtBR(e.target.value, 2))}
                  placeholder="100,00"/>
              </div>
              <div>
                <label className={lbl}>Nota topografia (100=neutro)</label>
                <input className={inp} value={notaTopo}
                  onChange={e=>setNotaTopo(e.target.value)}
                  onBlur={e=>setNotaTopo(fmtBR(e.target.value, 2))}
                  placeholder="100,00"/>
              </div>
              <div>
                <label className={lbl}>Nota visibilidade (100=neutro)</label>
                <input className={inp} value={notaVis}
                  onChange={e=>setNotaVis(e.target.value)}
                  onBlur={e=>setNotaVis(fmtBR(e.target.value, 2))}
                  placeholder="100,00"/>
              </div>
            </div>
          </div>

          {/* Tabs de elementos */}
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div className="flex items-center gap-1 p-3 bg-slate-50 border-b border-slate-200 flex-wrap">
              {elementos.map((e, i) => (
                <button key={e.id} type="button" onClick={()=>setAbaAtiva(i)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${i===abaAtiva?'bg-blue-600 text-white':'bg-white border border-slate-200 text-slate-600 hover:bg-blue-50'}`}>
                  Elem. {String(e.id).padStart(2,'0')}
                  {resultado.elementos[i] && (resultado.elementos[i] as any)?.valido === false &&
                    <span className="ml-1 text-orange-400">⚠</span>}
                </button>
              ))}
              <button type="button" onClick={addElem} disabled={elementos.length>=12}
                className="ml-auto px-3 py-1.5 rounded-lg text-xs border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-40">
                + Adicionar
              </button>
            </div>

            {/* Card do elemento ativo */}
            {(() => {
              const e  = elementos[abaAtiva]
              if (!e) return null
              const up = (c: keyof ElementoEv) => (ev: React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>) => updateElem(abaAtiva, c, ev.target.value)
              const r  = resultado.elementos[abaAtiva]
              const vu = r?.vu ?? 0

              return (
                <div className="p-4 space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div><label className={lbl}>Tipo</label>
                      <select className={inp} value={e.tipo} onChange={up('tipo')}>
                        <option value="Terreno">Terreno (sem benfeitoria)</option>
                        <option value="Terreno c/ benfeitoria">Terreno c/ benfeitoria</option>
                      </select>
                    </div>
                    <div><label className={lbl}>Data</label><input className={inp} type="date" value={e.data} onChange={up('data')}/></div>
                    <div><label className={lbl}>Tipo oferta</label>
                      <select className={inp} value={e.tipoOferta} onChange={up('tipoOferta')}>
                        <option>Venda</option><option>Locação</option>
                      </select>
                    </div>
                    <div className="col-span-2"><label className={lbl}>Logradouro</label><input className={inp} value={e.logradouro} onChange={up('logradouro')}/></div>
                    <div>
                      <label className={lbl}>Distância (km)</label>
                      <input className={inp} value={e.distancia}
                        onChange={up('distancia')}
                        onBlur={ev=>updateElem(abaAtiva,'distancia',fmtBR(ev.target.value,3))}
                        placeholder="0,000"/>
                    </div>
                    <div><label className={lbl}>Bairro</label><input className={inp} value={e.bairro} onChange={up('bairro')}/></div>
                    <div><label className={lbl}>Cidade</label><input className={inp} value={e.cidade} onChange={up('cidade')}/></div>
                    <div><label className={lbl}>UF</label><input className={inp} value={e.uf} onChange={up('uf')}/></div>
                    <div className="col-span-2"><label className={lbl}>Coordenadas geográficas</label><input className={inp} value={e.coordenadas} onChange={up('coordenadas')}/></div>
                    <div><label className={lbl}>Fonte</label><input className={inp} value={e.fonte} onChange={up('fonte')}/></div>
                  </div>

                  <div className="border-t border-slate-100 pt-3">
                    <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Áreas e valores</p>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className={lbl}>Área terreno (m²)</label>
                        <input className={inp} value={e.areaTerreno}
                          onChange={up('areaTerreno')}
                          onBlur={ev=>updateElem(abaAtiva,'areaTerreno',fmtBR(ev.target.value,2))}
                          placeholder="4.000,00"/>
                      </div>
                      <div>
                        <label className={lbl}>Área construída (m²)</label>
                        <input className={inp} value={e.areaConstruida}
                          onChange={up('areaConstruida')}
                          onBlur={ev=>updateElem(abaAtiva,'areaConstruida',fmtBR(ev.target.value,2))}
                          placeholder="0,00"/>
                      </div>
                      {e.tipo === 'Terreno c/ benfeitoria' ? (
                        <div>
                          <label className={lbl}>Valor benfeitorias do elemento (R$)</label>
                          <input className={inp} value={e.benfElem}
                            onChange={up('benfElem')}
                            onBlur={ev=>updateElem(abaAtiva,'benfElem',fmtBR(ev.target.value,2))}
                            placeholder="150.000,00"/>
                          <p className="text-[10px] text-amber-600 mt-1">Será subtraído do valor de oferta antes de calcular o VU</p>
                        </div>
                      ) : (
                        <div>
                          <label className={lbl}>Valor benfeitorias (R$)</label>
                          <input className={inp+' bg-slate-100 text-slate-400 cursor-not-allowed'} value="—" readOnly
                            title="Habilitado apenas para 'Terreno c/ benfeitoria'"/>
                        </div>
                      )}
                      <div>
                        <label className={lbl}>Valor de oferta (R$)</label>
                        <input className={inp} value={e.valorOferta}
                          onChange={up('valorOferta')}
                          onBlur={ev=>updateElem(abaAtiva,'valorOferta',fmtBR(ev.target.value,2))}
                          placeholder="1.500.000,00"/>
                      </div>
                      <div>
                        <label className={lbl}>Fator oferta</label>
                        <input className={inp} value={e.fatorOferta}
                          onChange={up('fatorOferta')}
                          onBlur={ev=>updateElem(abaAtiva,'fatorOferta',fmtBR(ev.target.value,4))}
                          placeholder="0,9000"/>
                      </div>
                      <div><label className={lbl}>V.U. terreno (R$/m²)</label>
                        <input className={inp+' bg-slate-50 text-blue-700 font-semibold'} readOnly
                          value={vu > 0 ? `R$ ${fmt(vu)}/m²` : '—'}/>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-3">
                    <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Fatores do elemento</p>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className={lbl}>Nota local (100=neutro)</label>
                        <input className={inp} value={e.fatorLocal}
                          onChange={up('fatorLocal')}
                          onBlur={ev=>updateElem(abaAtiva,'fatorLocal',fmtBR(ev.target.value,2))}
                          placeholder="100,00"/>
                      </div>
                      <div>
                        <label className={lbl}>Nota topografia (100=neutro)</label>
                        <input className={inp} value={e.fatorTopografia}
                          onChange={up('fatorTopografia')}
                          onBlur={ev=>updateElem(abaAtiva,'fatorTopografia',fmtBR(ev.target.value,2))}
                          placeholder="100,00"/>
                      </div>
                      <div>
                        <label className={lbl}>Nota visibilidade (100=neutro)</label>
                        <input className={inp} value={e.fatorVisibilidade}
                          onChange={up('fatorVisibilidade')}
                          onBlur={ev=>updateElem(abaAtiva,'fatorVisibilidade',fmtBR(ev.target.value,2))}
                          placeholder="100,00"/>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className={lbl}>Telefone</label><input className={inp} value={e.telefone} onChange={up('telefone')}/></div>
                      <div><label className={lbl}>Link</label><input className={inp} value={e.link} onChange={up('link')}/></div>
                      <div className="col-span-2"><label className={lbl}>Observações</label>
                        <textarea className={inp} rows={2} value={e.observacoes}
                          onChange={ev=>updateElem(abaAtiva,'observacoes',ev.target.value)}/></div>
                    </div>
                  </div>

                  {elementos.length > 3 && (
                    <button type="button" onClick={()=>removeElem(abaAtiva)}
                      className="text-xs text-red-500 hover:underline">Remover este elemento</button>
                  )}
                </div>
              )
            })()}
          </div>

          {/* Tabelas de homogeneização */}
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div className="px-5 py-3 bg-blue-600 text-white text-xs font-semibold uppercase tracking-wide">
              Homogeneização — terreno
            </div>

            {/* F.Área */}
            {[
              { label:'Fator Área', sub:'F = (Área\u2091\u2091\u2091\u2098/Área\u2090\u1D65)\u02E3\u02E3\u02E3 · exp=0,125 se ratio&lt;0,7 ou &gt;1,3; senão 0,25', campo:'fA' as const, nomeCampo:'Área (m²)', valCampo:(e:ElementoEv)=>pn(e.areaTerreno)||0 },
              { label:'Fator Local', sub:'F = LOCAL\u2090\u1D65 / LOCAL\u2091\u2091\u2091\u2098', campo:'fL' as const, nomeCampo:'Local', valCampo:(e:ElementoEv)=>pn(e.fatorLocal)||100 },
              { label:'Fator Topografia', sub:'F = TOPO\u2090\u1D65 / TOPO\u2091\u2091\u2091\u2098', campo:'fT' as const, nomeCampo:'Topografia', valCampo:(e:ElementoEv)=>pn(e.fatorTopografia)||100 },
              { label:'Fator Visibilidade', sub:'F = VIS\u2090\u1D65 / VIS\u2091\u2091\u2091\u2098', campo:'fV' as const, nomeCampo:'Visibilidade', valCampo:(e:ElementoEv)=>pn(e.fatorVisibilidade)||100 },
            ].map(({ label, campo, nomeCampo, valCampo }) => (
              <div key={campo} className="px-5 py-4 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{label}</p>
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr>
                      <th className={tHead+' text-left'}>Elem.</th>
                      <th className={tHead}>{nomeCampo}</th>
                      <th className={tHead}>Coeficiente</th>
                      <th className={tHead}>Diferença (R$/m²)</th>
                      <th className={tHead}>V.U. Calculado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {elementos.map((e, i) => {
                      const r = resultado.elementos[i]
                      if (!r) return null
                      const f   = (r as any)[campo] as number
                      const dif = (f - 1) * r.vu
                      return (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className={tCellE}>{i+1}</td>
                          <td className={tCell}>{fmt(valCampo(e))}</td>
                          <td className={tCell}>{fmtF(f)}</td>
                          <td className={tCell}>{dif >= 0 ? '+' : ''}{fmtM(dif)}</td>
                          <td className={tCell+' font-medium'}>{fmtM(r.vu * f)}/m²</td>
                        </tr>
                      )
                    })}
                    <tr>
                      <td className={tAv} colSpan={2}>Avaliando</td>
                      <td className={tAv} colSpan={3}>
                        {campo==='fA' ? `${fmt(pn(areaAv))} m²`
                         : campo==='fL' ? `Nota ${fmt(pn(notaLocal))}`
                         : campo==='fT' ? `Nota ${fmt(pn(notaTopo))}`
                         : `Nota ${fmt(pn(notaVis))}`}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ))}

            {/* Coef. Geral */}
            <div className="px-5 py-4 border-b border-slate-100">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Coeficiente geral (soma aditiva) e estatísticas
              </p>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr>
                    <th className={tHead+' text-left'}>Elem.</th>
                    <th className={tHead}>V.U. s/ fatores</th>
                    <th className={tHead}>Somatória fatores</th>
                    <th className={tHead}>Coef. geral</th>
                    <th className={tHead}>V.U. Homog.</th>
                    <th className={tHead}>IBAPE 0,5–2,0</th>
                  </tr>
                </thead>
                <tbody>
                  {elementos.map((_, i) => {
                    const r = resultado.elementos[i]
                    if (!r) return null
                    const ok = r.valido
                    return (
                      <tr key={i} className={ok ? 'hover:bg-slate-50' : 'bg-orange-50 opacity-60'}>
                        <td className={tCellE+(!ok?' line-through':'')}>{i+1}</td>
                        <td className={tCell}>{fmtM(r.vu)}/m²</td>
                        <td className={tCell}>{fmtM(r.soma)}</td>
                        <td className={tCell}>{fmtF(r.coef)}</td>
                        <td className={tCell+' font-medium'}>{fmtM(r.soma)}/m²</td>
                        <td className={tCell+(ok?' text-green-700 font-semibold':' text-orange-600 font-semibold')}>
                          {ok ? '✓' : `${fmtF(r.coef)} — descartado`}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Estatísticas */}
            <div className="px-5 py-4">
              <div className="grid grid-cols-3 gap-3 text-xs mb-4">
                {[
                  ['Elem. válidos', String(resultado.N)],
                  ['T(N-1)', String(resultado.N > 1 ? resultado.N-1 : '—')],
                  ['T Student', fmt(resultado.T, 3)],
                  ['Desvio padrão somas', fmtM(resultado.desvio)],
                  ['Resultado IC', fmtM(resultado.resultIC)],
                  ['Grau de precisão', resultado.grauPrecisao],
                ].map(([l,v]) => (
                  <div key={l} className="bg-slate-50 rounded-xl p-3">
                    <p className="text-slate-400 mb-1">{l}</p>
                    <p className="font-semibold text-slate-800">{v}</p>
                  </div>
                ))}
              </div>

              {/* Resultados */}
              <table className="w-full text-xs border-collapse mb-3">
                <thead>
                  <tr>
                    <th className={tHead+' text-left'}>Intervalo</th>
                    <th className={tHead}>V.U. (R$/m²)</th>
                    <th className={tHead}>Valor total (R$)</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Mínimo', resultado.minimo],
                    ['Médio (adotado)', resultado.medio],
                    ['Máximo', resultado.maximo],
                    ['Limite −30%', resultado.lim30inf],
                    ['Limite +30%', resultado.lim30sup],
                  ].map(([l,v]) => (
                    <tr key={String(l)} className={l==='Médio (adotado)'?'bg-blue-50 font-semibold':''}>
                      <td className={tCellE}>{l}</td>
                      <td className={tCell}>{fmtM(v as number)}</td>
                      <td className={tCell+' font-medium'}>{fmtM((v as number)*(pn(areaAv)||0))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Destaque Valor Terreno */}
              <div className="bg-blue-600 text-white rounded-xl p-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs opacity-70 uppercase tracking-wide">V.U. terreno médio</p>
                    <p className="text-lg font-semibold mt-1">{fmtM(resultado.medio)}/m²</p>
                  </div>
                  <div>
                    <p className="text-xs opacity-70 uppercase tracking-wide">Área avaliando</p>
                    <p className="text-lg font-semibold mt-1">{fmt(pn(areaAv))} m²</p>
                  </div>
                  <div>
                    <p className="text-xs opacity-70 uppercase tracking-wide">Valor total terreno</p>
                    <p className="text-lg font-semibold mt-1">{fmtM(resultado.valorTerreno)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ABA 2: BENFEITORIAS + VALOR FINAL                                  */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {mostrarCalc === 'benf' && (
        <div className="space-y-6">

          {/* CUB */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-sm font-semibold text-slate-700 mb-3">CUB R8N de referência</p>
            <div className="flex items-center gap-3">
              <div className="w-56">
                <label className={lbl}>CUB R8N (R$/m²) — preencha manualmente</label>
                <input className={inp} value={cubR8N}
                  onChange={e=>setCubR8N(e.target.value)}
                  onBlur={e=>setCubR8N(fmtBR(e.target.value,2))}
                  placeholder="2.111,61"/>
              </div>
              <p className="text-xs text-slate-400 mt-4">
                Consulte o site da CBIC ou SINDUSCON do seu estado para o valor atualizado.
              </p>
            </div>
          </div>

          {/* Tabela benfeitorias */}
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div className="px-5 py-3 bg-blue-600 text-white text-xs font-semibold uppercase tracking-wide flex justify-between items-center">
              <span>Valor das edificações — CUB R8N depreciado (VEIU)</span>
              <button type="button" onClick={addBenf}
                className="bg-white/20 hover:bg-white/30 text-white border border-white/30 rounded-lg px-3 py-1 text-xs">
                + Adicionar
              </button>
            </div>

            <div className="px-5 py-4">
              {benfeitorias.length === 0 && (
                <p className="text-sm text-slate-400 py-4 text-center">
                  Nenhuma edificação adicionada. Clique em "+ Adicionar" para incluir galpões, escritórios, coberturas, etc.
                </p>
              )}

              {benfeitorias.map((b, i) => {
                const r = calcBenfeitorias[i]
                return (
                  <div key={b.id} className="border border-slate-200 rounded-xl p-4 mb-3">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-semibold text-slate-600 uppercase">Edificação {b.id}</p>
                      <button type="button" onClick={()=>removeBenf(i)}
                        className="text-xs text-red-500 hover:underline">Remover</button>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div><label className={lbl}>Descrição</label>
                        <input className={inp} value={b.descricao}
                          onChange={e=>updateBenf(i,'descricao',e.target.value)}
                          placeholder="Ex: Cobertura de bombas"/></div>
                      <div className="col-span-2"><label className={lbl}>Padrão construtivo (ref_padrao Antigo)</label>
                        <select className={inp} value={b.padrao}
                          onChange={e => selecionarPadrao(i, e.target.value)}>
                          <option value="">Selecione…</option>
                          {PADRAO_GRUPOS.map(g => (
                            <optgroup key={g.grupo} label={g.grupo}>
                              {Object.keys(PADRAO_TABLE).filter(k=>g.prefixos.some(p=>k.startsWith(p))).map(k=>(
                                <option key={k} value={k}>{k}</option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                      </div>
                      {/* Pc, Ir, R — pré-preenchidos da tabela Antigo, editáveis */}
                      <div>
                        <label className={lbl}>Pc — Coef. Padrão Construtivo</label>
                        <input className={inp} value={b.pc}
                          onChange={e=>updateBenf(i,'pc',e.target.value)}
                          onBlur={ev=>updateBenf(i,'pc',fmtBR(ev.target.value,4))}
                          placeholder="0,4560"/>
                      </div>
                      <div>
                        <label className={lbl}>Ir — Vida referencial (anos)</label>
                        <input className={inp} value={b.ir}
                          onChange={e=>updateBenf(i,'ir',e.target.value)}
                          onBlur={ev=>updateBenf(i,'ir',fmtBR(ev.target.value,0))}
                          placeholder="30"/>
                      </div>
                      <div>
                        <label className={lbl}>R — Valor residual</label>
                        <input className={inp} value={b.r}
                          onChange={e=>updateBenf(i,'r',e.target.value)}
                          onBlur={ev=>updateBenf(i,'r',fmtBR(ev.target.value,4))}
                          placeholder="0,1000"/>
                      </div>
                      <div><label className={lbl}>Área construída (m²)</label>
                        <input className={inp} value={b.area}
                          onChange={e=>updateBenf(i,'area',e.target.value)}
                          onBlur={ev=>updateBenf(i,'area',fmtBR(ev.target.value,2))}
                          placeholder="500,00"/></div>
                      <div><label className={lbl}>Idade real — Ie (anos)</label>
                        <input className={inp} value={b.idadeReal}
                          onChange={e=>updateBenf(i,'idadeReal',e.target.value)}
                          onBlur={ev=>updateBenf(i,'idadeReal',fmtBR(ev.target.value,0))}
                          placeholder="10"/></div>
                      <div><label className={lbl}>Estado de conservação</label>
                        <select className={inp} value={b.estadoConservacao} onChange={e=>updateBenf(i,'estadoConservacao',e.target.value)}>
                          {Object.entries(FOC_LABEL).map(([k,v])=><option key={k} value={k}>{v}</option>)}
                        </select>
                      </div>
                    </div>

                    {r && b.area && b.idadeReal && (() => {
                      return (
                        <div className="mt-3 bg-blue-50 border border-blue-100 rounded-xl p-3">
                          <p className="text-[10px] text-blue-600 font-semibold uppercase tracking-wide mb-2">Resultados calculados</p>
                          <div className="grid grid-cols-8 gap-2 text-xs text-center">
                            {[
                              ['Pc', fmt(r.Pc, 4)],
                              ['Ir', String(r.Ir)],
                              ['R', fmt(r.R, 4)],
                              ['%v (Ie/Ir)', fmt(r.pctVida, 1) + '%'],
                              ['Ka', fmt(r.Ka, 5)],
                              ['Ec', fmt(r.Ec * 100, 4) + '%'],
                              ['K', fmt(r.K, 5)],
                              ['Foc', fmt(r.Foc, 5)],
                            ].map(([l,v])=>(
                              <div key={l} className="bg-white rounded-lg p-2">
                                <p className="text-slate-400 mb-1 text-[10px]">{l}</p>
                                <p className="font-semibold text-blue-800">{v}</p>
                              </div>
                            ))}
                          </div>
                          <div className="mt-2 bg-blue-600 text-white rounded-lg px-4 py-2 flex justify-between items-center">
                            <span className="text-xs opacity-80">Valor da edificação = CUB × Pc × Área × Foc</span>
                            <span className="text-base font-bold">{fmtM(r.valor)}</span>
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                )
              })}

              {benfeitorias.length > 0 && (
                <div className="mt-2 bg-slate-50 rounded-xl p-3 flex justify-between items-center">
                  <span className="text-sm text-slate-600">Total das benfeitorias</span>
                  <span className="text-lg font-semibold text-blue-700">{fmtM(totalBenfeitorias)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Valor Final */}
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div className="px-5 py-3 bg-blue-600 text-white text-xs font-semibold uppercase tracking-wide">
              Valor final de avaliação
            </div>
            <div className="p-5">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="border border-slate-200 rounded-xl p-4">
                  <p className="text-xs text-slate-500 mb-1">Valor do terreno</p>
                  <p className="text-xl font-semibold">{fmtM(resultado.valorTerreno)}</p>
                  <p className="text-xs text-slate-400 mt-1">{fmt(pn(areaAv))} m² × {fmtM(resultado.medio)}/m²</p>
                </div>
                <div className="border border-slate-200 rounded-xl p-4">
                  <p className="text-xs text-slate-500 mb-1">Valor das benfeitorias</p>
                  <p className="text-xl font-semibold">{fmtM(totalBenfeitorias)}</p>
                  <p className="text-xs text-slate-400 mt-1">{benfeitorias.length} edificação(ões) — CUB R8N depreciado</p>
                </div>
              </div>
              <div className="bg-blue-600 text-white rounded-xl p-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs opacity-70 uppercase tracking-wide">Valor final</p>
                    <p className="text-2xl font-semibold mt-1">{fmtM(valorFinal)}</p>
                  </div>
                  <div>
                    <p className="text-xs opacity-70 uppercase tracking-wide">Valor arredondado</p>
                    <p className="text-2xl font-semibold mt-1">{fmtM(valorArredond)}</p>
                    <p className="text-xs opacity-60 mt-1">ROUND(Terreno + Benfeitorias, −3)</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
