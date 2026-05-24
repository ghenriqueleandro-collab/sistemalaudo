'use client'

import { useState, useEffect, useCallback } from 'react'

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
  // O usuário digita o FATOR (ex: 0,70) — o valor é calculado automaticamente
  const valorArredondado = Math.round(valorFinalImovel / 100) * 100

  // Estado local do fator — controlado independentemente para evitar perda de foco
  const [fatorLocal, setFatorLocal] = useState<string>(() => {
    // Restaurar fator salvo: se valorLiquidezForcada existe, recalcula o fator
    const vlf = form.valorLiquidezForcada
    if (vlf && valorArredondado > 0) {
      const n = parseFloat(String(vlf).replace(/[R$\s]/g, '').replace(/\.(?=\d{3})/g, '').replace(',', '.'))
      if (!isNaN(n) && n > 0) return (n / valorArredondado).toFixed(2).replace('.', ',')
    }
    return ''
  })

  // Fator como número (0,70 → 0.70)
  const fatorNum = parseFloat(fatorLocal.replace(',', '.')) || 0

  // Valor de liquidez calculado automaticamente
  const vlf = fatorNum > 0 && fatorNum <= 1 ? valorArredondado * fatorNum : 0

  // Propaga o valor de liquidez calculado para o form pai ao mudar o fator
  const propagarVlf = useCallback((vlf: number) => {
    const fakeEvent = {
      target: {
        name: 'valorLiquidezForcada',
        value: vlf > 0 ? vlf.toFixed(2).replace('.', ',') : '',
      },
    } as React.ChangeEvent<HTMLInputElement>
    handleChange(fakeEvent)
  }, [handleChange])

  useEffect(() => {
    propagarVlf(vlf)
  }, [vlf, propagarVlf])

  const fatorValido = fatorNum > 0 && fatorNum < 1

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

      {/* Fator de Liquidez */}
      <div className="border rounded-xl p-5 bg-white space-y-3">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">
            Fator de liquidez forçada
          </label>
          <p className="text-xs text-slate-400 mb-3">
            Digite o fator entre 0 e 1 (ex: <strong>0,70</strong> = 70% do valor de avaliação). O valor de liquidez é calculado automaticamente.
          </p>
          <input
            type="text"
            value={fatorLocal}
            onChange={(e) => setFatorLocal(e.target.value)}
            placeholder="Ex.: 0,70"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
          />
        </div>

        {/* Resultado automático */}
        {fatorValido && (
          <div className="grid grid-cols-3 gap-3 pt-1">
            <div className="rounded-lg bg-[#EAF0FB] border border-[#C9D3E6] p-3 text-center">
              <div className="text-xs text-[#5a7090] mb-1">Fator aplicado</div>
              <div className="text-base font-bold text-[#17325C]">{fatorLocal}</div>
            </div>
            <div className="rounded-lg bg-[#EAF0FB] border border-[#C9D3E6] p-3 text-center">
              <div className="text-xs text-[#5a7090] mb-1">Desconto</div>
              <div className="text-base font-bold text-rose-600">
                {((1 - fatorNum) * 100).toFixed(1).replace('.', ',')}%
              </div>
            </div>
            <div className="rounded-lg bg-[#17325C] p-3 text-center">
              <div className="text-xs text-[#8FA4C7] mb-1">Valor de liquidez forçada</div>
              <div className="text-base font-bold text-white">{formatarMoeda(vlf)}</div>
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
          {fatorValido && vlf > 0 && (
            <>, com valor de liquidez forçada de{' '}
              <strong className="text-[#2347C6]">{formatarMoeda(vlf)}</strong>
              {' '}(fator {fatorLocal})
            </>
          )}
          .
        </p>
      </div>
    </div>
  )
}
