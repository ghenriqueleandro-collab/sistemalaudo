/**
 * SALVAR EM: src/app/usuarios/page.tsx
 *
 * Atualizado: removido perfil 'agendador' e permissão 'realizarAgendamentos'.
 */

'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import AppShell from '../components/AppShell'

// Apenas admin é um perfil especial. Todos os demais são 'usuario'
// com permissões individuais configuradas manualmente.
type Perfil = 'admin' | 'usuario'

type Permissoes = {
  criarLaudos: boolean
  editarLaudos: boolean
  excluirLaudos: boolean
  visualizarTodos: boolean
  gerarPdf: boolean
}

type Usuario = {
  id: string
  nome: string
  email: string
  perfil: string // string para suportar valores legados em Redis
  ativo: boolean
  permissoes: Permissoes
}

const permissaoLabel: Record<keyof Permissoes, string> = {
  criarLaudos:      'Criar laudos',
  editarLaudos:     'Editar laudos',
  excluirLaudos:    'Excluir (requer aprovação)',
  visualizarTodos:  'Visualizar todos os laudos',
  gerarPdf:         'Gerar PDF',
}

const PERMISSOES_PADRAO: Permissoes = {
  criarLaudos:     false,
  editarLaudos:    false,
  excluirLaudos:   false,
  visualizarTodos: false,
  gerarPdf:        false,
}

function badgePerfil(perfil: string) {
  if (perfil === 'admin') return 'bg-blue-50 text-blue-700 ring-blue-200'
  return 'bg-slate-100 text-slate-600 ring-slate-200'
}

function labelPerfil(perfil: string) {
  if (perfil === 'admin') return 'Administrador'
  return 'Usuário'
}

