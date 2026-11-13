/**
 * SALVAR EM: src/app/mapa-elementos/page.tsx
 *
 * Mapa de Elementos Comparativos — usa Leaflet + OpenStreetMap para exibir o
 * mapa real do Brasil com os elementos posicionados via coordenadas reais.
 *
 * Leaflet não funciona com SSR (acessa window/document). Por isso o componente
 * do mapa é carregado com `dynamic(..., { ssr: false })`.
 *
 * Para instalar (caso ainda não esteja): npm install leaflet @types/leaflet
 */

'use client'

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import AppShell from '../components/AppShell'
import type { ElementoMapa, ElementoCDDM } from './tipos'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseCoord(s: string): [number, number] | null {
  if (!s) return null
  const partes = s.split(',').map((p) => parseFloat(p.trim().replace(',', '.')))
  if (partes.length < 2 || isNaN(partes[0]) || isNaN(partes[1])) return null
  const [lat, lon] = partes
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null
  return [lat, lon]
}

function formatarMoeda(v: string) {
  const n = parseFloat(v.replace(/\./g, '').replace(',', '.'))
  if (isNaN(n)) return v
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

// ─── Cores por tipo ───────────────────────────────────────────────────────────

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
  return CORES_TIPO[tipo.toLowerCase().trim()] || CORES_TIPO.default
}

// ─── Filtros ──────────────────────────────────────────────────────────────────

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

// ─── Componente Leaflet (sem SSR) ─────────────────────────────────────────────
// Carregado dinamicamente para evitar erros de hydration, pois Leaflet
// acessa window/document no momento da importação.

const MapaLeaflet = dynamic(() => import('./MapaLeaflet'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center">
      <div className="rounded-2xl bg-white/90 px-6 py-4 shadow-lg text-sm text-slate-600">
        Carregando mapa…
      </div>
    </div>
  ),
})

// ─── Componente principal ─────────────────────────────────────────────────────

export default function MapaElementosPage() {
  const { status: sessionStatus } = useSession()

  const [elementos, setElementos] = useState<ElementoMapa[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_INICIAIS)
  const [selecionado, setSelecionado] = useState<ElementoMapa | null>(null)
  const [painelFiltroAberto, setPainelFiltroAberto] = useState(true)

  // ── Resolver referência __ref__ ──
  const resolverDadosCDDM = useCallback(async (laudo: any): Promise<any[] | null> => {
    const rawCddm = laudo.dadosCalculoCDDM
    if (!rawCddm) return null
    if (typeof rawCddm === 'object' && Array.isArray(rawCddm.elementos)) return rawCddm.elementos
    if (typeof rawCddm === 'string' && rawCddm.startsWith('__ref__:')) {
      try {
        const resId = await fetch(`/api/laudos/${laudo.id}`, { cache: 'no-store' })
        if (!resId.ok) return null
        const laudoFull = await resId.json()
        const cddm = laudoFull.dadosCalculoCDDM
        if (cddm && typeof cddm === 'object' && Array.isArray(cddm.elementos)) return cddm.elementos
        const elems = laudoFull.elementosComparativos
        if (Array.isArray(elems)) return elems
      } catch { return null }
    }
    return null
  }, [])

  // ── Carregar dados ──
  const carregarElementos = useCallback(async () => {
    try {
      const res = await fetch('/api/laudos', { cache: 'no-store' })
      if (!res.ok) throw new Error()
      const laudos: any[] = await res.json()
      const lista: ElementoMapa[] = []
      for (const laudo of laudos) {
        let elems: ElementoCDDM[] = []
        const rawCddm = laudo.dadosCalculoCDDM
        if (rawCddm && typeof rawCddm === 'object' && Array.isArray(rawCddm.elementos)) {
          elems = rawCddm.elementos
        } else if (typeof rawCddm === 'string' && rawCddm.startsWith('__ref__:')) {
          elems = (await resolverDadosCDDM(laudo)) || []
        } else if (Array.isArray(laudo.elementosComparativos)) {
          elems = laudo.elementosComparativos
        }
        for (const el of elems) {
          if (el.coordenadas && parseCoord(el.coordenadas)) {
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
  }, [resolverDadosCDDM])

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

  // ── Filtrar elementos ──
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

  const totalFiltros = Object.values(filtros).filter(Boolean).length

  return (
    <AppShell>
      <div className="flex h-[calc(100vh-57px)] overflow-hidden">

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

            {/* Cidade */}
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

            {/* Área */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Área (m²)</label>
              <div className="flex items-center gap-2">
                <input type="number" placeholder="Mín" value={filtros.areaMin} onChange={(e) => setFiltros((f) => ({ ...f, areaMin: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:bg-white transition" />
                <span className="shrink-0 text-xs text-slate-400">até</span>
                <input type="number" placeholder="Máx" value={filtros.areaMax} onChange={(e) => setFiltros((f) => ({ ...f, areaMax: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:bg-white transition" />
              </div>
            </div>

            {/* Valor */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Valor de oferta (R$)</label>
              <div className="flex items-center gap-2">
                <input type="number" placeholder="Mín" value={filtros.valorMin} onChange={(e) => setFiltros((f) => ({ ...f, valorMin: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:bg-white transition" />
                <span className="shrink-0 text-xs text-slate-400">até</span>
                <input type="number" placeholder="Máx" value={filtros.valorMax} onChange={(e) => setFiltros((f) => ({ ...f, valorMax: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:bg-white transition" />
              </div>
            </div>

            {/* Padrão */}
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
          <div className="absolute left-0 right-0 top-0 z-[1000] flex items-center justify-between gap-3 border-b border-slate-200/60 bg-white/90 px-4 py-2.5 backdrop-blur">
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
                      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: cor }} />
                      {tipo}
                    </span>
                  ))}
              </div>
            </div>

            <span className="text-xs text-slate-500">
              {carregando ? 'Carregando…' : `${elementosFiltrados.length} elemento${elementosFiltrados.length !== 1 ? 's' : ''}`}
            </span>
          </div>

          {/* Mapa Leaflet */}
          <div className="absolute inset-0" style={{ top: '44px' }}>
            {carregando ? (
              <div className="flex h-full items-center justify-center bg-slate-100">
                <div className="rounded-2xl bg-white px-6 py-4 shadow-lg text-sm text-slate-600">
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
              <MapaLeaflet
                elementos={elementosFiltrados}
                selecionado={selecionado}
                onSelecionar={setSelecionado}
                corParaTipo={corParaTipo}
              />
            )}
          </div>

          {/* Painel de detalhe */}
          {selecionado && (
            <div className="absolute bottom-4 right-4 z-[1000] w-80 rounded-2xl border border-slate-200 bg-white shadow-[0_8px_32px_-8px_rgba(15,23,42,0.3)] overflow-hidden">
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
                  <div className="flex gap-2 flex-wrap">
                    {selecionado.dormitorios && (
                      <span className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600">🛏 {selecionado.dormitorios} dorm.</span>
                    )}
                    {selecionado.suites && (
                      <span className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600">🚿 {selecionado.suites} suítes</span>
                    )}
                    {selecionado.vagas && (
                      <span className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600">🚗 {selecionado.vagas} vaga{Number(selecionado.vagas) !== 1 ? 's' : ''}</span>
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
                  <a href={selecionado.link} target="_blank" rel="noopener noreferrer" className="mt-1 flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700">
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
