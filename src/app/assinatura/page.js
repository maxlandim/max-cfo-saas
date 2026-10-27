'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authFetch } from '../../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { PLANOS_VITRINE, reais } from '../components/Planos';
import SeletorIdioma from '../components/SeletorIdioma';

const SITUACAO = {
  PENDING: ['Aguardando pagamento', 'amarelo'], OVERDUE: ['Vencida', 'vermelho'], RECEIVED: ['Paga', 'verde'], CONFIRMED: ['Paga', 'verde'],
  RECEIVED_IN_CASH: ['Paga', 'verde'], REFUNDED: ['Estornada', 'cinza'], REFUND_REQUESTED: ['Estorno pedido', 'cinza'], CHARGEBACK_REQUESTED: ['Contestada', 'vermelho'],
  AWAITING_RISK_ANALYSIS: ['Em análise', 'amarelo'],
};
const FORMA = { CREDIT_CARD: 'Cartão', PIX: 'Pix', BOLETO: 'Boleto', UNDEFINED: 'Pix ou boleto' };
const dataBR = (d) => (d ? new Date(String(d).length === 10 ? d + 'T12:00:00-03:00' : d).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '—');

// Página "Minha assinatura": plano, próxima cobrança, cobranças pagas e pendentes, troca e cancelamento.
export default function MinhaAssinatura() {
  const router = useRouter();
  const { user, loading: carregandoLogin } = useAuth();
  const [d, setD] = useState(null);
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [confirmar, setConfirmar] = useState(false);

  const carregar = async () => {
    try {
      const r = await authFetch('/api/assinatura');
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || 'Não consegui carregar.');
      setD(j);
    } catch (e) { setErro(e.message); }
  };
  useEffect(() => {
    if (carregandoLogin) return;
    if (!user) { router.push('/login'); return; }
    carregar();
  }, [user, carregandoLogin]);

  const cancelar = async () => {
    setOcupado(true); setErro('');
    try {
      const r = await authFetch('/api/assinatura', { method: 'POST', body: JSON.stringify({ acao: 'cancelar' }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || 'Não consegui cancelar.');
      setConfirmar(false);
      await carregar();
    } catch (e) { setErro(e.message); }
    setOcupado(false);
  };

  const nomePlano = d && d.plano ? (PLANOS_VITRINE.find((p) => p.id === d.plano) || {}).nome : null;
  const fatura = d && d.status && d.status.faturaPendente;
  return (
    <div className="ma">
      <style dangerouslySetInnerHTML={{ __html: ESTILO }} />
      <header className="ma-topo">
        <Link href="/" className="ma-marca"><img src="/logo.svg" alt="" width="34" height="34" />Landim Advisory</Link>
        <span style={{ display: 'flex', alignItems: 'center', gap: 14 }}><SeletorIdioma /><Link href="/dashboard" className="ma-link">Voltar ao painel</Link></span>
      </header>
      <main className="ma-main">
        <h1>Minha assinatura</h1>
        {erro && <div role="alert" className="ma-erro">{erro}</div>}
        {!d ? <p className="ma-sub">Carregando…</p> : (
          <>
            <section className="ma-cartao">
              {d.ativa ? (
                <>
                  <div className="ma-linha"><span>Plano</span><b>{nomePlano || '—'} · {d.periodo === 'anual' ? 'anual' : 'mensal'}{d.fundador ? ' · preço de fundador' : ''}</b></div>
                  <div className="ma-linha"><span>Forma de pagamento</span><b>{d.forma === 'cartao' ? 'Cartão de crédito (cobrança automática)' : 'Pix ou boleto (cobrança por e-mail)'}</b></div>
                  <div className="ma-linha"><span>Próximo vencimento</span><b>{dataBR(d.proximoVencimento)}</b></div>
                  {d.pagoAte && <div className="ma-linha"><span>Pago até</span><b>{dataBR(d.pagoAte)}</b></div>}
                  {d.fundador && d.fundadorAte && <div className="ma-linha"><span>Preço de fundador até</span><b>{dataBR(d.fundadorAte)}</b></div>}
                  <div className="ma-linha"><span>Empresas</span><b>{(d.empresasIncluidas || 1) + (d.empresasExtras || 0)} liberadas{d.empresasExtras ? ` (${d.empresasExtras} adicional${d.empresasExtras > 1 ? 'is' : ''} × R$ ${((d.valorEmpresaExtra || 2990) / 100).toFixed(2).replace('.', ',')}/mês)` : ''}</b></div>
                </>
              ) : (
                <p className="ma-sub" style={{ margin: 0 }}>
                  {d.pagoAte && Date.parse(d.pagoAte) > Date.now()
                    ? <>Assinatura cancelada. Você continua com acesso até <b>{dataBR(d.pagoAte)}</b>.</>
                    : d.status && d.status.motivo === 'cortesia' ? <>Acesso de <b>cortesia</b> ao plano Escritório, com tudo liberado e até 10 empresas, sem cobrança.</>
                    : d.status && d.status.motivo === 'teste' ? <>Você está no teste grátis ({d.status.diasRestantes} {d.status.diasRestantes === 1 ? 'dia restante' : 'dias restantes'}) e ainda não assinou.</>
                    : 'Nenhuma assinatura ativa nesta conta.'}
                </p>
              )}
              {fatura && fatura.url && (
                <a className="ma-btn ma-btn-ouro" href={fatura.url} target="_blank" rel="noopener">Pagar cobrança de R$ {reais(fatura.valor || 0)} · vence {dataBR(fatura.vencimento)}</a>
              )}
              <div className="ma-acoes">
                <Link href="/pricing" className="ma-btn">{d.ativa ? 'Trocar plano ou forma de pagamento' : 'Assinar'}</Link>
                {d.ativa && !confirmar && <button type="button" className="ma-btn ma-btn-perigo" onClick={() => setConfirmar(true)}>Cancelar assinatura</button>}
              </div>
              {confirmar && (
                <div className="ma-confirma" role="alertdialog" aria-labelledby="ma-conf-t">
                  <b id="ma-conf-t">Cancelar a assinatura?</b>
                  <p>As próximas cobranças deixam de ser geradas{d.pagoAte && Date.parse(d.pagoAte) > Date.now() ? <> e você continua usando até <b>{dataBR(d.pagoAte)}</b></> : ''}. Seus dados ficam guardados.</p>
                  <div className="ma-acoes">
                    <button type="button" className="ma-btn ma-btn-perigo" disabled={ocupado} onClick={cancelar}>{ocupado ? 'Cancelando…' : 'Sim, cancelar'}</button>
                    <button type="button" className="ma-btn" onClick={() => setConfirmar(false)}>Manter assinatura</button>
                  </div>
                </div>
              )}
            </section>

            {d.cobrancas && d.cobrancas.length > 0 && (
              <section className="ma-cartao">
                <h2>Cobranças</h2>
                <div className="ma-rolagem">
                  <table className="ma-tabela">
                    <thead><tr><th>Vencimento</th><th>Valor</th><th>Forma</th><th>Situação</th><th></th></tr></thead>
                    <tbody>
                      {d.cobrancas.map((c, i) => {
                        const [txt, cor] = SITUACAO[c.situacao] || [c.situacao, 'cinza'];
                        return (
                          <tr key={i}>
                            <td>{dataBR(c.vencimento)}</td><td>R$ {reais(c.valor)}</td><td>{FORMA[c.forma] || c.forma}</td>
                            <td><span className={'ma-selo ma-' + cor}>{txt}</span></td>
                            <td>{c.recibo ? <a href={c.recibo} target="_blank" rel="noopener">Recibo</a> : (c.situacao === 'PENDING' || c.situacao === 'OVERDUE') && c.url ? <a href={c.url} target="_blank" rel="noopener">Pagar</a> : null}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
            <Indicacao />

            <p className="ma-sub">Dúvidas sobre cobrança? <a href="https://wa.me/5561992105889" target="_blank" rel="noopener">Fale no WhatsApp</a>.</p>
          </>
        )}
      </main>
    </div>
  );
}

// Indique e ganhe: link próprio; quando a pessoa indicada paga a primeira cobrança, as duas ganham 1 mês grátis
function Indicacao() {
  const [d, setD] = useState(null);
  const [copiado, setCopiado] = useState(false);
  useEffect(() => {
    authFetch('/api/indicacao').then((r) => (r.ok ? r.json() : null)).then(setD).catch(() => {});
  }, []);
  if (!d || !d.link) return null;
  const texto = `Uso a Landim Advisory para organizar o financeiro da empresa (contas, fluxo de caixa e DRE). Teste 7 dias grátis pelo meu link e ganhe 1 mês grátis quando assinar: ${d.link}`;
  const copiar = async () => { try { await navigator.clipboard.writeText(d.link); setCopiado(true); setTimeout(() => setCopiado(false), 2500); } catch {} };
  return (
    <section className="ma-cartao ma-indica">
      <h2>🎁 Indique e ganhe 1 mês grátis</h2>
      <p className="ma-sub" style={{ marginTop: 0 }}>Quando alguém criar a conta pelo seu link e pagar a primeira mensalidade, <b>vocês dois ganham 1 mês grátis</b>. Não tem limite de indicações.</p>
      <div className="ma-link-ind"><input readOnly value={d.link} aria-label="Seu link de indicação" onFocus={(e) => e.target.select()} /><button type="button" className="ma-btn" onClick={copiar}>{copiado ? 'Copiado!' : 'Copiar'}</button></div>
      <div className="ma-acoes">
        <a className="ma-btn ma-btn-ouro" style={{ marginTop: 0 }} href={`https://wa.me/?text=${encodeURIComponent(texto)}`} target="_blank" rel="noopener">Enviar no WhatsApp</a>
      </div>
      <div className="ma-numeros"><span><b>{d.indicados}</b> {d.indicados === 1 ? 'conta criada' : 'contas criadas'}</span><span><b>{d.pagos}</b> {d.pagos === 1 ? 'assinou' : 'assinaram'}</span><span><b>{d.mesesGanhos}</b> {d.mesesGanhos === 1 ? 'mês ganho' : 'meses ganhos'}</span></div>
      {d.mesesGuardados > 0 && <p className="ma-sub">Você tem {d.mesesGuardados} {d.mesesGuardados === 1 ? 'mês grátis guardado' : 'meses grátis guardados'}: ao assinar, a primeira cobrança fica para depois.</p>}
    </section>
  );
}

const ESTILO = `
.ma{min-height:100vh;background:#FAFAF8;color:#0B1220;font-family:var(--font-inter),Inter,system-ui,sans-serif}
.ma a{color:#0B1220}
.ma-topo{max-width:860px;margin:0 auto;padding:18px 20px;display:flex;align-items:center;justify-content:space-between}
.ma-marca{display:flex;align-items:center;gap:9px;font-weight:900;font-size:17px;text-decoration:none}
.ma-marca img{border-radius:9px}
.ma-link{font-weight:700;font-size:14.5px}
.ma-main{max-width:860px;margin:0 auto;padding:10px 20px 60px}
.ma h1{font-size:32px;font-weight:900;letter-spacing:-.02em;margin:10px 0 18px}
.ma h2{font-size:18px;margin:0 0 12px}
.ma-sub{color:#4B5565;font-size:15px}
.ma-erro{background:#FEF2F2;color:#B91C1C;border:1px solid #FECACA;padding:12px 16px;border-radius:10px;margin:0 0 16px;font-size:14px}
.ma-cartao{background:#fff;border:1px solid #E3E6EC;border-radius:16px;padding:20px;margin-bottom:16px}
.ma-linha{display:flex;justify-content:space-between;gap:16px;padding:9px 0;border-bottom:1px solid #F0F1F4;font-size:15px;flex-wrap:wrap}
.ma-linha span{color:#5B6474}
.ma-acoes{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px}
.ma-btn{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:10px 16px;border-radius:10px;border:1.5px solid #0B1220;background:#fff;color:#0B1220;font:inherit;font-weight:800;font-size:14.5px;cursor:pointer;text-decoration:none}
.ma-btn-ouro{display:flex;margin-top:14px;background:#C5A059;border-color:#C5A059;text-align:center}
.ma-btn-perigo{border-color:#B91C1C;color:#B91C1C}
.ma-btn:disabled{opacity:.6;cursor:wait}
.ma-confirma{margin-top:14px;background:#FEF7F7;border:1px solid #F5C9C9;border-radius:12px;padding:14px}
.ma-confirma p{margin:6px 0 0;font-size:14px;color:#4B5565}
.ma-rolagem{overflow-x:auto}
.ma-tabela{width:100%;border-collapse:collapse;font-size:14px;min-width:520px}
.ma-tabela th{text-align:left;color:#5B6474;font-weight:700;padding:8px;border-bottom:1px solid #E3E6EC}
.ma-tabela td{padding:9px 8px;border-bottom:1px solid #F0F1F4}
.ma-selo{display:inline-block;padding:3px 9px;border-radius:99px;font-size:12.5px;font-weight:800}
.ma-indica h2{margin-bottom:6px}
.ma-link-ind{display:flex;gap:8px;margin-top:12px}.ma-link-ind input{flex:1;min-width:0;font:inherit;font-size:15px;padding:10px 12px;border:1.5px solid #D5D9E0;border-radius:10px;min-height:44px}
.ma-numeros{display:flex;gap:18px;flex-wrap:wrap;margin-top:14px;font-size:14px;color:#4B5565}.ma-numeros b{color:#0B1220;font-size:17px}
.ma-verde{background:#E7F6EF;color:#0B6B4A}.ma-amarelo{background:#FFF6DD;color:#7A5A12}.ma-vermelho{background:#FDECEC;color:#B91C1C}.ma-cinza{background:#EEF0F3;color:#4B5565}
`;
