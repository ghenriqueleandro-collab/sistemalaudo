'use client'

import { signOut, useSession } from 'next-auth/react'

export default function UserHeader() {
  const { data: session } = useSession()

  const nomeUsuario = session?.user?.name || 'Usuário'

  async function handleSair() {
    await signOut({ callbackUrl: '/' })
  }

  return (
    <div className="flex items-center gap-3">
      <div className="hidden rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white/85 md:inline-flex">
        Olá, {nomeUsuario}
      </div>

      <button
        type="button"
        onClick={handleSair}
        className="inline-flex rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow transition hover:bg-slate-100"
      >
        Sair
      </button>
    </div>
  )
}
