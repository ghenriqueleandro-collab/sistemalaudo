// Logo inline — sem dependência de /logo-lesath.png

export default function BrandLogo() {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      {/* Nome em Playfair Display itálico */}
      <span style={{
        fontFamily: "'Playfair Display', Georgia, serif",
        fontStyle: 'italic',
        fontWeight: 700,
        fontSize: '1.35rem',
        color: '#ffffff',
        letterSpacing: '-0.01em',
        lineHeight: 1,
      }}>
        Lesath
      </span>

      {/* Três barras — prédios */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 22 }}>
        <div style={{ width: 4, height: '55%', background: '#93c5fd', borderRadius: '2px 2px 0 0' }} />
        <div style={{ width: 4, height: '80%', background: '#60a5fa', borderRadius: '2px 2px 0 0' }} />
        <div style={{ width: 4, height: '100%', background: '#3b82f6', borderRadius: '2px 2px 0 0' }} />
      </div>

      {/* Tagline */}
      <span style={{
        fontFamily: "'Inter', system-ui, sans-serif",
        fontSize: '7px',
        fontWeight: 600,
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
        color: 'rgba(255,255,255,0.45)',
        lineHeight: 1.15,
        paddingTop: 2,
      }}>
        Inteligência<br />Imobiliária
      </span>
    </div>
  )
}
