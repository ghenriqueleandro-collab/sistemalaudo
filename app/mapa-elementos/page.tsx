/**
 * SALVAR EM: src/app/mapa-elementos/page.tsx
 *
 * Mapa de Elementos Comparativos — exibe no mapa todos os imóveis usados
 * como elementos comparativos (dadosCalculoCDDM.elementos) nos laudos salvos.
 *
 * Funciona sem dependências externas de mapas: usa uma projeção Mercator simples
 * com pan/zoom por CSS transform. Cada alfinete é posicionado via coordenadas reais.
 * Clique num alfinete para ver os detalhes completos do elemento.
 *
 * Filtros disponíveis: tipo, cidade, área, valor, padrão construtivo.
 */

'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import AppShell from '../components/AppShell'
import type { ElementoCDDM } from '../components/formulario/EtapaCalculoCDDM'

// ─── Tipos ────────────────────────────────────────────────────────────────────

type ElementoMapa = ElementoCDDM & {
  laudoId: string
  laudoReferencia: string
}

// ─── Helpers de coordenadas ───────────────────────────────────────────────────

function parseCoord(s: string): [number, number] | null {
  if (!s) return null
  const partes = s.split(',').map((p) => parseFloat(p.trim().replace(',', '.')))
  if (partes.length < 2 || isNaN(partes[0]) || isNaN(partes[1])) return null
  const [lat, lon] = partes
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null
  return [lat, lon]
}

/** Projeção Mercator: lat/lon → fração [0,1] no canvas */
function mercatorXY(
  lat: number,
  lon: number,
  bounds: { minLat: number; maxLat: number; minLon: number; maxLon: number }
): [number, number] {
  const pad = 0.05
  const latRange = (bounds.maxLat - bounds.minLat) * (1 + pad * 2)
  const lonRange = (bounds.maxLon - bounds.minLon) * (1 + pad * 2)
  const minLat = bounds.minLat - (bounds.maxLat - bounds.minLat) * pad
  const minLon = bounds.minLon - (bounds.maxLon - bounds.minLon) * pad
  const x = ((lon - minLon) / lonRange) * 100
  const y = (1 - (lat - minLat) / latRange) * 100
  return [x, y]
}

