import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '../../../lib/firebaseAdmin';
import { limiteExcedido } from '../../../lib/limite';
import { hojeBrasil } from '../../../lib/lembretes';

export const dynamic = 'force-dynamic';

// O navegador avisa aqui quando a política de segurança (CSP, em next.config.mjs) bloqueia algo.
// Entra na lista "Erros no navegador dos clientes" do /admin. Guarda só o tipo e o site bloqueado (sem IP nem usuário).
// Se aparecer um serviço legítimo bloqueado, inclua o endereço na CSP; se aparecer um site estranho, pode ser ataque.
export async function POST(req) {
  if (!adminDb) return new NextResponse(null, { status: 204 });
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'sem-ip';
  if (limiteExcedido('csp:' + ip, 30)) return new NextResponse(null, { status: 204 });
  let r = {};
  try { const b = JSON.parse((await req.text()).slice(0, 8000)); r = b['csp-report'] || b; } catch { return new NextResponse(null, { status: 204 }); }
  const diretiva = String(r['effective-directive'] || r['violated-directive'] || '').split(' ')[0].slice(0, 40);
  let bloqueado = String(r['blocked-uri'] || '');
  try { bloqueado = /^https?:/.test(bloqueado) ? new URL(bloqueado).host : bloqueado.slice(0, 40); } catch { bloqueado = bloqueado.slice(0, 40); }
  // Extensões do navegador geram ruído que não é do site
  if (!diretiva || /^(chrome|moz|safari|ms-browser)-extension/.test(bloqueado)) return new NextResponse(null, { status: 204 });
  let pagina = '';
  try { pagina = new URL(String(r['document-uri'] || '')).pathname.replace(/[^\w/-]/g, '').slice(0, 80); } catch { /* sem página */ }
  const mensagem = `Segurança (CSP) bloqueou ${diretiva}: ${bloqueado || 'inline'}`;
  const dia = hojeBrasil();
  const hash = createHash('sha1').update(mensagem + '|' + pagina).digest('hex').slice(0, 16);
  try {
    await adminDb.collection('errosCliente').doc(`${dia}_${hash}`).set({
      dia, mensagem, pilha: '', pagina, tipo: 'csp', vezes: FieldValue.increment(1), ultimaVez: new Date().toISOString(),
    }, { merge: true });
  } catch (e) { console.warn('CSP:', e.message); }
  return new NextResponse(null, { status: 204 });
}
