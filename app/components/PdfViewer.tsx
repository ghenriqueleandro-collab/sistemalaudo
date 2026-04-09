'use client'

import { useState } from 'react'
import { pdfjs, Document, Page } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

type PdfViewerProps = {
  file: string
  titulo?: string
}

export default function PdfViewer({ file, titulo }: PdfViewerProps) {
  const [numPages, setNumPages] = useState(0)

  return (
    <div className="space-y-4">
      <Document
        file={file}
        onLoadSuccess={({ numPages }) => setNumPages(numPages)}
        loading={<p>Carregando {titulo?.toLowerCase() || 'pdf'}...</p>}
        error={<p>Erro ao carregar {titulo?.toLowerCase() || 'o pdf'}.</p>}
      >
        {Array.from({ length: numPages }, (_, index) => (
          <div
            key={`${titulo || 'pdf'}-${index + 1}`}
            className="pdf-page-wrapper flex justify-center bg-white print:mb-0"
          >
            <Page
              pageNumber={index + 1}
              width={760}
              renderTextLayer={false}
              renderAnnotationLayer={false}
            />
          </div>
        ))}
      </Document>
    </div>
  )
}
