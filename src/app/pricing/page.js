'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authFetch } from '../../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { CardsPlanos, INCLUSO, ESTILO_PLANOS, PLANOS_VITRINE } from '../components/Planos';

export default function PricingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  // Plano escolhido esperando a forma de pagamento (cartão ou Pix/boleto)
  const [escolha, setEscolha] = useState(null);

  const handleSubscribe = (planId, periodo) => {
    setErro('');
    if (!user) {
      router.push('/register');
      return;
    }
    setEscolha({ planId, periodo });
  };

  useEffect(() => {
    if (!escolha) return;
    const fechar = (e) => { if (e.key === 'Escape') setEscolha(null); };
    window.addEventListener('keydown', fechar);
    return () => window.removeEventListener('keydown', fechar);
  }, [escolha]);

  const pagar = async (forma) => {
    const { planId, periodo } = escolha;
    setEscolha(null);
    setLoading(true);
    try {
      const res = await authFetch('/api/checkout', { method: 'POST', body: JSON.stringify({ planId, periodo, forma }) });
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
        <Link href="/" className="pr-marca"><img src="/logo.svg" alt="" className="pr-logo" width="34" height="34" />Landim Advisory</Link>
        {user ? <Link href="/dashboard" className="pr-link">Voltar ao painel</Link> : <Link href="/login" className="pr-link">Entrar</Link>}
      </header>

      <main className="pr-main">
        <h1>Escolha o seu plano</h1>
        <p className="pr-sub">Cada plano soma recursos ao anterior. No teste grátis você usa tudo para conhecer.</p>
        <p className="pr-teste">{user ? 'Pague no cartão, no Pix ou no boleto. Assinando durante o teste, você não perde os dias grátis: o período pago só começa quando os 7 dias acabarem.' : '7 dias grátis, sem cartão. Cancele quando quiser.'}</p>
        {erro && <div role="alert" className="pr-erro">{erro}</div>}

        <CardsPlanos onEscolher={handleSubscribe} carregando={loading} textoBotao={(p) => (user ? 'Assinar ' + p.nome : 'Começar grátis')} />

        {escolha && (
          <div className="pr-modal" role="dialog" aria-modal="true" aria-labelledby="pr-modal-t" onClick={(e) => { if (e.target === e.currentTarget) setEscolha(null); }}>
            <div className="pr-modal-caixa">
              <button type="button" className="pr-modal-x" aria-label="Fechar" onClick={() => setEscolha(null)}>×</button>
              <h2 id="pr-modal-t">Como prefere pagar?</h2>
              <p className="pr-modal-sub">Plano {(PLANOS_VITRINE.find((p) => p.id === escolha.planId) || {}).nome} · {escolha.periodo === 'anual' ? 'anual (12 meses pelo preço de 10)' : 'mensal'}</p>
              <button type="button" className="pr-forma" onClick={() => pagar('cartao')}>
                <span className="pr-forma-ic" aria-hidden="true">💳</span>
                <span><b>Cartão de crédito</b><small>Renova sozinho {escolha.periodo === 'anual' ? 'todo ano' : 'todo mês'}. Assinando no teste grátis, a 1ª cobrança só acontece quando ele acabar. Cancele quando quiser.</small></span>
              </button>
              <button type="button" className="pr-forma" onClick={() => pagar('avulso')}>
                <span className="pr-forma-ic" aria-hidden="true">⚡</span>
                <span><b>Pix ou boleto</b><small>Você paga {escolha.periodo === 'anual' ? '12 meses' : '1 mês'} de uma vez, sem renovação automática. Avisamos antes de vencer para renovar. Pago no teste grátis, o período só começa quando ele acabar.</small></span>
              </button>
              <p className="pr-modal-nota">O Pix libera na hora. O boleto libera quando o banco confirmar, em até 1 dia útil.</p>
            </div>
          </div>
        )}

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
          Ao assinar, você concorda com os <Link href="/termos">Termos de Uso</Link> e a <Link href="/privacidade">Política de Privacidade</Link>. Pagamento pelo Stripe: no cartão, com renovação automática e cancelamento a qualquer momento, sem multa; ou no Pix e no boleto, por período, sem renovação automática.
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
.pr-logo{width:34px;height:34px;border-radius:9px;display:block}
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
.pr-modal{position:fixed;inset:0;background:rgba(11,18,32,.55);z-index:50;display:flex;align-items:center;justify-content:center;padding:16px}
.pr-modal-caixa{position:relative;background:#fff;border-radius:18px;max-width:460px;width:100%;padding:26px 22px 20px;text-align:left;box-shadow:0 20px 60px rgba(0,0,0,.3)}
.pr-modal-caixa h2{margin:0 0 4px;font-size:22px;font-weight:900}
.pr-modal-sub{margin:0 0 16px;color:#5B6474;font-size:14px}
.pr-modal-x{position:absolute;top:8px;right:10px;border:0;background:none;font-size:28px;line-height:1;color:#5B6474;cursor:pointer;width:44px;height:44px}
.pr-forma{display:flex;gap:14px;align-items:flex-start;width:100%;text-align:left;background:#fff;border:1.5px solid #E3E6EC;border-radius:14px;padding:14px 16px;margin-bottom:10px;cursor:pointer;font:inherit;color:#0B1220}
.pr-forma:hover,.pr-forma:focus-visible{border-color:#C5A059;background:#FBF8F1;outline:none}
.pr-forma b{display:block;font-size:16px;margin-bottom:3px}
.pr-forma small{display:block;color:#4B5565;font-size:13.5px;line-height:1.45}
.pr-forma-ic{font-size:24px;line-height:1.2}
.pr-modal-nota{margin:6px 0 0;color:#6B7486;font-size:12.5px}
@media (max-width:640px){.pr h1{font-size:30px}}
`;
