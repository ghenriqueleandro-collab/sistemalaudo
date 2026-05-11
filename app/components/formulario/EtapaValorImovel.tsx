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
  valoresAdicionais: { descricao: string; valor: string }[]
  handleValorAdicionalChange: (index: number, campo: 'descricao' | 'valor', valor: string) => void
  adicionarValorAdicional: () => void
  removerValorAdicional: (index: number) => void
  somaValoresAdicionais: number
}

export default function EtapaValorImovel({
  form, handleChange,
  outrosFatoresImovel, handleOutroFatorImovelChange,
  adicionarLinhaOutroFatorImovel, removerLinhaOutroFatorImovel,
  subtotalImovel, produtoOutrosFatores, valorFinalImovel, formatarMoeda,
  modoValorImovel, onModoChange,
  valoresAdicionais, handleValorAdicionalChange,
  adicionarValorAdicional, removerValorAdicional, somaValoresAdicionais,
}: Props) {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">11. VALOR DO IMÓVEL</h2>

      <div className="flex gap-2 p-1 bg-slate-100 rounded-xl w-fit">
        <button type="button" onClick={() => onModoChange('separado')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${modoValorImovel === 'separado' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
          Terreno + Benfeitorias
        </button>
        <button type="button" onClick={() => onModoChange('total')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${modoValorImovel === 'total' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
          Valor total direto
        </button>
      </div>

      {modoValorImovel === 'separado' ? (
        <>
          <input name="valorTerreno" value={form.valorTerreno} onChange={handleChange}
            placeholder="Valor do terreno" className="w-full border p-2 rounded" />
          <input name="valorBenfeitorias" value={form.valorBenfeitorias} onChange={handleChange}
            placeholder="Valor das benfeitorias" className="w-full border p-2 rounded" />
        </>
      ) : (
        <input name="valorTotal" value={form.valorTotal || ''} onChange={handleChange}
          placeholder="Valor total do imóvel" className="w-full border p-2 rounded" />
      )}

      <input name="fatorComercializacao" value={form.fatorComercializacao} onChange={handleChange}
        placeholder="Fator de comercialização" className="w-full border p-2 rounded" />

      <input name="valorLiquidezForcada" value={form.valorLiquidezForcada || ''} onChange={handleChange}
        placeholder="Valor de liquidez forçada" className="w-full border p-2 rounded" />

      {/* Fatores multiplicativos existentes */}
      {outrosFatoresImovel.map((item, index) => (
        <div key={index} className="grid grid-cols-[1fr_180px_44px] gap-2">
          <input type="text" value={item.descricao}
            onChange={(e) => handleOutroFatorImovelChange(index, 'descricao', e.target.value)}
            placeholder="Descrição do fator" className="border p-2 rounded text-sm" />
          <input type="text" value={item.valor}
            onChange={(e) => handleOutroFatorImovelChange(index, 'valor', e.target.value)}
            placeholder="Fator (ex: 1,10)" className="border p-2 rounded text-sm" />
          <button type="button" onClick={() => removerLinhaOutroFatorImovel(index)}
            className="border rounded bg-red-100 hover:bg-red-200 transition font-bold text-red-600">×</button>
        </div>
      ))}
      <button type="button" onClick={adicionarLinhaOutroFatorImovel}
        className="px-4 py-2 border rounded text-sm">+ Adicionar fator multiplicativo</button>

      {/* Valores adicionais (somados) */}
      <div className="border-t pt-4">
        <p className="text-sm font-semibold text-slate-700 mb-1">
          Valores adicionais
          <span className="ml-2 text-xs font-normal text-slate-400">(somados ao valor calculado)</span>
        </p>
        <p className="text-xs text-slate-400 mb-2">
          Use para incluir itens extras que somam ao valor final (ex: equipamentos, benfeitorias adicionais).
          Campos não preenchidos não aparecerão no laudo.
        </p>

        {valoresAdicionais.map((item, index) => (
          <div key={index} className="grid grid-cols-[1fr_220px_44px] gap-2 mb-2">
            <input type="text" value={item.descricao}
              onChange={(e) => handleValorAdicionalChange(index, 'descricao', e.target.value)}
              placeholder="Descrição (ex: Equipamentos instalados)"
              className="border p-2 rounded text-sm" />
            <input type="text" value={item.valor}
              onChange={(e) => handleValorAdicionalChange(index, 'valor', e.target.value)}
              placeholder="Valor (ex: 50.000,00)"
              className="border p-2 rounded text-sm" />
            <button type="button" onClick={() => removerValorAdicional(index)}
              className="border rounded bg-red-100 hover:bg-red-200 transition font-bold text-red-600">×</button>
          </div>
        ))}

        <button type="button" onClick={adicionarValorAdicional}
          className="px-4 py-2 border border-blue-200 rounded text-sm text-blue-700 hover:bg-blue-50 transition">
          + Adicionar valor
        </button>
      </div>

      {/* Resumo */}
      <div className="border rounded p-4 bg-white">
        {modoValorImovel === 'separado' && (
          <p className="text-sm text-slate-500 mb-1">Terreno + Benfeitorias × Fator de comercialização</p>
        )}
        <p><strong>Subtotal:</strong> {formatarMoeda(subtotalImovel)}</p>
        <p><strong>Produto dos fatores:</strong> {produtoOutrosFatores.toLocaleString('pt-BR')}</p>
        {somaValoresAdicionais > 0 && (
          <p><strong>Valores adicionais:</strong> + {formatarMoeda(somaValoresAdicionais)}</p>
        )}
        <p className="text-lg font-bold text-slate-900 mt-1 pt-1 border-t">
          <strong>Valor final:</strong> {formatarMoeda(valorFinalImovel)}
        </p>
      </div>
    </div>
  )
}
