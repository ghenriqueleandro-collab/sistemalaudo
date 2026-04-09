'use client'

import { useEffect, useState } from 'react'
import { pdfjs, Document, Page } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

// Resolução de renderização: 3× o tamanho de exibição para nitidez em tela
// HiDPI e na impressão. O CSS em globals.css aplica max-width:100% / height:auto
// no canvas, encolhendo-o visualmente sem perda de qualidade.
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

// Separador de seção — alinhado ao CabecalhoLaudo do viewer principal.
function CabecalhoLaudo() {
  return (
    <div className="mt-8 mb-2">
      <div className="h-[2px] rounded-full bg-[#2347C6]" />
      <div className="mt-1 h-[1px] bg-[#C9D3E6]" />
    </div>
  )
}

// Wrapper semântico transparente — alinhado ao documento contínuo do viewer.
// O CSS `.pagina-laudo { display: contents }` torna o div invisível no layout,
// mantendo data-pagina acessível para o sumário.
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
            {/* Canvas renderizado em alta resolução, encolhido pelo CSS */}
            <div
              className="flex justify-center mb-8"
              style={{ width: '100%', overflow: 'hidden' }}
            >
              <Page
                pageNumber={index + 1}
                width={renderWidth}
                renderTextLayer={false}
                renderAnnotationLayer={false}
                style={{ maxWidth: '100%', height: 'auto' }}
              />
            </div>
          </Pagina>
        ))}
    </Document>
  )
}
