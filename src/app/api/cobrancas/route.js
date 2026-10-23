import { NextResponse } from 'next/server';
import { adminConfigurado, adminDb, usuarioDaRequisicao } from '../../../lib/firebaseAdmin';
import { chamar, configDoEspaco, conectar, desconectar, donoDoEspaco } from '../../../lib/asaasCliente';
import { soDigitos, documentoValido } from '../../../lib/asaas';
import { limiteExcedido } from '../../../lib/limite';

export const dynamic = 'force-dynamic';

const site = () => (process.env.NEXT_PUBLIC_SITE_URL || 'https://landimadvisory.com.br').replace(/\/$/, '');
const hoje = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });

async function entrada(req, wsId) {
  if (!adminConfigurado) return [null, NextResponse.json({ error: 'Servidor sem configuração.' }, { status: 503 })];
  const user = await usuarioDaRequisicao(req);
  if (!user) return [null, NextResponse.json({ error: 'Faça login novamente.' }, { status: 401 })];
  if (!donoDoEspaco(user.uid, wsId)) return [null, NextResponse.json({ error: 'Só o dono da empresa pode usar a cobrança pelo Asaas.' }, { status: 403 })];
  return [user, null];
}

// GET ?wsId=: a empresa tem uma conta do Asaas conectada?
export async function GET(req) {
  const wsId = new URL(req.url).searchParams.get('wsId') || '';
  const [, erro] = await entrada(req, wsId);
  if (erro) return erro;
  const d = (await adminDb.collection('cobrancaAsaas').doc(wsId).get()).data();
  return NextResponse.json(d ? { conectado: true, conta: d.conta || {}, sandbox: !!d.sandbox, conectadoEm: d.conectadoEm } : { conectado: false });
}

// POST { acao: 'conectar', wsId, chave } | { acao: 'desconectar', wsId }
//      { acao: 'gerar', wsId, txId, descricao, valor, vencimento, cliente: { nome, documento, email, telefone } }
//      { acao: 'cancelar', wsId, cobrancaId }
export async function POST(req) {
  let b = {};
  try { b = await req.json(); } catch {}
  const wsId = String(b.wsId || '');
  const [user, erro] = await entrada(req, wsId);
  if (erro) return erro;
  try {
    if (b.acao === 'conectar') {
      if (limiteExcedido('conectar:' + user.uid, 10)) return NextResponse.json({ error: 'Muitas tentativas. Tente de novo em 1 hora.' }, { status: 429 });
      const r = await conectar({ wsId, uid: user.uid, chaveApi: b.chave, site: site(), email: user.email });
      return NextResponse.json({ ok: true, ...r });
    }
    if (b.acao === 'desconectar') { await desconectar(wsId); return NextResponse.json({ ok: true }); }

    const cfg = await configDoEspaco(wsId);
    if (!cfg) return NextResponse.json({ error: 'Conecte a conta do Asaas da empresa primeiro.' }, { status: 400 });

    if (b.acao === 'gerar') {
      if (limiteExcedido('cobrar:' + user.uid, 300)) return NextResponse.json({ error: 'Muitas cobranças em pouco tempo. Tente de novo mais tarde.' }, { status: 429 });
      const c = b.cliente || {};
      const doc = soDigitos(c.documento);
      if (!String(c.nome || '').trim()) return NextResponse.json({ error: 'Informe o nome do cliente.' }, { status: 400 });
      if (!documentoValido(doc)) return NextResponse.json({ error: 'CPF ou CNPJ do cliente inválido. O Asaas exige o documento para emitir boleto.' }, { status: 400 });
      const valor = Math.round(Number(b.valor) * 100) / 100;
      if (!(valor >= 5)) return NextResponse.json({ error: 'O Asaas cobra valores a partir de R$ 5,00.' }, { status: 400 });
      const venc = String(b.vencimento || '').slice(0, 10) < hoje() ? hoje() : String(b.vencimento).slice(0, 10);
      // cliente: reaproveita pelo CPF/CNPJ
      const busca = await chamar(cfg.chaveApi, 'GET', `/customers?cpfCnpj=${doc}&limit=1`);
      let clienteId = busca && busca.data && busca.data[0] && busca.data[0].id;
      const dadosCliente = { name: String(c.nome).trim().slice(0, 100), cpfCnpj: doc, ...(c.email ? { email: String(c.email).trim() } : {}), ...(soDigitos(c.telefone).length >= 10 ? { mobilePhone: soDigitos(c.telefone).replace(/^55(?=\d{10,11}$)/, '') } : {}) };
      if (!clienteId) clienteId = (await chamar(cfg.chaveApi, 'POST', '/customers', dadosCliente)).id;
      const p = await chamar(cfg.chaveApi, 'POST', '/payments', {
        customer: clienteId, billingType: 'UNDEFINED', value: valor, dueDate: venc,
        description: String(b.descricao || 'Cobrança').slice(0, 500),
        externalReference: `${wsId}|${String(b.txId || '').slice(0, 64)}`,
      });
      return NextResponse.json({ ok: true, cobranca: { id: p.id, url: p.invoiceUrl, boleto: p.bankSlipUrl || null, status: p.status, vencimento: p.dueDate, valor: p.value, criadaEm: new Date().toISOString() } });
    }
    if (b.acao === 'cancelar') {
      await chamar(cfg.chaveApi, 'DELETE', `/payments/${encodeURIComponent(String(b.cobrancaId || ''))}`);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 });
  } catch (e) {
    console.error('Cobrança Asaas:', b.acao, e.status, e.message);
    return NextResponse.json({ error: e.message && e.status && e.status < 500 ? e.message : 'O Asaas não respondeu agora. Tente de novo em instantes.' }, { status: e.status && e.status < 500 ? 400 : 502 });
  }
}
