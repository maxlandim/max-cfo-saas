import { NextResponse } from 'next/server';
import { adminConfigurado, adminDb, usuarioDaRequisicao } from '../../../lib/firebaseAdmin';
import { statusDoUsuario, ajustarEmpresasExtras, empresasCadastradas, extrasNecessarias } from '../../../lib/assinatura';
import { EMPRESA_EXTRA, MAX_EMPRESAS, empresasIncluidas, limiteDeEmpresas } from '../../../lib/plans';
import { asaas, asaasConfigurado } from '../../../lib/asaas';

export const dynamic = 'force-dynamic';

// GET: dados da assinatura para a página "Minha assinatura" (e para preencher nome e CPF/CNPJ no pagamento)
export async function GET(req) {
  if (!adminConfigurado) return NextResponse.json({ error: 'Servidor sem configuração.' }, { status: 503 });
  const user = await usuarioDaRequisicao(req);
  if (!user) return NextResponse.json({ error: 'Faça login novamente.' }, { status: 401 });
  const sub = (await adminDb.collection('subscriptions').doc(user.uid).get()).data() || {};
  const status = await statusDoUsuario(user);
  let cobrancas = [];
  if (asaasConfigurado() && sub.asaasSubscriptionId) {
    try {
      const lista = await asaas('GET', `/subscriptions/${sub.asaasSubscriptionId}/payments?limit=12`);
      cobrancas = (lista.data || []).map((p) => ({ vencimento: p.dueDate, valor: Math.round(Number(p.value) * 100), situacao: p.status, forma: p.billingType, url: p.invoiceUrl || null, recibo: p.transactionReceiptUrl || null }))
        .sort((a, b) => (a.vencimento < b.vencimento ? 1 : -1));
    } catch (e) { console.warn('Cobranças da assinatura:', e.message); }
  }
  return NextResponse.json({
    status,
    nome: sub.nomeCobranca || user.name || '',
    documento: sub.documento || '',
    ativa: Boolean(sub.asaasSubscriptionId) && sub.statusAsaas === 'ACTIVE',
    plano: sub.plano || null, periodo: sub.periodo || null, forma: sub.forma || null,
    proximoVencimento: sub.proximoVencimento || null, pagoAte: sub.pagoAte || null, fundador: Boolean(sub.fundador), fundadorAte: sub.fundadorAte || null,
    empresasExtras: Math.max(0, Number(sub.empresasExtras) || 0), empresasIncluidas: empresasIncluidas(sub.plano || 'basic'), valorEmpresaExtra: EMPRESA_EXTRA,
    cobrancas,
  });
}

// POST { acao: 'empresas', modo: 'adicionar' | 'sincronizar' }: empresas adicionais na assinatura
//   adicionar: libera mais uma empresa (cobrança de EMPRESA_EXTRA por mês a partir da próxima fatura)
//   sincronizar: depois de excluir empresas, recalcula pelo que está cadastrado (só diminui)
async function empresasExtras(user, body) {
  const status = await statusDoUsuario(user);
  if (status.motivo === 'admin') return NextResponse.json({ ok: true, limite: MAX_EMPRESAS, extras: 0 });
  const sub = (await adminDb.collection('subscriptions').doc(user.uid).get()).data() || {};
  const ativa = Boolean(sub.asaasSubscriptionId) && sub.statusAsaas === 'ACTIVE';
  const plano = sub.plano || status.plano || 'basic';
  const cadastradas = await empresasCadastradas(user.uid);
  const atuais = Math.max(0, Number(sub.empresasExtras) || 0);
  if (body.modo === 'sincronizar') {
    const extras = Math.min(atuais, extrasNecessarias(plano, cadastradas));
    if (extras === atuais) return NextResponse.json({ ok: true, extras, limite: limiteDeEmpresas(plano, extras) });
    try { await ajustarEmpresasExtras(user.uid, extras); } catch (e) { console.error('Empresas adicionais (sincronizar):', e.message); return NextResponse.json({ error: 'Não consegui atualizar a assinatura agora.' }, { status: 502 }); }
    return NextResponse.json({ ok: true, extras, limite: limiteDeEmpresas(plano, extras) });
  }
  if (!ativa || !asaasConfigurado()) return NextResponse.json({ error: 'Para cadastrar mais empresas, assine um plano. Cada empresa a mais custa R$ ' + (EMPRESA_EXTRA / 100).toFixed(2).replace('.', ',') + ' por mês.', assinar: true }, { status: 402 });
  if (cadastradas + 1 > MAX_EMPRESAS) return NextResponse.json({ error: 'Limite de ' + MAX_EMPRESAS + ' empresas por login. Fale com a gente no WhatsApp.' }, { status: 400 });
  const extras = Math.max(atuais, extrasNecessarias(plano, cadastradas + 1));
  try { await ajustarEmpresasExtras(user.uid, extras); } catch (e) { console.error('Empresas adicionais:', e.message); return NextResponse.json({ error: 'Não consegui incluir a empresa na assinatura agora. Tente de novo em instantes.' }, { status: 502 }); }
  return NextResponse.json({ ok: true, extras, limite: limiteDeEmpresas(plano, extras), incluidas: empresasIncluidas(plano), valorExtra: EMPRESA_EXTRA });
}

// POST { acao: 'cancelar' }: encerra a assinatura no Asaas (o período já pago continua valendo)
export async function POST(req) {
  if (!adminConfigurado) return NextResponse.json({ error: 'Servidor sem configuração.' }, { status: 503 });
  const user = await usuarioDaRequisicao(req);
  if (!user) return NextResponse.json({ error: 'Faça login novamente.' }, { status: 401 });
  let body = {};
  try { body = await req.json(); } catch {}
  if (body.acao === 'empresas') return empresasExtras(user, body);
  if (!asaasConfigurado()) return NextResponse.json({ error: 'Pagamentos ainda não configurados.' }, { status: 503 });
  if (body.acao !== 'cancelar') return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 });
  const ref = adminDb.collection('subscriptions').doc(user.uid);
  const sub = (await ref.get()).data() || {};
  if (!sub.asaasSubscriptionId || sub.statusAsaas !== 'ACTIVE') return NextResponse.json({ error: 'Não há assinatura ativa nesta conta.' }, { status: 404 });
  try {
    await asaas('DELETE', `/subscriptions/${sub.asaasSubscriptionId}`);
  } catch (e) {
    if (e.status !== 404) { console.error('Cancelar assinatura:', e.message); return NextResponse.json({ error: 'Não consegui cancelar agora. Tente de novo ou fale no WhatsApp.' }, { status: 500 }); }
  }
  await ref.set({ statusAsaas: 'DELETED', faturaPendente: null, canceladaEm: new Date().toISOString(), updatedAt: new Date().toISOString() }, { merge: true });
  return NextResponse.json({ ok: true, status: await statusDoUsuario(user) });
}
