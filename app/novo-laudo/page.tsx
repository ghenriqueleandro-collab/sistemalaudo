'use client'

import { buscarLaudo, definirLaudoAtual, limparLaudoAtual, obterLaudoAtual, salvarLaudo } from '@/lib/laudos-storage'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import MenuEtapas from '../components/formulario/MenuEtapas'
import NavegacaoEtapas from '../components/formulario/NavegacaoEtapas'
import Etapa01A06 from '../components/formulario/Etapa01A06'
import EtapaAcabamentos from '../components/formulario/EtapaAcabamentos'
import EtapaConsideracoesMercado from '../components/formulario/EtapaConsideracoesMercado'
import EtapaGlossario from '../components/formulario/EtapaGlossario'
import EtapaMetodologiaCalculos from '../components/formulario/EtapaMetodologiaCalculos'
import EtapaCalculoBenfeitorias from '../components/formulario/EtapaCalculoBenfeitorias'
import EtapaValorImovel from '../components/formulario/EtapaValorImovel'
import EtapaFundamentacaoPrecisao from '../components/formulario/EtapaFundamentacaoPrecisao'
import EtapaConclusao from '../components/formulario/EtapaConclusao'
import EtapaGarantia from '../components/formulario/EtapaGarantia'
import EtapaAnexosAssinatura from '../components/formulario/EtapaAnexosAssinatura'
import { EtapaId } from '../components/formulario/etapas'
import AppShell from '../components/AppShell'


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
    melhoramentosPublicos: {
      redeAgua: '',
      gasCanalizado: '',
      esgotoSanitario: '',
      esgotoPluvial: '',
      fossa: '',
      coletaLixo: '',
      lazer: '',
      redeEletrica: '',
      redeTelefonica: '',
      iluminacaoPublica: '',
      pavimentacao: '',
      passeio: '',
      guias: '',
      sarjetas: '',
    },
    endereco: '',
    liquidez: '',
    desempenhoMercado: '',
    proprietario: '',
    tipo: '',
    matricula: '',
    solicitante: '',
    idadeAparente: '',
    estadoConservacao: '',
    iptu: '',
    padrao: '',
    quantidadeDivisoes: '',
    especificacoesDivisoes: '',
    areaConstruidaTotal: '',
    areaConstruidaAverbada: '',
    areaTerrenoTotal: '',
    areaTerrenoAverbada: '',
    cidadePrincipal: '',
    distanciaCidadePrincipal: '',
    referencia1: '',
    distancia1: '',
    referencia2: '',
    distancia2: '',
    referencia3: '',
    distancia3: '',
    referencia4: '',
    distancia4: '',
    referencia5: '',
    distancia5: '',
    coordenadasImovel: '',
    terrenoEncravado: false,
    confrontacaoCursoAgua: false,
    observacoesTerrenoEncravado: '',
    observacoesConfrontacaoCursoAgua: '',
    finalidade: '',
    metodoAvaliacao: '',
    tratamentoDados: '',
    condicoesAvaliacao: '',
    croqui: '',
    croquis: [] as { preview: string }[],
    consideracoesMercado: '',
    metodologiaCalculos: '',
    periodoPesquisaInicio: '',
    periodoPesquisaFim: '',
    tipoInformacoesObtidas: '',
    quantidadeElementos: '',
    caracteristicasTerreno: '',
    imagemBenfeitorias: '',
    valorTerreno: '',
    valorBenfeitorias: '',
    valorTotal: '',
    modoValorImovel: 'separado' as 'separado' | 'total',
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
  const [etapaAtual, setEtapaAtual] = useState<EtapaId>('1-6')
