/**
 * SALVAR EM: src/app/components/formulario/EtapaClienteStatus.tsx
 *
 * Primeira etapa do formulário (detalhado e simplificado).
 * Exibe: empresa solicitante (readonly), seleção de status e observação para o cliente.
 */

'use client'

import type { StatusAcompanhamento } from '../../../lib/laudos-storage'

const STATUS_OPCOES: {
  value: StatusAcompanhamento
  label: string
  descricao: string
  dot: string
  selectedBg: string
  selectedBorder: string
  selectedText: string
  checkColor: string
}[] = [
  {
    value: 'levantamento_documentos',
    label: 'Levantamento de documentos',
    descricao: 'Coletando documentação necessária do imóvel.',
    dot: 'bg-amber-500',
    selectedBg: 'bg-amber-50',
    selectedBorder: 'border-amber-400',
    selectedText: 'text-amber-800',
    checkColor: 'text-amber-600',
  },
  {
    value: 'atuando_vistoria',
    label: 'Atuando na vistoria',
    descricao: 'Realizando a vistoria presencial do imóvel.',
    dot: 'bg-purple-500',
    selectedBg: 'bg-purple-50',
    selectedBorder: 'border-purple-400',
    selectedText: 'text-purple-800',
    checkColor: 'text-purple-600',
  },
  {
    value: 'atuando_pesquisa',
    label: 'Atuando na pesquisa',
    descricao: 'Desenvolvendo a pesquisa de mercado.',
    dot: 'bg-blue-500',
    selectedBg: 'bg-blue-50',
    selectedBorder: 'border-blue-400',
    selectedText: 'text-blue-800',
    checkColor: 'text-blue-600',
  },
  {
    value: 'concluido',
    label: 'Concluído',
    descricao: 'Laudo finalizado e disponível para download.',
    dot: 'bg-emerald-500',
    selectedBg: 'bg-emerald-50',
    selectedBorder: 'border-emerald-400',
    selectedText: 'text-emerald-800',
    checkColor: 'text-emerald-600',
  },
]

type Props = {
  form: any
  handleChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => void
  setForm: React.Dispatch<React.SetStateAction<any>>
}

export default function EtapaClienteStatus({ form, handleChange, setForm }: Props) {
  const statusAtual: StatusAcompanhamento =
    form?.statusAcompanhamento || 'levantamento_documentos'

  function selecionarStatus(valor: StatusAcompanhamento) {
    setForm((prev: any) => ({ ...prev, statusAcompanhamento: valor }))
  }

  return (
    <div className="space-y-6 pb-10">

      {/* ── Empresa cliente ── */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="mb-1 text-base font-semibold text-slate-900">Empresa cliente</h2>
        <p className="mb-4 text-sm text-slate-500">
          Empresa vinculada a este laudo — preenchida pelo agendamento.
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Solicitante / Interessado
            </label>
            <input
              type="text"
              value={form?.solicitante || ''}
              readOnly
              tabIndex={-1}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600 outline-none cursor-default"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Referência interna do cliente
            </label>
            <input
              type="text"
              name="referenciaCliente"
              value={form?.referenciaCliente || ''}
              onChange={handleChange}
              placeholder="Código ou nº do pedido (opcional)"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-400 transition"
            />
          </div>
        </div>
      </section>

      {/* ── Status de acompanhamento ── */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="mb-1 text-base font-semibold text-slate-900">Status de acompanhamento</h2>
        <p className="mb-5 text-sm text-slate-500">
          Selecione o estágio atual. O cliente vê esta informação no portal de acompanhamento.
        </p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {STATUS_OPCOES.map((opcao) => {
            const selecionado = statusAtual === opcao.value
            return (
              <button
                key={opcao.value}
                type="button"
                onClick={() => selecionarStatus(opcao.value)}
                className={[
                  'flex items-start gap-3 rounded-xl border-2 px-4 py-3.5 text-left transition-all',
                  selecionado
                    ? `${opcao.selectedBg} ${opcao.selectedBorder}`
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50',
                ].join(' ')}
              >
                <span
                  className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${opcao.dot}`}
                />
                <div className="flex-1 min-w-0">
                  <span
                    className={`block text-sm font-medium leading-tight ${
                      selecionado ? opcao.selectedText : 'text-slate-700'
                    }`}
                  >
                    {opcao.label}
                  </span>
                  <span className="block text-xs text-slate-400 mt-0.5 leading-tight">
                    {opcao.descricao}
                  </span>
                </div>
                {selecionado && (
                  <span className={`shrink-0 text-sm font-bold ${opcao.checkColor}`}>✓</span>
                )}
              </button>
            )
          })}
        </div>
      </section>

      {/* ── Observação para o cliente ── */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="mb-1 text-base font-semibold text-slate-900">Observação para o cliente</h2>
        <p className="mb-4 text-sm text-slate-500">
          Mensagem visível ao cliente no portal. Use para informar pendências, prazos ou orientações.
        </p>

        <textarea
          name="observacaoCliente"
          value={form?.observacaoCliente || ''}
          onChange={handleChange}
          rows={4}
          placeholder="Ex: Aguardando matrícula atualizada do imóvel. Assim que recebermos, daremos continuidade à vistoria."
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-400 transition resize-none"
        />

        <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="8" cy="8" r="6.5" />
            <path d="M8 7v4M8 5.5v.5" strokeLinecap="round" />
          </svg>
          Campo visível ao cliente. Não inclua valores ou informações internas.
        </p>
      </section>

    </div>
  )
}
