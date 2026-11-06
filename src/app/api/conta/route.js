import { NextResponse } from 'next/server';
import { adminConfigurado, adminAuth, adminDb, usuarioDaRequisicao } from '../../../lib/firebaseAdmin';
import { limitar } from '../../../lib/limite';
import { pedirExclusao, DIAS_PARA_APAGAR } from '../../../lib/exclusao';

export const dynamic = 'force-dynamic';

// POST { acao: 'excluir', confirmacao: 'EXCLUIR' }: o cliente pede a exclusão da própria conta.
// Exige login feito há pouco (até 10 minutos), para ninguém excluir a conta de outra pessoa num aparelho esquecido aberto.
export async function POST(req) {
  if (!adminConfigurado) return NextResponse.json({ error: 'Servidor sem configuração. Fale com o suporte no WhatsApp.' }, { status: 503 });
  const user = await usuarioDaRequisicao(req);
  if (!user) return NextResponse.json({ error: 'Faça login novamente.' }, { status: 401 });
  if (await limitar('conta:' + user.uid, 5)) return NextResponse.json({ error: 'Muitas tentativas. Tente de novo em 1 hora.' }, { status: 429 });
  let b = {};
  try { b = await req.json(); } catch { /* corpo vazio */ }
  if (b.acao !== 'excluir' || String(b.confirmacao || '').trim().toUpperCase() !== 'EXCLUIR') {
    return NextResponse.json({ error: 'Digite EXCLUIR para confirmar.' }, { status: 400 });
  }
  const minutosDesdeLogin = (Date.now() / 1000 - Number(user.auth_time || 0)) / 60;
  if (minutosDesdeLogin > 10) {
    return NextResponse.json({ error: 'Por segurança, saia, entre de novo e peça a exclusão logo em seguida.', loginRecente: true }, { status: 401 });
  }
  try {
    const r = await pedirExclusao(adminDb, adminAuth, user.uid, user.email);
    return NextResponse.json({ ok: true, ...r, dias: DIAS_PARA_APAGAR });
  } catch (e) {
    console.error('Excluir conta:', e.message);
    return NextResponse.json({ error: e.status ? e.message : 'Não consegui concluir agora. Tente de novo ou fale no WhatsApp.' }, { status: e.status || 500 });
  }
}
