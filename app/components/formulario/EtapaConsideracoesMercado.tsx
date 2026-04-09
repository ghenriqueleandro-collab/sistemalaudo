'use client'

type Props = {
  form: any
  handleChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => void
}

export default function EtapaConsideracoesMercado({
  form,
  handleChange,
}: Props) {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">8. Considerações sobre o mercado</h2>

      <div className="border rounded p-4 bg-gray-50">
        <label className="block font-semibold mb-2">
          Texto das considerações sobre o mercado
        </label>

        <textarea
          name="consideracoesMercado"
          placeholder="Digite aqui as considerações sobre o mercado. Obs: No último parágrafo, inserir as impressões específicas de mercado do imóvel avaliando."
          value={form.consideracoesMercado || ''}
          onChange={handleChange}
          className="w-full border p-3 rounded min-h-[220px] resize-y bg-white"
        />
      </div>

      <div className="border rounded p-4 bg-white">
        <h3 className="text-lg font-bold mb-4 text-center">Resumo</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="font-semibold block mb-1">Liquidez</label>
            <select
              name="liquidez"
              value={form.liquidez || ''}
              onChange={handleChange}
              className="w-full border p-2 rounded"
            >
              <option value="">Selecione</option>
<option value="Baixa">Baixa</option>
<option value="Média/Baixa">Média/Baixa</option>
<option value="Média">Média</option>
<option value="Média/Alta">Média/Alta</option>
<option value="Alta">Alta</option>
            </select>
          </div>

          <div>
            <label className="font-semibold block mb-1">
              Desempenho de mercado
            </label>
            <select
              name="desempenhoMercado"
              value={form.desempenhoMercado || ''}
              onChange={handleChange}
              className="w-full border p-2 rounded"
            >
              <option value="">Selecione</option>
<option value="Baixo">Baixo</option>
<option value="Médio/Baixo">Médio/Baixo</option>
<option value="Médio">Médio</option>
<option value="Médio/Alto">Médio/Alto</option>
<option value="Alto">Alto</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}