const [laudoId, setLaudoId] = useState('')
const [editandoLaudoExistente, setEditandoLaudoExistente] = useState(false)
const [formPronto, setFormPronto] = useState(false)
const [salvando, setSalvando] = useState(false)
// UUID gerado uma vez na criação e reutilizado em todos os saves do mesmo laudo
const [laudoUuid, setLaudoUuid] = useState(() => crypto.randomUUID())

  // Remove base64 do payload antes de salvar no Redis.
  // Qualquer valor que comece com "data:" é base64 — substitui por string vazia.
  // Imagens e PDFs devem ser URLs do Blob (vindas de uploadArquivo).
  function limparBase64(dados: any): any {
    const isBase64 = (v: any) => typeof v === 'string' && v.startsWith('data:')
    const resultado = { ...dados }
    const camposDirectos = [
      'croqui', 'imagemBenfeitorias',
      'documentacaoPdf', 'calculoPdf', 'localizacaoComparativos',
    ]
    for (const campo of camposDirectos) {
      if (isBase64(resultado[campo])) resultado[campo] = ''
    }
    if (Array.isArray(resultado.croquis)) {
      resultado.croquis = resultado.croquis.filter((c: any) => !isBase64(c?.preview))
    }
    if (Array.isArray(resultado.fotos)) {
      resultado.fotos = resultado.fotos.filter((f: any) => !isBase64(f?.preview))
    }
    return resultado
  }

  useEffect(() => {
  if (!formPronto) return

  const timeout = setTimeout(() => {
    const dadosAutoSave = limparBase64({
      id: laudoUuid,
      ...form,
      matricula: form.matricula,
      caracteristicasTerreno:
        form.caracteristicasTerreno?.trim() ||
        `Foram coletados ${form.quantidadeElementos || 0} elementos comparativos, de porte e características o mais semelhante possível ao avaliando, com alguns fatores contemplados no cálculo.`,
      status: obterStatusLaudo(),
      atualizadoEm: new Date().toISOString(),
    })
    salvarLaudo(dadosAutoSave)
  }, 800)

  return () => clearTimeout(timeout)
}, [form, formPronto, laudoUuid])

  const exibirTabelaFatoresTerreno =
    form.metodoAvaliacao === 'comparativo' ||
    (form.metodoAvaliacao === 'evolutivo' &&
      form.tratamentoDados === 'tratamento_por_fatores')

  const exibirTabelaInferencia =
    form.tratamentoDados === 'inferencia_estatistica'

  const exibirTabelaMetodoEvolutivo = form.metodoAvaliacao === 'evolutivo'

  useEffect(() => {
    const isNovo = window.location.pathname.includes('novo-laudo')
  async function carregarLaudoParaEdicao() {
    try {
      
      const url = new URL(window.location.href)
const modo = url.searchParams.get('modo')
const idParam = url.searchParams.get('id')
const laudoSalvo = modo === 'novo' ? null : (idParam ? await buscarLaudo(idParam) : await obterLaudoAtual())

if (!laudoSalvo) {
  setEditandoLaudoExistente(false)
  setLaudoId('')
  setFormPronto(true)
  return
}

      setEditandoLaudoExistente(true)
      setLaudoId(String(laudoSalvo.matricula || laudoSalvo.id || '').trim())
      // Restaura o UUID original do laudo para não criar duplicata ao salvar
      if (laudoSalvo.id) setLaudoUuid(laudoSalvo.id)

      setForm((prev) => ({
        ...prev,
        ...laudoSalvo,
        melhoramentosPublicos: laudoSalvo.melhoramentosPublicos || prev.melhoramentosPublicos,
        croquis: laudoSalvo.croquis || [],
      }))

      setFatoresSelecionados(laudoSalvo.fatoresSelecionados || [])
      setFundamentacao(
        laudoSalvo.fundamentacao || [
          { item: 1, grau: '', pontos: 2 },
          { item: 2, grau: '', pontos: 2 },
          { item: 3, grau: '', pontos: 2 },
          { item: 4, grau: '', pontos: 2 },
        ]
      )
      setFundamentacaoInferencia(
        laudoSalvo.fundamentacaoInferencia || [
          { item: 1, grau: '', pontos: 0 },
          { item: 2, grau: '', pontos: 0 },
          { item: 3, grau: '', pontos: 0 },
          { item: 4, grau: '', pontos: 0 },
          { item: 5, grau: '', pontos: 0 },
          { item: 6, grau: '', pontos: 0 },
        ]
      )
      setFundamentacaoEvolutivo(
        laudoSalvo.fundamentacaoEvolutivo || [
          { item: 1, grau: '', pontos: 0 },
          { item: 2, grau: '', pontos: 0 },
          { item: 3, grau: '', pontos: 0 },
        ]
      )
      setPrecisao(laudoSalvo.precisao || [{ item: 1, grau: '', pontos: 0 }])
      setDivisoes(laudoSalvo.divisoes || [{ quantidade: '1', ambiente: '' }])
      setAcabamentos(laudoSalvo.acabamentos || [{ ambiente: '', acabamento: '' }])
      setResumoMercado(laudoSalvo.resumoMercado || [{ campo: '', descricao: '' }])
      setOutrosFatoresImovel(laudoSalvo.outrosFatoresImovel || [{ descricao: '', valor: '' }])
      setFotos(laudoSalvo.fotos || [])

      setUsarCidadeReferencia(
        Boolean(laudoSalvo.cidadePrincipal || laudoSalvo.distanciaCidadePrincipal)
      )
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
      return
    }

    const camposArea = [
      'areaConstruidaTotal',
      'areaConstruidaAverbada',
      'areaTerrenoTotal',
      'areaTerrenoAverbada',
    ]

    if (camposArea.includes(name)) {
  setForm({
    ...form,
    [name]: formatarAreaInput(removerMetroQuadrado(value)),
  })
  return
}

if (name === 'quantidadeElementos') {
  setForm({
    ...form,
    quantidadeElementos: value,
    caracteristicasTerreno: `Foram coletados ${value || 0} elementos comparativos, de porte e características o mais semelhante possível ao avaliando, com alguns fatores contemplados no cálculo.`,
  })
  return
}

setForm({ ...form, [name]: value })
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

  function carregarImagem(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = src
    })
  }

  function dataURLParaFile(dataUrl: string, nomeArquivo: string): File {
    const arr = dataUrl.split(',')
    const mimeMatch = arr[0].match(/:(.*?);/)
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg'
    const bstr = atob(arr[1])
    let n = bstr.length
    const u8arr = new Uint8Array(n)

    while (n--) {
      u8arr[n] = bstr.charCodeAt(n)
    }

    return new File([u8arr], nomeArquivo, { type: mime })
  }

  async function comprimirImagem(
    file: File,
    maxLargura = 1600,
    qualidade = 0.75
  ): Promise<{ file: File; preview: string }> {
    const originalUrl = URL.createObjectURL(file)

    try {
      const img = await carregarImagem(originalUrl)
      let { width, height } = img

      if (width > maxLargura) {
        height = Math.round((height * maxLargura) / width)
        width = maxLargura
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Não foi possível comprimir a imagem.')

      ctx.drawImage(img, 0, 0, width, height)

      const preview = canvas.toDataURL('image/jpeg', qualidade)
      const nomeSemExtensao = file.name.replace(/\.[^/.]+$/, '')
      const arquivoComprimido = dataURLParaFile(preview, `${nomeSemExtensao}.jpg`)

      return { file: arquivoComprimido, preview }
    } finally {
      URL.revokeObjectURL(originalUrl)
    }
  }

  // ─── Upload para Vercel Blob ─────────────────────────────────────────────
  // Envia o arquivo para a API e retorna a URL pública permanente.
  // Assim nenhum base64 é salvo no Redis — apenas URLs pequenas.
  async function uploadArquivo(file: File): Promise<string> {
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch('/api/upload', { method: 'POST', body: formData })
    if (!res.ok) throw new Error('Erro ao fazer upload do arquivo.')
    const { url } = await res.json()
    return url
  }

  async function handleFotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return

    try {
      // Processa sequencialmente para evitar sobrecarga no servidor
      const novasFotos: { preview: string; legenda: string }[] = []
      for (const file of files) {
        const comprimida = await comprimirImagem(file, 1600, 0.75)
        const url = await uploadArquivo(comprimida.file)
        novasFotos.push({
          preview: url,
          legenda: file.name.replace(/\.[^/.]+$/, ''),
        })
      }

      setFotos((prev) => [...prev, ...novasFotos])
      e.target.value = ''
    } catch (error) {
      console.error(error)
      alert('Erro ao fazer upload de uma ou mais imagens.')
    }
  }

  function handleLegenda(index: number, valor: string) {
    const novasFotos = [...fotos]
    novasFotos[index].legenda = valor
    setFotos(novasFotos)
  }

  function removerFoto(index: number) {
    setFotos((fotosAnteriores) => fotosAnteriores.filter((_, i) => i !== index))
  }

  function reordenarFotos(origem: number, destino: number) {
  setFotos((fotosAnteriores) => {
    const novasFotos = [...fotosAnteriores]

    const fotoOrigem = novasFotos[origem]
    const fotoDestino = novasFotos[destino]

    novasFotos[origem] = fotoDestino
    novasFotos[destino] = fotoOrigem

    return novasFotos
  })
}

  function handleDivisaoChange(
    index: number,
    campo: 'quantidade' | 'ambiente',
    valor: string
  ) {
    const novaLista = [...divisoes]
    novaLista[index][campo] = valor
    setDivisoes(novaLista)

    if (campo === 'ambiente') sincronizarAcabamentosComDivisoes(novaLista)
  }

  function adicionarLinhaDivisao() {
    const novaLista = [...divisoes, { quantidade: '1', ambiente: '' }]
    setDivisoes(novaLista)
    sincronizarAcabamentosComDivisoes(novaLista)
  }

  function removerLinhaDivisao(index: number) {
    const novaLista = divisoes.filter((_, i) => i !== index)
    const listaFinal = novaLista.length > 0 ? novaLista : [{ quantidade: '1', ambiente: '' }]
    setDivisoes(listaFinal)
    sincronizarAcabamentosComDivisoes(listaFinal)
  }

  function sincronizarAcabamentosComDivisoes(listaDivisoes: { quantidade: string; ambiente: string }[]) {
    setAcabamentos((anterior) => {
      return listaDivisoes.map((divisao, index) => ({
        ambiente: divisao.quantidade && divisao.ambiente ? `${divisao.quantidade} ${divisao.ambiente}` : '',
        acabamento: anterior[index]?.acabamento || '',
      }))
    })
  }

  function handleAcabamentoChange(index: number, valor: string) {
    const novaLista = [...acabamentos]
    novaLista[index].acabamento = valor
    setAcabamentos(novaLista)
  }

  function handleOutroFatorImovelChange(
    index: number,
    campo: 'descricao' | 'valor',
    valor: string
  ) {
    const novaLista = [...outrosFatoresImovel]
    novaLista[index][campo] = valor
    setOutrosFatoresImovel(novaLista)
  }

  function adicionarLinhaOutroFatorImovel() {
    setOutrosFatoresImovel([...outrosFatoresImovel, { descricao: '', valor: '' }])
  }

  function removerLinhaOutroFatorImovel(index: number) {
    const novaLista = outrosFatoresImovel.filter((_, i) => i !== index)
    setOutrosFatoresImovel(novaLista.length > 0 ? novaLista : [{ descricao: '', valor: '' }])
  }

  function selecionarGrauFundamentacao(index: number, grau: 'III' | 'II' | 'I') {
    const novaLista = [...fundamentacao]
    let pontos = 0
    if (grau === 'III') pontos = 3
    if (grau === 'II') pontos = 2
    if (grau === 'I') pontos = 1
    novaLista[index] = { ...novaLista[index], grau, pontos }
    setFundamentacao(novaLista)
  }

  function selecionarGrauFundamentacaoInferencia(index: number, grau: 'III' | 'II' | 'I') {
    const novaLista = [...fundamentacaoInferencia]
    let pontos = 0
    if (grau === 'III') pontos = 3
    if (grau === 'II') pontos = 2
    if (grau === 'I') pontos = 1
    novaLista[index] = { ...novaLista[index], grau, pontos }
    setFundamentacaoInferencia(novaLista)
  }

  function selecionarGrauFundamentacaoEvolutivo(index: number, grau: 'III' | 'II' | 'I') {
    const novaLista = [...fundamentacaoEvolutivo]
    let pontos = 0
    if (grau === 'III') pontos = 3
    if (grau === 'II') pontos = 2
    if (grau === 'I') pontos = 1
    novaLista[index] = { ...novaLista[index], grau, pontos }
    setFundamentacaoEvolutivo(novaLista)
  }

  function selecionarGrauPrecisao(index: number, grau: 'III' | 'II' | 'I') {
    const novaLista = [...precisao]
    let pontos = 0
    if (grau === 'III') pontos = 3
    if (grau === 'II') pontos = 2
    if (grau === 'I') pontos = 1
    novaLista[index] = { ...novaLista[index], grau, pontos }
    setPrecisao(novaLista)
  }

  function converterNumero(valor: string) {
    if (!valor) return 0
    return Number(valor.replace(/\s/g, '').replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '')) || 0
  }

  function formatarMoeda(valor: number) {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  function formatarAreaInput(valor: string) {
    const limpo = valor.replace(/[^\d,.-]/g, '').trim()
    if (!limpo) return ''
    return `${limpo} m²`
  }

  function removerMetroQuadrado(valor: string) {
    return valor.replace(/m²/g, '').trim()
  }

  useEffect(() => {
    if (!exibirTabelaFatoresTerreno) {
      setFundamentacao([
        { item: 1, grau: '', pontos: 0 },
        { item: 2, grau: '', pontos: 0 },
        { item: 3, grau: '', pontos: 0 },
        { item: 4, grau: '', pontos: 0 },
      ])
    }

    if (!exibirTabelaInferencia) {
      setFundamentacaoInferencia([
        { item: 1, grau: '', pontos: 0 },
        { item: 2, grau: '', pontos: 0 },
        { item: 3, grau: '', pontos: 0 },
        { item: 4, grau: '', pontos: 0 },
        { item: 5, grau: '', pontos: 0 },
        { item: 6, grau: '', pontos: 0 },
      ])
    }

    if (!exibirTabelaMetodoEvolutivo) {
      setFundamentacaoEvolutivo([
        { item: 1, grau: '', pontos: 0 },
        { item: 2, grau: '', pontos: 0 },
        { item: 3, grau: '', pontos: 0 },
      ])
    }
  }, [exibirTabelaFatoresTerreno, exibirTabelaInferencia, exibirTabelaMetodoEvolutivo])

  const valorTerrenoNumero = converterNumero(form.valorTerreno)
  const valorBenfeitoriasNumero = converterNumero(form.valorBenfeitorias)
  const valorTotalNumero = converterNumero(form.valorTotal)
  const fatorComercializacaoNumero = converterNumero(form.fatorComercializacao)
  const areaConstruidaTotalNumero = converterNumero(form.areaConstruidaTotal)
  const areaConstruidaAverbadaNumero = converterNumero(form.areaConstruidaAverbada)
  const areaTerrenoTotalNumero = converterNumero(form.areaTerrenoTotal)
  const areaTerrenoAverbadaNumero = converterNumero(form.areaTerrenoAverbada)

  const areaConstruidaNaoAverbada = Math.max(areaConstruidaTotalNumero - areaConstruidaAverbadaNumero, 0)
  const areaTerrenoNaoAverbada = Math.max(areaTerrenoTotalNumero - areaTerrenoAverbadaNumero, 0)
  const somaFundamentacao = fundamentacao.reduce((total, item) => (item.grau ? total + item.pontos : total), 0)
  const somaFundamentacaoInferencia = fundamentacaoInferencia.reduce((total, item) => (item.grau ? total + item.pontos : total), 0)
  const somaFundamentacaoEvolutivo = fundamentacaoEvolutivo.reduce((total, item) => (item.grau ? total + item.pontos : total), 0)
  const produtoOutrosFatores = outrosFatoresImovel.reduce((total, item) => total * (converterNumero(item.valor) || 1), 1)
  const baseCalculo = form.modoValorImovel === 'total'
    ? valorTotalNumero
    : (valorTerrenoNumero + valorBenfeitoriasNumero)
  const subtotalImovel = baseCalculo * fatorComercializacaoNumero
  const valorFinalImovel = subtotalImovel * produtoOutrosFatores

  async function handleCroqui(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return

    try {
      const novosCroquis = await Promise.all(
        files.map(async (file) => {
          const comprimida = await comprimirImagem(file, 1600, 0.75)
          const url = await uploadArquivo(comprimida.file)
          return { preview: url }
        })
      )

      setForm((prev) => ({
        ...prev,
        croquis: [...(prev.croquis || []), ...novosCroquis],
        croqui: prev.croqui || novosCroquis[0]?.preview || '',
      }))

      e.target.value = ''
    } catch (error) {
      console.error(error)
      alert('Erro ao fazer upload de uma ou mais imagens do croqui.')
    }
  }

  async function handleImagemBenfeitorias(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const url = await uploadArquivo(file)
      setForm((prev) => ({ ...prev, imagemBenfeitorias: url }))
    } catch (error) {
      console.error(error)
      alert('Erro ao fazer upload da imagem das benfeitorias.')
    }
  }

  function removerCroqui(index: number) {
    setForm((prev) => {
      const novosCroquis = (prev.croquis || []).filter((_: any, i: number) => i !== index)
      return { ...prev, croquis: novosCroquis, croqui: novosCroquis[0]?.preview || '' }
    })
  }

  async function handlePdfUpload(e: React.ChangeEvent<HTMLInputElement>, campo: 'documentacaoPdf' | 'calculoPdf') {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const url = await uploadArquivo(file)
      setForm((prev) => ({ ...prev, [campo]: url }))
    } catch (error) {
      console.error(error)
      alert('Erro ao fazer upload do PDF.')
    }
  }

  async function handleLocalizacaoComparativos(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const url = await uploadArquivo(file)
      setForm((prev) => ({ ...prev, localizacaoComparativos: url }))
    } catch (error) {
      console.error(error)
      alert('Erro ao fazer upload da imagem de localização.')
    }
  }

  function formatarDataBR(data: string) {
    if (!data) return ''
    const [ano, mes, dia] = data.split('-')
    return `${dia}/${mes}/${ano}`
  }

  function toggleFator(fator: string) {
    setFatoresSelecionados((prev) => (prev.includes(fator) ? prev.filter((f) => f !== fator) : [...prev, fator]))
  }

  function etapaConcluida(etapa: EtapaId) {
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
      case '7':
        return acabamentos.some((item) => item.acabamento.trim())
      case '8':
        return Boolean(form.consideracoesMercado.trim())
      case '9':
        return true
      case '9.1':
        return Boolean(form.periodoPesquisaInicio && form.periodoPesquisaFim && form.tipoInformacoesObtidas && form.caracteristicasTerreno)
      case '9.2':
        return Boolean(form.imagemBenfeitorias)
      case '10':
  return Boolean(
    form.modoValorImovel === 'total'
      ? (form.valorTotal || '').trim() && form.fatorComercializacao.trim()
      : form.valorTerreno.trim() && form.valorBenfeitorias.trim() && form.fatorComercializacao.trim()
  )
      case '11':
        return Boolean(
          fundamentacao.some((item) => item.grau) ||
            fundamentacaoInferencia.some((item) => item.grau) ||
            fundamentacaoEvolutivo.some((item) => item.grau) ||
            precisao.some((item) => item.grau)
        )
      case '12':
        return valorFinalImovel > 0
      case '13':
        return Boolean(form.garantiaClassificacao)
      case '14':
        return Boolean(form.dataLaudo && form.responsavelNome.trim() && form.responsavelCpf.trim() && form.responsavelRegistro.trim())
      default:
        return false
    }
  }

  function obterStatusLaudo(): 'em_preenchimento' | 'finalizado' {
  const etapasObrigatorias: EtapaId[] = [
    '1-6',
    '7',
    '8',
    '9',
    '9.1',
    '9.2',
    '10',
    '11',
    '12',
    '13',
    '14',
  ]

  const todasConcluidas = etapasObrigatorias.every((etapa) => etapaConcluida(etapa))
  return todasConcluidas ? 'finalizado' : 'em_preenchimento'
}

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!form.garantiaClassificacao) {
      alert('Selecione a classificação da garantia.')
      return
    }

    if ((form.garantiaClassificacao === 'observacoes' || form.garantiaClassificacao === 'negativa') && !form.garantiaObservacoes.trim()) {
      alert('Preencha as observações da garantia.')
      return
    }

    const formAjustado = {
      ...form,
      cidadePrincipal: usarCidadeReferencia ? form.cidadePrincipal : '',
      distanciaCidadePrincipal: usarCidadeReferencia ? form.distanciaCidadePrincipal : '',
      caracteristicasTerreno:
        form.caracteristicasTerreno?.trim() ||
        `Foram coletados ${form.quantidadeElementos || 0} elementos comparativos, de porte e características o mais semelhante possível ao avaliando, com alguns fatores contemplados no cálculo.`,
    }

    const dadosLaudo = {
      ...formAjustado,
      divisoes,
      fatoresSelecionados,
      melhoramentosPublicos: form.melhoramentosPublicos,
      croquis: form.croquis,
      areaConstruidaNaoAverbada,
      areaTerrenoNaoAverbada,
      acabamentos,
      resumoMercado,
      outrosFatoresImovel,
      valorFinalImovel,
      fundamentacao,
      fundamentacaoInferencia,
      precisao,
      fundamentacaoEvolutivo,
      fotos: fotos.map((foto) => ({ preview: foto.preview, legenda: foto.legenda })),
    }

    const matricula = String(form.matricula || '').trim()

