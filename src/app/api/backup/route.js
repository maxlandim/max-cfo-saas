import { NextResponse } from 'next/server';
import { gzipSync, gunzipSync } from 'zlib';
import { adminConfigurado, adminDb } from '../../../lib/firebaseAdmin';
import { hojeBrasil } from '../../../lib/lembretes';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Backup diário dos dados das empresas: copia cada workspaces/{id} que mudou desde o último backup para
// backups/{id}__{dia} (comprimido) e apaga cópias com mais de DIAS_GUARDADOS dias. Só o servidor lê ou escreve.
// GET /api/backup com "Authorization: Bearer <CRON_SECRET>" (ou ?chave=<CRON_SECRET>), uma vez por dia.
const DIAS_GUARDADOS = 30;
const LIMITE_DOC = 900 * 1024;
const PARTE = 900 * 1024;

const paraBuffer = (v) => (Buffer.isBuffer(v) ? v : v && typeof v.toUint8Array === 'function' ? Buffer.from(v.toUint8Array()) : Buffer.from(v || []));

// Conteúdo comprimido (gzip) da empresa, em qualquer formato de gravação
async function comprimidoDe(wsId, d) {
  if (d.formato === 2 && d.dataZ) return paraBuffer(d.dataZ);
  if (d.formato === 2 && d.partes) {
    const refs = Array.from({ length: d.partes }, (_, i) => adminDb.collection('workspaces').doc(wsId).collection('partes').doc(`${d.versao}_${i}`));
    const partes = await adminDb.getAll(...refs);
    if (partes.some((p) => !p.exists)) throw new Error('partes incompletas');
    return Buffer.concat(partes.map((p) => paraBuffer(p.data().z)));
  }
  if (d.data) return gzipSync(Buffer.from(d.data, 'utf8'));
  return null;
}

export async function GET(req) {
  const segredo = process.env.CRON_SECRET;
  const url = new URL(req.url);
  const h = req.headers.get('authorization') || '';
  const dado = h.startsWith('Bearer ') ? h.slice(7) : url.searchParams.get('chave');
  if (!segredo || dado !== segredo) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  if (!adminConfigurado) return NextResponse.json({ error: 'Configure FIREBASE_SERVICE_ACCOUNT.' }, { status: 503 });

  const dia = hojeBrasil();
  const r = { dia, empresas: 0, copiadas: 0, iguais: 0, apagadas: 0, bytes: 0, erros: [] };
  const espacos = await adminDb.collection('workspaces').get();
  for (const doc of espacos.docs) {
    const d = doc.data() || {};
    if (!d.owner) continue;
    r.empresas++;
    const indice = adminDb.collection('backupsIndice').doc(doc.id);
    try {
      const ult = (await indice.get()).data() || {};
      // não mudou desde o último backup (mas refaz a cada 20 dias, para sempre existir uma cópia recente)
      const recente = ult.ultimoDia && Date.parse(dia + 'T12:00:00Z') - Date.parse(ult.ultimoDia + 'T12:00:00Z') < 20 * 864e5;
      if (recente && ult.updatedAt && d.updatedAt && ult.updatedAt === d.updatedAt) { r.iguais++; continue; }
      const z = await comprimidoDe(doc.id, d);
      if (!z) continue;
      gunzipSync(z); // confere se o conteúdo é válido antes de guardar
      const destino = adminDb.collection('backups').doc(`${doc.id}__${dia}`);
      const base = { wsId: doc.id, owner: d.owner, dia, origemAtualizadaEm: d.updatedAt || null, bytes: z.length, criadoEm: new Date().toISOString() };
      if (z.length <= LIMITE_DOC) {
        await destino.set({ ...base, dataZ: z, partes: 0 });
      } else {
        const lote = adminDb.batch();
        const n = Math.ceil(z.length / PARTE);
        for (let i = 0; i < n; i++) lote.set(destino.collection('partes').doc(String(i)), { z: z.subarray(i * PARTE, (i + 1) * PARTE) });
        lote.set(destino, { ...base, partes: n });
        await lote.commit();
      }
      await indice.set({ ultimoDia: dia, updatedAt: d.updatedAt || null });
      r.copiadas++; r.bytes += z.length;
    } catch (e) {
      console.error('Backup', doc.id, e.message);
      r.erros.push(`${doc.id}: ${e.message}`);
    }
  }

  // Apaga cópias antigas
  try {
    const limite = new Date(Date.parse(dia + 'T12:00:00Z') - DIAS_GUARDADOS * 864e5).toISOString().slice(0, 10);
    const velhos = await adminDb.collection('backups').where('dia', '<', limite).limit(300).get();
    for (const v of velhos.docs) {
      if (v.data().partes) { const ps = await v.ref.collection('partes').get(); await Promise.all(ps.docs.map((p) => p.ref.delete())); }
      await v.ref.delete();
      r.apagadas++;
    }
  } catch (e) { r.erros.push('limpeza: ' + e.message); }

  return NextResponse.json(r);
}
