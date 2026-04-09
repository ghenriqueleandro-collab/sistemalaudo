'use client'

type Props = {
  valorFinalImovel: number
  formatarMoeda: (valor: number) => string
}

export default function EtapaConclusao({
  valorFinalImovel,
  formatarMoeda,
}: Props) {
  const valorArredondado = Math.round(valorFinalImovel / 100) * 100

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">13. Conclusão</h2>

      <div className="border rounded p-4 bg-white space-y-3">
        <p>
          <strong>Valor de avaliação calculado:</strong>{' '}
          {formatarMoeda(valorFinalImovel)}
        </p>

        <p>
          <strong>Valor arredondado:</strong> {formatarMoeda(valorArredondado)}
        </p>

        <div className="border rounded p-4 bg-gray-50">
          <p className="leading-relaxed">
            Fundamentados nos elementos e condições consignados no presente
            Laudo de Avaliação, atribuímos ao imóvel o valor de{' '}
            <strong>{formatarMoeda(valorArredondado)}</strong>.
          </p>
        </div>
      </div>
    </div>
  )
}