'use client'

type Props = {
  form: any
  setForm: React.Dispatch<React.SetStateAction<any>>
}

export default function EtapaGarantia({ form, setForm }: Props) {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">14. Garantia</h2>

      <div className="border rounded p-4 bg-white space-y-4">
        <select
          className="w-full border rounded p-2"
          value={form.garantiaClassificacao}
          onChange={(e) =>
            setForm({
              ...form,
              garantiaClassificacao: e.target.value,
            })
          }
        >
          <option value="">Selecione a classificação</option>
          <option value="boa">Imóvel aceito como boa garantia</option>
          <option value="observacoes">Imóvel com observações</option>
          <option value="negativa">Imóvel não recomendado</option>
        </select>

        {(form.garantiaClassificacao === 'observacoes' ||
          form.garantiaClassificacao === 'negativa') && (
          <textarea
            className="w-full border rounded p-2 min-h-[140px]"
            placeholder="Digite as observações ou justificativa"
            value={form.garantiaObservacoes}
            onChange={(e) =>
              setForm({
                ...form,
                garantiaObservacoes: e.target.value,
              })
            }
          />
        )}
      </div>
    </div>
  )
}