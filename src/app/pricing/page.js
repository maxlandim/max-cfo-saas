'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function PricingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
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
        alert('Stripe não configurado (' + (data.error || 'Desconhecido') + '). Liberando acesso livre (Modo Desenvolvedor)!');
        localStorage.setItem('maxcfo_pro_status', 'active');
        router.push('/dashboard');
      }
    } catch (err) {
      console.error(err);
      alert('Stripe não configurado. Liberando acesso livre (Modo Desenvolvedor)!');
      localStorage.setItem('maxcfo_pro_status', 'active');
      router.push('/dashboard');
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
        O ERP inteligente que cresce com você. De autônomos a grandes corporações.
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '24px',
        maxWidth: '1200px',
        width: '100%'
      }}>
        
        {/* Basic Plan */}
        <div style={{
          backgroundColor: '#131d30',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '16px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <h2 style={{ fontSize: '24px', color: '#E8EFF8', marginBottom: '8px' }}>Básico</h2>
          <p style={{ color: '#8899B0', marginBottom: '24px', height: '40px', fontSize: '14px' }}>Ideal para começar com organização.</p>
          <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#fff', marginBottom: '8px' }}>
            R$ 49,90<span style={{ fontSize: '14px', color: '#8899B0', fontWeight: 'normal' }}>/mês</span>
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: '24px 0', flex: 1, color: '#E8EFF8', fontSize: '14px' }}>
            <li style={{ marginBottom: '12px' }}>✅ 1 Usuário (Admin)</li>
            <li style={{ marginBottom: '12px' }}>✅ Estoque Básico (Manual)</li>
            <li style={{ marginBottom: '12px' }}>✅ CFO IA Limitado</li>
            <li style={{ marginBottom: '12px', color: '#4a5568' }}>❌ Sem Integração Bancária</li>
            <li style={{ marginBottom: '12px', color: '#4a5568' }}>❌ Sem Emissão Fiscal</li>
          </ul>
          <button disabled={loading} onClick={() => handleSubscribe('basic')} className="plan-btn">
            {loading ? 'Processando...' : 'Assinar Básico'}
          </button>
        </div>

        {/* Intermediário Plan */}
        <div style={{
          backgroundColor: '#131d30',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '16px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <h2 style={{ fontSize: '24px', color: '#E8EFF8', marginBottom: '8px' }}>Intermediário</h2>
          <p style={{ color: '#8899B0', marginBottom: '24px', height: '40px', fontSize: '14px' }}>Para pequenas empresas em crescimento.</p>
          <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#fff', marginBottom: '8px' }}>
            R$ 129,90<span style={{ fontSize: '14px', color: '#8899B0', fontWeight: 'normal' }}>/mês</span>
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: '24px 0', flex: 1, color: '#E8EFF8', fontSize: '14px' }}>
            <li style={{ marginBottom: '12px' }}>✅ Até 3 Usuários</li>
            <li style={{ marginBottom: '12px' }}>✅ Estoque + Ordem de Serviço</li>
            <li style={{ marginBottom: '12px' }}>✅ Importação OFX/CSV</li>
            <li style={{ marginBottom: '12px' }}>✅ Trilha de Auditoria</li>
            <li style={{ marginBottom: '12px' }}>✅ CFO IA Ilimitado</li>
          </ul>
          <button disabled={loading} onClick={() => handleSubscribe('intermediate')} className="plan-btn">
            {loading ? 'Processando...' : 'Assinar Intermediário'}
          </button>
        </div>

        {/* Completo Plan */}
        <div style={{
          backgroundColor: '#1a243a',
          border: '2px solid #C5A059',
          borderRadius: '16px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative'
        }}>
          <div style={{
            position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)',
            backgroundColor: '#C5A059', color: '#0B1220', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold'
          }}>MAIS POPULAR</div>
          <h2 style={{ fontSize: '24px', color: '#E8EFF8', marginBottom: '8px' }}>Completo</h2>
          <p style={{ color: '#8899B0', marginBottom: '24px', height: '40px', fontSize: '14px' }}>Operação de ponta a ponta integrada.</p>
          <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#C5A059', marginBottom: '8px' }}>
            R$ 269,90<span style={{ fontSize: '14px', color: '#8899B0', fontWeight: 'normal' }}>/mês</span>
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: '24px 0', flex: 1, color: '#E8EFF8', fontSize: '14px' }}>
            <li style={{ marginBottom: '12px' }}>✅ Até 5 Usuários</li>
            <li style={{ marginBottom: '12px' }}>✅ Open Finance Automático</li>
            <li style={{ marginBottom: '12px' }}>✅ Emissão Fiscal + Boletos</li>
            <li style={{ marginBottom: '12px' }}>✅ Anexos e GED</li>
            <li style={{ marginBottom: '12px' }}>✅ Portal do Contador</li>
          </ul>
          <button disabled={loading} onClick={() => handleSubscribe('complete')} className="plan-btn-gold">
            {loading ? 'Processando...' : 'Assinar Completo'}
          </button>
        </div>

        {/* Unlimited Plan */}
        <div style={{
          backgroundColor: '#131d30',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '16px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <h2 style={{ fontSize: '24px', color: '#E8EFF8', marginBottom: '8px' }}>Unlimited</h2>
          <p style={{ color: '#8899B0', marginBottom: '24px', height: '40px', fontSize: '14px' }}>Escalabilidade para Holdings e BPOs.</p>
          <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#fff', marginBottom: '8px' }}>
            R$ 299,90<span style={{ fontSize: '14px', color: '#8899B0', fontWeight: 'normal' }}>/mês</span>
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: '24px 0', flex: 1, color: '#E8EFF8', fontSize: '14px' }}>
            <li style={{ marginBottom: '12px' }}>✅ Usuários Ilimitados</li>
            <li style={{ marginBottom: '12px' }}>✅ Tudo do plano Completo</li>
            <li style={{ marginBottom: '12px' }}>✅ Múltiplos CNPJs</li>
            <li style={{ marginBottom: '12px' }}>✅ Acesso à API</li>
            <li style={{ marginBottom: '12px' }}>✅ Relatórios White-label</li>
          </ul>
          <button disabled={loading} onClick={() => handleSubscribe('unlimited')} className="plan-btn">
            {loading ? 'Processando...' : 'Assinar Unlimited'}
          </button>
        </div>

      </div>

      <Link href="/success?session_id=dev" style={{ marginTop: '32px', color: '#8899B0', textDecoration: 'underline' }}>
        Acessar com Passe Livre
      </Link>

      <style dangerouslySetInnerHTML={{__html: `
        .plan-btn {
          width: 100%; padding: 14px; border-radius: 8px; border: 1px solid #C5A059; 
          background-color: transparent; color: #C5A059; font-weight: bold; cursor: pointer; transition: all 0.2s;
        }
        .plan-btn:hover { background-color: rgba(197, 160, 89, 0.1); }
        .plan-btn-gold {
          width: 100%; padding: 14px; border-radius: 8px; border: none; 
          background: linear-gradient(135deg, #C5A059, #A0823A); color: #0B1220; font-weight: bold; cursor: pointer; transition: all 0.2s;
        }
        .plan-btn-gold:hover { opacity: 0.9; transform: translateY(-1px); }
      `}} />
    </div>
  );
}