export default function UsuariosPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [carregando, setCarregando] = useState(true)
  const [usuarioSelecionado, setUsuarioSelecionado] = useState<Usuario | null>(null)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [novaSenhaEdicao, setNovaSenhaEdicao] = useState('')
  const [redefinindo, setRedefinindo] = useState(false)
  const [erro, setErro] = useState('')

  const [novoNome, setNovoNome] = useState('')
  const [novoEmail, setNovoEmail] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [novoEhAdmin, setNovoEhAdmin] = useState(false)

  const perfil = ((session?.user as any)?.perfil || '').toLowerCase()

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/')
    if (status === 'authenticated' && perfil && perfil !== 'admin') router.push('/meus-laudos')
  }, [status, perfil])

  useEffect(() => {
    if (status === 'authenticated') carregarUsuarios()
  }, [status])

  async function carregarUsuarios() {
    setCarregando(true)
    try {
      const res = await fetch('/api/usuarios', { cache: 'no-store' })
      const dados = await res.json()
      // Exclui usuários com perfil 'cliente' — esses são gerenciados na página Empresas
      setUsuarios(
        dados
          .filter((u: Usuario) => u.perfil !== 'cliente')
          .map((u: Usuario) => ({
            ...u,
            permissoes: { ...PERMISSOES_PADRAO, ...(u.permissoes || {}) },
          }))
      )
    } finally {
      setCarregando(false)
    }
  }

  async function criarUsuario() {
    if (!novoNome || !novoEmail || !novaSenha) {
      setErro('Preencha nome, e-mail e senha.')
      return
    }
    setSalvando(true)
    setErro('')
    try {
      const res = await fetch('/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: novoNome,
          email: novoEmail,
          senha: novaSenha,
          perfil: novoEhAdmin ? 'admin' : 'usuario',
          permissoes: PERMISSOES_PADRAO,
        }),
      })
      const dados = await res.json()
      if (!res.ok) { setErro(dados.erro || 'Erro ao criar usuário.'); return }
      setUsuarios((prev) => [...prev, { ...dados, permissoes: { ...PERMISSOES_PADRAO, ...(dados.permissoes || {}) } }])
      setMostrarForm(false)
      setNovoNome(''); setNovoEmail(''); setNovaSenha(''); setNovoEhAdmin(false)
    } finally {
      setSalvando(false)
    }
  }

  async function toggleAtivo(usuario: Usuario) {
    const res = await fetch(`/api/usuarios/${encodeURIComponent(usuario.email)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ativo: !usuario.ativo }),
    })
    if (res.ok) {
      setUsuarios((prev) => prev.map((u) => u.email === usuario.email ? { ...u, ativo: !u.ativo } : u))
      if (usuarioSelecionado?.email === usuario.email)
        setUsuarioSelecionado((p) => p ? { ...p, ativo: !p.ativo } : p)
    }
  }

  async function salvarPermissoes(usuario: Usuario) {
    setSalvando(true)
    try {
      const res = await fetch(`/api/usuarios/${encodeURIComponent(usuario.email)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissoes: usuario.permissoes, perfil: usuario.perfil }),
      })
      if (res.ok) {
        setUsuarios((prev) => prev.map((u) => u.email === usuario.email ? usuario : u))
        alert('Permissões salvas com sucesso.')
      }
    } finally {
      setSalvando(false)
    }
  }

  async function redefinirSenha() {
    if (!usuarioSelecionado) return
    if (!novaSenhaEdicao || novaSenhaEdicao.length < 6) {
      alert('A senha deve ter pelo menos 6 caracteres.')
      return
    }
    if (!confirm(`Redefinir a senha de ${usuarioSelecionado.nome}?`)) return
    setRedefinindo(true)
    try {
      const res = await fetch(`/api/usuarios/${encodeURIComponent(usuarioSelecionado.email)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senha: novaSenhaEdicao }),
      })
      if (res.ok) { setNovaSenhaEdicao(''); alert('Senha redefinida com sucesso.') }
      else alert('Erro ao redefinir a senha.')
    } finally {
      setRedefinindo(false)
    }
  }

  async function removerUsuario(email: string) {
    if (!confirm('Tem certeza que deseja remover este usuário?')) return
    const res = await fetch(`/api/usuarios/${encodeURIComponent(email)}`, { method: 'DELETE' })
    if (res.ok) {
      setUsuarios((prev) => prev.filter((u) => u.email !== email))
      if (usuarioSelecionado?.email === email) setUsuarioSelecionado(null)
    } else {
      alert('Erro ao remover usuário.')
    }
  }

  if (carregando) {
    return (
      <AppShell>
        <div className="flex h-96 items-center justify-center text-slate-400 text-sm">Carregando usuários...</div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">

        {/* Cabeçalho */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">administração</div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Usuários</h1>
          </div>
          <button
            onClick={() => setMostrarForm(true)}
            className="inline-flex items-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#0f3d68,#2563eb)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition"
          >
            <span className="text-lg leading-none">+</span>
            Novo usuário
          </button>
        </div>

        {/* Modal criar usuário */}
        {mostrarForm && (
          <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 overflow-y-auto py-8 px-4">
            <div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-8 shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-slate-950">Novo usuário</h2>
                <button onClick={() => { setMostrarForm(false); setErro('') }} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">×</button>
              </div>
              <div className="space-y-3">
                <input value={novoNome} onChange={(e) => setNovoNome(e.target.value)}
                  placeholder="Nome completo"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400" />
                <input value={novoEmail} onChange={(e) => setNovoEmail(e.target.value)}
                  placeholder="E-mail" type="email"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400" />
                <input value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)}
                  placeholder="Senha (mín. 6 caracteres)" type="password"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400" />
                <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <span className="text-sm font-medium text-slate-700">Administrador</span>
                  <button
                    type="button"
                    onClick={() => setNovoEhAdmin(!novoEhAdmin)}
                    className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors ${novoEhAdmin ? 'bg-blue-600' : 'bg-slate-200'}`}
                  >
                    <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${novoEhAdmin ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                </div>
                {novoEhAdmin && (
                  <p className="text-xs text-blue-600 px-1">Administradores têm acesso total ao sistema independente das permissões.</p>
                )}
                {erro && <p className="text-sm text-rose-600">{erro}</p>}
              </div>
              <div className="mt-6 flex gap-3">
                <button onClick={() => { setMostrarForm(false); setErro('') }}
                  className="flex-1 rounded-2xl border border-slate-200 py-3 text-sm font-semibold text-slate-700">
                  Cancelar
                </button>
                <button onClick={criarUsuario} disabled={salvando}
                  className="flex-1 rounded-2xl bg-blue-600 py-3 text-sm font-semibold text-white disabled:opacity-60">
                  {salvando ? 'Criando...' : 'Criar usuário'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          {/* Tabela de usuários */}
          <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-6 py-4 font-semibold">Nome</th>
                  <th className="px-6 py-4 font-semibold">E-mail</th>
                  <th className="px-6 py-4 font-semibold">Perfil</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usuarios.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">Nenhum usuário cadastrado ainda.</td>
                  </tr>
                )}
                {usuarios.map((u) => (
                  <tr
                    key={u.email}
                    className={`hover:bg-slate-50/70 cursor-pointer ${usuarioSelecionado?.email === u.email ? 'bg-blue-50/40' : ''}`}
                    onClick={() => { setUsuarioSelecionado(u); setNovaSenhaEdicao('') }}
                  >
                    <td className="px-6 py-4 font-medium text-slate-900">{u.nome}</td>
                    <td className="px-6 py-4 text-slate-500">{u.email}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${badgePerfil(u.perfil)}`}>
                        {labelPerfil(u.perfil)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${u.ativo ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>
                        {u.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleAtivo(u) }}
                          className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                        >
                          {u.ativo ? 'Desativar' : 'Ativar'}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); removerUsuario(u.email) }}
                          className="rounded-lg border border-rose-200 px-3 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50"
                        >
                          Remover
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Painel de permissões */}
          {usuarioSelecionado && (
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm h-fit">
              <h2 className="text-base font-semibold text-slate-950 mb-1">Permissões</h2>
              <p className="text-sm text-slate-500 mb-5">{usuarioSelecionado.nome}</p>

              {/* Toggle administrador */}
              <div className="mb-5 flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <span className="text-sm font-medium text-slate-700">Administrador</span>
                <button
                  type="button"
                  onClick={() => setUsuarioSelecionado({
                    ...usuarioSelecionado,
                    perfil: usuarioSelecionado.perfil === 'admin' ? 'usuario' : 'admin',
                  })}
                  className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors ${usuarioSelecionado.perfil === 'admin' ? 'bg-blue-600' : 'bg-slate-200'}`}
                >
                  <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${usuarioSelecionado.perfil === 'admin' ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
              </div>

              {/* Permissões individuais */}
              {usuarioSelecionado.perfil === 'admin' ? (
                <p className="text-xs text-blue-600 mb-4 px-1">Administradores têm acesso total ao sistema.</p>
              ) : (
                <div className="space-y-1 mb-5">
                  {(Object.keys(permissaoLabel) as (keyof Permissoes)[]).map((chave) => {
                    const valor = usuarioSelecionado.permissoes?.[chave] ?? false
                    return (
                      <div key={chave} className="flex items-center justify-between gap-3 py-2.5 border-t border-slate-100">
                        <span className="text-sm text-slate-700">{permissaoLabel[chave]}</span>
                        <button
                          type="button"
                          onClick={() => setUsuarioSelecionado({
                            ...usuarioSelecionado,
                            permissoes: { ...usuarioSelecionado.permissoes, [chave]: !valor },
                          })}
                          className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors ${valor ? 'bg-blue-600' : 'bg-slate-200'}`}
                        >
                          <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${valor ? 'translate-x-4' : 'translate-x-0'}`} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Redefinir senha */}
              <div className="border-t border-slate-100 pt-4 mb-5">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Redefinir senha</p>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={novaSenhaEdicao}
                    onChange={(e) => setNovaSenhaEdicao(e.target.value)}
                    placeholder="Nova senha (mín. 6 caracteres)"
                    className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-400"
                  />
                  <button
                    onClick={redefinirSenha}
                    disabled={redefinindo}
                    className="rounded-xl bg-slate-800 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
                  >
                    {redefinindo ? '...' : 'Salvar'}
                  </button>
                </div>
              </div>

              <button
                onClick={() => salvarPermissoes(usuarioSelecionado)}
                disabled={salvando}
                className="w-full rounded-2xl bg-[linear-gradient(135deg,#0f3d68,#2563eb)] py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {salvando ? 'Salvando...' : 'Salvar permissões'}
              </button>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
