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
  return ativo ? 'bg-blue-600 text-white font-semibold' : 'bg-white hover:bg-blue-50 transition-colors cursor-pointer'
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

  // Valor numérico do grau
  const gv = (g?: string) => g === 'III' ? 3 : g === 'II' ? 2 : g === 'I' ? 1 : 0

  // Enquadramento — Fatores
  const encFatores = (() => {
    const g2 = gv(fundamentacao[1]?.grau), g4 = gv(fundamentacao[3]?.grau)
    const outros = [fundamentacao[0], fundamentacao[2]]
    if (somaFundamentacao >= 10 && g2 >= 3 && g4 >= 3 && outros.every(i => gv(i?.grau) >= 2)) return 'III'
    if (somaFundamentacao >= 6  && g2 >= 2 && g4 >= 2 && outros.every(i => gv(i?.grau) >= 1)) return 'II'
    if (somaFundamentacao >= 4  && fundamentacao.every(i => gv(i?.grau) >= 1)) return 'I'
    return ''
  })()

  // Enquadramento — Evolutivo
  const encEvolutivo = (() => {
    if (somaFundamentacaoEvolutivo >= 8 && fundamentacaoEvolutivo.every(i => gv(i?.grau) >= 2)) return 'III'
    if (somaFundamentacaoEvolutivo >= 5 && gv(fundamentacaoEvolutivo[0]?.grau) >= 2 && gv(fundamentacaoEvolutivo[1]?.grau) >= 2) return 'II'
    if (somaFundamentacaoEvolutivo >= 3 && fundamentacaoEvolutivo.every(i => gv(i?.grau) >= 1)) return 'I'
    return ''
  })()

  // Enquadramento — Inferência
  const encInferencia = (() => {
    const man = [fundamentacaoInferencia[1], fundamentacaoInferencia[3], fundamentacaoInferencia[4], fundamentacaoInferencia[5]]
    const oth = [fundamentacaoInferencia[0], fundamentacaoInferencia[2]]
    if (somaFundamentacaoInferencia >= 16 && man.every(i => gv(i?.grau) >= 3) && oth.every(i => gv(i?.grau) >= 2)) return 'III'
    if (somaFundamentacaoInferencia >= 10 && man.every(i => gv(i?.grau) >= 2) && oth.every(i => gv(i?.grau) >= 1)) return 'II'
    if (somaFundamentacaoInferencia >= 6  && fundamentacaoInferencia.every(i => gv(i?.grau) >= 1)) return 'I'
    return ''
  })()

  // Estilo célula de enquadramento ativa
  const ceEnc = (ativo: boolean) =>
    `border p-2 text-center font-bold ${ativo ? 'bg-blue-600 text-white' : ''}`

  // Tabela de enquadramento (Tabela 4) — sempre visível como referência
  function TabelaEnquadramento({ enc }: { enc: string }) {
    const pending = !enc
    return (
      <div className={`mt-4 rounded-xl border p-4 ${pending ? 'border-slate-200 bg-slate-50' : 'border-blue-200 bg-blue-50'}`}>
        <p className={`text-sm font-semibold mb-2 ${pending ? 'text-slate-500' : 'text-blue-800'}`}>
          {pending
            ? 'Tabela 4 — Enquadramento (selecione os graus acima para apurar o resultado)'
            : <>Resultado — Grau de Fundamentação <span className="text-lg font-bold">{enc}</span></>
          }
        </p>
        <table className="w-full border text-sm border-collapse">
          <tbody>
            <tr className="bg-slate-100">
              <td className="border p-2 text-center font-bold w-1/4">Graus</td>
              <td className={ceEnc(!pending && enc === 'III')}>III</td>
              <td className={ceEnc(!pending && enc === 'II')}>II</td>
              <td className={ceEnc(!pending && enc === 'I')}>I</td>
            </tr>
            <tr>
              <td className="border p-2 text-center bg-slate-50 text-xs">Pontos mínimos</td>
              <td className="border p-2 text-center text-xs">10</td>
              <td className="border p-2 text-center text-xs">6</td>
              <td className="border p-2 text-center text-xs">4</td>
            </tr>
            <tr>
              <td className="border p-2 text-center bg-slate-50 text-xs align-middle">Itens obrigatórios</td>
              <td className={`border p-2 text-center text-xs ${!pending && enc === 'III' ? 'bg-blue-100 font-medium' : ''}`}>
                Itens 2 e 4 grau III, demais no mín. grau II
              </td>
              <td className={`border p-2 text-center text-xs ${!pending && enc === 'II' ? 'bg-blue-100 font-medium' : ''}`}>
                Itens 2 e 4 no mín. grau II, demais grau I
              </td>
              <td className={`border p-2 text-center text-xs ${!pending && enc === 'I' ? 'bg-blue-100 font-medium' : ''}`}>
                Todos no mínimo grau I
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    )
  }


  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">12. Grau de fundamentação e precisão</h2>
        <p className="text-sm text-slate-500 mt-1">As tabelas são exibidas automaticamente conforme o método e tratamento selecionados na etapa 1–6, ou detectados pelo motor de cálculo.</p>
      </div>

      {!exibirTabelaFatoresTerreno && !exibirTabelaMetodoEvolutivo && !exibirTabelaInferencia && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          ⚠ Nenhum método de avaliação foi selecionado. Volte à etapa <strong>1–6 (Identificação)</strong> e selecione o <strong>Método de avaliação</strong> para que as tabelas de fundamentação sejam exibidas aqui.
        </div>
      )}
      {exibirTabelaFatoresTerreno && (
      <>
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <p className="text-sm font-semibold text-slate-700 mb-4">Grau de fundamentação — Tratamento por Fatores</p>

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
              <tr className="bg-slate-100">
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
              <tr className="bg-slate-100">
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

        <p className="mt-4 text-xs text-slate-400"><strong>Obs:</strong> Para menos de 5 dados de mercado, o intervalo deverá ser 0,80 a 1,25.</p>
      </div>
      <TabelaEnquadramento enc={encFatores} />
      </>
      )}

      {exibirTabelaMetodoEvolutivo && (
      <>
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <p className="text-sm font-semibold text-slate-700 mb-4">Grau de fundamentação — Método Evolutivo</p>

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
              <tr className="bg-slate-100">
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
              <tr className="bg-slate-100">
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
      <TabelaEnquadramento enc={encEvolutivo} />
      </>
      )}

      {exibirTabelaInferencia && (
      <>
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <p className="text-sm font-semibold text-slate-700 mb-4">Grau de fundamentação — Inferência Estatística</p>

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
              <tr className="bg-slate-100">
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
              <tr className="bg-slate-100">
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
      </div>
      <TabelaEnquadramento enc={encInferencia} />
      </>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <p className="text-sm font-semibold text-slate-700 mb-4">Grau de precisão</p>

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
              <tr className="bg-slate-100">
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
              <tr className="bg-slate-100">
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