import Link from 'next/link'
import AppShell from './components/AppShell'

const cards = [
  {
    titulo: 'Novo laudo',
    descricao: 'Inicie uma avaliação técnica com o fluxo completo do sistema.',
    href: '/novo-laudo',
  },
  {
    titulo: 'Meus laudos',
    descricao: 'Acompanhe rascunhos, finalizações e retomadas de trabalho.',
    href: '/meus-laudos',
  },
  {
    titulo: 'Relatórios',
    descricao: 'Estrutura reservada para indicadores, mapas e visão estratégica.',
    href: '/relatorios',
  },
]

const etapas = [
  'Identificação',
  'Mercado',
  'Cálculos',
  'Conclusão',
  'PDF final',
]

const diferenciais = [
  'Conforme ABNT NBR 14653',
  'Fluxo guiado por etapas',
  'Visual limpo para operação diária',
  'Estrutura pronta para crescer no online',
]

export default function HomePage() {
  return (
    <AppShell>
      <section className="mx-auto max-w-7xl px-6 pb-16 pt-10 lg:px-10 lg:pt-14">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[32px] border border-slate-200/80 bg-white/85 p-8 shadow-[0_25px_70px_-35px_rgba(15,23,42,0.4)] backdrop-blur xl:p-10">
            <div className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-4 py-1 text-sm font-medium text-blue-900">
              Sistema interno de laudos imobiliários
            </div>

            <h1 className="mt-6 max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">
              Uma página inicial com cara de sistema profissional, pronta para
              evoluir para a nuvem.
            </h1>

            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
              O novo layout organiza melhor a entrada do usuário, destaca os
              caminhos mais usados e já prepara a experiência para uma futura
              camada online com relatórios, histórico e mapa.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/novo-laudo"
                className="rounded-2xl bg-[linear-gradient(135deg,#0f3d68,#2563eb)] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-900/20 transition hover:-translate-y-0.5"
              >
                Criar novo laudo
              </Link>
              <Link
                href="/meus-laudos"
                className="rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                Acessar meus laudos
              </Link>
            </div>
          </div>

          <div className="rounded-[32px] bg-[linear-gradient(160deg,#082f49_0%,#0f3d68_55%,#2563eb_100%)] p-8 text-white shadow-[0_28px_80px_-32px_rgba(37,99,235,0.8)]">
            <div className="text-sm font-medium uppercase tracking-[0.3em] text-white/65">
              visão rápida
            </div>

            <div className="mt-8 grid grid-cols-2 gap-4">
              <div className="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur">
                <div className="text-sm text-white/70">Página inicial</div>
                <div className="mt-3 text-3xl font-semibold">Nova</div>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur">
                <div className="text-sm text-white/70">Meus laudos</div>
                <div className="mt-3 text-3xl font-semibold">Offline</div>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur">
                <div className="text-sm text-white/70">Arquitetura</div>
                <div className="mt-3 text-3xl font-semibold">Escalável</div>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur">
                <div className="text-sm text-white/70">Próxima etapa</div>
                <div className="mt-3 text-3xl font-semibold">Online</div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {cards.map((card) => (
            <Link
              key={card.titulo}
              href={card.href}
              className="group rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.55)] transition hover:-translate-y-1 hover:border-blue-200"
            >
              <div className="mb-5 h-12 w-12 rounded-2xl bg-blue-50 ring-1 ring-blue-100" />
              <h2 className="text-xl font-semibold text-slate-900">{card.titulo}</h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">{card.descricao}</p>
              <div className="mt-5 text-sm font-semibold text-blue-700 group-hover:text-blue-800">
                Abrir seção →
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-10 rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.45)] lg:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-400">
                fluxo operacional
              </div>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                Estrutura mais clara para o dia a dia da equipe
              </h2>
            </div>
            <p className="max-w-2xl text-sm leading-7 text-slate-600">
              A home passa a servir como hub do sistema. O formulário continua
              sendo o núcleo operacional, mas a entrada fica mais organizada,
              mais institucional e mais preparada para futuras integrações.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-5">
            {etapas.map((etapa, index) => (
              <div key={etapa} className="relative rounded-3xl bg-slate-50 p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[linear-gradient(135deg,#0f3d68,#2563eb)] text-sm font-semibold text-white">
                  {index + 1}
                </div>
                <div className="mt-4 text-sm font-semibold text-slate-900">{etapa}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-[1fr_0.9fr]">
          <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.45)]">
            <div className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-400">
              diferenciais
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {diferenciais.map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[32px] border border-slate-200 bg-slate-950 p-6 text-white shadow-[0_24px_70px_-42px_rgba(15,23,42,0.7)]">
            <div className="text-sm font-semibold uppercase tracking-[0.25em] text-white/50">
              estrutura futura
            </div>
            <h3 className="mt-3 text-2xl font-semibold">
              Pensado para crescer sem quebrar a base atual.
            </h3>
            <p className="mt-4 text-sm leading-7 text-white/70">
              A organização proposta separa navegação, armazenamento e telas.
              Isso facilita conectar autenticação, banco online e relatórios no
              momento em que vocês decidirem subir o sistema.
            </p>
          </div>
        </div>
      </section>
    </AppShell>
  )
}
