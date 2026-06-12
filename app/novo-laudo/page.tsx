'use client'

import { buscarLaudo, definirLaudoAtual, obterLaudoAtual, salvarLaudo } from '@/lib/laudos-storage'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import MenuEtapas from '../components/formulario/MenuEtapas'
import NavegacaoEtapas from '../components/formulario/NavegacaoEtapas'
import Etapa01A06Simpl from '../components/formulario/simplificado/Etapa01A06Simpl'
import EtapaAcabamentos from '../components/formulario/EtapaAcabamentos'
import EtapaConsideracoesMercado from '../components/formulario/EtapaConsideracoesMercado'
import EtapaGlossario from '../components/formulario/EtapaGlossario'
import EtapaCalculoCDDM from '../components/formulario/EtapaCalculoCDDM'
import EtapaCalculoEvolutivo from '../components/formulario/EtapaCalculoEvolutivo'
import EtapaValorImovel from '../components/formulario/EtapaValorImovel'
import EtapaFundamentacaoPrecisao from '../components/formulario/EtapaFundamentacaoPrecisao'
import EtapaGarantia from '../components/formulario/EtapaGarantia'
import EtapaAnexosAssinatura from '../components/formulario/EtapaAnexosAssinatura'
import { EtapaId } from '../components/formulario/etapas'
import AppShell from '../components/AppShell'
import EtapaClienteStatus from '../components/formulario/EtapaClienteStatus'


