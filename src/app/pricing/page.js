'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function PricingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    // Recupera o email do usuario para repassar ao Stripe
    const user = JSON.parse(localStorage.getItem('maxcfo_user') || '{}');
    if (user.email) setUserEmail(user.email);
  }, []);

  const handleSubscribe = async (planId) => {
    setLoading(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, planId })
      });
      
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert('Erro ao iniciar o checkout: ' + (data.error || 'Desconhecido'));
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao comunicar com o servidor de pagamentos.');
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0a0f1e',
      color: '#fff',
      fontFamily: 'var(--font-inter)',
      padding: '40px 20px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    }}>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '40px' }}>
        <div style={{ background: '#C5A059', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', color: '#0B1220' }}>⚡</div>
        <span style={{ fontSize: '20px', fontWeight: '800', color: '#fff' }}>MAX CFO AI</span>
      </div>

      <h1 style={{ fontSize: '36px', marginBottom: '16px', textAlign: 'center' }}>Escolha o plano ideal para sua empresa</h1>
      <p style={{ color: '#8899B0', marginBottom: '40px', fontSize: '18px', textAlign: 'center', maxWidth: '600px' }}>
        Desbloqueie o acesso completo ao dashboard financeiro mais inteligente do mercado. Todos os planos incluem 7 dias grátis.
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '24px',
        maxWidth: '1000px',
        width: '100%'
      }}>
        
        {/* Basic Plan */}
        <div style={{
          backgroundColor: '#131d30',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '16px',
          padding: '32px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <h2 style={{ fontSize: '24px', color: '#E8EFF8', marginBottom: '8px' }}>Básico</h2>
          <p style={{ color: '#8899B0', marginBottom: '24px', height: '48px' }}>Ideal para autônomos e MEIs que precisam de organização.</p>
          <div style={{ fontSize: '40px', fontWeight: 'bold', color: '#fff', marginBottom: '8px' }}>
            R$ 49<span style={{ fontSize: '16px', color: '#8899B0', fontWeight: 'normal' }}>/mês</span>
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: '24px 0', flex: 1, color: '#E8EFF8' }}>
            <li style={{ marginBottom: '12px' }}>✅ Controle Financeiro</li>
            <li style={{ marginBottom: '12px' }}>✅ Relatórios Básicos</li>
            <li style={{ marginBottom: '12px' }}>✅ 1 Usuário</li>
            <li style={{ marginBottom: '12px', color: '#4a5568' }}>❌ OCR Mágico</li>
            <li style={{ marginBottom: '12px', color: '#4a5568' }}>❌ Chat IA Avançado</li>
          </ul>
          <button 
            disabled={loading}
            onClick={() => handleSubscribe('basic')}
            style={{
              width: '100%', padding: '14px', borderRadius: '8px', border: '1px solid #C5A059', 
              backgroundColor: 'transparent', color: '#C5A059', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s'
            }}
          >
            {loading ? 'Processando...' : 'Começar Teste Grátis'}
          </button>
        </div>

        {/* Medium Plan */}
        <div style={{
          backgroundColor: '#1a243a',
          border: '2px solid #C5A059',
          borderRadius: '16px',
          padding: '32px',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative'
        }}>
          <div style={{
            position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)',
            backgroundColor: '#C5A059', color: '#0B1220', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold'
          }}>
            MAIS POPULAR
          </div>
          <h2 style={{ fontSize: '24px', color: '#E8EFF8', marginBottom: '8px' }}>Pro</h2>
          <p style={{ color: '#8899B0', marginBottom: '24px', height: '48px' }}>Para pequenas empresas com foco em crescimento.</p>
          <div style={{ fontSize: '40px', fontWeight: 'bold', color: '#C5A059', marginBottom: '8px' }}>
            R$ 99<span style={{ fontSize: '16px', color: '#8899B0', fontWeight: 'normal' }}>/mês</span>
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: '24px 0', flex: 1, color: '#E8EFF8' }}>
            <li style={{ marginBottom: '12px' }}>✅ Tudo do plano Básico</li>
            <li style={{ marginBottom: '12px' }}>✅ OCR Mágico Ilimitado</li>
            <li style={{ marginBottom: '12px' }}>✅ Chat IA (CFO Virtual)</li>
            <li style={{ marginBottom: '12px' }}>✅ 5 Usuários</li>
            <li style={{ marginBottom: '12px', color: '#4a5568' }}>❌ Portal do Contador</li>
          </ul>
          <button 
            disabled={loading}
            onClick={() => handleSubscribe('medium')}
            style={{
              width: '100%', padding: '14px', borderRadius: '8px', border: 'none', 
              background: 'linear-gradient(135deg, #C5A059, #A0823A)', color: '#0B1220', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s'
            }}
          >
            {loading ? 'Processando...' : 'Começar Teste Grátis'}
          </button>
        </div>

        {/* Ultimate Plan */}
        <div style={{
          backgroundColor: '#131d30',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '16px',
          padding: '32px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <h2 style={{ fontSize: '24px', color: '#E8EFF8', marginBottom: '8px' }}>Ultimate</h2>
          <p style={{ color: '#8899B0', marginBottom: '24px', height: '48px' }}>Solução definitiva para empresas estruturadas.</p>
          <div style={{ fontSize: '40px', fontWeight: 'bold', color: '#fff', marginBottom: '8px' }}>
            R$ 199<span style={{ fontSize: '16px', color: '#8899B0', fontWeight: 'normal' }}>/mês</span>
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: '24px 0', flex: 1, color: '#E8EFF8' }}>
            <li style={{ marginBottom: '12px' }}>✅ Tudo do plano Pro</li>
            <li style={{ marginBottom: '12px' }}>✅ Portal do Contador</li>
            <li style={{ marginBottom: '12px' }}>✅ Open Finance VIP</li>
            <li style={{ marginBottom: '12px' }}>✅ Usuários Ilimitados</li>
            <li style={{ marginBottom: '12px' }}>✅ Suporte Prioritário</li>
          </ul>
          <button 
            disabled={loading}
            onClick={() => handleSubscribe('ultimate')}
            style={{
              width: '100%', padding: '14px', borderRadius: '8px', border: '1px solid #C5A059', 
              backgroundColor: 'transparent', color: '#C5A059', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s'
            }}
          >
            {loading ? 'Processando...' : 'Começar Teste Grátis'}
          </button>
        </div>

      </div>

      <Link href="/dashboard" style={{ marginTop: '32px', color: '#8899B0', textDecoration: 'underline' }}>
        Voltar para o Dashboard
      </Link>
    </div>
  );
}
