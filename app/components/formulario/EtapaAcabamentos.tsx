'use client'

type Props = {
  acabamentos: { ambiente: string; acabamento: string }[]
  handleAcabamentoChange: (index: number, valor: string) => void
}

export default function EtapaAcabamentos({
  acabamentos,
  handleAcabamentoChange,
}: Props) {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">7. Acabamentos</h2>

      <div className="space-y-3">
        {acabamentos.map((item, index) => (
          <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              type="text"
              value={(item.ambiente || '').replace(' | ', ' ')}
              readOnly
              className="w-full border p-2 rounded bg-gray-50"
            />

            <input
              type="text"
              value={item.acabamento || ''}
              onChange={(e) =>
                handleAcabamentoChange(index, e.target.value)
              }
              placeholder="Digite o acabamento"
              className="w-full border p-2 rounded bg-white"
            />
          </div>
        ))}
      </div>
    </div>
  )
}