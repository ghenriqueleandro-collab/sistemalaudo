'use client'

type Props = {
  form: any
  setForm: React.Dispatch<React.SetStateAction<any>>
}

export default function EtapaGarantia({ form, setForm }: Props) {
  const isLocacao = form.finalidade === 'locacao'

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">
        {isLocacao ? '14. Conclusões gerais de locação' : '14. Garantia'}
      </h2>

      {isLocacao ? (
        /* ── Locação: texto fixo + campo livre de observações ── */
        <div className="border rounded p-4 bg-white space-y-4">
          <div className="rounded-xl bg-blue-50 border border-blue-200 p-4">
            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">
              Texto padrão — gerado automaticamente no laudo
            </p>
            <p className="text-sm text-slate-700 leading-relaxed">
              Com base nas pesquisas de mercado realizadas e nas características do imóvel avaliado,
              conclui-se que o valor locativo determinado reflete as condições atuais do mercado
              imobiliário local, considerando imóveis de características semelhantes quanto à
              localização, padrão construtivo e estado de conservação. O valor de locação
              estabelecido é compatível com a realidade do mercado, podendo sofrer variações em
              função de condições específicas de negociação.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Observações adicionais (opcional)
            </label>
            <textarea
              className="w-full border rounded p-2 min-h-[100px]"
              placeholder="Observações complementares sobre a locação..."
              value={form.garantiaObservacoes || ''}
              onChange={(e) => setForm({ ...form, garantiaObservacoes: e.target.value })}
            />
          </div>
        </div>
      ) : (
        /* ── Garantia/Execução: fluxo original ── */
        <div className="border rounded p-4 bg-white space-y-4">
          <select
            className="w-full border rounded p-2"
            value={form.garantiaClassificacao}
            onChange={(e) => setForm({ ...form, garantiaClassificacao: e.target.value })}
          >
            <option value="">Selecione a classificação</option>
            <option value="boa">Imóvel aceito como boa garantia</option>
            <option value="observacoes">Imóvel com observações</option>
            <option value="negativa">Imóvel não recomendado</option>
          </select>

          {form.garantiaClassificacao && (
            <textarea
              className="w-full border rounded p-2 min-h-[140px]"
              placeholder={
                form.garantiaClassificacao === 'boa'
                  ? 'Observações adicionais (opcional)'
                  : 'Digite as observações ou justificativa'
              }
              value={form.garantiaObservacoes || ''}
              onChange={(e) => setForm({ ...form, garantiaObservacoes: e.target.value })}
            />
          )}
        </div>
      )}
    </div>
  )
}