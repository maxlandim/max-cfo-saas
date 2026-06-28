'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState(null);

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const faqs = [
    { q: "O MAX CFO precisa conectar na minha conta bancária?", a: "Não. A plataforma funciona por upload de extratos (OFX/CSV), garantindo 100% de privacidade e segurança dos seus dados." },
    { q: "Qual a diferença entre o MAX e uma planilha comum?", a: "O MAX possui um motor de IA neural que não só organiza os números, mas fornece diagnósticos em texto livre, analisa riscos de empresas parceiras pelo CNPJ e gera conselhos executivos." },
    { q: "Posso cancelar minha assinatura a qualquer momento?", a: "Sim, sem multas ou fidelidade. O cancelamento é imediato e você mantém o acesso até o final do período já pago." },
    { q: "O sistema emite notas fiscais?", a: "O foco do MAX CFO é a inteligência gerencial e análise financeira (DRE, Caixa, Forecast). A emissão de notas deve continuar sendo feita pelo seu sistema emissor ou contador." },
    { q: "Como funciona a Análise de Empresas (CNPJ)?", a: "Integramos com os dados abertos da Receita Federal. Você digita o CNPJ, e nossa IA cruza o capital social, tempo de abertura, situação e quadro de sócios para gerar um Score de Risco." }
  ];

  return (
    <div style={{ backgroundColor: '#0a0f1e', color: '#fff', minHeight: '100vh', fontFamily: 'var(--font-inter)' }}>
      {/* Navbar */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 5%', borderBottom: '1px solid rgba(255,255,255,0.05)', backgroundColor: 'rgba(10, 15, 30, 0.8)', backdropFilter: 'blur(10px)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ background: 'linear-gradient(135deg, #6366f1, #3b82f6)', width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>⚡</div>
          <span style={{ fontSize: '18px', fontWeight: '800', letterSpacing: '-0.5px' }}>MAX CFO AI</span>
        </div>
        <div style={{ display: 'flex', gap: '30px', alignItems: 'center' }}>
          <a href="#features" style={{ color: '#a1a1aa', textDecoration: 'none', fontSize: '14px', transition: 'color 0.2s' }}>Funcionalidades</a>
          <a href="#pricing" style={{ color: '#a1a1aa', textDecoration: 'none', fontSize: '14px', transition: 'color 0.2s' }}>Preços</a>
          <a href="#faq" style={{ color: '#a1a1aa', textDecoration: 'none', fontSize: '14px', transition: 'color 0.2s' }}>FAQ</a>
          <Link href="/login" style={{ background: 'linear-gradient(135deg, #6366f1, #3b82f6)', color: '#fff', padding: '10px 24px', borderRadius: '8px', textDecoration: 'none', fontWeight: '600', fontSize: '14px', border: 'none', cursor: 'pointer', transition: 'transform 0.2s' }}>
            Entrar →
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section style={{ padding: '100px 5% 80px', textAlign: 'center', maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ display: 'inline-block', padding: '6px 16px', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: '20px', color: '#818cf8', fontSize: '13px', fontWeight: '600', marginBottom: '24px' }}>
          🚀 A Nova Era da Gestão Financeira
        </div>
        <h1 style={{ fontSize: '56px', fontWeight: '900', lineHeight: '1.1', marginBottom: '24px', letterSpacing: '-1px' }}>
          Deixe a <span style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Inteligência Artificial</span> cuidar da saúde financeira da sua empresa.
        </h1>
        <p style={{ fontSize: '20px', color: '#a1a1aa', maxWidth: '700px', margin: '0 auto 40px', lineHeight: '1.6' }}>
          Um CFO virtual que analisa seus números, gera DREs automáticos, avalia riscos de fornecedores por CNPJ e te dá conselhos executivos 24 horas por dia.
        </p>
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
          <Link href="/register" style={{ background: 'linear-gradient(135deg, #6366f1, #3b82f6)', color: '#fff', padding: '16px 36px', borderRadius: '12px', textDecoration: 'none', fontWeight: '600', fontSize: '16px', border: 'none', cursor: 'pointer', boxShadow: '0 10px 25px -5px rgba(99, 102, 241, 0.4)', transition: 'transform 0.2s' }}>
            Testar Grátis por 7 dias
          </Link>
          <a href="#demo" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '16px 36px', borderRadius: '12px', textDecoration: 'none', fontWeight: '600', fontSize: '16px', transition: 'background 0.2s' }}>
            Ver Demonstração
          </a>
        </div>
      </section>

      {/* Dashboard Mockup Placeholder */}
      <div style={{ maxWidth: '1100px', margin: '0 auto 100px', padding: '0 5%' }}>
        <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', padding: '20px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ef4444' }}></div>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#f59e0b' }}></div>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#10b981' }}></div>
          </div>
          {/* Faux Dashboard Header */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '20px' }}>
            {[
              { label: 'Receita Total', val: 'R$ 145.200', col: '#10b981' },
              { label: 'Despesas', val: 'R$ 82.400', col: '#ef4444' },
              { label: 'Lucro Líquido', val: 'R$ 62.800', col: '#3b82f6' },
              { label: 'Score CFO', val: '86/100', col: '#f59e0b' }
            ].map((k, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: '12px', color: '#a1a1aa', marginBottom: '8px' }}>{k.label}</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: k.col }}>{k.val}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <section id="features" style={{ padding: '80px 5%', background: '#080c17' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <h2 style={{ fontSize: '40px', fontWeight: '800', marginBottom: '16px' }}>Tudo que você precisa em um só lugar.</h2>
            <p style={{ color: '#a1a1aa', fontSize: '18px', maxWidth: '600px', margin: '0 auto' }}>Esqueça as planilhas complexas. O MAX automatiza as análises pesadas para você focar em crescer.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>
            {[
              { icon: '🤖', title: 'Chat com IA CFO', desc: 'Pergunte "Como corto gastos?" ou "Gere meu DRE" e receba respostas executivas baseadas nos seus números.' },
              { icon: '🏢', title: 'Radar de CNPJ', desc: 'Analise parceiros e fornecedores digitando o CNPJ. A IA gera um score de risco cruzando dados da Receita.' },
              { icon: '🔄', title: 'Conciliação OFX', desc: 'Arraste o extrato do seu banco e veja a IA categorizar centenas de transações em 1 segundo.' },
              { icon: '🔮', title: 'Simulador de Cenários', desc: 'Brinque com variáveis (e se a receita cair 10%?) e veja o impacto instantâneo no seu runway.' },
              { icon: '📄', title: 'Relatórios PDF', desc: 'Exporte DREs, Diagnósticos e Forecasts lindamente formatados para apresentar a sócios ou investidores.' },
              { icon: '📊', title: 'Módulo Oráculo', desc: 'Análises macroeconômicas que cruzam o seu setor (CNAE) com notícias e tendências globais.' }
            ].map((f, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', padding: '32px', borderRadius: '24px', transition: 'transform 0.3s, background 0.3s', cursor: 'pointer' }} onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }} onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}>
                <div style={{ fontSize: '32px', marginBottom: '20px', background: 'rgba(255,255,255,0.05)', width: '64px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '16px' }}>{f.icon}</div>
                <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '12px' }}>{f.title}</h3>
                <p style={{ color: '#a1a1aa', lineHeight: '1.6', fontSize: '15px' }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" style={{ padding: '100px 5%', textAlign: 'center' }}>
        <h2 style={{ fontSize: '40px', fontWeight: '800', marginBottom: '16px' }}>Preço simples e transparente.</h2>
        <p style={{ color: '#a1a1aa', fontSize: '18px', marginBottom: '60px' }}>Menos que um cafézinho por dia para ter um CFO trabalhando para você.</p>
        
        <div style={{ maxWidth: '400px', margin: '0 auto', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(99, 102, 241, 0.4)', borderRadius: '32px', padding: '40px', position: 'relative' }}>
          <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg, #f59e0b, #d97706)', padding: '4px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>
            Plano MAX
          </div>
          <div style={{ fontSize: '56px', fontWeight: '900', marginBottom: '8px' }}>R$ 49<span style={{ fontSize: '20px', color: '#a1a1aa', fontWeight: 'normal' }}>/mês</span></div>
          <p style={{ color: '#a1a1aa', marginBottom: '32px', fontSize: '14px' }}>Acesso ilimitado a todas as ferramentas de IA.</p>
          
          <ul style={{ textAlign: 'left', listStyle: 'none', padding: 0, margin: '0 0 40px 0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {['Chat Inteligente Ilimitado', 'Análise de CNPJs (Radar)', 'Conciliação Automática OFX', 'Simulador de Cenários', 'Exportação de DREs em PDF', 'Sem fidelidade, cancele quando quiser'].map((item, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '15px' }}>
                <span style={{ color: '#10b981' }}>✓</span> {item}
              </li>
            ))}
          </ul>
          
          <Link href="/register" style={{ display: 'block', background: '#fff', color: '#000', padding: '16px', borderRadius: '12px', textDecoration: 'none', fontWeight: '700', fontSize: '16px', transition: 'background 0.2s' }}>
            Iniciar 7 dias grátis
          </Link>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" style={{ padding: '80px 5%', background: '#080c17' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '40px', textAlign: 'center' }}>Perguntas Frequentes</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {faqs.map((faq, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', overflow: 'hidden' }}>
                <button 
                  onClick={() => toggleFaq(i)}
                  style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px', background: 'transparent', border: 'none', color: '#fff', fontSize: '16px', fontWeight: '600', cursor: 'pointer', textAlign: 'left' }}
                >
                  {faq.q}
                  <span style={{ transform: openFaq === i ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.3s' }}>↓</span>
                </button>
                {openFaq === i && (
                  <div style={{ padding: '0 24px 24px', color: '#a1a1aa', lineHeight: '1.6', fontSize: '15px' }}>
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '60px 5%', borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center', color: '#a1a1aa' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '24px' }}>
          <div style={{ background: '#6366f1', width: '24px', height: '24px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', color: '#fff' }}>⚡</div>
          <span style={{ fontSize: '16px', fontWeight: '700', color: '#fff' }}>MAX CFO AI</span>
        </div>
        <p style={{ fontSize: '14px', marginBottom: '24px' }}>© 2026 MAX CFO AI. Todos os direitos reservados.</p>
        <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', fontSize: '13px' }}>
          <a href="#" style={{ color: '#a1a1aa', textDecoration: 'none' }}>Termos de Uso</a>
          <a href="#" style={{ color: '#a1a1aa', textDecoration: 'none' }}>Privacidade</a>
          <a href="#" style={{ color: '#a1a1aa', textDecoration: 'none' }}>Contato</a>
        </div>
      </footer>
    </div>
  );
}
