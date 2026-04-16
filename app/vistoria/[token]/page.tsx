'use client'

/**
 * SALVAR EM: src/app/vistoria/[token]/page.tsx
 * Página pública — sem autenticação — para o vistoriador enviar fotos pelo celular.
 */

import { use, useEffect, useRef, useState } from 'react'

type StatusVistoria =
  | 'aguardando_agendamento'
  | 'agendada'
  | 'realizada'
  | 'fotos_disponiveis'
  | 'finalizado'

type DadosLaudo = {
  laudoId: string
  endereco: string
  proprietario: string
  tipo: string
  statusVistoria: StatusVistoria
}

type FotoUpload = {
  file: File
  preview: string
  legenda: string
  progresso: number // 0-100
  url?: string
  erro?: string
}

export default function VistoriaPage({ params }: { params: Promise<{ token: string }> }) {
  const resolvedParams = use(params)
  const token = resolvedParams.token

  const [laudo, setLaudo] = useState<DadosLaudo | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erroToken, setErroToken] = useState('')
  const [fotos, setFotos] = useState<FotoUpload[]>([])
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [nomeVistoriador, setNomeVistoriador] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function carregar() {
      try {
        const res = await fetch(`/api/vistoria?token=${token}`)
        if (!res.ok) {
          const err = await res.json()
          setErroToken(err.erro || 'Link inválido.')
          return
        }
        const dados = await res.json()
        setLaudo(dados)
        if (dados.statusVistoria === 'fotos_disponiveis' || dados.statusVistoria === 'finalizado') {
          setEnviado(true)
        }
      } catch {
        setErroToken('Não foi possível carregar. Verifique sua conexão.')
      } finally {
        setCarregando(false)
      }
    }
    carregar()
  }, [token])

  function handleSelecaoFotos(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivos = Array.from(e.target.files || [])
    const novas: FotoUpload[] = arquivos.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      legenda: file.name.replace(/\.[^/.]+$/, ''),
      progresso: 0,
    }))
    setFotos((prev) => [...prev, ...novas])
    e.target.value = ''
  }

  function removerFoto(index: number) {
    setFotos((prev) => prev.filter((_, i) => i !== index))
  }

  function atualizarLegenda(index: number, legenda: string) {
    setFotos((prev) => prev.map((f, i) => (i === index ? { ...f, legenda } : f)))
  }

  async function comprimirImagem(file: File): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          const maxW = 1600
          let { width, height } = img
          if (width > maxW) { height = Math.round((height * maxW) / width); width = maxW }
          const canvas = document.createElement('canvas')
          canvas.width = width; canvas.height = height
          canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
          resolve(canvas.toDataURL('image/jpeg', 0.78))
        }
        img.src = e.target!.result as string
      }
      reader.readAsDataURL(file)
    })
  }

  async function enviarFotos() {
    if (!laudo) return
    if (!nomeVistoriador.trim()) {
      alert('Por favor, informe seu nome antes de enviar.')
      return
    }
    if (fotos.length === 0) {
      alert('Adicione pelo menos uma foto.')
      return
    }

    setEnviando(true)

    try {
      const fotosEnviadas: { preview: string; legenda: string }[] = []

      for (let i = 0; i < fotos.length; i++) {
        const foto = fotos[i]

        // Atualiza progresso visual
        setFotos((prev) => prev.map((f, idx) => idx === i ? { ...f, progresso: 20 } : f))

        // Comprime a imagem
        const base64 = await comprimirImagem(foto.file)

        setFotos((prev) => prev.map((f, idx) => idx === i ? { ...f, progresso: 50 } : f))

        // Converte base64 para Blob e faz upload
        const res = await fetch(base64)
        const blob = await res.blob()
        const formData = new FormData()
        formData.append('file', blob, `vistoria-${Date.now()}-${i}.jpg`)

        const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData })

        if (!uploadRes.ok) throw new Error(`Erro no upload da foto ${i + 1}`)

        const { url } = await uploadRes.json()

        setFotos((prev) => prev.map((f, idx) => idx === i ? { ...f, progresso: 100, url } : f))

        fotosEnviadas.push({ preview: url, legenda: foto.legenda })
      }

      // Busca fotos existentes no laudo e adiciona as novas
      const laudoRes = await fetch(`/api/laudos/${laudo.laudoId}`)
      const laudoAtual = laudoRes.ok ? await laudoRes.json() : {}
      const fotosExistentes: { preview: string; legenda: string }[] = laudoAtual.fotos || []

      // Atualiza laudo com novas fotos e novo status
      await fetch('/api/vistoria', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          laudoId: laudo.laudoId,
          statusVistoria: 'fotos_disponiveis',
          fotos: [...fotosExistentes, ...fotosEnviadas],
          nomeVistoriador: nomeVistoriador.trim(),
          dataEnvioFotos: new Date().toISOString(),
          eventoHistorico: {
            usuario: nomeVistoriador.trim(),
            acao: `${fotosEnviadas.length} foto(s) enviada(s) pelo vistoriador`,
          },
        }),
      })

      // Cria notificação para o responsável pelo laudo
      if (laudoAtual.responsavelEmail) {
        await fetch('/api/notificacoes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: laudoAtual.responsavelEmail,
            tipo: 'fotos_disponiveis',
            titulo: 'Fotos da vistoria disponíveis',
            mensagem: `As fotos do imóvel em ${laudo.endereco} foram enviadas por ${nomeVistoriador.trim()} e estão prontas para o laudo.`,
          }),
        })
      }

      setEnviado(true)
    } catch (err) {
      console.error(err)
      alert('Erro ao enviar fotos. Verifique sua conexão e tente novamente.')
    } finally {
      setEnviando(false)
    }
  }

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-400 text-sm">Carregando...</div>
      </div>
    )
  }

  if (erroToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
        <div className="max-w-sm w-full bg-white rounded-3xl border border-slate-200 p-8 text-center shadow-sm">
          <div className="text-4xl mb-4">⚠️</div>
          <h1 className="text-lg font-semibold text-slate-900 mb-2">Link inválido</h1>
          <p className="text-sm text-slate-500">{erroToken}</p>
        </div>
      </div>
    )
  }

  if (enviado) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
        <div className="max-w-sm w-full bg-white rounded-3xl border border-slate-200 p-8 text-center shadow-sm">
          <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
            <svg viewBox="0 0 24 24" className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="text-lg font-semibold text-slate-900 mb-2">Fotos enviadas!</h1>
          <p className="text-sm text-slate-500">
            As fotos foram recebidas com sucesso e já estão disponíveis para o avaliador. Obrigado!
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-[linear-gradient(135deg,#082f49,#2563eb)] px-6 py-5">
        <div className="max-w-lg mx-auto">
          <p className="text-xs font-semibold tracking-widest text-blue-200 uppercase mb-1">Lesath Engenharia</p>
          <h1 className="text-white text-xl font-semibold">Envio de fotos — vistoria</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Dados do imóvel */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Imóvel</p>
          <p className="font-medium text-slate-900">{laudo?.endereco || 'Endereço não informado'}</p>
          {laudo?.proprietario && <p className="text-sm text-slate-500 mt-1">Proprietário: {laudo.proprietario}</p>}
          {laudo?.tipo && <p className="text-sm text-slate-500">Tipo: {laudo.tipo}</p>}
        </div>

        {/* Nome do vistoriador */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <label className="block text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">
            Seu nome
          </label>
          <input
            type="text"
            value={nomeVistoriador}
            onChange={(e) => setNomeVistoriador(e.target.value)}
            placeholder="Digite seu nome completo"
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400"
          />
        </div>

        {/* Upload de fotos */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              Fotos ({fotos.length})
            </p>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white"
            >
              + Adicionar fotos
            </button>
          </div>

          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/*"
            capture="environment"
            onChange={handleSelecaoFotos}
            className="hidden"
          />

          {fotos.length === 0 && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="w-full border-2 border-dashed border-slate-200 rounded-xl py-10 text-center text-slate-400 text-sm"
            >
              Toque aqui para adicionar fotos
              <br />
              <span className="text-xs">da câmera ou galeria</span>
            </button>
          )}

          {fotos.map((foto, index) => (
            <div key={index} className="border border-slate-100 rounded-xl overflow-hidden">
              <div className="relative">
                <img src={foto.preview} alt="" className="w-full h-48 object-cover" />
                <button
                  type="button"
                  onClick={() => removerFoto(index)}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 text-white text-xs flex items-center justify-center"
                >
                  ✕
                </button>
                {foto.progresso > 0 && foto.progresso < 100 && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
                    <div className="h-full bg-blue-400 transition-all" style={{ width: `${foto.progresso}%` }} />
                  </div>
                )}
                {foto.progresso === 100 && (
                  <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="p-3">
                <input
                  type="text"
                  value={foto.legenda}
                  onChange={(e) => atualizarLegenda(index, e.target.value)}
                  placeholder="Legenda (ex: Fachada, Sala, Quarto)"
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-blue-400"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Botão enviar */}
        {fotos.length > 0 && (
          <button
            type="button"
            onClick={enviarFotos}
            disabled={enviando}
            className="w-full rounded-2xl bg-[linear-gradient(135deg,#15803d,#22c55e)] py-4 text-sm font-semibold text-white shadow-lg disabled:opacity-60"
          >
            {enviando ? 'Enviando fotos...' : `Enviar ${fotos.length} foto(s)`}
          </button>
        )}
      </div>
    </div>
  )
}
