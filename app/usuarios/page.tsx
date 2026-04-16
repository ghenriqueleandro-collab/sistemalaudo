/**
 * SALVAR EM: src/app/usuarios/page.tsx
 */

'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import AppShell from '../components/AppShell'

type Perfil = 'admin' | 'editor' | 'visualizador' | 'agendador'

type Usuario = {
  id: string
  nome: string
  email: string
  perfil: Perfil
  ativo: boolean
  permissoes: {
    criarLaudos: boolean
    editarLaudos: boolean
    excluirLaudos: boolean
    visualizarTodos: boolean
    gerarPdf: boolean
    realizarAgendamentos: boolean
  }
}

const perfilLabel: Record<Perfil, string> = {
  admin: 'Administrador',
  editor: 'Editor',
  visualizador: 'Visualizador',
  agendador: 'Agendador',
}

const perfilClasse: Record<Perfil, string> = {
  admin: 'bg-blue-50 text-blue-700 ring-blue-200',
  editor: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  visualizador: 'bg-slate-100 text-slate-600 ring-slate-200',
  agendador: 'bg-amber-50 text-amber-700 ring-amber-200',
}

const permissaoLabel: Record<string, string> = {
  criarLaudos: 'Criar laudos',
  editarLaudos: 'Editar laudos',
  excluirLaudos: 'Excluir (requer aprovação)',
  visualizarTodos: 'Visualizar todos os laudos',
  gerarPdf: 'Gerar PDF',
  realizarAgendamentos: 'Realizar agendamentos',
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
  const [novoPerfil, setNovoPerfil] = useState<Perfil>('editor')

  // Normaliza perfil para minúsculo para evitar problemas de capitalização
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
      setUsuarios(dados)
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
        body: JSON.stringify({ nome: novoNome, email: novoEmail, senha: novaSenha, perfil: novoPerfil }),
      })
      const dados = await res.json()
      if (!res.ok) { setErro(dados.erro || 'Erro ao criar usuário.'); return }
      setUsuarios((prev) => [...prev, dados])
      setMostrarForm(false)
      setNovoNome(''); setNovoEmail(''); setNovaSenha(''); setNovoPerfil('editor')
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
      if (usuarioSelecionado?.email === usuario.email) setUsuarioSelecionado((p) => p ? { ...p, ativo: !p.ativo } : p)
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
      if (res.ok) {
        setNovaSenhaEdicao('')
        alert('Senha redefinida com sucesso.')
      } else {
        alert('Erro ao redefinir a senha.')
      }
    } finally {
      setRedefinindo(false)
    }
  }

  async function removerUsuario(email: string) {
    if (!confirm('Tem certeza que deseja remover este usuário?')) return
    await fetch(`/api/usuarios/${encodeURIComponent(email)}`, { method: 'DELETE' })
    setUsuarios((prev) => prev.filter((u) => u.email !== email))
    if (usuarioSelecionado?.email === email) setUsuarioSelecionado(null)
  }

  if (status === 'loading' || carregando) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-24 text-slate-400 text-sm">
          Carregando...
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <section className="mx-auto max-w-7xl px-6 pb-16 pt-10 lg:px-10 lg:pt-14">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between mb-8">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-400">
              administração
            </div>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">
              Gerenciamento de usuários
            </h1>
            <p className="mt-3 text-slate-600">
              Cadastre usuários e defina o que cada um pode fazer no sistema.
            </p>
          </div>
          <button
            onClick={() => setMostrarForm(true)}
            className="inline-flex items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#15803d,#22c55e)] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-900/20"
          >
            + Adicionar usuário
          </button>
        </div>

        {mostrarForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-8 shadow-xl">
              <h2 className="text-xl font-semibold text-slate-950 mb-6">Novo usuário</h2>
              {erro && <div className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 border border-rose-200">{erro}</div>}
              <div className="space-y-4">
                <input value={novoNome} onChange={(e) => setNovoNome(e.target.value)} placeholder="Nome completo" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:bg-white" />
                <input type="email" value={novoEmail} onChange={(e) => setNovoEmail(e.target.value)} placeholder="E-mail" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:bg-white" />
                <input type="password" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} placeholder="Senha inicial" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:bg-white" />
                <select value={novoPerfil} onChange={(e) => setNovoPerfil(e.target.value as Perfil)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none">
                  <option value="editor">Editor</option>
                  <option value="visualizador">Visualizador</option>
                  <option value="agendador">Agendador</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              <div className="mt-6 flex gap-3">
                <button onClick={() => { setMostrarForm(false); setErro('') }} className="flex-1 rounded-2xl border border-slate-200 py-3 text-sm font-semibold text-slate-700">Cancelar</button>
                <button onClick={criarUsuario} disabled={salvando} className="flex-1 rounded-2xl bg-blue-600 py-3 text-sm font-semibold text-white disabled:opacity-60">
                  {salvando ? 'Criando...' : 'Criar usuário'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
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
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                      Nenhum usuário cadastrado ainda.
                    </td>
                  </tr>
                )}
                {usuarios.map((u) => (
                  <tr key={u.email} className={`hover:bg-slate-50/70 cursor-pointer ${usuarioSelecionado?.email === u.email ? 'bg-blue-50/50' : ''}`} onClick={() => setUsuarioSelecionado(u)}>
                    <td className="px-6 py-4 font-medium text-slate-950">{u.nome}</td>
                    <td className="px-6 py-4 text-slate-600">{u.email}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${perfilClasse[u.perfil] || 'bg-slate-100 text-slate-600 ring-slate-200'}`}>
                        {perfilLabel[u.perfil] || u.perfil}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${u.ativo ? 'text-emerald-700' : 'text-slate-400'}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${u.ativo ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                        {u.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => toggleAtivo(u)} className={`rounded-xl border px-3 py-1.5 text-xs font-semibold ${u.ativo ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                          {u.ativo ? 'Desativar' : 'Ativar'}
                        </button>
                        <button onClick={() => removerUsuario(u.email)} className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700">
                          Remover
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {usuarioSelecionado ? (
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm h-fit">
              <h2 className="text-base font-semibold text-slate-950 mb-1">Permissões</h2>
              <p className="text-sm text-slate-500 mb-5">{usuarioSelecionado.nome}</p>

              <div className="mb-4">
                <label className="block text-xs font-semibold text-slate-500 mb-2">Perfil</label>
                <select
                  value={usuarioSelecionado.perfil}
                  onChange={(e) => setUsuarioSelecionado({ ...usuarioSelecionado, perfil: e.target.value as Perfil })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none"
                >
                  <option value="editor">Editor</option>
                  <option value="visualizador">Visualizador</option>
                  <option value="agendador">Agendador</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              <div className="space-y-3">
                {Object.entries({
                  criarLaudos: false,
                  editarLaudos: false,
                  excluirLaudos: false,
                  visualizarTodos: false,
                  gerarPdf: false,
                  realizarAgendamentos: false,
                  ...usuarioSelecionado.permissoes,
                }).map(([chave, valor]) => (
                  <div key={chave} className="flex items-center justify-between gap-3 py-2 border-t border-slate-100">
                    <span className="text-sm text-slate-700">{permissaoLabel[chave] || chave}</span>
                    <button
                      onClick={() => setUsuarioSelecionado({
                        ...usuarioSelecionado,
                        permissoes: { ...usuarioSelecionado.permissoes, [chave]: !valor }
                      })}
                      className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors ${valor ? 'bg-blue-600' : 'bg-slate-200'}`}
                    >
                      <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${valor ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={() => salvarPermissoes(usuarioSelecionado)}
                disabled={salvando}
                className="mt-6 w-full rounded-2xl bg-blue-600 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {salvando ? 'Salvando...' : 'Salvar permissões'}
              </button>

              <div className="mt-6 pt-5 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-500 mb-3">Redefinir senha</p>
                <input
                  type="password"
                  value={novaSenhaEdicao}
                  onChange={(e) => setNovaSenhaEdicao(e.target.value)}
                  placeholder="Nova senha (mín. 6 caracteres)"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:bg-white mb-3"
                />
                <button
                  onClick={redefinirSenha}
                  disabled={redefinindo || !novaSenhaEdicao}
                  className="w-full rounded-2xl border border-amber-200 bg-amber-50 py-2.5 text-sm font-semibold text-amber-700 disabled:opacity-50"
                >
                  {redefinindo ? 'Redefinindo...' : 'Redefinir senha'}
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-6 flex items-center justify-center text-sm text-slate-400">
              Clique em um usuário para editar as permissões
            </div>
          )}
        </div>
      </section>
    </AppShell>
  )
}
