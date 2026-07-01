'use client'

import { useState, useEffect, useRef } from 'react'



type FotoItem = {
  file?: File
  preview: string
  legenda: string
}

type Props = {
  form: any
  handleChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => void
  formatarDataBR: (data: string) => string
  handlePdfUpload: (
    e: React.ChangeEvent<HTMLInputElement>,
    campo: 'documentacaoPdf'
  ) => void
  handleLocalizacaoComparativos: (e: React.ChangeEvent<HTMLInputElement>) => void
  onRemoverAnexo: (campo: 'documentacaoPdf' | 'localizacaoComparativos') => void
  handleFotos: (e: React.ChangeEvent<HTMLInputElement>) => void
  fotos: FotoItem[]
  handleLegenda: (index: number, valor: string) => void
  onRemoverFoto: (index: number) => void
  onReordenarFotos: (origem: number, destino: number) => void
  /**
   * Opcional. Quando passado, habilita o botão "Gerar mapa automaticamente"
   * que monta o mapa com pin vermelho do avaliando + pins azuis numerados
   * dos elementos comparativos e salva diretamente em form.localizacaoComparativos.
   */
  setForm?: React.Dispatch<React.SetStateAction<any>>
  onSalvarAgora?: () => void
}

export default function EtapaAnexosAssinatura({
  form,
  handleChange,
  formatarDataBR,
  handlePdfUpload,
  handleLocalizacaoComparativos,
  onRemoverAnexo,
  handleFotos,
  fotos,
  handleLegenda,
  onRemoverFoto,
  onReordenarFotos,
  setForm,
  onSalvarAgora,
}: Props) {
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [fotoAmpliada, setFotoAmpliada] = useState<{ preview: string; legenda: string; index: number } | null>(null)
  const [gerandoMapa, setGerandoMapa] = useState(false)
  const [erroMapa, setErroMapa] = useState<string | null>(null)

  async function baixarFoto(preview: string, legenda: string, index: number) {
    try {
      const res = await fetch(preview)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = legenda ? `${legenda.replace(/[^a-z0-9]/gi, '_')}.jpg` : `foto_${index + 1}.jpg`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      alert('Não foi possível baixar a imagem. Tente abrir em nova aba.')
    }
  }

  // ─── Geração automática do mapa de localização dos comparativos ─────────────
  // Lê as coordenadas do avaliando (form.coordenadasImovel) e dos elementos
  // comparativos (form.elementosComparativos[i].coordenadas), monta a query e
  // chama /api/mapa-estatico. Salva o JPEG retornado em base64 no campo
  // form.localizacaoComparativos — que é o mesmo lido pelo PDF/visualização.

  function parseCoords(raw: string): { lat: number; lng: number } | null {
    if (!raw) return null
    const m = raw.trim().match(/(-?\d+[.,]?\d*)[,\s]+(-?\d+[.,]?\d*)/)
    if (!m) return null
    const lat = parseFloat(m[1].replace(',', '.'))
    const lng = parseFloat(m[2].replace(',', '.'))
    if (!isFinite(lat) || !isFinite(lng)) return null
    return { lat, lng }
  }

  async function gerarMapaAutomatico() {
    setErroMapa(null)
    if (!setForm) {
      setErroMapa('setForm não foi passado pelo parent. Adicione setForm={setForm} no <EtapaAnexosAssinaturaSimpl /> em page-simplificado.tsx.')
      return
    }

    const aval = parseCoords(form?.coordenadasImovel || '')
    if (!aval) {
      setErroMapa('Coordenadas do imóvel avaliando não preenchidas (etapa 1 a 6).')
      return
    }

    // Lê elementos de múltiplas fontes: comparativo (CDDM) e evolutivo
    const isEvolutivo = form?.metodoAvaliacao === 'evolutivo' &&
      form?.tratamentoDados === 'tratamento_por_fatores'

    const elementos: any[] = (() => {
      // Método evolutivo: elementos em dadosCalculoEvolutivo.elementos
      if (isEvolutivo) {
        const ev = form?.dadosCalculoEvolutivo?.elementos
        if (Array.isArray(ev) && ev.length > 0) return ev
      }
      // Método comparativo: elementosComparativos ou dadosCalculoCDDM
      if (Array.isArray(form?.elementosComparativos) && form.elementosComparativos.length > 0)
        return form.elementosComparativos
      if (Array.isArray(form?.dadosCalculoCDDM?.elementos) && form.dadosCalculoCDDM.elementos.length > 0)
        return form.dadosCalculoCDDM.elementos
      return []
    })()

    const comparativos = elementos
      .map(el => parseCoords(el?.coordenadas || ''))
      .filter((c): c is { lat: number; lng: number } => c !== null)

    if (comparativos.length === 0) {
      const etapa = isEvolutivo ? '8' : '10'
      setErroMapa(`Nenhum elemento com coordenadas válidas. Preencha o campo "Coordenadas" de pelo menos 1 elemento na etapa ${etapa}.`)
      return
    }

    setGerandoMapa(true)
    try {
      const compStr = comparativos.map(c => `${c.lat},${c.lng}`).join('|')
      const url = `/api/mapa-estatico?lat=${aval.lat}&lng=${aval.lng}&comparativos=${encodeURIComponent(compStr)}`

      const res = await fetch(url)
      if (!res.ok) {
        let detalhe = ''
        try {
          const j = await res.json()
          detalhe = j?.detail || j?.error || ''
        } catch {}
        throw new Error(`Status ${res.status}${detalhe ? ' — ' + detalhe : ''}`)
      }

      const blob = await res.blob()
      const base64 = await new Promise<string>((resolve, reject) => {
        const r = new FileReader()
        r.onload = () => resolve(r.result as string)
        r.onerror = reject
        r.readAsDataURL(blob)
      })

      // Usa handleLocalizacaoComparativos (prop do orquestrador) para salvar pelo
      // pipeline correto de binário (__ref__ + chunks no Redis).
      const byteStr  = atob(base64.split(',')[1])
      const mime     = base64.match(/data:([^;]+);/)?.[1] ?? 'image/jpeg'
      const bytes    = new Uint8Array(byteStr.length)
      for (let i = 0; i < byteStr.length; i++) bytes[i] = byteStr.charCodeAt(i)
      const file     = new File([bytes], 'mapa-comparativos.jpg', { type: mime })
      const fakeEvt  = { target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>
      handleLocalizacaoComparativos(fakeEvt)
    } catch (err: any) {
      setErroMapa(`Não foi possível gerar o mapa: ${err?.message || err}`)
    } finally {
      setGerandoMapa(false)
    }
  }

useEffect(() => {
  function handleDragOver(e: DragEvent) {
    const container = containerRef.current
    if (!container) return

    const rect = container.getBoundingClientRect()
    const margem = 80
    const velocidade = 20
    const y = e.clientY

    if (y < rect.top + margem) {
      container.scrollTop -= velocidade
    }

    if (y > rect.bottom - margem) {
      container.scrollTop += velocidade
    }
  }

  window.addEventListener('dragover', handleDragOver)

  return () => {
    window.removeEventListener('dragover', handleDragOver)
  }
}, [])
  
  return (
    <div className="space-y-6">

      {/* Lightbox */}
      {fotoAmpliada && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setFotoAmpliada(null)}
        >
          <div
            className="relative max-w-4xl w-full bg-white rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
              <span className="font-medium text-slate-800">
                {fotoAmpliada.legenda || `Foto ${fotoAmpliada.index + 1}`}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => baixarFoto(fotoAmpliada.preview, fotoAmpliada.legenda, fotoAmpliada.index)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                >
                  ⬇ Baixar
                </button>
                <button
                  type="button"
                  onClick={() => setFotoAmpliada(null)}
                  className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  ✕ Fechar
                </button>
              </div>
            </div>
            {/* Imagem */}
            <div className="flex items-center justify-center bg-slate-50 p-4">
              <img
                src={fotoAmpliada.preview}
                alt={fotoAmpliada.legenda || `Foto ${fotoAmpliada.index + 1}`}
                className="max-h-[75vh] w-auto object-contain rounded"
              />
            </div>
            {/* Navegação */}
            <div className="flex justify-between items-center px-5 py-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  const prev = fotos[fotoAmpliada.index - 1]
                  if (prev) setFotoAmpliada({ preview: prev.preview, legenda: prev.legenda, index: fotoAmpliada.index - 1 })
                }}
                disabled={fotoAmpliada.index === 0}
                className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-30"
              >
                ← Anterior
              </button>
              <span className="text-xs text-slate-400">{fotoAmpliada.index + 1} de {fotos.length}</span>
              <button
                type="button"
                onClick={() => {
                  const next = fotos[fotoAmpliada.index + 1]
                  if (next) setFotoAmpliada({ preview: next.preview, legenda: next.legenda, index: fotoAmpliada.index + 1 })
                }}
                disabled={fotoAmpliada.index === fotos.length - 1}
                className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-30"
              >
                Próxima →
              </button>
            </div>
          </div>
        </div>
      )}
      <h2 className="text-2xl font-bold">15. Anexos e assinatura</h2>

      <div className="border rounded p-4 bg-white space-y-4">
        <div>
          <label className="block font-medium mb-1">Data do laudo</label>
          <input
            type="date"
            name="dataLaudo"
            value={form.dataLaudo}
            onChange={handleChange}
            className="w-full border p-2 rounded"
          />
          <p className="text-sm text-gray-600 mt-1">
            Data exibida: {formatarDataBR(form.dataLaudo)}
          </p>
        </div>

        <input
          name="responsavelNome"
          value={form.responsavelNome}
          onChange={handleChange}
          placeholder="Nome do responsável técnico"
          className="w-full border p-2 rounded"
        />

        <input
          name="responsavelCpf"
          value={form.responsavelCpf}
          onChange={handleChange}
          placeholder="CPF"
          className="w-full border p-2 rounded"
        />

        <input
          name="responsavelRegistro"
          value={form.responsavelRegistro}
          onChange={handleChange}
          placeholder="CREA ou CAU"
          className="w-full border p-2 rounded"
        />
      </div>

      <div className="border rounded p-4 bg-white space-y-4">
        <h3 className="font-bold">Anexos</h3>

        <div>
          <label className="block font-medium mb-1">Documentação em PDF</label>
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => handlePdfUpload(e, 'documentacaoPdf')}
            className="w-full border p-2 rounded"
          />
          {form.documentacaoPdf && (
            <div className="mt-1.5 flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
              <span>✓</span>
              <span className="font-medium">Arquivo enviado</span>
              <button type="button" onClick={() => onRemoverAnexo('documentacaoPdf')}
                className="ml-auto text-xs text-slate-500 hover:text-red-600">Remover</button>
            </div>
          )}
        </div>

        <div>
          <label className="block font-medium mb-1">
            Localização dos comparativos
          </label>

          {/* ── Botão de geração automática ── */}
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 mb-3">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-blue-900 mb-0.5">
                  Gerar mapa automaticamente
                </p>
                <p className="text-xs text-blue-700">
                  Pin vermelho no avaliando, pins azuis numerados nos comparativos com coordenadas preenchidas.
                </p>
              </div>
              <button
                type="button"
                onClick={gerarMapaAutomatico}
                disabled={gerandoMapa}
                className="shrink-0 px-3 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition whitespace-nowrap"
              >
                {gerandoMapa ? (
                  <span className="flex items-center gap-1.5">
                    <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Gerando…
                  </span>
                ) : (
                  '🗺 Gerar mapa'
                )}
              </button>
            </div>
            {erroMapa && (
              <p className="mt-2 text-xs rounded-lg bg-red-100 text-red-800 px-2.5 py-1.5">
                ⚠️ {erroMapa}
              </p>
            )}
          </div>

          <div
            className="border-2 border-dashed border-slate-200 rounded-xl p-5 text-center hover:border-blue-300 hover:bg-blue-50 transition relative"
            onPaste={(e) => {
              const items = Array.from(e.clipboardData.items)
              const imageItem = items.find(item => item.type.startsWith('image/'))
              if (!imageItem) return
              e.preventDefault()
              const file = imageItem.getAsFile()
              if (!file) return
              const reader = new FileReader()
              reader.onload = () => {
                const fakeEvent = { target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>
                handleLocalizacaoComparativos(fakeEvent)
              }
              reader.readAsDataURL(file)
            }}
            tabIndex={0}
          >
            <input
              type="file"
              accept="image/*"
              onChange={handleLocalizacaoComparativos}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="pointer-events-none space-y-1">
              <p className="text-sm font-medium text-slate-600">Ou envie uma imagem manualmente</p>
              <p className="text-xs text-slate-400">
                clique para selecionar ou pressione <kbd className="px-1.5 py-0.5 text-xs bg-slate-100 border border-slate-300 rounded font-mono">Ctrl+V</kbd> para colar
              </p>
            </div>
          </div>
          {form.localizacaoComparativos && (
            <div className="mt-2 space-y-2">
              <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                <span>✓</span>
                <span className="font-medium">Imagem enviada</span>
                <button type="button" onClick={() => onRemoverAnexo('localizacaoComparativos')}
                  className="ml-auto text-xs text-slate-500 hover:text-red-600">Remover</button>
              </div>
              <img src={form.localizacaoComparativos} alt="Localização dos comparativos"
                className="w-full max-h-64 object-contain rounded-xl border border-slate-200" />
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className="block font-medium mb-1">Fotos do imóvel</label>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFotos}
              className="w-full border p-2 rounded"
            />
            <p className="text-sm text-gray-600 mt-1">
              Ao fazer o upload, a legenda será preenchida automaticamente com o nome do arquivo, mas você pode editar depois.
            </p>
          </div>

          {fotos.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-500 mb-3">
                {fotos.length} foto{fotos.length !== 1 ? 's' : ''} · arraste para reordenar
              </p>
              <div
                ref={containerRef}
                className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3"
              >
                {fotos.map((foto, index) => (
                  <div
                    key={`foto-${index}-${foto.legenda || ''}`}
                    draggable
                    onDragStart={() => setDragIndex(index)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (dragIndex === null || dragIndex === index) return
                      onReordenarFotos(dragIndex, index)
                      setDragIndex(null)
                    }}
                    onDragEnd={() => setDragIndex(null)}
                    className="group rounded-2xl border border-slate-200 overflow-hidden bg-white hover:border-slate-300 transition-colors cursor-move"
                  >
                    {/* Thumbnail */}
                    <div
                      className="relative cursor-zoom-in"
                      style={{ aspectRatio: '4/3' }}
                      onClick={() => setFotoAmpliada({ preview: foto.preview, legenda: foto.legenda, index })}
                    >
                      <img
                        src={foto.preview}
                        alt={`Foto ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      {/* Número */}
                      <span className="absolute top-2 left-2 bg-black/45 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      {/* Overlay ampliar */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors flex items-center justify-center">
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/55 text-white text-xs font-medium px-3 py-1 rounded-full">
                          Ampliar
                        </span>
                      </div>
                    </div>

                    {/* Legenda + ações */}
                    <div className="p-3 space-y-2">
                      <input
                        type="text"
                        value={foto.legenda || ''}
                        onChange={(e) => handleLegenda(index, e.target.value)}
                        placeholder="Legenda da foto"
                        className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-slate-50 outline-none focus:border-blue-300 focus:bg-white"
                      />
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => baixarFoto(foto.preview, foto.legenda, index)}
                          className="flex-1 flex items-center justify-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2 py-1.5 text-[11px] font-medium text-blue-700 hover:bg-blue-100 transition-colors"
                        >
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                            <polyline points="7 10 12 15 17 10"/>
                            <line x1="12" y1="15" x2="12" y2="3"/>
                          </svg>
                          Baixar
                        </button>
                        <button
                          type="button"
                          onClick={() => onRemoverFoto(index)}
                          className="flex-1 flex items-center justify-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1.5 text-[11px] font-medium text-rose-700 hover:bg-rose-100 transition-colors"
                        >
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6l-1 14H6L5 6"/>
                          </svg>
                          Excluir
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}