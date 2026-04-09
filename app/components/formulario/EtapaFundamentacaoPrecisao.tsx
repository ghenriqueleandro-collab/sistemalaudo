'use client'

type Props = {
  fundamentacao: any[]
  fundamentacaoInferencia: any[]
  fundamentacaoEvolutivo: any[]
  precisao: any[]
  
  selecionarGrauFundamentacao: (index: number, grau: 'III' | 'II' | 'I') => void
  selecionarGrauFundamentacaoInferencia: (index: number, grau: 'III' | 'II' | 'I') => void
  selecionarGrauFundamentacaoEvolutivo: (index: number, grau: 'III' | 'II' | 'I') => void
  selecionarGrauPrecisao: (index: number, grau: 'III' | 'II' | 'I') => void
  somaFundamentacao: number
  somaFundamentacaoInferencia: number
  somaFundamentacaoEvolutivo: number
  exibirTabelaFatoresTerreno: boolean
  exibirTabelaInferencia: boolean
  exibirTabelaMetodoEvolutivo: boolean
}

const linhasFundamentacao = [
  {
    item: 1,
    descricao: 'Caracterização do imóvel avaliando',
    iii: 'Completa quanto a todos os fatores analisados',
    ii: 'Completa quanto aos fatores utilizados no tratamento',
    i: 'Adoção de situação paradigma',
  },
  {
    item: 2,
    descricao: 'Quantidade mínima de dados de mercado efetivamente utilizados',
    iii: '12',
    ii: '5',
    i: '3',
  },
  {
    item: 3,
    descricao: 'Identificação dos dados de mercado',
    iii: 'Apresentação das informações relativas a todas as características dos dados analisados, com foto e características observadas pelo autor do laudo',
    ii: 'Apresentação das informações relativas a todas as características dos dados analisados',
    i: 'Apresentação das informações relativas a todas as características dos dados correspondentes aos fatores utilizados',
  },
  {
    item: 4,
    descricao: 'Intervalo admissível de ajuste para o conjunto de fatores',
    iii: '0,80 a 1,25',
    ii: '0,5 a 2,00',
    i: '0,40 a 2,50',
  },
]

const linhasFundamentacaoEvolutivo = [
  {
    item: 1,
    descricao: 'Estimativa do valor do terreno',
    iii: 'Grau III de fundamentação no método comparativo ou no involutivo',
    ii: 'Grau II de fundamentação no método comparativo ou no involutivo',
    i: 'Grau I de fundamentação no método comparativo ou no involutivo',
  },
  {
    item: 2,
    descricao: 'Estimativa dos Custos de Reedição',
    iii: 'Grau III de fundamentação no método da quantificação de custo',
    ii: 'Grau II de fundamentação no método da quantificação de custo',
    i: 'Grau I de fundamentação no método da quantificação de custo',
  },
  {
    item: 3,
    descricao: 'Fator de Comercialização',
    iii: 'Inferido em mercado semelhante',
    ii: 'Justificado',
    i: 'Arbitrado',
  },
]

const linhasFundamentacaoInferencia = [
  {
    item: 1,
    descricao: 'Caracterização do imóvel avaliando',
    iii: 'Completa quanto a todas as variáveis analisadas',
    ii: 'Completa quanto às variáveis utilizadas no modelo',
    i: 'Adoção da situação paradigma',
  },
  {
    item: 2,
    descricao: 'Quantidade mínima de dados do mercado',
    iii: '6 (k+1), onde k é o número de variáveis independentes',
    ii: '4 (k+1), onde k é o número de variáveis independentes',
    i: '3 (k+1), onde k é o número de variáveis independentes',
  },
  {
    item: 3,
    descricao: 'Identificação dos dados de mercado',
    iii: 'Apresentação de informações relativas a todos os dados e variáveis analisados na modelagem, com foto e características observadas no local pelo autor do laudo',
    ii: 'Apresentação de informações relativas a todos os dados e variáveis analisadas na modelagem',
    i: 'Apresentação de informações relativas aos dados e variáveis efetivamente utilizados no modelo',
  },
  {
    item: 4,
    descricao: 'Extrapolação',
    iii: 'Não admitida',
    ii: 'Admitida para apenas uma variável, desde que: a) as medidas das características do imóvel avaliando não sejam superiores a 100% do limite amostral superior, nem inferiores à metade do limite amostral inferior; b) o valor estimado não ultrapasse 15% do valor calculado no limite da fronteira amostral, para a referida variável, em módulo',
    i: 'Admitida para apenas uma variável, desde que: a) as medidas das características do imóvel avaliando não sejam superiores a 100% do limite amostral superior, nem inferiores à metade do limite amostral inferior; b) o valor estimado não ultrapasse 20% do valor calculado no limite da fronteira amostral, para a referida variável, em módulo',
  },
  {
    item: 5,
    descricao: 'Nível de significância (somatório do valor das duas caudas) máximo para a rejeição da hipótese nula de cada regressor (teste bicaudal)',
    iii: '10%',
    ii: '20%',
    i: '30%',
  },
  {
    item: 6,
    descricao: 'Nível de significância máximo admitido para a rejeição da hipótese nula do modelo através do teste F de Snedecor',
    iii: '1%',
    ii: '2%',
    i: '5%',
  },
]

