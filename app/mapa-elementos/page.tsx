/**
 * SALVAR EM: src/app/mapa-elementos/page.tsx
 *
 * Mapa de Elementos Comparativos — exibe no mapa todos os imóveis usados
 * como elementos comparativos nos laudos salvos.
 *
 * Usa tiles reais do OpenStreetMap via projeção Mercator (sem Leaflet).
 * Suporta pan/zoom, filtros e painel de detalhe.
 */

'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import AppShell from '../components/AppShell'
import type { ElementoCDDM } from '../components/formulario/EtapaCalculoCDDM'

// ─── Tipos ────────────────────────────────────────────────────────────────────

type ElementoMapa = ElementoCDDM & {
  laudoId: string
  laudoReferencia: string
}

// ─── Projeção Mercator / Tiles OSM ────────────────────────────────────────────

/** lat/lon → pixel tile x,y no nível de zoom z */
function latLonToTile(lat: number, lon: number, z: number): { x: number; y: number } {
  const n = Math.pow(2, z)
  const x = Math.floor(((lon + 180) / 360) * n)
  const latRad = (lat * Math.PI) / 180
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n)
  return { x, y }
}

/** lat/lon → pixel (px, py) dentro do canvas de largura W × altura H,
 *  dado o tile de origem (tileX0, tileY0) no zoom z, com tileSize pixels por tile */
function latLonToPixel(
  lat: number, lon: number, z: number,
  tileX0: number, tileY0: number, tileSize: number
): { px: number; py: number } {
  const n = Math.pow(2, z)
  const totalX = ((lon + 180) / 360) * n * tileSize
  const latRad = (lat * Math.PI) / 180
  const totalY = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n * tileSize
  return {
    px: totalX - tileX0 * tileSize,
    py: totalY - tileY0 * tileSize,
  }
}

// ─── Helpers de coordenadas ───────────────────────────────────────────────────

/**
 * Parseia coordenadas no formato "lat, lon" suportando:
 * - ponto decimal:  "-22.98407, -46.46696"
 * - vírgula decimal BR: "-22,98407, -46,46696"  (separador decimal = vírgula, separador par = espaço ou ponto-e-vírgula)
 */
