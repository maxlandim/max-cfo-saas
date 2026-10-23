// Lê os dados de uma empresa no servidor (Firebase Admin), em qualquer formato (veja src/lib/espaco.js).
import { gunzipSync } from 'zlib';

const buf = (v) => (Buffer.isBuffer(v) ? v : v && typeof v.toUint8Array === 'function' ? Buffer.from(v.toUint8Array()) : Buffer.from(v || []));

export function temDados(d) {
  return Boolean(d && (d.data || (d.formato === 2 && (d.dataZ || d.partes))));
}

export async function estadoDoEspaco(adminDb, wsId, d) {
  if (!d) return null;
  if (d.formato === 2 && d.dataZ) return JSON.parse(gunzipSync(buf(d.dataZ)).toString('utf8'));
  if (d.formato === 2 && d.partes) {
    const refs = Array.from({ length: d.partes }, (_, i) => adminDb.collection('workspaces').doc(wsId).collection('partes').doc(`${d.versao}_${i}`));
    const partes = await adminDb.getAll(...refs);
    if (partes.some((p) => !p.exists)) throw new Error('Partes dos dados incompletas');
    return JSON.parse(gunzipSync(Buffer.concat(partes.map((p) => buf(p.data().z)))).toString('utf8'));
  }
  return d.data ? JSON.parse(d.data) : null;
}
