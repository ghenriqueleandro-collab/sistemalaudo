'use client'

export const dynamic = 'force-dynamic'

import { buscarLaudo, definirLaudoAtual, limparLaudoAtual, obterLaudoAtual, salvarLaudo } from '@/lib/laudos-storage'
import Link from 'next/link'
import React, { useEffect, useState } from 'react'
import MenuEtapasSimpl from '../../components/formulario/simplificado/MenuEtapasSimpl'
import NavegacaoEtapasSimpl from '../../components/formulario/simplificado/NavegacaoEtapasSimpl'
import Etapa01A06Simpl from '../../components/formulario/simplificado/Etapa01A06Simpl'
import EtapaConsideracoesMercadoSimpl from '../../components/formulario/simplificado/EtapaConsideracoesMercadoSimpl'
import EtapaCalculoCDDM from '../../components/formulario/EtapaCalculoCDDM'
import EtapaCalculoEvolutivo from '../../components/formulario/EtapaCalculoEvolutivo'
import EtapaFundamentacaoPrecisaoSimpl from '../../components/formulario/simplificado/EtapaFundamentacaoPrecisaoSimpl'
import EtapaConclusaoSimpl from '../../components/formulario/simplificado/EtapaConclusaoSimpl'
import EtapaGarantiaSimpl from '../../components/formulario/simplificado/EtapaGarantiaSimpl'
import EtapaAnexosAssinaturaSimpl from '../../components/formulario/simplificado/EtapaAnexosAssinaturaSimpl'
import { EtapaIdSimpl } from '../../components/formulario/simplificado/etapas-simplificado'
import AppShell from '../../components/AppShell'



// ── ErrorBoundary para capturar crashes do EtapaCalculoEvolutivo ──────────────
class EtapaEvolutivoErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  constructor(props: any) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error: Error) { return { error } }
  componentDidCatch(error: Error, info: any) { console.error('[Evolutivo]', error, info) }
  render() {
    if (this.state.error) {
      return (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <p className="font-semibold text-red-700 mb-2">Erro ao carregar o cálculo evolutivo</p>
          <pre className="text-xs text-red-600 whitespace-pre-wrap">{this.state.error.message}</pre>
          <button type="button" onClick={() => this.setState({ error: null })}
            className="mt-3 text-xs text-red-600 underline">Tentar novamente</button>
        </div>
      )
    }
    return this.props.children
  }
}