function parseCoord(s: string): [number, number] | null {
  if (!s || typeof s !== 'string') return null
  const str = s.trim()

  // Tenta formato "lat, lon" com ponto decimal (padrão Google Maps)
  const matchPonto = str.match(/^(-?\d+\.\d+)\s*[,;]\s*(-?\d+\.\d+)$/)
  if (matchPonto) {
    const lat = parseFloat(matchPonto[1])
    const lon = parseFloat(matchPonto[2])
    if (isFinite(lat) && isFinite(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
      return [lat, lon]
    }
  }

  // Tenta formato BR "lat, lon" com vírgula decimal: "-22,98407, -46,46696"
  // Padrão: sinal-opcional + dígitos + vírgula + dígitos, espaço, sinal-opcional + dígitos + vírgula + dígitos
  const matchVirgula = str.match(/^(-?\d+),(\d+)\s+(-?\d+),(\d+)$/)
  if (matchVirgula) {
    const lat = parseFloat(`${matchVirgula[1]}.${matchVirgula[2]}`)
    const lon = parseFloat(`${matchVirgula[3]}.${matchVirgula[4]}`)
    if (isFinite(lat) && isFinite(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
      return [lat, lon]
    }
  }

  // Tenta formato com ponto-e-vírgula como separador de par: "-22.98407;-46.46696"
  const matchSemicolon = str.match(/^(-?[\d.]+)\s*;\s*(-?[\d.]+)$/)
  if (matchSemicolon) {
    const lat = parseFloat(matchSemicolon[1])
    const lon = parseFloat(matchSemicolon[2])
    if (isFinite(lat) && isFinite(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
      return [lat, lon]
    }
  }

  // Fallback genérico: split por vírgula e tenta normalizar
  const partes = str.split(',')
  if (partes.length === 2) {
    const lat = parseFloat(partes[0].trim())
    const lon = parseFloat(partes[1].trim())
    if (isFinite(lat) && isFinite(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
      return [lat, lon]
    }
  }
  // 4 partes = vírgula decimal: ["-22", "98407", " -46", "46696"]
  if (partes.length === 4) {
    const lat = parseFloat(`${partes[0].trim()}.${partes[1].trim()}`)
    const lon = parseFloat(`${partes[2].trim()}.${partes[3].trim()}`)
    if (isFinite(lat) && isFinite(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
      return [lat, lon]
    }
  }

  return null
}

function formatarMoeda(v: string) {
  const n = parseFloat(String(v).replace(/\./g, '').replace(',', '.'))
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
  default: '#64748b',
}

function corParaTipo(tipo: string): string {
  if (!tipo) return CORES_TIPO.default
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
  tipo: '', cidade: '', areaMin: '', areaMax: '',
  valorMin: '', valorMax: '', padrao: '',
}

// ─── Componente do mapa com tiles OSM ────────────────────────────────────────

const TILE_SIZE = 256

type TileInfo = { tx: number; ty: number; left: number; top: number }
type PinInfo = { el: ElementoMapa; px: number; py: number }

function MapaOSM({
  elementos,
  selecionado,
  onSelecionar,
}: {
  elementos: ElementoMapa[]
  selecionado: ElementoMapa | null
  onSelecionar: (el: ElementoMapa | null) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 800, h: 600 })

  // Estado do mapa: centro e zoom
  const [center, setCenter] = useState<{ lat: number; lon: number } | null>(null)
  const [zoom, setZoom] = useState(12)

  // Pan
  const dragging = useRef(false)
  const lastMouse = useRef({ x: 0, y: 0 })

  // Medir container
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const obs = new ResizeObserver((entries) => {
      const r = entries[0].contentRect
      setSize({ w: r.width, h: r.height })
    })
    obs.observe(el)
    setSize({ w: el.clientWidth, h: el.clientHeight })
    return () => obs.disconnect()
  }, [])

  // Auto-centrar nos elementos quando carregados
  useEffect(() => {
    if (elementos.length === 0) return
    const coords = elementos.map((e) => parseCoord(e.coordenadas)).filter((c): c is [number, number] => c !== null)
    if (coords.length === 0) return
    const lats = coords.map((c) => c[0])
    const lons = coords.map((c) => c[1])
    const latC = (Math.min(...lats) + Math.max(...lats)) / 2
    const lonC = (Math.min(...lons) + Math.max(...lons)) / 2
    setCenter({ lat: latC, lon: lonC })
    // Ajustar zoom baseado no spread
    const dLat = Math.max(...lats) - Math.min(...lats)
    const dLon = Math.max(...lons) - Math.min(...lons)
    const spread = Math.max(dLat, dLon)
    const z = spread < 0.01 ? 15 : spread < 0.05 ? 13 : spread < 0.2 ? 12 : spread < 1 ? 10 : spread < 5 ? 8 : 6
    setZoom(z)
  }, [elementos])

  // Centro atual em pixels globais
  const centerPx = useMemo(() => {
    if (!center) return { x: 0, y: 0 }
    const n = Math.pow(2, zoom)
    const x = ((center.lon + 180) / 360) * n * TILE_SIZE
    const latRad = (center.lat * Math.PI) / 180
    const y = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n * TILE_SIZE
    return { x, y }
  }, [center, zoom])

  // Tiles a renderizar
  const tiles = useMemo((): TileInfo[] => {
    if (!center) return []
    const halfW = size.w / 2
    const halfH = size.h / 2
    const tileX0 = Math.floor((centerPx.x - halfW) / TILE_SIZE)
    const tileY0 = Math.floor((centerPx.y - halfH) / TILE_SIZE)
    const tileX1 = Math.ceil((centerPx.x + halfW) / TILE_SIZE)
    const tileY1 = Math.ceil((centerPx.y + halfH) / TILE_SIZE)
    const result: TileInfo[] = []
    const n = Math.pow(2, zoom)
    for (let tx = tileX0; tx <= tileX1; tx++) {
      for (let ty = tileY0; ty <= tileY1; ty++) {
        const txWrapped = ((tx % n) + n) % n
        if (ty < 0 || ty >= n) continue
        result.push({
          tx: txWrapped,
          ty,
          left: tx * TILE_SIZE - centerPx.x + size.w / 2,
          top: ty * TILE_SIZE - centerPx.y + size.h / 2,
        })
      }
    }
    return result
  }, [center, zoom, size, centerPx])

  // Posição dos pins em pixels
  const pins = useMemo((): PinInfo[] => {
    if (!center) return []
    return elementos.map((el) => {
      const coord = parseCoord(el.coordenadas)
      if (!coord) return null
      const n = Math.pow(2, zoom)
      const globalX = ((coord[1] + 180) / 360) * n * TILE_SIZE
      const latRad = (coord[0] * Math.PI) / 180
      const globalY = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n * TILE_SIZE
      return {
        el,
        px: globalX - centerPx.x + size.w / 2,
        py: globalY - centerPx.y + size.h / 2,
      }
    }).filter((p): p is PinInfo => p !== null)
  }, [elementos, center, zoom, centerPx, size])

  // Registrar listener de wheel nativo com passive:false para poder chamar preventDefault
  // (o onWheel do React é passivo em alguns browsers e ignora preventDefault)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const handler = (e: WheelEvent) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -1 : 1
      setZoom((z: number) => Math.min(18, Math.max(5, z + delta)))
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [])

  // Handlers (touch/mouse continuam via React)
  function handleWheel(_e: React.WheelEvent) {
    // Tratado pelo listener nativo acima
  }

  function handleMouseDown(e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest('[data-pin]')) return
    dragging.current = true
    lastMouse.current = { x: e.clientX, y: e.clientY }
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!dragging.current || !center) return
    const dx = e.clientX - lastMouse.current.x
    const dy = e.clientY - lastMouse.current.y
    lastMouse.current = { x: e.clientX, y: e.clientY }
    const n = Math.pow(2, zoom)
    const lonPerPx = 360 / (n * TILE_SIZE)
    const latPerPx = (() => {
      const latRad = (center.lat * Math.PI) / 180
      return (360 / (n * TILE_SIZE)) / Math.cos(latRad)
    })()
    setCenter((c: { lat: number; lon: number } | null) => c ? {
      lat: Math.max(-85, Math.min(85, c.lat + dy * latPerPx)),
      lon: c.lon - dx * lonPerPx,
    } : c)
  }

  function handleMouseUp() { dragging.current = false }

  function handleTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 1) {
      dragging.current = true
      lastMouse.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    }
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (e.touches.length === 1 && dragging.current && center) {
      const dx = e.touches[0].clientX - lastMouse.current.x
      const dy = e.touches[0].clientY - lastMouse.current.y
      lastMouse.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      const n = Math.pow(2, zoom)
      const lonPerPx = 360 / (n * TILE_SIZE)
      const latRad = (center.lat * Math.PI) / 180
      const latPerPx = (360 / (n * TILE_SIZE)) / Math.cos(latRad)
      setCenter((c: { lat: number; lon: number } | null) => c ? {
        lat: Math.max(-85, Math.min(85, c.lat + dy * latPerPx)),
        lon: c.lon - dx * lonPerPx,
      } : c)
    }
  }

  if (!center) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-100">
        <span className="text-sm text-slate-500">Aguardando elementos…</span>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden cursor-grab active:cursor-grabbing"
      style={{ background: '#a8c8e8' }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleMouseUp}
    >
      {/* Tiles OSM */}
      {tiles.map(({ tx, ty, left, top }: TileInfo) => (
        <img
          key={`${zoom}-${tx}-${ty}`}
          src={`https://tile.openstreetmap.org/${zoom}/${tx}/${ty}.png`}
          alt=""
          draggable={false}
          style={{
            position: 'absolute',
            left,
            top,
            width: TILE_SIZE,
            height: TILE_SIZE,
            imageRendering: 'pixelated',
            userSelect: 'none',
          }}
        />
      ))}

      {/* Pins */}
      {pins.map(({ el, px, py }: PinInfo, idx) => {
        const cor = corParaTipo(el.tipo || '')
        const ativo = selecionado?.id === el.id && selecionado?.laudoId === el.laudoId
        return (
          <div
            key={`${el.laudoId}-${el.id ?? idx}`}
            data-pin="true"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation()
              onSelecionar(ativo ? null : el)
            }}
            title={[el.tipo, el.logradouro, el.cidade].filter(Boolean).join(' · ')}
            style={{
              position: 'absolute',
              left: px,
              top: py,
              transform: 'translate(-50%, -100%)',
              zIndex: ativo ? 30 : 20,
              cursor: 'pointer',
              transition: 'transform 0.1s',
              ...(ativo ? { transform: 'translate(-50%, -100%) scale(1.3)' } : {}),
            }}
          >
            <svg
              width={ativo ? 30 : 24}
              height={ativo ? 40 : 32}
              viewBox="0 0 24 32"
              fill="none"
              style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' }}
            >
              <path
                d="M12 0C5.373 0 0 5.373 0 12c0 8.5 12 20 12 20S24 20.5 24 12C24 5.373 18.627 0 12 0z"
                fill={cor}
                stroke="white"
                strokeWidth="1.5"
              />
              <circle cx="12" cy="12" r="4" fill="white" fillOpacity="0.95" />
            </svg>
          </div>
        )
      })}

      {/* Crédito OSM */}
      <div
        className="absolute bottom-0 right-0 z-30 bg-white/80 px-1.5 py-0.5 text-[9px] text-slate-600"
        style={{ backdropFilter: 'blur(2px)' }}
      >
        © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="underline">OpenStreetMap</a>
      </div>

      {/* Controles de zoom */}
      <div className="absolute right-3 top-3 z-30 flex flex-col overflow-hidden rounded-lg border border-slate-300 bg-white shadow">
        <button
          onClick={() => setZoom((z: number) => Math.min(18, z + 1))}
          className="border-b border-slate-200 px-3 py-1.5 text-base font-bold text-slate-700 hover:bg-slate-50 transition leading-none"
        >+</button>
        <button
          onClick={() => setZoom((z: number) => Math.max(5, z - 1))}
          className="px-3 py-1.5 text-base font-bold text-slate-700 hover:bg-slate-50 transition leading-none"
        >−</button>
      </div>
    </div>
  )
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

  // Travar scroll do body enquanto a página do mapa estiver montada
  // (evita que o scroll da página apareça junto com o zoom do mapa)
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  // ── Helpers para resolver refs do Redis ──

  const lerMidia = useCallback(async (chave: string): Promise<any | null> => {
    try {
      const res = await fetch(`/api/laudo-midias?chave=${encodeURIComponent(chave)}`, { cache: 'no-store' })
      if (!res.ok) return null
      const { dado } = await res.json()
      if (!dado) return null
      return typeof dado === 'string' ? JSON.parse(dado) : dado
    } catch { return null }
  }, [])

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

  // ── Processar um único laudo → lista de ElementoMapa com coord válida ──
  const processarLaudo = useCallback(async (laudo: any): Promise<ElementoMapa[]> => {
    let elems: any[] = []

    // 1. dadosCalculoCDDM — fonte preferida (tem VU calculado)
    const rawCddm = laudo.dadosCalculoCDDM
    if (rawCddm && typeof rawCddm === 'object' && Array.isArray(rawCddm.elementos)) {
      elems = rawCddm.elementos
    } else if (typeof rawCddm === 'string' && (rawCddm.startsWith('__ref__:') || rawCddm.startsWith('__chunks__:'))) {
      const resolvido = await resolverCampo(rawCddm)
      if (resolvido && typeof resolvido === 'object' && Array.isArray(resolvido.elementos)) {
        elems = resolvido.elementos
      }
    }

    // Verificar se os elementos de cddm têm coordenadas válidas
    const elemsComCoord = elems.filter((el: any) => el?.coordenadas && parseCoord(el.coordenadas))

    // 2. Fallback: elementosComparativos
    //    Usado quando cddm está ausente, vazio OU quando nenhum elem do cddm tem coord válida
    if (elems.length === 0 || elemsComCoord.length === 0) {
      const rawElems = laudo.elementosComparativos
      if (Array.isArray(rawElems) && rawElems.length > 0) {
        elems = rawElems
      } else if (typeof rawElems === 'string' && (rawElems.startsWith('__ref__:') || rawElems.startsWith('__chunks__:'))) {
        const resolvido = await resolverCampo(rawElems)
        if (Array.isArray(resolvido) && resolvido.length > 0) elems = resolvido
      }
    }

    // Recalcular após fallback 2 para decidir se ainda precisamos tentar evolutivo
    const elemsComCoordApos2 = elems.filter((el: any) => el?.coordenadas && parseCoord(el.coordenadas))

    // 3. Fallback: dadosCalculoEvolutivo (método evolutivo)
    //    Laudos com metodoAvaliacao='evolutivo' armazenam elementos em
    //    dadosCalculoEvolutivo.elementos, e NÃO em dadosCalculoCDDM nem elementosComparativos
    if (elems.length === 0 || elemsComCoordApos2.length === 0) {
      const rawEv = laudo.dadosCalculoEvolutivo
      if (rawEv && typeof rawEv === 'object' && Array.isArray(rawEv.elementos) && rawEv.elementos.length > 0) {
        elems = rawEv.elementos
      } else if (typeof rawEv === 'string' && (rawEv.startsWith('__ref__:') || rawEv.startsWith('__chunks__:'))) {
        const resolvido = await resolverCampo(rawEv)
        if (resolvido && typeof resolvido === 'object' && Array.isArray(resolvido.elementos) && resolvido.elementos.length > 0) {
          elems = resolvido.elementos
        }
      }
    }

    // Filtrar apenas elementos com coordenadas válidas
    return elems
      .filter((el: any) => el?.coordenadas && parseCoord(el.coordenadas))
      .map((el: any) => ({
        ...el,
        laudoId: laudo.id,
        laudoReferencia: laudo.referencia || laudo.id.slice(0, 8),
      }))
  }, [resolverCampo])

  // ── Carregar dados em lotes para não sobrecarregar o servidor ──
  const carregarElementos = useCallback(async () => {
    setCarregando(true)
    setErro('')
    try {
      const res = await fetch('/api/laudos', { cache: 'no-store' })
      if (!res.ok) throw new Error()
      const laudosBrutos: any[] = await res.json()

      // Deduplicar laudos
      const laudosVistos = new Set<string>()
      const laudos = laudosBrutos.filter((l: any) => {
        if (!l?.id || laudosVistos.has(l.id)) return false
        laudosVistos.add(l.id)
        return true
      })

      // Processar em lotes de 8 para evitar throttle do servidor
      const LOTE = 8
      const lista: ElementoMapa[] = []
      for (let i = 0; i < laudos.length; i += LOTE) {
        const lote = laudos.slice(i, i + LOTE)
        const resultadosLote = await Promise.all(lote.map((l: any) => processarLaudo(l)))
        lista.push(...resultadosLote.flat())
      }

      setElementos(lista)
    } catch {
      setErro('Não foi possível carregar os elementos. Tente novamente.')
    } finally {
      setCarregando(false)
    }
  }, [processarLaudo])

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
      const area = parseFloat(String(el.area || '').replace(',', '.'))
      if (filtros.areaMin && area < parseFloat(filtros.areaMin)) return false
      if (filtros.areaMax && area > parseFloat(filtros.areaMax)) return false
      const valor = parseFloat(String(el.valorOferta || '').replace(/\./g, '').replace(',', '.'))
      if (filtros.valorMin && valor < parseFloat(filtros.valorMin.replace(/\./g, ''))) return false
      if (filtros.valorMax && valor > parseFloat(filtros.valorMax.replace(/\./g, ''))) return false
      return true
    })
  }, [elementos, filtros])

  const totalFiltros = Object.values(filtros).filter(Boolean).length

  return (
    <AppShell>
      <div className="flex h-[calc(100vh-73px)] overflow-hidden">

        {/* ── Painel de filtros ── */}
        <aside
          className={`flex flex-col border-r border-slate-200 bg-white transition-all duration-300 overflow-hidden ${
            painelFiltroAberto ? 'w-72 shrink-0' : 'w-0'
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
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Tipo de imóvel</label>
              <select
                value={filtros.tipo}
                onChange={(e) => setFiltros((f) => ({ ...f, tipo: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400 focus:bg-white transition"
              >
                <option value="">Todos os tipos</option>
                {tiposUnicos.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Cidade</label>
              <select
                value={filtros.cidade}
                onChange={(e) => setFiltros((f) => ({ ...f, cidade: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400 focus:bg-white transition"
              >
                <option value="">Todas as cidades</option>
                {cidadesUnicas.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Área (m²)</label>
              <div className="flex items-center gap-2">
                <input type="number" placeholder="Mín" value={filtros.areaMin}
                  onChange={(e) => setFiltros((f) => ({ ...f, areaMin: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:bg-white transition" />
                <span className="shrink-0 text-xs text-slate-400">até</span>
                <input type="number" placeholder="Máx" value={filtros.areaMax}
                  onChange={(e) => setFiltros((f) => ({ ...f, areaMax: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:bg-white transition" />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Valor de oferta (R$)</label>
              <div className="flex items-center gap-2">
                <input type="number" placeholder="Mín" value={filtros.valorMin}
                  onChange={(e) => setFiltros((f) => ({ ...f, valorMin: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:bg-white transition" />
                <span className="shrink-0 text-xs text-slate-400">até</span>
                <input type="number" placeholder="Máx" value={filtros.valorMax}
                  onChange={(e) => setFiltros((f) => ({ ...f, valorMax: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:bg-white transition" />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Padrão construtivo</label>
              <select
                value={filtros.padrao}
                onChange={(e) => setFiltros((f) => ({ ...f, padrao: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400 focus:bg-white transition"
              >
                <option value="">Todos os padrões</option>
                {padroesUnicos.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

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
        <div className="relative flex-1 overflow-hidden">

          {/* Barra superior */}
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

              <div className="hidden items-center gap-3 md:flex">
                {Object.entries(CORES_TIPO)
                  .filter(([k]) => k !== 'default')
                  .map(([tipo, cor]) => (
                    <span key={tipo} className="flex items-center gap-1 text-[11px] text-slate-600 capitalize">
                      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: cor }} />
                      {tipo}
                    </span>
                  ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {carregando && (
                <span className="text-xs text-slate-500 animate-pulse">Carregando…</span>
              )}
              {!carregando && (
                <span className="text-xs text-slate-500">
                  {elementosFiltrados.length} de {elementos.length} elemento{elementos.length !== 1 ? 's' : ''}
                </span>
              )}
              <button
                onClick={carregarElementos}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                title="Recarregar"
              >
                ↺
              </button>
            </div>
          </div>

          {/* Mapa */}
          <div className="absolute inset-0" style={{ top: '44px' }}>
            {carregando ? (
              <div className="flex h-full items-center justify-center bg-slate-100">
                <div className="rounded-2xl bg-white/90 px-6 py-4 shadow-lg text-sm text-slate-600">
                  Carregando elementos…
                </div>
              </div>
            ) : erro ? (
              <div className="flex h-full items-center justify-center bg-slate-100">
                <div className="rounded-2xl border border-rose-200 bg-white px-6 py-4 shadow-lg text-sm text-rose-700">
                  {erro}
                </div>
              </div>
            ) : (
              <MapaOSM
                elementos={elementosFiltrados}
                selecionado={selecionado}
                onSelecionar={setSelecionado}
              />
            )}
          </div>

          {/* Painel de detalhe */}
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
                  <div className="flex flex-wrap gap-2">
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
