'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import BrandLogo from './BrandLogo'

const links = [
  { href: '/meus-laudos', label: 'Meus laudos' },
  { href: '/novo-laudo', label: 'Novo laudo' },
  { href: '/relatorios', label: 'Relatórios' },
]

function classeLink(ativo: boolean) {
  return ativo
    ? 'bg-white text-slate-950 shadow-lg shadow-blue-950/10'
    : 'text-white/80 hover:bg-white/10 hover:text-white'
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  async function handleSair() {
    await signOut({ callbackUrl: '/' })
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#eff6ff,white_45%,#e2e8f0)] text-slate-900">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[linear-gradient(135deg,#082f49_0%,#0f3d68_42%,#2563eb_100%)] shadow-[0_12px_45px_-24px_rgba(15,23,42,0.75)] backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-4 lg:px-10">
          <Link href="/meus-laudos" className="shrink-0 flex items-center">
            <BrandLogo />
          </Link>

          <nav className="hidden items-center gap-2 rounded-full bg-white/10 p-1.5 md:flex">
            {links.map((link) => {
              const ativo = pathname === link.href
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${classeLink(
                    ativo
                  )}`}
                >
                  {link.label}
                </Link>
              )
            })}
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white/85 md:inline-flex">
              Área protegida
            </div>

            <button
              type="button"
              onClick={handleSair}
              className="inline-flex rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow transition hover:bg-slate-100"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <main>{children}</main>
    </div>
  )
}
