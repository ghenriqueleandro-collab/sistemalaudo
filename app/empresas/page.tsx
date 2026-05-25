/**
 * SALVAR EM: src/app/empresas/page.tsx
 */

'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import AppShell from '../components/AppShell'

type Empresa = {
  id: string
  nome: string
  cnpj?: string
  email?: string
  telefone?: string
  site?: string
  responsavel?: string
  emailAcesso?: string
  criadoEm?: string
}

const EMPRESA_VAZIA: Omit<Empresa, 'id'> = {
  nome: '',
  cnpj: '',
  email: '',
  telefone: '',
  site: '',
  responsavel: '',
  emailAcesso: '',
}

export default function EmpresasPage() {
  const { data: session, status: sessionStatus } = useSession()
  const router = useRouter()
  const perfil = (session?.user as any)?.perfil

  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [carregando, setCarregando] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editando, setEditando] = useState<Empresa | null>(null)
  const [form, setForm] = useState<Omit<Empresa, 'id'>>(EMPRESA_VAZIA)
  const [novaSenha, setNovaSenha] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') router.push('/')
    if (sessionStatus === 'authenticated' && perfil && perfil !== 'admin') router.push('/meus-laudos')
  }, [sessionStatus, perfil, router])

  const carregarEmpresas = useCallback(async () => {
    try {
      const res = await fetch('/api/empresas', { cache: 'no-store' })
      if (res.ok) setEmpresas(await res.json())
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    if (sessionStatus === 'authenticated') carregarEmpresas()
  }, [sessionStatus, carregarEmpresas])

  function abrirNova() {
    setEditando(null)
    setForm(EMPRESA_VAZIA)
    setNovaSenha('')
    setErro('')
    setMostrarForm(true)
  }

  function abrirEdicao(empresa: Empresa) {
    setEditando(empresa)
    setForm({
      nome: empresa.nome,
      cnpj: empresa.cnpj || '',
      email: empresa.email || '',
      telefone: empresa.telefone || '',
      site: empresa.site || '',
      responsavel: empresa.responsavel || '',
      emailAcesso: empresa.emailAcesso || '',
    })
    setNovaSenha('')
    setErro('')
    setMostrarForm(true)
  }

  async function salvar() {
    if (!form.nome.trim()) {
      setErro('Nome da empresa é obrigatório.')
      return
    }

    setSalvando(true)
    setErro('')

    try {
      const payload: any = {
        ...form,
        ...(editando ? { id: editando.id } : {}),
      }

      // Se há senha, cria/atualiza o usuário cliente
      if (form.emailAcesso && novaSenha) {
        const resUsuario = await fetch('/api/usuarios', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nome: form.nome,
            email: form.emailAcesso,
            senha: novaSenha,
            perfil: 'cliente',
            ativo: true,
            permissoes: {},
          }),
        })

        if (!resUsuario.ok) {
          const dados = await resUsuario.json().catch(() => ({}))
          // Não bloqueia o save da empresa se o usuário já existe
          console.warn('[Empresas] Aviso ao criar usuário:', dados.erro)
        }
      }

      // Salva a empresa
      const res = await fetch('/api/empresas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const dados = await res.json().catch(() => ({}))
        setErro(dados.erro || 'Erro ao salvar empresa.')
        return
      }

      const salva: Empresa = await res.json()

      // Vincula empresaClienteId ao usuário cliente
      if (form.emailAcesso) {
        await fetch('/api/usuarios/vincular-empresa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: form.emailAcesso,
            empresaClienteId: salva.id,
            empresaNome: salva.nome,
          }),
        }).catch(console.warn)
      }

      await carregarEmpresas()
      setMostrarForm(false)
    } finally {
      setSalvando(false)
    }
  }

  async function excluir(id: string, nome: string) {
    if (!confirm(`Excluir a empresa "${nome}"? Esta ação não pode ser desfeita.`)) return

    await fetch(`/api/empresas/${encodeURIComponent(id)}`, { method: 'DELETE' })
    setEmpresas((prev) => prev.filter((e) => e.id !== id))
  }

  const inputCls =
    'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-400 transition'

  return (
    <AppShell>
      <section className="mx-auto max-w-5xl px-6 pb-16 pt-10 lg:px-10 lg:pt-14">

        {/* Cabeçalho */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-400">
              administração
            </div>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">
              Empresas clientes
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              {empresas.length} empresa{empresas.length !== 1 ? 's' : ''} cadastrada{empresas.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={abrirNova}
            className="inline-flex items-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#0f3d68,#2563eb)] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-900/20"
          >
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 2v12M2 8h12" strokeLinecap="round" />
            </svg>
            Nova empresa
          </button>
        </div>

        {/* Lista */}
        <div className="rounded-[28px] border border-slate-200 bg-white overflow-hidden shadow-sm">
          {carregando ? (
            <div className="px-6 py-16 text-center text-slate-400 text-sm">Carregando...</div>
          ) : empresas.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <p className="text-slate-400 text-sm">Nenhuma empresa cadastrada.</p>
              <button
                type="button"
                onClick={abrirNova}
                className="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-700 hover:bg-blue-100 transition"
              >
                Cadastrar primeira empresa
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {empresas.map((empresa) => (
                <div
                  key={empresa.id}
                  className="flex flex-wrap items-center gap-3 px-6 py-4 hover:bg-slate-50/60 transition"
                >
                  {/* Ícone */}
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-700">
                    {empresa.nome.charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900">{empresa.nome}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {[empresa.cnpj, empresa.responsavel, empresa.email]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                    {empresa.emailAcesso && (
                      <p className="text-xs text-blue-600 mt-0.5">
                        Acesso portal: {empresa.emailAcesso}
                      </p>
                    )}
                  </div>

                  {/* Ações */}
                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => abrirEdicao(empresa)}
                      className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => excluir(empresa.id, empresa.nome)}
                      className="rounded-xl border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 transition"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal / formulário */}
        {mostrarForm && (
          <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 overflow-y-auto py-8 px-4">
            <div className="w-full max-w-xl rounded-[28px] border border-slate-200 bg-white p-8 shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-slate-950">
                  {editando ? 'Editar empresa' : 'Nova empresa'}
                </h2>
                <button
                  type="button"
                  onClick={() => setMostrarForm(false)}
                  className="text-slate-400 hover:text-slate-600 text-2xl leading-none"
                >
                  ×
                </button>
              </div>

              {erro && (
                <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">
                  {erro}
                </div>
              )}

              <div className="space-y-4">
                {/* Dados da empresa */}
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 pb-1 border-b border-slate-100">
                  Dados da empresa
                </p>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                      Nome da empresa *
                    </label>
                    <input
                      type="text"
                      value={form.nome}
                      onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))}
                      placeholder="Construtora Exemplo Ltda"
                      className={inputCls}
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">CNPJ</label>
                    <input
                      type="text"
                      value={form.cnpj}
                      onChange={(e) => setForm((p) => ({ ...p, cnpj: e.target.value }))}
                      placeholder="00.000.000/0001-00"
                      className={inputCls}
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">Telefone</label>
                    <input
                      type="text"
                      value={form.telefone}
                      onChange={(e) => setForm((p) => ({ ...p, telefone: e.target.value }))}
                      placeholder="(11) 99999-0000"
                      className={inputCls}
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">Responsável</label>
                    <input
                      type="text"
                      value={form.responsavel}
                      onChange={(e) => setForm((p) => ({ ...p, responsavel: e.target.value }))}
                      placeholder="Nome do contato"
                      className={inputCls}
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">E-mail</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                      placeholder="contato@empresa.com.br"
                      className={inputCls}
                    />
                  </div>
                </div>

                {/* Acesso ao portal */}
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 pt-2 pb-1 border-b border-slate-100">
                  Acesso ao portal do cliente
                </p>
                <p className="text-xs text-slate-500">
                  O cliente usará este e-mail e senha para acessar <strong>/portal</strong> e ver apenas os laudos da empresa.
                </p>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                      E-mail de acesso
                    </label>
                    <input
                      type="email"
                      value={form.emailAcesso}
                      onChange={(e) => setForm((p) => ({ ...p, emailAcesso: e.target.value }))}
                      placeholder="acesso@empresa.com.br"
                      className={inputCls}
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                      {editando ? 'Nova senha (deixe em branco para manter)' : 'Senha inicial *'}
                    </label>
                    <input
                      type="password"
                      value={novaSenha}
                      onChange={(e) => setNovaSenha(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className={inputCls}
                    />
                  </div>
                </div>

                {/* Botões */}
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setMostrarForm(false)}
                    className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={salvar}
                    disabled={salvando}
                    className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition disabled:opacity-60"
                  >
                    {salvando ? 'Salvando...' : 'Salvar empresa'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </section>
    </AppShell>
  )
}
