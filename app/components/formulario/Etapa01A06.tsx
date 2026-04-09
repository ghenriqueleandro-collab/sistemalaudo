'use client'

type Props = {
  handleMelhoramentosPublicosChange: (campo: string, valor: string) => void
  form: any
  handleChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => void
  areaConstruidaNaoAverbada: number
  areaTerrenoNaoAverbada: number
  usarCidadeReferencia: boolean
  setUsarCidadeReferencia: (valor: boolean) => void
  divisoes: { quantidade: string; ambiente: string }[]
  handleDivisaoChange: (
    index: number,
    campo: 'quantidade' | 'ambiente',
    valor: string
  ) => void
  adicionarLinhaDivisao: () => void
  removerLinhaDivisao: (index: number) => void
  handleCroqui: (e: React.ChangeEvent<HTMLInputElement>) => void

removerCroqui: (index: number) => void
}

export default function Etapa01A06({
  form,
  handleChange,
  handleMelhoramentosPublicosChange,
  areaConstruidaNaoAverbada,
  areaTerrenoNaoAverbada,
  usarCidadeReferencia,
  setUsarCidadeReferencia,
  divisoes,
  handleDivisaoChange,
  adicionarLinhaDivisao,
  removerLinhaDivisao,
  handleCroqui,
  removerCroqui,
}: Props) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold mb-2">
          1 a 6. Identificação e caracterização do imóvel
        </h2>
        <p className="text-sm text-gray-600">
          Preencha os dados iniciais do imóvel, áreas, divisões, referências e croqui.
        </p>
      </div>

      <input
        name="endereco"
        placeholder="Endereço"
        value={form.endereco}
        onChange={handleChange}
        className="w-full border p-2 rounded"
      />

      <input
        name="proprietario"
        placeholder="Proprietário"
        value={form.proprietario}
        onChange={handleChange}
        className="w-full border p-2 rounded"
      />

      <input
  name="solicitante"
  placeholder="Solicitante / Interessado"
  value={form.solicitante || ''}
  onChange={handleChange}
  className="w-full border p-2 rounded"
/>

      <input
        name="tipo"
        placeholder="Tipo do imóvel"
        value={form.tipo}
        onChange={handleChange}
        className="w-full border p-2 rounded"
      />

      <select
        name="finalidade"
        value={form.finalidade}
        onChange={handleChange}
        className="w-full border p-2 rounded"
      >
        <option value="">Selecione a finalidade</option>
        <option value="garantia">Garantia</option>
        <option value="execucao">Execução</option>
      </select>

      <div className="border rounded p-4 bg-gray-50 space-y-4">
  <h3 className="text-lg font-bold">Definições iniciais do laudo</h3>

  <div>
    <label className="block font-medium mb-1">Método de avaliação</label>
    <select
      name="metodoAvaliacao"
      value={form.metodoAvaliacao}
      onChange={handleChange}
      className="w-full border p-2 rounded bg-white"
    >
      <option value="">Selecione</option>
      <option value="comparativo">Método Comparativo</option>
      <option value="evolutivo">Método Evolutivo</option>
    </select>
  </div>

  <div>
    <label className="block font-medium mb-1">Tratamento dos dados</label>
    <select
      name="tratamentoDados"
      value={form.tratamentoDados}
      onChange={handleChange}
      className="w-full border p-2 rounded bg-white"
    >
      <option value="">Selecione</option>
      <option value="inferencia_estatistica">Inferência estatística</option>
      <option value="tratamento_por_fatores">Tratamento de dados por fatores</option>
    </select>
  </div>