function formatarMoeda(v: string) {
  const n = parseFloat(v.replace(/\./g, '').replace(',', '.'))
  if (isNaN(n)) return v
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

// ─── Cor por tipo de imóvel ───────────────────────────────────────────────────

const CORES_TIPO: Record<string, string> = {
  apartamento: '#2563eb',
  casa: '#16a34a',
  terreno: '#d97706',
  sala: '#7c3aed',
  galpão: '#dc2626',
  'sala/conjunto': '#7c3aed',
  default: '#0f172a',
}

function corParaTipo(tipo: string): string {
  const t = tipo.toLowerCase().trim()
  return CORES_TIPO[t] || CORES_TIPO.default
}

// ─── Painel de filtros ────────────────────────────────────────────────────────

type Filtros = {
  tipo: string
  cidade: string
  areaMin: string
  areaMax: string
  valorMin: string
  valorMax: string
  padrao: string
}

const FILTROS_INICIAIS: Filtros = {
  tipo: '',
  cidade: '',
  areaMin: '',
  areaMax: '',
  valorMin: '',
  valorMax: '',
  padrao: '',
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function MapaElementosPage() {
  const { status: sessionStatus } = useSession()

  const [elementos, setElementos] = useState<ElementoMapa[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_INICIAIS)
  const [selecionado, setSelecionado] = useState<ElementoMapa | null>(null)
  const [painelFiltroAberto, setPainelFiltroAberto] = useState(true)

  // Pan/zoom
  const mapaRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const arrastando = useRef(false)
  const ultimoMouse = useRef({ x: 0, y: 0 })

  // ── Helpers para resolver refs do Redis ──

  /** Busca uma chave Redis via /api/laudo-midias e faz parse do JSON */
  const lerMidia = useCallback(async (chave: string): Promise<any | null> => {
    try {
      const res = await fetch(`/api/laudo-midias?chave=${encodeURIComponent(chave)}`, { cache: 'no-store' })
      if (!res.ok) return null
      const { dado } = await res.json()
      if (!dado) return null
      return typeof dado === 'string' ? JSON.parse(dado) : dado
    } catch { return null }
  }, [])

  /** Resolve qualquer campo que pode ser inline, __ref__: ou __chunks__: */
  const resolverCampo = useCallback(async (valor: any): Promise<any | null> => {
    if (!valor) return null
    if (typeof valor !== 'string') return valor
    if (valor.startsWith('__chunks__:')) {
      const sem = valor.replace('__chunks__:', '')
      const lastColon = sem.lastIndexOf(':')
      const chave = sem.slice(0, lastColon)
      const num = parseInt(sem.slice(lastColon + 1), 10)
      if (isNaN(num) || num <= 0) return null
      try {
        const partes = await Promise.all(
          Array.from({ length: num }, async (_, i) => {
            const r = await fetch(`/api/laudo-midias?chave=${encodeURIComponent(`${chave}__c${i}`)}`, { cache: 'no-store' })
            if (!r.ok) return ''
            const { dado } = await r.json()
            return dado || ''
          })
        )
        const json = partes.join('')
        return json ? JSON.parse(json) : null
      } catch { return null }
    }
    if (valor.startsWith('__ref__:')) {
      const chave = valor.replace('__ref__:', '')
      return lerMidia(chave)
    }
    return null
  }, [lerMidia])

  // ── Carregar dados ──
  const carregarElementos = useCallback(async () => {
    try {
      const res = await fetch('/api/laudos', { cache: 'no-store' })
      if (!res.ok) throw new Error()
      const laudosBrutos: any[] = await res.json()

      // Deduplicar laudos (Redis pode ter IDs duplicados)
      const laudosVistos = new Set<string>()
      const laudos = laudosBrutos.filter((l: any) => {
        if (!l?.id || laudosVistos.has(l.id)) return false
        laudosVistos.add(l.id)
        return true
      })

      const lista: ElementoMapa[] = []

      for (const laudo of laudos) {
        let elems: ElementoCDDM[] = []

        // ── 1. Tentar dadosCalculoCDDM (fonte preferida: inclui VU calculado) ──
        const rawCddm = laudo.dadosCalculoCDDM
        if (rawCddm && typeof rawCddm === 'object' && Array.isArray(rawCddm.elementos)) {
          // Inline — mais comum em laudos antigos ou pequenos
          elems = rawCddm.elementos
        } else if (typeof rawCddm === 'string' && (rawCddm.startsWith('__ref__:') || rawCddm.startsWith('__chunks__:'))) {
          // Ref ou chunks — resolver via /api/laudo-midias
          const resolvido = await resolverCampo(rawCddm)
          if (resolvido && typeof resolvido === 'object' && Array.isArray(resolvido.elementos)) {
            elems = resolvido.elementos
          }
        }

        // ── 2. Fallback: elementosComparativos (todos os elementos, mesmo sem VU) ──
        if (elems.length === 0) {
          const rawElems = laudo.elementosComparativos
          if (Array.isArray(rawElems)) {
            elems = rawElems
          } else if (typeof rawElems === 'string' && (rawElems.startsWith('__ref__:') || rawElems.startsWith('__chunks__:'))) {
            const resolvido = await resolverCampo(rawElems)
            if (Array.isArray(resolvido)) {
              elems = resolvido
            }
          }
        }

        // ── Adicionar ao mapa apenas elementos com coordenadas válidas ──
        for (const el of elems) {
          if (el?.coordenadas && parseCoord(el.coordenadas)) {
            lista.push({
              ...el,
              laudoId: laudo.id,
              laudoReferencia: laudo.referencia || laudo.id.slice(0, 8),
            })
          }
        }
      }

      setElementos(lista)
    } catch {
      setErro('Não foi possível carregar os elementos. Tente novamente.')
    } finally {
      setCarregando(false)
    }
  }, [resolverCampo])

  useEffect(() => {
    if (sessionStatus === 'authenticated') carregarElementos()
  }, [sessionStatus, carregarElementos])

  // ── Derivar listas únicas para filtros ──
  const tiposUnicos = useMemo(
    () => Array.from(new Set(elementos.map((e) => e.tipo).filter(Boolean))).sort(),
    [elementos]
  )
  const cidadesUnicas = useMemo(
    () => Array.from(new Set(elementos.map((e) => e.cidade).filter(Boolean))).sort(),
    [elementos]
  )
  const padroesUnicos = useMemo(
    () => Array.from(new Set(elementos.map((e) => e.padraoConstrutivo).filter(Boolean))).sort(),
    [elementos]
  )

  // ── Aplicar filtros ──
  const elementosFiltrados = useMemo(() => {
    return elementos.filter((el) => {
      if (filtros.tipo && el.tipo?.toLowerCase() !== filtros.tipo.toLowerCase()) return false
      if (filtros.cidade && el.cidade !== filtros.cidade) return false
      if (filtros.padrao && el.padraoConstrutivo !== filtros.padrao) return false
      const area = parseFloat(el.area?.replace(',', '.') || '0')
      if (filtros.areaMin && area < parseFloat(filtros.areaMin)) return false
      if (filtros.areaMax && area > parseFloat(filtros.areaMax)) return false
      const valor = parseFloat(el.valorOferta?.replace(/\./g, '').replace(',', '.') || '0')
      if (filtros.valorMin && valor < parseFloat(filtros.valorMin.replace(/\./g, ''))) return false
      if (filtros.valorMax && valor > parseFloat(filtros.valorMax.replace(/\./g, ''))) return false
      return true
    })
  }, [elementos, filtros])

  // ── Calcular bounds para posicionamento ──
  const bounds = useMemo(() => {
    const coords = elementosFiltrados
      .map((e) => parseCoord(e.coordenadas))
      .filter((c): c is [number, number] => c !== null)
    if (coords.length === 0) return { minLat: -23.7, maxLat: -23.4, minLon: -46.8, maxLon: -46.4 }
    const lats = coords.map((c) => c[0])
    const lons = coords.map((c) => c[1])
    return {
      minLat: Math.min(...lats),
      maxLat: Math.max(...lats),
      minLon: Math.min(...lons),
      maxLon: Math.max(...lons),
    }
  }, [elementosFiltrados])

  // ── Pan/zoom handlers ──
  function onWheel(e: React.WheelEvent) {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setZoom((z) => Math.min(8, Math.max(0.5, z * delta)))
  }
  function onMouseDown(e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest('[data-pin]')) return
    arrastando.current = true
    ultimoMouse.current = { x: e.clientX, y: e.clientY }
  }
  function onMouseMove(e: React.MouseEvent) {
    if (!arrastando.current) return
    const dx = e.clientX - ultimoMouse.current.x
    const dy = e.clientY - ultimoMouse.current.y
    ultimoMouse.current = { x: e.clientX, y: e.clientY }
    setPan((p) => ({ x: p.x + dx, y: p.y + dy }))
  }
  function onMouseUp() { arrastando.current = false }

  function resetarVista() {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  const totalFiltros = Object.values(filtros).filter(Boolean).length

  return (
    <AppShell>
      <div className="flex h-[calc(100vh-73px)] overflow-hidden">

        {/* ── Painel de filtros ── */}
        <aside
          className={`flex flex-col border-r border-slate-200 bg-white transition-all duration-300 ${
            painelFiltroAberto ? 'w-72 shrink-0' : 'w-0 overflow-hidden'
          }`}
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-slate-500" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="12" x2="14" y2="12" /><line x1="4" y1="18" x2="10" y2="18" />
              </svg>
              <span className="text-sm font-semibold text-slate-900">Filtros</span>
              {totalFiltros > 0 && (
                <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">
                  {totalFiltros}
                </span>
              )}
            </div>
            {totalFiltros > 0 && (
              <button
                onClick={() => setFiltros(FILTROS_INICIAIS)}
                className="text-xs font-medium text-slate-400 hover:text-rose-600 transition"
              >
                Limpar
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">

            {/* Tipo */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Tipo de imóvel
              </label>
              <select
                value={filtros.tipo}
                onChange={(e) => setFiltros((f) => ({ ...f, tipo: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400 focus:bg-white transition"
              >
                <option value="">Todos os tipos</option>
                {tiposUnicos.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Cidade */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Cidade
              </label>
              <select
                value={filtros.cidade}
                onChange={(e) => setFiltros((f) => ({ ...f, cidade: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400 focus:bg-white transition"
              >
                <option value="">Todas as cidades</option>
                {cidadesUnicas.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Área */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Área (m²)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Mín"
                  value={filtros.areaMin}
                  onChange={(e) => setFiltros((f) => ({ ...f, areaMin: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:bg-white transition"
                />
                <span className="shrink-0 text-xs text-slate-400">até</span>
                <input
                  type="number"
                  placeholder="Máx"
                  value={filtros.areaMax}
                  onChange={(e) => setFiltros((f) => ({ ...f, areaMax: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:bg-white transition"
                />
              </div>
            </div>

            {/* Valor */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Valor de oferta (R$)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Mín"
                  value={filtros.valorMin}
                  onChange={(e) => setFiltros((f) => ({ ...f, valorMin: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:bg-white transition"
                />
                <span className="shrink-0 text-xs text-slate-400">até</span>
                <input
                  type="number"
                  placeholder="Máx"
                  value={filtros.valorMax}
                  onChange={(e) => setFiltros((f) => ({ ...f, valorMax: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:bg-white transition"
                />
              </div>
            </div>

            {/* Padrão */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Padrão construtivo
              </label>
              <select
                value={filtros.padrao}
                onChange={(e) => setFiltros((f) => ({ ...f, padrao: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400 focus:bg-white transition"
              >
                <option value="">Todos os padrões</option>
                {padroesUnicos.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Contador de resultados */}
          <div className="border-t border-slate-100 px-4 py-3">
            <p className="text-xs text-slate-500">
              <span className="font-bold text-slate-900">{elementosFiltrados.length}</span>{' '}
              elemento{elementosFiltrados.length !== 1 ? 's' : ''} exibido{elementosFiltrados.length !== 1 ? 's' : ''}
              {elementos.length !== elementosFiltrados.length && (
                <> de <span className="font-semibold">{elementos.length}</span></>
              )}
            </p>
          </div>
        </aside>

        {/* ── Área do mapa ── */}
        <div className="relative flex-1 overflow-hidden bg-[#e8edf2]">

          {/* Barra superior do mapa */}
          <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-200/60 bg-white/90 px-4 py-2.5 backdrop-blur">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setPainelFiltroAberto((v) => !v)}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="12" x2="14" y2="12" /><line x1="4" y1="18" x2="10" y2="18" />
                </svg>
                {painelFiltroAberto ? 'Ocultar filtros' : 'Filtros'}
              </button>

              {/* Legenda de tipos */}
              <div className="hidden items-center gap-3 md:flex">
                {Object.entries(CORES_TIPO)
                  .filter(([k]) => k !== 'default')
                  .map(([tipo, cor]) => (
                    <span key={tipo} className="flex items-center gap-1 text-[11px] text-slate-600 capitalize">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ background: cor }}
                      />
                      {tipo}
                    </span>
                  ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">
                {elementosFiltrados.length} elemento{elementosFiltrados.length !== 1 ? 's' : ''}
              </span>
              {/* Controles de zoom */}
              <div className="flex overflow-hidden rounded-lg border border-slate-200 bg-white">
                <button
                  onClick={() => setZoom((z) => Math.min(8, z * 1.3))}
                  className="border-r border-slate-200 px-2.5 py-1.5 text-sm font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  +
                </button>
                <button
                  onClick={resetarVista}
                  className="border-r border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-50 transition"
                >
                  {Math.round(zoom * 100)}%
                </button>
                <button
                  onClick={() => setZoom((z) => Math.max(0.5, z * 0.77))}
                  className="px-2.5 py-1.5 text-sm font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  −
                </button>
              </div>
            </div>
          </div>

          {/* Canvas do mapa */}
          <div
            ref={mapaRef}
            className="absolute inset-0 cursor-grab active:cursor-grabbing overflow-hidden"
            style={{ top: '44px' }}
            onWheel={onWheel}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
          >
            {carregando ? (
              <div className="flex h-full items-center justify-center">
                <div className="rounded-2xl bg-white/90 px-6 py-4 shadow-lg text-sm text-slate-600">
                  Carregando elementos…
                </div>
              </div>
            ) : erro ? (
              <div className="flex h-full items-center justify-center">
                <div className="rounded-2xl border border-rose-200 bg-white px-6 py-4 shadow-lg text-sm text-rose-700">
                  {erro}
                </div>
              </div>
            ) : elementosFiltrados.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <div className="rounded-2xl bg-white/90 px-6 py-4 shadow-lg text-center">
                  <p className="text-sm font-semibold text-slate-700">Nenhum elemento encontrado</p>
                  <p className="mt-1 text-xs text-slate-400">Ajuste os filtros ou adicione laudos com coordenadas.</p>
                </div>
              </div>
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  transformOrigin: 'center center',
                  position: 'relative',
                  userSelect: 'none',
                }}
              >
                {/* Grade de fundo simulando mapa */}
                <svg
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    <pattern id="grid-sm" width="40" height="40" patternUnits="userSpaceOnUse">
                      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#d1d9e0" strokeWidth="0.5" />
                    </pattern>
                    <pattern id="grid-lg" width="200" height="200" patternUnits="userSpaceOnUse">
                      <rect width="200" height="200" fill="url(#grid-sm)" />
                      <path d="M 200 0 L 0 0 0 200" fill="none" stroke="#b8c4cd" strokeWidth="1" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="#e8edf2" />
                  <rect width="100%" height="100%" fill="url(#grid-lg)" />
                </svg>

                {/* Alfinetes */}
                {elementosFiltrados.map((el, idx) => {
                  const coord = parseCoord(el.coordenadas)
                  if (!coord) return null
                  const [px, py] = mercatorXY(coord[0], coord[1], bounds)
                  const cor = corParaTipo(el.tipo || '')
                  const ativo = selecionado?.id === el.id && selecionado?.laudoId === el.laudoId
                  return (
                    <div
                      key={`${el.laudoId}-${el.id}-${idx}`}
                      data-pin="true"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelecionado(ativo ? null : el)
                      }}
                      title={[el.tipo, el.logradouro, el.cidade].filter(Boolean).join(' · ')}
                      style={{
                        position: 'absolute',
                        left: `${px}%`,
                        top: `${py}%`,
                        transform: 'translate(-50%, -100%)',
                        zIndex: ativo ? 20 : 10,
                        cursor: 'pointer',
                        transition: 'transform 0.15s',
                      }}
                    >
                      {/* Alfinete SVG */}
                      <svg
                        width={ativo ? 32 : 26}
                        height={ativo ? 42 : 34}
                        viewBox="0 0 26 34"
                        fill="none"
                        style={{ filter: ativo ? 'drop-shadow(0 4px 8px rgba(0,0,0,0.35))' : 'drop-shadow(0 2px 4px rgba(0,0,0,0.25))' }}
                      >
                        <path
                          d="M13 0C6.373 0 1 5.373 1 12c0 9 12 22 12 22S25 21 25 12C25 5.373 19.627 0 13 0z"
                          fill={ativo ? cor : cor}
                          stroke="white"
                          strokeWidth="2"
                        />
                        <circle cx="13" cy="12" r="4.5" fill="white" fillOpacity="0.9" />
                      </svg>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Painel de detalhe do elemento selecionado */}
          {selecionado && (
            <div className="absolute bottom-4 right-4 z-20 w-80 rounded-2xl border border-slate-200 bg-white shadow-[0_8px_32px_-8px_rgba(15,23,42,0.3)] overflow-hidden">
              <div className="flex items-start justify-between gap-2 border-b border-slate-100 px-4 py-3">
                <div>
                  <span
                    className="inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold text-white capitalize"
                    style={{ background: corParaTipo(selecionado.tipo || '') }}
                  >
                    {selecionado.tipo || 'Imóvel'}
                  </span>
                  <p className="mt-1 text-sm font-semibold text-slate-900 leading-tight">
                    {[selecionado.logradouro, selecionado.bairro].filter(Boolean).join(', ') || 'Endereço não informado'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {[selecionado.cidade, selecionado.uf].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <button
                  onClick={() => setSelecionado(null)}
                  className="shrink-0 rounded-full p-1 text-slate-400 hover:bg-slate-100 transition"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <div className="px-4 py-3 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  {selecionado.area && (
                    <div className="rounded-xl bg-slate-50 px-3 py-2">
                      <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Área</p>
                      <p className="text-sm font-semibold text-slate-900">{selecionado.area} m²</p>
                    </div>
                  )}
                  {selecionado.valorOferta && (
                    <div className="rounded-xl bg-slate-50 px-3 py-2">
                      <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Valor de oferta</p>
                      <p className="text-sm font-semibold text-slate-900">{formatarMoeda(selecionado.valorOferta)}</p>
                    </div>
                  )}
                  {selecionado.padraoConstrutivo && (
                    <div className="rounded-xl bg-slate-50 px-3 py-2">
                      <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Padrão</p>
                      <p className="text-sm font-semibold text-slate-900">{selecionado.padraoConstrutivo}</p>
                    </div>
                  )}
                  {selecionado.estadoConservacao && (
                    <div className="rounded-xl bg-slate-50 px-3 py-2">
                      <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Conservação</p>
                      <p className="text-sm font-semibold text-slate-900">{selecionado.estadoConservacao}</p>
                    </div>
                  )}
                </div>

                {(selecionado.dormitorios || selecionado.suites || selecionado.vagas) && (
                  <div className="flex gap-2">
                    {selecionado.dormitorios && (
                      <span className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600">
                        🛏 {selecionado.dormitorios} dorm.
                      </span>
                    )}
                    {selecionado.suites && (
                      <span className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600">
                        🚿 {selecionado.suites} suítes
                      </span>
                    )}
                    {selecionado.vagas && (
                      <span className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600">
                        🚗 {selecionado.vagas} vaga{Number(selecionado.vagas) !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                )}

                {selecionado.fonte && (
                  <p className="text-xs text-slate-500">
                    <span className="font-semibold">Fonte:</span> {selecionado.fonte}
                    {selecionado.data && ` · ${selecionado.data}`}
                  </p>
                )}

                <p className="text-[10px] text-slate-400 border-t border-slate-100 pt-2">
                  Laudo: <span className="font-semibold">{selecionado.laudoReferencia}</span>
                </p>

                {selecionado.link && (
                  <a
                    href={selecionado.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700"
                  >
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                    Ver anúncio original
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
