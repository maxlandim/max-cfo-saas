'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { authFetch } from '../../lib/firebase';
import { useAuth } from '../context/AuthContext';

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const { user, loading: carregandoLogin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [aviso, setAviso] = useState('');
  const [primeiraCobranca, setPrimeiraCobranca] = useState('');
  const [acessoAte, setAcessoAte] = useState('');

  // Confirma o pagamento no servidor (o webhook do Stripe também confirma, em segundo plano)
  useEffect(() => {
    if (carregandoLogin) return;
    if (!user || !sessionId) { setLoading(false); return; }
    (async () => {
      try {
        const r = await authFetch('/api/subscription', { method: 'POST', body: JSON.stringify({ sessionId }) });
        const d = await r.json().catch(() => ({}));
        if (!r.ok) setAviso(d.error || 'Estamos confirmando o pagamento. Pode levar alguns minutos.');
        else if (d.pagamento === 'avulso_pago' && d.pagoAte) setAcessoAte(new Date(d.pagoAte).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }));
        else if (d.pagamento === 'avulso_pendente') setAviso('Recebemos o pedido. Assim que o pagamento for confirmado, o acesso é liberado sozinho.');
        else if (d.status === 'trialing' && d.renovaEm) setPrimeiraCobranca(new Date(d.renovaEm).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }));
      } catch {
        setAviso('Estamos confirmando o pagamento. Pode levar alguns minutos.');
      }
      setLoading(false);
    })();
  }, [user, carregandoLogin, sessionId]);

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
      <h1 style={{ fontSize: '28px', marginBottom: '10px', color: '#E8EFF8' }}>{acessoAte ? 'Pagamento confirmado!' : 'Assinatura confirmada!'}</h1>
      <p style={{ color: '#8899B0', marginBottom: '30px', lineHeight: '1.6' }}>
        {acessoAte
          ? <>Pagamento recebido! Seu acesso está liberado até <strong>{acessoAte}</strong>. Alguns dias antes, avisamos para você renovar com Pix ou boleto.</>
          : primeiraCobranca
          ? <>Seu cartão foi cadastrado e você continua no teste grátis. A primeira cobrança será em <strong>{primeiraCobranca}</strong>. Se cancelar antes, não paga nada.</>
          : <>Parabéns! Seu pagamento foi recebido. Agora você tem acesso ao <strong>Landim Advisory</strong> no plano escolhido.</>}
      </p>

      {aviso && <p style={{ color: '#C5A059', marginBottom: '20px', fontSize: '14px' }}>{aviso}</p>}
      {loading ? (
        <div style={{ color: '#C5A059' }}>Validando pagamento...</div>
      ) : (
        <Link href="/dashboard" style={{
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
