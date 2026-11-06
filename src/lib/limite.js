// Limite de uso por usuário ou por empresa.
// 1ª barreira: na memória do servidor (rápida, mas cada servidor da Vercel tem a sua).
// 2ª barreira (limitar): contador no Firestore, compartilhado por todos os servidores, por hora cheia.
import { createHash } from 'crypto';
import { getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { registrarEvento } from './seguranca';

const usos = new Map();

export function limiteExcedido(chave, maxPorHora) {
  const agora = Date.now();
  const janela = 60 * 60 * 1000;
  const lista = (usos.get(chave) || []).filter((t) => agora - t < janela);
  lista.push(agora);
  usos.set(chave, lista);
  if (usos.size > 20000) usos.clear(); // não deixa a memória crescer sem fim
  return lista.length > maxPorHora;
}

// Devolve true quando passou do limite. Se o banco falhar, não bloqueia o cliente (fica só a 1ª barreira).
export async function limitar(chave, maxPorHora) {
  if (limiteExcedido(chave, maxPorHora)) { registrarEvento('limite'); return true; }
  const db = getApps().length ? getFirestore(getApps()[0]) : null;
  if (!db) return false;
  const hora = Math.floor(Date.now() / 3600000);
  const id = createHash('sha256').update(chave).digest('hex').slice(0, 32) + '_' + hora;
  const ref = db.collection('limites').doc(id);
  try {
    const n = await db.runTransaction(async (t) => {
      const d = await t.get(ref);
      const v = (d.exists ? Number(d.data().n) || 0 : 0) + 1;
      t.set(ref, { n: v, hora, expiraEm: new Date((hora + 2) * 3600000) });
      return v;
    });
    if (n > maxPorHora) { registrarEvento('limite'); return true; }
  } catch (e) {
    console.warn('Limite de uso:', e.message);
  }
  return false;
}

// Apaga os contadores de horas que já passaram (chamado pela rotina diária)
export async function limparLimites(db) {
  if (!db) return 0;
  const antes = Math.floor(Date.now() / 3600000) - 48;
  let apagados = 0;
  for (let i = 0; i < 20; i++) {
    const snap = await db.collection('limites').where('hora', '<', antes).limit(400).get();
    if (snap.empty) break;
    const lote = db.batch();
    snap.docs.forEach((d) => lote.delete(d.ref));
    await lote.commit();
    apagados += snap.size;
  }
  return apagados;
}
