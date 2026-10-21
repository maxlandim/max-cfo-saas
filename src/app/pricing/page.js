'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authFetch } from '../../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { CardsPlanos, INCLUSO, ESTILO_PLANOS } from '../components/Planos';

export default function PricingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  const handleSubscribe = async (planId) => {
    setErro('');
    if (!user) {
      router.push('/register');
      return;
    }
    setLoading(true);
    try {
      const res = await authFetch('/api/checkout', { method: 'POST', body: JSON.stringify({ planId }) });
      const data = await res.json().catch(() => ({}));
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setErro(data.error || 'Não foi possível abrir o pagamento agora. Tente de novo em instantes.');
    } catch (err) {
      console.error(err);
      setErro('Sem conexão com o servidor. Verifique a internet e tente de novo.');
    }
    setLoading(false);
  };

  const abrirPortal = async () => {
    setErro('');
    setLoading(true);
    try {
      const res = await authFetch('/api/portal', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (data.url) { window.location.href = data.url; return; }
      setErro(data.error || 'Não foi possível abrir o portal agora.');
    } catch {
      setErro('Sem conexão com o servidor. Verifique a internet e tente de novo.');
    }
    setLoading(false);
  };

  return (
    <div className="pr">
      <style dangerouslySetInnerHTML={{ __html: ESTILO_PLANOS + ESTILO }} />
      <header className="pr-topo">
        <Link href="/" className="pr-marca"><span className="pr-logo">LA</span>Landim Advisory</Link>
        {user ? <Link href="/dashboard" className="pr-link">Voltar ao painel</Link> : <Link href="/login" className="pr-link">Entrar</Link>}
      </header>

      <main className="pr-main">
        <h1>Escolha o seu plano</h1>
        <p className="pr-sub">Cada plano soma recursos ao anterior. No teste grátis você usa tudo para conhecer.</p>
        <p className="pr-teste">{user ? 'Pagamento mensal no cartão. Cancele quando quiser.' : '7 dias grátis, sem cartão. Cancele quando quiser.'}</p>
        {erro && <div role="alert" className="pr-erro">{erro}</div>}

        <CardsPlanos onEscolher={handleSubscribe} carregando={loading} textoBotao={(p) => (user ? 'Assinar ' + p.nome : 'Começar grátis')} />

        <div className="pr-incluso">
          <div className="pr-incluso-t">Em todos os planos</div>
          <ul>{INCLUSO.map((i) => <li key={i}>{i}</li>)}</ul>
        </div>

        <div className="pr-acoes">
          {user && <Link href="/dashboard" className="pr-link">Continuar no teste grátis</Link>}
          {user && (
            <button type="button" onClick={abrirPortal} disabled={loading} className="pr-link pr-botao-link">
              Já sou assinante: gerenciar assinatura
            </button>
          )}
          <a href="https://wa.me/5561992105889?text=Ol%C3%A1!%20Tenho%20uma%20d%C3%BAvida%20sobre%20os%20planos%20do%20MAX%20CFO%20AI." target="_blank" rel="noopener" className="pr-link">Dúvidas? Fale no WhatsApp</a>
        </div>
        <p className="pr-legal">
          Ao assinar, você concorda com os <Link href="/termos">Termos de Uso</Link> e a <Link href="/privacidade">Política de Privacidade</Link>. Pagamento mensal no cartão pelo Stripe, renovação automática e cancelamento a qualquer momento, sem multa.
        </p>
      </main>
    </div>
  );
}

const ESTILO = `
.pr{min-height:100vh;background:#FAFAF8;color:#0B1220;font-family:var(--font-inter),Inter,system-ui,sans-serif}
.pr a{text-decoration:none}
.pr-topo{max-width:1160px;margin:0 auto;padding:18px 20px;display:flex;align-items:center;justify-content:space-between}
.pr-marca{display:flex;align-items:center;gap:9px;font-weight:900;font-size:17px;color:#0B1220}
.pr-logo{width:34px;height:34px;border-radius:9px;background:#0B1220;color:#C5A059;display:inline-flex;align-items:center;justify-content:center;font-size:13px;font-weight:900}
.pr-main{max-width:1160px;margin:0 auto;padding:20px 20px 60px;text-align:center}
.pr h1{font-size:40px;font-weight:900;letter-spacing:-.02em;margin:10px 0 10px}
.pr-sub{color:#4B5565;font-size:17px;margin:0 auto 6px;max-width:620px}
.pr-teste{color:#7A5A12;font-weight:800;margin:0 0 34px}
.pr-erro{background:#FEF2F2;color:#B91C1C;border:1px solid #FECACA;padding:12px 16px;border-radius:10px;max-width:620px;margin:0 auto 24px;font-size:14px}
.pr-incluso{margin-top:28px;background:#fff;border:1px solid #E3E6EC;border-radius:18px;padding:22px 26px;text-align:left}
.pr-incluso-t{font-weight:800;margin-bottom:10px}
.pr-incluso ul{list-style:none;padding:0;margin:0;columns:3 240px;column-gap:28px}
.pr-incluso li{padding:5px 0 5px 22px;position:relative;font-size:14.5px;color:#1E2533;break-inside:avoid}
.pr-incluso li:before{content:'✓';position:absolute;left:0;color:#0E9F6E;font-weight:900}
.pr-acoes{margin-top:26px;display:flex;gap:22px;justify-content:center;flex-wrap:wrap}
.pr-link{color:#0B1220;font-weight:700;font-size:14.5px;text-decoration:underline!important;text-underline-offset:3px}
.pr-botao-link{background:none;border:0;cursor:pointer;font:inherit;font-weight:700;padding:0}
.pr-legal{margin:18px auto 0;color:#6B7486;font-size:12.5px;max-width:600px}
.pr-legal a{color:#4B5565;text-decoration:underline}
@media (max-width:640px){.pr h1{font-size:30px}}
`;
