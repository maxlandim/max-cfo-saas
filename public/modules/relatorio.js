/**
 * MAX CFO AI — Relatório mensal para o cliente (PDF)
 * Resumo do mês, gráfico de 6 meses, DRE, despesas por categoria, contas em aberto,
 * saldos e projeção, com a marca de quem prepara (logo, nome, cor e contato) e um comentário.
 * Baixa em PDF, imprime e envia o resumo por WhatsApp. Funciona para qualquer empresa do login (BPO).
 */
(function () {
  'use strict';
  var F = function () { return window.fin; };
  function el(id) { return document.getElementById(id); }
  function esc(s) { return F().esc(s); }
  function moeda(v) { return F().moeda(v); }
  function r2(v) { return Math.round(v * 100) / 100; }
  function toast(m, t) { if (window.showToast) window.showToast(m, t || 'success'); }
  function salvar() { if (window.persist) window.persist(); }
  var MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  function mesExtenso(ym) { var p = ym.split('-'); return MESES[+p[1] - 1] + ' de ' + p[0]; }
  function fimDoMes(ym) { var p = ym.split('-'); var d = new Date(+p[0], +p[1], 0, 12); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function pct(v, base) { return base ? (v / base * 100).toFixed(1).replace('.', ',') + '%' : '—'; }
  function variacao(atual, ant) {
    if (!ant) return '';
    var p = (atual - ant) / Math.abs(ant) * 100;
    return (p >= 0 ? '▲ ' : '▼ ') + Math.abs(p).toFixed(0) + '% vs mês anterior';
  }
  function milhar(v) {
    var a = Math.abs(v);
    if (a >= 1e6) return (v / 1e6).toFixed(1).replace('.', ',') + ' mi';
    if (a >= 1e3) return (v / 1e3).toFixed(a >= 1e4 ? 0 : 1).replace('.', ',') + ' mil';
    return String(Math.round(v));
  }

  // ── Marca de quem prepara (fica na empresa aberta e também neste aparelho, para valer em todas) ──
  function chaveMarca() { return 'maxcfo_marca_' + ((window.maxcfoUser && window.maxcfoUser.uid) || 'local'); }
  function marca() {
    var s = (window.state && window.state.settings) || {};
    var local = null; try { local = JSON.parse(localStorage.getItem(chaveMarca()) || 'null'); } catch (e) { }
    return Object.assign({ escritorio: '', contato: '', cor: '#C5A059', logo: '' }, local || {}, s.marcaRelatorio || {});
  }
  function guardarMarca(m) {
    window.state.settings.marcaRelatorio = m;
    try { localStorage.setItem(chaveMarca(), JSON.stringify(m)); } catch (e) { }
    salvar();
  }

  // Empresa do relatório: a aberta ou outra do painel multiempresas
  var alvo = null; // { estado, nome }
  var cfg = { mes: '', regime: 'competencia', secoes: { resumo: 1, grafico: 1, dre: 1, categorias: 1, contas: 1, caixa: 1 } };
  function estadoAlvo() { return alvo ? alvo.estado : window.state; }

  // ── Dados do relatório ──
  function dados(ym, regime) {
    var est = estadoAlvo();
    return F().comEstado(est, function () {
      var f = F(), meses6 = f.mesesAte(ym, 6), ant = f.mes(f.addMeses(ym + '-15', -1));
      var pm = f.porMes(meses6.concat([ant]).filter(function (v, i, a) { return a.indexOf(v) === i; }), regime);
      var atual = pm[ym], anterior = pm[ant] || { receitas: 0, despesas: 0, grupos: {}, cats: {} };
      var dre = f.dreDoMes(atual), dreAnt = f.dreDoMes(anterior);
      var cats = Object.keys(atual.cats).filter(function (k) { return k.indexOf('DESPESA|') === 0 && f.grupoDe({ type: 'DESPESA', category: k.slice(8) }) !== 'fora'; })
        .map(function (k) { return { nome: k.slice(8), valor: atual.cats[k] }; }).sort(function (a, b) { return b.valor - a.valor; });
      var hoje = f.hoje(), mesAtual = ym === f.mes(hoje), ate = mesAtual ? hoje : fimDoMes(ym);
      var contas = (est.contas || []).filter(function (c) { return c.tipo !== 'Cartão de crédito'; }).map(function (c) { return { nome: c.nome, tipo: c.tipo, saldo: f.saldoConta(c, ate) }; });
      var pend = f.pendentes();
      var receber = pend.filter(function (t) { return t.type === 'RECEITA' && f.diffDias(hoje, t.vencimento) <= 30; }).sort(function (a, b) { return a.vencimento > b.vencimento ? 1 : -1; });
      var pagar = pend.filter(function (t) { return t.type === 'DESPESA' && f.diffDias(hoje, t.vencimento) <= 30; }).sort(function (a, b) { return a.vencimento > b.vencimento ? 1 : -1; });
      var proj = f.projecao(90, true), em = function (d) { return (proj[d] || proj[proj.length - 1]).saldo; };
      var neg = proj.find(function (p) { return p.saldo < 0; });
      return {
        ym: ym, ant: ant, regime: regime, meses: meses6.map(function (m) { return { m: m, nome: f.nomeMes(m), ent: pm[m].receitas, sai: pm[m].despesas }; }),
        receitas: atual.receitas, despesas: atual.despesas, resultado: r2(atual.receitas - atual.despesas),
        recAnt: anterior.receitas, despAnt: anterior.despesas, resAnt: r2(anterior.receitas - anterior.despesas),
        dre: dre, dreAnt: dreAnt, cats: cats, contas: contas, saldo: r2(contas.reduce(function (a, c) { return a + c.saldo; }, 0)), saldoData: ate, mesAtual: mesAtual,
        receber: receber, pagar: pagar, atrasadoRec: f.somar(receber.filter(function (t) { return t.vencimento < hoje; })), atrasadoPag: f.somar(pagar.filter(function (t) { return t.vencimento < hoje; })),
        proj30: em(30), proj60: em(60), proj90: em(90), negativoEm: neg ? neg.data : null, hoje: hoje,
        empresa: (est.settings && est.settings.company) || (alvo && alvo.nome) || 'Empresa', cnpj: (est.settings && est.settings.cnpj) || '', telefone: (est.settings && est.settings.telefone) || '',
        lancamentos: (est.transactions || []).length
      };
    });
  }

  // Frases automáticas, só com fatos calculados
  function destaques(d) {
    var l = [];
    if (d.receitas || d.despesas) {
      l.push(d.resultado >= 0 ? 'O mês fechou com <b>lucro de ' + moeda(d.resultado) + '</b>' + (d.receitas ? ' (margem de ' + pct(d.resultado, d.receitas) + ')' : '') + '.' : 'O mês fechou com <b>prejuízo de ' + moeda(Math.abs(d.resultado)) + '</b>: as despesas passaram as receitas.');
      if (d.recAnt) l.push('As receitas ' + (d.receitas >= d.recAnt ? 'subiram' : 'caíram') + ' ' + Math.abs((d.receitas - d.recAnt) / d.recAnt * 100).toFixed(0) + '% em relação a ' + F().nomeMes(d.ant) + ' (' + moeda(d.recAnt) + ' → ' + moeda(d.receitas) + ').');
      if (d.cats[0]) l.push('A maior despesa foi <b>' + esc(d.cats[0].nome) + '</b>: ' + moeda(d.cats[0].valor) + (d.despesas ? ' (' + pct(d.cats[0].valor, d.despesas) + ' das despesas)' : '') + '.');
    } else l.push('Não há lançamentos neste mês.');
    if (d.atrasadoRec) l.push('Há <b>' + moeda(d.atrasadoRec) + ' a receber em atraso</b>. Vale cobrar esses clientes.');
    if (d.atrasadoPag) l.push('Há <b>' + moeda(d.atrasadoPag) + ' de contas vencidas</b> ainda não pagas.');
    if (d.negativoEm) l.push('Pelo que está lançado, o caixa <b>fica negativo em ' + F().dataBR(d.negativoEm) + '</b>. É preciso antecipar recebimentos ou adiar pagamentos.');
    else if (d.contas.length) l.push('Pelo que está lançado, o caixa segue positivo nos próximos 90 dias (previsão de ' + moeda(d.proj90) + ').');
    return l;
  }

  // ── Gráfico de 6 meses (SVG, sai nítido no PDF) ──
  function grafico(d, cor) {
    var W = 680, H = 210, pl = 54, pb = 26, pt = 12, gw = W - pl - 10, gh = H - pt - pb;
    var max = Math.max.apply(null, d.meses.map(function (m) { return Math.max(m.ent, m.sai); }).concat([1]));
    var passo = Math.pow(10, Math.floor(Math.log10(max))), topo = Math.ceil(max / passo) * passo; if (topo / passo < 3) { passo /= 2; }
    var linhas = '', y, i;
    for (var v = 0; v <= topo + 0.01; v += passo) { y = pt + gh - v / topo * gh; linhas += '<line x1="' + pl + '" x2="' + (W - 10) + '" y1="' + y + '" y2="' + y + '" stroke="#E5E9F0"/><text x="' + (pl - 6) + '" y="' + (y + 4) + '" text-anchor="end" font-size="10" fill="#6B7789">' + milhar(v) + '</text>'; }
    var bw = gw / d.meses.length, barras = '', pts = [];
    d.meses.forEach(function (m, i) {
      var cx = pl + bw * i + bw / 2, w = Math.min(26, bw / 3.2);
      var he = m.ent / topo * gh, hs = m.sai / topo * gh;
      barras += '<rect x="' + (cx - w - 2) + '" y="' + (pt + gh - he) + '" width="' + w + '" height="' + he + '" rx="3" fill="#10B981"/>';
      barras += '<rect x="' + (cx + 2) + '" y="' + (pt + gh - hs) + '" width="' + w + '" height="' + hs + '" rx="3" fill="#EF4444"/>';
      barras += '<text x="' + cx + '" y="' + (H - 8) + '" text-anchor="middle" font-size="11" fill="' + (m.m === d.ym ? '#0F172A' : '#6B7789') + '" font-weight="' + (m.m === d.ym ? '700' : '400') + '">' + m.nome + '</text>';
      var res = m.ent - m.sai; pts.push([cx, pt + gh - Math.max(0, Math.min(topo, res)) / topo * gh, res]);
    });
    var linha = '<polyline fill="none" stroke="' + cor + '" stroke-width="2.2" points="' + pts.map(function (p) { return p[0] + ',' + p[1]; }).join(' ') + '"/>' + pts.map(function (p) { return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="3.5" fill="' + (p[2] < 0 ? '#EF4444' : cor) + '"/>'; }).join('');
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">' + linhas + barras + linha + '</svg>' +
      '<div style="display:flex;gap:16px;font-size:11px;color:#475569;margin-top:6px"><span><i style="display:inline-block;width:10px;height:10px;border-radius:2px;background:#10B981;margin-right:5px"></i>Entradas</span><span><i style="display:inline-block;width:10px;height:10px;border-radius:2px;background:#EF4444;margin-right:5px"></i>Saídas</span><span><i style="display:inline-block;width:14px;height:2px;background:' + cor + ';margin-right:5px;vertical-align:middle"></i>Resultado (só positivo no gráfico)</span></div>';
  }

  // ── HTML do relatório (folha A4, sempre clara) ──
  function montar(d, m, comentario) {
    var cor = m.cor || '#C5A059', s = cfg.secoes;
    var bloco = function (titulo, corpo) { return '<div class="rel-bloco" style="margin-top:18px;page-break-inside:avoid;break-inside:avoid"><div style="font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:' + cor + ';border-bottom:2px solid ' + cor + ';padding-bottom:5px;margin-bottom:10px">' + titulo + '</div>' + corpo + '</div>'; };
    var kpi = function (rot, val, sub, c) { return '<div style="flex:1;min-width:0;border:1px solid #E5E9F0;border-radius:10px;padding:11px 12px;background:#fff"><div style="font-size:10.5px;color:#6B7789;text-transform:uppercase;letter-spacing:.04em">' + rot + '</div><div style="font-size:19px;font-weight:800;margin:3px 0;color:' + (c || '#0F172A') + ';white-space:nowrap">' + val + '</div><div style="font-size:10.5px;color:#6B7789">' + (sub || '&nbsp;') + '</div></div>'; };
    var tabela = function (cab, linhas, alinhar) { return '<table style="width:100%;border-collapse:collapse;font-size:11.5px"><thead><tr>' + cab.map(function (c, i) { return '<th style="text-align:' + (alinhar[i] || 'left') + ';padding:6px 6px;border-bottom:1px solid #CBD3DF;color:#475569;font-weight:700;font-size:10.5px;text-transform:uppercase">' + c + '</th>'; }).join('') + '</tr></thead><tbody>' + linhas + '</tbody></table>'; };
    var td = function (v, al, extra) { return '<td style="text-align:' + (al || 'left') + ';padding:6px 6px;border-bottom:1px solid #EEF1F5;' + (extra || '') + '">' + v + '</td>'; };
    var h = '';
    // Cabeçalho
    h += '<div style="display:flex;justify-content:space-between;align-items:center;gap:16px;padding-bottom:14px;border-bottom:3px solid ' + cor + '">' +
      '<div style="display:flex;align-items:center;gap:14px;min-width:0">' + (m.logo ? '<img src="' + m.logo + '" alt="" style="max-height:54px;max-width:170px;object-fit:contain">' : '') +
      '<div style="min-width:0"><div style="font-size:11px;color:#6B7789;text-transform:uppercase;letter-spacing:.08em">Relatório financeiro mensal</div><div style="font-size:22px;font-weight:800;color:#0F172A;line-height:1.2">' + esc(d.empresa) + '</div>' +
      '<div style="font-size:12px;color:#475569">' + (d.cnpj ? 'CNPJ ' + esc(F().docFmt(d.cnpj)) + ' · ' : '') + mesExtenso(d.ym).replace(/^./, function (c) { return c.toUpperCase(); }) + '</div></div></div>' +
      '<div style="text-align:right;font-size:11px;color:#475569;flex:none">' + (m.escritorio ? '<div style="font-weight:700;color:#0F172A;font-size:12.5px">' + esc(m.escritorio) + '</div>' : '') + (m.contato ? '<div>' + esc(m.contato) + '</div>' : '') + '<div>Emitido em ' + F().dataBR(d.hoje) + '</div></div></div>';
    // Números do mês
    if (s.resumo) {
      h += '<div class="rel-bloco" style="display:flex;gap:10px;margin-top:16px;page-break-inside:avoid">' +
        kpi('Entradas do mês', moeda(d.receitas), variacao(d.receitas, d.recAnt), '#047857') +
        kpi('Saídas do mês', moeda(d.despesas), variacao(d.despesas, d.despAnt), '#DC2626') +
        kpi(d.resultado >= 0 ? 'Lucro do mês' : 'Prejuízo do mês', moeda(d.resultado), d.receitas ? 'margem ' + pct(d.resultado, d.receitas) : '', d.resultado >= 0 ? '#047857' : '#DC2626') +
        kpi('Saldo em contas', moeda(d.saldo), d.mesAtual ? 'hoje, ' + F().dataBR(d.saldoData) : 'em ' + F().dataBR(d.saldoData)) + '</div>';
      var dst = destaques(d);
      h += bloco('Em resumo', '<ul style="margin:0;padding-left:18px;font-size:12.5px;line-height:1.65;color:#1E293B">' + dst.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>' +
        (comentario ? '<div style="margin-top:12px;background:#F8FAFC;border-left:4px solid ' + cor + ';padding:10px 14px;border-radius:6px;font-size:12.5px;line-height:1.6;color:#1E293B;white-space:pre-wrap"><b style="display:block;margin-bottom:3px">Comentário' + (m.escritorio ? ' de ' + esc(m.escritorio) : ' do consultor') + '</b>' + esc(comentario) + '</div>' : ''));
    }
    if (s.grafico) h += bloco('Entradas e saídas — últimos 6 meses', grafico(d, cor));
    if (s.dre) {
      var L = [['bruta', 'Receita bruta', 1], ['deducoes', '(−) Impostos sobre vendas'], ['liquida', 'Receita líquida', 1], ['custos', '(−) Custos'], ['lucroBruto', 'Lucro bruto', 1], ['pessoal', '(−) Pessoal e pró-labore'], ['operacionais', '(−) Despesas operacionais'], ['operacional', 'Resultado operacional', 1], ['finRec', '(+) Receitas financeiras'], ['finDesp', '(−) Despesas financeiras'], ['outras', '(+) Outras receitas'], ['resultado', 'Resultado do mês', 2]];
      var linhas = L.filter(function (l) { return l[2] || d.dre[l[0]] || d.dreAnt[l[0]]; }).map(function (l) {
        var b = l[2] ? 'font-weight:700;' : '', fundo = l[2] === 2 ? 'background:' + cor + '1A;' : l[2] ? 'background:#F8FAFC;' : '';
        var v = d.dre[l[0]] || 0, va = d.dreAnt[l[0]] || 0, neg = function (x) { return x < 0 ? 'color:#DC2626;' : ''; };
        return '<tr>' + td(l[1], 'left', b + fundo) + td(va ? moeda(va) : '—', 'right', b + fundo + neg(va) + 'color:#6B7789;') + td(v ? moeda(v) : '—', 'right', b + fundo + neg(v)) + td(pct(v, d.dre.bruta), 'right', fundo + 'color:#6B7789;') + '</tr>';
      }).join('');
      h += bloco('Resultado do mês (DRE) · ' + (d.regime === 'caixa' ? 'pelo que entrou e saiu no banco' : 'pelo mês de competência'), tabela(['', F().nomeMes(d.ant), F().nomeMes(d.ym), '% receita'], linhas, ['left', 'right', 'right', 'right']));
    }
    if (s.categorias && d.cats.length) {
      var top = d.cats.slice(0, 8), maior = top[0].valor || 1, resto = r2(d.cats.slice(8).reduce(function (a, c) { return a + c.valor; }, 0));
      if (resto) top = top.concat([{ nome: 'Demais categorias', valor: resto }]);
      h += bloco('Para onde foi o dinheiro', top.map(function (c) {
        return '<div style="display:flex;align-items:center;gap:10px;margin:5px 0;font-size:12px"><div style="width:190px;flex:none;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#1E293B">' + esc(c.nome) + '</div>' +
          '<div style="flex:1;background:#EEF1F5;border-radius:4px;height:12px"><div style="width:' + Math.max(2, c.valor / maior * 100).toFixed(1) + '%;height:12px;border-radius:4px;background:' + cor + '"></div></div>' +
          '<div style="width:96px;text-align:right;font-weight:700;color:#0F172A">' + moeda(c.valor) + '</div><div style="width:44px;text-align:right;color:#6B7789">' + pct(c.valor, d.despesas) + '</div></div>';
      }).join(''));
    }
    if (s.contas) {
      var lista = function (arr, vazio) {
        if (!arr.length) return '<div style="font-size:12px;color:#6B7789;padding:6px 0">' + vazio + '</div>';
        var mostra = arr.slice(0, 10), mais = arr.length - mostra.length;
        return tabela(['Vencimento', 'Descrição', 'Valor'], mostra.map(function (t) {
          var atras = t.vencimento < d.hoje;
          return '<tr>' + td(F().dataBR(t.vencimento) + (atras ? ' <span style="color:#DC2626;font-weight:700">atrasado</span>' : ''), 'left', 'white-space:nowrap') + td(esc(t.desc) + (t.contato ? '<div style="color:#6B7789;font-size:10.5px">' + esc(t.contato) + '</div>' : '')) + td(moeda(t.amount), 'right', 'font-weight:700;white-space:nowrap') + '</tr>';
        }).join('') + (mais ? '<tr>' + td('+ ' + mais + ' outra(s) · total ' + moeda(F().somar(arr)), 'left', 'color:#6B7789') + td('') + td('') + '</tr>' : ''), ['left', 'left', 'right']);
      };
      h += bloco('A receber — atrasados e próximos 30 dias (' + moeda(F().somar(d.receber)) + ')', lista(d.receber, 'Nada a receber nos próximos 30 dias.'));
      h += bloco('A pagar — vencidos e próximos 30 dias (' + moeda(F().somar(d.pagar)) + ')', lista(d.pagar, 'Nada a pagar nos próximos 30 dias.'));
    }
    if (s.caixa) {
      var cont = d.contas.length ? tabela(['Conta', 'Saldo'], d.contas.map(function (c) { return '<tr>' + td(esc(c.nome) + ' <span style="color:#6B7789;font-size:10.5px">' + esc(c.tipo || '') + '</span>') + td(moeda(c.saldo), 'right', 'font-weight:700;' + (c.saldo < 0 ? 'color:#DC2626' : '')) + '</tr>'; }).join('') + '<tr>' + td('Total', 'left', 'font-weight:800') + td(moeda(d.saldo), 'right', 'font-weight:800') + '</tr>', ['left', 'right']) : '<div style="font-size:12px;color:#6B7789">Nenhuma conta cadastrada.</div>';
      var prev = '<div style="display:flex;gap:10px">' + [['Em 30 dias', d.proj30], ['Em 60 dias', d.proj60], ['Em 90 dias', d.proj90]].map(function (p) { return kpi('Saldo previsto ' + p[0].toLowerCase(), moeda(p[1]), '', p[1] < 0 ? '#DC2626' : '#0F172A'); }).join('') + '</div><div style="font-size:10.5px;color:#6B7789;margin-top:6px">Previsão a partir do saldo de hoje e das contas a receber e a pagar lançadas.</div>';
      h += bloco('Saldos e previsão de caixa', '<div style="display:grid;grid-template-columns:1fr 1.25fr;gap:16px;align-items:start"><div>' + cont + '</div><div>' + prev + '</div></div>');
    }
    h += '<div style="margin-top:22px;padding-top:10px;border-top:1px solid #E5E9F0;font-size:10px;color:#6B7789;display:flex;justify-content:space-between;gap:10px"><span>Relatório gerado com base nos ' + d.lancamentos + ' lançamentos registrados até ' + F().dataBR(d.hoje) + '.</span><span>' + (m.escritorio ? esc(m.escritorio) + ' · ' : '') + 'MAX CFO AI</span></div>';
    return '<div class="rel-folha" style="width:718px;background:#fff;color:#0F172A;font-family:Inter,-apple-system,Segoe UI,Roboto,Arial,sans-serif;box-sizing:border-box">' + h + '</div>';
  }

  // ── Tela ──
  function opcoesMes() {
    var f = F(), atual = f.mes(f.hoje()), lista = f.mesesAte(atual, 13).reverse();
    return lista.map(function (m) { return '<option value="' + m + '"' + (m === cfg.mes ? ' selected' : '') + '>' + mesExtenso(m) + (m === atual ? ' (até hoje)' : '') + '</option>'; }).join('');
  }
  function notas() { var e = estadoAlvo(); e.relatorioNotas = e.relatorioNotas || {}; return e.relatorioNotas; }

  function render() {
    var v = el('view-reports'); if (!v || !F()) return;
    F().garantirModelo();
    if (!cfg.mes) { var f = F(), h = f.hoje(); cfg.mes = +h.slice(8) <= 10 ? f.mes(f.addMeses(h, -1)) : f.mes(h); }
    var m = marca(), sec = cfg.secoes;
    if (!v.dataset.antigo) { // guarda os relatórios em texto antigos numa área recolhida
      var antigo = document.createElement('div'); antigo.id = 'relAntigos'; while (v.firstChild) antigo.appendChild(v.firstChild); v.dataset.antigo = '1'; window.__relAntigos = antigo;
    }
    var chk = function (k, t) { return '<label class="fin-check" style="padding:3px 0"><input type="checkbox" data-sec="' + k + '"' + (sec[k] ? ' checked' : '') + ' onchange="rel.secao(this)"> ' + t + '</label>'; };
    v.innerHTML = '' +
      '<div class="page-header"><div class="page-header-text"><h1>Relatório mensal</h1><p class="page-subtitle">Um PDF com a sua marca para enviar ao cliente todo mês: resultado, gráficos, contas e previsão de caixa</p></div>' +
      '<div class="page-header-actions"><button class="btn-secondary" onclick="rel.whats()">💬 Resumo no WhatsApp</button><button class="btn-secondary" onclick="rel.imprimir()">🖨️ Imprimir</button><button class="btn-primary" id="relPdfBtn" onclick="rel.pdf()">⬇️ Baixar PDF</button></div></div>' +
      (alvo ? '<div class="card" style="margin-bottom:14px;padding:12px 16px;border-color:var(--gold-border);display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap"><span>📄 Relatório da empresa <b>' + esc(alvo.nome) + '</b> (do painel de todas as empresas).</span><button class="fin-btn" onclick="rel.voltar()">Usar a empresa aberta</button></div>' : '') +
      '<div class="rel-layout">' +
      '<div class="rel-lado">' +
      '<div class="card"><div class="card-title" style="margin-bottom:10px">Período</div>' +
      '<div class="form-field"><label class="form-label" for="relMes">Mês</label><select class="form-input" id="relMes" onchange="rel.mudar(\'mes\',this.value)">' + opcoesMes() + '</select></div>' +
      '<div class="form-field" style="margin-top:10px"><label class="form-label" for="relRegime">Números do mês</label><select class="form-input" id="relRegime" onchange="rel.mudar(\'regime\',this.value)"><option value="competencia"' + (cfg.regime === 'competencia' ? ' selected' : '') + '>Pelo mês de competência</option><option value="caixa"' + (cfg.regime === 'caixa' ? ' selected' : '') + '>Pelo que entrou e saiu no banco</option></select></div></div>' +
      '<div class="card"><div class="card-title" style="margin-bottom:8px">O que entra no relatório</div>' + chk('resumo', 'Números do mês e resumo') + chk('grafico', 'Gráfico de 6 meses') + chk('dre', 'Resultado (DRE)') + chk('categorias', 'Despesas por categoria') + chk('contas', 'Contas a receber e a pagar') + chk('caixa', 'Saldos e previsão de caixa') + '</div>' +
      '<div class="card"><div class="card-title" style="margin-bottom:8px">Comentário para o cliente</div><textarea class="form-input" id="relComentario" rows="5" maxlength="1500" placeholder="Ex.: Mês bom em vendas. Atenção ao aluguel que subiu. Sugiro negociar o prazo com o fornecedor X." oninput="rel.comentario(this.value)">' + esc(notas()[cfg.mes] || '') + '</textarea><div class="fin-sub" style="margin-top:4px">Fica guardado para este mês.</div></div>' +
      '<div class="card"><div class="card-title" style="margin-bottom:10px">Sua marca no relatório</div>' +
      '<div class="form-field"><label class="form-label" for="relEscritorio">Quem prepara (seu nome ou escritório)</label><input class="form-input" id="relEscritorio" maxlength="60" value="' + esc(m.escritorio) + '" placeholder="Ex.: Landim Advisory" oninput="rel.marca()"></div>' +
      '<div class="form-field" style="margin-top:10px"><label class="form-label" for="relContato">Contato</label><input class="form-input" id="relContato" maxlength="80" value="' + esc(m.contato) + '" placeholder="Ex.: (61) 99999-9999 · contato@escritorio.com" oninput="rel.marca()"></div>' +
      '<div style="display:flex;gap:10px;align-items:end;margin-top:10px"><div class="form-field"><label class="form-label" for="relCor">Cor</label><input type="color" id="relCor" value="' + esc(m.cor) + '" oninput="rel.marca()" style="width:56px;height:38px;border:1px solid var(--border);border-radius:8px;background:none;padding:2px"></div>' +
      '<div class="form-field" style="flex:1"><label class="form-label">Logo</label><div style="display:flex;gap:8px"><button class="btn-secondary" style="flex:1" onclick="document.getElementById(\'relLogoArq\').click()">' + (m.logo ? 'Trocar logo' : 'Enviar logo') + '</button>' + (m.logo ? '<button class="fin-btn" title="Remover logo" onclick="rel.semLogo()">✕</button>' : '') + '</div><input type="file" id="relLogoArq" accept="image/png,image/jpeg,image/webp" style="display:none" onchange="rel.logo(this.files[0])"></div></div>' +
      '<div class="fin-sub" style="margin-top:6px">A marca vale para todas as empresas deste login.</div></div>' +
      '</div>' +
      '<div class="rel-previa-box"><div class="fin-sub" style="margin-bottom:8px">Prévia</div><div id="relPrevia" class="rel-previa"></div></div>' +
      '</div>' +
      '<details style="margin-top:18px" id="relAntigosBox"><summary style="cursor:pointer;color:var(--text-muted)">Outros relatórios em texto (DRE, diagnóstico, KPIs…)</summary><div id="relAntigosAqui" style="margin-top:12px"></div></details>';
    var aqui = el('relAntigosAqui'); if (aqui && window.__relAntigos) aqui.appendChild(window.__relAntigos);
    atualizarPrevia();
  }
  var tPrev = null;
  function atualizarPrevia() {
    var p = el('relPrevia'); if (!p) return;
    p.innerHTML = '<div class="rel-papel">' + montar(dados(cfg.mes, cfg.regime), marca(), notas()[cfg.mes] || '') + '</div>';
    escalar();
  }
  function escalar() {
    var p = el('relPrevia'); if (!p) return; var papel = p.querySelector('.rel-papel'); if (!papel) return;
    var larg = p.clientWidth, esc = Math.min(1, (larg - 2) / 766);
    papel.style.transform = 'scale(' + esc + ')'; papel.style.transformOrigin = 'top left';
    p.style.height = Math.ceil(papel.offsetHeight * esc) + 'px';
  }
  window.addEventListener('resize', function () { if (el('relPrevia')) escalar(); });

  function nomeArquivo(d) { return ('Relatorio ' + d.empresa + ' ' + d.ym).replace(/[^\w\- ]+/g, '').replace(/\s+/g, '-') + '.pdf'; }
  function carregarHtml2pdf() {
    if (window.html2pdf) return Promise.resolve();
    return new Promise(function (ok, erro) {
      var s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      s.onload = ok; s.onerror = function () { erro(new Error('Não consegui baixar o gerador de PDF. Use Imprimir › Salvar como PDF.')); }; document.head.appendChild(s);
    });
  }

  window.rel = {
    mudar: function (k, v) {
      cfg[k] = v;
      if (k === 'mes') { var c = el('relComentario'); if (c) c.value = notas()[v] || ''; }
      atualizarPrevia();
    },
    secao: function (cb) { cfg.secoes[cb.dataset.sec] = cb.checked ? 1 : 0; atualizarPrevia(); },
    comentario: function (t) {
      notas()[cfg.mes] = String(t).slice(0, 1500);
      clearTimeout(tPrev); tPrev = setTimeout(function () { atualizarPrevia(); if (!alvo) salvar(); }, 400);
    },
    marca: function () {
      var m = marca(); m.escritorio = el('relEscritorio').value.trim(); m.contato = el('relContato').value.trim(); m.cor = el('relCor').value || '#C5A059';
      guardarMarca(m); clearTimeout(tPrev); tPrev = setTimeout(atualizarPrevia, 250);
    },
    logo: function (arq) {
      if (!arq) return;
      if (!/^image\//.test(arq.type)) return toast('Use uma imagem PNG ou JPG.', 'error');
      var r = new FileReader();
      r.onload = function () {
        var img = new Image();
        img.onload = function () {
          var k = Math.min(1, 480 / img.width, 160 / img.height), c = document.createElement('canvas');
          c.width = Math.max(1, Math.round(img.width * k)); c.height = Math.max(1, Math.round(img.height * k));
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          var m = marca(); m.logo = c.toDataURL(arq.type === 'image/jpeg' ? 'image/jpeg' : 'image/png', 0.9);
          if (m.logo.length > 300000) m.logo = c.toDataURL('image/jpeg', 0.82);
          guardarMarca(m); toast('Logo salvo.'); render();
        };
        img.onerror = function () { toast('Não consegui ler essa imagem.', 'error'); };
        img.src = r.result;
      };
      r.readAsDataURL(arq);
    },
    semLogo: function () { var m = marca(); m.logo = ''; guardarMarca(m); render(); },
    pdf: async function () {
      var d = dados(cfg.mes, cfg.regime), btn = el('relPdfBtn');
      try {
        if (btn) { btn.disabled = true; btn.textContent = 'Gerando PDF…'; }
        await carregarHtml2pdf();
        var caixa = document.createElement('div'); caixa.style.cssText = 'position:fixed;left:-10000px;top:0;background:#fff';
        caixa.innerHTML = montar(d, marca(), notas()[cfg.mes] || ''); document.body.appendChild(caixa);
        var m = marca();
        await window.html2pdf().set({
          margin: [10, 10, 14, 10], filename: nomeArquivo(d), image: { type: 'jpeg', quality: 0.96 },
          html2canvas: { scale: 2, backgroundColor: '#ffffff', useCORS: true }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          pagebreak: { mode: ['css', 'legacy'], avoid: ['.rel-bloco', 'tr'] }
        }).from(caixa.firstChild).toPdf().get('pdf').then(function (pdf) {
          var n = pdf.internal.getNumberOfPages();
          for (var i = 1; i <= n; i++) { pdf.setPage(i); pdf.setFontSize(8); pdf.setTextColor(120); pdf.text((m.escritorio ? m.escritorio + ' · ' : '') + d.empresa + ' · ' + mesExtenso(d.ym) + '   —   página ' + i + ' de ' + n, 105, 290, { align: 'center' }); }
        }).save();
        caixa.remove(); toast('PDF baixado.');
        if (window.logAudit) window.logAudit('export', 'relatorio', d.ym, 'Relatório mensal ' + mesExtenso(d.ym) + ' em PDF');
      } catch (e) { toast(e.message || 'Não consegui gerar o PDF.', 'error'); }
      finally { if (btn) { btn.disabled = false; btn.textContent = '⬇️ Baixar PDF'; } }
    },
    imprimir: function () {
      var d = dados(cfg.mes, cfg.regime), w = window.open('', '_blank');
      if (!w) return toast('O navegador bloqueou a janela. Libere pop-ups para este site.', 'error');
      w.document.write('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>' + esc(nomeArquivo(d).replace('.pdf', '')) + '</title><style>@page{size:A4;margin:12mm}body{margin:0;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}.rel-folha{width:100%!important;max-width:718px;margin:0 auto}.rel-bloco{break-inside:avoid}tr{break-inside:avoid}</style></head><body>' + montar(d, marca(), notas()[cfg.mes] || '') + '<script>window.onload=function(){setTimeout(function(){window.print()},300)}<\/script></body></html>');
      w.document.close();
    },
    whats: function () {
      var d = dados(cfg.mes, cfg.regime), m = marca(), com = notas()[cfg.mes] || '';
      var txt = '*Relatório financeiro — ' + d.empresa + '*\n' + mesExtenso(d.ym).replace(/^./, function (c) { return c.toUpperCase(); }) + '\n\n' +
        '⬇️ Entradas: ' + moeda(d.receitas) + '\n⬆️ Saídas: ' + moeda(d.despesas) + '\n' + (d.resultado >= 0 ? '✅ Lucro: ' : '🔴 Prejuízo: ') + moeda(Math.abs(d.resultado)) + (d.receitas ? ' (margem ' + pct(d.resultado, d.receitas) + ')' : '') + '\n🏦 Saldo em contas: ' + moeda(d.saldo) + '\n' +
        (d.atrasadoRec ? '⚠️ A receber em atraso: ' + moeda(d.atrasadoRec) + '\n' : '') + (d.atrasadoPag ? '⚠️ Contas vencidas: ' + moeda(d.atrasadoPag) + '\n' : '') +
        '📈 Saldo previsto em 30 dias: ' + moeda(d.proj30) + '\n' + (com ? '\n' + com + '\n' : '') + '\nO relatório completo em PDF segue em anexo.' + (m.escritorio ? '\n\n' + m.escritorio : '');
      var tel = String(d.telefone || '').replace(/\D/g, ''); if (tel && tel.length <= 11) tel = '55' + tel;
      window.open('https://wa.me/' + (tel.length >= 12 ? tel : '') + '?text=' + encodeURIComponent(txt), '_blank');
      toast('Baixe o PDF e anexe na conversa do WhatsApp.', 'info');
    },
    // Relatório de outra empresa do painel multiempresas, sem precisar abrir a empresa
    abrirEmpresa: function (id) {
      var x = window.empresas && window.empresas.estadoDe ? window.empresas.estadoDe(id) : null;
      if (!x) return toast('Atualize o painel de empresas e tente de novo.', 'error');
      alvo = x.ativa ? null : { estado: x.estado, nome: x.nome };
      window.switchView('reports');
    },
    voltar: function () { alvo = null; render(); },
    render: render,
    _montar: montar, _dados: dados
  };

  window.initRelatorioModule = function () {
    if (!el('rel-estilos')) {
      var s = document.createElement('style'); s.id = 'rel-estilos';
      s.textContent = '.rel-layout{display:grid;grid-template-columns:320px 1fr;gap:16px;align-items:start}.rel-lado{display:flex;flex-direction:column;gap:14px}.rel-lado .card{padding:16px}' +
        '.rel-previa-box{position:sticky;top:12px}.rel-previa{overflow:hidden;border-radius:10px}.rel-papel{width:766px;background:#fff;padding:24px;box-shadow:0 6px 30px rgba(0,0,0,.25);border-radius:6px}' +
        '@media (max-width:1100px){.rel-layout{grid-template-columns:1fr}.rel-previa-box{position:static}}';
      document.head.appendChild(s);
    }
    window.viewMeta.reports = { label: 'Relatório mensal', render: render };
  };
})();
