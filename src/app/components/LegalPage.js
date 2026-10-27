import Link from 'next/link';
import DadosEmpresa from './DadosEmpresa';

// Página de texto legal no visual escuro da Landim Advisory.
export default function LegalPage({ titulo, atualizado, children }) {
  return (
    <div style={{ minHeight: '100vh', background: '#0a0f1e', color: '#E8EFF8', padding: '48px 20px', fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
      <main style={{ maxWidth: 760, margin: '0 auto', lineHeight: 1.7, fontSize: 15 }}>
        <Link href="/" style={{ color: '#C5A059', textDecoration: 'none', fontWeight: 700 }}>Landim Advisory</Link>
        <h1 style={{ fontSize: 32, margin: '24px 0 4px', lineHeight: 1.2 }}>{titulo}</h1>
        <p style={{ color: '#8899B0', marginBottom: 32, fontSize: 13 }}>Última atualização: {atualizado}</p>
        <div className="legal">{children}</div>
        <p style={{ marginTop: 48, color: '#8899B0', fontSize: 13 }}>
          <Link href="/termos" style={{ color: '#8899B0' }}>Termos de Uso</Link> · <Link href="/privacidade" style={{ color: '#8899B0' }}>Política de Privacidade</Link> · <Link href="/" style={{ color: '#8899B0' }}>Início</Link>
        </p>
        <DadosEmpresa cor="#8899B0" style={{ marginTop: 8 }} />
      </main>
      <style>{`
        .legal h2 { font-size: 19px; margin: 32px 0 8px; color: #fff; }
        .legal p, .legal li { color: #C9D3E3; }
        .legal ul { padding-left: 20px; }
        .legal a { color: #C5A059; }
        .legal .pendente { background: rgba(197,160,89,.15); color: #C5A059; padding: 0 4px; border-radius: 4px; }
      `}</style>
    </div>
  );
}
