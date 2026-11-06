// Exclusão da conta a pedido do próprio cliente (direito do titular, art. 18 da LGPD).
// 1. pedirExclusao: cancela a assinatura no Asaas, bloqueia o login e marca exclusoes/{uid} para daqui a 30 dias
//    (prazo da Política de Privacidade, para o cliente se arrepender ou pedir uma cópia pelo suporte).
// 2. processarExclusoes (rotina diária): passados os 30 dias, apaga tudo o que é da conta e o login.
import { promises as fs } from 'fs';
import { FieldPath } from 'firebase-admin/firestore';
import path from 'path';
import { pastaDosAnexos } from './anexos';
import { asaas, asaasConfigurado } from './asaas';
import { registrarEvento } from './seguranca';

export const DIAS_PARA_APAGAR = 30;
const WS_OK = /^[A-Za-z0-9_-]{1,80}$/;

const doDono = (uid, wsId) => wsId === uid || (wsId.startsWith(uid + '__') && /^[a-z0-9]{4,24}$/.test(wsId.slice(uid.length + 2)));

export async function pedirExclusao(db, auth, uid, email) {
  const agora = new Date();
  // Assinatura: para de cobrar agora
  const subRef = db.collection('subscriptions').doc(uid);
  const sub = (await subRef.get()).data() || {};
  if (sub.asaasSubscriptionId && sub.statusAsaas === 'ACTIVE' && asaasConfigurado()) {
    try { await asaas('DELETE', `/subscriptions/${sub.asaasSubscriptionId}`); }
    catch (e) { if (e.status !== 404) throw Object.assign(new Error('Não consegui cancelar a assinatura no Asaas agora. Tente de novo em alguns minutos.'), { status: 502 }); }
    await subRef.set({ statusAsaas: 'DELETED', faturaPendente: null, canceladaEm: agora.toISOString(), updatedAt: agora.toISOString() }, { merge: true });
  }
  const apagarEm = new Date(agora.getTime() + DIAS_PARA_APAGAR * 864e5);
  await db.collection('exclusoes').doc(uid).set({ uid, email: String(email || '').toLowerCase(), pedidoEm: agora.toISOString(), apagarEm: apagarEm.toISOString(), apagadaEm: null });
  // Bloqueia o login e derruba as sessões abertas em outros aparelhos
  await auth.updateUser(uid, { disabled: true });
  await auth.revokeRefreshTokens(uid);
  registrarEvento('contaExcluida');
  return { apagarEm: apagarEm.toISOString() };
}

async function apagarDoc(db, ref) {
  try { await db.recursiveDelete(ref); } catch (e) { console.warn('Exclusão:', ref.path, e.message); }
}

// Apaga os dados de uma conta. Devolve um resumo do que saiu.
export async function apagarConta(db, auth, uid) {
  const r = { empresas: 0, backups: 0, convites: 0, anexos: 0 };
  const fim = uid + '';

  // Empresas (com as partes), cobranças, eventos, NFS-e (certificado e notas), índice de backup e anexos
  const espacos = await db.collection('workspaces').where(FieldPath.documentId(), '>=', uid).where(FieldPath.documentId(), '<', fim).get();
  const ids = espacos.docs.map((d) => d.id).filter((id) => doDono(uid, id));
  if (!ids.includes(uid)) ids.push(uid);
  for (const wsId of ids) {
    await apagarDoc(db, db.collection('workspaces').doc(wsId));
    for (const c of ['cobrancaAsaas', 'cobrancaEventos', 'nfseEmissor', 'backupsIndice']) await apagarDoc(db, db.collection(c).doc(wsId));
    const lembretes = await db.collection('lembretesEnviados').where('wsId', '==', wsId).get();
    await Promise.all(lembretes.docs.map((d) => d.ref.delete()));
    if (WS_OK.test(wsId)) {
      try { await fs.rm(path.join(pastaDosAnexos(), wsId), { recursive: true, force: true }); r.anexos++; } catch { /* sem pasta */ }
    }
    r.empresas++;
  }

  // Cópias de segurança (backups/{empresa}__{dia})
  const copias = await db.collection('backups').where(FieldPath.documentId(), '>=', uid).where(FieldPath.documentId(), '<', fim).get();
  for (const d of copias.docs) { await apagarDoc(db, d.ref); r.backups++; }

  // Convites que a conta deu (convites/<e-mail>/espacos/<empresa> com dono = uid) e os que recebeu
  const emails = await db.collection('convites').listDocuments();
  for (const e of emails) {
    const dados = await e.collection('espacos').where('dono', '==', uid).get();
    await Promise.all(dados.docs.map((d) => d.ref.delete()));
    r.convites += dados.size;
  }
  const exc = (await db.collection('exclusoes').doc(uid).get()).data() || {};
  if (exc.email) await apagarDoc(db, db.collection('convites').doc(exc.email));

  // Dados da conta
  const indicador = (await db.collection('indicadores').doc(uid).get()).data();
  if (indicador && indicador.codigo) await db.collection('indicacaoCodigos').doc(indicador.codigo).delete().catch(() => {});
  for (const c of ['perfis', 'subscriptions', 'emailsTeste', 'indicacoes', 'indicadores']) await apagarDoc(db, db.collection(c).doc(uid));

  // Login
  try { await auth.deleteUser(uid); } catch (e) { if (e.code !== 'auth/user-not-found') throw e; }

  // Fica só o registro de que a exclusão foi feita (sem e-mail), para prestar contas se perguntarem
  await db.collection('exclusoes').doc(uid).set({ uid, pedidoEm: exc.pedidoEm || null, apagadaEm: new Date().toISOString(), email: null, resumo: r });
  return r;
}

// Rotina diária: apaga as contas cujo prazo de 30 dias já passou
export async function processarExclusoes(db, auth) {
  const agora = new Date().toISOString();
  const pendentes = await db.collection('exclusoes').where('apagarEm', '<=', agora).get();
  const feitas = [];
  for (const d of pendentes.docs) {
    if (d.data().apagadaEm) continue;
    try { feitas.push({ uid: d.id.slice(0, 6) + '…', ...(await apagarConta(db, auth, d.id)) }); }
    catch (e) { console.error('Exclusão de conta:', e.message); feitas.push({ uid: d.id.slice(0, 6) + '…', erro: e.message }); }
  }
  return feitas;
}
