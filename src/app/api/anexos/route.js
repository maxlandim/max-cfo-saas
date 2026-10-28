import { NextResponse } from 'next/server';
import { adminConfigurado, adminDb, usuarioDaRequisicao } from '../../../lib/firebaseAdmin';
import { donoDoEspaco } from '../../../lib/asaasCliente';
import { limiteExcedido } from '../../../lib/limite';
import { ErroAnexo, LIMITE_ANEXO, lerAnexo, salvarAnexo } from '../../../lib/anexos';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Anexos dos lançamentos guardados no próprio servidor (src/lib/anexos.js).
// POST (multipart: wsId, arquivo)  envia um anexo; só o dono da empresa ou a equipe com permissão de edição.
// GET ?ws=&f=&t=                    abre o anexo pelo link assinado que o POST devolveu.

async function podeGravar(user, wsId) {
  if (donoDoEspaco(user.uid, wsId)) return true;
  const email = String(user.email || '').toLowerCase();
  if (!email || !user.email_verified || !adminDb) return false;
  const c = (await adminDb.collection('convites').doc(email).collection('espacos').doc(wsId).get()).data();
  return !!(c && ['analista', 'gestor'].includes(c.papel));
}

export async function POST(req) {
  if (!adminConfigurado) return NextResponse.json({ error: 'Servidor sem configuração.' }, { status: 503 });
  const user = await usuarioDaRequisicao(req);
  if (!user) return NextResponse.json({ error: 'Faça login novamente.' }, { status: 401 });
  if (limiteExcedido('anexo:' + user.uid, 300)) return NextResponse.json({ error: 'Muitos anexos em pouco tempo. Tente de novo daqui a pouco.' }, { status: 429 });
  const tamanho = Number(req.headers.get('content-length') || 0);
  if (tamanho > LIMITE_ANEXO + 64 * 1024) return NextResponse.json({ error: 'O anexo precisa ter até 10 MB.' }, { status: 413 });
  let form;
  try { form = await req.formData(); } catch { return NextResponse.json({ error: 'Envio inválido.' }, { status: 400 }); }
  const wsId = String(form.get('wsId') || '');
  const arq = form.get('arquivo');
  if (!arq || typeof arq === 'string') return NextResponse.json({ error: 'Escolha um arquivo.' }, { status: 400 });
  try {
    if (!(await podeGravar(user, wsId))) return NextResponse.json({ error: 'Sem permissão para anexar arquivos nesta empresa.' }, { status: 403 });
    const dados = Buffer.from(await arq.arrayBuffer());
    const r = await salvarAnexo(wsId, arq.name || 'anexo', dados);
    return NextResponse.json({ url: r.url, tamanho: r.tamanho });
  } catch (e) {
    if (e instanceof ErroAnexo) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error('Anexos POST', e && e.message);
    return NextResponse.json({ error: 'Não consegui guardar o anexo agora.' }, { status: 500 });
  }
}

export async function GET(req) {
  const u = new URL(req.url);
  try {
    const a = await lerAnexo(u.searchParams.get('ws') || '', u.searchParams.get('f') || '', u.searchParams.get('t') || '');
    const nome = a.nome.replace(/"/g, '');
    return new NextResponse(a.dados, {
      headers: {
        'Content-Type': a.tipo,
        'Content-Disposition': (a.abre ? 'inline' : 'attachment') + '; filename="' + nome + '"',
        'Cache-Control': 'private, max-age=86400',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'no-referrer',
      },
    });
  } catch (e) {
    const st = e instanceof ErroAnexo ? e.status : 500;
    return new NextResponse(st === 404 ? 'Anexo não encontrado.' : 'Não consegui abrir o anexo agora.', { status: st, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }
}
