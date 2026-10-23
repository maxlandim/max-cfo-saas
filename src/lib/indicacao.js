// Programa de indicação: cada conta tem um código (landimadvisory.com.br/?ref=CODIGO).
// Quando a pessoa indicada paga a primeira cobrança, as duas contas ganham 1 mês grátis.
//   indicacaoCodigos/{codigo} = { uid }
//   indicadores/{uid}         = { codigo, indicados, pagos }
//   indicacoes/{uidIndicado}  = { indicador, codigo, status: 'cadastrado' | 'pago', em, pagoEm }
// O mês grátis empurra a próxima cobrança em 1 mês (ou fica guardado em subscriptions/{uid}.mesesGratis
// para ser usado quando a pessoa assinar).
import { randomBytes } from 'crypto';
import { adminDb, adminAuth } from './firebaseAdmin';
import { asaas, dataAsaas, msDaData } from './asaas';
import { somarMeses } from './plans';

const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const novoCodigo = () => Array.from(randomBytes(6), (b) => ALFABETO[b % ALFABETO.length]).join('');
export const codigoValido = (c) => /^[A-Z2-9]{6}$/.test(String(c || ''));

export async function meuCodigo(uid) {
  const ref = adminDb.collection('indicadores').doc(uid);
  const atual = (await ref.get()).data();
  if (atual && atual.codigo) return atual;
  for (let i = 0; i < 5; i++) {
    const codigo = novoCodigo();
    const cref = adminDb.collection('indicacaoCodigos').doc(codigo);
    const ok = await adminDb.runTransaction(async (t) => {
      if ((await t.get(cref)).exists) return false;
      t.set(cref, { uid, em: new Date().toISOString() });
      t.set(ref, { codigo, indicados: 0, pagos: 0 }, { merge: true });
      return true;
    });
    if (ok) return { codigo, indicados: 0, pagos: 0 };
  }
  throw new Error('Não consegui gerar o código de indicação');
}

// Liga a conta nova a quem indicou (só contas criadas há menos de 3 dias, uma vez, e não a si mesma)
export async function vincularIndicacao(uid, codigo) {
  if (!codigoValido(codigo)) return { ok: false, motivo: 'codigo' };
  const c = (await adminDb.collection('indicacaoCodigos').doc(codigo).get()).data();
  if (!c || c.uid === uid) return { ok: false, motivo: 'codigo' };
  const conta = await adminAuth.getUser(uid);
  if (Date.now() - new Date(conta.metadata.creationTime).getTime() > 3 * 864e5) return { ok: false, motivo: 'conta_antiga' };
  const ref = adminDb.collection('indicacoes').doc(uid);
  const iref = adminDb.collection('indicadores').doc(c.uid);
  return adminDb.runTransaction(async (t) => {
    // no Firestore, todas as leituras da transação vêm antes das gravações
    const [ja, ind] = await Promise.all([t.get(ref), t.get(iref)]);
    if (ja.exists) return { ok: false, motivo: 'ja_vinculada' };
    t.set(ref, { indicador: c.uid, codigo, status: 'cadastrado', em: new Date().toISOString() });
    t.set(iref, { indicados: ((ind.data() || {}).indicados || 0) + 1 }, { merge: true });
    return { ok: true };
  });
}

// Empurra a próxima cobrança em 1 mês (assinatura ativa) ou guarda o mês para quando assinar
export async function concederMesGratis(uid, motivo) {
  const ref = adminDb.collection('subscriptions').doc(uid);
  const sub = (await ref.get()).data() || {};
  const registro = { em: new Date().toISOString(), motivo };
  if (sub.asaasSubscriptionId && sub.statusAsaas === 'ACTIVE') {
    try {
      const pend = await asaas('GET', `/subscriptions/${sub.asaasSubscriptionId}/payments?status=PENDING&limit=10`);
      for (const p of pend.data || []) {
        await asaas('PUT', `/payments/${p.id}`, { dueDate: dataAsaas(somarMeses(msDaData(p.dueDate), 1)) });
      }
      if (sub.proximoVencimento) {
        const proximo = dataAsaas(somarMeses(msDaData(sub.proximoVencimento), 1));
        await asaas('PUT', `/subscriptions/${sub.asaasSubscriptionId}`, { nextDueDate: proximo });
        registro.proximoVencimento = proximo;
      }
      const pagoAte = sub.pagoAte && Date.parse(sub.pagoAte) > Date.now() ? new Date(somarMeses(Date.parse(sub.pagoAte), 1)).toISOString() : sub.pagoAte || null;
      await ref.set({ pagoAte, ...(registro.proximoVencimento ? { proximoVencimento: registro.proximoVencimento } : {}), mesesGanhos: (sub.mesesGanhos || 0) + 1, ultimoMesGratis: registro }, { merge: true });
      return { aplicado: true };
    } catch (e) {
      console.error('Mês grátis na assinatura', uid, e.message);
      // se o Asaas recusar, guarda para usar depois
    }
  }
  await ref.set({ mesesGratis: (sub.mesesGratis || 0) + 1, mesesGanhos: (sub.mesesGanhos || 0) + 1, ultimoMesGratis: registro }, { merge: true });
  return { aplicado: false, guardado: true };
}

// Chamado quando uma cobrança de assinatura é paga: na primeira vez, recompensa as duas contas
export async function pagamentoDeIndicado(uid) {
  const ref = adminDb.collection('indicacoes').doc(uid);
  const ganhou = await adminDb.runTransaction(async (t) => {
    const d = (await t.get(ref)).data();
    if (!d || d.status !== 'cadastrado') return null;
    t.set(ref, { status: 'pago', pagoEm: new Date().toISOString() }, { merge: true });
    return d;
  });
  if (!ganhou) return false;
  await concederMesGratis(uid, 'indicado');
  await concederMesGratis(ganhou.indicador, 'indicou');
  const iref = adminDb.collection('indicadores').doc(ganhou.indicador);
  const atual = (await iref.get()).data() || {};
  await iref.set({ pagos: (atual.pagos || 0) + 1 }, { merge: true });
  return true;
}
