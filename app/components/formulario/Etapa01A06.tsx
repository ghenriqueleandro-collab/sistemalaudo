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
}: Props) {
  const [buscandoCoords, setBuscandoCoords] = useState(false)
  const [msgCoords, setMsgCoords] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)

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
            <FieldLabel>Área construída total (m²)</FieldLabel>
            <input
              name="areaConstruidaTotal"
              placeholder="0,00"
              value={form.areaConstruidaTotal}
              onChange={handleChange}
              className={inputCls()}
            />
          </div>

          <div>
            <FieldLabel>Área construída averbada (m²)</FieldLabel>
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
          <span className="text-xs font-medium text-slate-500">Área construída não averbada</span>
          <p className="text-sm font-semibold text-slate-800 mt-0.5">
            {areaConstruidaNaoAverbada.toLocaleString('pt-BR')} m²
          </p>
        </div>

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
            <input
              name="padrao"
              placeholder="Padrão"
              value={form.padrao}
              onChange={handleChange}
              className={inputCls()}
            />
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

      {/* ── Cidade de referência ──────────────────────────────────────────────── */}
      <SectionCard title="Cidade de referência">
        <div>
          <FieldLabel>O imóvel precisa de cidade de referência?</FieldLabel>
          <select
            value={usarCidadeReferencia ? 'sim' : 'nao'}
            onChange={(e) => setUsarCidadeReferencia(e.target.value === 'sim')}
            className={selectCls()}
          >
            <option value="sim">Sim, adicionar cidade de referência</option>
            <option value="nao">Não, o imóvel já está em uma cidade referência</option>
          </select>
        </div>

        {usarCidadeReferencia && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel>Cidade principal</FieldLabel>
              <input
                name="cidadePrincipal"
                placeholder="Cidade principal"
                value={form.cidadePrincipal}
                onChange={handleChange}
                className={inputCls()}
              />
            </div>

            <div>
              <FieldLabel>Distância até a cidade principal</FieldLabel>
              <input
                name="distanciaCidadePrincipal"
                placeholder="Distância até a cidade principal"
                value={form.distanciaCidadePrincipal}
                onChange={handleChange}
                className={inputCls()}
              />
            </div>
          </div>
        )}
      </SectionCard>

      {/* ── Pontos de referência ──────────────────────────────────────────────── */}
      <SectionCard title="Pontos de referência">
        {[1, 2, 3, 4, 5].map((n) => (
          <div key={n} className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel>Local de referência {n}</FieldLabel>
              <input
                name={`referencia${n}`}
                placeholder={`Local de referência ${n}`}
                value={form[`referencia${n}`] || ''}
                onChange={handleChange}
                className={inputCls()}
              />
            </div>
            <div>
              <FieldLabel>Distância da referência {n}</FieldLabel>
              <input
                name={`distancia${n}`}
                placeholder={`Distância da referência ${n}`}
                value={form[`distancia${n}`] || ''}
                onChange={handleChange}
                className={inputCls()}
              />
            </div>
          </div>
        ))}
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
      <SectionCard title="Upload do croqui / imagem do item 6">
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleCroqui}
          className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white text-slate-500 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100 transition"
        />

        {form.croquis && form.croquis.length > 0 && (
          <div className="mt-3 space-y-4">
            {form.croquis.map((croqui: any, index: number) => (
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
            ))}
          </div>
        )}
      </SectionCard>

      {/* ── Condições específicas do terreno ─────────────────────────────────── */}
      <SectionCard title="Condições específicas do terreno">
        <div className="space-y-2">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="terrenoEncravado"
              checked={Boolean(form.terrenoEncravado)}
              onChange={handleChange}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-slate-700">Terreno encravado</span>
          </label>

          {form.terrenoEncravado && (
            <textarea
              name="observacoesTerrenoEncravado"
              value={form.observacoesTerrenoEncravado || ''}
              onChange={handleChange}
              placeholder="Observações sobre o terreno encravado"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition min-h-[100px]"
            />
          )}
        </div>

        <div className="space-y-2">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="confrontacaoCursoAgua"
              checked={Boolean(form.confrontacaoCursoAgua)}
              onChange={handleChange}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-slate-700">Confrontação com o curso d&apos;água</span>
          </label>

          {form.confrontacaoCursoAgua && (
            <textarea
              name="observacoesConfrontacaoCursoAgua"
              value={form.observacoesConfrontacaoCursoAgua || ''}
              onChange={handleChange}
              placeholder="Observações sobre a confrontação com o curso d'água"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition min-h-[100px]"
            />
          )}
        </div>
      </SectionCard>

      {/* Espaço para a barra de navegação fixa não cobrir o último card */}
      <div className="h-6" />
    </div>
  )
}
