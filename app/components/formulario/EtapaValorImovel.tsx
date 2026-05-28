'use client'

type Props = {
  form: any
  handleChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => void
  outrosFatoresImovel: { descricao: string; valor: string }[]
  handleOutroFatorImovelChange: (index: number, campo: 'descricao' | 'valor', valor: string) => void
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

const LBL = 'block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5'
const INP = 'w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white outline-none focus:border-blue-400 transition'
const INP_RO = 'w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 text-slate-600 outline-none cursor-default'

export default function EtapaValorImovel({
  form, handleChange,
  outrosFatoresImovel, handleOutroFatorImovelChange,
  adicionarLinhaOutroFatorImovel, removerLinhaOutroFatorImovel,
  subtotalImovel, produtoOutrosFatores, valorFinalImovel, formatarMoeda,
  modoValorImovel, onModoChange,
  valoresAdicionais, handleValorAdicionalChange,
  adicionarValorAdicional, removerValorAdicional, somaValoresAdicionais,
}: Props) {

  // ── Dados automáticos do motor ─────────────────────────────────────────────
  const cddm = (form as any).dadosCalculoCDDM
  const ev   = (form as any).dadosCalculoEvolutivo
  const isEvo = form.metodoAvaliacao === 'evolutivo'

  const temCddm = !isEvo && cddm && (cddm.mediaSaneada ?? 0) > 0
  const temEv   = isEvo  && ev   && (ev.valorFinal ?? 0) > 0

  // Valores automáticos do motor
  const vuAuto        = temCddm ? cddm.mediaSaneada : 0
  const areaAuto      = temCddm ? (cddm.avaliando?.area ?? 0) : 0
  const valorCddmAuto = temCddm ? cddm.valorImovel : 0
  const valorEvAuto   = temEv   ? ev.valorFinal : 0

  // Fator de comercialização
  const fc = parseFloat((form.fatorComercializacao || '1').replace(',', '.')) || 1

  // Fator de liquidação forçada
  const fatorLiqRaw = (form.fatorLiquidacaoForcada || '').replace(',', '.')
  const fatorLiq    = parseFloat(fatorLiqRaw)
  const fatorLiqOk  = !isNaN(fatorLiq) && fatorLiq > 0 && fatorLiq < 1

  const fmt = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold text-slate-900">11. Valor do imóvel</h2>

      {/* ── Base de cálculo automática ─────────────────────────────────────── */}
      {(temCddm || temEv) ? (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">
          <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
            {temCddm ? 'Base de cálculo — Método Comparativo Direto (CDDM)' : 'Base de cálculo — Método Evolutivo'}
          </p>
          {temCddm && (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <span className={LBL + ' text-blue-600'}>VU médio saneado (R$/m²)</span>
                <div className={INP_RO}>{fmt(vuAuto)}</div>
              </div>
              <div>
                <span className={LBL + ' text-blue-600'}>Área do avaliando (m²)</span>
                <div className={INP_RO}>{fmt(areaAuto)}</div>
              </div>
              <div>
                <span className={LBL + ' text-blue-600'}>Valor base (VU × Área)</span>
                <div className="w-full border border-blue-300 rounded-xl px-3 py-2.5 text-sm bg-white font-semibold text-blue-900">
                  {formatarMoeda(valorCddmAuto)}
                </div>
              </div>
            </div>
          )}
          {temEv && (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <span className={LBL + ' text-blue-600'}>Valor do terreno</span>
                <div className={INP_RO}>{formatarMoeda(ev.valorTerreno ?? 0)}</div>
              </div>
              <div>
                <span className={LBL + ' text-blue-600'}>Valor das benfeitorias</span>
                <div className={INP_RO}>{formatarMoeda(ev.valorBenfeitorias ?? 0)}</div>
              </div>
              <div>
                <span className={LBL + ' text-blue-600'}>Valor base</span>
                <div className="w-full border border-blue-300 rounded-xl px-3 py-2.5 text-sm bg-white font-semibold text-blue-900">
                  {formatarMoeda(valorEvAuto)}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ── Entrada manual quando não há dados do motor ─────────────────── */
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
          <p className="text-xs text-slate-400">
            Preencha a metodologia (etapa 10) para calcular automaticamente, ou informe manualmente abaixo.
          </p>
          <div className="flex gap-2 p-1 bg-slate-100 rounded-xl w-fit">
            {(['separado', 'total'] as const).map((modo) => (
              <button key={modo} type="button" onClick={() => onModoChange(modo)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${modoValorImovel === modo ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                {modo === 'separado' ? 'Terreno + Benfeitorias' : 'Valor total direto'}
              </button>
            ))}
          </div>
          {modoValorImovel === 'separado' ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LBL}>Valor do terreno</label>
                <input name="valorTerreno" value={form.valorTerreno} onChange={handleChange} placeholder="ex: 150.000,00" className={INP} />
              </div>
              <div>
                <label className={LBL}>Valor das benfeitorias</label>
                <input name="valorBenfeitorias" value={form.valorBenfeitorias} onChange={handleChange} placeholder="ex: 320.000,00" className={INP} />
              </div>
            </div>
          ) : (
            <div>
              <label className={LBL}>Valor total do imóvel</label>
              <input name="valorTotal" value={form.valorTotal || ''} onChange={handleChange} placeholder="ex: 470.000,00" className={INP} />
            </div>
          )}
        </div>
      )}

      {/* ── Fator de comercialização ───────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <label className={LBL}>Fator de comercialização</label>
        <input name="fatorComercializacao" value={form.fatorComercializacao} onChange={handleChange}
          placeholder="ex: 1,00" className={INP} />
        <p className="text-xs text-slate-400 mt-1.5">
          Use para ajuste de mercado (ex: 0,95 = desconto de 5%). Padrão: 1,00.
        </p>
      </div>

      {/* ── Fator de liquidação forçada ────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <div>
          <label className={LBL}>Fator de liquidação forçada</label>
          <input name="fatorLiquidacaoForcada" value={form.fatorLiquidacaoForcada || ''} onChange={handleChange}
            placeholder="ex: 0,70 (= 70% do valor)" className={INP} />
          <p className="text-xs text-slate-400 mt-1.5">Deixe em branco se não aplicável.</p>
        </div>
      </div>

      {/* ── Outros fatores multiplicativos ────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <p className={LBL}>Outros fatores multiplicativos</p>
        {outrosFatoresImovel.map((item, index) => (
          <div key={index} className="grid grid-cols-[1fr_180px_40px] gap-2">
            <input type="text" value={item.descricao}
              onChange={(e) => handleOutroFatorImovelChange(index, 'descricao', e.target.value)}
              placeholder="Descrição do fator" className={INP} />
            <input type="text" value={item.valor}
              onChange={(e) => handleOutroFatorImovelChange(index, 'valor', e.target.value)}
              placeholder="Fator (ex: 1,10)" className={INP} />
            <button type="button" onClick={() => removerLinhaOutroFatorImovel(index)}
              className="rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 font-bold transition">×</button>
          </div>
        ))}
        <button type="button" onClick={adicionarLinhaOutroFatorImovel}
          className="text-sm px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition">
          + Adicionar fator
        </button>
      </div>

      {/* ── Valores adicionais (somados) ───────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <div>
          <p className={LBL}>Valores adicionais <span className="normal-case font-normal text-slate-400">(somados ao valor calculado)</span></p>
          <p className="text-xs text-slate-400 mb-2">Itens extras que somam ao valor final (ex: equipamentos instalados).</p>
        </div>
        {valoresAdicionais.map((item, index) => (
          <div key={index} className="grid grid-cols-[1fr_220px_40px] gap-2">
            <input type="text" value={item.descricao}
              onChange={(e) => handleValorAdicionalChange(index, 'descricao', e.target.value)}
              placeholder="Descrição" className={INP} />
            <input type="text" value={item.valor}
              onChange={(e) => handleValorAdicionalChange(index, 'valor', e.target.value)}
              placeholder="Valor (ex: 50.000,00)" className={INP} />
            <button type="button" onClick={() => removerValorAdicional(index)}
              className="rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 font-bold transition">×</button>
          </div>
        ))}
        <button type="button" onClick={adicionarValorAdicional}
          className="text-sm px-4 py-2 rounded-xl border border-blue-200 text-blue-600 bg-blue-50 hover:bg-blue-100 transition">
          + Adicionar valor
        </button>
      </div>

      {/* ── Resumo final ───────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-green-200 bg-green-50 p-5 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-green-600 mb-3">Valor final calculado</p>
        {(temCddm || temEv) && (
          <>
            <div className="flex justify-between text-sm text-slate-600">
              <span>Valor base</span>
              <span className="font-medium">{formatarMoeda(temCddm ? valorCddmAuto : valorEvAuto)}</span>
            </div>
            {fc !== 1 && (
              <div className="flex justify-between text-sm text-slate-600">
                <span>× Fator de comercialização ({fc.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})</span>
                <span className="font-medium">{formatarMoeda((temCddm ? valorCddmAuto : valorEvAuto) * fc)}</span>
              </div>
            )}
          </>
        )}
        {produtoOutrosFatores !== 1 && (
          <div className="flex justify-between text-sm text-slate-600">
            <span>× Outros fatores ({produtoOutrosFatores.toLocaleString('pt-BR', { minimumFractionDigits: 4 })})</span>
            <span className="font-medium">{formatarMoeda(subtotalImovel)}</span>
          </div>
        )}
        {somaValoresAdicionais > 0 && (
          <div className="flex justify-between text-sm text-slate-600">
            <span>+ Valores adicionais</span>
            <span className="font-medium">{formatarMoeda(somaValoresAdicionais)}</span>
          </div>
        )}
        <div className="flex justify-between items-center pt-2 border-t border-green-200">
          <span className="text-base font-bold text-green-900">Valor final</span>
          <span className="text-2xl font-bold text-green-800">{formatarMoeda(valorFinalImovel)}</span>
        </div>
        {fatorLiqOk && (
          <div className="flex justify-between text-sm text-amber-700 pt-1 border-t border-green-200 mt-1">
            <span>Liquidação forçada ({(fatorLiq * 100).toFixed(0)}%)</span>
            <span className="font-semibold">{formatarMoeda(Math.round(Math.round(valorFinalImovel / 100) * 100 * fatorLiq / 100) * 100)}</span>
          </div>
        )}
      </div>
    </div>
  )
}
