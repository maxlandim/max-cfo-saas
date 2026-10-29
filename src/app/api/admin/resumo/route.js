import { NextResponse } from 'next/server';
import { adminConfigurado, adminAuth, adminDb, emailsAdmin, emailsCortesia, usuarioDaRequisicao } from '../../../../lib/firebaseAdmin';
import { DIAS_DE_TESTE, PLANOS, FUNDADOR, MESES_PAGOS_NO_ANUAL } from '../../../../lib/plans';
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

    const admins = emailsAdmin(), cortesias = emailsCortesia(), agora = Date.now();
    const lista = contas.map((u) => {
      const email = (u.email || '').toLowerCase();
      const criado = new Date(u.metadata.creationTime).getTime();
      const fimTeste = criado + DIAS_DE_TESTE * 864e5;
      const s = assinatura[u.uid] || null;
      let situacao;
      const ativa = !!(s && s.asaasSubscriptionId && s.statusAsaas === 'ACTIVE');
      const pago = !!(s && s.pagoAte && Date.parse(s.pagoAte) > agora);
      const fatura = s && s.faturaPendente;
      const vencida = !!(fatura && Date.parse(fatura.vencimento + 'T23:59:59-03:00') < agora);
      if (admins.includes(email)) situacao = 'admin';
      else if (cortesias.includes(email)) situacao = 'cortesia';
      else if (ativa && agora < fimTeste && !pago) situacao = 'teste_com_cartao';
      else if (ativa && vencida && !pago) situacao = 'pagamento_pendente';
      else if (pago || ativa) situacao = 'assinante';
      else if (agora < fimTeste) situacao = 'teste';
      else situacao = s && s.asaasSubscriptionId ? 'cancelou' : 'teste_acabou';
      return {
        email, nome: u.displayName || '', criadoEm: new Date(criado).toISOString(),
        ultimoLogin: u.metadata.lastSignInTime ? new Date(u.metadata.lastSignInTime).toISOString() : null,
        ultimaAlteracao: ultimaAlteracao[u.uid] || null, empresas: empresas[u.uid] || 0,
        emailConfirmado: !!u.emailVerified, provedor: (u.providerData[0] || {}).providerId || 'password',
        fimTeste: new Date(fimTeste).toISOString(), situacao,
        ...(() => {
          const plano = (s && s.plano) || null;
          const periodo = (s && s.periodo) || 'mensal';
          const fundador = !!(s && s.fundador);
          return {
            plano, periodo, fundador, forma: s && s.forma ? (s.forma === 'cartao' ? 'cartão' : 'pix/boleto') : null,
            status: s ? s.statusAsaas || null : null, renovaEm: ativa ? s.proximoVencimento || null : (s && s.pagoAte) || null,
            cancelaNoFim: !!(s && s.asaasSubscriptionId && !ativa),
            // valor que a conta paga por mês (anual dividido por 12; fundador com o preço de fundador)
            valorMensal: PLANOS[plano] ? ((fundador ? PLANOS[plano].fundador : PLANOS[plano].valor) / 100) * (periodo === 'anual' ? MESES_PAGOS_NO_ANUAL / 12 : 1) : 0,
          };
        })(),
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
      dias.push({ dia, visitas: x.visitas || 0, visitantes: x.visitantes || 0, cadastros: x.cadastros || 0, paginas: x.paginas || {}, origens: x.origens || {}, cadastrosPorOrigem: x.cadastrosPorOrigem || {}, funil: x.funil || {}, funilErros: x.funilErros || {} });
    }

    // Erros no navegador dos clientes (últimos 7 dias) e último backup
    const ini7 = new Date(Date.parse(hoje + 'T12:00:00Z') - 6 * 864e5).toISOString().slice(0, 10);
    let erros = [], ultimoBackup = null;
    try {
      const e = await adminDb.collection('errosCliente').where('dia', '>=', ini7).get();
      erros = e.docs.map((d) => d.data()).sort((a, b) => (b.vezes || 0) - (a.vezes || 0)).slice(0, 50)
        .map((x) => ({ dia: x.dia, mensagem: x.mensagem, pagina: x.pagina, vezes: x.vezes || 0, ultimaVez: x.ultimaVez, navegadores: x.navegadores || {}, pilha: (x.pilha || '').slice(0, 600) }));
    } catch (e) { console.warn('Erros do navegador:', e.message); }
    try {
      const b = await adminDb.collection('backupsIndice').orderBy('ultimoDia', 'desc').limit(1).get();
      ultimoBackup = b.empty ? null : b.docs[0].data().ultimoDia;
    } catch (e) { console.warn('Último backup:', e.message); }

    const precos = Object.fromEntries(Object.entries(PLANOS).map(([k, v]) => [k, v.valor / 100]));
    const fundadores = lista.filter((c) => c.fundador).length;
    return NextResponse.json({ geradoEm: new Date().toISOString(), hoje, contas: lista, dias, precos, erros, ultimoBackup, diasDeTeste: DIAS_DE_TESTE, fundador: { usados: fundadores, vagas: FUNDADOR.vagas } });
  } catch (e) {
    console.error('Resumo do administrador:', e);
    return NextResponse.json({ error: 'Não consegui montar o resumo agora.' }, { status: 500 });
  }
}
