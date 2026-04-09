import AppShell from '../components/AppShell'

export default function RelatoriosPage() {
  return (
    <AppShell>
      <section className="mx-auto max-w-7xl px-6 pb-16 pt-10 lg:px-10 lg:pt-14">
        <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.45)]">
          <div className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-400">próxima fase</div>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">Relatórios</h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
            Esta área já está reservada na navegação. Na próxima etapa entram mapa, filtros, indicadores e exportações.
          </p>
        </div>
      </section>
    </AppShell>
  )
}
