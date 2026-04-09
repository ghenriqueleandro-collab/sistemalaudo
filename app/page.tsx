'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'

type ErrosLogin = {
  email?: string
  senha?: string
  geral?: string
}

function validarEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export default function LoginPage() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [lembrar, setLembrar] = useState(true)
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [erros, setErros] = useState<ErrosLogin>({})

  const anoAtual = useMemo(() => new Date().getFullYear(), [])

  function validarFormulario() {
    const novosErros: ErrosLogin = {}

    if (!email.trim()) {
      novosErros.email = 'Informe seu e-mail.'
    } else if (!validarEmail(email.trim())) {
      novosErros.email = 'Digite um e-mail válido.'
    }

    if (!senha.trim()) {
      novosErros.senha = 'Informe sua senha.'
    } else if (senha.trim().length < 6) {
      novosErros.senha = 'A senha deve ter pelo menos 6 caracteres.'
    }

    setErros(novosErros)
    return Object.keys(novosErros).length === 0
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!validarFormulario()) return

    setCarregando(true)
    setErros({})

    try {
      // Login visual temporário.
      // Quando a autenticação real for implementada, substitua
      // esta etapa pela chamada da API/autenticação.
      await new Promise((resolve) => setTimeout(resolve, 700))

      if (lembrar && typeof window !== 'undefined') {
        localStorage.setItem('lesath_login_email', email.trim())
      }

      router.push('/meus-laudos')
    } catch {
      setErros({
        geral: 'Não foi possível realizar o login agora. Tente novamente.',
      })
    } finally {
      setCarregando(false)
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#dbeafe,white_34%,#e2e8f0)]">
      <section className="mx-auto grid min-h-screen max-w-7xl items-center gap-8 px-6 py-8 lg:grid-cols-[1.05fr_0.95fr] lg:px-10">
        <div className="hidden min-h-[760px] rounded-[36px] bg-[linear-gradient(160deg,#082f49_0%,#0f3d68_48%,#2563eb_100%)] p-10 text-white shadow-[0_35px_90px_-45px_rgba(15,23,42,0.78)] lg:flex lg:flex-col">
          <div className="flex items-center justify-between gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
              <Image
                src="/logo-lesath.png"
                alt="Lesath Engenharia"
                width={220}
                height={70}
                priority
                className="h-12 w-auto object-contain"
              />
            </div>

            <div className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white/85">
              Área de gestão
            </div>
          </div>

          <div className="mt-12">
            <div className="inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-1 text-sm font-medium text-white/85">
              Sistema de laudos imobiliários
            </div>

            <h1 className="mt-6 max-w-2xl text-5xl font-semibold tracking-tight">
              Acesso profissional para operação, acompanhamento e evolução dos laudos.
            </h1>

            <p className="mt-5 max-w-2xl text-lg leading-8 text-white/74">
              Entre na gestão da Lesath para acessar laudos, acompanhar o andamento
              das avaliações e manter a operação técnica organizada em um ambiente
              seguro e preparado para crescer.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur">
              <div className="text-sm text-white/70">Ambiente</div>
              <div className="mt-2 text-2xl font-semibold">Gestão</div>
              <div className="mt-2 text-sm text-white/70">Acesso centralizado da operação</div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur">
              <div className="text-sm text-white/70">Fluxo</div>
              <div className="mt-2 text-2xl font-semibold">Laudos</div>
              <div className="mt-2 text-sm text-white/70">Controle e continuidade do trabalho</div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur">
              <div className="text-sm text-white/70">Status</div>
              <div className="mt-2 text-2xl font-semibold">Online</div>
              <div className="mt-2 text-sm text-white/70">Estrutura pronta para evolução</div>
            </div>
          </div>

          <div className="mt-auto grid gap-4 pt-12 sm:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-white/10 p-6 backdrop-blur">
              <div className="text-sm font-semibold uppercase tracking-[0.22em] text-white/55">
                Segurança
              </div>
              <p className="mt-4 text-sm leading-7 text-white/78">
                Área restrita para acesso interno, com base preparada para autenticação real,
                usuários e controle de permissões.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/10 p-6 backdrop-blur">
              <div className="text-sm font-semibold uppercase tracking-[0.22em] text-white/55">
                Suporte
              </div>
              <p className="mt-4 text-sm leading-7 text-white/78">
                Em caso de dificuldade de acesso, entre em contato com a administração
                responsável pelo sistema.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center">
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
              <h2 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
                Entrar na área de gestão
              </h2>
              <p className="mt-3 text-base leading-7 text-slate-600">
                Informe suas credenciais para acessar o sistema interno da Lesath Engenharia.
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

                  <Link
                    href="#"
                    className="text-sm font-semibold text-blue-700 transition hover:text-blue-800"
                  >
                    Esqueci minha senha
                  </Link>
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

                <div className="text-sm text-slate-500">
                  Acesso interno e controlado
                </div>
              </div>

              <button
                type="submit"
                disabled={carregando}
                className="inline-flex w-full items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#0f3d68,#2563eb)] px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-900/20 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {carregando ? 'Entrando...' : 'Entrar na gestão'}
              </button>
            </form>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="text-sm font-semibold text-slate-900">Ambiente profissional</div>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Estrutura preparada para autenticação real, permissões e operação contínua.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="text-sm font-semibold text-slate-900">Acesso ao sistema</div>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Após o login, o usuário é direcionado para a central de laudos.
                </p>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 border-t border-slate-200 pt-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
              <span>© {anoAtual} Lesath Engenharia. Todos os direitos reservados.</span>
              <span>Plataforma de gestão interna</span>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
