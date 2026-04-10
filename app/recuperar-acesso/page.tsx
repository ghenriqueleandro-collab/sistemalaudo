'use client'
import { useState } from 'react'

export default function RecuperarAcesso() {
  const [email, setEmail] = useState('')
  const [enviado, setEnviado] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setEnviado(true)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-xl shadow max-w-md w-full">
        <h1 className="text-2xl font-semibold mb-4">Recuperar acesso</h1>

        {!enviado ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              placeholder="Seu e-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border px-4 py-2 rounded"
            />

            <button className="w-full bg-blue-600 text-white py-2 rounded">
              Enviar instruções
            </button>
          </form>
        ) : (
          <p className="text-green-600">
            Se o e-mail existir, você receberá instruções.
          </p>
        )}
      </div>
    </div>
  )
}
