import { NextResponse } from 'next/server';
import { adminConfigurado, adminDb, emailsAdmin, usuarioDaRequisicao } from '../../../../lib/firebaseAdmin';
import { ativarNotaFiscal, configNotaFiscal } from '../../../../lib/assinatura';

export const dynamic = 'force-dynamic';

// POST: liga a nota fiscal automática nas assinaturas ativas que já existem (depois de configurar as variáveis NFSE_*)
export async function POST(req) {
  if (!adminConfigurado) return NextResponse.json({ error: 'Servidor sem configuração.' }, { status: 503 });
  const eu = await usuarioDaRequisicao(req);
  if (!eu) return NextResponse.json({ error: 'Faça login novamente.' }, { status: 401 });
  if (!emailsAdmin().includes(String(eu.email || '').toLowerCase())) return NextResponse.json({ error: 'Só para administradores.' }, { status: 403 });
  if (!configNotaFiscal()) return NextResponse.json({ error: 'Configure no servidor NFSE_ATIVA=1 e o serviço (NFSE_SERVICO_ID ou NFSE_SERVICO_CODIGO).' }, { status: 400 });
  const snap = await adminDb.collection('subscriptions').where('statusAsaas', '==', 'ACTIVE').get();
  const r = { total: snap.size, ativadas: 0, erros: [] };
  for (const d of snap.docs) {
    const x = await ativarNotaFiscal(d.data().asaasSubscriptionId);
    if (x.ativo) r.ativadas++; else if (x.erro) r.erros.push(x.erro);
  }
  return NextResponse.json(r);
}
