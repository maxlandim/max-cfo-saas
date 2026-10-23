// Conta do Asaas de cada empresa (cobrança dos clientes do usuário). Diferente de src/lib/asaas.js,
// que é a conta da própria Landim Advisory (assinaturas do sistema).
//   cobrancaAsaas/{wsId} = { owner, chave (cifrada), sandbox, webhookId, webhookToken, conta, conectadoEm }   (só o servidor lê)
//   cobrancaEventos/{wsId}/itens/{paymentId} = { txId, evento, status, valor, pagoEm, forma, em }         (o painel busca pela API)
import { randomBytes } from 'crypto';
import { adminDb } from './firebaseAdmin';
import { cifrar, decifrar } from './cripto';
import { ErroAsaas } from './asaas';

export const donoDoEspaco = (uid, wsId) => wsId === uid || new RegExp('^' + uid + '__[a-z0-9]{4,24}$').test(String(wsId || ''));

const normalizar = (k) => { k = String(k || '').trim(); return k.startsWith('aact_') ? '$' + k : k; };
export const ehSandbox = (k) => normalizar(k).startsWith('$aact_hmlg_');
const base = (k) => (ehSandbox(k) ? 'https://api-sandbox.asaas.com/v3' : 'https://api.asaas.com/v3');

export async function chamar(chaveApi, metodo, caminho, corpo) {
  const k = normalizar(chaveApi);
  const r = await fetch(base(k) + caminho, {
    method: metodo,
    headers: { access_token: k, 'Content-Type': 'application/json', 'User-Agent': 'LandimAdvisory/1.0' },
    body: corpo ? JSON.stringify(corpo) : undefined,
    cache: 'no-store',
  });
  const texto = await r.text();
  let dados = null;
  try { dados = texto ? JSON.parse(texto) : null; } catch { dados = { texto }; }
  if (!r.ok) throw new ErroAsaas(r.status, dados);
  return dados;
}

export async function configDoEspaco(wsId) {
  const d = (await adminDb.collection('cobrancaAsaas').doc(wsId).get()).data();
  if (!d || !d.chave) return null;
  return { ...d, chaveApi: decifrar(d.chave) };
}

export async function conectar({ wsId, uid, chaveApi, site, email }) {
  const k = normalizar(chaveApi);
  if (!/^\$aact_(prod|hmlg)_/.test(k)) throw Object.assign(new Error('Chave inválida. A chave do Asaas começa com $aact_prod_ (ou $aact_hmlg_ no sandbox).'), { status: 400 });
  // Confere a chave e pega o nome da conta
  let conta = {};
  try {
    const info = await chamar(k, 'GET', '/myAccount/commercialInfo');
    conta = { nome: info.companyName || info.name || '', cpfCnpj: info.cpfCnpj || '' };
  } catch (e) {
    if (e.status === 401) throw Object.assign(new Error('O Asaas não aceitou essa chave. Confira se copiou a chave inteira.'), { status: 400 });
    await chamar(k, 'GET', '/finance/balance'); // contas sem dados comerciais ainda: só confere se a chave funciona
  }
  const atual = await configDoEspaco(wsId).catch(() => null);
  if (atual && atual.webhookId) { try { await chamar(atual.chaveApi, 'DELETE', `/webhooks/${atual.webhookId}`); } catch {} }
  const token = randomBytes(24).toString('hex');
  let webhookId = null;
  try {
    const w = await chamar(k, 'POST', '/webhooks', {
      name: 'Landim Advisory',
      url: `${site}/api/cobrancas/webhook?ws=${encodeURIComponent(wsId)}`,
      email: email || undefined,
      enabled: true, interrupted: false, apiVersion: 3, sendType: 'SEQUENTIALLY', authToken: token,
      events: ['PAYMENT_CREATED', 'PAYMENT_UPDATED', 'PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED', 'PAYMENT_OVERDUE', 'PAYMENT_DELETED', 'PAYMENT_REFUNDED', 'PAYMENT_RESTORED'],
    });
    webhookId = w.id || null;
  } catch (e) {
    console.warn('Webhook do Asaas do cliente:', e.message);
    throw Object.assign(new Error('A chave funciona, mas não consegui criar o aviso de pagamento (webhook) na sua conta do Asaas: ' + e.message), { status: 400 });
  }
  await adminDb.collection('cobrancaAsaas').doc(wsId).set({ owner: uid, chave: cifrar(k), sandbox: ehSandbox(k), webhookId, webhookToken: token, conta, conectadoEm: new Date().toISOString() });
  return { conta, sandbox: ehSandbox(k) };
}

export async function desconectar(wsId) {
  const atual = await configDoEspaco(wsId).catch(() => null);
  if (atual && atual.webhookId) { try { await chamar(atual.chaveApi, 'DELETE', `/webhooks/${atual.webhookId}`); } catch {} }
  await adminDb.collection('cobrancaAsaas').doc(wsId).delete();
}
