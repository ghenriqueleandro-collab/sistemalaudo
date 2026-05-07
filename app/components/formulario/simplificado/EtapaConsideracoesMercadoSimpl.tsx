'use client'

import { useEffect } from 'react'

type Props = {
  form: any
  handleChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => void
}

function artigo(tipo: string): string {
  const masculinos = ['apartamento','sobrado','flat','galpão','escritório','conjunto','posto',
    'motel','hospital','terreno','estacionamento','depósito','armazém','galpão','sítio','hotel']
  const t = tipo.toLowerCase()
  return masculinos.some(m => t.startsWith(m)) ? 'um' : 'uma'
}

function gerarDescricaoPadrao(form: any): string {
  const tipo = (form.tipo || '').trim()
  const endereco = (form.endereco || '').trim()
  const proprietario = (form.proprietario || '').trim()
  const matricula = (form.matricula || '').trim()

  let texto = 'O imóvel avaliando trata-se de'
  texto += tipo ? ` ${artigo(tipo)} ${tipo.toLowerCase()}` : ' um imóvel'
  if (endereco) texto += `, localizado no endereço ${endereco}`
  texto += '.'

  if (proprietario || matricula) {
    texto += ' O imóvel'
    if (matricula) texto += ` de matrícula nº ${matricula}`
    if (proprietario) texto += ` é de propriedade de ${proprietario}`
    texto += '.'
  }

  return texto
}

export default function EtapaConsideracoesMercadoSimpl({ form, handleChange }: Props) {

  // Auto-preenche quando o campo está vazio e os dados já foram preenchidos
  useEffect(() => {
    if (!form.consideracoesMercado && (form.tipo || form.endereco)) {
      const texto = gerarDescricaoPadrao(form)
      handleChange({ target: { name: 'consideracoesMercado', value: texto } } as React.ChangeEvent<HTMLTextAreaElement>)
    }
  }, [form.tipo, form.endereco, form.proprietario, form.matricula])

  function restaurarPadrao() {
    const texto = gerarDescricaoPadrao(form)
    handleChange({ target: { name: 'consideracoesMercado', value: texto } } as React.ChangeEvent<HTMLTextAreaElement>)
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">8. Descrição do imóvel avaliando</h2>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-semibold text-slate-700">Descrição</label>
          <button type="button" onClick={restaurarPadrao}
            className="text-xs px-3 py-1.5 rounded-lg border border-blue-200 text-blue-600 bg-blue-50 hover:bg-blue-100 transition">
            ↺ Restaurar texto padrão
          </button>
        </div>

        <textarea
          name="consideracoesMercado"
          value={form.consideracoesMercado || ''}
          onChange={handleChange}
          rows={6}
          className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm resize-y bg-white focus:outline-none focus:border-blue-400 transition"
          placeholder="A descrição será preenchida automaticamente com base nos dados informados."
        />
        <p className="text-xs text-slate-400">
          Texto gerado automaticamente a partir do tipo, endereço, proprietário e matrícula. Edite para adicionar observações específicas do imóvel.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">Resumo de mercado</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Liquidez</label>
            <select name="liquidez" value={form.liquidez || ''} onChange={handleChange}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-blue-400">
              <option value="">Selecione</option>
              <option>Baixa</option>
              <option>Média/Baixa</option>
              <option>Média</option>
              <option>Média/Alta</option>
              <option>Alta</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Desempenho de mercado</label>
            <select name="desempenhoMercado" value={form.desempenhoMercado || ''} onChange={handleChange}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-blue-400">
              <option value="">Selecione</option>
              <option>Baixo</option>
              <option>Médio/Baixo</option>
              <option>Médio</option>
              <option>Médio/Alto</option>
              <option>Alto</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}
