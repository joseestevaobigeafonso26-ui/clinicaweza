export default function NotFound() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: '4rem', fontWeight: 'bold', color: '#059669' }}>404</h1>
      <p style={{ color: '#64748b' }}>Página não encontrada</p>
      <a href="/" style={{ marginTop: '1rem', color: '#059669', textDecoration: 'underline' }}>Voltar ao início</a>
    </div>
  )
}
