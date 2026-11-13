/**
 * SALVAR EM: src/app/mapa-elementos/MapaLeaflet.tsx
 *
 * Componente interno — renderiza o mapa Leaflet com OpenStreetMap.
 * Importado via dynamic(..., { ssr: false }) em page.tsx para evitar erros
 * de hydration (Leaflet acessa window/document na importação).
 *
 * Dependências: npm install leaflet @types/leaflet
 */

'use client'

import { useEffect, useRef, type Dispatch, type SetStateAction } from 'react'
import type { ElementoMapa } from './tipos'

type Props = {
  elementos: ElementoMapa[]
  selecionado: ElementoMapa | null
  onSelecionar: Dispatch<SetStateAction<ElementoMapa | null>>
  corParaTipo: (tipo: string) => string
}

function parseCoord(s: string): [number, number] | null {
  if (!s) return null
  const partes = s.split(',').map((p) => parseFloat(p.trim().replace(',', '.')))
  if (partes.length < 2 || isNaN(partes[0]) || isNaN(partes[1])) return null
  const [lat, lon] = partes
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null
  return [lat, lon]
}

export default function MapaLeaflet({ elementos, selecionado, onSelecionar, corParaTipo }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])

  // ── Inicializar mapa ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    // Import dinâmico — Leaflet não suporta SSR
    import('leaflet').then((L) => {
      // Corrigir ícones padrão do Leaflet (problema clássico com bundlers)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      // Criar mapa centrado no Brasil
      const map = L.map(containerRef.current!, {
        center: [-15.78, -47.93], // Brasília como centro inicial
        zoom: 5,
        zoomControl: true,
      })

      // Tile layer OpenStreetMap (gratuito, sem API key)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map)

      mapRef.current = map
    })

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Atualizar marcadores quando elementos mudam ───────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return

    import('leaflet').then((L) => {
      const map = mapRef.current

      // Remover marcadores anteriores
      markersRef.current.forEach((m) => m.remove())
      markersRef.current = []

      if (elementos.length === 0) return

      const bounds: [number, number][] = []

      elementos.forEach((el) => {
        const coord = parseCoord(el.coordenadas)
        if (!coord) return

        const [lat, lon] = coord
        bounds.push([lat, lon])

        const cor = corParaTipo(el.tipo || '')

        // Ícone SVG alfinete colorido
        const svgPin = `
          <svg width="26" height="34" viewBox="0 0 26 34" xmlns="http://www.w3.org/2000/svg">
            <path d="M13 0C6.373 0 1 5.373 1 12c0 9 12 22 12 22S25 21 25 12C25 5.373 19.627 0 13 0z"
              fill="${cor}" stroke="white" stroke-width="2"/>
            <circle cx="13" cy="12" r="4.5" fill="white" fill-opacity="0.9"/>
          </svg>`

        const icon = L.divIcon({
          html: svgPin,
          className: '',
          iconSize: [26, 34],
          iconAnchor: [13, 34],
          popupAnchor: [0, -34],
        })

        const endereco = [el.logradouro, el.bairro, el.cidade].filter(Boolean).join(', ') || 'Endereço não informado'
        const areaStr = el.area ? `${el.area} m²` : ''
        const valorStr = el.valorOferta
          ? parseFloat(el.valorOferta.replace(/\./g, '').replace(',', '.')).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
          : ''

        const popupHtml = `
          <div style="min-width:200px;font-family:system-ui,sans-serif">
            <span style="display:inline-block;background:${cor};color:#fff;border-radius:99px;padding:1px 8px;font-size:11px;font-weight:700;text-transform:capitalize;margin-bottom:4px">
              ${el.tipo || 'Imóvel'}
            </span>
            <p style="margin:0 0 2px;font-size:13px;font-weight:600;color:#0f172a;line-height:1.3">${endereco}</p>
            ${areaStr || valorStr ? `<div style="display:flex;gap:12px;margin-top:6px">
              ${areaStr ? `<div><p style="margin:0;font-size:9px;font-weight:700;text-transform:uppercase;color:#94a3b8">Área</p><p style="margin:0;font-size:13px;font-weight:600;color:#0f172a">${areaStr}</p></div>` : ''}
              ${valorStr ? `<div><p style="margin:0;font-size:9px;font-weight:700;text-transform:uppercase;color:#94a3b8">Valor</p><p style="margin:0;font-size:13px;font-weight:600;color:#0f172a">${valorStr}</p></div>` : ''}
            </div>` : ''}
            ${el.fonte ? `<p style="margin:6px 0 0;font-size:11px;color:#64748b"><b>Fonte:</b> ${el.fonte}${el.data ? ` · ${el.data}` : ''}</p>` : ''}
            <p style="margin:4px 0 0;font-size:10px;color:#94a3b8">Laudo: <b>${el.laudoReferencia}</b></p>
          </div>`

        const marker = L.marker([lat, lon], { icon })
          .addTo(map)
          .bindPopup(popupHtml, { maxWidth: 260 })

        marker.on('click', () => onSelecionar(el))
        markersRef.current.push(marker)
      })

      // Ajustar visão para cobrir todos os pontos
      if (bounds.length > 0) {
        if (bounds.length === 1) {
          map.setView(bounds[0], 14)
        } else {
          map.fitBounds(bounds as any, { padding: [40, 40] })
        }
      }
    })
  // onSelecionar e corParaTipo são estáveis — não precisam entrar nas deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elementos])

  // ── Destacar marcador selecionado (abre popup) ────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !selecionado) return
    const coord = parseCoord(selecionado.coordenadas)
    if (!coord) return
    const [lat, lon] = coord
    // Encontrar o marcador correspondente e abrir popup
    const idx = elementos.findIndex(
      (el) => el.laudoId === selecionado.laudoId && (el.id === selecionado.id || el.coordenadas === selecionado.coordenadas)
    )
    if (idx !== -1 && markersRef.current[idx]) {
      markersRef.current[idx].openPopup()
      mapRef.current.panTo([lat, lon])
    }
  }, [selecionado, elementos])

  return (
    <>
      {/* CSS do Leaflet — carregado inline para garantir que sempre esteja presente */}
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        crossOrigin=""
      />
      <div
        ref={containerRef}
        style={{ width: '100%', height: '100%' }}
      />
    </>
  )
}
