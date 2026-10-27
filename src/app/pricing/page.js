'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authFetch } from '../../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { CardsPlanos, INCLUSO, ESTILO_PLANOS, PLANOS_VITRINE } from '../components/Planos';
import SeletorIdioma from '../components/SeletorIdioma';

const digitos = (v) => String(v || '').replace(/\D/g, '');
// Máscara de CPF (000.000.000-00) ou CNPJ (00.000.000/0000-00)
function mascara(v) {
  const d = digitos(v).slice(0, 14);
  if (d.length <= 11) return d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  return d.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2');
}

export default function PricingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  // Plano escolhido esperando a forma de pagamento e os dados de cobrança
  const [escolha, setEscolha] = useState(null);
  const [forma, setForma] = useState('cartao');
  const [nome, setNome] = useState('');
  const [documento, setDocumento] = useState('');
  const [erroModal, setErroModal] = useState('');
  const [minha, setMinha] = useState(null);

  // Preenche nome e CPF/CNPJ já usados antes e descobre se já existe assinatura
  useEffect(() => {
    if (!user) return;
    let vivo = true;
    authFetch('/api/assinatura').then((r) => (r.ok ? r.json() : null)).then((d) => {
      if (!vivo || !d) return;
      setMinha(d);
      if (d.nome) setNome(d.nome);
      if (d.documento) setDocumento(mascara(d.documento));
    }).catch(() => {});
    return () => { vivo = false; };
  }, [user]);

  const handleSubscribe = (planId, periodo) => {
    setErro('');
    if (!user) {
      router.push('/register');
      return;
    }
    if (!nome && user.displayName) setNome(user.displayName);
    setErroModal('');
    setEscolha({ planId, periodo });
  };

  useEffect(() => {
    if (!escolha) return;
    const fechar = (e) => { if (e.key === 'Escape') setEscolha(null); };
    window.addEventListener('keydown', fechar);
    return () => window.removeEventListener('keydown', fechar);
  }, [escolha]);

  const pagar = async (e) => {
    e.preventDefault();
    const d = digitos(documento);
    if (nome.trim().length < 3) { setErroModal('Informe o nome completo ou a razão social.'); return; }
    if (d.length !== 11 && d.length !== 14) { setErroModal('Informe um CPF (11 números) ou CNPJ (14 números).'); return; }
    const { planId, periodo } = escolha;
    setErroModal('');
    setLoading(true);
    try {
      const res = await authFetch('/api/checkout', { method: 'POST', body: JSON.stringify({ planId, periodo, forma, nome: nome.trim(), documento: d }) });
      const data = await res.json().catch(() => ({}));
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setErroModal(data.error || 'Não foi possível abrir o pagamento agora. Tente de novo em instantes.');
    } catch (err) {
      console.error(err);
      setErroModal('Sem conexão com o servidor. Verifique a internet e tente de novo.');
    }
    setLoading(false);
  };

  const plano = escolha ? PLANOS_VITRINE.find((p) => p.id === escolha.planId) || {} : {};

  return (
    <div className="pr">
      <style dangerouslySetInnerHTML={{ __html: ESTILO_PLANOS + ESTILO }} />
      <header className="pr-topo">
        <Link href="/" className="pr-marca"><img src="/logo.svg" alt="" className="pr-logo" width="34" height="34" />Landim Advisory</Link>
        <span style={{ display: 'flex', alignItems: 'center', gap: 14 }}><SeletorIdioma />{user ? <Link href="/dashboard" className="pr-link">Voltar ao painel</Link> : <Link href="/login" className="pr-link">Entrar</Link>}</span>
      </header>

      <main className="pr-main">
        <h1>Escolha o seu plano</h1>
        <p className="pr-sub">Cada plano soma recursos ao anterior. No teste grátis você usa tudo para conhecer.</p>
        <p className="pr-teste">{user ? 'Pague no cartão, no Pix ou no boleto. Assinando durante o teste, você não perde os dias grátis: a primeira cobrança só vence quando os 7 dias acabarem.' : '7 dias grátis, sem cartão. Cancele quando quiser.'}</p>
        {minha && minha.ativa && <div className="pr-aviso">Você já tem uma assinatura. Escolher outro plano ou outra forma de pagamento troca a assinatura atual, sem perder o período já pago. <Link href="/assinatura">Ver minha assinatura</Link></div>}
        {erro && <div role="alert" className="pr-erro">{erro}</div>}

        <CardsPlanos onEscolher={handleSubscribe} carregando={loading} textoBotao={(p) => (user ? 'Assinar ' + p.nome : 'Começar grátis')} />

        {escolha && (
          <div className="pr-modal" role="dialog" aria-modal="true" aria-labelledby="pr-modal-t" onClick={(e) => { if (e.target === e.currentTarget) setEscolha(null); }}>
            <form className="pr-modal-caixa" onSubmit={pagar} noValidate>
              <button type="button" className="pr-modal-x" aria-label="Fechar" onClick={() => setEscolha(null)}>×</button>
              <h2 id="pr-modal-t">Como prefere pagar?</h2>
              <p className="pr-modal-sub">Plano {plano.nome} · {escolha.periodo === 'anual' ? 'anual (12 meses pelo preço de 10)' : 'mensal'}</p>
              <div role="radiogroup" aria-label="Forma de pagamento">
                <label className={'pr-forma' + (forma === 'cartao' ? ' on' : '')}>
                  <input type="radio" name="forma" value="cartao" checked={forma === 'cartao'} onChange={() => setForma('cartao')} />
                  <span className="pr-forma-ic" aria-hidden="true">💳</span>
                  <span><b>Cartão de crédito</b><small>Cobrança automática {escolha.periodo === 'anual' ? 'todo ano' : 'todo mês'}. Assinando no teste grátis, a 1ª cobrança só acontece quando ele acabar.</small></span>
                </label>
                <label className={'pr-forma' + (forma === 'pix_boleto' ? ' on' : '')}>
                  <input type="radio" name="forma" value="pix_boleto" checked={forma === 'pix_boleto'} onChange={() => setForma('pix_boleto')} />
                  <span className="pr-forma-ic" aria-hidden="true">⚡</span>
                  <span><b>Pix ou boleto</b><small>Todo {escolha.periodo === 'anual' ? 'ano' : 'mês'} você recebe a cobrança por e-mail e paga com Pix ou boleto. A 1ª vence quando o teste grátis acabar.</small></span>
                </label>
              </div>
              <div className="pr-campos">
                <label>Nome completo ou razão social
                  <input type="text" autoComplete="name" value={nome} onChange={(e) => setNome(e.target.value)} required />
                </label>
                <label>CPF ou CNPJ
                  <input type="text" inputMode="numeric" autoComplete="off" placeholder="000.000.000-00" value={documento} onChange={(e) => setDocumento(mascara(e.target.value))} required />
                </label>
                <small>Usados na cobrança e na nota fiscal. Cancele quando quiser.</small>
              </div>
              {erroModal && <div role="alert" className="pr-erro pr-erro-modal">{erroModal}</div>}
              <button type="submit" className="pl-btn pl-btn-ouro" disabled={loading}>{loading ? 'Abrindo…' : forma === 'cartao' ? 'Continuar para o cartão' : 'Gerar cobrança Pix ou boleto'}</button>
              <p className="pr-modal-nota">Pagamento processado pelo Asaas, com segurança.</p>
            </form>
          </div>
        )}

        <div className="pr-incluso">
          <div className="pr-incluso-t">Em todos os planos</div>
          <ul>{INCLUSO.map((i) => <li key={i}>{i}</li>)}</ul>
        </div>

        <div className="pr-acoes">
          {user && <Link href="/dashboard" className="pr-link">Continuar no teste grátis</Link>}
          {user && <Link href="/assinatura" className="pr-link">Já sou assinante: minha assinatura</Link>}
          <a href="https://wa.me/5561992105889?text=Ol%C3%A1!%20Tenho%20uma%20d%C3%BAvida%20sobre%20os%20planos%20da%20Landim%20Advisory." target="_blank" rel="noopener" className="pr-link">Dúvidas? Fale no WhatsApp</a>
        </div>
        <p className="pr-legal">
          Ao assinar, você concorda com os <Link href="/termos">Termos de Uso</Link> e a <Link href="/privacidade">Política de Privacidade</Link>. Pagamento pelo Asaas, no cartão de crédito, Pix ou boleto, com renovação a cada período e cancelamento a qualquer momento, sem multa.
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
.pr-modal-nota{margin:10px 0 0;color:#6B7486;font-size:12.5px;text-align:center}
.pr-forma{position:relative}
.pr-forma input[type=radio]{position:absolute;opacity:0;pointer-events:none}
.pr-forma.on{border-color:#C5A059;background:#FBF8F1;box-shadow:0 0 0 1px #C5A059}
.pr-forma:focus-within{outline:3px solid #C5A059;outline-offset:2px}
.pr-campos{display:flex;flex-direction:column;gap:10px;margin:6px 0 12px}
.pr-campos label{display:flex;flex-direction:column;gap:5px;font-size:13.5px;font-weight:700;color:#1E2533}
.pr-campos input{font:inherit;font-weight:500;font-size:16px;padding:11px 12px;border:1.5px solid #D5D9E0;border-radius:10px;min-height:44px}
.pr-campos input:focus{outline:none;border-color:#C5A059;box-shadow:0 0 0 3px rgba(197,160,89,.25)}
.pr-campos small{color:#6B7486;font-size:12.5px}
.pr-erro-modal{margin:0 0 12px;max-width:none}
.pr-aviso{background:#F6F1E4;border:1px solid #E8DCC0;color:#5C440B;border-radius:12px;padding:12px 16px;max-width:720px;margin:0 auto 24px;font-size:14px}
.pr-aviso a{color:#5C440B;font-weight:800;text-decoration:underline}
.pr-modal{overflow-y:auto}
.pr-modal-caixa{max-height:calc(100vh - 32px);overflow-y:auto}
@media (max-width:640px){.pr h1{font-size:30px}}
`;