const linhaPrecisao = {
  item: 1,
  descricao:
    'Amplitude do intervalo de confiança de 80% em torno da estimativa de tendência central',
  iii: '≤ 30%',
  ii: '≤ 40%',
  i: '≤ 50%',
}

function classeCelulaSelecionada(ativo: boolean) {
  return ativo ? 'bg-blue-600 text-white font-bold' : 'bg-white'
}

function classeBotaoSelecionado() {
  return 'block w-full h-full px-2 py-3 bg-transparent text-inherit font-inherit'
}

export default function EtapaFundamentacaoPrecisao({
  fundamentacao,
  fundamentacaoInferencia,
  fundamentacaoEvolutivo,
  precisao,
  selecionarGrauFundamentacao,
   selecionarGrauFundamentacaoInferencia,
  selecionarGrauFundamentacaoEvolutivo,
  selecionarGrauPrecisao,
  somaFundamentacao,
  somaFundamentacaoInferencia,
  somaFundamentacaoEvolutivo,
  exibirTabelaFatoresTerreno,
exibirTabelaInferencia,
exibirTabelaMetodoEvolutivo,
}: Props) {


  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold">12. Grau de fundamentação e precisão</h2>
      </div>


      {exibirTabelaFatoresTerreno && (
  <div className="border rounded p-4 bg-white">
    <p className="mb-4 font-semibold">
      Grau de fundamentação no caso de utilização de fatores – Avaliação do terreno
    </p>

        <div className="overflow-x-auto">
          <table className="w-full border text-sm border-collapse table-fixed">
            <colgroup>
              <col className="w-[8%]" />
              <col className="w-[20%]" />
              <col className="w-[19%]" />
              <col className="w-[19%]" />
              <col className="w-[19%]" />
              <col className="w-[15%]" />
            </colgroup>

            <thead>
              <tr className="bg-gray-200">
                <th rowSpan={2} className="border p-2 text-center align-middle">
                  Item
                </th>
                <th rowSpan={2} className="border p-2 text-center align-middle">
                  Descrição
                </th>
                <th colSpan={3} className="border p-2 text-center">
                  GRAU
                </th>
                <th rowSpan={2} className="border p-2 text-center align-middle">
                  Pontuação
                </th>
              </tr>
              <tr className="bg-gray-200">
                <th className="border p-2 text-center">III</th>
                <th className="border p-2 text-center">II</th>
                <th className="border p-2 text-center">I</th>
              </tr>
            </thead>

            <tbody>
              {linhasFundamentacao.map((linha, index) => {
                const grau = fundamentacao[index]?.grau || ''            

                return (
                  <tr key={linha.item}>
                    <td className="border p-2 text-center font-bold align-middle">
                      {linha.item}
                    </td>

                    <td className="border p-2 align-middle">{linha.descricao}</td>

                    <td className={`border p-0 text-center align-middle ${classeCelulaSelecionada(grau === 'III')}`}>
                      <button
                        type="button"
                        onClick={() => selecionarGrauFundamentacao(index, 'III')}
                        className={classeBotaoSelecionado()}
                      >
                        {linha.iii}
                      </button>
                    </td>

                    <td className={`border p-0 text-center align-middle ${classeCelulaSelecionada(grau === 'II')}`}>
                      <button
                        type="button"
                        onClick={() => selecionarGrauFundamentacao(index, 'II')}
                        className={classeBotaoSelecionado()}
                      >
                        {linha.ii}
                      </button>
                    </td>

                    <td className={`border p-0 text-center align-middle ${classeCelulaSelecionada(grau === 'I')}`}>
                      <button
                        type="button"
                        onClick={() => selecionarGrauFundamentacao(index, 'I')}
                        className={classeBotaoSelecionado()}
                      >
                        {linha.i}
                      </button>
                    </td>

                    <td className="border p-2 text-center font-bold align-middle">
                      {fundamentacao[index]?.grau ? fundamentacao[index]?.pontos : ''}
                    </td>
                  </tr>
                )
              })}

              <tr>
                <td colSpan={5} className="border p-2 text-right font-bold">
                  Somatória
                </td>
                <td className="border p-2 text-center font-bold">
                  {somaFundamentacao}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-sm">
      <strong>Obs:</strong> Para menos de 5 dados de mercado, o intervalo deverá ser 0,8 a 1,25.
    </p>
  </div>
)}

      {exibirTabelaMetodoEvolutivo && (
  <div className="border rounded p-4 bg-white">
    <p className="mb-4 font-semibold">
      Grau de fundamentação no caso de utilização do Método Evolutivo
    </p>

        <div className="overflow-x-auto">
          <table className="w-full border text-sm border-collapse table-fixed">
            <colgroup>
              <col className="w-[8%]" />
              <col className="w-[20%]" />
              <col className="w-[19%]" />
              <col className="w-[19%]" />
              <col className="w-[19%]" />
              <col className="w-[15%]" />
            </colgroup>

            <thead>
              <tr className="bg-gray-200">
                <th rowSpan={2} className="border p-2 text-center align-middle">
                  Item
                </th>
                <th rowSpan={2} className="border p-2 text-center align-middle">
                  Descrição
                </th>
                <th colSpan={3} className="border p-2 text-center">
                  GRAU
                </th>
                <th rowSpan={2} className="border p-2 text-center align-middle">
                  Pontuação
                </th>
              </tr>
              <tr className="bg-gray-200">
                <th className="border p-2 text-center">III</th>
                <th className="border p-2 text-center">II</th>
                <th className="border p-2 text-center">I</th>
              </tr>
            </thead>

            <tbody>
              {linhasFundamentacaoEvolutivo.map((linha, index) => {
                const grau = fundamentacaoEvolutivo[index]?.grau || ''

                return (
                  <tr key={linha.item}>
                    <td className="border p-2 text-center font-bold align-middle">
                      {linha.item}
                    </td>

                    <td className="border p-2 align-middle">{linha.descricao}</td>

                    <td className={`border p-0 text-center align-middle ${classeCelulaSelecionada(grau === 'III')}`}>
                      <button
                        type="button"
                        onClick={() => selecionarGrauFundamentacaoEvolutivo(index, 'III')}
                        className={classeBotaoSelecionado()}
                      >
                        {linha.iii}
                      </button>
                    </td>

                    <td className={`border p-0 text-center align-middle ${classeCelulaSelecionada(grau === 'II')}`}>
                      <button
                        type="button"
                        onClick={() => selecionarGrauFundamentacaoEvolutivo(index, 'II')}
                        className={classeBotaoSelecionado()}
                      >
                        {linha.ii}
                      </button>
                    </td>

                    <td className={`border p-0 text-center align-middle ${classeCelulaSelecionada(grau === 'I')}`}>
                      <button
                        type="button"
                        onClick={() => selecionarGrauFundamentacaoEvolutivo(index, 'I')}
                        className={classeBotaoSelecionado()}
                      >
                        {linha.i}
                      </button>
                    </td>

                    <td className="border p-2 text-center font-bold align-middle">
                      {fundamentacaoEvolutivo[index]?.grau ? fundamentacaoEvolutivo[index]?.pontos : ''}
                    </td>
                  </tr>
                )
              })}

              <tr>
                <td colSpan={5} className="border p-2 text-right font-bold">
                  Somatória
                </td>
                <td className="border p-2 text-center font-bold">
                  {somaFundamentacaoEvolutivo}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
)}


{exibirTabelaInferencia && (
  <div className="border rounded p-4 bg-white">
    <p className="mb-4 font-semibold">
      Grau de fundamentação no caso de utilização de modelos de regressão linear
    </p>

        <div className="overflow-x-auto">
          <table className="w-full border text-sm border-collapse table-fixed">
            <colgroup>
              <col className="w-[7%]" />
              <col className="w-[19%]" />
              <col className="w-[18%]" />
              <col className="w-[18%]" />
              <col className="w-[18%]" />
              <col className="w-[10%]" />
            </colgroup>

            <thead>
              <tr className="bg-gray-200">
                <th rowSpan={2} className="border p-2 text-center align-middle">
                  Item
                </th>
                <th rowSpan={2} className="border p-2 text-center align-middle">
                  Descrição
                </th>
                <th colSpan={3} className="border p-2 text-center">
                  GRAU
                </th>
                <th rowSpan={2} className="border p-2 text-center align-middle">
                  Pontuação
                </th>
              </tr>
              <tr className="bg-gray-200">
                <th className="border p-2 text-center">III</th>
                <th className="border p-2 text-center">II</th>
                <th className="border p-2 text-center">I</th>
              </tr>
            </thead>

            <tbody>
              {linhasFundamentacaoInferencia.map((linha, index) => {
                const grau = fundamentacaoInferencia[index]?.grau || ''

                return (
                  <tr key={linha.item}>
                    <td className="border p-2 text-center font-bold align-middle">
                      {linha.item}
                    </td>

                    <td className="border p-2 align-middle">
                      {linha.descricao}
                    </td>

                    <td className={`border p-0 text-center align-middle ${classeCelulaSelecionada(grau === 'III')}`}>
                      <button
                        type="button"
                        onClick={() => selecionarGrauFundamentacaoInferencia(index, 'III')}
                        className={classeBotaoSelecionado()}
                      >
                        {linha.iii}
                      </button>
                    </td>

                    <td className={`border p-0 text-center align-middle ${classeCelulaSelecionada(grau === 'II')}`}>
                      <button
                        type="button"
                        onClick={() => selecionarGrauFundamentacaoInferencia(index, 'II')}
                        className={classeBotaoSelecionado()}
                      >
                        {linha.ii}
                      </button>
                    </td>

                    <td className={`border p-0 text-center align-middle ${classeCelulaSelecionada(grau === 'I')}`}>
                      <button
                        type="button"
                        onClick={() => selecionarGrauFundamentacaoInferencia(index, 'I')}
                        className={classeBotaoSelecionado()}
                      >
                        {linha.i}
                      </button>
                    </td>

                    <td className="border p-2 text-center font-bold align-middle">
                      {fundamentacaoInferencia[index]?.grau ? fundamentacaoInferencia[index]?.pontos : ''}
                    </td>
                  </tr>
                )
              })}

              <tr>
                <td colSpan={5} className="border p-2 text-right font-bold">
                  Somatória
                </td>
                <td className="border p-2 text-center font-bold">
                  {somaFundamentacaoInferencia}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

      </div>)}

      <div className="border rounded p-4 bg-white">
        <p className="mb-4 font-semibold">
          Grau de precisão
        </p>

        <div className="overflow-x-auto">
          <table className="w-full border text-sm border-collapse table-fixed">
            <colgroup>
              <col className="w-[10%]" />
              <col className="w-[30%]" />
              <col className="w-[20%]" />
              <col className="w-[20%]" />
              <col className="w-[20%]" />
            </colgroup>

            <thead>
              <tr className="bg-gray-200">
                <th rowSpan={2} className="border p-2 text-center align-middle">
                  Item
                </th>
                <th rowSpan={2} className="border p-2 text-center align-middle">
                  Descrição
                </th>
                <th colSpan={3} className="border p-2 text-center">
                  GRAU
                </th>
              </tr>
              <tr className="bg-gray-200">
                <th className="border p-2 text-center">III</th>
                <th className="border p-2 text-center">II</th>
                <th className="border p-2 text-center">I</th>
              </tr>
            </thead>

            <tbody>
              <tr>
                <td className="border p-2 text-center font-bold align-middle">
                  {linhaPrecisao.item}
                </td>

                <td className="border p-2 align-middle">
                  {linhaPrecisao.descricao}
                </td>

                <td className={`border p-0 text-center align-middle ${classeCelulaSelecionada(precisao[0]?.grau === 'III')}`}>
                  <button
                    type="button"
                    onClick={() => selecionarGrauPrecisao(0, 'III')}
                    className={classeBotaoSelecionado()}
                  >
                    {linhaPrecisao.iii}
                  </button>
                </td>

                <td className={`border p-0 text-center align-middle ${classeCelulaSelecionada(precisao[0]?.grau === 'II')}`}>
                  <button
                    type="button"
                    onClick={() => selecionarGrauPrecisao(0, 'II')}
                    className={classeBotaoSelecionado()}
                  >
                    {linhaPrecisao.ii}
                  </button>
                </td>

                <td className={`border p-0 text-center align-middle ${classeCelulaSelecionada(precisao[0]?.grau === 'I')}`}>
                  <button
                    type="button"
                    onClick={() => selecionarGrauPrecisao(0, 'I')}
                    className={classeBotaoSelecionado()}
                  >
                    {linhaPrecisao.i}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}