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
    coordenadasImovel: '',
    endereco: '',
    proprietario: '',
    solicitante: '',
    tipo: '',
    finalidade: '',
    metodoAvaliacao: '',
    tratamentoDados: '',
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
  const [modoValorImovel, setModoValorImovel] = useState<'separado' | 'total'>('separado')
  const [etapaAtual, setEtapaAtual] = useState<EtapaId>('1-6')
  const [laudoId, setLaudoId] = useState('')
  const [editandoLaudoExistente, setEditandoLaudoExistente] = useState(false)
  const [formPronto, setFormPronto] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [laudoUuid, setLaudoUuid] = useState(() => crypto.randomUUID())

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
          setFormPronto(true)
          return
        }

        setEditandoLaudoExistente(true)
        setLaudoId(String(laudoSalvo.matricula || laudoSalvo.id || '').trim())
        if (laudoSalvo.id) setLaudoUuid(laudoSalvo.id)

        setForm((prev) => ({
          ...prev,
          ...laudoSalvo,
          melhoramentosPublicos: laudoSalvo.melhoramentosPublicos || prev.melhoramentosPublicos,
          croquis: laudoSalvo.croquis || [],
        }))

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
        setFotos(laudoSalvo.fotos || [])
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

  function handleCroqui(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    const novosCroquis = files.map((file) => ({ preview: URL.createObjectURL(file) }))
    setForm((prev) => ({ ...prev, croquis: [...(prev.croquis || []), ...novosCroquis] }))
  }

  function removerCroqui(index: number) {
    setForm((prev) => ({ ...prev, croquis: prev.croquis.filter((_: any, i: number) => i !== index) }))
  }

  async function handleImagemBenfeitorias(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const url = await uploadArquivo(file)
      setForm((prev) => ({ ...prev, imagemBenfeitorias: url }))
    } catch (error) {
      console.error(error)
      alert('Erro ao fazer upload da imagem.')
    }
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

  function handleFotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    const novasFotos = files.map((file) => ({ preview: URL.createObjectURL(file), legenda: '' }))
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

  function selecionarGrauFundamentacao(item: number, grau: 'III' | 'II' | 'I') {
    setFundamentacao((prev) => prev.map((f) => f.item === item ? { ...f, grau } : f))
  }

  function selecionarGrauFundamentacaoInferencia(item: number, grau: 'III' | 'II' | 'I') {
    setFundamentacaoInferencia((prev) => prev.map((f) => f.item === item ? { ...f, grau } : f))
  }

  function selecionarGrauFundamentacaoEvolutivo(item: number, grau: 'III' | 'II' | 'I') {
    setFundamentacaoEvolutivo((prev) => prev.map((f) => f.item === item ? { ...f, grau } : f))
  }

  function selecionarGrauPrecisao(item: number, grau: 'III' | 'II' | 'I') {
    setPrecisao((prev) => prev.map((p) => p.item === item ? { ...p, grau } : p))
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

  const subtotalImovel =
    (parseFloat((form.valorTerreno || '0').replace(',', '.')) +
      parseFloat((form.valorBenfeitorias || '0').replace(',', '.'))) *
    produtoOutrosFatores

  const valorFinalImovel =
    subtotalImovel * parseFloat((form.fatorComercializacao || '1').replace(',', '.'))

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
        return Boolean(
          form.periodoPesquisaInicio &&
            form.periodoPesquisaFim &&
            form.tipoInformacoesObtidas &&
            form.caracteristicasTerreno
        )
      case '9.2':
        return Boolean(form.imagemBenfeitorias)
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
    const etapasObrigatorias: EtapaId[] = [
      '1-6', '7', '8', '9', '9.1', '9.2', '10', '11', '12', '13', '14',
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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!form.garantiaClassificacao) {
      alert('Selecione a classificação da garantia.')
      return
    }

    setSalvando(true)
    try {
      const status = obterStatusLaudo()
      const payload = {
        ...form,
        id: laudoUuid,
        fatoresSelecionados,
        fundamentacao,
        fundamentacaoInferencia,
        fundamentacaoEvolutivo,
        precisao,
        divisoes,
        acabamentos,
        resumoMercado,
        outrosFatoresImovel,
        fotos,
        status,
        atualizadoEm: new Date().toISOString(),
      }

      const idSalvo = await salvarLaudo(payload)

      if (!idSalvo) {
        alert('Verifique sua conexão e tente novamente.')
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

  // ─── RENDER ───────────────────────────────────────────────────────────────────

  return (
    <AppShell>

      {/* ── STEPPER HORIZONTAL STICKY NO TOPO ── */}
      <MenuEtapas
        etapaAtual={etapaAtual}
        setEtapaAtual={setEtapaAtual}
        etapaConcluida={etapaConcluida}
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
              href="/"
              className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 transition"
            >
              Início
            </Link>

            <Link
              href="/meus-laudos"
              className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 transition"
            >
              Meus laudos
            </Link>

            <button
              type="button"
              onClick={async () => {
                await limparLaudoAtual()
                window.location.href = '/novo-laudo?modo=novo'
              }}
              className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 transition"
            >
              Novo laudo em branco
            </button>

            <Link
              href="/visualizar-laudo"
              className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm text-blue-700 hover:bg-blue-100 transition"
            >
              Visualizar laudo
            </Link>
          </div>
        </div>

        {/* ── FORMULÁRIO FULL-WIDTH ── */}
        <form onSubmit={handleSubmit} className="space-y-6">

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
            <EtapaMetodologiaCalculos
              form={form}
              handleChange={handleChange}
              fatoresDisponiveis={fatoresDisponiveis}
              fatoresSelecionados={fatoresSelecionados}
              toggleFator={toggleFator}
            />
          )}

          {etapaAtual === '9.2' && (
            <EtapaCalculoBenfeitorias
              form={form}
              handleImagemBenfeitorias={handleImagemBenfeitorias}
            />
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
              modoValorImovel={modoValorImovel}
              onModoChange={(modo: 'separado' | 'total') => setModoValorImovel(modo)}
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

          {etapaAtual === '12' && (
            <EtapaConclusao
              valorFinalImovel={valorFinalImovel}
              formatarMoeda={formatarMoeda}
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
              handleFotos={handleFotos}
              fotos={fotos}
              handleLegenda={handleLegenda}
              onRemoverFoto={removerFoto}
              onReordenarFotos={reordenarFotos}
            />
          )}

          {/* Botão salvar */}
          <div className="pt-4 border-t border-slate-200">
            <button
              disabled={salvando}
              className="w-full sm:w-auto rounded-xl bg-blue-600 text-white px-6 py-2.5 text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
            >
              {salvando ? 'Salvando...' : 'Salvar Laudo'}
            </button>
          </div>

        </form>
      </section>

      {/* ── NAVEGAÇÃO STICKY NO RODAPÉ ── */}
      <NavegacaoEtapas
        etapaAtual={etapaAtual}
        setEtapaAtual={setEtapaAtual}
      />

    </AppShell>
  )
}
