'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { authFetch } from '../../lib/firebase';
import { useAuth } from '../context/AuthContext';

function SuccessContent() {
  const searchParams = useSearchParams();
  const forma = searchParams.get('forma');
  const { user, loading: carregandoLogin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [st, setSt] = useState(null);
  const [aviso, setAviso] = useState('');
  const dataBR = (d) => (d ? new Date(String(d).length === 10 ? d + 'T12:00:00-03:00' : d).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '');

  // Confere no servidor se a assinatura já foi criada no Asaas (o webhook também confirma, em segundo plano)
  useEffect(() => {
    if (carregandoLogin) return;
    if (!user) { setLoading(false); return; }
    let vivo = true, tentativas = 0;
    const conferir = async () => {
      try {
        const r = await authFetch('/api/subscription', { method: 'POST' });
        const d = await r.json().catch(() => ({}));
        if (!vivo) return;
        if (r.ok && d.motivo === 'assinatura') { setSt(d); setLoading(false); return; }
        if (++tentativas < 6) { setTimeout(conferir, 4000); return; }
        setAviso('Estamos confirmando com o Asaas. Pode levar alguns minutos; o painel libera sozinho.');
      } catch { setAviso('Estamos confirmando o pagamento. Pode levar alguns minutos.'); }
      setLoading(false);
    };
    conferir();
    return () => { vivo = false; };
  }, [user, carregandoLogin]);

  const pixBoleto = forma === 'pix_boleto' || (st && st.forma === 'pix_boleto');
  const fatura = st && st.faturaPendente;
  return (
    <div style={{ backgroundColor: '#131d30', padding: '40px', borderRadius: '16px', maxWidth: '500px', textAlign: 'center', border: '1px solid rgba(197, 160, 89, 0.3)', boxShadow: '0 12px 40px rgba(0,0,0,0.45)' }}>
      <div style={{ fontSize: '48px', marginBottom: '20px' }}>🎉</div>
      <h1 style={{ fontSize: '28px', marginBottom: '10px', color: '#E8EFF8' }}>{pixBoleto ? 'Assinatura criada!' : 'Cartão cadastrado!'}</h1>
      <p style={{ color: '#8899B0', marginBottom: '24px', lineHeight: '1.6' }}>
        {pixBoleto
          ? <>Todo {st && st.periodo === 'anual' ? 'ano' : 'mês'} o Asaas envia a cobrança para o seu e-mail, e você paga com Pix ou boleto.{fatura ? <> A primeira vence em <strong>{dataBR(fatura.vencimento)}</strong>.</> : ''}</>
          : st && st.status === 'trialing' && st.renovaEm
            ? <>Você continua no teste grátis. A primeira cobrança no cartão será em <strong>{dataBR(st.renovaEm)}</strong>. Se cancelar antes, não paga nada.</>
            : <>Sua assinatura da <strong>Landim Advisory</strong> está ativa no plano escolhido.</>}
      </p>
      {aviso && <p style={{ color: '#C5A059', marginBottom: '20px', fontSize: '14px' }}>{aviso}</p>}
      {loading ? (
        <div style={{ color: '#C5A059' }}>Confirmando...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {pixBoleto && fatura && fatura.url && <a href={fatura.url} target="_blank" rel="noopener" style={{ display: 'block', padding: '14px', backgroundColor: 'transparent', color: '#E8EFF8', border: '1px solid rgba(197,160,89,.6)', textDecoration: 'none', borderRadius: '8px', fontWeight: '700' }}>Pagar agora com Pix ou boleto</a>}
          <Link href="/dashboard" style={{ display: 'block', padding: '14px', backgroundColor: '#C5A059', color: '#0B1220', textDecoration: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '16px' }}>Acessar o painel</Link>
        </div>
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
