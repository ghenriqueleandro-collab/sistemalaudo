'use client'

import { useRef, useState, useEffect } from 'react'

type Props = {
  form: any
  handleImagemBenfeitorias: (e: React.ChangeEvent<HTMLInputElement>) => void
  removerImagemBenfeitorias?: () => void
  setForm?: React.Dispatch<React.SetStateAction<any>>
}

export default function EtapaCalculoBenfeitorias({
  form,
  handleImagemBenfeitorias,
  removerImagemBenfeitorias,
  setForm,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [imagemLocal, setImagemLocal] = useState<string>(form.imagemBenfeitorias || '')

  // Sincroniza imagem local quando o form externo muda (ex: carregamento inicial)
  useEffect(() => {
    if (form.imagemBenfeitorias) {
      setImagemLocal(form.imagemBenfeitorias)
    }
  }, [form.imagemBenfeitorias])

  function handleNovaImagem(e: React.ChangeEvent<HTMLInputElement>) {
    handleImagemBenfeitorias(e)
    // Lê o arquivo localmente para exibir imediatamente
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (ev) => setImagemLocal(ev.target?.result as string)
      reader.readAsDataURL(file)
    }
  }

  function handleRemover() {
    // Esconde imediatamente na tela
    setImagemLocal('')

    // Atualiza o estado do parent via setForm (direto)
    if (setForm) {
      setForm((prev: any) => ({ ...prev, imagemBenfeitorias: '' }))
    }

    // Chama o callback do parent se existir
    if (removerImagemBenfeitorias) {
      removerImagemBenfeitorias()
    }

    // Reseta o input para permitir novo upload
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">10.2. CÁLCULO DAS BENFEITORIAS</h2>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
        <div>
          <label className="block font-medium mb-2">
            Upload da imagem do cálculo das benfeitorias
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleNovaImagem}
            className="w-full border p-2 rounded"
          />
        </div>

        {imagemLocal && (
          <div className="space-y-3">
            <img
              src={imagemLocal}
              alt="Pré-visualização do cálculo das benfeitorias"
              className="max-w-full rounded border"
            />
            <button
              type="button"
              onClick={handleRemover}
              className="inline-flex items-center justify-center rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
            >
              Excluir imagem
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
