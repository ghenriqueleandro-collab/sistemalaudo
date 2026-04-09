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

    <button
      type="button"
      onClick={() => onRemoverFoto(index)}
      className="px-3 py-1 rounded border border-red-300 text-red-600 bg-white hover:bg-red-50"
    >
      Excluir foto
    </button>
  </div>

  <div className="flex justify-center">
    <img
      src={foto.preview}
      alt={`Foto ${index + 1}`}
      className="w-full h-48 object-cover rounded border"
    />
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