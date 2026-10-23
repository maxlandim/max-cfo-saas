import { NextResponse } from 'next/server';
import { adminConfigurado, adminAuth, adminDb, emailsAdmin, usuarioDaRequisicao } from '../../../../lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

const paraBuffer = (v) => (Buffer.isBuffer(v) ? v : v && typeof v.toUint8Array === 'function' ? Buffer.from(v.toUint8Array()) : Buffer.from(v || []));

async function admin(req) {
  if (!adminConfigurado) return [null, NextResponse.json({ error: 'Servidor sem FIREBASE_SERVICE_ACCOUNT.' }, { status: 503 })];
  const eu = await usuarioDaRequisicao(req);
  if (!eu) return [null, NextResponse.json({ error: 'Faça login novamente.' }, { status: 401 })];
  if (!emailsAdmin().includes(String(eu.email || '').toLowerCase())) return [null, NextResponse.json({ error: 'Esta área é só para administradores.' }, { status: 403 })];
  return [eu, null];
}

// GET ?email=<e-mail da conta>: lista os backups das empresas dessa conta (mais novos primeiro)
export async function GET(req) {
  const [, erro] = await admin(req);
  if (erro) return erro;
  const email = new URL(req.url).searchParams.get('email') || '';
  let uid;
  try { uid = (await adminAuth.getUserByEmail(email.trim().toLowerCase())).uid; } catch { return NextResponse.json({ error: 'Conta não encontrada.' }, { status: 404 }); }
  const snap = await adminDb.collection('backups').where('owner', '==', uid).get();
  const lista = snap.docs.map((d) => { const x = d.data(); return { id: d.id, wsId: x.wsId, dia: x.dia, bytes: x.bytes, origemAtualizadaEm: x.origemAtualizadaEm, criadoEm: x.criadoEm, motivo: x.motivo || 'diario' }; })
    .sort((a, b) => (a.criadoEm < b.criadoEm ? 1 : -1));
  return NextResponse.json({ uid, backups: lista });
}

// POST { id }: restaura o backup na empresa (guarda antes uma cópia do estado atual)
export async function POST(req) {
  const [eu, erro] = await admin(req);
  if (erro) return erro;
  let body = {};
  try { body = await req.json(); } catch {}
  const ref = adminDb.collection('backups').doc(String(body.id || ''));
  const b = await ref.get();
  if (!b.exists) return NextResponse.json({ error: 'Backup não encontrado.' }, { status: 404 });
  const x = b.data();
  let z;
  if (x.partes) {
    const ps = await ref.collection('partes').get();
    z = Buffer.concat(ps.docs.sort((p, q) => Number(p.id) - Number(q.id)).map((p) => paraBuffer(p.data().z)));
  } else z = paraBuffer(x.dataZ);

  const ws = adminDb.collection('workspaces').doc(x.wsId);
  const agora = new Date().toISOString();
  // Cópia do estado atual antes de sobrescrever
  const atual = (await ws.get()).data();
  if (atual && atual.formato === 2 && atual.dataZ) {
    await adminDb.collection('backups').doc(`${x.wsId}__antes-${Date.now()}`).set({ wsId: x.wsId, owner: atual.owner, dia: agora.slice(0, 10), origemAtualizadaEm: atual.updatedAt || null, bytes: paraBuffer(atual.dataZ).length, criadoEm: agora, dataZ: atual.dataZ, partes: 0, motivo: 'antes da restauração' });
  } else if (atual && atual.data) {
    const { gzipSync } = await import('zlib');
    const zz = gzipSync(Buffer.from(atual.data, 'utf8'));
    if (zz.length <= 900 * 1024) await adminDb.collection('backups').doc(`${x.wsId}__antes-${Date.now()}`).set({ wsId: x.wsId, owner: atual.owner, dia: agora.slice(0, 10), origemAtualizadaEm: atual.updatedAt || null, bytes: zz.length, criadoEm: agora, dataZ: zz, partes: 0, motivo: 'antes da restauração' });
  }
  const { FieldValue } = await import('firebase-admin/firestore');
  if (z.length <= 900 * 1024) {
    await ws.set({ owner: x.owner, updatedAt: agora, formato: 2, dataZ: z, data: FieldValue.delete(), partes: FieldValue.delete(), versao: FieldValue.delete(), restauradoDe: b.id }, { merge: true });
  } else {
    const versao = 'r' + Date.now().toString(36);
    const n = Math.ceil(z.length / (900 * 1024));
    const lote = adminDb.batch();
    for (let i = 0; i < n; i++) lote.set(ws.collection('partes').doc(`${versao}_${i}`), { z: z.subarray(i * 900 * 1024, (i + 1) * 900 * 1024), owner: x.owner });
    lote.set(ws, { owner: x.owner, updatedAt: agora, formato: 2, partes: n, versao, dataZ: FieldValue.delete(), data: FieldValue.delete(), restauradoDe: b.id }, { merge: true });
    await lote.commit();
  }
  console.log('Backup restaurado', b.id, 'por', eu.email);
  return NextResponse.json({ ok: true, wsId: x.wsId, restauradoDe: b.id });
}
