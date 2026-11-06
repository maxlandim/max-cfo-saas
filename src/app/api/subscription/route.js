import { NextResponse } from 'next/server';
import { adminConfigurado, adminDb, usuarioDaRequisicao } from '../../../lib/firebaseAdmin';
import { statusDoUsuario, sincronizarAssinatura } from '../../../lib/assinatura';
import { asaasConfigurado } from '../../../lib/asaas';

export const dynamic = 'force-dynamic';

// GET: diz se o usuário logado pode usar o painel (assinatura em dia, teste grátis ou admin).
export async function GET(req) {
  if (!adminConfigurado) {
    // Sem a FIREBASE_SERVICE_ACCOUNT o servidor não consegue conferir a assinatura. Em produção o painel fica
    // fechado (antes ficava aberto para todos, sem pagar). No computador (next dev) continua liberado para testes;
    // PERMITIR_SEM_CONFIGURACAO=1 libera de propósito, por exemplo numa prévia sem as variáveis.
    if (process.env.NODE_ENV === 'production' && process.env.PERMITIR_SEM_CONFIGURACAO !== '1') {
      console.error('FIREBASE_SERVICE_ACCOUNT ausente: painel fechado até configurar o servidor.');
      return NextResponse.json({ error: 'O sistema está em manutenção. Tente de novo em alguns minutos ou fale no WhatsApp.' }, { status: 503 });
    }
    return NextResponse.json({ acesso: true, motivo: 'configuracao_pendente' });
  }
  const user = await usuarioDaRequisicao(req);
  if (!user) return NextResponse.json({ error: 'Faça login novamente.' }, { status: 401 });
  try {
    return NextResponse.json(await statusDoUsuario(user));
  } catch (e) {
    console.error('Erro ao consultar assinatura:', e);
    return NextResponse.json({ error: 'Não foi possível verificar a assinatura agora.' }, { status: 500 });
  }
}

// POST: logo depois do checkout, confere no Asaas se a assinatura já foi criada (sem esperar o webhook).
export async function POST(req) {
  if (!adminConfigurado || !asaasConfigurado()) return NextResponse.json({ error: 'Pagamentos ainda não configurados.' }, { status: 503 });
  const user = await usuarioDaRequisicao(req);
  if (!user) return NextResponse.json({ error: 'Faça login novamente.' }, { status: 401 });
  try {
    const sub = (await adminDb.collection('subscriptions').doc(user.uid).get()).data() || {};
    if (sub.asaasCustomerId) await sincronizarAssinatura(user.uid, sub.asaasCustomerId);
    return NextResponse.json(await statusDoUsuario(user));
  } catch (e) {
    console.error('Erro ao confirmar assinatura:', e.message);
    return NextResponse.json({ error: 'Não foi possível confirmar agora.' }, { status: 500 });
  }
}
