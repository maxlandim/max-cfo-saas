import { NextResponse } from 'next/server';
import { adminConfigurado, adminAuth, adminDb, emailsAdmin, usuarioDaRequisicao } from '../../../../lib/firebaseAdmin';
import { DIAS_DE_TESTE, STATUS_ATIVOS, PLANOS, FUNDADOR, MESES_PAGOS_NO_ANUAL } from '../../../../lib/plans';
import { hojeBrasil } from '../../../../lib/lembretes';

export const dynamic = 'force-dynamic';

// Números do negócio para o painel do administrador: contas, testes, assinaturas e visitas do site.
export async function GET(req) {
  if (!adminConfigurado) return NextResponse.json({ error: 'O servidor ainda não tem a FIREBASE_SERVICE_ACCOUNT.' }, { status: 503 });
  const eu = await usuarioDaRequisicao(req);
  if (!eu) return NextResponse.json({ error: 'Faça login novamente.' }, { status: 401 });
  if (!emailsAdmin().includes(String(eu.email || '').toLowerCase())) return NextResponse.json({ error: 'Esta área é só para administradores.' }, { status: 403 });

  try {
    // Contas (até 5.000)
    const contas = [];
    let token;
    for (let i = 0; i < 5; i++) {
      const r = await adminAuth.listUsers(1000, token);
      contas.push(...r.users);
      token = r.pageToken;
      if (!token) break;
    }
    const [subs, espacos] = await Promise.all([
      adminDb.collection('subscriptions').get(),
      adminDb.collection('workspaces').select('owner', 'updatedAt').get(),
    ]);
    const assinatura = {};
    subs.forEach((d) => { assinatura[d.id] = d.data(); });
    const ultimaAlteracao = {}, empresas = {};
    espacos.forEach((d) => {
      const x = d.data(); const dono = x.owner || d.id.split('__')[0];
      empresas[dono] = (empresas[dono] || 0) + 1;
      if (x.updatedAt && (!ultimaAlteracao[dono] || x.updatedAt > ultimaAlteracao[dono])) ultimaAlteracao[dono] = x.updatedAt;
    });

    const admins = emailsAdmin(), agora = Date.now();
    const lista = contas.map((u) => {
      const email = (u.email || '').toLowerCase();
      const criado = new Date(u.metadata.creationTime).getTime();
      const fimTeste = criado + DIAS_DE_TESTE * 864e5;
      const s = assinatura[u.uid] || null;
      let situacao;
      if (admins.includes(email)) situacao = 'admin';
      else if (s && s.status === 'trialing') situacao = 'teste_com_cartao';
      else if (s && STATUS_ATIVOS.includes(s.status)) situacao = 'assinante';
      else if (s && s.status === 'past_due') situacao = 'pagamento_pendente';
      else if (agora < fimTeste) situacao = 'teste';
      else situacao = s && s.status === 'canceled' ? 'cancelou' : 'teste_acabou';
      return {
        email, nome: u.displayName || '', criadoEm: new Date(criado).toISOString(),
        ultimoLogin: u.metadata.lastSignInTime ? new Date(u.metadata.lastSignInTime).toISOString() : null,
        ultimaAlteracao: ultimaAlteracao[u.uid] || null, empresas: empresas[u.uid] || 0,
        emailConfirmado: !!u.emailVerified, provedor: (u.providerData[0] || {}).providerId || 'password',
        fimTeste: new Date(fimTeste).toISOString(), situacao,
        plano: s ? s.plan || null : null, status: s ? s.status : null, renovaEm: s ? s.currentPeriodEnd || null : null,
        cancelaNoFim: !!(s && s.cancelAtPeriodEnd),
        fundador: !!(s && s.fundador), periodo: (s && s.periodo) || 'mensal',
        // valor que a conta paga por mês (anual dividido por 12; fundador com o preço de fundador)
        valorMensal: s && PLANOS[s.plan] ? ((s.fundador ? PLANOS[s.plan].fundador : PLANOS[s.plan].valor) / 100) * ((s.periodo === 'anual') ? MESES_PAGOS_NO_ANUAL / 12 : 1) : 0,
        robo: /@exemplo\.com$/.test(email),
      };
    }).sort((a, b) => (a.criadoEm < b.criadoEm ? 1 : -1));

    // Visitas dos últimos 30 dias
    const hoje = hojeBrasil();
    const ini = new Date(Date.parse(hoje + 'T12:00:00Z') - 29 * 864e5).toISOString().slice(0, 10);
    const snap = await adminDb.collection('estatisticas').where('dia', '>=', ini).get();
    const porDia = {};
    snap.forEach((d) => { const x = d.data(); porDia[x.dia] = x; });
    const dias = [];
    for (let i = 29; i >= 0; i--) {
      const dia = new Date(Date.parse(hoje + 'T12:00:00Z') - i * 864e5).toISOString().slice(0, 10);
      const x = porDia[dia] || {};
      dias.push({ dia, visitas: x.visitas || 0, visitantes: x.visitantes || 0, cadastros: x.cadastros || 0, paginas: x.paginas || {}, origens: x.origens || {}, cadastrosPorOrigem: x.cadastrosPorOrigem || {} });
    }

    const precos = Object.fromEntries(Object.entries(PLANOS).map(([k, v]) => [k, v.valor / 100]));
    const fundadores = lista.filter((c) => c.fundador).length;
    return NextResponse.json({ geradoEm: new Date().toISOString(), hoje, contas: lista, dias, precos, diasDeTeste: DIAS_DE_TESTE, fundador: { usados: fundadores, vagas: FUNDADOR.vagas } });
  } catch (e) {
    console.error('Resumo do administrador:', e);
    return NextResponse.json({ error: 'Não consegui montar o resumo agora.' }, { status: 500 });
  }
}