export default function LaudoSimplificadoPage() {
  const fatoresDisponiveis = [
    'Área: Fator que contempla a área privativa de cada apartamento.',
    'Local: Fator que considera a localização de cada um dos elementos e do avaliando. Para a pesquisa em questão, todos os imóveis apresentam localização semelhante.',
    'FOC: Fator que considera a idade e estado de conservação de cada elemento, mostrando sua obsolescência.',
    'Padrão: Fator que considera o coeficiente de padrão cada elemento, conforme os índices de unidades padronizadas, publicados pelo IBAPE São Paulo.',
    'Andar: Fator que considera o andar de cada elemento, sendo classificados como Baixo, Médio e Alto.',
    'Vaga de garagem: Fator que considera a quantidade de vagas de garagem de cada elemento.',
    'Visibilidade: Fator que considera as chances de um imóvel ser visto. Imóveis com melhor visibilidade, geralmente, encontram-se em vias de passagem e regiões centrais.',
    'Topografia: Fator que considera a topografia de cada um dos elementos, levando em consideração o seu declive ou aclive.',
  ]

  const [form, setForm] = useState({
    tipoLaudo: 'detalhado' as 'detalhado' | 'simplificado',
    modoValorImovel: 'separado' as 'separado' | 'total',
    valorTotal: '',
    _refDocPdf:  undefined as string | undefined,
    _refCalcPdf: undefined as string | undefined,
    _refLocComp: undefined as string | undefined,
    _refImgBenf: undefined as string | undefined,
    padraoCDDM: '',
    fatorLocalAvaliando: '',
    fatorAndarAvaliando: '',
    vagasAvaliando: '',
    coordenadasImovel: '',
    endereco: '',
    proprietario: '',
    solicitante: '',
    tipo: '',
    finalidade: '',
    metodoAvaliacao: '',
    tratamentoDados: '',
    notaLocalAvaliando: '',
    notaTopografiaAvaliando: '',
    notaVisibilidadeAvaliando: '',
    areaConstruidaTotal: '',
    areaConstruidaAverbada: '',
    areaTerrenoTotal: '',
    areaTerrenoAverbada: '',
    matricula: '',
    iptu: '',
    padrao: '',
    idadeAparente: '',
    estadoConservacao: '',
    cidadePrincipal: '',
    distanciaCidadePrincipal: '',
    referencia1: '', distancia1: '',
    referencia2: '', distancia2: '',
    referencia3: '', distancia3: '',
    referencia4: '', distancia4: '',
    referencia5: '', distancia5: '',
    melhoramentosPublicos: {} as Record<string, string>,
    croquis: [] as { preview: string }[],
    terrenoEncravado: false,
    observacoesTerrenoEncravado: '',
    confrontacaoCursoAgua: false,
    observacoesConfrontacaoCursoAgua: '',
    condicoesAvaliacao: '',
    consideracoesMercado: '',
    liquidez: '',
    desempenhoMercado: '',
    metodologiaCalculos: '',
    periodoPesquisaInicio: '',
    periodoPesquisaFim: '',
    tipoInformacoesObtidas: '',
    quantidadeElementos: '',
    caracteristicasTerreno: '',
    imagemBenfeitorias: '',
    valorTerreno: '',
    valorBenfeitorias: '',
    fatorComercializacao: '1,00',
    valorLiquidezForcada: '',
    garantiaClassificacao: '',
    garantiaObservacoes: '',
    dataLaudo: new Date().toISOString().split('T')[0],
    responsavelNome: '',
    responsavelCpf: '',
    responsavelRegistro: '',
    documentacaoPdf: '',
    localizacaoComparativos: '',
    calculoPdf: '',
  })

  const [fatoresSelecionados, setFatoresSelecionados] = useState<string[]>([])
  const [fundamentacao, setFundamentacao] = useState([
    { item: 1, grau: '', pontos: 2 },
    { item: 2, grau: '', pontos: 2 },
    { item: 3, grau: '', pontos: 2 },
    { item: 4, grau: '', pontos: 2 },
  ])
  const [fundamentacaoInferencia, setFundamentacaoInferencia] = useState([
    { item: 1, grau: '', pontos: 0 },
    { item: 2, grau: '', pontos: 0 },
    { item: 3, grau: '', pontos: 0 },
    { item: 4, grau: '', pontos: 0 },
    { item: 5, grau: '', pontos: 0 },
    { item: 6, grau: '', pontos: 0 },
  ])
  const [fundamentacaoEvolutivo, setFundamentacaoEvolutivo] = useState([
    { item: 1, grau: '', pontos: 0 },
    { item: 2, grau: '', pontos: 0 },
    { item: 3, grau: '', pontos: 0 },
  ])
  const [precisao, setPrecisao] = useState([{ item: 1, grau: '', pontos: 0 }])
  const [fotos, setFotos] = useState<any[]>([])
  const [usarCidadeReferencia, setUsarCidadeReferencia] = useState(true)
  const [divisoes, setDivisoes] = useState([{ quantidade: '1', ambiente: '' }])
  const [acabamentos, setAcabamentos] = useState([{ ambiente: '', acabamento: '' }])
  const [resumoMercado, setResumoMercado] = useState([{ campo: '', descricao: '' }])
  const [outrosFatoresImovel, setOutrosFatoresImovel] = useState([{ descricao: '', valor: '' }])
  const [etapaAtual, setEtapaAtual] = useState<EtapaIdSimpl>('1-6')
  const [laudoId, setLaudoId] = useState('')
  const [editandoLaudoExistente, setEditandoLaudoExistente] = useState(false)
  const [formPronto, setFormPronto] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [laudoUuid, setLaudoUuid] = useState('')

  // Sincroniza divisões com acabamentos
  useEffect(() => {
    const divisoesFiltradas = divisoes.filter(d => d.ambiente?.trim())
    if (divisoesFiltradas.length === 0) return
    setAcabamentos(prev => {
      const mapa = new Map(prev.map(a => [a.ambiente, a.acabamento]))
      return divisoesFiltradas.map(d => ({
        ambiente: d.ambiente,
        acabamento: mapa.get(d.ambiente) || '',
      }))
    })
  }, [divisoes])

  useEffect(() => {
    async function carregarLaudoParaEdicao() {
      try {
        const params = new URLSearchParams(window.location.search)
        const idParam = params.get('id')

        const laudoSalvo = !idParam
          ? null
          : idParam
          ? await buscarLaudo(idParam)
          : await obterLaudoAtual()

        if (!laudoSalvo) {
          setEditandoLaudoExistente(false)
          setLaudoId('')
          const novoId = crypto.randomUUID()
          setLaudoUuid(novoId)
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('lesath:laudoSimplId', novoId)
          }
          setFormPronto(true)
          return
        }

        setEditandoLaudoExistente(true)
        setLaudoId(String(laudoSalvo.matricula || laudoSalvo.id || '').trim())
        if (laudoSalvo.id) {
          setLaudoUuid(laudoSalvo.id)
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('lesath:laudoSimplId', laudoSalvo.id)
          }
        }

        setFatoresSelecionados(laudoSalvo.fatoresSelecionados || [])
        setFundamentacao(laudoSalvo.fundamentacao || [
          { item: 1, grau: '', pontos: 2 },
          { item: 2, grau: '', pontos: 2 },
          { item: 3, grau: '', pontos: 2 },
          { item: 4, grau: '', pontos: 2 },
        ])
        setFundamentacaoInferencia(laudoSalvo.fundamentacaoInferencia || [
          { item: 1, grau: '', pontos: 0 },
          { item: 2, grau: '', pontos: 0 },
          { item: 3, grau: '', pontos: 0 },
          { item: 4, grau: '', pontos: 0 },
          { item: 5, grau: '', pontos: 0 },
          { item: 6, grau: '', pontos: 0 },
        ])
        setFundamentacaoEvolutivo(laudoSalvo.fundamentacaoEvolutivo || [
          { item: 1, grau: '', pontos: 0 },
          { item: 2, grau: '', pontos: 0 },
          { item: 3, grau: '', pontos: 0 },
        ])
        setPrecisao(laudoSalvo.precisao || [{ item: 1, grau: '', pontos: 0 }])
        setDivisoes(laudoSalvo.divisoes || [{ quantidade: '1', ambiente: '' }])
        setAcabamentos(laudoSalvo.acabamentos || [{ ambiente: '', acabamento: '' }])
        setResumoMercado(laudoSalvo.resumoMercado || [{ campo: '', descricao: '' }])
        setOutrosFatoresImovel(laudoSalvo.outrosFatoresImovel || [{ descricao: '', valor: '' }])

        // Resolve referências de binários
        async function resolverRef(val: string): Promise<string> {
          if (!val) return val
          if (val.startsWith('__chunks__:')) {
            const sem = val.replace('__chunks__:', '')
            const lastColon = sem.lastIndexOf(':')
            const chave = sem.slice(0, lastColon)
            const num = parseInt(sem.slice(lastColon + 1))
            const partes = await Promise.all(
              Array.from({ length: num }, async (_, i) => {
                const res = await fetch(`/api/laudo-midias?chave=${encodeURIComponent(`${chave}__c${i}`)}`)
                if (!res.ok) return ''
                const { dado } = await res.json()
                return dado || ''
              })
            )
            return partes.join('')
          }
          if (!val.startsWith('__ref__:')) return val
          const chave = val.replace('__ref__:', '')
          const res = await fetch(`/api/laudo-midias?chave=${encodeURIComponent(chave)}`)
          if (!res.ok) return ''
          const { dado } = await res.json()
          return dado || ''
        }

        const fotosResolvidas = await Promise.all(
          (laudoSalvo.fotos || []).map(async (f: any) => {
            const isRef = f.preview?.startsWith('__ref__:')
            return {
              ...f,
              preview: await resolverRef(f.preview),
              _refKey: isRef ? f.preview : undefined,
            }
          })
        )
        setFotos(fotosResolvidas)

        const croquisResolvidos = await Promise.all(
          (laudoSalvo.croquis || []).map(async (c: any) => {
            const isRef = c.preview?.startsWith('__ref__:')
            return {
              preview: await resolverRef(c.preview),
              _refKey: isRef ? c.preview : undefined,
            }
          })
        )

        const [docPdf, calcPdf, locComp, imgBenf] = await Promise.all([
          resolverRef(laudoSalvo.documentacaoPdf || ''),
          resolverRef(laudoSalvo.calculoPdf || ''),
          resolverRef(laudoSalvo.localizacaoComparativos || ''),
          resolverRef(laudoSalvo.imagemBenfeitorias || ''),
        ])

        setForm((prev) => ({
          ...prev,
          ...laudoSalvo,
          croquis: croquisResolvidos,
          documentacaoPdf: docPdf,
          calculoPdf: calcPdf,
          localizacaoComparativos: locComp,
          imagemBenfeitorias: imgBenf,
          _refDocPdf:  laudoSalvo.documentacaoPdf?.startsWith('__ref__:') ? laudoSalvo.documentacaoPdf : undefined,
          _refCalcPdf: laudoSalvo.calculoPdf?.startsWith('__ref__:')      ? laudoSalvo.calculoPdf      : undefined,
          _refLocComp: laudoSalvo.localizacaoComparativos?.startsWith('__ref__:') ? laudoSalvo.localizacaoComparativos : undefined,
          _refImgBenf: laudoSalvo.imagemBenfeitorias?.startsWith('__ref__:')      ? laudoSalvo.imagemBenfeitorias      : undefined,
          melhoramentosPublicos: laudoSalvo.melhoramentosPublicos || prev.melhoramentosPublicos,
        }))
        setUsarCidadeReferencia(Boolean(laudoSalvo.cidadePrincipal || laudoSalvo.distanciaCidadePrincipal))
      } catch (error) {
        console.error(error)
        setEditandoLaudoExistente(false)
        setLaudoId('')
      } finally {
        setFormPronto(true)
      }
    }
    carregarLaudoParaEdicao()
  }, [])

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value, type } = e.target
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked
      setForm({ ...form, [name]: checked })
    } else {
      setForm({ ...form, [name]: value })
    }
  }

  function handleMelhoramentosPublicosChange(campo: string, valor: string) {
    setForm((prev) => ({
      ...prev,
      melhoramentosPublicos: { ...prev.melhoramentosPublicos, [campo]: valor },
    }))
  }

  function handleDivisaoChange(index: number, campo: 'quantidade' | 'ambiente', valor: string) {
    setDivisoes(divisoes.map((d, i) => i === index ? { ...d, [campo]: valor } : d))
  }

  function adicionarLinhaDivisao() {
    setDivisoes([...divisoes, { quantidade: '1', ambiente: '' }])
  }

  function removerLinhaDivisao(index: number) {
    setDivisoes(divisoes.filter((_, i) => i !== index))
  }

  function handleAcabamentoChange(index: number, valor: string) {
    setAcabamentos(acabamentos.map((a, i) => i === index ? { ...a, acabamento: valor } : a))
  }

  function comprimirImagem(file: File, maxLado = 1200, qualidade = 0.75): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (ev) => {
        const img = new window.Image()
        img.onload = () => {
          let { width, height } = img
          if (width > maxLado || height > maxLado) {
            if (width >= height) { height = Math.round((height / width) * maxLado); width = maxLado }
            else { width = Math.round((width / height) * maxLado); height = maxLado }
          }
          const canvas = document.createElement('canvas')
          canvas.width = width; canvas.height = height
          const ctx = canvas.getContext('2d')!
          ctx.drawImage(img, 0, 0, width, height)
          resolve(canvas.toDataURL('image/jpeg', qualidade))
        }
        img.onerror = reject
        img.src = ev.target?.result as string
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  async function handleCroqui(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    const novosCroquis = await Promise.all(
      files.map(async (file) => ({ preview: await comprimirImagem(file, 1000, 0.70), automatico: false }))
    )
    setForm((prev) => ({ ...prev, croquis: [...(prev.croquis || []), ...novosCroquis] }))
  }

  function removerCroqui(index: number) {
    setForm((prev) => ({ ...prev, croquis: prev.croquis.filter((_: any, i: number) => i !== index) }))
  }

  async function handleImagemBenfeitorias(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const base64 = await comprimirImagem(file, 1400, 0.82)
      setForm((prev) => ({ ...prev, imagemBenfeitorias: base64 }))
    } catch (error) {
      console.error(error)
      alert('Erro ao processar a imagem.')
    }
  }

  async function handlePdfUpload(e: React.ChangeEvent<HTMLInputElement>, campo: 'documentacaoPdf' | 'calculoPdf') {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      const refField = campo === 'documentacaoPdf' ? '_refDocPdf' : '_refCalcPdf'
      setForm((prev) => ({ ...prev, [campo]: base64, [refField]: undefined }))
    } catch (error) {
      console.error(error)
      alert('Erro ao processar o PDF.')
    }
  }

  function setTipoImovelCDDM(tipo: 'isolado' | 'fracao') {
    setForm((prev: any) => ({
      ...prev,
      tipoImovelCDDM: tipo,
      fatoresCDDMAtivos: tipo === 'isolado'
        ? { ...prev.fatoresCDDMAtivos, local: true, andar: false, vaga: false }
        : { ...prev.fatoresCDDMAtivos, local: true, vaga: true },
    }))
  }

  function toggleFatorCDDM(fator: 'local' | 'padrao' | 'foc' | 'andar' | 'vaga') {
    setForm((prev: any) => ({
      ...prev,
      fatoresCDDMAtivos: {
        ...prev.fatoresCDDMAtivos,
        [fator]: !prev.fatoresCDDMAtivos?.[fator],
      },
    }))
  }

  function onRemoverAnexo(campo: 'documentacaoPdf' | 'calculoPdf' | 'localizacaoComparativos') {
    setForm((prev) => ({ ...prev, [campo]: '' }))
  }

  async function handleLocalizacaoComparativos(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const base64 = await comprimirImagem(file, 1400, 0.82)
      setForm((prev) => ({ ...prev, localizacaoComparativos: base64 }))
    } catch (error) {
      console.error(error)
      alert('Erro ao processar a imagem de localização.')
    }
  }

  async function handleFotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    const novasFotos = await Promise.all(
      files.map(async (file) => ({
        preview: await comprimirImagem(file, 800, 0.55),
        legenda: file.name.replace(/\.[^.]+$/, ''),
      }))
    )
    setFotos((prev) => [...prev, ...novasFotos])
  }

  function handleLegenda(index: number, legenda: string) {
    setFotos((prev) => prev.map((f, i) => i === index ? { ...f, legenda } : f))
  }

  function removerFoto(index: number) {
    setFotos((prev) => prev.filter((_, i) => i !== index))
  }

  function reordenarFotos(origem: number, destino: number) {
    setFotos((prev) => {
      const novas = [...prev]
      const [item] = novas.splice(origem, 1)
      novas.splice(destino, 0, item)
      return novas
    })
  }

  function handleOutroFatorImovelChange(index: number, campo: string, valor: string) {
    setOutrosFatoresImovel(outrosFatoresImovel.map((o, i) => i === index ? { ...o, [campo]: valor } : o))
  }

  function adicionarLinhaOutroFatorImovel() {
    setOutrosFatoresImovel([...outrosFatoresImovel, { descricao: '', valor: '' }])
  }

  function removerLinhaOutroFatorImovel(index: number) {
    setOutrosFatoresImovel(outrosFatoresImovel.filter((_, i) => i !== index))
  }

  function selecionarGrauFundamentacao(index: number, grau: 'III' | 'II' | 'I') {
    setFundamentacao((prev) => prev.map((f, i) => i === index ? { ...f, grau } : f))
  }

  function selecionarGrauFundamentacaoInferencia(index: number, grau: 'III' | 'II' | 'I') {
    setFundamentacaoInferencia((prev) => prev.map((f, i) => i === index ? { ...f, grau } : f))
  }

  function selecionarGrauFundamentacaoEvolutivo(index: number, grau: 'III' | 'II' | 'I') {
    setFundamentacaoEvolutivo((prev) => prev.map((f, i) => i === index ? { ...f, grau } : f))
  }

  function selecionarGrauPrecisao(index: number, grau: 'III' | 'II' | 'I') {
    setPrecisao((prev) => prev.map((p, i) => i === index ? { ...p, grau } : p))
  }

  function formatarDataBR(data: string) {
    if (!data) return ''
    const [ano, mes, dia] = data.split('-')
    return `${dia}/${mes}/${ano}`
  }

  function toggleFator(fator: string) {
    setFatoresSelecionados((prev) =>
      prev.includes(fator) ? prev.filter((f) => f !== fator) : [...prev, fator]
    )
  }

  const areaConstruidaNaoAverbada = Math.max(
    0,
    parseFloat((form.areaConstruidaTotal || '0').replace(',', '.')) -
      parseFloat((form.areaConstruidaAverbada || '0').replace(',', '.'))
  )

  const areaTerrenoNaoAverbada = Math.max(
    0,
    parseFloat((form.areaTerrenoTotal || '0').replace(',', '.')) -
      parseFloat((form.areaTerrenoAverbada || '0').replace(',', '.'))
  )

  const produtoOutrosFatores = outrosFatoresImovel.reduce((acc, item) => {
    const v = parseFloat(item.valor.replace(',', '.'))
    return acc * (isNaN(v) ? 1 : v)
  }, 1)

  const _parseBR = (s: string) => parseFloat((s || '0').replace(/\./g, '').replace(',', '.')) || 0

  const subtotalImovel = form.modoValorImovel === 'total'
    ? _parseBR(form.valorTotal || '0') * produtoOutrosFatores
    : (_parseBR(form.valorTerreno) + _parseBR(form.valorBenfeitorias)) * produtoOutrosFatores

  const valorFinalImovel =
    subtotalImovel * (_parseBR(form.fatorComercializacao || '1') || 1)

  function formatarMoeda(valor: number) {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  const exibirTabelaFatoresTerreno = form.metodoAvaliacao === 'comparativo' && form.tratamentoDados === 'tratamento_por_fatores'
  const exibirTabelaInferencia = form.metodoAvaliacao === 'comparativo' && form.tratamentoDados === 'inferencia_estatistica'
  const exibirTabelaMetodoEvolutivo = form.metodoAvaliacao === 'evolutivo'

  const somaFundamentacao = fundamentacao.reduce((acc, f) => {
    const map: Record<string, number> = { III: 1, II: 2, I: 3 }
    return acc + (map[f.grau] || 0)
  }, 0)

  const somaFundamentacaoInferencia = fundamentacaoInferencia.reduce((acc, f) => {
    const map: Record<string, number> = { III: 1, II: 2, I: 3 }
    return acc + (map[f.grau] || 0)
  }, 0)

  const somaFundamentacaoEvolutivo = fundamentacaoEvolutivo.reduce((acc, f) => {
    const map: Record<string, number> = { III: 1, II: 2, I: 3 }
    return acc + (map[f.grau] || 0)
  }, 0)

  function etapaConcluida(etapa: EtapaIdSimpl) {
    switch (etapa) {
      case '1-6':
        return Boolean(
          form.endereco.trim() &&
            form.proprietario.trim() &&
            (form.solicitante || '').trim() &&
            form.tipo.trim() &&
            form.finalidade.trim() &&
            form.metodoAvaliacao.trim() &&
            form.tratamentoDados.trim()
        )
      case '8':
        return Boolean((form.consideracoesMercado || '').trim())
      case '9.1':
        return Boolean(
          form.periodoPesquisaInicio &&
            form.periodoPesquisaFim &&
            form.tipoInformacoesObtidas
        )
      case '11':
        return Boolean(
          fundamentacao.some((item: any) => item.grau) ||
            fundamentacaoInferencia.some((item: any) => item.grau) ||
            fundamentacaoEvolutivo.some((item: any) => item.grau) ||
            precisao.some((item: any) => item.grau)
        )
      case '12':
        return valorFinalImovel > 0
      case '13':
        return Boolean(form.garantiaClassificacao)
      case '14':
        return Boolean(
          form.dataLaudo &&
            form.responsavelNome.trim() &&
            form.responsavelCpf.trim() &&
            form.responsavelRegistro.trim()
        )
      default:
        return false
    }
  }

  function obterStatusLaudo(): 'em_preenchimento' | 'finalizado' {
    const etapasObrigatorias: EtapaIdSimpl[] = ['1-6', '8', '9.1', '11', '12', '13', '14']
    return etapasObrigatorias.every((e) => etapaConcluida(e)) ? 'finalizado' : 'em_preenchimento'
  }

  async function executarSave(silencioso = false) {
    if (!laudoUuid) return
    setSalvando(true)
    setAutoSaveStatus('saving')
    try {
      const status = obterStatusLaudo()

      const CHUNK_KB = 900
      async function salvarChunk(chave: string, dado: string): Promise<boolean> {
        try {
          const res = await fetch('/api/laudo-midias', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chave, dado }),
          })
          return res.ok
        } catch { return false }
      }

      async function salvarBinario(chave: string, dado: string): Promise<string> {
        if (!dado || !dado.startsWith('data:')) return dado
        const tamanho = dado.length
        const chunkSize = CHUNK_KB * 1024 * (4 / 3)
        if (tamanho <= chunkSize) {
          const ok = await salvarChunk(chave, dado)
          return ok ? `__ref__:${chave}` : dado
        }
        const chunks: string[] = []
        for (let i = 0; i < tamanho; i += chunkSize) {
          chunks.push(dado.slice(i, i + chunkSize))
        }
        const results = await Promise.all(
          chunks.map((chunk, i) => salvarChunk(`${chave}__c${i}`, chunk))
        )
        if (results.every(Boolean)) return `__chunks__:${chave}:${chunks.length}`
        return dado
      }

      const fotosComRef = await Promise.all(
        fotos.map(async (foto: any, i: number) => {
          if (foto._refKey) return { legenda: foto.legenda, preview: foto._refKey }
          if (!foto.preview?.startsWith('data:')) return { legenda: foto.legenda, preview: foto.preview }
          const chave = `foto:${laudoUuid}:${i}`
          const ref = await salvarBinario(chave, foto.preview)
          return { legenda: foto.legenda, preview: ref }
        })
      )

      const croquisComRef = await Promise.all(
        (form.croquis || []).map(async (c: any, i: number) => {
          if (c._refKey) return { preview: c._refKey }
          if (!c.preview?.startsWith('data:')) return c
          const chave = `croqui:${laudoUuid}:${i}`
          const ref = await salvarBinario(chave, c.preview)
          return { preview: ref }
        })
      )

      async function salvarCampo(refKey: string | undefined, chave: string, dado: string): Promise<string> {
        if (refKey && dado && !dado.startsWith('__ref__:')) return refKey
        return await salvarBinario(chave, dado)
      }

      const docPdf  = await salvarCampo(form._refDocPdf,  `anexo:${laudoUuid}:documentacaoPdf`,         form.documentacaoPdf || '')
      const calcPdf = await salvarCampo(form._refCalcPdf, `anexo:${laudoUuid}:calculoPdf`,              form.calculoPdf || '')
      const locComp = await salvarCampo(form._refLocComp, `anexo:${laudoUuid}:localizacaoComparativos`, form.localizacaoComparativos || '')
      const imgBenf = await salvarCampo(form._refImgBenf, `anexo:${laudoUuid}:imagemBenfeitorias`,      form.imagemBenfeitorias || '')

      const payload = {
        ...form,
        id: laudoUuid,
        croquis: croquisComRef,
        documentacaoPdf: docPdf,
        calculoPdf: calcPdf,
        localizacaoComparativos: locComp,
        imagemBenfeitorias: imgBenf,
        fatoresSelecionados,
        fundamentacao,
        fundamentacaoInferencia,
        fundamentacaoEvolutivo,
        precisao,
        divisoes,
        acabamentos,
        resumoMercado,
        outrosFatoresImovel,
        fotos: fotosComRef,
        valorFinalImovel,
        status,
        atualizadoEm: new Date().toISOString(),
      }

      const idSalvo = await salvarLaudo(payload)

      if (!idSalvo) {
        alert('Verifique sua conexão e tente novamente.')
        return
      }

      await definirLaudoAtual(idSalvo)
      setAutoSaveStatus('saved')
      setTimeout(() => setAutoSaveStatus('idle'), 3000)
      // Guarda o ID no sessionStorage para que NavegacaoEtapasSimpl possa acessar
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('lesath:laudoSimplId', idSalvo)
      }
    } catch (error) {
      console.error('Erro ao salvar laudo:', error)
      setAutoSaveStatus('error')
      if (!silencioso) {
        const msg = error instanceof Error ? error.message : String(error)
        alert(`Erro ao salvar o laudo.\n\nDetalhe: ${msg}`)
      }
    } finally {
      setSalvando(false)
    }
  }

  // Auto-save com debounce de 2s
  useEffect(() => {
    if (!formPronto || !laudoUuid) return
    const timer = setTimeout(() => { executarSave(true) }, 2000)
    return () => clearTimeout(timer)
  }, [form, fotos, divisoes, acabamentos, fundamentacao, fundamentacaoInferencia,
      fundamentacaoEvolutivo, precisao, resumoMercado, outrosFatoresImovel])

  useEffect(() => {
    const handler = () => { executarSave(true) }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [])

  // ─── RENDER ───────────────────────────────────────────────────────────────────

  return (
    <AppShell>

      {/* ── STEPPER HORIZONTAL STICKY NO TOPO ── */}
      <MenuEtapasSimpl
        etapaAtual={etapaAtual}
        setEtapaAtual={setEtapaAtual}
        etapaConcluida={etapaConcluida}
      />

      {/* ── CONTEÚDO FULL-WIDTH ── */}
      <section className="mx-auto max-w-4xl px-4 sm:px-6 py-8 pb-28">

        {/* Cabeçalho */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
              elaboração do laudo
            </div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
              Novo laudo
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/" className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 transition">
              Início
            </Link>
            <Link href="/meus-laudos" className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 transition">
              Meus laudos
            </Link>
            <button
              type="button"
              onClick={async () => { await limparLaudoAtual(); window.location.href = '/laudo/simplificado' }}
              className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 transition"
            >
              Novo laudo em branco
            </button>
            <Link
              href={laudoUuid
                ? `/visualizar-laudo/simplificado?id=${encodeURIComponent(laudoUuid)}`
                : '/visualizar-laudo/simplificado'}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm text-blue-700 hover:bg-blue-100 transition"
            >
              Visualizar laudo
            </Link>
          </div>
        </div>

        {/* Status do auto-save */}
        {autoSaveStatus !== 'idle' && (
          <div className={`mb-4 text-xs px-3 py-1.5 rounded-lg w-fit ${
            autoSaveStatus === 'saving' ? 'bg-amber-50 text-amber-700' :
            autoSaveStatus === 'saved'  ? 'bg-green-50 text-green-700' :
            'bg-red-50 text-red-700'
          }`}>
            {autoSaveStatus === 'saving' ? '⏳ Salvando…' : autoSaveStatus === 'saved' ? '✓ Salvo' : '✗ Erro ao salvar'}
          </div>
        )}

        {/* ── FORMULÁRIO ── */}
        <div className="space-y-6">

          {etapaAtual === '1-6' && (
            <Etapa01A06Simpl
              form={form}
              handleChange={handleChange}
              handleMelhoramentosPublicosChange={handleMelhoramentosPublicosChange}
              areaConstruidaNaoAverbada={areaConstruidaNaoAverbada}
              areaTerrenoNaoAverbada={areaTerrenoNaoAverbada}
              usarCidadeReferencia={usarCidadeReferencia}
              setUsarCidadeReferencia={setUsarCidadeReferencia}
              divisoes={divisoes}
              handleDivisaoChange={handleDivisaoChange}
              adicionarLinhaDivisao={adicionarLinhaDivisao}
              removerLinhaDivisao={removerLinhaDivisao}
              handleCroqui={handleCroqui}
              removerCroqui={removerCroqui}
              setForm={setForm}
              tipoLaudo="simplificado"
              fatoresCDDMAtivos={(form as any).fatoresCDDMAtivos}
              toggleFatorCDDM={toggleFatorCDDM}
              tipoImovelCDDM={(form as any).tipoImovelCDDM}
              setTipoImovelCDDM={setTipoImovelCDDM}
            />
          )}

          {etapaAtual === '8' && (
            <EtapaConsideracoesMercadoSimpl
              form={form}
              handleChange={handleChange}
            />
          )}

          {/* ── SEÇÃO 10: METODOLOGIA — evolutivo ou CDDM conforme método selecionado ── */}
          {etapaAtual === '9.1' && (
            (form.metodoAvaliacao === 'evolutivo' && form.tratamentoDados === 'tratamento_por_fatores')
              ? (
              <EtapaEvolutivoErrorBoundary>
                <EtapaCalculoEvolutivo form={form} setForm={setForm} />
              </EtapaEvolutivoErrorBoundary>
            )
              : <EtapaCalculoCDDM form={form} setForm={setForm} fatoresCDDMAtivos={(form as any).fatoresCDDMAtivos} />
          )}

          {etapaAtual === '11' && (
            <EtapaFundamentacaoPrecisaoSimpl
              exibirTabelaFatoresTerreno={exibirTabelaFatoresTerreno}
              exibirTabelaInferencia={exibirTabelaInferencia}
              exibirTabelaMetodoEvolutivo={exibirTabelaMetodoEvolutivo}
              fundamentacao={fundamentacao}
              fundamentacaoInferencia={fundamentacaoInferencia}
              fundamentacaoEvolutivo={fundamentacaoEvolutivo}
              precisao={precisao}
              selecionarGrauFundamentacao={selecionarGrauFundamentacao}
              selecionarGrauFundamentacaoInferencia={selecionarGrauFundamentacaoInferencia}
              selecionarGrauFundamentacaoEvolutivo={selecionarGrauFundamentacaoEvolutivo}
              selecionarGrauPrecisao={selecionarGrauPrecisao}
              somaFundamentacao={somaFundamentacao}
              somaFundamentacaoInferencia={somaFundamentacaoInferencia}
              somaFundamentacaoEvolutivo={somaFundamentacaoEvolutivo}
            />
          )}

          {etapaAtual === '12' && (
            <EtapaConclusaoSimpl
              form={form}
              handleChange={handleChange}
              valorFinalImovel={valorFinalImovel}
              formatarMoeda={formatarMoeda}
            />
          )}

          {etapaAtual === '13' && (
            <EtapaGarantiaSimpl form={form} setForm={setForm} />
          )}

          {etapaAtual === '14' && (
            <EtapaAnexosAssinaturaSimpl
              form={form}
              setForm={setForm}
              handleChange={handleChange}
              formatarDataBR={formatarDataBR}
              handlePdfUpload={handlePdfUpload}
              handleLocalizacaoComparativos={handleLocalizacaoComparativos}
              onRemoverAnexo={onRemoverAnexo}
              handleFotos={handleFotos}
              fotos={fotos}
              handleLegenda={handleLegenda}
              onRemoverFoto={removerFoto}
              onReordenarFotos={reordenarFotos}
            />
          )}

          {/* Sem botão de salvar — auto-save ativo */}

        </div>
      </section>

      {/* ── NAVEGAÇÃO STICKY NO RODAPÉ ── */}
      <NavegacaoEtapasSimpl
        etapaAtual={etapaAtual}
        setEtapaAtual={setEtapaAtual}
        laudoUuid={laudoUuid}
      />

    </AppShell>
  )
}
