'use client'

import { signIn, getSession } from 'next-auth/react'
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

// ─── Logo Lesath (inline SVG — sem dependência de imagem) ──────────────────
function LogoLesath({ dark = false }: { dark?: boolean }) {
  const nameColor = dark ? '#ffffff' : '#0b1a2e'
  const tagColor  = dark ? 'rgba(255,255,255,0.45)' : '#6b7a8d'
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
      <span style={{
        fontFamily: "'Playfair Display', Georgia, serif",
        fontStyle: 'italic',
        fontWeight: 700,
        fontSize: dark ? '2rem' : '1.5rem',
        color: nameColor,
        letterSpacing: '-0.01em',
        lineHeight: 1,
      }}>
        Lesath
      </span>
      {/* Três barras — prédios */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: dark ? 32 : 24 }}>
        <div style={{ width: dark ? 5 : 4, height: '55%', background: '#1a5fd4', borderRadius: '2px 2px 0 0' }} />
        <div style={{ width: dark ? 5 : 4, height: '80%', background: '#2473f5', borderRadius: '2px 2px 0 0' }} />
        <div style={{ width: dark ? 5 : 4, height: '100%', background: '#4d9fff', borderRadius: '2px 2px 0 0' }} />
      </div>
      <span style={{
        fontFamily: "'Inter', system-ui, sans-serif",
        fontSize: dark ? '8.5px' : '7.5px',
        fontWeight: 600,
        letterSpacing: '0.18em',
        textTransform: 'uppercase' as const,
        color: tagColor,
        lineHeight: 1.1,
        paddingTop: 2,
      }}>
        Inteligência<br />Imobiliária
      </span>
    </div>
  )
}

