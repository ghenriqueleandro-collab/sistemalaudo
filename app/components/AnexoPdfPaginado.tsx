'use client'

import { useEffect, useState } from 'react'
import { pdfjs, Document, Page } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

const RENDER_SCALE = 3

type Props = {
  file: string
  titulo: string
  paginaInicial: number
  totalPaginas?: number
  dataLaudo?: string
  onPageCount?: (count: number) => void
  larguraPagina?: number
}

function CabecalhoLaudo() {
  return (
    <div className="mt-8 mb-2">
      <div className="h-[2px] rounded-full bg-[#2347C6]" />
      <div className="mt-1 h-[1px] bg-[#C9D3E6]" />
    </div>
  )
}

function Pagina({
  pagina,
  children,
}: {
  pagina: string
  totalPaginas?: number
  dataLaudo?: string
  children: React.ReactNode
}) {
  return (
    <div data-pagina={pagina} className="pagina-laudo">
      {children}
    </div>
  )
}

export default function AnexoPdfPaginado({
  file,
  titulo,
  paginaInicial,
  totalPaginas,
  dataLaudo,
  onPageCount,
  larguraPagina = 620,
}: Props) {
  const [numPages, setNumPages] = useState(0)

  useEffect(() => {
    if (numPages > 0) onPageCount?.(numPages)
  }, [numPages, onPageCount])

  const renderWidth = larguraPagina * RENDER_SCALE

  return (
    <Document
      file={file}
      onLoadSuccess={({ numPages }) => setNumPages(numPages)}
      loading={
        <Pagina pagina={String(paginaInicial)}>
          <CabecalhoLaudo />
          <div className="mb-4">
            <h2 className="text-2xl font-bold mb-4 titulo-laudo">{titulo}</h2>
            <p>Carregando {titulo.toLowerCase()}...</p>
          </div>
        </Pagina>
      }
      error={
        <Pagina pagina={String(paginaInicial)}>
          <CabecalhoLaudo />
          <div className="mb-4">
            <h2 className="text-2xl font-bold mb-4 titulo-laudo">{titulo}</h2>
            <p>Erro ao carregar {titulo.toLowerCase()}.</p>
          </div>
        </Pagina>
      }
    >
      {numPages > 0 &&
        Array.from({ length: numPages }, (_, index) => (
          <Pagina
            key={`${titulo}-${index + 1}`}
            pagina={String(paginaInicial + index)}
          >
            {index === 0 && (
              <>
                <CabecalhoLaudo />
                <h2 className="text-2xl font-bold mb-4 titulo-laudo">{titulo}</h2>
              </>
            )}
            <div
              className="flex justify-center mb-8"
              style={{ width: '100%', overflow: 'hidden' }}
            >
              <Page
                pageNumber={index + 1}
                width={renderWidth}
                renderTextLayer={false}
                renderAnnotationLayer={false}
              />
            </div>
          </Pagina>
        ))}
    </Document>
  )
}
