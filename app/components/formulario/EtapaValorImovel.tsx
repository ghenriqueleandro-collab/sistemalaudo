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
  modoValorImovel: 'separado' | 'total'
  onModoChange: (modo: 'separado' | 'total') => void
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
  modoValorImovel,
  onModoChange,
}: Props) {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">11. VALOR DO IMÓVEL</h2>

      {/* Toggle modo de entrada */}
      <div className="flex gap-2 p-1 bg-slate-100 rounded-xl w-fit">
        <button
          type="button"
          onClick={() => onModoChange('separado')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            modoValorImovel === 'separado'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Terreno + Benfeitorias
        </button>
        <button
          type="button"
          onClick={() => onModoChange('total')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            modoValorImovel === 'total'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Valor total direto
        </button>
      </div>

      {/* Campos conforme o modo */}
      {modoValorImovel === 'separado' ? (
        <>
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
        </>
      ) : (
        <input
          name="valorTotal"
          value={form.valorTotal || ''}
          onChange={handleChange}
          placeholder="Valor total do imóvel"
          className="w-full border p-2 rounded"
        />
      )}

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
        {modoValorImovel === 'separado' && (
          <p className="text-sm text-slate-500 mb-1">
            Terreno + Benfeitorias × Fator de comercialização
          </p>
        )}
        <p><strong>Subtotal:</strong> {formatarMoeda(subtotalImovel)}</p>
        <p><strong>Produto dos fatores:</strong> {produtoOutrosFatores.toLocaleString('pt-BR')}</p>
        <p><strong>Valor final:</strong> {formatarMoeda(valorFinalImovel)}</p>
      </div>
    </div>
  )
}
