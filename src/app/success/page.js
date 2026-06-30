'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionId) {
      localStorage.setItem('maxcfo_pro_status', 'active');
      localStorage.setItem('maxcfo_stripe_session', sessionId);
    }
    setLoading(false);
  }, [sessionId]);

  return (
    <div style={{
      backgroundColor: '#131d30',
      padding: '40px',
      borderRadius: '16px',
      maxWidth: '500px',
      textAlign: 'center',
      border: '1px solid rgba(197, 160, 89, 0.3)',
      boxShadow: '0 12px 40px rgba(0,0,0,0.45)'
    }}>
      <div style={{ fontSize: '48px', marginBottom: '20px' }}>⚡🎉</div>
      <h1 style={{ fontSize: '28px', marginBottom: '10px', color: '#E8EFF8' }}>Assinatura Confirmada!</h1>
      <p style={{ color: '#8899B0', marginBottom: '30px', lineHeight: '1.6' }}>
        Parabéns! Seu pagamento via Stripe foi processado com sucesso.
        Agora você tem acesso total ao <strong>MAX CFO AI</strong>.
      </p>

      {loading ? (
        <div style={{ color: '#C5A059' }}>Validando pagamento...</div>
      ) : (
        <Link href="/login" style={{
          display: 'inline-block',
          width: '100%',
          padding: '14px',
          backgroundColor: '#C5A059',
          color: '#0B1220',
          textDecoration: 'none',
          borderRadius: '8px',
          fontWeight: '700',
          fontSize: '16px',
          transition: 'all 0.2s',
        }}>
          Acessar o Dashboard
        </Link>
      )}
    </div>
  );
}

export default function SuccessPage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#0a0f1e',
      color: '#fff',
      padding: '20px',
      fontFamily: 'var(--font-inter)'
    }}>
      <Suspense fallback={<div style={{ color: '#C5A059' }}>Carregando...</div>}>
        <SuccessContent />
      </Suspense>
    </div>
  );
}
