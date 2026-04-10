'use client'

import Image from 'next/image'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

type ErrosLogin = {
  email?: string
  senha?: string
  geral?: string
}

function validarEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export default function HomePage() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [lembrar, setLembrar] = useState(true)
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [erros, setErros] = useState<ErrosLogin>({})

  function validarFormulario() {
    const novosErros: ErrosLogin = {}

    if (!email.trim()) {
      novosErros.email = 'Informe o e-mail de acesso.'
    } else if (!validarEmail(email.trim())) {
      novosErros.email = 'Digite um e-mail válido.'
    }

    if (!senha.trim()) {
      novosErros.senha = 'Informe sua senha.'
    }

    setErros(novosErros)
    return Object.keys(novosErros).length === 0
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!validarFormulario()) return

    setCarregando(true)
    setErros({})

    const resultado = await signIn('credentials', {
      email: email.trim(),
      password: senha,
      redirect: false,
      callbackUrl: '/meus-laudos',
    })

    if (resultado?.error) {
      setErros({
        geral: 'E-mail ou senha inválidos.',
      })
      setCarregando(false)
      return
    }

    if (lembrar && typeof window !== 'undefined') {
      localStorage.setItem('lesath_login_email', email.trim())
    }

    router.push('/meus-laudos')
    router.refresh()
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#dbeafe,white_34%,#e2e8f0)]">
      <section className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-6 py-8 lg:px-10">
        <div className="w-full max-w-xl rounded-[34px] border border-slate-200/80 bg-white p-8 shadow-[0_35px_90px_-55px_rgba(15,23,42,0.55)] sm:p-10">
          <div className="flex items-center justify-between gap-4">
            <div className="rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200">
              <Image
                src="/logo-lesath.png"
                alt="Lesath Engenharia"
                width={220}
                height={70}
                priority
                className="h-12 w-auto object-contain"
              />
            </div>

            <div className="rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-900">
              Login seguro
            </div>
          </div>

          <div className="mt-8">
            <div className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-400">
              acesso restrito
            </div>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
              Entrar na área de gestão
            </h1>
            <p className="mt-3 text-base leading-7 text-slate-600">
              Acesse o painel interno da Lesath Engenharia para gerenciar laudos,
              acompanhar o andamento das avaliações e operar o sistema com segurança.
            </p>
          </div>

          {erros.geral && (
            <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {erros.geral}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seuemail@lesathengenharia.com.br"
                className={`w-full rounded-2xl border px-4 py-3 text-sm text-slate-900 outline-none transition ${
                  erros.email
                    ? 'border-rose-300 bg-rose-50'
                    : 'border-slate-200 bg-slate-50 focus:border-blue-400 focus:bg-white'
                }`}
                autoComplete="email"
              />
              {erros.email && (
                <p className="mt-2 text-sm text-rose-700">{erros.email}</p>
              )}
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
                  Recuperar acesso
                </button>
              </div>

              <div className="relative">
                <input
                  type={mostrarSenha ? 'text' : 'password'}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="Digite sua senha"
                  className={`w-full rounded-2xl border px-4 py-3 pr-28 text-sm text-slate-900 outline-none transition ${
                    erros.senha
                      ? 'border-rose-300 bg-rose-50'
                      : 'border-slate-200 bg-slate-50 focus:border-blue-400 focus:bg-white'
                  }`}
                  autoComplete="current-password"
                />

                <button
                  type="button"
                  onClick={() => setMostrarSenha((valor) => !valor)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  {mostrarSenha ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>

              {erros.senha && (
                <p className="mt-2 text-sm text-rose-700">{erros.senha}</p>
              )}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <label className="inline-flex items-center gap-3 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={lembrar}
                  onChange={(e) => setLembrar(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                Manter meu acesso neste dispositivo
              </label>

              <div className="text-sm text-slate-500">Acesso interno da operação</div>
            </div>

            <button
              type="submit"
              disabled={carregando}
              className="inline-flex w-full items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#0f3d68,#2563eb)] px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-900/20 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {carregando ? 'Validando acesso...' : 'Entrar na gestão'}
            </button>
          </form>
        </div>
      </section>
    </main>
  )
}
