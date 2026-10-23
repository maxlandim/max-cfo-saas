import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '../../../lib/firebaseAdmin';
import { limiteExcedido } from '../../../lib/limite';
import { hojeBrasil } from '../../../lib/lembretes';
import { ROBOS } from '../../../lib/estatisticas';

export const dynamic = 'force-dynamic';

// Recebe erros do navegador (componente RegistroErros) e soma por dia em errosCliente/{dia}_{hash}.
// Não guarda IP, e-mail nem dados da empresa. Só o servidor lê (painel do administrador).
export async function POST(req) {
  if (!adminDb) return NextResponse.json({ ok: false }, { status: 202 });
  const ua = req.headers.get('user-agent') || '';
  if (ROBOS.test(ua)) return NextResponse.json({ ok: true });
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'sem-ip';
  if (limiteExcedido('erro:' + ip, 60)) return NextResponse.json({ ok: false }, { status: 429 });
  let b = {};
  try { b = JSON.parse((await req.text()).slice(0, 4000)); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }
  const mensagem = String(b.mensagem || '').slice(0, 300);
  if (!mensagem) return NextResponse.json({ ok: false }, { status: 400 });
  // e-mails e números longos (CPF, valores) saem da mensagem antes de gravar
  const limpar = (t) => String(t || '').replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '<e-mail>').replace(/\d{6,}/g, '<n>');
  const pagina = String(b.pagina || '').replace(/[^\w/-]/g, '').slice(0, 80);
  const dia = hojeBrasil();
  const hash = createHash('sha1').update(limpar(mensagem) + '|' + pagina).digest('hex').slice(0, 16);
  const navegador = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Outro';
  const celular = /Mobi|Android|iPhone/.test(ua);
  try {
    await adminDb.collection('errosCliente').doc(`${dia}_${hash}`).set({
      dia, mensagem: limpar(mensagem), pilha: limpar(b.pilha).slice(0, 1500), pagina, tipo: b.tipo === 'promessa' ? 'promessa' : 'erro',
      vezes: FieldValue.increment(1), ultimaVez: new Date().toISOString(),
      navegadores: { [navegador + (celular ? ' (celular)' : '')]: FieldValue.increment(1) },
    }, { merge: true });
  } catch (e) { console.error('Registro de erro:', e.message); }
  return NextResponse.json({ ok: true });
}
