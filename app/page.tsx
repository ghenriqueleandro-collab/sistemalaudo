'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function handleEntrar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setCarregando(true)

    // Login visual temporário.
    // Quando o login real for implementado, substitua esta lógica
    // pela autenticação de verdade.
    setTimeout(() => {
      router.push('/meus-laudos')
    }, 400)
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#dbeafe,white_38%,#e2e8f0)]">
      <section className="mx-auto flex min-h-screen max-w-7xl items-center px-6 py-10 lg:px-10">
        <div className="grid w-full gap-8 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="hidden rounded-[36px] bg-[linear-gradient(160deg,#082f49_0%,#0f3d68_48%,#2563eb_100%)] p-10 text-white shadow-[0_35px_90px_-45px_rgba(15,23,42,0.75)] lg:flex lg:flex-col lg:justify-between">
            <div>
              <div className="inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-1 text-sm font-medium text-white/85">
                Gestão Lesath Engenharia
              </div>

              <h1 className="mt-6 text-5xl font-semibold tracking-tight">
                Acesso ao sistema de laudos imobiliários.
              </h1>

              <p className="mt-5 max-w-xl text-lg leading-8 text-white/75">
                Entre na área de gestão para acessar seus laudos, acompanhar
                operações e evoluir a rotina técnica da Lesath com mais
                organização.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur">
                <div className="text-sm text-white/70">Área</div>
                <div className="mt-2 text-2xl font-semibold">Gestão</div>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur">
                <div className="text-sm text-white/70">Acesso</div>
                <div className="mt-2 text-2xl font-semibold">Login</div>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur">
                <div className="text-sm text-white/70">Status</div>
                <div className="mt-2 text-2xl font-semibold">Online</div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center">
            <div className="w-full max-w-xl rounded-[34px] border border-slate-200/80 bg-white p-8 shadow-[0_35px_90px_-55px_rgba(15,23,42,0.55)] sm:p-10">
              <div className="flex items-center justify-center">
                <div className="rounded-2xl bg-slate-50 px-5 py-4 ring-1 ring-slate-200">
                  <Image
                    src="/logo-lesath.png"
                    alt="Lesath Engenharia"
                    width={220}
                    height={70}
                    priority
                    className="h-14 w-auto object-contain"
                  />
                </div>
              </div>

              <div className="mt-8 text-center">
                <div className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-400">
                  acesso restrito
                </div>
                <h2 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
                  Entrar na gestão
                </h2>
                <p className="mt-3 text-base leading-7 text-slate-600">
                  Use suas credenciais para acessar a área interna do sistema.
                </p>
              </div>

              <form onSubmit={handleEntrar} className="mt-8 space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seuemail@lesathengenharia.com.br"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
                    required
                  />
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <label className="block text-sm font-semibold text-slate-700">
                      Senha
                    </label>
                    <button
                      type="button"
                      className="text-sm font-semibold text-blue-700 transition hover:text-blue-800"
                    >
                      Esqueci minha senha
                    </button>
                  </div>
                  <input
                    type="password"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="Digite sua senha"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={carregando}
                  className="inline-flex w-full items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#0f3d68,#2563eb)] px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-900/20 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {carregando ? 'Entrando...' : 'Entrar'}
                </button>
              </form>

              <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                Login visual inicial. Na próxima fase, este formulário pode ser
                conectado à autenticação real com usuários e senha.
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
