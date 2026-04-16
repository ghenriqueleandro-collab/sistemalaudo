/**
 * SALVAR EM: src/app/components/AppShell.tsx
 * (substitui o AppShell.tsx existente)
 */

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import BrandLogo from './BrandLogo'
import UserHeader from './UserHeader'

type Notificacao = {
  id: string
  tipo: string
  titulo: string
  mensagem: string
  lida: boolean
  criadoEm: string
}

function formatarDataRelativa(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'agora'
  if (min < 60) return `há ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `há ${h}h`
  return `há ${Math.floor(h / 24)}d`
}

const tipoClasse: Record<string, string> = {
  exclusao_aprovada: 'bg-emerald-50 text-emerald-700',
  exclusao_negada: 'bg-rose-50 text-rose-700',
  default: 'bg-blue-50 text-blue-700',
}

const tipoLabel: Record<string, string> = {
  exclusao_aprovada: 'Aprovado',
  exclusao_negada: 'Negado',
  default: 'Notificação',
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const perfil = (session?.user as any)?.perfil
  const email = session?.user?.email

  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([])
  const [sinoAberto, setSinoAberto] = useState(false)
  const sinoRef = useRef<HTMLDivElement>(null)

  const naoLidas = notificacoes.filter((n) => !n.lida).length

  const carregarNotificacoes = useCallback(async () => {
    if (!email) return
    try {
      const res = await fetch(`/api/notificacoes?email=${encodeURIComponent(email)}`, { cache: 'no-store' })
      if (res.ok) setNotificacoes(await res.json())
    } catch {}
  }, [email])

  // Atualiza a cada 15 segundos para notificações em tempo real
  useEffect(() => {
    carregarNotificacoes()
    const intervalo = setInterval(carregarNotificacoes, 15_000)
    return () => clearInterval(intervalo)
  }, [carregarNotificacoes])

  // Fecha o sino ao clicar fora
  useEffect(() => {
    function handleClickFora(e: MouseEvent) {
      if (sinoRef.current && !sinoRef.current.contains(e.target as Node)) {
        setSinoAberto(false)
      }
    }
    document.addEventListener('mousedown', handleClickFora)
    return () => document.removeEventListener('mousedown', handleClickFora)
  }, [])

  async function marcarComoLida(id: string) {
    await fetch('/api/notificacoes', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, email }),
    })
    setNotificacoes((prev) => prev.map((n) => n.id === id ? { ...n, lida: true } : n))
  }

  async function marcarTodasComoLidas() {
    await fetch('/api/notificacoes', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, marcarTodas: true }),
    })
    setNotificacoes((prev) => prev.map((n) => ({ ...n, lida: true })))
  }

  const links = [
    { href: '/meus-laudos', label: 'Meus laudos', perfis: ['admin', 'editor', 'visualizador', 'agendador'] },
    { href: '/novo-laudo', label: 'Novo laudo', perfis: ['admin', 'editor'] },
    { href: '/agendamentos', label: 'Agendamentos', perfis: ['admin', 'agendador'] },
    { href: '/aprovacoes', label: 'Aprovações', perfis: ['admin'] },
    { href: '/usuarios', label: 'Usuários', perfis: ['admin'] },
  ].filter((link) => {
    // Se perfil ainda não carregou, mostra todos os links
    if (!perfil) return true
    return link.perfis.includes(perfil)
  })

  function classeLink(ativo: boolean) {
    return ativo
      ? 'bg-white text-slate-950 shadow-lg shadow-blue-950/10'
      : 'text-white/80 hover:bg-white/10 hover:text-white'
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#eff6ff,white_45%,#e2e8f0)] text-slate-900">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[linear-gradient(135deg,#082f49_0%,#0f3d68_42%,#2563eb_100%)] shadow-[0_12px_45px_-24px_rgba(15,23,42,0.75)] backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-4 lg:px-10">
          <Link href="/meus-laudos" className="shrink-0 flex items-center">
            <BrandLogo />
          </Link>

          <nav className="hidden items-center gap-2 rounded-full bg-white/10 p-1.5 md:flex">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${classeLink(pathname === link.href)}`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {/* Sino de notificações */}
            <div ref={sinoRef} className="relative">
              <button
                onClick={() => setSinoAberto((v) => !v)}
                className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 transition"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {naoLidas > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white border-2 border-blue-800">
                    {naoLidas > 9 ? '9+' : naoLidas}
                  </span>
                )}
              </button>

              {/* Painel de notificações */}
              {sinoAberto && (
                <div className="absolute right-0 top-12 z-50 w-80 rounded-[20px] border border-slate-200 bg-white shadow-[0_20px_60px_-20px_rgba(15,23,42,0.4)] overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                    <span className="text-sm font-semibold text-slate-900">Notificações</span>
                    {naoLidas > 0 && (
                      <button onClick={marcarTodasComoLidas} className="text-xs font-medium text-blue-600 hover:text-blue-700">
                        Marcar tudo como lido
                      </button>
                    )}
                  </div>

                  <div className="max-h-96 overflow-y-auto">
                    {notificacoes.length === 0 ? (
                      <div className="px-4 py-8 text-center text-sm text-slate-400">
                        Nenhuma notificação
                      </div>
                    ) : (
                      notificacoes.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => !n.lida && marcarComoLida(n.id)}
                          className={`flex gap-3 px-4 py-3 border-b border-slate-50 cursor-pointer hover:bg-slate-50/80 ${!n.lida ? 'bg-blue-50/40' : ''}`}
                        >
                          <div className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${!n.lida ? 'bg-blue-500' : 'bg-transparent'}`} />
                          <div className="flex-1 min-w-0">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold mb-1 ${tipoClasse[n.tipo] || tipoClasse.default}`}>
                              {tipoLabel[n.tipo] || tipoLabel.default}
                            </span>
                            <p className="text-xs text-slate-700 leading-relaxed">{n.mensagem}</p>
                            <p className="text-[10px] text-slate-400 mt-1">{formatarDataRelativa(n.criadoEm)}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <UserHeader />
          </div>
        </div>
      </header>

      <main>{children}</main>
    </div>
  )
}
