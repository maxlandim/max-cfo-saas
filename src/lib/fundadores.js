// Quantas vagas de preço de fundador ainda restam (conta as assinaturas marcadas como fundador).
import { adminDb } from './firebaseAdmin';
import { FUNDADOR } from './plans';

let cache = { t: 0, usados: 0 };
export async function vagasFundador({ semCache = false } = {}) {
  if (!adminDb) return FUNDADOR.vagas;
  if (!semCache && Date.now() - cache.t < 60 * 1000) return Math.max(0, FUNDADOR.vagas - cache.usados);
  try {
    const snap = await adminDb.collection('subscriptions').where('fundador', '==', true).count().get();
    cache = { t: Date.now(), usados: snap.data().count || 0 };
  } catch (e) { console.warn('Vagas de fundador:', e.message); }
  return Math.max(0, FUNDADOR.vagas - cache.usados);
}
