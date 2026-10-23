/**
 * Landim Advisory — CFO com respostas próprias (sem IA)
 * As perguntas mais comuns sobre o financeiro são respondidas aqui, com os números da empresa aberta:
 * saldo, a receber, a pagar, lucro, onde está o gasto, caixa futuro, fôlego, faturamento, clientes e estoque.
 * Só o que não se encaixa vai para a IA.
 */
(function () {
  'use strict';
  var F = function () { return window.fin; };
  function st() { return window.state || {}; }
  function m(v) { return F().moeda(v); }
  function r2(v) { return Math.round(v * 100) / 100; }
  function norm(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim(); }
  function pct(a, b) { return b ? ((a - b) / Math.abs(b) * 100) : null; }
  function varTxt(a, b) { var p = pct(a, b); if (p === null || !isFinite(p) || Math.abs(p) < 1) return ''; return ' (' + (p >= 0 ? '+' : '') + p.toFixed(0) + '% sobre o mês anterior)'; }
  function lista(itens, fmt, max) { return itens.slice(0, max || 5).map(function (x) { return '• ' + fmt(x); }).join('\n'); }
  function porContato(ts) {
    var g = {};
    ts.forEach(function (t) { var k = t.contato || t.desc || 'Sem nome'; g[k] = r2((g[k] || 0) + Number(t.amount || 0)); });
    return Object.keys(g).map(function (k) { return { nome: k, v: g[k] }; }).sort(function (a, b) { return b.v - a.v; });
  }
  function semDados() { return !(st().transactions || []).length; }
  var SEM = 'Ainda não há lançamentos nesta empresa. Lance as contas a receber e a pagar (ou importe o extrato) e eu respondo com os seus números.';

  var R = {};
  R.saldo = function () {
    var f = F(), saldo = f.saldoTotal(), contas = (st().contas || []).filter(function (c) { return c.tipo !== 'Cartão de crédito'; });
    var linhas = contas.length > 1 ? '\n' + lista(contas, function (c) { return c.nome + ': ' + m(f.saldoConta(c)); }, 8) : '';
    var semSaldo = contas.every(function (c) { return !c.dataSaldo; });
    return '**Saldo de hoje: ' + m(saldo) + '**' + linhas + (semSaldo ? '\n\nDica: informe o saldo do extrato em Bancos para esse número ficar exato.' : '');
  };
  R.receber = function () {
    var f = F(), k = f.indicadores(), hoje = f.hoje();
    var atras = k.vencidosRec, prox = f.pendentes('RECEITA').filter(function (t) { var d = f.diffDias(hoje, t.vencimento); return d >= 0 && d <= 30; }).sort(function (a, b) { return a.vencimento > b.vencimento ? 1 : -1; });
    var txt = '**A receber nos próximos 30 dias: ' + m(k.aReceber30) + '**' + (k.aReceber > k.aReceber30 ? ' (total em aberto: ' + m(k.aReceber) + ')' : '');
    if (atras.length) txt += '\n\n**Em atraso: ' + m(f.somar(atras)) + '** de ' + atras.length + (atras.length === 1 ? ' cobrança' : ' cobranças') + '. Quem mais deve:\n' + lista(porContato(atras), function (x) { return x.nome + ' — ' + m(x.v); });
    if (prox.length) txt += '\n\nPróximos recebimentos:\n' + lista(prox, function (t) { return f.dataBR(t.vencimento) + ' · ' + (t.contato || t.desc) + ' — ' + m(t.amount); });
    if (atras.length) txt += '\n\nEm Contas a receber você manda a cobrança com Pix copia e cola para quem está atrasado.';
    return txt;
  };
  R.pagar = function () {
    var f = F(), k = f.indicadores(), hoje = f.hoje();
    var semana = f.pendentes('DESPESA').filter(function (t) { var d = f.diffDias(hoje, t.vencimento); return d >= 0 && d <= 7; }).sort(function (a, b) { return a.vencimento > b.vencimento ? 1 : -1; });
    var hojeL = semana.filter(function (t) { return t.vencimento === hoje; });
    var txt = '**A pagar nos próximos 30 dias: ' + m(k.aPagar30) + '**';
    if (k.vencidosPag.length) txt += '\n\n**Vencidas: ' + m(f.somar(k.vencidosPag)) + '** (' + k.vencidosPag.length + '):\n' + lista(k.vencidosPag, function (t) { return f.dataBR(t.vencimento) + ' · ' + (t.desc || t.contato) + ' — ' + m(t.amount); });
    if (hojeL.length) txt += '\n\n**Vencem hoje: ' + m(f.somar(hojeL)) + '**';
    if (semana.length) txt += '\n\nNos próximos 7 dias:\n' + lista(semana, function (t) { return f.dataBR(t.vencimento) + ' · ' + (t.desc || t.contato) + ' — ' + m(t.amount); }, 7);
    if (!k.vencidosPag.length && !semana.length) txt += '\n\nNada vencido e nada vencendo nesta semana.';
    return txt;
  };
  R.lucro = function () {
    var f = F(), k = f.indicadores(), d = k.atual.dre, a = k.anterior.dre;
    var margem = d.bruta > 0 ? d.resultado / d.bruta * 100 : null;
    var txt = '**Resultado de ' + f.nomeMes(k.mes) + ': ' + m(d.resultado) + '**' + (d.resultado < 0 ? ' (prejuízo)' : '') + varTxt(d.resultado, a.resultado) +
      '\n• Vendas e serviços: ' + m(d.bruta) + varTxt(d.bruta, a.bruta) +
      '\n• Impostos e custos diretos: −' + m(r2(d.deducoes + d.custos)) +
      '\n• Pessoal: −' + m(d.pessoal) +
      '\n• Despesas do dia a dia: −' + m(d.operacionais) +
      (margem !== null ? '\n• Margem: ' + margem.toFixed(1).replace('.', ',') + '%' : '');
    txt += '\n\nO mês ainda está em andamento; o número considera o que já foi lançado com data neste mês.';
    if (d.resultado < 0 && d.bruta > 0) txt += ' Pergunte "onde estou gastando mais" para ver o que pesa.';
    return txt;
  };
  function gastosPorCat(ym) {
    var b = F().porMes([ym], 'competencia')[ym], out = [];
    Object.keys(b.cats).forEach(function (k) { var p = k.split('|'); if (p[0] === 'DESPESA') out.push({ cat: p.slice(1).join('|'), v: b.cats[k] }); });
    return out.sort(function (x, y) { return y.v - x.v; });
  }
  R.gastos = function () {
    var f = F(), hoje = f.hoje(), ym = f.mes(hoje), ant = f.mes(f.addMeses(hoje, -1));
    var atual = gastosPorCat(ym), antes = gastosPorCat(ant), total = atual.reduce(function (a, x) { return a + x.v; }, 0);
    var usar = atual.length ? atual : antes, ref = atual.length ? ym : ant, tot = atual.length ? total : antes.reduce(function (a, x) { return a + x.v; }, 0);
    if (!usar.length) return 'Não encontrei despesas lançadas neste mês nem no anterior.';
    var mapaAnt = {}; antes.forEach(function (x) { mapaAnt[x.cat] = x.v; });
    var txt = '**Onde está o gasto em ' + f.nomeMes(ref) + '** (total ' + m(tot) + '):\n' + lista(usar, function (x) { return x.cat + ' — ' + m(x.v) + ' (' + (x.v / tot * 100).toFixed(0) + '%)' + (ref === ym && mapaAnt[x.cat] ? varTxt(x.v, mapaAnt[x.cat]).replace(' sobre o mês anterior', ' vs. mês passado') : ''); }, 6);
    var subiu = ref === ym ? usar.filter(function (x) { return mapaAnt[x.cat] && x.v > mapaAnt[x.cat] * 1.2 && x.v - mapaAnt[x.cat] > 200; }) : [];
    if (subiu.length) txt += '\n\n**Atenção:** ' + subiu.slice(0, 2).map(function (x) { return x.cat + ' subiu ' + m(x.v - mapaAnt[x.cat]); }).join('; ') + ' em relação ao mês passado.';
    txt += '\n\nComece pelos dois maiores: renegociar o maior item costuma render mais do que cortar vários pequenos.';
    return txt;
  };
  R.gastoCom = function (termo) {
    termo = String(termo || '').replace(/[?!.,;]+/g, ' ').replace(/\b(este|esse|neste|nesse|no|na|mes|ano|ultimo|ultimos|meses)\b.*$/i, '').trim();
    var f = F(), t = norm(termo); if (t.length < 3) return null;
    var hoje = f.hoje(), lim = f.addDias(hoje, -90), ym = f.mes(hoje);
    var ts = (st().transactions || []).filter(function (x) { return x.type === 'DESPESA' && x.date >= lim && x.date <= hoje && (norm(x.category).indexOf(t) > -1 || norm(x.contato).indexOf(t) > -1 || norm(x.desc).indexOf(t) > -1); });
    if (!ts.length) return 'Não encontrei despesas com "' + termo.trim() + '" nos últimos 90 dias.';
    var mes = ts.filter(function (x) { return f.mes(x.date) === ym; });
    return '**Gastos com "' + termo.trim() + '"**\n• Neste mês: ' + m(f.somar(mes)) + '\n• Últimos 90 dias: ' + m(f.somar(ts)) + ' em ' + ts.length + (ts.length === 1 ? ' lançamento' : ' lançamentos') + ' (média de ' + m(f.somar(ts) / 3) + ' por mês)' +
      '\n\nMaiores:\n' + lista(ts.slice().sort(function (a, b) { return b.amount - a.amount; }), function (x) { return f.dataBR(x.date) + ' · ' + (x.desc || x.contato) + ' — ' + m(x.amount); }, 4);
  };
  R.caixa = function () {
    var f = F(), proj = f.projecao(90, true), k = f.indicadores();
    var em = function (d) { return proj[Math.min(d, proj.length - 1)].saldo; };
    var menor = proj.reduce(function (a, p) { return p.saldo < a.saldo ? p : a; }, proj[0]);
    var txt = '**Caixa previsto** (saldo de hoje + contas a receber − contas a pagar lançadas):\n• Hoje, contando os atrasados: ' + m(proj[0].saldo) + '\n• Em 30 dias: ' + m(em(30)) + '\n• Em 60 dias: ' + m(em(60)) + '\n• Em 90 dias: ' + m(em(90));
    if (k.negativoEm) txt += '\n\n**⚠️ O caixa fica negativo em ' + f.dataBR(k.negativoEm) + '** (' + m(k.saldoNegativo) + '). O ponto mais baixo é ' + m(menor.saldo) + ' em ' + f.dataBR(menor.data) + '. Antecipe recebimentos, cobre os atrasados ou negocie prazo das contas maiores antes dessa data.';
    else txt += '\n\nO caixa segue positivo nos próximos 90 dias. O ponto mais baixo é ' + m(menor.saldo) + ' em ' + f.dataBR(menor.data) + '.';
    txt += '\n\nA previsão só enxerga o que está lançado: despesas fixas que ainda não foram lançadas não entram.';
    return txt;
  };
  R.folego = function () {
    var f = F(), k = f.indicadores();
    if (!(k.queima > 0)) return 'Ainda não há despesas pagas suficientes para calcular quantos meses o caixa aguenta.';
    var meses = k.saldo / k.queima;
    return '**O saldo de ' + m(k.saldo) + ' cobre ' + meses.toFixed(1).replace('.', ',') + ' meses** das despesas médias pagas (' + m(k.queima) + ' por mês nos últimos 3 meses), sem contar novas entradas.' +
      (meses < 3 ? '\n\nO recomendado é ter pelo menos 3 meses de reserva. Vale separar um valor fixo por mês até chegar lá.' : '\n\nEstá acima da reserva mínima recomendada de 3 meses.');
  };
  R.faturamento = function () {
    var f = F(), k = f.indicadores(), hoje = f.hoje(), lim = f.addDias(hoje, -90);
    var rec = (st().transactions || []).filter(function (t) { return t.type === 'RECEITA' && f.mes(t.date) === k.mes; });
    var txt = '**Faturamento de ' + f.nomeMes(k.mes) + ': ' + m(k.atual.dre.bruta) + '**' + varTxt(k.atual.dre.bruta, k.anterior.dre.bruta) + '\n• Mês anterior: ' + m(k.anterior.dre.bruta) + '\n• Lançamentos de receita no mês: ' + rec.length;
    var top = porContato((st().transactions || []).filter(function (t) { return t.type === 'RECEITA' && t.date >= lim && t.date <= hoje && t.contato; }));
    if (top.length) txt += '\n\nMaiores clientes nos últimos 90 dias:\n' + lista(top, function (x) { return x.nome + ' — ' + m(x.v); });
    return txt;
  };
  R.clientes = function () {
    var f = F(), hoje = f.hoje(), lim = f.addDias(hoje, -90);
    var rec = (st().transactions || []).filter(function (t) { return t.type === 'RECEITA' && t.date >= lim && t.date <= hoje; });
    var top = porContato(rec.filter(function (t) { return t.contato; })), total = f.somar(rec);
    if (!top.length) return 'As receitas dos últimos 90 dias não têm cliente informado. Preencha o campo cliente nos lançamentos para eu montar o ranking.';
    var conc = top[0].v / (total || 1) * 100;
    return '**Maiores clientes (últimos 90 dias)**\n' + lista(top, function (x) { return x.nome + ' — ' + m(x.v) + ' (' + (x.v / (total || 1) * 100).toFixed(0) + '%)'; }, 7) +
      (conc > 30 ? '\n\n**Atenção:** ' + top[0].nome + ' responde por ' + conc.toFixed(0) + '% das receitas. Depender tanto de um cliente é um risco; vale buscar outros do mesmo perfil.' : '');
  };
  R.estoque = function () {
    var inv = st().inventory || []; if (!inv.length) return 'Ainda não há produtos no estoque.';
    var baixos = inv.filter(function (p) { return p.minimo > 0 && p.qtd <= p.minimo; });
    var txt = '**Estoque: ' + inv.length + ' produtos, ' + m(inv.reduce(function (a, p) { return a + (p.qtd > 0 ? p.qtd * (p.custo || 0) : 0); }, 0)) + ' a custo**';
    txt += baixos.length ? '\n\nRepor (no mínimo ou abaixo):\n' + lista(baixos, function (p) { return p.nome + ' — ' + String(p.qtd).replace('.', ',') + ' ' + p.unidade + ' (mínimo ' + p.minimo + ')'; }, 8) : '\n\nNenhum produto abaixo do mínimo.';
    var V = window.maxcfoValidade;
    if (V) { var r = V.resumo(); if (r.vencidos.length || r.perto.length) txt += '\n\nValidade: ' + (r.vencidos.length ? r.vencidos.length + ' lote(s) vencido(s) (' + m(r.valorVencido) + ')' : 'nenhum lote vencido') + ' e ' + r.perto.length + ' vencendo em até ' + r.aviso + ' dias (' + m(r.valorPerto) + '). Veja em Estoque › Validades.'; }
    return txt;
  };

  // ── Conhecimento de gestão: respostas com os números da empresa quando dá ──
  function percentuais() {
    var f = F(), hoje = f.hoje(), meses = [f.mes(f.addMeses(hoje, -1)), f.mes(f.addMeses(hoje, -2)), f.mes(f.addMeses(hoje, -3))];
    var pm = f.porMes(meses, 'competencia'), rec = 0, imp = 0, fixas = 0, custos = 0;
    meses.forEach(function (ym) { var d = f.dreDoMes(pm[ym]); rec += d.bruta; imp += d.deducoes; custos += d.custos; fixas += d.pessoal + d.operacionais; });
    return rec > 0 ? { imp: imp / rec * 100, fixas: fixas / rec * 100, custos: custos / rec * 100, rec: rec / 3 } : null;
  }
  R.preco = function () {
    var p = semDados() ? null : percentuais(), f = function (v) { return v.toFixed(1).replace('.', ','); };
    var txt = '**Como formar o preço de venda (markup)**\nPreço = custo do produto ÷ (1 − impostos% − despesas fixas% − lucro desejado%)';
    if (p && p.imp + p.fixas < 90) {
      var lucro = 15, div = 1 - (p.imp + p.fixas + lucro) / 100;
      txt += '\n\nCom os números dos últimos 3 meses da empresa:\n• Impostos sobre a venda: ' + f(p.imp) + '% do faturamento\n• Despesas fixas (pessoal e dia a dia): ' + f(p.fixas) + '% do faturamento\n• Lucro desejado (exemplo): ' + lucro + '%';
      txt += div > 0.05 ? '\n\nMarkup = 1 ÷ ' + div.toFixed(3).replace('.', ',') + ' = **' + (1 / div).toFixed(2).replace('.', ',') + '**. Um produto que custa R$ 10,00 deve sair por **' + m(10 / div) + '**.' : '\n\nAs despesas fixas e os impostos já passam de 85% do faturamento: antes de mexer no preço, é preciso reduzir as fixas ou vender mais volume.';
    } else txt += '\n\nExemplo: impostos 8%, despesas fixas 30% e lucro 15% → markup = 1 ÷ 0,47 = 2,13. Um produto de R$ 10,00 sai por R$ 21,28. Lance alguns meses de receitas e despesas e eu faço a conta com os seus números.';
    txt += '\n\nDepois compare com o preço da concorrência: se o seu ficar muito acima, o caminho é negociar o custo com o fornecedor ou diluir as despesas fixas com mais vendas.';
    return txt;
  };
  R.prolabore = function () {
    return '**Pró-labore** é a remuneração dos sócios que trabalham na empresa. Ele é diferente da distribuição de lucros:\n• Pró-labore: valor fixo mensal, com INSS (11% do sócio; no Simples, em geral sem a parte patronal nos anexos I a III) e IR na tabela progressiva.\n• Distribuição de lucros: o que sobra depois de pagar tudo; isenta de IR para o sócio, desde que a contabilidade comprove o lucro.\n\nNa prática: defina um pró-labore que caiba no caixa todo mês e retire o restante como lucro só quando o resultado e o caixa permitirem. Confirme os percentuais com o seu contador para o seu anexo do Simples.';
  };
  R.reforma = function () {
    return '**Reforma tributária (IBS e CBS) — cronograma**\n• 2026: fase de teste, com CBS de 0,9% e IBS de 0,1% destacados na nota, compensáveis com PIS/Cofins.\n• 2027: a CBS passa a valer de vez e PIS e Cofins acabam.\n• 2029 a 2032: ICMS e ISS diminuem aos poucos e o IBS aumenta.\n• 2033: só IBS, CBS e o Imposto Seletivo.\n\nQuem está no Simples Nacional continua no Simples e, a partir de 2027, pode optar por recolher IBS/CBS por fora para gerar crédito aos clientes empresas. Use o Simulador de impostos e da reforma, no menu, para ver o efeito na sua empresa.';
  };
  R.cobrar = function () {
    var txt = R.receber();
    return txt + '\n\n**Como reduzir a inadimplência:**\n• Mande o lembrete 3 dias antes e no dia do vencimento (dá para ligar o aviso automático por e-mail nas configurações).\n• Ofereça Pix copia e cola: o cliente paga na hora.\n• No primeiro atraso, contato rápido e cordial; depois de 15 dias, proponha parcelar o valor em atraso.\n• Para clientes que atrasam sempre, peça pagamento antecipado ou entrada.';
  };

  window.cfoLocalAjuda = function (msg) {
    return 'Não tenho uma resposta pronta para "' + String(msg || '').trim().slice(0, 80) + '". Eu respondo na hora, com os números da sua empresa, perguntas como:\n• "Quanto tenho hoje?"\n• "Quem me deve?"\n• "O que vence esta semana?"\n• "Estou tendo lucro?"\n• "Onde estou gastando mais?"\n• "Quanto gastei com aluguel?"\n• "Vai faltar caixa nos próximos 90 dias?"\n• "Quantos meses eu aguento?"\n• "Qual meu faturamento?" e "Quais meus maiores clientes?"\n• "Como formar o preço de venda?"\n• "O que preciso repor no estoque?"\n\nTambém gero DRE, diagnóstico, ponto de equilíbrio, capital de giro e planejamento tributário: é só pedir.';
  };

  // Ordem importa: o primeiro que casa responde
  var INTENCOES = [
    [/(formar|calcular|definir|como (eu )?(coloco|faco|defino|calculo)) (o )?preco|precifica|markup|preco de venda/, R.preco],
    [/pro.?labore|retirada dos socios|quanto (posso|devo) (retirar|tirar)|distribui(r|cao) (de )?lucro/, R.prolabore],
    [/reforma tributaria|\bibs\b|\bcbs\b|imposto seletivo|split payment/, R.reforma],
    [/como (eu )?(cobro|cobrar)|reduzir (a )?inadimpl|cliente (nao paga|atrasa)/, R.cobrar],
    [/quanto (eu )?gastei com (.+)|gastos? com (.+)|quanto (eu )?paguei de (.+)|despesas? com (.+)/, function (x) { return R.gastoCom(x[2] || x[3] || x[5] || x[6] || ''); }],
    [/(onde|com o que|em que|no que).{0,25}gast|maiores (despesas|gastos)|gastando (muito|mais)|despesas? por categoria|(cortar|reduzir) (gasto|custo|despesa)/, R.gastos],
    [/vai faltar|vou ter (caixa|dinheiro)|ficar (no )?negativo|caixa (do|no|para o) (mes que vem|proximo mes)|proximos (30|60|90) dias|previsao de caixa|fluxo de caixa|caixa futuro|projecao/, R.caixa],
    [/quantos meses|aguento|folego|runway|reserva de caixa|sobreviv/, R.folego],
    [/quem (me )?deve|inadimpl|(cliente|recebimento)s? (em )?atras|(quanto|o que) (eu )?(tenho|vou|falta) (a |para )?receber|a receber|recebiveis/, R.receber],
    [/(quanto|o que) (eu )?(tenho|vou|preciso) (a |para |de )?pagar|a pagar|contas? (vencid|vence|do mes|da semana|para pagar)|vence(m)? (hoje|amanha|essa semana|esta semana)|boletos? (vencid|para pagar)/, R.pagar],
    [/lucro|prejuizo|resultado do mes|estou (ganhando|perdendo)|sobrou|margem/, R.lucro],
    [/faturamento|faturei|quanto (eu )?(vendi|faturei|entrou)|vendas do mes|receita do mes/, R.faturamento],
    [/maiores clientes|melhores clientes|quem mais (compra|paga|traz)|principais clientes|concentracao/, R.clientes],
    [/estoque|repor|acabando|validade|vencendo no estoque|lotes?/, R.estoque],
    [/saldo|quanto (eu )?tenho|dinheiro (em conta|no banco|em caixa)|caixa (hoje|atual)|quanto tem (no|em) (banco|caixa)/, R.saldo]
  ];

  window.cfoLocal = {
    responder: function (msg) {
      if (!F() || !F().indicadores) return null;
      var t = norm(msg);
      if (t.length < 4) return null;
      for (var i = 0; i < INTENCOES.length; i++) {
        var x = t.match(INTENCOES[i][0]);
        if (!x) continue;
        if (semDados() && [R.estoque, R.preco, R.prolabore, R.reforma].indexOf(INTENCOES[i][1]) < 0) return SEM;
        try { var r = INTENCOES[i][1](x); if (r) return r; } catch (e) { console.warn('CFO local:', e); return null; }
      }
      return null;
    },
    ajuda: function (msg) { return window.cfoLocalAjuda(msg); },
    _R: R
  };
})();