export default function HomePage() {
  const router = useRouter()

  const [email, setEmail]           = useState('')
  const [senha, setSenha]           = useState('')
  const [lembrar, setLembrar]       = useState(true)
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [erros, setErros]           = useState<ErrosLogin>({})

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
    })

    if (resultado?.error) {
      setErros({ geral: 'E-mail ou senha inválidos.' })
      setCarregando(false)
      return
    }

    if (lembrar && typeof window !== 'undefined') {
      localStorage.setItem('lesath_login_email', email.trim())
    }

    try {
      const sessionData = await getSession()
      const perfil = (sessionData?.user as any)?.perfil
      if (perfil === 'cliente') {
        router.push('/portal')
      } else {
        router.push('/meus-laudos')
      }
      router.refresh()
    } catch {
      router.push('/meus-laudos')
      router.refresh()
    }
  }

  // ── Estilos inline (sem Tailwind para o novo layout) ──────────────────────
  const S = {
    root: {
      display: 'flex' as const,
      minHeight: '100dvh',
      fontFamily: "'Inter', system-ui, sans-serif",
    } as React.CSSProperties,

    // Painel esquerdo escuro
    panel: {
      flex: '0 0 58%',
      background: '#0b1a2e',
      position: 'relative' as const,
      display: 'flex',
      flexDirection: 'column' as const,
      justifyContent: 'space-between',
      padding: '56px 56px 48px',
      overflow: 'hidden',
    } as React.CSSProperties,

    panelGrid: {
      position: 'absolute' as const,
      inset: 0,
      backgroundImage:
        'linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px)',
      backgroundSize: '48px 48px',
      pointerEvents: 'none' as const,
    } as React.CSSProperties,

    panelGlow: {
      position: 'absolute' as const,
      inset: 0,
      background: 'radial-gradient(ellipse 70% 60% at 20% 80%,rgba(26,95,212,.18) 0%,transparent 70%)',
      pointerEvents: 'none' as const,
    } as React.CSSProperties,

    panelMiddle: {
      position: 'relative' as const,
      zIndex: 1,
      maxWidth: 420,
    } as React.CSSProperties,

    eyebrow: {
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: '0.18em',
      textTransform: 'uppercase' as const,
      color: '#4d9fff',
      marginBottom: 20,
    } as React.CSSProperties,

    panelH1: {
      fontSize: 'clamp(1.6rem, 2.6vw, 2.2rem)',
      fontWeight: 300,
      color: '#ffffff',
      lineHeight: 1.3,
      letterSpacing: '-0.01em',
      marginBottom: 0,
    } as React.CSSProperties,

    panelBottom: {
      position: 'relative' as const,
      zIndex: 1,
    } as React.CSSProperties,

    panelQuote: {
      fontSize: 12,
      fontWeight: 400,
      letterSpacing: '0.06em',
      textTransform: 'uppercase' as const,
      color: 'rgba(255,255,255,0.25)',
      margin: 0,
    } as React.CSSProperties,

    // Prédios decorativos
    buildings: {
      position: 'absolute' as const,
      bottom: 0,
      right: -20,
      opacity: 0.07,
      display: 'flex',
      alignItems: 'flex-end',
      gap: 10,
      pointerEvents: 'none' as const,
      zIndex: 0,
    } as React.CSSProperties,

    // Lado direito
    loginSide: {
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '48px 48px 48px 48px',
      background: '#f5f6f9',
    } as React.CSSProperties,

    card: {
      width: '100%',
      maxWidth: 400,
      background: '#ffffff',
      border: '1px solid #dde3ec',
      borderRadius: 20,
      padding: '44px 40px',
      boxShadow: '0 4px 32px rgba(0,0,0,.06),0 1px 4px rgba(0,0,0,.04)',
    } as React.CSSProperties,

    cardTag: {
      display: 'inline-block',
      fontSize: 10.5,
      fontWeight: 600,
      letterSpacing: '0.14em',
      textTransform: 'uppercase' as const,
      color: '#1a5fd4',
      background: '#e8f0fd',
      padding: '4px 10px',
      borderRadius: 100,
      marginBottom: 16,
    } as React.CSSProperties,

    cardH2: {
      fontSize: '1.45rem',
      fontWeight: 600,
      color: '#0b1a2e',
      lineHeight: 1.2,
      letterSpacing: '-0.02em',
      marginBottom: 8,
    } as React.CSSProperties,

    cardSub: {
      fontSize: 14,
      color: '#6b7a8d',
      lineHeight: 1.55,
      marginTop: 0,
      marginBottom: 0,
    } as React.CSSProperties,

    label: {
      display: 'block',
      fontSize: 12.5,
      fontWeight: 500,
      color: '#0b1a2e',
      marginBottom: 6,
      letterSpacing: '0.01em',
    } as React.CSSProperties,

    input: {
      width: '100%',
      background: '#f8f9fc',
      border: '1.5px solid #dde3ec',
      borderRadius: 10,
      padding: '12px 14px',
      fontFamily: "'Inter', system-ui, sans-serif",
      fontSize: 14,
      color: '#0b1a2e',
      outline: 'none',
      boxSizing: 'border-box' as const,
      transition: 'border-color .15s, box-shadow .15s',
    } as React.CSSProperties,

    inputError: {
      borderColor: '#fca5a5',
      background: '#fff5f5',
    } as React.CSSProperties,

    errorMsg: {
      fontSize: 13,
      color: '#be123c',
      marginTop: 6,
      marginBottom: 0,
    } as React.CSSProperties,

    rowBetween: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 24,
    } as React.CSSProperties,

    checkLabel: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      fontSize: 13,
      color: '#6b7a8d',
      cursor: 'pointer',
      userSelect: 'none' as const,
    } as React.CSSProperties,

    linkSm: {
      fontSize: 13,
      color: '#1a5fd4',
      fontWeight: 500,
      textDecoration: 'none',
      cursor: 'pointer',
      background: 'none',
      border: 'none',
      padding: 0,
      fontFamily: "'Inter', system-ui, sans-serif",
    } as React.CSSProperties,

    btnPrimary: {
      width: '100%',
      padding: '13px 24px',
      background: '#1a5fd4',
      color: '#fff',
      fontFamily: "'Inter', system-ui, sans-serif",
      fontSize: 14.5,
      fontWeight: 600,
      border: 'none',
      borderRadius: 10,
      cursor: 'pointer',
      letterSpacing: '0.02em',
      transition: 'background .15s',
    } as React.CSSProperties,

    footer: {
      marginTop: 20,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      fontSize: 12,
      color: '#6b7a8d',
    } as React.CSSProperties,

    geralError: {
      marginBottom: 20,
      padding: '12px 14px',
      background: '#fff5f5',
      border: '1px solid #fca5a5',
      borderRadius: 10,
      fontSize: 13,
      color: '#be123c',
    } as React.CSSProperties,

    inputWrap: {
      position: 'relative' as const,
    } as React.CSSProperties,

    showBtn: {
      position: 'absolute' as const,
      right: 10,
      top: '50%',
      transform: 'translateY(-50%)',
      background: '#fff',
      border: '1px solid #dde3ec',
      borderRadius: 6,
      padding: '3px 10px',
      fontSize: 11,
      fontWeight: 600,
      color: '#6b7a8d',
      cursor: 'pointer',
      fontFamily: "'Inter', system-ui, sans-serif",
    } as React.CSSProperties,
  }

  return (
    <div style={S.root}>

      {/* ── Painel esquerdo ── */}
      <aside style={S.panel}>
        <div style={S.panelGrid} />
        <div style={S.panelGlow} />

        {/* Logo */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <LogoLesath dark />
        </div>

        {/* Título central */}
        <div style={S.panelMiddle}>
          <p style={S.eyebrow}>Sistema de Gestão</p>
          <h1 style={S.panelH1}>Avaliações com precisão.<br />Laudos com excelência.</h1>
        </div>

        {/* Frase de efeito rodapé */}
        <div style={S.panelBottom}>
          <p style={S.panelQuote}>Transformando dados em decisões seguras.</p>
        </div>

        {/* Prédios decorativos */}
        <div style={S.buildings} aria-hidden="true">
          {[
            { w: 70, h: 200 },
            { w: 50, h: 300 },
            { w: 90, h: 360 },
            { w: 55, h: 240 },
          ].map((b, i) => (
            <div key={i} style={{
              width: b.w, height: b.h,
              background: '#fff',
              borderRadius: '2px 2px 0 0',
              position: 'relative',
            }} />
          ))}
        </div>
      </aside>

      {/* ── Painel direito — login ── */}
      <main style={S.loginSide}>
        <div style={S.card}>

          {/* Logo versão clara */}
          <div style={{ marginBottom: 28 }}>
            <LogoLesath dark={false} />
          </div>

          {/* Cabeçalho */}
          <div style={{ marginBottom: 28 }}>
            <span style={S.cardTag}>Acesso restrito</span>
            <h2 style={S.cardH2}>Área de gestão</h2>
            <p style={S.cardSub}>Entre com suas credenciais para acessar o painel interno.</p>
          </div>

          {/* Erro geral */}
          {erros.geral && (
            <div style={S.geralError}>{erros.geral}</div>
          )}

          <form onSubmit={handleSubmit}>
            {/* E-mail */}
            <div style={{ marginBottom: 16 }}>
              <label htmlFor="email" style={S.label}>E-mail</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seuemail@lesathengenharia.com.br"
                autoComplete="email"
                style={{ ...S.input, ...(erros.email ? S.inputError : {}) }}
              />
              {erros.email && <p style={S.errorMsg}>{erros.email}</p>}
            </div>

            {/* Senha */}
            <div style={{ marginBottom: 20 }}>
              <label htmlFor="senha" style={S.label}>Senha</label>
              <div style={S.inputWrap}>
                <input
                  id="senha"
                  type={mostrarSenha ? 'text' : 'password'}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="Digite sua senha"
                  autoComplete="current-password"
                  style={{ ...S.input, paddingRight: 72, ...(erros.senha ? S.inputError : {}) }}
                />
                <button
                  type="button"
                  style={S.showBtn}
                  onClick={() => setMostrarSenha((v) => !v)}
                >
                  {mostrarSenha ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
              {erros.senha && <p style={S.errorMsg}>{erros.senha}</p>}
            </div>

            {/* Lembrar + Recuperar */}
            <div style={S.rowBetween}>
              <label style={S.checkLabel}>
                <input
                  type="checkbox"
                  checked={lembrar}
                  onChange={(e) => setLembrar(e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: '#1a5fd4', margin: 0, cursor: 'pointer' }}
                />
                Manter acesso
              </label>
              <button type="button" style={S.linkSm}>Recuperar acesso</button>
            </div>

            <button
              type="submit"
              disabled={carregando}
              style={{ ...S.btnPrimary, opacity: carregando ? 0.7 : 1, cursor: carregando ? 'not-allowed' : 'pointer' }}
            >
              {carregando ? 'Validando acesso…' : 'Entrar'}
            </button>
          </form>

          {/* Rodapé do card */}
          <div style={S.footer}>
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="6" width="12" height="7.5" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M4 6V4a3 3 0 0 1 6 0v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            Conexão segura · Acesso interno da operação
          </div>
        </div>
      </main>

    </div>
  )
}
