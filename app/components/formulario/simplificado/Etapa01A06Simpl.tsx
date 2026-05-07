'use client'

import { useState } from 'react'
import { flushSync } from 'react-dom'

// ─── Helpers de geocodificação ────────────────────────────────────────────────

function haversineMetros(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000
  const toRad = (v: number) => (v * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.asin(Math.sqrt(a))
}

function formatarDistancia(m: number) {
  if (m < 1000) return `${Math.round(m)} m`
  return `${(m / 1000).toFixed(1).replace('.', ',')} km`
}

// ─── Componentes visuais auxiliares ──────────────────────────────────────────

function SectionCard({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50">
        <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-medium text-slate-500 mb-1.5">
      {children}
    </label>
  )
}

function inputCls() {
  return 'w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition'
}

function selectCls() {
  return 'w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white text-slate-900 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition appearance-none'
}

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Props = {
  handleMelhoramentosPublicosChange: (campo: string, valor: string) => void
  form: any
  handleChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => void
  onAutoFill?: (campos: Record<string, string>) => void
  setForm?: React.Dispatch<React.SetStateAction<any>>
  areaConstruidaNaoAverbada: number
  areaTerrenoNaoAverbada: number
  usarCidadeReferencia: boolean
  setUsarCidadeReferencia: (valor: boolean) => void
  divisoes: { quantidade: string; ambiente: string }[]
  handleDivisaoChange: (
    index: number,
    campo: 'quantidade' | 'ambiente',
    valor: string
  ) => void
  adicionarLinhaDivisao: () => void
  removerLinhaDivisao: (index: number) => void
  handleCroqui: (e: React.ChangeEvent<HTMLInputElement>) => void
  removerCroqui: (index: number) => void
  tipoLaudo?: 'detalhado' | 'simplificado'
  fatoresCDDMAtivos?: { local: boolean; padrao: boolean; foc: boolean; andar: boolean; vaga: boolean }
  toggleFatorCDDM?: (fator: 'local' | 'padrao' | 'foc' | 'andar' | 'vaga') => void
  tipoImovelCDDM?: '' | 'isolado' | 'fracao'
  setTipoImovelCDDM?: (tipo: 'isolado' | 'fracao') => void
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function Etapa01A06({
  form,
  handleChange,
  handleMelhoramentosPublicosChange,
  onAutoFill,
  setForm: setFormDirect,
  areaConstruidaNaoAverbada,
  areaTerrenoNaoAverbada,
  usarCidadeReferencia,
  setUsarCidadeReferencia,
  divisoes,
  handleDivisaoChange,
  adicionarLinhaDivisao,
  removerLinhaDivisao,
  handleCroqui,
  removerCroqui,
  tipoLaudo,
  fatoresCDDMAtivos,
  toggleFatorCDDM,
  tipoImovelCDDM,
  setTipoImovelCDDM,
}: Props) {
  const fatores = fatoresCDDMAtivos ?? { local: true, padrao: true, foc: true, andar: true, vaga: true }
  const isFracao = tipoImovelCDDM === 'fracao'

  // Toggle switch component inline
  const Toggle = ({ fator, label }: { fator: 'local' | 'padrao' | 'foc' | 'andar' | 'vaga'; label: string }) => (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => toggleFatorCDDM?.(fator)}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
          fatores[fator] ? 'bg-blue-600' : 'bg-slate-200'
        }`}
      >
        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
          fatores[fator] ? 'translate-x-4' : 'translate-x-0.5'
        }`} />
      </button>
      <span className={`text-xs font-medium ${fatores[fator] ? 'text-slate-700' : 'text-slate-400'}`}>{label}</span>
    </div>
  )
  const [buscandoCoords, setBuscandoCoords] = useState(false)
  const [msgCoords, setMsgCoords] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)
  const [gerandoCroqui, setGerandoCroqui] = useState(false)

  async function gerarCroquiAutomatico() {
    const coords = (form.coordenadasImovel || '').trim()
    if (!coords) return
    const partes = coords.split(',').map((s: string) => s.trim())
    if (partes.length < 2) return
    const [lat, lng] = partes
    if (!lat || !lng || isNaN(Number(lat)) || isNaN(Number(lng))) return

    setGerandoCroqui(true)
    try {
      const latN = Number(lat)
      const lngN = Number(lng)
      const zoom = 18  // zoom alto para satélite detalhado

      // Calcula tile central
      const tileX = Math.floor((lngN + 180) / 360 * Math.pow(2, zoom))
      const tileY = Math.floor((1 - Math.log(Math.tan(latN * Math.PI / 180) + 1 / Math.cos(latN * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom))

      // Monta canvas 3x3 tiles (768x768px)
      const size = 256
      const cols = 3, rows = 3
      const canvas = document.createElement('canvas')
      canvas.width = cols * size
      canvas.height = rows * size
      const ctx = canvas.getContext('2d')!

      // Carrega tiles satélite ESRI via proxy
      const tilePromises: Promise<void>[] = []
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const tx = tileX + dx
          const ty = tileY + dy
          const col = dx + 1
          const row = dy + 1
          tilePromises.push(
            new Promise<void>((resolve) => {
              const img = new window.Image()
              img.crossOrigin = 'anonymous'
              img.onload = () => {
                ctx.drawImage(img, col * size, row * size, size, size)
                resolve()
              }
              img.onerror = () => resolve()
              img.src = `/api/mapa-estatico?z=${zoom}&x=${tx}&y=${ty}`
            })
          )
        }
      }
      await Promise.all(tilePromises)

      // O pin fica SEMPRE no centro do canvas porque os tiles foram
      // calculados com a coordenada exatamente no tile central.
      // A posição subpixel dentro do tile é compensada centralizando o grid.
      const cx = Math.round(canvas.width / 2)
      const cy = Math.round(canvas.height / 2)

      // Sombra
      ctx.shadowColor = 'rgba(0,0,0,0.6)'
      ctx.shadowBlur = 8
      ctx.shadowOffsetX = 2
      ctx.shadowOffsetY = 3

      // Corpo do pin (círculo)
      ctx.beginPath()
      ctx.arc(cx, cy - 20, 14, 0, 2 * Math.PI)
      ctx.fillStyle = '#dc2626'
      ctx.fill()
      ctx.shadowBlur = 0
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2.5
      ctx.stroke()

      // Ponta do pin
      ctx.beginPath()
      ctx.moveTo(cx - 8, cy - 10)
      ctx.lineTo(cx + 8, cy - 10)
      ctx.lineTo(cx, cy + 2)
      ctx.closePath()
      ctx.fillStyle = '#dc2626'
      ctx.fill()

      // Ponto branco interno
      ctx.beginPath()
      ctx.arc(cx, cy - 20, 5, 0, 2 * Math.PI)
      ctx.fillStyle = '#ffffff'
      ctx.fill()

      const base64 = canvas.toDataURL('image/jpeg', 0.92)

      const novosCroquis = [
        { preview: base64, automatico: true },
        ...(form.croquis || []).filter((c: any) => !c.automatico),
      ]
      if (setFormDirect) {
        setFormDirect((prev: any) => ({ ...prev, croquis: novosCroquis }))
      }
    } catch (err) {
      console.error('Erro ao gerar croqui:', err)
    } finally {
      setGerandoCroqui(false)
    }
  }

  function setField(name: string, value: string) {
    handleChange({
      target: { name, value },
    } as React.ChangeEvent<HTMLInputElement>)
  }

  async function buscarDadosPorCoordenadas() {
    const raw = (form.coordenadasImovel || '').trim()
    const match = raw.match(/(-?\d+[.,]?\d*)[,\s]+(-?\d+[.,]?\d*)/)
    if (!match) {
      setMsgCoords({ tipo: 'erro', texto: 'Formato inválido. Use: -23.550520, -46.633308' })
      return
    }

    const lat = parseFloat(match[1].replace(',', '.'))
    const lon = parseFloat(match[2].replace(',', '.'))

    setBuscandoCoords(true)
    setMsgCoords(null)

    const camposAutoFill: Record<string, string> = {}
    let erroEndereco = false
    let erroReferencias = false

    try {
      const resRev = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=pt-BR`
      )
      if (!resRev.ok) throw new Error('Nominatim indisponível')
      const dadosRev = await resRev.json()
      const a = dadosRev.address || {}
      const rua = [a.road, a.house_number].filter(Boolean).join(', ')
      const bairro = a.suburb || a.neighbourhood || ''
      const cidade = a.city || a.town || a.village || ''
      const estado = a.state || ''
      const cep = a.postcode ? `CEP ${a.postcode}` : ''
      const enderecoMontado = [rua, bairro, cidade, estado, cep].filter(Boolean).join(' – ')
      if (enderecoMontado) camposAutoFill['endereco'] = enderecoMontado
    } catch {
      erroEndereco = true
    }

    camposAutoFill['referencia1'] = ''
    camposAutoFill['distancia1'] = ''
    camposAutoFill['referencia2'] = ''
    camposAutoFill['distancia2'] = ''
    camposAutoFill['referencia3'] = ''
    camposAutoFill['distancia3'] = ''
    camposAutoFill['referencia4'] = ''
    camposAutoFill['distancia4'] = ''
    camposAutoFill['referencia5'] = ''
    camposAutoFill['distancia5'] = ''

    try {
      const overpassQuery =
        `[out:json][timeout:30];` +
        `(` +
        `nwr["name"]["amenity"~"^(hospital|bank|pharmacy|school|place_of_worship|police|college|university|fuel|courthouse|town_hall)$"](around:6000,${lat},${lon});` +
        `nwr["name"]["shop"~"^(supermarket|mall)$"](around:6000,${lat},${lon});` +
        `nwr["name"]["leisure"~"^(stadium)$"](around:6000,${lat},${lon});` +
        `);out center 60;`

      const mirrors = [
        'https://overpass-api.de/api/interpreter',
        'https://overpass.kumi.systems/api/interpreter',
        'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
      ]

      let dadosOver: any = null
      for (const mirror of mirrors) {
        try {
          const res = await fetch(mirror, {
            method: 'POST',
            body: `data=${encodeURIComponent(overpassQuery)}`,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            signal: AbortSignal.timeout(20000),
          })
          if (!res.ok) continue
          const json = await res.json()
          if (json?.elements?.length > 0) { dadosOver = json; break }
        } catch {
          continue
        }
      }

      if (!dadosOver) throw new Error('Todos os mirrors Overpass falharam')

      type PoiItem = { nome: string; dist: number }
      const pois: PoiItem[] = (dadosOver.elements || [])
        .map((el: any) => {
          const elLat = el.lat ?? el.center?.lat
          const elLon = el.lon ?? el.center?.lon
          const nome = el.tags?.name
          if (!elLat || !elLon || !nome) return null
          return { nome, dist: haversineMetros(lat, lon, elLat, elLon) }
        })
        .filter(Boolean)
        .sort((a: PoiItem, b: PoiItem) => a.dist - b.dist)

      const vistos = new Set<string>()
      const poisUnicos: PoiItem[] = []
      for (const p of pois) {
        const chave = p.nome.toLowerCase().trim()
        if (!vistos.has(chave)) { vistos.add(chave); poisUnicos.push(p) }
        if (poisUnicos.length === 5) break
      }

      if (poisUnicos[0]) { camposAutoFill['referencia1'] = poisUnicos[0].nome; camposAutoFill['distancia1'] = formatarDistancia(poisUnicos[0].dist) }
      if (poisUnicos[1]) { camposAutoFill['referencia2'] = poisUnicos[1].nome; camposAutoFill['distancia2'] = formatarDistancia(poisUnicos[1].dist) }
      if (poisUnicos[2]) { camposAutoFill['referencia3'] = poisUnicos[2].nome; camposAutoFill['distancia3'] = formatarDistancia(poisUnicos[2].dist) }
      if (poisUnicos[3]) { camposAutoFill['referencia4'] = poisUnicos[3].nome; camposAutoFill['distancia4'] = formatarDistancia(poisUnicos[3].dist) }
      if (poisUnicos[4]) { camposAutoFill['referencia5'] = poisUnicos[4].nome; camposAutoFill['distancia5'] = formatarDistancia(poisUnicos[4].dist) }
    } catch {
      erroReferencias = true
    }

    if (Object.keys(camposAutoFill).length > 0) {
      if (setFormDirect) {
        setFormDirect((prev: any) => ({ ...prev, ...camposAutoFill }))
      } else if (onAutoFill) {
        onAutoFill(camposAutoFill)
      } else {
        Object.entries(camposAutoFill).forEach(([k, v]) => {
          flushSync(() => setField(k, v))
        })
      }
    }

    if (!erroEndereco && !erroReferencias) {
      setMsgCoords({ tipo: 'ok', texto: 'Endereço e referências preenchidos automaticamente.' })
    } else if (!erroEndereco && erroReferencias) {
      setMsgCoords({ tipo: 'ok', texto: 'Endereço preenchido. Referências não encontradas (serviço externo indisponível).' })
    } else if (erroEndereco && !erroReferencias) {
      setMsgCoords({ tipo: 'ok', texto: 'Referências preenchidas. Endereço não encontrado para essas coordenadas.' })
    } else {
      setMsgCoords({ tipo: 'erro', texto: 'Não foi possível buscar os dados. Verifique sua conexão e tente novamente.' })
    }

    setBuscandoCoords(false)

    // Gera croqui automático após preencher dados
    gerarCroquiAutomatico()
  }

  return (
    <div className="space-y-5">

      {/* Cabeçalho da etapa */}
      <div>
        <h2 className="text-xl font-semibold text-slate-900 mb-1">
          1 a 6. Identificação e caracterização do imóvel
        </h2>
        <p className="text-sm text-slate-500">
          Preencha os dados iniciais do imóvel, áreas, divisões, referências e croqui.
        </p>
      </div>

      {/* ── Coordenadas ────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 space-y-3">
        <label className="block text-sm font-semibold text-blue-900">
          📍 Coordenadas do imóvel
        </label>

        <div className="flex gap-2">
          <input
            name="coordenadasImovel"
            placeholder="Ex: -23.550520, -46.633308"
            value={form.coordenadasImovel || ''}
            onChange={handleChange}
            className="flex-1 border border-blue-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
          />
          <button
            type="button"
            onClick={buscarDadosPorCoordenadas}
            disabled={buscandoCoords || !form.coordenadasImovel?.trim()}
            className="px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition whitespace-nowrap flex items-center gap-2"
          >
            {buscandoCoords ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Buscando…
              </>
            ) : (
              '🔍 Preencher dados'
            )}
          </button>
        </div>

        {msgCoords && (
          <p className={`text-sm rounded-lg px-3 py-2 ${msgCoords.tipo === 'ok' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {msgCoords.tipo === 'ok' ? '✅ ' : '⚠️ '}{msgCoords.texto}
          </p>
        )}

        <p className="text-xs text-blue-700 leading-relaxed">
          Após inserir as coordenadas, clique em <strong>Preencher dados</strong> para buscar automaticamente o endereço e os pontos de referência mais próximos.
          Os campos preenchidos podem ser editados manualmente.
        </p>
      </div>

      {/* ── Tipo de imóvel ────────────────────────────────────────────────────── */}
      <SectionCard title="Tipo de imóvel">
        <p className="text-xs text-slate-400 mb-3">
          Define os campos disponíveis e os fatores padrão para o cálculo CDDM.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {([
            { value: 'isolado', label: 'Imóvel isolado', desc: 'Casa, terreno, galpão. Sem fração ideal.' },
            { value: 'fracao', label: 'Imóvel com fração', desc: 'Apartamento, sala, vaga. Possui área comum e fração ideal.' },
          ] as const).map(({ value, label, desc }) => (
            <button
              key={value}
              type="button"
              onClick={() => setTipoImovelCDDM?.(value)}
              className={`rounded-2xl border-2 p-3 text-left transition ${
                tipoImovelCDDM === value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <p className="text-sm font-semibold text-slate-800 mb-0.5">{label}</p>
              <p className="text-[11px] text-slate-500 leading-tight">{desc}</p>
              {value === 'isolado' && (
                <p className="text-[10px] text-amber-600 mt-1">Fatores Andar e Vaga desativados por padrão</p>
              )}
            </button>
          ))}
        </div>
      </SectionCard>

      {/* ── Dados principais ──────────────────────────────────────────────────── */}
      <SectionCard title="Dados do imóvel">
        <div>
          <FieldLabel>Endereço</FieldLabel>
          <input
            name="endereco"
            placeholder="Endereço"
            value={form.endereco}
            onChange={handleChange}
            className={inputCls()}
          />
        </div>

        <div>
          <FieldLabel>Proprietário</FieldLabel>
          <input
            name="proprietario"
            placeholder="Proprietário"
            value={form.proprietario}
            onChange={handleChange}
            className={inputCls()}
          />
        </div>

        <div>
          <FieldLabel>Solicitante / Interessado</FieldLabel>
          <input
            name="solicitante"
            placeholder="Solicitante / Interessado"
            value={form.solicitante || ''}
            onChange={handleChange}
            className={inputCls()}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <FieldLabel>Tipo do imóvel</FieldLabel>
            <input
              name="tipo"
              placeholder="Tipo do imóvel"
              value={form.tipo}
              onChange={handleChange}
              className={inputCls()}
            />
          </div>

          <div>
            <FieldLabel>Finalidade</FieldLabel>
            <select
              name="finalidade"
              value={form.finalidade}
              onChange={handleChange}
              className={selectCls()}
            >
              <option value="">Selecione a finalidade</option>
              <option value="garantia">Garantia</option>
              <option value="execucao">Execução</option>
            </select>
          </div>
        </div>
      </SectionCard>

      {/* ── Definições iniciais do laudo ──────────────────────────────────────── */}
      <SectionCard title="Definições iniciais do laudo">
        <div>
          <FieldLabel>Método de avaliação</FieldLabel>
          <select
            name="metodoAvaliacao"
            value={form.metodoAvaliacao}
            onChange={handleChange}
            className={selectCls()}
          >
            <option value="">Selecione</option>
            <option value="comparativo">Método Comparativo</option>
            <option value="evolutivo">Método Evolutivo</option>
          </select>
        </div>

        <div>
          <FieldLabel>Tratamento dos dados</FieldLabel>
          <select
            name="tratamentoDados"
            value={form.tratamentoDados}
            onChange={handleChange}
            className={selectCls()}
          >
            <option value="">Selecione</option>
            <option value="inferencia_estatistica">Inferência estatística</option>
            <option value="tratamento_por_fatores">Tratamento de dados por fatores</option>
          </select>
        </div>
      </SectionCard>

      {/* ── Áreas principais ──────────────────────────────────────────────────── */}
      <SectionCard title="Áreas principais">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <FieldLabel>{isFracao ? 'Área privativa total (m²)' : 'Área construída total (m²)'}</FieldLabel>
            <input
              name="areaConstruidaTotal"
              placeholder="0,00"
              value={form.areaConstruidaTotal}
              onChange={handleChange}
              className={inputCls()}
            />
          </div>

          <div>
            <FieldLabel>{isFracao ? 'Área privativa averbada (m²)' : 'Área construída averbada (m²)'}</FieldLabel>
            <input
              name="areaConstruidaAverbada"
              placeholder="0,00"
              value={form.areaConstruidaAverbada}
              onChange={handleChange}
              className={inputCls()}
            />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <span className="text-xs font-medium text-slate-500">
            {isFracao ? 'Área privativa não averbada' : 'Área construída não averbada'}
          </span>
          <p className="text-sm font-semibold text-slate-800 mt-0.5">
            {areaConstruidaNaoAverbada.toLocaleString('pt-BR')} m²
          </p>
        </div>

        {/* Campos de fração — apenas para imóvel com fração */}
        {isFracao && (
          <div className="grid grid-cols-3 gap-4">
            <div>
              <FieldLabel>Área comum (m²)</FieldLabel>
              <input name="areaComum" placeholder="0,00"
                value={form.areaComum || ''} onChange={handleChange} className={inputCls()} />
            </div>
            <div>
              <FieldLabel>Área total (m²)</FieldLabel>
              <input name="areaTotal" placeholder="0,00"
                value={form.areaTotal || ''} onChange={handleChange} className={inputCls()} />
            </div>
            <div>
              <FieldLabel>Fração ideal (%)</FieldLabel>
              <input name="fracaoIdeal" placeholder="0,000000"
                value={form.fracaoIdeal || ''} onChange={handleChange} className={inputCls()} />
            </div>
          </div>
        )}

        {/* Área de terreno — oculta para imóvel com fração */}
        {!isFracao && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <FieldLabel>Área de terreno total (m²)</FieldLabel>
                <input
                  name="areaTerrenoTotal"
                  placeholder="0,00"
                  value={form.areaTerrenoTotal}
                  onChange={handleChange}
                  className={inputCls()}
                />
              </div>

              <div>
                <FieldLabel>Área de terreno averbada (m²)</FieldLabel>
                <input
                  name="areaTerrenoAverbada"
                  placeholder="0,00"
                  value={form.areaTerrenoAverbada}
                  onChange={handleChange}
                  className={inputCls()}
                />
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <span className="text-xs font-medium text-slate-500">Área de terreno não averbada</span>
              <p className="text-sm font-semibold text-slate-800 mt-0.5">
                {areaTerrenoNaoAverbada.toLocaleString('pt-BR')} m²
              </p>
            </div>
          </>
        )}
      </SectionCard>

      {/* ── Detalhes complementares ───────────────────────────────────────────── */}
      <SectionCard title="Detalhes complementares">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <FieldLabel>Matrícula do imóvel</FieldLabel>
            <input
              name="matricula"
              placeholder="Matrícula do imóvel"
              value={form.matricula}
              onChange={handleChange}
              className={inputCls()}
            />
          </div>

          <div>
            <FieldLabel>IPTU</FieldLabel>
            <input
              name="iptu"
              placeholder="IPTU"
              value={form.iptu || ''}
              onChange={handleChange}
              className={inputCls()}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <FieldLabel>Padrão</FieldLabel>
            <select
              name="padrao"
              value={form.padrao || ''}
              onChange={handleChange}
              className={selectCls()}
            >
              <option value="">Selecione o padrão</option>
              <optgroup label="Apartamento">
                {['Apto. Econômico -','Apto. Econômico','Apto. Econômico +',
                  'Apto. Simples s/elev. -','Apto. Simples s/elev.','Apto. Simples s/elev. +',
                  'Apto. Simples c/elev. -','Apto. Simples c/elev.','Apto. Simples c/elev. +',
                  'Apto. Médio s/elev. -','Apto. Médio s/elev.','Apto. Médio s/elev. +',
                  'Apto. Médio c/elev. -','Apto. Médio c/elev.','Apto. Médio c/elev. +',
                  'Apto. Superior s/elev. -','Apto. Superior s/elev.','Apto. Superior s/elev. +',
                  'Apto. Superior c/elev. -','Apto. Superior c/elev.','Apto. Superior c/elev. +',
                  'Apto. Fino -','Apto. Fino','Apto. Fino +','Apto. Luxo',
                ].map(v => <option key={v} value={v}>{v}</option>)}
              </optgroup>
              <optgroup label="Casa">
                {['Casa Padrão Rústico Mínimo','Casa Padrão Rústico Médio','Casa Padrão Rústico Máximo',
                  'Casa Padrão Proletário Mínimo','Casa Padrão Proletário Médio','Casa Padrão Proletário Máximo',
                  'Casa Padrão Econômico Mínimo','Casa Padrão Econômico Médio','Casa Padrão Econômico Máximo',
                  'Casa Padrão Simples Mínimo','Casa Padrão Simples Médio','Casa Padrão Simples Máximo',
                  'Casa Padrão Médio Mínimo','Casa Padrão Médio Médio','Casa Padrão Médio Máximo',
                  'Casa Padrão Superior Mínimo','Casa Padrão Superior Médio','Casa Padrão Superior Máximo',
                  'Casa Padrão Fino Mínimo','Casa Padrão Fino Médio','Casa Padrão Fino Máximo','Casa Padrão Luxo',
                  'CASA | Fino','CASA | Fino +','CASA | Luxo -',
                ].map(v => <option key={v} value={v}>{v}</option>)}
              </optgroup>
              <optgroup label="Escritório">
                {['Escritório Econômico -','Escritório Econômico','Escritório Econômico +',
                  'Escritório Simples s/Elevador -','Escritório Simples s/Elevador','Escritório Simples s/Elevador +',
                  'Escritório Simples c/Elevador -','Escritório Simples c/Elevador','Escritório Simples c/Elevador +',
                  'Escritório Médio s/Elevador -','Escritório Médio s/Elevador','Escritório Médio s/Elevador +',
                  'Escritório Médio c/Elevador -','Escritório Médio c/Elevador','Escritório Médio c/Elevador +',
                  'Escritório Superior s/Elevador -','Escritório Superior s/Elevador','Escritório Superior s/Elevador +',
                  'Escritório Superior c/Elevador -','Escritório Superior c/Elevador','Escritório Superior c/Elevador +',
                  'Escritório Fino -','Escritório Fino','Escritório Fino +','Escritório Luxo',
                ].map(v => <option key={v} value={v}>{v}</option>)}
              </optgroup>
              <optgroup label="Galpão">
                {['GALPÃO | Econômico -','GALPÃO | Econômico','GALPÃO | Econômico +',
                  'GALPÃO | Simples -','GALPÃO | Simples','GALPÃO | Simples +',
                  'GALPÃO | Médio -','GALPÃO | Médio','GALPÃO | Médio +','GALPÃO | Superior -',
                ].map(v => <option key={v} value={v}>{v}</option>)}
              </optgroup>
              <optgroup label="Cobertura">
                {['COBERTURA | Simples -','COBERTURA | Simples','COBERTURA | Simples +',
                  'COBERTURA | Médio -','COBERTURA | Médio','COBERTURA | Médio +',
                  'COBERTURA | Superior -','COBERTURA | Superior','COBERTURA | Superior +',
                ].map(v => <option key={v} value={v}>{v}</option>)}
              </optgroup>
            </select>
          </div>

          <div>
            <FieldLabel>Idade aparente</FieldLabel>
            <input
              name="idadeAparente"
              placeholder="Idade aparente"
              value={form.idadeAparente}
              onChange={handleChange}
              className={inputCls()}
            />
          </div>
        </div>

        <div>
          <FieldLabel>Estado de conservação</FieldLabel>
          <select
            name="estadoConservacao"
            value={form.estadoConservacao}
            onChange={handleChange}
            className={selectCls()}
          >
            <option value="">Estado de conservação</option>
            <option value="Novo">Novo</option>
            <option value="Entre novo e regular">Entre novo e regular</option>
            <option value="Regular">Regular</option>
            <option value="Entre regular e reparos simples">Entre regular e reparos simples</option>
            <option value="Reparos simples">Reparos simples</option>
            <option value="Entre reparos simples e importantes">Entre reparos simples e importantes</option>
            <option value="Reparos importantes">Reparos importantes</option>
            <option value="Entre reparos importantes e sem valor">Entre reparos importantes e sem valor</option>
            <option value="Sem valor">Sem valor</option>
          </select>
        </div>
      </SectionCard>

      {/* ── Dados do avaliando para cálculo CDDM ──────────────────────────────── */}
      <SectionCard title="Dados do avaliando para cálculo CDDM">
        <p className="text-xs text-slate-400 mb-4">
          Ative ou desative cada fator. Fatores desativados são fixados em 1,0 no cálculo e removidos da seção de elementos comparativos.
        </p>

        {/* Fator Padrão */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">Fator Padrão</span>
            <Toggle fator="padrao" label={fatores.padrao ? 'Ativo' : 'Desativado'} />
          </div>
          {fatores.padrao && (
            <select
              name="padraoCDDM"
              value={form.padraoCDDM || ''}
              onChange={handleChange}
              className={selectCls()}
            >
              <option value="">Selecione o padrão (CDDM)</option>
              <optgroup label="Apartamento">
                {['Apto. Econômico -','Apto. Econômico','Apto. Econômico +',
                  'Apto. Simples s/elev. -','Apto. Simples s/elev.','Apto. Simples s/elev. +',
                  'Apto. Simples c/elev. -','Apto. Simples c/elev.','Apto. Simples c/elev. +',
                  'Apto. Médio s/elev. -','Apto. Médio s/elev.','Apto. Médio s/elev. +',
                  'Apto. Médio c/elev. -','Apto. Médio c/elev.','Apto. Médio c/elev. +',
                  'Apto. Superior s/elev. -','Apto. Superior s/elev.','Apto. Superior s/elev. +',
                  'Apto. Superior c/elev. -','Apto. Superior c/elev.','Apto. Superior c/elev. +',
                  'Apto. Fino -','Apto. Fino','Apto. Fino +','Apto. Luxo',
                ].map(v => <option key={v} value={v}>{v}</option>)}
              </optgroup>
              <optgroup label="Casa">
                {['Casa Padrão Rústico Mínimo','Casa Padrão Rústico Médio','Casa Padrão Rústico Máximo',
                  'Casa Padrão Proletário Mínimo','Casa Padrão Proletário Médio','Casa Padrão Proletário Máximo',
                  'Casa Padrão Econômico Mínimo','Casa Padrão Econômico Médio','Casa Padrão Econômico Máximo',
                  'Casa Padrão Simples Mínimo','Casa Padrão Simples Médio','Casa Padrão Simples Máximo',
                  'Casa Padrão Médio Mínimo','Casa Padrão Médio Médio','Casa Padrão Médio Máximo',
                  'Casa Padrão Superior Mínimo','Casa Padrão Superior Médio','Casa Padrão Superior Máximo',
                  'Casa Padrão Fino Mínimo','Casa Padrão Fino Médio','Casa Padrão Fino Máximo','Casa Padrão Luxo',
                  'CASA | Fino','CASA | Fino +','CASA | Luxo -',
                ].map(v => <option key={v} value={v}>{v}</option>)}
              </optgroup>
              <optgroup label="Escritório">
                {['Escritório Econômico -','Escritório Econômico','Escritório Econômico +',
                  'Escritório Simples s/Elevador -','Escritório Simples s/Elevador','Escritório Simples s/Elevador +',
                  'Escritório Simples c/Elevador -','Escritório Simples c/Elevador','Escritório Simples c/Elevador +',
                  'Escritório Médio s/Elevador -','Escritório Médio s/Elevador','Escritório Médio s/Elevador +',
                  'Escritório Médio c/Elevador -','Escritório Médio c/Elevador','Escritório Médio c/Elevador +',
                  'Escritório Superior s/Elevador -','Escritório Superior s/Elevador','Escritório Superior s/Elevador +',
                  'Escritório Superior c/Elevador -','Escritório Superior c/Elevador','Escritório Superior c/Elevador +',
                  'Escritório Fino -','Escritório Fino','Escritório Fino +','Escritório Luxo',
                ].map(v => <option key={v} value={v}>{v}</option>)}
              </optgroup>
              <optgroup label="Galpão">
                {['GALPÃO | Econômico -','GALPÃO | Econômico','GALPÃO | Econômico +',
                  'GALPÃO | Simples -','GALPÃO | Simples','GALPÃO | Simples +',
                  'GALPÃO | Médio -','GALPÃO | Médio','GALPÃO | Médio +','GALPÃO | Superior -',
                ].map(v => <option key={v} value={v}>{v}</option>)}
              </optgroup>
              <optgroup label="Cobertura">
                {['COBERTURA | Simples -','COBERTURA | Simples','COBERTURA | Simples +',
                  'COBERTURA | Médio -','COBERTURA | Médio','COBERTURA | Médio +',
                  'COBERTURA | Superior -','COBERTURA | Superior','COBERTURA | Superior +',
                ].map(v => <option key={v} value={v}>{v}</option>)}
              </optgroup>
            </select>
          )}
        </div>

        {/* Fator FOC */}
        <div className="mb-5 border-t border-slate-100 pt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">Fator FOC (Ross-Heidecke)</span>
            <Toggle fator="foc" label={fatores.foc ? 'Ativo' : 'Desativado'} />
          </div>
          {fatores.foc && (
            <p className="text-xs text-slate-400">
              Usa Estado de conservação e Idade aparente preenchidos nos campos acima.
            </p>
          )}
        </div>

        {/* Fator Local */}
        <div className="mb-5 border-t border-slate-100 pt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">Fator Local</span>
            <Toggle fator="local" label={fatores.local ? 'Ativo' : 'Desativado'} />
          </div>
          {fatores.local && (
            <div>
              <input name="fatorLocalAvaliando" placeholder="100" type="number"
                value={form.fatorLocalAvaliando || ''} onChange={handleChange} className={inputCls()} />
              <p className="text-[11px] text-slate-400 mt-1">Índice de localização do avaliando (0–200). 100 = neutro.</p>
            </div>
          )}
        </div>

        {/* Fator Andar */}
        <div className="mb-5 border-t border-slate-100 pt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">Fator Andar</span>
            <Toggle fator="andar" label={fatores.andar ? 'Ativo' : 'Desativado'} />
          </div>
          {fatores.andar && (
            <div>
              <input name="fatorAndarAvaliando" placeholder="100" type="number"
                value={form.fatorAndarAvaliando || ''} onChange={handleChange} className={inputCls()} />
              <p className="text-[11px] text-slate-400 mt-1">Coeficiente de andar. 100 = neutro / térreo.</p>
            </div>
          )}
        </div>

        {/* Fator Vaga */}
        <div className="border-t border-slate-100 pt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">Fator Vaga</span>
            <Toggle fator="vaga" label={fatores.vaga ? 'Ativo (considerado no cálculo)' : 'Desativado (apenas informação)'} />
          </div>
          <div>
            <input name="vagasAvaliando" placeholder="0" type="number"
              value={form.vagasAvaliando || ''} onChange={handleChange} className={inputCls()} />
            <p className="text-[11px] text-slate-400 mt-1">
              {fatores.vaga
                ? 'Número de vagas do avaliando — considerado no cálculo.'
                : 'Número de vagas do avaliando — apenas informativo, não considerado no cálculo.'}
            </p>
          </div>
        </div>
      </SectionCard>

      {/* ── Especificações de divisões ────────────────────────────────────────── */}
      <SectionCard title="Especificações de divisões">
        <div className="grid grid-cols-[100px_1fr_44px] gap-2 pb-1 border-b border-slate-100">
          <span className="text-xs font-medium text-slate-500">Quantidade</span>
          <span className="text-xs font-medium text-slate-500">Ambiente</span>
          <span />
        </div>

        {divisoes.map((item, index) => (
          <div key={index} className="grid grid-cols-[100px_1fr_44px] gap-2 items-center">
            <select
              value={item.quantidade}
              onChange={(e) => handleDivisaoChange(index, 'quantidade', e.target.value)}
              className={selectCls()}
            >
              {Array.from({ length: 20 }, (_, i) => i + 1).map((numero) => (
                <option key={numero} value={String(numero)}>{numero}</option>
              ))}
            </select>

            <input
              type="text"
              placeholder="Ex: Banheiros, Quarto, Sala, Cozinha"
              value={item.ambiente}
              onChange={(e) => handleDivisaoChange(index, 'ambiente', e.target.value)}
              className={inputCls()}
            />

            <button
              type="button"
              onClick={() => removerLinhaDivisao(index)}
              className="h-10 w-10 flex items-center justify-center rounded-xl border border-red-200 text-red-500 hover:bg-red-50 transition text-sm font-bold"
            >
              ✕
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={adicionarLinhaDivisao}
          className="mt-1 flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium transition"
        >
          <span className="text-lg leading-none">+</span> Adicionar ambiente
        </button>
      </SectionCard>


      {/* ── Melhoramentos públicos — apenas laudo detalhado ──────────────────────── */}
      {tipoLaudo !== 'simplificado' && (
      <SectionCard title="Melhoramentos públicos">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <tbody>
              {[
                ['redeAgua', 'Rede de água', 'redeEletrica', 'Rede Elétrica'],
                ['gasCanalizado', 'Gás canalizado', 'redeTelefonica', 'Rede Telefônica'],
                ['esgotoSanitario', 'Esgoto Sanitário', 'iluminacaoPublica', 'Iluminação Pública'],
                ['esgotoPluvial', 'Esgoto Pluvial', 'pavimentacao', 'Pavimentação'],
                ['fossa', 'Fossa', 'passeio', 'Passeio'],
                ['coletaLixo', 'Coleta de Lixo', 'guias', 'Guias'],
                ['lazer', 'Lazer', 'sarjetas', 'Sarjetas'],
              ].map(([campo1, label1, campo2, label2]) => (
                <tr key={String(campo1)} className="border-b border-slate-100 last:border-0">
                  <td className="py-2 pr-3 text-slate-600 text-xs font-medium w-36">{label1}</td>
                  <td className="py-2 pr-6">
                    <select
                      value={form.melhoramentosPublicos?.[String(campo1)] || ''}
                      onChange={(e) => handleMelhoramentosPublicosChange(String(campo1), e.target.value)}
                      className={selectCls()}
                    >
                      <option value="">Selecione</option>
                      <option value="Sim">Sim</option>
                      <option value="Não">Não</option>
                    </select>
                  </td>
                  <td className="py-2 pr-3 text-slate-600 text-xs font-medium w-36">{label2}</td>
                  <td className="py-2">
                    <select
                      value={form.melhoramentosPublicos?.[String(campo2)] || ''}
                      onChange={(e) => handleMelhoramentosPublicosChange(String(campo2), e.target.value)}
                      className={selectCls()}
                    >
                      <option value="">Selecione</option>
                      <option value="Sim">Sim</option>
                      <option value="Não">Não</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
      )}

      {/* ── Croqui / Imagem ───────────────────────────────────────────────────── */}
      <SectionCard title="Croqui / imagem do item 6">

        {/* Mapa automático pelas coordenadas */}
        {form.coordenadasImovel && (
          <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-blue-800">📍 Mapa automático — baseado nas coordenadas</span>
              <button
                type="button"
                onClick={gerarCroquiAutomatico}
                disabled={gerandoCroqui}
                className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition font-medium"
              >
                {gerandoCroqui ? 'Gerando...' : '↺ Atualizar mapa'}
              </button>
            </div>
            {(form.croquis || []).find((c: any) => c.automatico) ? (
              <img
                src={(form.croquis || []).find((c: any) => c.automatico)?.preview}
                alt="Mapa automático"
                className="w-full max-h-64 object-cover rounded-lg border border-blue-200"
              />
            ) : (
              <div className="flex items-center justify-center h-24 text-sm text-blue-500 bg-white rounded-lg border border-blue-200">
                {gerandoCroqui
                  ? 'Gerando mapa...'
                  : 'Clique em "Atualizar mapa" ou em "Preencher dados" para gerar automaticamente.'}
              </div>
            )}
          </div>
        )}

        {/* Upload manual adicional */}
        <p className="text-xs text-slate-400 mb-2">Imagens adicionais (opcional)</p>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleCroqui}
          className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white text-slate-500 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100 transition"
        />

        {/* Imagens manuais */}
        {(form.croquis || []).filter((c: any) => !c.automatico).length > 0 && (
          <div className="mt-3 space-y-4">
            {(form.croquis || []).map((croqui: any, index: number) => (
              !croqui.automatico && (
                <div key={index} className="rounded-xl border border-slate-200 p-4 space-y-3 bg-slate-50">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-slate-700">Imagem {index + 1}</span>
                    <button
                      type="button"
                      onClick={() => removerCroqui(index)}
                      className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-600 bg-white hover:bg-red-50 transition font-medium"
                    >
                      Excluir imagem
                    </button>
                  </div>
                  <div className="flex justify-center">
                    <img
                      src={croqui.preview}
                      alt={`Croqui ${index + 1}`}
                      className="w-full max-h-80 object-contain rounded-lg border border-slate-200"
                    />
                  </div>
                </div>
              )
            ))}
          </div>
        )}
      </SectionCard>

      {/* Espaço para a barra de navegação fixa não cobrir o último card */}
      <div className="h-6" />
    </div>
  )
}
