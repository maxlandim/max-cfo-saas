// E-mails automáticos durante o teste grátis (enviados pela tarefa diária /api/lembretes).
// Cada conta recebe cada e-mail no máximo uma vez (marcado em emailsTeste/{uid}).
import { createHmac } from 'crypto';

const ouro = '#C5A059', tinta = '#0B1220', cinza = '#5B6474';

export function linkSair(site, uid) {
  const t = createHmac('sha256', process.env.CRON_SECRET || 'sem-segredo').update(uid).digest('hex').slice(0, 24);
  return `${site}/api/emails/sair?u=${encodeURIComponent(uid)}&t=${t}`;
}
export function tokenSairValido(uid, t) {
  const certo = createHmac('sha256', process.env.CRON_SECRET || 'sem-segredo').update(String(uid || '')).digest('hex').slice(0, 24);
  return Boolean(t) && t === certo;
}

function moldura({ titulo, corpo, botao, link, site, uid }) {
  return `<div style="font-family:Arial,Helvetica,sans-serif;background:#F5F6F8;padding:24px 12px">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #E3E6EC">
<div style="background:${tinta};padding:18px 22px;color:#fff;font-weight:bold;font-size:17px">Landim Advisory</div>
<div style="padding:24px 22px;color:${tinta};font-size:15px;line-height:1.6">
<h1 style="font-size:21px;margin:0 0 12px">${titulo}</h1>
${corpo}
<p style="margin:22px 0 6px"><a href="${link}" style="display:inline-block;background:${ouro};color:${tinta};text-decoration:none;font-weight:bold;padding:13px 24px;border-radius:9px">${botao}</a></p>
<p style="color:${cinza};font-size:13px;margin-top:22px">Dúvidas? Responda este e-mail ou chame no WhatsApp (61) 99210-5889.</p>
</div></div>
<p style="text-align:center;color:#8A93A3;font-size:11.5px;margin-top:14px">Você recebe este e-mail porque criou uma conta na Landim Advisory. <a href="${linkSair(site, uid)}" style="color:#8A93A3">Não quero receber estes e-mails</a></p>
</div>`;
}

// Qual e-mail a conta deve receber hoje (ou null). dias = dias desde a criação da conta.
export function emailDoDia(dias, enviados, temAssinatura) {
  if (temAssinatura) return null;
  if (dias <= 2 && !enviados.boasVindas) return 'boasVindas';
  if (dias >= 3 && dias <= 4 && !enviados.dica) return 'dica';
  if (dias >= 6 && dias < 7 && !enviados.acabaAmanha) return 'acabaAmanha';
  if (dias >= 7 && dias <= 10 && !enviados.acabou) return 'acabou';
  return null;
}

export function montarEmailTeste(tipo, { nome, site, uid, fundador }) {
  const oi = nome ? `Olá, ${nome.split(' ')[0]}!` : 'Olá!';
  const utm = (c) => `utm_source=email&utm_campaign=${c}`;
  const preco = fundador ? '<p>E tem mais: os primeiros assinantes pagam <b>preço de fundador por 12 meses</b>. O Plano Básico sai de R$ 79,90 por <b>R$ 49,90 por mês</b>.</p>' : '';
  if (tipo === 'boasVindas') return {
    assunto: 'Bem-vindo à Landim Advisory: comece por aqui',
    html: moldura({ site, uid, titulo: `${oi} Sua conta está pronta.`, botao: 'Abrir meu painel', link: `${site}/dashboard?${utm('boasvindas')}`,
      corpo: `<p>Você tem <b>7 dias grátis com tudo liberado</b>. Para ver o sistema funcionando com os seus números, faça estes 3 passos (leva uns 10 minutos):</p>
<ol style="padding-left:20px;margin:0">
<li style="margin-bottom:6px"><b>Cadastre a empresa</b> e informe o saldo atual da conta no banco.</li>
<li style="margin-bottom:6px"><b>Importe o extrato do banco</b> (arquivo OFX ou CSV). O sistema lança e organiza tudo sozinho.</li>
<li><b>Lance as contas a pagar e a receber</b> dos próximos dias e veja o fluxo de caixa de 90 dias.</li>
</ol>` }),
  };
  if (tipo === 'dica') return {
    assunto: 'Dica: cobre seus clientes pelo WhatsApp com Pix',
    html: moldura({ site, uid, titulo: `${oi} Uma dica para receber mais rápido`, botao: 'Ver minhas contas a receber', link: `${site}/dashboard?${utm('dica')}`,
      corpo: `<p>Em <b>Contas a receber</b>, toque em uma conta e escolha <b>Cobrar no WhatsApp</b>. O sistema monta a mensagem com o <b>Pix copia e cola no valor certo</b> e abre a conversa com o cliente.</p>
<p>Também vale olhar o <b>Fluxo de caixa</b>: ele mostra, dia a dia, quanto vai sobrar ou faltar nos próximos 90 dias, para você decidir antes do aperto.</p>` }),
  };
  if (tipo === 'acabaAmanha') return {
    assunto: 'Seu teste grátis acaba amanhã',
    html: moldura({ site, uid, titulo: `${oi} Seu teste grátis acaba amanhã`, botao: 'Escolher meu plano', link: `${site}/pricing?${utm('acabaamanha')}`,
      corpo: `<p>Para continuar usando o painel sem interrupção, escolha um plano. Seus lançamentos e cadastros continuam guardados.</p>${preco}
<p>Você paga no <b>cartão, Pix ou boleto</b>, sem fidelidade, e cancela quando quiser.</p>` }),
  };
  if (tipo === 'acabou') return {
    assunto: 'Seus dados estão guardados: continue de onde parou',
    html: moldura({ site, uid, titulo: `${oi} Seu teste grátis terminou`, botao: 'Continuar com a Landim Advisory', link: `${site}/pricing?${utm('acabou')}`,
      corpo: `<p>Tudo o que você lançou continua guardado. Assine um plano e o painel volta na hora, do jeito que você deixou.</p>${preco}
<p>Ficou alguma dúvida ou faltou algum recurso? Responda este e-mail: eu leio e respondo pessoalmente.</p>` }),
  };
  return null;
}
