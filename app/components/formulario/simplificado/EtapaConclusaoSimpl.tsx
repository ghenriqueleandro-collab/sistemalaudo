'use client'

import { useMemo } from 'react'

type Props = {
  form?: any
  handleChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void
  valorFinalImovel: number
  formatarMoeda: (valor: number) => string
}

export default function EtapaConclusaoSimpl({
  form = {},
  handleChange = () => {},
  valorFinalImovel,
  formatarMoeda,
}: Props) {
  const valorArredondado = Math.round(valorFinalImovel / 100) * 100

  const vlf = useMemo(() => {
    if (!form.valorLiquidezForcada) return 0
    const n = parseFloat(
      String(form.valorLiquidezForcada)
        .replace(/[R$\s]/g, '')
        .replace(/\.(?=\d{3})/g, '')
        .replace(',', '.')
    )
    return isNaN(n) ? 0 : n
  }, [form.valorLiquidezForcada])

  const fatorLiq = useMemo(() => {
    if (vlf > 0 && valorArredondado > 0)
      return (vlf / valorArredondado).toFixed(2).replace('.', ',')
    return null
  }, [vlf, valorArredondado])

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">10. Conclusão</h2>

      {/* Resultado final */}
      <div className="border rounded-xl p-5 bg-white space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-500">Valor de avaliação calculado</span>
          <span className="text-lg font-semibold text-slate-800">{formatarMoeda(valorFinalImovel)}</span>
        </div>
        <div className="flex items-center justify-between border-t pt-3">
          <span className="text-sm font-semibold text-slate-700">Valor arredondado (adotado)</span>
          <span className="text-xl font-bold text-[#17325C]">{formatarMoeda(valorArredondado)}</span>
        </div>
      </div>

      {/* Valor de Liquidez Forçada */}
      <div className="border rounded-xl p-5 bg-white space-y-4">
        <div>
          <h3 className="text-base font-semibold text-slate-800 mb-1">Valor de liquidez forçada</h3>
          <p className="text-xs text-slate-500">
            Percentual de desconto aplicado ao valor de avaliação para cenários de venda forçada (ex.: 70% do valor = fator 0,70). Preencha apenas se aplicável.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Classificação de liquidez */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Classificação de liquidez</label>
            <select
              name="liquidez"
              value={form.liquidez || ''}
              onChange={handleChange}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-blue-400"
            >
              <option value="">Selecione…</option>
              <option value="alta">Liquidez Alta</option>
              <option value="media">Liquidez Média</option>
              <option value="baixa">Liquidez Baixa</option>
            </select>
          </div>

          {/* Valor de liquidez forçada */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Valor de liquidez forçada (R$)</label>
            <input
              type="text"
              name="valorLiquidezForcada"
              value={form.valorLiquidezForcada || ''}
              onChange={handleChange}
              placeholder="Ex.: 1.750.000,00"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
            />
          </div>
        </div>

        {/* Preview do fator calculado */}
        {vlf > 0 && valorArredondado > 0 && (
          <div className="flex items-center gap-3 rounded-lg bg-slate-50 border border-slate-200 px-4 py-3">
            <div className="flex-1">
              <div className="text-xs text-slate-500">Fator de liquidez calculado</div>
              <div className="text-lg font-bold text-[#17325C]">{fatorLiq}</div>
            </div>
            <div className="flex-1">
              <div className="text-xs text-slate-500">Valor de liquidez forçada</div>
              <div className="text-base font-semibold text-[#2347C6]">{formatarMoeda(vlf)}</div>
            </div>
            <div className="flex-1 text-right">
              <div className="text-xs text-slate-500">Desconto aplicado</div>
              <div className="text-base font-semibold text-rose-600">
                {((1 - vlf / valorArredondado) * 100).toFixed(1).replace('.', ',')}%
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Parágrafo de conclusão */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
        <p className="text-sm leading-relaxed text-slate-700">
          Fundamentados nos elementos e condições consignados no presente Laudo de Avaliação,
          atribuímos ao imóvel o valor de{' '}
          <strong className="text-[#17325C]">{formatarMoeda(valorArredondado)}</strong>
          {vlf > 0 && (
            <>, com valor de liquidez forçada de{' '}
              <strong className="text-[#2347C6]">{formatarMoeda(vlf)}</strong>
              {form.liquidez && (
                <> ({form.liquidez === 'alta' ? 'Liquidez Alta' : form.liquidez === 'media' ? 'Liquidez Média' : 'Liquidez Baixa'})</>
              )}
            </>
          )}
          .
        </p>
      </div>
    </div>
  )
}
