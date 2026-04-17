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
    campo: 'documentacaoPdf' | 'calculoPdf'
  ) => void
  handleLocalizacaoComparativos: (e: React.ChangeEvent<HTMLInputElement>) => void
  handleFotos: (e: React.ChangeEvent<HTMLInputElement>) => void
  fotos: FotoItem[]
  handleLegenda: (index: number, valor: string) => void
  onRemoverFoto: (index: number) => void
  onReordenarFotos: (origem: number, destino: number) => void
}

export default function EtapaAnexosAssinatura({
  form,
  handleChange,
  formatarDataBR,
  handlePdfUpload,
  handleLocalizacaoComparativos,
  handleFotos,
  fotos,
  handleLegenda,
  onRemoverFoto,
  onReordenarFotos,
}: Props) {
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [fotoAmpliada, setFotoAmpliada] = useState<{ preview: string; legenda: string; index: number } | null>(null)

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
        </div>

        <div>
          <label className="block font-medium mb-1">
            Localização dos comparativos
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleLocalizacaoComparativos}
            className="w-full border p-2 rounded"
          />
        </div>

        <div>
          <label className="block font-medium mb-1">Cálculos em PDF</label>
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => handlePdfUpload(e, 'calculoPdf')}
            className="w-full border p-2 rounded"
          />
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
  <div
    ref={containerRef}
    className="max-h-[500px] overflow-y-auto pr-2"
  >
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {fotos.map((foto, index) => (

                
                <div
   key={foto.preview}
  draggable
  onDragStart={() => setDragIndex(index)}
  onDragOver={(e) => e.preventDefault()}
  onDrop={() => {
    if (dragIndex === null || dragIndex === index) return
    onReordenarFotos(dragIndex, index)
    setDragIndex(null)
  }}
  onDragEnd={() => setDragIndex(null)}
  className="border rounded p-3 bg-gray-50 space-y-3 cursor-move"
>
  <div className="flex justify-between items-center gap-3">
    <span className="font-medium">Foto {index + 1}</span>

    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => baixarFoto(foto.preview, foto.legenda, index)}
        className="px-3 py-1 rounded border border-blue-200 text-blue-600 bg-white hover:bg-blue-50 text-sm"
      >
        ⬇
      </button>
      <button
        type="button"
        onClick={() => onRemoverFoto(index)}
        className="px-3 py-1 rounded border border-red-300 text-red-600 bg-white hover:bg-red-50"
      >
        Excluir foto
      </button>
    </div>
  </div>

  <div
    className="flex justify-center cursor-zoom-in relative group"
    onClick={() => setFotoAmpliada({ preview: foto.preview, legenda: foto.legenda, index })}
  >
    <img
      src={foto.preview}
      alt={`Foto ${index + 1}`}
      className="w-full h-48 object-cover rounded border"
    />
    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded flex items-center justify-center">
      <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-semibold bg-black/50 px-2 py-1 rounded">
        Ampliar
      </span>
    </div>
  </div>

  <div>
    <label className="block font-medium mb-1">
      Legenda da foto {index + 1}
    </label>
    <input
      type="text"
      value={foto.legenda || ''}
      onChange={(e) => handleLegenda(index, e.target.value)}
      className="w-full border p-2 rounded bg-white"
      placeholder="Digite a legenda da foto"
    />
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