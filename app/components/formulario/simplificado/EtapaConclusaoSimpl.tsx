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
      <div className="border rounded-xl p-5 bg-white space-y-3">
        <label className="block text-sm font-medium text-slate-700">Valor de liquidez forçada (R$)</label>
        <input
          type="text"
          name="valorLiquidezForcada"
          value={form.valorLiquidezForcada || ''}
          onChange={handleChange}
          placeholder="Ex.: 1.750.000,00"
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
        />
        {vlf > 0 && valorArredondado > 0 && (
          <div className="flex items-center gap-3 rounded-lg bg-slate-50 border border-slate-200 px-4 py-3">
            <div className="flex-1">
              <div className="text-xs text-slate-500">Fator de liquidez</div>
              <div className="text-lg font-bold text-[#17325C]">{fatorLiq}</div>
            </div>
            <div className="flex-1">
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
            </>
          )}
          .
        </p>
      </div>
    </div>
  )
}
