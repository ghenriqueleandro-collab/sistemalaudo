/**
 * SALVAR EM: src/app/meus-laudos/page.tsx
 *
 * Atualizado: botão "Novo laudo" e modal de criação migrados de agendamentos/page.tsx.
 * Perfil agendador removido — todos os usuários autenticados podem criar laudos.
 */

'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import AppShell from '../components/AppShell'
import {
  filtrarLaudos,
  formatarStatusAcompanhamento,
  listarLaudos,
  type LaudoResumo,
  type StatusAcompanhamento,
} from '../../lib/laudos-storage'

// ─── Tipos ────────────────────────────────────────────────────────────────────


// ─── Status de acompanhamento ────────────────────────────────────────────────

const acompanhamentoConfig: Record<StatusAcompanhamento, { classe: string; dot: string }> = {
  levantamento_documentos: { classe: 'bg-amber-50 text-amber-700',   dot: 'bg-amber-400' },
  atuando_vistoria:        { classe: 'bg-purple-50 text-purple-700', dot: 'bg-purple-400' },
  atuando_pesquisa:        { classe: 'bg-blue-50 text-blue-700',     dot: 'bg-blue-400' },
  concluido:               { classe: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-400' },
}

const ORDEM_STATUS: StatusAcompanhamento[] = [
  'levantamento_documentos',
  'atuando_vistoria',
  'atuando_pesquisa',
  'concluido',
]

const statusVistoriaLabel: Record<string, string> = {
  aguardando_agendamento: 'Aguardando agendamento',
  agendada:               'Vistoria agendada',
  realizada:              'Vistoria realizada',
  fotos_disponiveis:      'Fotos disponíveis',
  finalizado:             'Finalizado',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function haversineMetros(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000
  const toRad = (v: number) => (v * Math.PI) / 180
  const dLat = toRad(lat2 - lat1); const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2
  return R * 2 * Math.asin(Math.sqrt(a))
}

function formatarDistancia(m: number) {
  return m < 1000 ? `${Math.round(m)} m` : `${(m/1000).toFixed(1).replace('.', ',')} km`
}

function formatarData(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR')
}

const statusLabel: Record<string, string> = {
  em_preenchimento: 'Em preenchimento',
  finalizado: 'Finalizado',
}

const statusVistoriaLabel: Record<string, string> = {
  aguardando_agendamento: 'Aguardando agendamento',
  agendada: 'Vistoria agendada',
  realizada: 'Vistoria realizada',
  fotos_disponiveis: 'Fotos disponíveis',
  finalizado: 'Finalizado',
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function MeusLaudosPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  // Estado de lista
  const [laudos, setLaudos] = useState<LaudoResumo[]>([])
  const [empresas, setEmpresas] = useState<{ id: string; nome: string }[]>([])
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroAcomp, setFiltroAcomp] = useState<StatusAcompanhamento | ''>('')

  // Estado do modal de criação
  const [mostrarModal, setMostrarModal] = useState(false)
  const [criandoLaudo, setCriandoLaudo] = useState(false)
  const [buscandoCoords, setBuscandoCoords] = useState(false)
  const [msgCoords, setMsgCoords] = useState<{tipo:'ok'|'erro';texto:string}|null>(null)

  const estadoInicialNovoLaudo = {
    tipoLaudo: 'detalhado' as 'detalhado' | 'simplificado',
    tipoImovelCDDM: '' as '' | 'isolado' | 'fracao',
    areaComum: '',
    areaTotal: '',
    fracaoIdeal: '',
    fatoresCDDMAtivos: { local: true, padrao: true, foc: true, andar: true, vaga: true },
    coordenadasImovel: '',
    endereco: '',
    proprietario: '',
    solicitante: '',
    empresaClienteId: '',
    tipo: '',
    finalidade: '',
    areaConstruidaTotal: '',
    areaConstruidaAverbada: '',
    areaTerrenoTotal: '',
    areaTerrenoAverbada: '',
    matricula: '',
    iptu: '',
    referencia1: '', distancia1: '',
    referencia2: '', distancia2: '',
    referencia3: '', distancia3: '',
    referencia4: '', distancia4: '',
    referencia5: '', distancia5: '',
  }

  const [novoLaudo, setNovoLaudo] = useState(estadoInicialNovoLaudo)

  function setField(name: string, value: string) {
    setNovoLaudo((prev) => ({ ...prev, [name]: value }))
  }

  // ─── Efeitos ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/')
  }, [status])

  useEffect(() => {
    if (status === 'authenticated') {
      carregarDados()
      const intervalo = setInterval(carregarDados, 15_000)
      return () => clearInterval(intervalo)
    }
  }, [status, carregarDados])

  // ─── Funções de dados ────────────────────────────────────────────────────

  const carregarDados = useCallback(async () => {
    try {
      const [dadosLaudos, resEmpresas] = await Promise.all([
        listarLaudos(),
        fetch('/api/empresas', { cache: 'no-store' }),
      ])
      const dadosEmpresas = await resEmpresas.json()
      setLaudos(dadosLaudos)
      setEmpresas((dadosEmpresas || []).filter(Boolean))
    } finally {
      setCarregando(false)
    }
  }, [])

  // ─── Geocodificação ──────────────────────────────────────────────────────

  async function buscarCoordenadas() {
    const raw = novoLaudo.coordenadasImovel.trim()
    const match = raw.match(/(-?\d+[.,]?\d*)[,\s]+(-?\d+[.,]?\d*)/)
    if (!match) {
      setMsgCoords({ tipo: 'erro', texto: 'Formato inválido. Use: -23.550520, -46.633308' })
      return
    }
    const lat = parseFloat(match[1].replace(',', '.'))
    const lng = parseFloat(match[2].replace(',', '.'))
    setBuscandoCoords(true)
    setMsgCoords(null)
    try {
      const campos: Record<string, string> = {}
      // Reverse geocoding via Nominatim
      const resGeo = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
        { headers: { 'Accept-Language': 'pt-BR' } }
      )
      if (resGeo.ok) {
        const geo = await resGeo.json()
        const a = geo.address || {}
        const logradouro = [a.road, a.house_number].filter(Boolean).join(', ')
        const bairro = a.suburb || a.neighbourhood || a.quarter || ''
        const cidade = a.city || a.town || a.village || ''
        const estado = a.state_code || a.state || ''
        const cep = a.postcode || ''
        if (logradouro) campos['endereco'] = [logradouro, bairro, cidade, estado, cep].filter(Boolean).join(', ')
      }
      // Pontos de referência via Overpass
      try {
        const delta = 0.015
        const bbox = `${lat - delta},${lng - delta},${lat + delta},${lng + delta}`
        const query = `[out:json][timeout:10];(node["amenity"](${bbox});node["shop"](${bbox});node["highway"="bus_stop"](${bbox}););out body;`
        const resOv = await fetch('https://overpass-api.de/api/interpreter', {
          method: 'POST', body: query,
          headers: { 'Content-Type': 'text/plain' }
        })
        if (resOv.ok) {
          const ov = await resOv.json()
          const pontos = (ov.elements || [])
            .filter((el: any) => el.tags?.name)
            .map((el: any) => ({
              nome: el.tags.name,
              dist: haversineMetros(lat, lng, el.lat, el.lon),
            }))
            .sort((a: any, b: any) => a.dist - b.dist)
          const unicos: {nome: string; dist: number}[] = []
          const vistos = new Set<string>()
          for (const p of pontos) {
            if (!vistos.has(p.nome)) { vistos.add(p.nome); unicos.push(p) }
            if (unicos.length >= 5) break
          }
          if (unicos[0]) { campos['referencia1'] = unicos[0].nome; campos['distancia1'] = formatarDistancia(unicos[0].dist) }
          if (unicos[1]) { campos['referencia2'] = unicos[1].nome; campos['distancia2'] = formatarDistancia(unicos[1].dist) }
          if (unicos[2]) { campos['referencia3'] = unicos[2].nome; campos['distancia3'] = formatarDistancia(unicos[2].dist) }
          if (unicos[3]) { campos['referencia4'] = unicos[3].nome; campos['distancia4'] = formatarDistancia(unicos[3].dist) }
          if (unicos[4]) { campos['referencia5'] = unicos[4].nome; campos['distancia5'] = formatarDistancia(unicos[4].dist) }
        }
      } catch {}
      if (Object.keys(campos).length > 0) setNovoLaudo((prev) => ({ ...prev, ...campos }))
      setMsgCoords({ tipo: 'ok', texto: 'Endereço e referências preenchidos automaticamente.' })
    } catch {
      setMsgCoords({ tipo: 'erro', texto: 'Não foi possível buscar os dados. Preencha manualmente.' })
    } finally {
      setBuscandoCoords(false)
    }
  }

  // ─── Criar laudo ─────────────────────────────────────────────────────────

  async function criarNovoLaudo() {
    if (!novoLaudo.endereco && !novoLaudo.coordenadasImovel) {
      alert('Preencha pelo menos o endereço ou as coordenadas do imóvel.')
      return
    }
    setCriandoLaudo(true)
    try {
      const id = crypto.randomUUID()
      const agora = new Date().toISOString()
      const criadoPor = session?.user?.name || 'Usuário'
      const payload = {
        id,
        ...novoLaudo,
        status: 'em_preenchimento',
        statusVistoria: 'aguardando_agendamento',
        statusAcompanhamento: 'levantamento_documentos',
        criadoPorNome: criadoPor,
        criadoEm: agora,
        atualizadoEm: agora,
        melhoramentosPublicos: {},
        croquis: [],
        fotos: [],
        historicoEventos: [{ data: agora, usuario: criadoPor, acao: 'Laudo criado' }],
      }
      const res = await fetch('/api/laudos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) { alert('Erro ao criar laudo. Tente novamente.'); return }
      setMostrarModal(false)
      setNovoLaudo(estadoInicialNovoLaudo)
      setMsgCoords(null)
      const rotaEdicao = novoLaudo.tipoLaudo === 'simplificado'
        ? `/laudo/simplificado?id=${id}`
        : `/novo-laudo?id=${id}`
      router.push(rotaEdicao)
    } finally {
      setCriandoLaudo(false)
    }
  }

  // ─── Contadores e filtros ────────────────────────────────────────────────────

  const contadores = useMemo(
    () => Object.fromEntries(
      ORDEM_STATUS.map((st) => [
        st,
        laudos.filter((l) => (l.statusAcompanhamento || 'levantamento_documentos') === st).length,
      ])
    ) as Record<StatusAcompanhamento, number>,
    [laudos]
  )

  const laudosFiltrados = useMemo(() => {
    let resultado = filtrarLaudos(laudos, { busca })
    if (filtroAcomp) {
      resultado = resultado.filter(
        (l) => (l.statusAcompanhamento || 'levantamento_documentos') === filtroAcomp
      )
    }
    return resultado
  }, [laudos, busca, filtroAcomp])

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">

        {/* Cabeçalho */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">gestão de laudos</div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Meus laudos</h1>
          </div>
          <button
            onClick={() => setMostrarModal(true)}
            className="inline-flex items-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#0f3d68,#2563eb)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition"
          >
            <span className="text-lg leading-none">+</span>
            Novo laudo
          </button>
        </div>

        {/* Cards de dashboard — filtro por statusAcompanhamento */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {ORDEM_STATUS.map((st) => {
            const cfg = acompanhamentoConfig[st]
            const ativo = filtroAcomp === st
            return (
              <button
                key={st}
                type="button"
                onClick={() => setFiltroAcomp(ativo ? '' : st)}
                className={`rounded-[20px] border p-4 text-left transition ${
                  ativo ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <span className={`inline-block h-2 w-2 rounded-full ${cfg.dot} mb-2`} />
                <div className="text-2xl font-semibold text-slate-950">{contadores[st]}</div>
                <div className="mt-1 text-xs text-slate-500 leading-tight">
                  {formatarStatusAcompanhamento(st)}
                </div>
              </button>
            )
          })}
        </div>

        {/* Busca */}
        <div className="mb-5">
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por endereço, proprietário, matrícula..."
            className="w-full border border-slate-200 rounded-2xl px-4 py-2.5 text-sm bg-white outline-none focus:border-blue-400 transition"
          />
        </div>

        {/* Lista */}
        {carregando ? (
          <div className="text-center text-slate-400 py-16 text-sm">Carregando laudos...</div>
        ) : laudosFiltrados.length === 0 ? (
          <div className="text-center text-slate-400 py-16 text-sm">
            {busca ? 'Nenhum laudo encontrado para essa busca.' : 'Nenhum laudo cadastrado ainda.'}
          </div>
        ) : (
          <div className="rounded-[28px] border border-slate-200 bg-white overflow-hidden shadow-sm divide-y divide-slate-100">
            {laudosFiltrados.map((laudo) => {
              const rotaEdicao = laudo.tipoLaudo === 'simplificado'
                ? `/laudo/simplificado?id=${laudo.id}`
                : `/novo-laudo?id=${laudo.id}`
              const rotaVis = `/visualizar-laudo?id=${laudo.id}`
              return (
                <div key={laudo.id} className="px-6 py-4 flex items-start justify-between gap-4 hover:bg-slate-50 transition">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900 truncate">{laudo.endereco || 'Endereço não informado'}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {laudo.proprietario || '—'}
                      {laudo.solicitante && ` · ${laudo.solicitante}`}
                      {laudo.matricula && ` · Matrícula: ${laudo.matricula}`}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {/* Status de acompanhamento — principal */}
                      {(() => {
                        const st = (laudo.statusAcompanhamento || 'levantamento_documentos') as StatusAcompanhamento
                        const cfg = acompanhamentoConfig[st]
                        return (
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.classe}`}>
                            {formatarStatusAcompanhamento(st)}
                          </span>
                        )
                      })()}
                      {/* Status de vistoria — só se existir e for relevante */}
                      {laudo.statusVistoria && laudo.statusVistoria !== 'aguardando_agendamento' && (
                        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-amber-50 text-amber-700">
                          {statusVistoriaLabel[laudo.statusVistoria] || laudo.statusVistoria}
                        </span>
                      )}
                      {/* Tipo de laudo */}
                      {laudo.tipoLaudo && (
                        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-slate-100 text-slate-600">
                          {laudo.tipoLaudo === 'simplificado' ? 'Simplificado' : 'Detalhado'}
                        </span>
                      )}
                      <span className="text-xs text-slate-400">Criado em {formatarData(laudo.criadoEm)}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <a
                      href={rotaEdicao}
                      className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition text-center"
                    >
                      Editar
                    </a>
                    <a
                      href={rotaVis}
                      className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition text-center"
                    >
                      Visualizar
                    </a>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Modal de criação de laudo ── */}
      {mostrarModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 overflow-y-auto py-8 px-4">
          <div className="w-full max-w-2xl rounded-[28px] border border-slate-200 bg-white p-8 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-slate-950">Iniciar novo laudo</h2>
              <button
                onClick={() => { setMostrarModal(false); setMsgCoords(null); setNovoLaudo(estadoInicialNovoLaudo) }}
                className="text-slate-400 hover:text-slate-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              {/* Coordenadas */}
              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 space-y-3">
                <label className="block text-sm font-semibold text-blue-900">📍 Coordenadas do imóvel</label>
                <div className="flex gap-2">
                  <input
                    value={novoLaudo.coordenadasImovel}
                    onChange={(e) => setField('coordenadasImovel', e.target.value)}
                    placeholder="Ex: -23.550520, -46.633308"
                    className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white outline-none focus:border-blue-400"
                  />
                  <button
                    type="button"
                    onClick={buscarCoordenadas}
                    disabled={buscandoCoords || !novoLaudo.coordenadasImovel.trim()}
                    className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {buscandoCoords ? 'Buscando…' : 'Preencher dados'}
                  </button>
                </div>
                {msgCoords && (
                  <p className={`text-sm ${msgCoords.tipo === 'ok' ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {msgCoords.texto}
                  </p>
                )}
              </div>

              {/* Dados principais */}
              <div className="grid grid-cols-2 gap-3">
                <input value={novoLaudo.endereco} onChange={(e) => setField('endereco', e.target.value)}
                  placeholder="Endereço" className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white outline-none focus:border-blue-400" />
                <input value={novoLaudo.proprietario} onChange={(e) => setField('proprietario', e.target.value)}
                  placeholder="Proprietário" className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white outline-none focus:border-blue-400" />
                <select
                  value={novoLaudo.empresaClienteId}
                  onChange={(e) => {
                    const emp = empresas.find((em) => em.id === e.target.value)
                    setNovoLaudo((prev) => ({ ...prev, empresaClienteId: emp?.id || '', solicitante: emp?.nome || '' }))
                  }}
                  className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white outline-none focus:border-blue-400"
                >
                  <option value="">Empresa / Solicitante</option>
                  {empresas.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.nome}</option>
                  ))}
                </select>
                <select value={novoLaudo.tipo} onChange={(e) => setField('tipo', e.target.value)}
                  className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white outline-none focus:border-blue-400">
                  <option value="">Tipo do imóvel</option>
                  <optgroup label="Residencial">
                    <option>Apartamento</option><option>Casa</option><option>Sobrado</option>
                    <option>Cobertura</option><option>Kitnet / Studio</option><option>Flat</option>
                    <option>Terreno residencial</option><option>Sítio / Chácara</option><option>Fazenda</option>
                  </optgroup>
                  <optgroup label="Comercial">
                    <option>Sala comercial</option><option>Loja comercial</option><option>Conjunto comercial</option>
                    <option>Ponto comercial</option><option>Escritório</option><option>Hotel / Pousada</option>
                    <option>Motel</option><option>Restaurante / Lanchonete</option><option>Posto de combustíveis</option>
                  </optgroup>
                  <optgroup label="Industrial / Logístico">
                    <option>Galpão industrial</option><option>Galpão logístico</option><option>Indústria</option>
                    <option>Depósito / Armazém</option><option>Centro de distribuição</option>
                  </optgroup>
                  <optgroup label="Especial">
                    <option>Hospital / Clínica</option><option>Escola / Creche</option><option>Igreja / Templo</option>
                    <option>Posto de saúde</option><option>Edifício de uso misto</option>
                    <option>Estacionamento</option><option>Terreno comercial</option><option>Terreno industrial</option>
                  </optgroup>
                </select>
                <input value={novoLaudo.finalidade} onChange={(e) => setField('finalidade', e.target.value)}
                  placeholder="Finalidade" className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white outline-none focus:border-blue-400" />
                <input value={novoLaudo.matricula} onChange={(e) => setField('matricula', e.target.value)}
                  placeholder="Matrícula" className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white outline-none focus:border-blue-400" />
              </div>

              {/* Áreas */}
              <div className="grid grid-cols-2 gap-3">
                <input value={novoLaudo.areaConstruidaTotal} onChange={(e) => setField('areaConstruidaTotal', e.target.value)}
                  placeholder="Área construída total (m²)" className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white outline-none focus:border-blue-400" />
                <input value={novoLaudo.areaConstruidaAverbada} onChange={(e) => setField('areaConstruidaAverbada', e.target.value)}
                  placeholder="Área construída averbada (m²)" className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white outline-none focus:border-blue-400" />
                <input value={novoLaudo.areaTerrenoTotal} onChange={(e) => setField('areaTerrenoTotal', e.target.value)}
                  placeholder="Área de terreno total (m²)" className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white outline-none focus:border-blue-400" />
                <input value={novoLaudo.areaTerrenoAverbada} onChange={(e) => setField('areaTerrenoAverbada', e.target.value)}
                  placeholder="Área de terreno averbada (m²)" className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white outline-none focus:border-blue-400" />
              </div>

              {/* Pontos de referência (preenchidos automaticamente) */}
              {(novoLaudo.referencia1 || novoLaudo.referencia2) && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                  <p className="text-sm font-semibold text-slate-700">Pontos de referência</p>
                  {[1,2,3,4,5].map((n) => {
                    const ref = (novoLaudo as any)[`referencia${n}`]
                    const dist = (novoLaudo as any)[`distancia${n}`]
                    if (!ref) return null
                    return (
                      <div key={n} className="flex items-center justify-between text-sm">
                        <span className="text-slate-700">{ref}</span>
                        <span className="text-slate-500 text-xs">{dist}</span>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Modelo de laudo */}
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Modelo de laudo</p>
                <div className="grid grid-cols-2 gap-3">
                  {(['detalhado', 'simplificado'] as const).map((tipo) => (
                    <button
                      key={tipo}
                      type="button"
                      onClick={() => setNovoLaudo((prev) => ({ ...prev, tipoLaudo: tipo }))}
                      className={`rounded-2xl border-2 p-3 text-left transition ${
                        novoLaudo.tipoLaudo === tipo
                          ? tipo === 'simplificado' ? 'border-emerald-400 bg-emerald-50' : 'border-blue-400 bg-blue-50'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <p className="text-xs font-semibold text-slate-800 mb-1">
                        {tipo === 'detalhado' ? 'Laudo completo NBR 14653' : 'Laudo simplificado'}
                      </p>
                      <p className="text-[11px] text-slate-500 leading-tight">
                        {tipo === 'detalhado'
                          ? 'Todas as seções da norma. ~20 páginas.'
                          : 'Formato compacto para análise rápida. ~4 páginas.'}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tipo de imóvel — só para simplificado */}
              {novoLaudo.tipoLaudo === 'simplificado' && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Tipo de imóvel</p>
                  <div className="grid grid-cols-2 gap-3">
                    {([
                      { value: 'isolado', label: 'Imóvel isolado', desc: 'Casa, terreno, galpão. Sem fração ideal.' },
                      { value: 'fracao', label: 'Imóvel com fração', desc: 'Apartamento, sala, vaga. Possui área comum e fração ideal.' },
                    ] as const).map(({ value, label, desc }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => {
                          const novoFatores = value === 'isolado'
                            ? { ...novoLaudo.fatoresCDDMAtivos, local: true, andar: false, vaga: false }
                            : { ...novoLaudo.fatoresCDDMAtivos, local: true, vaga: true }
                          setNovoLaudo((prev) => ({ ...prev, tipoImovelCDDM: value, fatoresCDDMAtivos: novoFatores }))
                        }}
                        className={`rounded-2xl border-2 p-3 text-left transition ${
                          novoLaudo.tipoImovelCDDM === value ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <p className="text-xs font-semibold text-slate-800 mb-1">{label}</p>
                        <p className="text-[11px] text-slate-500 leading-tight">{desc}</p>
                      </button>
                    ))}
                  </div>

                  {novoLaudo.tipoImovelCDDM === 'fracao' && (
                    <div className="grid grid-cols-3 gap-3 mt-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Área comum (m²)</label>
                        <input value={novoLaudo.areaComum} onChange={e => setNovoLaudo(p => ({ ...p, areaComum: e.target.value }))}
                          placeholder="0,00" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Área total (m²)</label>
                        <input value={novoLaudo.areaTotal} onChange={e => setNovoLaudo(p => ({ ...p, areaTotal: e.target.value }))}
                          placeholder="0,00" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Fração ideal (%)</label>
                        <input value={novoLaudo.fracaoIdeal} onChange={e => setNovoLaudo(p => ({ ...p, fracaoIdeal: e.target.value }))}
                          placeholder="0,000000" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm" />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Botões */}
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => { setMostrarModal(false); setMsgCoords(null); setNovoLaudo(estadoInicialNovoLaudo) }}
                className="flex-1 rounded-2xl border border-slate-200 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={criarNovoLaudo}
                disabled={criandoLaudo}
                className="flex-1 rounded-2xl bg-[linear-gradient(135deg,#0f3d68,#2563eb)] py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {criandoLaudo ? 'Criando laudo...' : 'Criar laudo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}
