import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '../../../lib/firebaseAdmin';
import { limiteExcedido } from '../../../lib/limite';
import { hojeBrasil } from '../../../lib/lembretes';
import { PAGINAS, origemValida, ROBOS, diaId, ETAPAS_FUNIL } from '../../../lib/estatisticas';

export const dynamic = 'force-dynamic';

// Conta uma visita ou um cadastro. Não guarda IP, e-mail nem identificador: só soma +1 nos totais do dia.
export async function POST(req) {
  if (!adminDb) return NextResponse.json({ ok: false }, { status: 202 });
  const ua = req.headers.get('user-agent') || '';
  if (ROBOS.test(ua)) return NextResponse.json({ ok: true, ignorado: 'robo' });
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'sem-ip';
  if (limiteExcedido('visita:' + ip, 120)) return NextResponse.json({ ok: false }, { status: 429 });

  let b = {};
  try { b = JSON.parse(await req.text()); } catch {}
  const origem = origemValida(b.origem);
  const dia = hojeBrasil();
  const ref = adminDb.collection('estatisticas').doc(diaId(dia));
  const inc = FieldValue.increment(1);
  try {
    if (b.evento === 'funil') {
      const etapa = ETAPAS_FUNIL.includes(b.etapa) ? b.etapa : '';
      if (!etapa) return NextResponse.json({ ok: true, ignorado: 'etapa' });
      const erro = etapa === 'erro' ? (String(b.erro || '').replace(/^auth\//, '').replace(/[^a-z0-9-]/gi, '').slice(0, 40) || 'outro') : '';
      await ref.set({ dia, funil: { [etapa]: inc }, ...(erro ? { funilErros: { [erro]: inc } } : {}) }, { merge: true });
    } else if (b.evento === 'cadastro') {
      await ref.set({ dia, cadastros: inc, cadastrosPorOrigem: { [origem]: inc } }, { merge: true });
    } else {
      const pagina = PAGINAS[String(b.pagina || '').replace(/\/+$/, '') || '/'];
      if (!pagina) return NextResponse.json({ ok: true, ignorado: 'pagina' });
      await ref.set({
        dia, visitas: inc, paginas: { [pagina]: inc },
        ...(b.novo ? { visitantes: inc, origens: { [origem]: inc } } : {}),
      }, { merge: true });
    }
  } catch (e) {
    console.error('Contador de visitas:', e.message);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