</div>

      <div className="border rounded p-4 bg-gray-50">
        <h3 className="text-lg font-bold mb-3">Áreas principais</h3>

        <input
          name="areaConstruidaTotal"
          placeholder="Área construída total (m²)"
          value={form.areaConstruidaTotal}
          onChange={handleChange}
          className="w-full border p-2 rounded bg-white mb-3"
        />

        <input
          name="areaConstruidaAverbada"
          placeholder="Área construída averbada (m²)"
          value={form.areaConstruidaAverbada}
          onChange={handleChange}
          className="w-full border p-2 rounded bg-white mb-3"
        />

        <div className="w-full border p-2 rounded bg-gray-100 mb-3">
          <strong>Área construída não averbada:</strong>{' '}
          {areaConstruidaNaoAverbada.toLocaleString('pt-BR')} m²
        </div>

        <input
          name="areaTerrenoTotal"
          placeholder="Área de terreno total (m²)"
          value={form.areaTerrenoTotal}
          onChange={handleChange}
          className="w-full border p-2 rounded bg-white mb-3"
        />

        <input
          name="areaTerrenoAverbada"
          placeholder="Área de terreno averbada (m²)"
          value={form.areaTerrenoAverbada}
          onChange={handleChange}
          className="w-full border p-2 rounded bg-white mb-3"
        />

        <div className="w-full border p-2 rounded bg-gray-100">
          <strong>Área de terreno não averbada:</strong>{' '}
          {areaTerrenoNaoAverbada.toLocaleString('pt-BR')} m²
        </div>
      </div>

      <input
        name="matricula"
        placeholder="Matrícula do imóvel"
        value={form.matricula}
        onChange={handleChange}
        className="w-full border p-2 rounded"
      />

      <input
        name="padrao"
        placeholder="Padrão"
        value={form.padrao}
        onChange={handleChange}
        className="w-full border p-2 rounded"
      />

      <input
        name="idadeAparente"
        placeholder="Idade aparente"
        value={form.idadeAparente}
        onChange={handleChange}
        className="w-full border p-2 rounded"
      />

      <input
        name="estadoConservacao"
        placeholder="Estado de conservação"
        value={form.estadoConservacao}
        onChange={handleChange}
        className="w-full border p-2 rounded"
      />

      <input
  name="iptu"
  value={form.iptu || ''}
  onChange={handleChange}
  placeholder="IPTU"
  className="w-full border p-2 rounded"
