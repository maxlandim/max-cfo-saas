'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState(null);

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const faqs = [
    { q: "O MAX CFO precisa conectar na minha conta bancária?", a: "Não. Você importa o extrato do banco (OFX ou CSV) quando quiser. O sistema reconhece o que já foi lançado, dá baixa nas contas em aberto e sugere a categoria do resto." },
    { q: "Qual a diferença para o Conta Azul ou o Omie?", a: "O MAX CFO junta o financeiro completo (contas, fluxo de caixa, DRE, conciliação e cobrança por Pix) com um CFO de IA que lê boletos e explica os números, o simulador da reforma tributária e o painel multiempresas para BPO, a partir de R$ 49,90 por mês." },
    { q: "Posso cancelar minha assinatura a qualquer momento?", a: "Sim, sem multas ou fidelidade. Você mantém o acesso até o final do período já pago." },
    { q: "O sistema emite notas fiscais?", a: "Ainda não diretamente. Você emite a NFS-e no Emissor Nacional (o padrão nacional é obrigatório para ME e EPP do Simples a partir de 01/11/2026) e registra a nota no MAX CFO, que cria a conta a receber e soma o faturamento de 12 meses. A emissão integrada está em desenvolvimento." },
    { q: "Como funciona a cobrança por Pix?", a: "Você cadastra a sua chave Pix uma vez. Em cada conta a receber, o MAX CFO gera o QR Code e o Pix copia e cola com o valor certo e monta a mensagem de cobrança para enviar pelo WhatsApp. O dinheiro cai direto na sua conta, sem taxa nossa." }
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
          Contas a pagar e receber, fluxo de caixa de 90 dias, DRE real, cobrança por Pix no WhatsApp e um CFO com IA que lê seus boletos e explica seus números. Para PMEs e para quem faz BPO financeiro de várias empresas.
        </p>
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
          <Link href="/register" style={{ background: 'linear-gradient(135deg, #6366f1, #3b82f6)', color: '#fff', padding: '16px 36px', borderRadius: '12px', textDecoration: 'none', fontWeight: '600', fontSize: '16px', border: 'none', cursor: 'pointer', boxShadow: '0 10px 25px -5px rgba(99, 102, 241, 0.4)', transition: 'transform 0.2s' }}>
            Testar Grátis por 7 dias
          </Link>
          <a href="/pricing" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '16px 36px', borderRadius: '12px', textDecoration: 'none', fontWeight: '600', fontSize: '16px', transition: 'background 0.2s' }}>
            Ver planos
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
              { icon: '📅', title: 'Contas a pagar e receber', desc: 'Vencimentos, parcelas, contas recorrentes e baixa em um clique. Os atrasados aparecem antes de virar problema.' },
              { icon: '💠', title: 'Cobrança por Pix e WhatsApp', desc: 'QR Code e Pix copia e cola gerados com a sua chave, sem tarifa por boleto. A mensagem de cobrança já sai pronta no WhatsApp do cliente.' },
              { icon: '🌊', title: 'Fluxo de caixa de 90 dias', desc: 'Saldo real das contas e projeção dia a dia. O sistema avisa a data em que o caixa ficaria negativo.' },
              { icon: '📊', title: 'DRE gerencial de verdade', desc: 'Mês a mês, por competência ou por caixa, calculado dos seus lançamentos. Margens, ponto de equilíbrio e runway sem chute.' },
              { icon: '🔄', title: 'Conciliação que aprende', desc: 'Importe o extrato OFX ou CSV: o que já foi lançado é reconhecido, as contas em aberto recebem baixa e as categorias são sugeridas.' },
              { icon: '📷', title: 'Boleto e nota lidos por IA', desc: 'Tire foto do boleto, da nota ou do recibo. A IA preenche valor, vencimento e fornecedor; você só confere.' },
              { icon: '🏢', title: 'Multiempresas para BPO', desc: 'Cuide de vários CNPJs no mesmo login, com dados separados e um painel com o caixa e os vencidos de todos os clientes.' },
              { icon: '⚖️', title: 'Simulador tributário e da reforma', desc: 'Simples, Presumido e Real com Fator R, e a transição da CBS e do IBS de 2026 a 2033.' },
              { icon: '🤖', title: 'CFO IA com os seus números', desc: 'Pergunte "como está meu caixa?" ou "onde cortar custos?" e receba a resposta a partir dos dados reais da empresa.' }
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
          <div style={{ fontSize: '14px', color: '#a1a1aa', marginBottom: '4px' }}>a partir de</div>
          <div style={{ fontSize: '56px', fontWeight: '900', marginBottom: '8px' }}>R$ 49,90<span style={{ fontSize: '20px', color: '#a1a1aa', fontWeight: 'normal' }}>/mês</span></div>
          <p style={{ color: '#a1a1aa', marginBottom: '32px', fontSize: '14px' }}>7 dias grátis, sem cartão. <Link href="/pricing" style={{ color: '#a1a1aa' }}>Ver todos os planos</Link></p>
          
          <ul style={{ textAlign: 'left', listStyle: 'none', padding: 0, margin: '0 0 40px 0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {['Contas a pagar e receber com parcelas', 'Fluxo de caixa de 90 dias e DRE', 'Cobrança por Pix e WhatsApp', 'Conciliação de extrato OFX/CSV', 'Leitura de boletos com IA e CFO IA', 'Simulador Tributário e Reforma 2026–2033', 'Sem fidelidade, cancele quando quiser'].map((item, i) => (
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
          <Link href="/termos" style={{ color: '#a1a1aa', textDecoration: 'none' }}>Termos de Uso</Link>
          <Link href="/privacidade" style={{ color: '#a1a1aa', textDecoration: 'none' }}>Privacidade</Link>
          <a href="https://wa.me/5561992105889?text=Ol%C3%A1!%20Quero%20saber%20mais%20sobre%20o%20MAX%20CFO%20AI." target="_blank" rel="noopener" style={{ color: '#a1a1aa', textDecoration: 'none' }}>Contato</a>
        </div>
      </footer>
    </div>
  );
}