if (!matricula) {
  alert('Preencha a matrícula do imóvel antes de salvar.')
  return
}

try {
  setSalvando(true)

  const dadosParaSalvar = limparBase64({
    id: laudoUuid,   // UUID único — nunca colide com outro laudo
    ...dadosLaudo,
    matricula,       // Matrícula é só um campo de texto, não o ID
    status: obterStatusLaudo(),
    atualizadoEm: new Date().toISOString(),
  })

  const idSalvo = await salvarLaudo(dadosParaSalvar)

  if (!idSalvo) {
    alert('Erro ao salvar o laudo. Verifique sua conexão e tente novamente.')
    return
  }

  await definirLaudoAtual(idSalvo)
  window.open('/visualizar-laudo?id=' + encodeURIComponent(laudoUuid), '_blank')
} catch (error) {
  console.error(error)
  alert('Erro ao salvar o laudo.')
} finally {
  setSalvando(false)
}
  }

  return (
    <AppShell>
      <section className="mx-auto max-w-7xl px-6 pb-16 pt-10 lg:px-10 lg:pt-14">
      <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.45)] lg:p-8 mb-8">
  <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
    <div>
      <div className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-400">
        elaboração do laudo
      </div>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">
        Novo laudo
      </h1>
    </div>

    <div className="flex flex-wrap gap-3">
  <Link href="/" className="rounded-2xl border px-4 py-2 text-sm">
    Início
  </Link>

  <Link href="/meus-laudos" className="rounded-2xl border px-4 py-2 text-sm">
    Meus laudos
  </Link>

  <button
    type="button"
    onClick={async () => {
      await limparLaudoAtual()
      window.location.href = '/novo-laudo?modo=novo'
    }}
    className="rounded-2xl border px-4 py-2 text-sm"
  >
    Novo laudo em branco
  </button>

  <Link
    href="/visualizar-laudo"
    className="rounded-2xl border bg-blue-50 px-4 py-2 text-sm text-blue-700"
  >
    Visualizar laudo
  </Link>