/>

      <div className="border rounded p-4 bg-gray-50">
        <label className="block font-semibold mb-3">Especificações de divisões</label>

        <div className="grid grid-cols-[120px_1fr_60px] gap-2 mb-2 font-semibold">
          <div>Quantidade</div>
          <div>Ambiente</div>
          <div></div>
        </div>

        {divisoes.map((item, index) => (
          <div
            key={index}
            className="grid grid-cols-[120px_1fr_60px] gap-2 mb-2"
          >
            <select
              value={item.quantidade}
              onChange={(e) =>
                handleDivisaoChange(index, 'quantidade', e.target.value)
              }
              className="w-full border p-2 rounded bg-white"
            >
              {Array.from({ length: 20 }, (_, i) => i + 1).map((numero) => (
                <option key={numero} value={String(numero)}>
                  {numero}
                </option>
              ))}
            </select>

            <input
              type="text"
              placeholder="Ex: Banheiros, Quarto, Sala, Cozinha"
              value={item.ambiente}
              onChange={(e) =>
                handleDivisaoChange(index, 'ambiente', e.target.value)
              }
              className="w-full border p-2 rounded bg-white"
            />

            <button
              type="button"
              onClick={() => removerLinhaDivisao(index)}
              className="px-3 py-2 border rounded bg-red-100"
            >
              X
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={adicionarLinhaDivisao}
          className="mt-2 px-4 py-2 border rounded bg-white"
        >
          + Adicionar ambiente
        </button>
      </div>

      <div className="border rounded p-4 bg-gray-50">
        <label className="block font-semibold mb-2">
          O imóvel precisa de cidade de referência?
        </label>

        <select
          value={usarCidadeReferencia ? 'sim' : 'nao'}
          onChange={(e) => setUsarCidadeReferencia(e.target.value === 'sim')}
          className="w-full border p-2 rounded bg-white"
        >
          <option value="sim">Sim, adicionar cidade de referência</option>
          <option value="nao">Não, o imóvel já está em uma cidade referência</option>
        </select>
      </div>

      {usarCidadeReferencia && (
        <>
          <input
            name="cidadePrincipal"
            placeholder="Cidade principal"
            value={form.cidadePrincipal}
            onChange={handleChange}
            className="w-full border p-2 rounded"
          />

          <input
            name="distanciaCidadePrincipal"
            placeholder="Distância até a cidade principal"
            value={form.distanciaCidadePrincipal}
            onChange={handleChange}
            className="w-full border p-2 rounded"
          />
        </>
      )}

      <input
        name="referencia1"
        placeholder="Local de referência 1"
        value={form.referencia1}
        onChange={handleChange}
        className="w-full border p-2 rounded"
      />

      <input
        name="distancia1"
        placeholder="Distância da referência 1"
        value={form.distancia1}
        onChange={handleChange}
        className="w-full border p-2 rounded"
      />

      <input
        name="referencia2"
        placeholder="Local de referência 2"
        value={form.referencia2}
        onChange={handleChange}
        className="w-full border p-2 rounded"
      />

      <input
        name="distancia2"
        placeholder="Distância da referência 2"
        value={form.distancia2}
        onChange={handleChange}
        className="w-full border p-2 rounded"
      />

      <input
        name="referencia3"
        placeholder="Local de referência 3"
        value={form.referencia3}
        onChange={handleChange}
        className="w-full border p-2 rounded"
      />

      <input
        name="distancia3"
        placeholder="Distância da referência 3"
        value={form.distancia3}
        onChange={handleChange}
        className="w-full border p-2 rounded"
      />

      <input
  name="coordenadasImovel"
  placeholder="Coordenadas do imóvel (ex: -26.220514, -48.915834)"
  value={form.coordenadasImovel || ''}
  onChange={handleChange}
  className="w-full border p-2 rounded"
/>

<div className="border rounded p-4 bg-gray-50">
  <h3 className="text-lg font-bold mb-3 text-center">
    Melhoramentos públicos
  </h3>

  <table className="w-full border-collapse border text-sm">
    <tbody>
      {[
        ['redeAgua', 'Rede de água', 'redeEletrica', 'Rede Elétrica'],
        ['gasCanalizado', 'Gás canalizado', 'redeTelefonica', 'Rede Telefônica'],
        ['esgotoSanitario', 'Esgoto Sanitário', 'iluminacaoPublica', 'Iluminação Pública'],
        ['esgotoPluvial', 'Esgoto Pluvial', 'pavimentacao', 'Pavimentação'],
        ['fossa', 'Fossa', 'passeio', 'Passeio'],
        ['coletaLixo', 'Coleta de Lixo', 'guias', 'Guias'],
        ['lazer', 'Lazer', 'sarjetas', 'Sarjetas'],
      ].map(([campo1, label1, campo2, label2]) => (
        <tr key={String(campo1)}>
          <td className="border p-2">{label1}</td>
          <td className="border p-2">
            <select
              value={form.melhoramentosPublicos?.[String(campo1)] || ''}
              onChange={(e) =>
                handleMelhoramentosPublicosChange(String(campo1), e.target.value)
              }
              className="w-full border p-2 rounded bg-white"
            >
              <option value="">Selecione</option>
              <option value="Sim">Sim</option>
              <option value="Não">Não</option>
            </select>
          </td>

          <td className="border p-2">{label2}</td>
          <td className="border p-2">
            <select
              value={form.melhoramentosPublicos?.[String(campo2)] || ''}
              onChange={(e) =>
                handleMelhoramentosPublicosChange(String(campo2), e.target.value)
              }
              className="w-full border p-2 rounded bg-white"
            >
              <option value="">Selecione</option>
              <option value="Sim">Sim</option>
              <option value="Não">Não</option>
            </select>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>

      <div className="border rounded p-3 bg-gray-50">
        <label className="block font-semibold mb-2">
          Upload do croqui / imagem do item 6
        </label>

        <input
  type="file"
  accept="image/*"
  multiple
  onChange={handleCroqui}
  className="w-full border p-2 rounded bg-white"
/>

        {form.croquis && form.croquis.length > 0 && (
  <div className="mt-4 space-y-4">
    {form.croquis.map((croqui: any, index: number) => (
      <div key={index} className="border rounded p-3 bg-white space-y-3">
        <div className="flex justify-between items-center gap-3">
          <span className="font-medium">Imagem {index + 1}</span>

          <button
            type="button"
            onClick={() => removerCroqui(index)}
            className="px-3 py-1 rounded border border-red-300 text-red-600 bg-white hover:bg-red-50"
          >
            Excluir imagem
          </button>
        </div>

        <div className="flex justify-center">
          <img
            src={croqui.preview}
            alt={`Croqui ${index + 1}`}
            className="w-full max-h-80 object-contain rounded border"
          />
        </div>

      </div>
    ))}
  </div>
)}
      </div>

<div className="border rounded p-4 bg-gray-50 space-y-4">
        <h3 className="text-lg font-bold">Condições específicas do terreno</h3>

        <div className="space-y-2">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              name="terrenoEncravado"
              checked={Boolean(form.terrenoEncravado)}
              onChange={handleChange}
              className="mt-1"
            />
            <span>Terreno encravado</span>
          </label>

          {form.terrenoEncravado && (
            <textarea
              name="observacoesTerrenoEncravado"
              value={form.observacoesTerrenoEncravado || ''}
              onChange={handleChange}
              placeholder="Observações sobre o terreno encravado"
              className="w-full border p-3 rounded bg-white min-h-[120px]"
            />
          )}
        </div>

        <div className="space-y-2">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              name="confrontacaoCursoAgua"
              checked={Boolean(form.confrontacaoCursoAgua)}
              onChange={handleChange}
              className="mt-1"
            />
            <span>Confrontação com o curso d&apos;água</span>
          </label>

          {form.confrontacaoCursoAgua && (
            <textarea
              name="observacoesConfrontacaoCursoAgua"
              value={form.observacoesConfrontacaoCursoAgua || ''}
              onChange={handleChange}
              placeholder="Observações sobre a confrontação com o curso d'água"
              className="w-full border p-3 rounded bg-white min-h-[120px]"
            />
          )}
        </div>
      </div>

    </div>
  )
}