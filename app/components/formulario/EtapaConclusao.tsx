'use client'

type Props = {
  valorFinalImovel: number
  formatarMoeda: (valor: number) => string
  form: any
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void
}

function numeroPorExtensoSimples(valor: number): string {
  if (!valor || valor <= 0) return ''
  const n = Math.round(valor)
  if (n < 1000) return `${n.toLocaleString('pt-BR')} reais`
  if (n < 1_000_000) {
    const mil = Math.floor(n / 1000)
    const resto = n % 1000
    return resto > 0 ? `${mil} mil e ${resto.toLocaleString('pt-BR')} reais` : `${mil} mil reais`
  }
  const mi = Math.floor(n / 1_000_000)
  const resto = n % 1_000_000
  return resto > 0
    ? `${mi} ${mi === 1 ? 'milhao' : 'milhoes'} e ${Math.round(resto).toLocaleString('pt-BR')} reais`
    : `${mi} ${mi === 1 ? 'milhao' : 'milhoes'} de reais`
}

export default function EtapaConclusao({
  valorFinalImovel,
  formatarMoeda,
  form,
  handleChange,
}: Props) {
  const valorArredondado = Math.round(valorFinalImovel / 100) * 100
  const fatorRaw = (form.fatorLiquidacaoForcada || '').replace(',', '.')
  const fatorNum = parseFloat(fatorRaw)
  const fatorValido = !isNaN(fatorNum) && fatorNum > 0 && fatorNum < 1
  const valorLiquidacao = fatorValido ? Math.round(valorArredondado * fatorNum / 100) * 100 : 0
  const fatorExibicao = fatorValido ? `${(fatorNum * 100).toFixed(0)}%` : null
  const valorExtenso = numeroPorExtensoSimples(valorArredondado)
  const liquidacaoExtenso = numeroPorExtensoSimples(valorLiquidacao)

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">12. Conclusão</h2>

      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Valor de avaliação</p>
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[180px] rounded-xl bg-blue-50 border border-blue-200 p-4 text-center">
            <p className="text-xs text-blue-600 font-semibold mb-1">Valor calculado</p>
            <p className="text-2xl font-bold text-blue-900">{formatarMoeda(valorFinalImovel)}</p>
          </div>
          <div className="flex-1 min-w-[180px] rounded-xl bg-slate-50 border border-slate-200 p-4 text-center">
            <p className="text-xs text-slate-500 font-semibold mb-1">Valor arredondado</p>
            <p className="text-2xl font-bold text-slate-800">{formatarMoeda(valorArredondado)}</p>
            {valorExtenso && (
              <p className="text-[10px] text-slate-400 mt-1 leading-tight">
                {valorExtenso.charAt(0).toUpperCase() + valorExtenso.slice(1)}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Liquidação forçada</p>

        <div className="flex flex-wrap gap-4 items-start">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Fator de liquidação forçada
            </label>
            <input
              name="fatorLiquidacaoForcada"
              value={form.fatorLiquidacaoForcada || ''}
              onChange={handleChange}
              placeholder="ex: 0,70"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400 transition"
            />
            <p className="text-[11px] text-slate-400 mt-1.5">
              0,70 = 70% do valor de avaliação. Deixe em branco se não aplicável.
            </p>
          </div>

          {fatorValido && (
            <div className="flex-1 min-w-[180px] rounded-xl bg-amber-50 border border-amber-200 p-4 text-center">
              <p className="text-xs text-amber-600 font-semibold mb-1">
                Valor em liquidação forçada ({fatorExibicao})
              </p>
              <p className="text-xl font-bold text-amber-800">{formatarMoeda(valorLiquidacao)}</p>
              {liquidacaoExtenso && (
                <p className="text-[10px] text-amber-500 mt-1 leading-tight">
                  {liquidacaoExtenso.charAt(0).toUpperCase() + liquidacaoExtenso.slice(1)}
                </p>
              )}
            </div>
          )}
        </div>


      </div>

      <div className="rounded-xl border border-green-200 bg-green-50 p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-green-600 mb-2">
          Texto de conclusao
        </p>
        <p className="text-sm text-slate-700 leading-relaxed">
          Fundamentados nos elementos e condicoes consignados no presente Laudo de Avaliacao, atribuimos ao
          imóvel o valor de{' '}
          <strong>{formatarMoeda(valorArredondado)}</strong>
          {valorExtenso ? ` (${valorExtenso.charAt(0).toUpperCase() + valorExtenso.slice(1)})` : ''}.
          {fatorValido && (
            <>
              {' '}Em caso de liquidacao forcada, o valor estimado e de{' '}
              <strong>{formatarMoeda(valorLiquidacao)}</strong>
              {liquidacaoExtenso
                ? ` (${liquidacaoExtenso.charAt(0).toUpperCase() + liquidacaoExtenso.slice(1)})`
                : ''}
              , correspondente a {fatorExibicao} do valor de avaliacao.
            </>
          )}
        </p>
      </div>
    </div>
  )
}
