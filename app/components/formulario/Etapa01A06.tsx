'use client'

import { useState } from 'react'

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

type Props = {
  handleMelhoramentosPublicosChange: (campo: string, valor: string) => void
  form: any
  handleChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => void
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
}

export default function Etapa01A06({
  form,
  handleChange,
  handleMelhoramentosPublicosChange,
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

    try {
      // ── 1. Endereço via Nominatim ──────────────────────────────────────────
      const resRev = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=pt-BR`,
        { headers: { 'User-Agent': 'LesathLaudos/1.0' } }
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
      if (enderecoMontado) setField('endereco', enderecoMontado)

      // ── 2. Pontos de referência via Overpass API ───────────────────────────
      const overpassQuery = `
        [out:json][timeout:20];
        (
          node["name"]["amenity"~"hospital|school|bank|pharmacy|supermarket|place_of_worship|police|fire_station|courthouse|college|university"](around:4000,${lat},${lon});
          way["name"]["amenity"~"hospital|school|bank|supermarket|shopping_mall|place_of_worship"](around:4000,${lat},${lon});
          node["name"]["shop"~"supermarket|mall"](around:4000,${lat},${lon});
          node["name"]["leisure"~"park|stadium"](around:4000,${lat},${lon});
        );
        out center 30;
      `.trim()

      const resOver = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: `data=${encodeURIComponent(overpassQuery)}`,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
      if (!resOver.ok) throw new Error('Overpass indisponível')
      const dadosOver = await resOver.json()

      type PoiItem = { lat: number; lon: number; nome: string; dist: number }
      const pois: PoiItem[] = (dadosOver.elements || [])
        .map((el: any) => {
          const elLat = el.lat ?? el.center?.lat
          const elLon = el.lon ?? el.center?.lon
          const nome = el.tags?.name
          if (!elLat || !elLon || !nome) return null
          return { lat: elLat, lon: elLon, nome, dist: haversineMetros(lat, lon, elLat, elLon) }
        })
        .filter(Boolean)
        .sort((a: PoiItem, b: PoiItem) => a.dist - b.dist)

      // Remove duplicados por nome
      const vistos = new Set<string>()
      const poisUnicos: PoiItem[] = []
      for (const p of pois) {
        const chave = p.nome.toLowerCase().trim()
        if (!vistos.has(chave)) { vistos.add(chave); poisUnicos.push(p) }
        if (poisUnicos.length === 5) break
      }

      if (poisUnicos[0]) { setField('referencia1', poisUnicos[0].nome); setField('distancia1', formatarDistancia(poisUnicos[0].dist)) }
      if (poisUnicos[1]) { setField('referencia2', poisUnicos[1].nome); setField('distancia2', formatarDistancia(poisUnicos[1].dist)) }
      if (poisUnicos[2]) { setField('referencia3', poisUnicos[2].nome); setField('distancia3', formatarDistancia(poisUnicos[2].dist)) }
      if (poisUnicos[3]) { setField('referencia4', poisUnicos[3].nome); setField('distancia4', formatarDistancia(poisUnicos[3].dist)) }
      if (poisUnicos[4]) { setField('referencia5', poisUnicos[4].nome); setField('distancia5', formatarDistancia(poisUnicos[4].dist)) }

      setMsgCoords({ tipo: 'ok', texto: 'Endereço e referências preenchidos automaticamente.' })
    } catch (err) {
      console.error(err)
      setMsgCoords({ tipo: 'erro', texto: 'Não foi possível buscar os dados. Verifique as coordenadas e tente novamente.' })
    } finally {
      setBuscandoCoords(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold mb-2">
          1 a 6. Identificação e caracterização do imóvel
        </h2>
        <p className="text-sm text-gray-600">
          Preencha os dados iniciais do imóvel, áreas, divisões, referências e croqui.
        </p>
      </div>

      {/* ── Coordenadas com preenchimento automático ── */}
      <div className="border rounded p-4 bg-blue-50 space-y-3">
        <label className="block font-semibold text-blue-900">
          📍 Coordenadas do imóvel
        </label>

        <div className="flex gap-2">
          <input
            name="coordenadasImovel"
            placeholder="Ex: -23.550520, -46.633308"
            value={form.coordenadasImovel || ''}
            onChange={handleChange}
            className="flex-1 border p-2 rounded bg-white"
          />
          <button
            type="button"
            onClick={buscarDadosPorCoordenadas}
            disabled={buscandoCoords || !form.coordenadasImovel?.trim()}
            className="px-4 py-2 rounded bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition whitespace-nowrap"
          >
            {buscandoCoords ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Buscando…
              </span>
            ) : (
              '🔍 Preencher dados'
            )}
          </button>
        </div>

        {msgCoords && (
          <p className={`text-sm rounded px-3 py-2 ${msgCoords.tipo === 'ok' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {msgCoords.tipo === 'ok' ? '✅ ' : '⚠️ '}{msgCoords.texto}
          </p>
        )}

        <p className="text-xs text-blue-700">
          Após inserir as coordenadas, clique em <strong>Preencher dados</strong> para buscar automaticamente o endereço e os pontos de referência mais próximos.
          Os campos preenchidos podem ser editados manualmente.
        </p>
      </div>

      <input
        name="endereco"
        placeholder="Endereço"
        value={form.endereco}
        onChange={handleChange}
        className="w-full border p-2 rounded"
      />

      <input
        name="proprietario"
        placeholder="Proprietário"
        value={form.proprietario}
        onChange={handleChange}
        className="w-full border p-2 rounded"
      />

      <input
  name="solicitante"
  placeholder="Solicitante / Interessado"
  value={form.solicitante || ''}
  onChange={handleChange}
  className="w-full border p-2 rounded"
/>

      <input
        name="tipo"
        placeholder="Tipo do imóvel"
        value={form.tipo}
        onChange={handleChange}
        className="w-full border p-2 rounded"
      />

      <select
        name="finalidade"
        value={form.finalidade}
        onChange={handleChange}
        className="w-full border p-2 rounded"
      >
        <option value="">Selecione a finalidade</option>
        <option value="garantia">Garantia</option>
        <option value="execucao">Execução</option>
      </select>

      <div className="border rounded p-4 bg-gray-50 space-y-4">
  <h3 className="text-lg font-bold">Definições iniciais do laudo</h3>

  <div>
    <label className="block font-medium mb-1">Método de avaliação</label>
    <select
      name="metodoAvaliacao"
      value={form.metodoAvaliacao}
      onChange={handleChange}
      className="w-full border p-2 rounded bg-white"
    >
      <option value="">Selecione</option>
      <option value="comparativo">Método Comparativo</option>
      <option value="evolutivo">Método Evolutivo</option>
    </select>
  </div>

  <div>
    <label className="block font-medium mb-1">Tratamento dos dados</label>
    <select
      name="tratamentoDados"
      value={form.tratamentoDados}
      onChange={handleChange}
      className="w-full border p-2 rounded bg-white"
    >
      <option value="">Selecione</option>
      <option value="inferencia_estatistica">Inferência estatística</option>
      <option value="tratamento_por_fatores">Tratamento de dados por fatores</option>
    </select>
  </div>

</div>

      <div className="border rounded p-4 bg-gray-50">
        <h3 className="text-lg font-bold mb-3">Áreas principais</h3>

        <input
          name="areaConstruidaTotal"
          placeholder="Área construída total (m²)"
          value={form.areaConstruidaTotal}
          onChange={handleChange}
          className="w-full border p-2 rounded bg-white mb-3"
        />

        <input
          name="areaConstruidaAverbada"
          placeholder="Área construída averbada (m²)"
          value={form.areaConstruidaAverbada}
          onChange={handleChange}
          className="w-full border p-2 rounded bg-white mb-3"
        />

        <div className="w-full border p-2 rounded bg-gray-100 mb-3">
          <strong>Área construída não averbada:</strong>{' '}
          {areaConstruidaNaoAverbada.toLocaleString('pt-BR')} m²
        </div>

        <input
          name="areaTerrenoTotal"
          placeholder="Área de terreno total (m²)"
          value={form.areaTerrenoTotal}
          onChange={handleChange}
          className="w-full border p-2 rounded bg-white mb-3"
        />

        <input
          name="areaTerrenoAverbada"
          placeholder="Área de terreno averbada (m²)"
          value={form.areaTerrenoAverbada}
          onChange={handleChange}
          className="w-full border p-2 rounded bg-white mb-3"
        />

        <div className="w-full border p-2 rounded bg-gray-100">
          <strong>Área de terreno não averbada:</strong>{' '}
          {areaTerrenoNaoAverbada.toLocaleString('pt-BR')} m²
        </div>
      </div>

      <input
        name="matricula"
        placeholder="Matrícula do imóvel"
        value={form.matricula}
        onChange={handleChange}
        className="w-full border p-2 rounded"
      />

      <input
        name="padrao"
        placeholder="Padrão"
        value={form.padrao}
        onChange={handleChange}
        className="w-full border p-2 rounded"
      />

      <input
        name="idadeAparente"
        placeholder="Idade aparente"
        value={form.idadeAparente}
        onChange={handleChange}
        className="w-full border p-2 rounded"
      />

      <input
        name="estadoConservacao"
        placeholder="Estado de conservação"
        value={form.estadoConservacao}
        onChange={handleChange}
        className="w-full border p-2 rounded"
      />

      <input
  name="iptu"
  value={form.iptu || ''}
  onChange={handleChange}
  placeholder="IPTU"
  className="w-full border p-2 rounded"
/>

      <div className="border rounded p-4 bg-gray-50">
        <label className="block font-semibold mb-3">Especificações de divisões</label>

        <div className="grid grid-cols-[120px_1fr_60px] gap-2 mb-2 font-semibold">
          <div>Quantidade</div>
          <div>Ambiente</div>
          <div></div>
        </div>

        {divisoes.map((item, index) => (
          <div
            key={index}
            className="grid grid-cols-[120px_1fr_60px] gap-2 mb-2"
          >
            <select
              value={item.quantidade}
              onChange={(e) =>
                handleDivisaoChange(index, 'quantidade', e.target.value)
              }
              className="w-full border p-2 rounded bg-white"
            >
              {Array.from({ length: 20 }, (_, i) => i + 1).map((numero) => (
                <option key={numero} value={String(numero)}>
                  {numero}
                </option>
              ))}
            </select>

            <input
              type="text"
              placeholder="Ex: Banheiros, Quarto, Sala, Cozinha"
              value={item.ambiente}
              onChange={(e) =>
                handleDivisaoChange(index, 'ambiente', e.target.value)
              }
              className="w-full border p-2 rounded bg-white"
            />

            <button
              type="button"
              onClick={() => removerLinhaDivisao(index)}
              className="px-3 py-2 border rounded bg-red-100"
            >
              X
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={adicionarLinhaDivisao}
          className="mt-2 px-4 py-2 border rounded bg-white"
        >
          + Adicionar ambiente
        </button>
      </div>

      <div className="border rounded p-4 bg-gray-50">
        <label className="block font-semibold mb-2">
          O imóvel precisa de cidade de referência?
        </label>

        <select
          value={usarCidadeReferencia ? 'sim' : 'nao'}
          onChange={(e) => setUsarCidadeReferencia(e.target.value === 'sim')}
          className="w-full border p-2 rounded bg-white"
        >
          <option value="sim">Sim, adicionar cidade de referência</option>
          <option value="nao">Não, o imóvel já está em uma cidade referência</option>
        </select>
      </div>

      {usarCidadeReferencia && (
        <>
          <input
            name="cidadePrincipal"
            placeholder="Cidade principal"
            value={form.cidadePrincipal}
            onChange={handleChange}
            className="w-full border p-2 rounded"
          />

          <input
            name="distanciaCidadePrincipal"
            placeholder="Distância até a cidade principal"
            value={form.distanciaCidadePrincipal}
            onChange={handleChange}
            className="w-full border p-2 rounded"
          />
        </>
      )}

      <input
        name="referencia1"
        placeholder="Local de referência 1"
        value={form.referencia1}
        onChange={handleChange}
        className="w-full border p-2 rounded"
      />

      <input
        name="distancia1"
        placeholder="Distância da referência 1"
        value={form.distancia1}
        onChange={handleChange}
        className="w-full border p-2 rounded"
      />

      <input
        name="referencia2"
        placeholder="Local de referência 2"
        value={form.referencia2}
        onChange={handleChange}
        className="w-full border p-2 rounded"
      />

      <input
        name="distancia2"
        placeholder="Distância da referência 2"
        value={form.distancia2}
        onChange={handleChange}
        className="w-full border p-2 rounded"
      />

      <input
        name="referencia3"
        placeholder="Local de referência 3"
        value={form.referencia3}
        onChange={handleChange}
        className="w-full border p-2 rounded"
      />

      <input
        name="distancia3"
        placeholder="Distância da referência 3"
        value={form.distancia3}
        onChange={handleChange}
        className="w-full border p-2 rounded"
      />

      <input
        name="referencia4"
        placeholder="Local de referência 4"
        value={form.referencia4 || ''}
        onChange={handleChange}
        className="w-full border p-2 rounded"
      />

      <input
        name="distancia4"
        placeholder="Distância da referência 4"
        value={form.distancia4 || ''}
        onChange={handleChange}
        className="w-full border p-2 rounded"
      />

      <input
        name="referencia5"
        placeholder="Local de referência 5"
        value={form.referencia5 || ''}
        onChange={handleChange}
        className="w-full border p-2 rounded"
      />

      <input
        name="distancia5"
        placeholder="Distância da referência 5"
        value={form.distancia5 || ''}
        onChange={handleChange}
        className="w-full border p-2 rounded"
      />

<div className="border rounded p-4 bg-gray-50">
  <h3 className="text-lg font-bold mb-3 text-center">
    Melhoramentos públicos
  </h3>

  <table className="w-full border-collapse border text-sm">
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
        <tr key={String(campo1)}>
          <td className="border p-2">{label1}</td>
          <td className="border p-2">
            <select
              value={form.melhoramentosPublicos?.[String(campo1)] || ''}
              onChange={(e) =>
                handleMelhoramentosPublicosChange(String(campo1), e.target.value)
              }
              className="w-full border p-2 rounded bg-white"
            >
              <option value="">Selecione</option>
              <option value="Sim">Sim</option>
              <option value="Não">Não</option>
            </select>
          </td>

          <td className="border p-2">{label2}</td>
          <td className="border p-2">
            <select
              value={form.melhoramentosPublicos?.[String(campo2)] || ''}
              onChange={(e) =>
                handleMelhoramentosPublicosChange(String(campo2), e.target.value)
              }
              className="w-full border p-2 rounded bg-white"
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

      <div className="border rounded p-3 bg-gray-50">
        <label className="block font-semibold mb-2">
          Upload do croqui / imagem do item 6
        </label>

        <input
  type="file"
  accept="image/*"
  multiple
  onChange={handleCroqui}
  className="w-full border p-2 rounded bg-white"
/>

        {form.croquis && form.croquis.length > 0 && (
  <div className="mt-4 space-y-4">
    {form.croquis.map((croqui: any, index: number) => (
      <div key={index} className="border rounded p-3 bg-white space-y-3">
        <div className="flex justify-between items-center gap-3">
          <span className="font-medium">Imagem {index + 1}</span>

          <button
            type="button"
            onClick={() => removerCroqui(index)}
            className="px-3 py-1 rounded border border-red-300 text-red-600 bg-white hover:bg-red-50"
          >
            Excluir imagem
          </button>
        </div>

        <div className="flex justify-center">
          <img
            src={croqui.preview}
            alt={`Croqui ${index + 1}`}
            className="w-full max-h-80 object-contain rounded border"
          />
        </div>

      </div>
    ))}
  </div>
)}
      </div>

<div className="border rounded p-4 bg-gray-50 space-y-4">
        <h3 className="text-lg font-bold">Condições específicas do terreno</h3>

        <div className="space-y-2">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              name="terrenoEncravado"
              checked={Boolean(form.terrenoEncravado)}
              onChange={handleChange}
              className="mt-1"
            />
            <span>Terreno encravado</span>
          </label>

          {form.terrenoEncravado && (
            <textarea
              name="observacoesTerrenoEncravado"
              value={form.observacoesTerrenoEncravado || ''}
              onChange={handleChange}
              placeholder="Observações sobre o terreno encravado"
              className="w-full border p-3 rounded bg-white min-h-[120px]"
            />
          )}
        </div>

        <div className="space-y-2">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              name="confrontacaoCursoAgua"
              checked={Boolean(form.confrontacaoCursoAgua)}
              onChange={handleChange}
              className="mt-1"
            />
            <span>Confrontação com o curso d&apos;água</span>
          </label>

          {form.confrontacaoCursoAgua && (
            <textarea
              name="observacoesConfrontacaoCursoAgua"
              value={form.observacoesConfrontacaoCursoAgua || ''}
              onChange={handleChange}
              placeholder="Observações sobre a confrontação com o curso d'água"
              className="w-full border p-3 rounded bg-white min-h-[120px]"
            />
          )}
        </div>
      </div>

    </div>
  )
}