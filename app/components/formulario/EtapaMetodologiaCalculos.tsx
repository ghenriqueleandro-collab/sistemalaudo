'use client'

type Props = {
  form: any
  handleChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => void
  fatoresDisponiveis: string[]
  fatoresSelecionados: string[]
  toggleFator: (fator: string) => void
}

export default function EtapaMetodologiaCalculos({
  form,
  handleChange,
  fatoresDisponiveis,
  fatoresSelecionados,
  toggleFator,
}: Props) {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">10. METODOLOGIA, PESQUISAS E CÁLCULOS</h2>

      <div className="border rounded p-4 bg-gray-50">
        <div className="grid grid-cols-2 gap-2 mb-3">
          <input
            type="date"
            name="periodoPesquisaInicio"
            value={form.periodoPesquisaInicio}
            onChange={handleChange}
            className="w-full border p-2 rounded bg-white"
          />

          <input
            type="date"
            name="periodoPesquisaFim"
            value={form.periodoPesquisaFim}
            onChange={handleChange}
            className="w-full border p-2 rounded bg-white"
          />
        </div>

        <input
  type="number"
  name="quantidadeElementos"
  placeholder="Quantidade de elementos"
  value={form.quantidadeElementos || ''}
  onChange={handleChange}
  className="w-full border p-2 rounded bg-white mb-3"
/>

        <select
          name="tipoInformacoesObtidas"
          value={form.tipoInformacoesObtidas}
          onChange={handleChange}
          className="w-full border p-2 rounded bg-white mb-3"
        >
          <option value="">Selecione o tipo de informação</option>
          <option value="Ofertas">Ofertas</option>
          <option value="Transações">Transações</option>
          <option value="Ofertas e Transações">Ofertas e Transações</option>
        </select>

        <div className="w-full border p-2 rounded bg-gray-100 mb-3">
  Foram coletados {form.quantidadeElementos || 0} elementos comparativos, de porte e características o mais semelhante possível ao avaliando, com alguns fatores contemplados no cálculo.
</div>

<input
  type="hidden"
  name="caracteristicasTerreno"
  value={`Foram coletados ${form.quantidadeElementos || 0} elementos comparativos, de porte e características o mais semelhante possível ao avaliando, com alguns fatores contemplados no cálculo.`}
/>

        <div className="grid grid-cols-1 gap-2">
          {fatoresDisponiveis.map((fator, index) => (
            <label key={index} className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={fatoresSelecionados.includes(fator)}
                onChange={() => toggleFator(fator)}
              />
              <span>{fator}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}