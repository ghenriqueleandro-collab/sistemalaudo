'use client'

type Props = {
  form: any
  handleChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => void
  outrosFatoresImovel: { descricao: string; valor: string }[]
  handleOutroFatorImovelChange: (
    index: number,
    campo: 'descricao' | 'valor',
    valor: string
  ) => void
  adicionarLinhaOutroFatorImovel: () => void
  removerLinhaOutroFatorImovel: (index: number) => void
  subtotalImovel: number
  produtoOutrosFatores: number
  valorFinalImovel: number
  formatarMoeda: (valor: number) => string
}

export default function EtapaValorImovel({
  form,
  handleChange,
  outrosFatoresImovel,
  handleOutroFatorImovelChange,
  adicionarLinhaOutroFatorImovel,
  removerLinhaOutroFatorImovel,
  subtotalImovel,
  produtoOutrosFatores,
  valorFinalImovel,
  formatarMoeda,
}: Props) {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">11. VALOR DO IMÓVEL</h2>

      <input
        name="valorTerreno"
        value={form.valorTerreno}
        onChange={handleChange}
        placeholder="Valor do terreno"
        className="w-full border p-2 rounded"
      />

      <input
        name="valorBenfeitorias"
        value={form.valorBenfeitorias}
        onChange={handleChange}
        placeholder="Valor das benfeitorias"
        className="w-full border p-2 rounded"
      />

      <input
        name="fatorComercializacao"
        value={form.fatorComercializacao}
        onChange={handleChange}
        placeholder="Fator de comercialização"
        className="w-full border p-2 rounded"
      />

      <input
  name="valorLiquidezForcada"
  value={form.valorLiquidezForcada || ''}
  onChange={handleChange}
  placeholder="Valor de liquidez forçada"
  className="w-full border p-2 rounded"
/>

      {outrosFatoresImovel.map((item, index) => (
        <div key={index} className="grid grid-cols-[1fr_180px_60px] gap-2">
          <input
            type="text"
            value={item.descricao}
            onChange={(e) =>
              handleOutroFatorImovelChange(index, 'descricao', e.target.value)
            }
            placeholder="Descrição"
            className="border p-2 rounded"
          />
          <input
            type="text"
            value={item.valor}
            onChange={(e) =>
              handleOutroFatorImovelChange(index, 'valor', e.target.value)
            }
            placeholder="Fator"
            className="border p-2 rounded"
          />
          <button
            type="button"
            onClick={() => removerLinhaOutroFatorImovel(index)}
            className="border rounded bg-red-100"
          >
            X
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={adicionarLinhaOutroFatorImovel}
        className="px-4 py-2 border rounded"
      >
        + Adicionar fator
      </button>

      <div className="border rounded p-4 bg-white">
        <p><strong>Subtotal:</strong> {formatarMoeda(subtotalImovel)}</p>
        <p><strong>Produto dos fatores:</strong> {produtoOutrosFatores.toLocaleString('pt-BR')}</p>
        <p><strong>Valor final:</strong> {formatarMoeda(valorFinalImovel)}</p>
      </div>
    </div>
  )
}