export default function NovoLaudoPage() {
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
    metodoAvaliacao: 'comparativo',
    tratamentoDados: 'tratamento_por_fatores',
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
    fatoresCDDMAtivos: { local: true, padrao: true, foc: true, andar: true, vaga: true } as { local: boolean; padrao: boolean; foc: boolean; andar: boolean; vaga: boolean },
    tipoImovelCDDM: '' as '' | 'isolado' | 'fracao',
    valorTerreno: '',
    valorBenfeitorias: '',
    fatorComercializacao: '1,00',
    valorLiquidezForcada: '',
    fatorLiquidacaoForcada: '',
    garantiaClassificacao: '',
    garantiaObservacoes: '',
    dataLaudo: new Date().toISOString().split('T')[0],
    responsavelNome: '',
    responsavelCpf: '',
    responsavelRegistro: '',
    documentacaoPdf: '',
    localizacaoComparativos: '',
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
  const [valoresAdicionais, setValoresAdicionais] = useState<{ descricao: string; valor: string }[]>([])
  const [etapaAtual, setEtapaAtual] = useState<EtapaId>('cliente-status')
  const [laudoId, setLaudoId] = useState('')
  const [editandoLaudoExistente, setEditandoLaudoExistente] = useState(false)
  const [formPronto, setFormPronto] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [laudoUuid, setLaudoUuid] = useState(() => crypto.randomUUID())

  // Sincroniza as divisões internas com a lista de acabamentos
  // preservando os valores já preenchidos pelo usuário
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
          if (idParam) {
            // Laudo existe (há ID na URL) mas não carregou — NÃO habilitar autosave
            // Mostrar erro para não sobrescrever dados com form vazio
            console.error('[carregarLaudo] Laudo não encontrado para id:', idParam)
            // NÃO usar setAutoSaveStatus('error') — isso mostra mensagem enganosa de save
            // formPronto permanece false → autosave não dispara → dados preservados no Redis
            return
          }
          // Novo laudo (sem id): ok habilitar
          setEditandoLaudoExistente(false)
          setLaudoId('')
          setFormPronto(true)
          return
        }

        setEditandoLaudoExistente(true)
        setLaudoId(String(laudoSalvo.matricula || laudoSalvo.id || '').trim()
        )
        if (laudoSalvo.id) setLaudoUuid(laudoSalvo.id)

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
        setValoresAdicionais(laudoSalvo.valoresAdicionais || [])
        // Não chama setFotos aqui — será chamado após resolver refs abaixo

        // Resolve referências de binários armazenados separadamente
        async function resolverRef(val: string): Promise<string> {
          if (!val) return val
          if (val.startsWith('__chunks__:')) {
            // Reassembla chunks: __chunks__:chave:numChunks
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

        // Resolve fotos — marca _refKey para não re-salvar no próximo save
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

        // Resolve croquis, PDFs e imagens no form
        const croquisResolvidos = await Promise.all(
          (laudoSalvo.croquis || []).map(async (c: any) => {
            const isRef = c.preview?.startsWith('__ref__:')
            return {
              preview: await resolverRef(c.preview),
              _refKey: isRef ? c.preview : undefined,
            }
          })
        )

        const [docPdf, locComp, imgBenf] = await Promise.all([
          resolverRef(laudoSalvo.documentacaoPdf || ''),
          resolverRef(laudoSalvo.calculoPdf || ''),
          resolverRef(laudoSalvo.localizacaoComparativos || ''),
          resolverRef(laudoSalvo.imagemBenfeitorias || ''),
        ])

        // Resolver fotos dos elementos CDDM salvas como __ref__:
        // IMPORTANTE: resolver em AMBOS os campos —
        //   dadosCalculoCDDM.elementos: usado pela visualização e PDF
        //   elementosComparativos: usado pelo EtapaCalculoCDDM (inicialização do estado interno)
        let dadosCddmResolvido = laudoSalvo.dadosCalculoCDDM
        if (dadosCddmResolvido?.elementos) {
          const elementosResolvidos = await Promise.all(
            dadosCddmResolvido.elementos.map(async (el: any) => ({
              ...el,
              foto: el.foto ? await resolverRef(el.foto) : '',
            }))
          )
          dadosCddmResolvido = { ...dadosCddmResolvido, elementos: elementosResolvidos }
        }

        // Resolver fotos em elementosComparativos (estado interno do EtapaCalculoCDDM)
        let elementosComparativosResolvidos = laudoSalvo.elementosComparativos
        if (Array.isArray(elementosComparativosResolvidos)) {
          elementosComparativosResolvidos = await Promise.all(
            elementosComparativosResolvidos.map(async (el: any) => ({
              ...el,
              foto: el.foto ? await resolverRef(el.foto) : '',
            }))
          )
        }

        setForm((prev) => ({
          ...prev,
          ...laudoSalvo,
          tipoLaudo: 'detalhado' as const,  // laudos abertos no form detalhado são sempre detalhados
          croquis: croquisResolvidos,
          documentacaoPdf: docPdf,
            localizacaoComparativos: locComp,
          imagemBenfeitorias: imgBenf,
          dadosCalculoCDDM: dadosCddmResolvido,
          elementosComparativos: elementosComparativosResolvidos ?? laudoSalvo.elementosComparativos,
          // Guarda as refs originais para não re-salvar no próximo save
          _refDocPdf:  laudoSalvo.documentacaoPdf?.startsWith('__ref__:') ? laudoSalvo.documentacaoPdf : undefined,
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

  function toggleFatorCDDM(fator: 'local' | 'padrao' | 'foc' | 'andar' | 'vaga') {
    setForm((prev: any) => ({
      ...prev,
      fatoresCDDMAtivos: { ...prev.fatoresCDDMAtivos, [fator]: !prev.fatoresCDDMAtivos?.[fator] },
    }))
  }

  function setTipoImovelCDDM(tipo: 'isolado' | 'fracao') {
    setForm((prev: any) => ({ ...prev, tipoImovelCDDM: tipo }))
  }

  function handleMelhoramentosPublicosChange(campo: string, valor: string) {
    setForm((prev) => ({
      ...prev,
      melhoramentosPublicos: {
        ...prev.melhoramentosPublicos,
        [campo]: valor,
      },
    }))
  }

  function handleDivisaoChange(index: number, campo: 'quantidade' | 'ambiente', valor: string) {
    const novasDivisoes = divisoes.map((d, i) => i === index ? { ...d, [campo]: valor } : d)
    setDivisoes(novasDivisoes)
  }

  function adicionarLinhaDivisao() {
    setDivisoes([...divisoes, { quantidade: '1', ambiente: '' }])
  }

  function removerLinhaDivisao(index: number) {
    setDivisoes(divisoes.filter((_, i) => i !== index))
  }

  function handleAcabamentoChange(index: number, valor: string) {
    const novos = acabamentos.map((a, i) => i === index ? { ...a, acabamento: valor } : a)
    setAcabamentos(novos)
  }

  // ─── Comprime imagem para base64 (max 1200px, qualidade 0.75) ─────────────
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
      files.map(async (file) => ({ preview: await comprimirImagem(file, 1000, 0.70) }))
    )
    setForm((prev) => ({ ...prev, croquis: [...(prev.croquis || []), ...novosCroquis] }))
  }

  function removerCroqui(index: number) {
    setForm((prev) => ({ ...prev, croquis: prev.croquis.filter((_: any, i: number) => i !== index) }))
  }


  async function handlePdfUpload(e: React.ChangeEvent<HTMLInputElement>, campo: 'documentacaoPdf') {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      // Limpa a ref anterior para forçar novo upload no save
      const refField = '_refDocPdf'
      setForm((prev) => ({ ...prev, [campo]: base64, [refField]: undefined }))
    } catch (error) {
      console.error(error)
      alert('Erro ao processar o PDF.')
    }
  }

  function onRemoverAnexo(campo: 'documentacaoPdf' | 'localizacaoComparativos') {
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
    const novos = outrosFatoresImovel.map((o, i) => i === index ? { ...o, [campo]: valor } : o)
    setOutrosFatoresImovel(novos)
  }

  function adicionarLinhaOutroFatorImovel() {
    setOutrosFatoresImovel([...outrosFatoresImovel, { descricao: '', valor: '' }])
  }

  function removerLinhaOutroFatorImovel(index: number) {
    setOutrosFatoresImovel(outrosFatoresImovel.filter((_, i) => i !== index))
  }

  function handleValorAdicionalChange(index: number, campo: 'descricao' | 'valor', valor: string) {
    setValoresAdicionais(valoresAdicionais.map((v, i) => i === index ? { ...v, [campo]: valor } : v))
  }
  function adicionarValorAdicional() {
    setValoresAdicionais([...valoresAdicionais, { descricao: '', valor: '' }])
  }
  function removerValorAdicional(index: number) {
    setValoresAdicionais(valoresAdicionais.filter((_, i) => i !== index))
  }

  // Converte grau em pontos: III=3, II=2, I=1
  function grauParaPontos(grau: 'III' | 'II' | 'I') {
    return grau === 'III' ? 3 : grau === 'II' ? 2 : 1
  }

  function selecionarGrauFundamentacao(index: number, grau: 'III' | 'II' | 'I') {
    setFundamentacao((prev) => prev.map((f, i) => i === index ? { ...f, grau, pontos: grauParaPontos(grau) } : f))
  }

  function selecionarGrauFundamentacaoInferencia(index: number, grau: 'III' | 'II' | 'I') {
    setFundamentacaoInferencia((prev) => prev.map((f, i) => i === index ? { ...f, grau, pontos: grauParaPontos(grau) } : f))
  }

  function selecionarGrauFundamentacaoEvolutivo(index: number, grau: 'III' | 'II' | 'I') {
    setFundamentacaoEvolutivo((prev) => prev.map((f, i) => i === index ? { ...f, grau, pontos: grauParaPontos(grau) } : f))
  }

  function selecionarGrauPrecisao(index: number, grau: 'III' | 'II' | 'I') {
    setPrecisao((prev) => prev.map((p, i) => i === index ? { ...p, grau, pontos: grauParaPontos(grau) } : p))
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

  // Valor base automático do motor CDDM ou Evolutivo
  const _cddm = (form as any).dadosCalculoCDDM
  const _ev   = (form as any).dadosCalculoEvolutivo
  const _isEvo = form.metodoAvaliacao === 'evolutivo'
  const _baseAuto = _isEvo && _ev?.valorFinal > 0
    ? _ev.valorFinal
    : !_isEvo && _cddm?.mediaSaneada > 0
    ? _cddm.valorImovel
    : null

  const subtotalImovel = _baseAuto != null
    ? _baseAuto * produtoOutrosFatores
    : form.modoValorImovel === 'total'
    ? _parseBR(form.valorTotal || '0') * produtoOutrosFatores
    : (_parseBR(form.valorTerreno) + _parseBR(form.valorBenfeitorias)) * produtoOutrosFatores

  const somaValoresAdicionais = valoresAdicionais.reduce(
    (acc, item) => acc + _parseBR(item.valor), 0
  )

  const valorFinalImovel =
    subtotalImovel * (_parseBR(form.fatorComercializacao || '1') || 1) + somaValoresAdicionais

  // Calcular valorLiquidezForcada a partir do fator
  const fatorLiqRaw = (form.fatorLiquidacaoForcada || '').replace(',', '.')
  const fatorLiqNum = parseFloat(fatorLiqRaw)
  const valorLiquidezForcadaCalc =
    !isNaN(fatorLiqNum) && fatorLiqNum > 0 && fatorLiqNum < 1
      ? String(Math.round(Math.round(valorFinalImovel / 100) * 100 * fatorLiqNum / 100) * 100)
      : (form.valorLiquidezForcada || '')

  function formatarMoeda(valor: number) {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  // Método e tratamento — com fallback automático a partir dos dados do motor
  const _temDadosCddm  = !!(form as any).dadosCalculoCDDM?.mediaSaneada
  const _temDadosEv    = !!(form as any).dadosCalculoEvolutivo?.valorFinal
  const _metodo        = form.metodoAvaliacao
    || (_temDadosEv ? 'evolutivo' : 'comparativo')  // detalhado sempre tem método
  const _tratamento    = form.tratamentoDados
    || 'tratamento_por_fatores'  // detalhado sempre usa tratamento por fatores como padrão

  // Tabela Fatores Terreno: comparativo+fatores OU evolutivo+fatores
  const exibirTabelaFatoresTerreno =
    _tratamento === 'tratamento_por_fatores' &&
    (_metodo === 'comparativo' || _metodo === 'evolutivo')
  // Tabela Inferência: comparativo+inferência OU evolutivo+inferência
  const exibirTabelaInferencia =
    _tratamento === 'inferencia_estatistica' &&
    (_metodo === 'comparativo' || _metodo === 'evolutivo')
  // Tabela Método Evolutivo: sempre que o método for evolutivo
  const exibirTabelaMetodoEvolutivo = _metodo === 'evolutivo'

  const somaFundamentacao = fundamentacao.reduce((acc, f) => {
    const map: Record<string, number> = { III: 3, II: 2, I: 1 }
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

  function etapaConcluida(etapa: EtapaId) {
    switch (etapa) {
      case 'cliente-status':
        return true
      case '1-6':
        return Boolean(
          form.endereco.trim() &&
            form.proprietario.trim() &&
            (form.solicitante || '').trim() &&
            form.tipo.trim() &&
            form.finalidade.trim() &&
            (form.metodoAvaliacao || 'comparativo').trim() &&
            (form.tratamentoDados || 'tratamento_por_fatores').trim()
        )
      case '7':
        return acabamentos.some((item) => item.acabamento.trim())
      case '8':
        return Boolean(form.consideracoesMercado.trim())
      case '9':
        return true
      case '9.1':
        return Boolean(
          form.periodoPesquisaInicio &&
            form.periodoPesquisaFim &&
            form.tipoInformacoesObtidas &&
            form.caracteristicasTerreno
        )
      case '9.2':
        return true
      case '10':
        return Boolean(
          form.valorTerreno.trim() &&
            form.valorBenfeitorias.trim() &&
            form.fatorComercializacao.trim() &&
            (form.valorLiquidezForcada || '').trim()
        )
      case '11':
        return Boolean(
          fundamentacao.some((item) => item.grau) ||
            fundamentacaoInferencia.some((item) => item.grau) ||
            fundamentacaoEvolutivo.some((item) => item.grau) ||
            precisao.some((item) => item.grau)
        )
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
    const etapasObrigatorias: EtapaId[] = [
      '1-6', '7', '8', '9', '9.1', '10', '11', '13', '14',
    ]
    const todasConcluidas = etapasObrigatorias.every((etapa) => etapaConcluida(etapa))
    return todasConcluidas ? 'finalizado' : 'em_preenchimento'
  }

  async function uploadArquivo(file: File): Promise<string> {
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch('/api/upload', { method: 'POST', body: formData })
    if (!res.ok) throw new Error('Falha no upload')
    const { url } = await res.json()
    return url
  }

  async function executarSave(silencioso = false) {
    setSalvando(true)
    setAutoSaveStatus('saving')
    try {
      const status = obterStatusLaudo()

      // ── Helper: salva binário em chave Redis separada usando chunks ──────────
      const CHUNK_KB = 900  // cada chunk < 1MB (limite Upstash free)

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
        const chunkSize = CHUNK_KB * 1024 * (4 / 3)  // base64 chars por chunk

        if (tamanho <= chunkSize) {
          // Pequeno o suficiente para um único chunk
          const ok = await salvarChunk(chave, dado)
          return ok ? `__ref__:${chave}` : dado
        }

        // Grande: divide em chunks
        const chunks: string[] = []
        for (let i = 0; i < tamanho; i += chunkSize) {
          chunks.push(dado.slice(i, i + chunkSize))
        }

        const resultados = await Promise.all(
          chunks.map((chunk, i) => salvarChunk(`${chave}__c${i}`, chunk))
        )

        if (!resultados.every(Boolean)) {
          // Algum chunk falhou — não inclui no payload para não causar 413
          console.warn(`Falha em chunks de ${chave}, arquivo será excluído do save`)
          return ''
        }

        // Salva manifesto com número de chunks
        await salvarChunk(`${chave}__manifest`, String(chunks.length))
        return `__chunks__:${chave}:${chunks.length}`
      }

      // Salva cada foto individualmente — pula as que já têm ref salva
      const fotosComRef = await Promise.all(
        fotos.map(async (foto, i) => {
          // Já estava salva como ref — apenas restaura a referência sem re-upload
          if ((foto as any)._refKey) {
            return { legenda: foto.legenda, preview: (foto as any)._refKey }
          }
          // Nova foto (base64 local) — salva no Redis
          if (!foto.preview?.startsWith('data:')) return foto
          const chave = `foto:${laudoUuid}:${i}`
          const ref = await salvarBinario(chave, foto.preview)
          return { legenda: foto.legenda, preview: ref }
        })
      )

      // Salva croquis individualmente — pula os que já têm ref
      const croquisComRef = await Promise.all(
        (form.croquis || []).map(async (c: any, i: number) => {
          if (c._refKey) return { preview: c._refKey }
          if (!c.preview?.startsWith('data:')) return c
          const chave = `croqui:${laudoUuid}:${i}`
          const ref = await salvarBinario(chave, c.preview)
          return { preview: ref }
        })
      )

      // Salva PDFs e demais imagens — pula se não foram alterados (usa ref existente)
      async function salvarCampo(refKey: string | undefined, chave: string, dado: string): Promise<string> {
        // Se o usuário não alterou (campo ainda tem o mesmo base64 da ref carregada),
        // e temos a ref original, restaura direto sem re-upload
        if (refKey && dado && !dado.startsWith('__ref__:')) {
          // Campo foi carregado de ref mas usuário não substituiu — re-usa ref
          // Detecta: o dado veio da resolverRef (é base64) mas refKey existe = não foi alterado
          return refKey
        }
        return await salvarBinario(chave, dado)
      }

      const docPdf  = await salvarCampo(form._refDocPdf,  `anexo:${laudoUuid}:documentacaoPdf`,         form.documentacaoPdf || '')
      const locComp = await salvarCampo(form._refLocComp, `anexo:${laudoUuid}:localizacaoComparativos`, form.localizacaoComparativos || '')
      const imgBenf = await salvarCampo(form._refImgBenf, `anexo:${laudoUuid}:imagemBenfeitorias`,      form.imagemBenfeitorias || '')

      // ── Extrair fotos dos elementos CDDM para salvar como anexos separados ──
      // Evita que o payload principal ultrapasse o limite de 1MB do Redis
      let dadosCalculoCDDMSemFotos = (form as any).dadosCalculoCDDM
      if (dadosCalculoCDDMSemFotos?.elementos) {
        const elementosComRefs = await Promise.all(
          dadosCalculoCDDMSemFotos.elementos.map(async (el: any, idx: number) => {
            if (!el.foto || !el.foto.startsWith('data:')) return el
            const chave = `anexo:${laudoUuid}:cddm:foto:${idx}`
            const ref = await salvarBinario(chave, el.foto)
            return { ...el, foto: ref }
          })
        )
        dadosCalculoCDDMSemFotos = { ...dadosCalculoCDDMSemFotos, elementos: elementosComRefs }
      }

      // Substituir fotos base64 de elementosComparativos pelas refs já salvas
      const elementosComparativosParaSalvar = ((form as any).elementosComparativos || []).map((el: any, idx: number) => {
        const refFoto = dadosCalculoCDDMSemFotos?.elementos?.[idx]?.foto
        if (!refFoto && !el.foto) return el
        // Se a foto ainda é base64, usar a ref salva (ou remover se ainda não foi salva)
        const fotoFinal = el.foto?.startsWith('data:') ? (refFoto || '') : (el.foto || '')
        return { ...el, foto: fotoFinal }
      })

      const payload = {
        ...form,
        dadosCalculoCDDM: dadosCalculoCDDMSemFotos,
        elementosComparativos: elementosComparativosParaSalvar,
        valorLiquidezForcada: valorLiquidezForcadaCalc,
        tipoLaudo: 'detalhado' as const,  // forçado — laudo detalhado nunca salva como simplificado
        id: laudoUuid,
        croquis: croquisComRef,
        documentacaoPdf: docPdf,
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
        valoresAdicionais,
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

  // ── Ref que sempre aponta para o executarSave mais recente ─────────────────
  // Permite chamar o save com o form atualizado ao desmontar o componente,
  // cobrindo navegações internas do Next.js (que não disparam beforeunload).
  const saveRef = useRef<(silencioso?: boolean) => Promise<void>>(async () => {})
  useEffect(() => { saveRef.current = executarSave })

  // ── Auto-save com debounce de 2s (campos gerais) ─────────────────────────
  useEffect(() => {
    if (!formPronto || !laudoUuid) return
    const timer = setTimeout(() => { saveRef.current(true) }, 2000)
    return () => clearTimeout(timer)
  }, [form, fotos, divisoes, acabamentos, fundamentacao, fundamentacaoInferencia,
      fundamentacaoEvolutivo, precisao, resumoMercado, outrosFatoresImovel, valoresAdicionais,
      formPronto, laudoUuid])

  // ── Salva imediatamente quando empresa/solicitante muda ───────────────────
  // empresaClienteId e solicitante não esperam o debounce de 2s, pois o
  // usuário costuma navegar para "Meus laudos" logo após escolher a empresa.
  const empresaIdAnterior = useRef<string | undefined>(undefined)
  useEffect(() => {
    if (!formPronto || !laudoUuid) return
    const novoId = (form as any).empresaClienteId
    if (empresaIdAnterior.current !== undefined && empresaIdAnterior.current !== novoId) {
      saveRef.current(true)
    }
    empresaIdAnterior.current = novoId
  }, [(form as any).empresaClienteId, formPronto, laudoUuid])

  // ── Salva ao fechar a aba ─────────────────────────────────────────────────
  useEffect(() => {
    const handler = () => { saveRef.current(true) }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [])

  // ── Salva ao desmontar (navegação interna Next.js) ────────────────────────
  // Ref para o estado formPronto — usada no cleanup para evitar save com form vazio
  const formProntoRef = useRef(false)
  useEffect(() => { formProntoRef.current = formPronto }, [formPronto])

  useEffect(() => {
    return () => {
      // Só salva ao desmontar se o form foi efetivamente carregado
      if (formProntoRef.current) saveRef.current(true)
    }
  }, [])

  // ─── RENDER ───────────────────────────────────────────────────────────────────

  return (
    <AppShell>

      {/* ── STEPPER HORIZONTAL STICKY NO TOPO ── */}
      <MenuEtapas
        etapaAtual={etapaAtual}
        setEtapaAtual={setEtapaAtual}
        etapaConcluida={etapaConcluida}
        tipoLaudo={form.tipoLaudo as 'detalhado' | 'simplificado' | undefined}
        metodoAvaliacao={form.metodoAvaliacao}
        tratamentoDados={form.tratamentoDados}
      />

      {/* ── CONTEÚDO FULL-WIDTH ── */}
      <section className="mx-auto max-w-4xl px-4 sm:px-6 py-8 pb-28">

        {/* Cabeçalho compacto com ações */}
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
            <Link
              href={laudoUuid ? `/visualizar-laudo?id=${encodeURIComponent(laudoUuid)}` : '/visualizar-laudo'}
              target="_blank"
              className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm text-blue-700 hover:bg-blue-100 transition"
            >
              Visualizar laudo
            </Link>
          </div>
        </div>

        {/* ── FORMULÁRIO FULL-WIDTH ── */}
        {/* Indicador de auto-save */}
        {autoSaveStatus !== 'idle' && (
          <div className={`mb-4 text-xs px-3 py-1.5 rounded-lg w-fit ${
            autoSaveStatus === 'saving' ? 'bg-amber-50 text-amber-700' :
            autoSaveStatus === 'saved'  ? 'bg-green-50 text-green-700' :
            'bg-red-50 text-red-700'
          }`}>
            {autoSaveStatus === 'saving' ? '⏳ Salvando…' : autoSaveStatus === 'saved' ? '✓ Salvo automaticamente' : '✗ Erro ao salvar'}
          </div>
        )}

        <div className="space-y-6">

          {etapaAtual === 'cliente-status' && (
            <EtapaClienteStatus
              form={form}
              handleChange={handleChange}
              setForm={setForm}
            />
          )}

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
              tipoLaudo="detalhado"
              fatoresCDDMAtivos={(form as any).fatoresCDDMAtivos}
              toggleFatorCDDM={toggleFatorCDDM}
              tipoImovelCDDM={(form as any).tipoImovelCDDM}
              setTipoImovelCDDM={setTipoImovelCDDM}
            />
          )}

          {etapaAtual === '7' && (
            <EtapaAcabamentos
              acabamentos={acabamentos}
              handleAcabamentoChange={handleAcabamentoChange}
            />
          )}

          {etapaAtual === '8' && (
            <EtapaConsideracoesMercado
              form={form}
              handleChange={handleChange}
            />
          )}

          {etapaAtual === '9' && <EtapaGlossario />}

          {etapaAtual === '9.1' && (
            (form.metodoAvaliacao === 'evolutivo' && form.tratamentoDados === 'tratamento_por_fatores')
              ? <EtapaCalculoEvolutivo form={form} setForm={setForm} />
              : <EtapaCalculoCDDM form={form} setForm={setForm} fatoresCDDMAtivos={(form as any).fatoresCDDMAtivos} />
          )}


          {etapaAtual === '10' && (
            <EtapaValorImovel
              form={form}
              handleChange={handleChange}
              outrosFatoresImovel={outrosFatoresImovel}
              handleOutroFatorImovelChange={handleOutroFatorImovelChange}
              adicionarLinhaOutroFatorImovel={adicionarLinhaOutroFatorImovel}
              removerLinhaOutroFatorImovel={removerLinhaOutroFatorImovel}
              subtotalImovel={subtotalImovel}
              produtoOutrosFatores={produtoOutrosFatores}
              valorFinalImovel={valorFinalImovel}
              formatarMoeda={formatarMoeda}
              modoValorImovel={form.modoValorImovel as 'separado' | 'total'}
              onModoChange={(modo: 'separado' | 'total') => setForm((prev) => ({ ...prev, modoValorImovel: modo }))}
              valoresAdicionais={valoresAdicionais}
              handleValorAdicionalChange={handleValorAdicionalChange}
              adicionarValorAdicional={adicionarValorAdicional}
              removerValorAdicional={removerValorAdicional}
              somaValoresAdicionais={somaValoresAdicionais}
            />
          )}

          {etapaAtual === '11' && (
            <EtapaFundamentacaoPrecisao
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

          {etapaAtual === '13' && (
            <EtapaGarantia form={form} setForm={setForm} />
          )}

          {etapaAtual === '14' && (
            <EtapaAnexosAssinatura
              form={form}
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
              setForm={setForm}
            />
          )}

        </div>
      </section>

      {/* ── NAVEGAÇÃO STICKY NO RODAPÉ ── */}
      <NavegacaoEtapas
        etapaAtual={etapaAtual}
        setEtapaAtual={setEtapaAtual}
        tipoLaudo={form.tipoLaudo as 'detalhado' | 'simplificado' | undefined}
        metodoAvaliacao={form.metodoAvaliacao}
        tratamentoDados={form.tratamentoDados}
      />

    </AppShell>
  )
}