</div>
  </div>
</div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <MenuEtapas etapaAtual={etapaAtual} setEtapaAtual={setEtapaAtual} etapaConcluida={etapaConcluida} />

        <div className="flex-1 w-full">
          <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow space-y-6">
            {etapaAtual === '1-6' && (
              <Etapa01A06
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
              />
            )}

            {etapaAtual === '7' && <EtapaAcabamentos acabamentos={acabamentos} handleAcabamentoChange={handleAcabamentoChange} />}
            {etapaAtual === '8' && <EtapaConsideracoesMercado form={form} handleChange={handleChange} />}
            {etapaAtual === '9' && <EtapaGlossario />}
            {etapaAtual === '9.1' && (
              <EtapaMetodologiaCalculos
                form={form}
                handleChange={handleChange}
                fatoresDisponiveis={fatoresDisponiveis}
                fatoresSelecionados={fatoresSelecionados}
                toggleFator={toggleFator}
              />
            )}
            {etapaAtual === '9.2' && <EtapaCalculoBenfeitorias form={form} handleImagemBenfeitorias={handleImagemBenfeitorias} />}
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
                modoValorImovel={form.modoValorImovel || 'separado'}
                onModoChange={(modo) => setForm((prev: any) => ({ ...prev, modoValorImovel: modo }))}
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
            {etapaAtual === '12' && <EtapaConclusao valorFinalImovel={valorFinalImovel} formatarMoeda={formatarMoeda} />}
            {etapaAtual === '13' && <EtapaGarantia form={form} setForm={setForm} />}
            {etapaAtual === '14' && (
              <EtapaAnexosAssinatura
  form={form}
  handleChange={handleChange}
  formatarDataBR={formatarDataBR}
  handlePdfUpload={handlePdfUpload}
  handleLocalizacaoComparativos={handleLocalizacaoComparativos}
  handleFotos={handleFotos}
  fotos={fotos}
  handleLegenda={handleLegenda}
  onRemoverFoto={removerFoto}
  onReordenarFotos={reordenarFotos}
/>
            )}

            <NavegacaoEtapas etapaAtual={etapaAtual} setEtapaAtual={setEtapaAtual} />

            <div className="pt-4 border-t">
              <button
                disabled={salvando}
                className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {salvando ? 'Salvando...' : 'Salvar Laudo'}
              </button>
            </div>
          </form>
        </div>
      </div>
      </section>
    </AppShell>
  )
}
