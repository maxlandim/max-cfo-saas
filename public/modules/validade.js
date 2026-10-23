/**
 * Landim Advisory — Validade dos produtos (lotes) e controle de vencimento
 * Cada produto com "controlar validade" guarda lotes: { id, lote, validade (AAAA-MM-DD), qtd, entradaEm, origem }.
 * Entradas criam lotes; saídas e ajustes para baixo consomem primeiro o lote que vence antes (PVPS / FEFO).
 * A quantidade dos lotes nunca passa do estoque do produto; o que sobrar sem lote aparece como "sem validade informada".
 * Perda por vencimento: tira do estoque e registra a movimentação "perda" (a compra já foi lançada como despesa).
 */
(function () {
  'use strict';
  var F = function () { return window.fin; };
  function st() { return window.state; }
  function el(id) { return document.getElementById(id); }
  function esc(s) { return F().esc(s); }
  function moeda(v) { return F().moeda(v); }
  function toast(m, t) { if (window.showToast) window.showToast(m, t || 'success'); }
  function hoje() { return F().hoje(); }
  function r4(v) { return Math.round(v * 10000) / 10000; }
  function r2(v) { return Math.round(v * 100) / 100; }
  function novoId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function qtdBR(v) { return String(r4(v)).replace('.', ','); }
  function dataOk(s) { return /^\d{4}-\d{2}-\d{2}$/.test(String(s || '')); }
  function salvar() { if (window.persist) window.persist(); else if (window.saveState) window.saveState(); }

  var V = {};
  var filtro = 'alerta'; // alerta | vencidos | 30 | 60 | 90 | todos

  V.diasAviso = function () { var d = Number(((st() && st().settings) || {}).validadeAviso); return d > 0 ? d : 30; };
  V.lotes = function (p) {
    if (!p) return [];
    p.lotes = (Array.isArray(p.lotes) ? p.lotes : []).filter(function (l) { return l && Number(l.qtd) > 0; });
    return p.lotes;
  };
  // Ordem de saída: o que vence antes sai primeiro; lotes sem validade por último
  V.ordenar = function (lista) {
    return lista.slice().sort(function (a, b) {
      var va = a.validade || '9999-99-99', vb = b.validade || '9999-99-99';
      return va < vb ? -1 : va > vb ? 1 : String(a.entradaEm || '').localeCompare(String(b.entradaEm || ''));
    });
  };
  V.totalLotes = function (p) { return r4(V.lotes(p).reduce(function (a, l) { return a + Number(l.qtd); }, 0)); };
  V.semLote = function (p) { return Math.max(0, r4(Math.max(Number(p.qtd) || 0, 0) - V.totalLotes(p))); };
  V.dias = function (validade) { return dataOk(validade) ? F().diffDias(hoje(), validade) : null; };
  V.situacao = function (validade) {
    var d = V.dias(validade);
    if (d === null) return { cls: '', txt: 'sem validade', dias: null };
    if (d < 0) return { cls: 'fin-neg', txt: 'vencido há ' + Math.abs(d) + (Math.abs(d) === 1 ? ' dia' : ' dias'), dias: d, vencido: true };
    if (d === 0) return { cls: 'fin-neg', txt: 'vence hoje', dias: 0 };
    if (d <= V.diasAviso()) return { cls: 'val-perto', txt: 'vence em ' + d + (d === 1 ? ' dia' : ' dias'), dias: d };
    return { cls: 'fin-pos', txt: 'vence em ' + d + ' dias', dias: d };
  };

  // Entrada: junta no lote igual (mesmo código e mesma validade) ou cria outro
  V.adicionar = function (p, dados, q, origem, data) {
    q = r4(Number(q) || 0);
    if (!p || !(q > 0) || !dados) return null;
    var lote = String(dados.lote || '').trim().slice(0, 40), validade = dataOk(dados.validade) ? dados.validade : '';
    if (!lote && !validade) return null;
    var l = V.lotes(p).find(function (x) { return (x.lote || '') === lote && (x.validade || '') === validade; });
    if (l) l.qtd = r4(Number(l.qtd) + q);
    else { l = { id: novoId(), lote: lote, validade: validade, qtd: q, entradaEm: data || hoje(), origem: origem || '' }; p.lotes.push(l); }
    if (validade) p.controlaValidade = true;
    return { lote: lote, validade: validade, qtd: q };
  };
  // Saída: consome do lote escolhido e depois na ordem de vencimento. Devolve o que saiu de cada lote.
  V.consumir = function (p, q, loteId) {
    var falta = r4(Number(q) || 0), saiu = [];
    if (!(falta > 0)) return saiu;
    var lista = V.ordenar(V.lotes(p));
    if (loteId) { var esc0 = lista.find(function (l) { return l.id === loteId; }); if (esc0) lista = [esc0].concat(lista.filter(function (l) { return l !== esc0; })); }
    // estoque sem lote (se houver) sai depois dos lotes já vencidos? Não: o estoque sem lote é de antes do controle,
    // então sai primeiro quem tem validade, para o controle refletir o que está na prateleira.
    for (var i = 0; i < lista.length && falta > 0; i++) {
      var l = lista[i], tira = Math.min(Number(l.qtd), falta);
      l.qtd = r4(Number(l.qtd) - tira); falta = r4(falta - tira);
      saiu.push({ lote: l.lote || '', validade: l.validade || '', qtd: r4(tira) });
    }
    V.lotes(p);
    return saiu;
  };
  // Os lotes não podem somar mais que o estoque (ex.: estoque ajustado para baixo em outro lugar)
  V.conferir = function (p) {
    var excesso = r4(V.totalLotes(p) - Math.max(Number(p.qtd) || 0, 0));
    if (excesso > 0) V.consumir(p, excesso);
  };
  V.proximo = function (p) { return V.ordenar(V.lotes(p)).find(function (l) { return l.validade; }) || null; };

  // Todos os lotes de todos os produtos, com a situação
  V.todos = function () {
    var out = [];
    (st().inventory || []).forEach(function (p) {
      V.lotes(p).forEach(function (l) { var s = V.situacao(l.validade); out.push({ p: p, l: l, s: s, valor: r2(Number(l.qtd) * (Number(p.custo) || 0)) }); });
    });
    return out.sort(function (a, b) { var va = a.l.validade || '9999', vb = b.l.validade || '9999'; return va < vb ? -1 : va > vb ? 1 : 0; });
  };
  V.resumo = function () {
    var t = V.todos(), aviso = V.diasAviso();
    var venc = t.filter(function (x) { return x.s.vencido; }), perto = t.filter(function (x) { return x.s.dias !== null && x.s.dias >= 0 && x.s.dias <= aviso; });
    var semInfo = (st().inventory || []).filter(function (p) { return p.controlaValidade && V.semLote(p) > 0; });
    var soma = function (l) { return r2(l.reduce(function (a, x) { return a + x.valor; }, 0)); };
    return { todos: t, vencidos: venc, perto: perto, semInfo: semInfo, valorVencido: soma(venc), valorPerto: soma(perto), aviso: aviso };
  };
  // Para "Precisa da sua atenção" no Início
  V.alertas = function () {
    if (!st() || !(st().inventory || []).some(function (p) { return p.lotes && p.lotes.length; })) return [];
    var r = V.resumo(), lista = [];
    if (r.vencidos.length) lista.push({ cls: 'red', t: '🗓️ ' + r.vencidos.length + (r.vencidos.length === 1 ? ' lote vencido' : ' lotes vencidos') + ' no estoque (' + moeda(r.valorVencido) + ' a custo). Retire da venda e dê baixa como perda.', go: 'inventory', acao: "validade.abrir('vencidos')" });
    if (r.perto.length) lista.push({ cls: 'gold', t: '🗓️ ' + r.perto.length + (r.perto.length === 1 ? ' lote vence' : ' lotes vencem') + ' nos próximos ' + r.aviso + ' dias (' + moeda(r.valorPerto) + '). Priorize a venda desses produtos.', go: 'inventory', acao: "validade.abrir('alerta')" });
    return lista;
  };

  // ── Campos de lote e validade nos formulários ──
  V.campos = function (pre, obrig) {
    return '<div class="form-field"><label class="form-label" for="' + pre + 'Lote">Lote</label><input class="form-input" id="' + pre + 'Lote" maxlength="40" placeholder="Opcional"></div>' +
      '<div class="form-field"><label class="form-label" for="' + pre + 'Val">Validade' + (obrig ? ' *' : '') + '</label><input type="date" class="form-input" id="' + pre + 'Val"></div>';
  };
  V.ler = function (pre) {
    var a = el(pre + 'Lote'), b = el(pre + 'Val');
    if (!a && !b) return null;
    var d = { lote: a ? a.value.trim() : '', validade: b ? b.value : '' };
    return d.lote || d.validade ? d : null;
  };
  // Texto curto para a lista de produtos
  V.etiqueta = function (p) {
    if (!p.controlaValidade && !(p.lotes && p.lotes.length)) return '';
    var l = V.proximo(p);
    if (!l) return '<span class="fin-sub">' + (V.semLote(p) > 0 ? 'validade não informada' : '—') + '</span>';
    var s = V.situacao(l.validade), mais = V.lotes(p).filter(function (x) { return x.validade; }).length - 1;
    return '<span class="' + s.cls + '" style="font-weight:600;white-space:nowrap">' + F().dataBR(l.validade) + '</span><div class="fin-sub">' + s.txt + (mais > 0 ? ' · +' + mais + (mais === 1 ? ' lote' : ' lotes') : '') + '</div>';
  };
  // Linha informativa na saída: de qual lote vai sair
  V.infoSaida = function (p) {
    var l = V.ordenar(V.lotes(p));
    if (!l.length) return '';
    return '<div class="form-field span-2"><label class="form-label" for="mLoteSai">Tirar de qual lote</label><select class="form-input" id="mLoteSai"><option value="">Automático: o que vence primeiro (' + esc((l[0].lote ? 'lote ' + l[0].lote + ', ' : '') + (l[0].validade ? 'vence ' + F().dataBR(l[0].validade) : 'sem validade')) + ')</option>' +
      l.map(function (x) { return '<option value="' + esc(x.id) + '">' + esc((x.lote ? 'Lote ' + x.lote : 'Sem código') + ' · ' + (x.validade ? 'vence ' + F().dataBR(x.validade) : 'sem validade') + ' · ' + qtdBR(x.qtd) + ' ' + p.unidade) + '</option>'; }).join('') + '</select>' +
      (V.situacao(l[0].validade).vencido ? '<div class="fin-alerta red" style="margin-top:8px">⚠️ O primeiro lote já está vencido. Se ele não pode ser vendido, dê baixa como perda em Estoque › Validades.</div>' : '') + '</div>';
  };

  // ── Painel "Validades" dentro da tela de Estoque ──
  V.painel = function () {
    var r = V.resumo(), aviso = r.aviso, controlados = (st().inventory || []).filter(function (p) { return p.controlaValidade || (p.lotes && p.lotes.length); });
    var lista = r.todos.filter(function (x) {
      if (filtro === 'todos') return true;
      if (filtro === 'vencidos') return x.s.vencido;
      if (filtro === 'alerta') return x.s.dias !== null && x.s.dias <= aviso;
      var n = Number(filtro); return x.s.dias !== null && x.s.dias <= n;
    });
    var bt = function (k, t) { return '<button class="fin-btn' + (filtro === k ? ' gold val-on' : '') + '" onclick="validade.filtrar(\'' + k + '\')">' + t + '</button>'; };
    var kp = '<div class="fin-kpis">' +
      '<div class="fin-kpi2"><div class="v ' + (r.vencidos.length ? 'fin-neg' : 'fin-pos') + '">' + r.vencidos.length + '</div><div class="l">Lotes vencidos · ' + moeda(r.valorVencido) + '</div></div>' +
      '<div class="fin-kpi2"><div class="v" style="color:var(--gold)">' + r.perto.length + '</div><div class="l">Vencem em até ' + aviso + ' dias · ' + moeda(r.valorPerto) + '</div></div>' +
      '<div class="fin-kpi2"><div class="v">' + controlados.length + '</div><div class="l">Produtos com controle de validade</div></div>' +
      '<div class="fin-kpi2"><div class="v ' + (r.semInfo.length ? 'val-perto' : '') + '">' + r.semInfo.length + '</div><div class="l">Com estoque sem validade informada</div></div>' +
      '</div>';
    if (!controlados.length) {
      return kp + '<div class="card"><div class="empty-block" style="padding:26px;line-height:1.7"><b>Nenhum produto com controle de validade ainda.</b><br>Abra um produto em ✏️ e marque <b>Controlar validade (lotes)</b>, ou dê entrada por nota fiscal: quando o XML traz lote e validade, o controle liga sozinho.<br>Nas entradas você informa o lote e a validade; nas saídas o sistema tira primeiro o que vence antes.</div></div>';
    }
    var html = kp +
      (r.semInfo.length ? '<div class="fin-alerta gold">Estes produtos têm estoque sem validade informada: ' + r.semInfo.map(function (p) { return '<a href="#" class="link-go" onclick="validade.informar(\'' + p.id + '\');return false">' + esc(p.nome) + ' (' + qtdBR(V.semLote(p)) + ' ' + esc(p.unidade) + ')</a>'; }).join(', ') + '. Clique para informar o lote e a validade do que já está na prateleira.</div>' : '') +
      '<div class="card"><div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:10px">' + bt('alerta', 'Vencidos e próximos ' + aviso + ' dias') + bt('vencidos', 'Só vencidos') + bt('30', 'Até 30 dias') + bt('60', 'Até 60 dias') + bt('90', 'Até 90 dias') + bt('todos', 'Todos os lotes') +
      '<span style="margin-left:auto" class="fin-sub">Avisar com <select class="form-input" style="width:auto;display:inline-block;padding:4px 8px" onchange="validade.aviso(this.value)">' + [7, 15, 30, 45, 60, 90].map(function (d) { return '<option value="' + d + '"' + (d === aviso ? ' selected' : '') + '>' + d + ' dias</option>'; }).join('') + '</select> de antecedência</span></div>' +
      (lista.length ? '<div class="table-scroll"><table class="data-table"><thead><tr><th>Produto</th><th>Lote</th><th>Validade</th><th>Situação</th><th>Qtd</th><th class="fin-hide-sm">Valor a custo</th><th>Ações</th></tr></thead><tbody>' +
        lista.map(function (x) {
          return '<tr><td><b>' + esc(x.p.nome) + '</b><div class="fin-sub">' + esc(x.p.sku || '') + '</div></td><td>' + esc(x.l.lote || '—') + '</td><td style="white-space:nowrap">' + (x.l.validade ? F().dataBR(x.l.validade) : '—') + '</td>' +
            '<td class="' + x.s.cls + '" style="font-weight:600;white-space:nowrap">' + x.s.txt + '</td><td style="white-space:nowrap">' + qtdBR(x.l.qtd) + ' ' + esc(x.p.unidade) + '</td><td class="fin-hide-sm">' + moeda(x.valor) + '</td>' +
            '<td><div class="fin-acoes">' + (x.s.vencido || (x.s.dias !== null && x.s.dias <= 7) ? '<button class="fin-btn" style="color:var(--danger)" onclick="validade.perda(\'' + x.p.id + '\',\'' + x.l.id + '\')">Baixar como perda</button>' : '') +
            '<button class="fin-btn" onclick="validade.editar(\'' + x.p.id + '\',\'' + x.l.id + '\')" title="Corrigir lote ou validade">✏️</button></div></td></tr>';
        }).join('') + '</tbody></table></div>' : '<div class="empty-block" style="padding:22px">' + (filtro === 'vencidos' ? '✅ Nenhum lote vencido.' : '✅ Nenhum lote neste filtro.') + '</div>') +
      '<p class="fin-sub" style="margin-top:8px">As saídas (vendas, orçamentos aprovados e ajustes) tiram primeiro do lote que vence antes. "Baixar como perda" retira o lote do estoque e registra a perda no histórico do produto; a compra já foi lançada como despesa, então não gera outro lançamento.</p>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px"><button class="btn-secondary" onclick="validade.exportar()">⬇️ Exportar lotes</button></div></div>';
    return html;
  };

  window.validade = {
    _V: V,
    filtrar: function (k) { filtro = k; if (window.renderInventory) window.renderInventory(); },
    abrir: function (k) { if (k) filtro = k; if (window.est) window.est.aba = 'validade'; if (window.switchView) window.switchView('inventory'); if (window.renderInventory) window.renderInventory(); },
    aviso: function (d) { st().settings = st().settings || {}; st().settings.validadeAviso = Number(d) || 30; salvar(); if (window.renderInventory) window.renderInventory(); },
    informar: function (id) {
      var p = (st().inventory || []).find(function (x) { return x.id === id; }); if (!p) return;
      var livre = V.semLote(p);
      if (!(livre > 0)) return toast('Todo o estoque deste produto já tem lote informado.', 'info');
      F().modal('valModal', '🗓️ Validade do estoque atual', '<p class="fin-sub" style="margin-bottom:10px">' + esc(p.nome) + ' · ' + qtdBR(livre) + ' ' + esc(p.unidade) + ' sem validade informada. Não muda a quantidade do estoque, só registra o lote. Se houver mais de um lote na prateleira, informe um de cada vez.</p>' +
        '<div class="form-grid">' + V.campos('vi', true) + '<div class="form-field"><label class="form-label" for="viQtd">Quantidade deste lote</label><input type="number" step="0.001" min="0" class="form-input" id="viQtd" value="' + r4(livre) + '"></div></div>',
        '<button class="btn-ghost" onclick="fin.fechar(\'valModal\')">Cancelar</button><button class="btn-primary" onclick="validade.confirmarInformar(\'' + id + '\')">Salvar</button>');
    },
    confirmarInformar: function (id) {
      var p = (st().inventory || []).find(function (x) { return x.id === id; }); if (!p) return;
      var d = V.ler('vi'), q = Number(el('viQtd').value) || 0, livre = V.semLote(p);
      if (!d || !d.validade) return toast('Informe a validade.', 'error');
      if (!(q > 0)) return toast('Informe a quantidade.', 'error');
      if (q > livre + 0.0001) return toast('A quantidade passa do estoque sem lote (' + qtdBR(livre) + ').', 'error');
      V.adicionar(p, d, q, 'informado', hoje());
      if (window.logAudit) window.logAudit('update', 'estoque', id, 'Validade informada: ' + qtdBR(q) + ' ' + p.unidade + ' de ' + p.nome + ' vence ' + F().dataBR(d.validade));
      salvar(); F().fechar('valModal'); if (window.renderInventory) window.renderInventory(); toast('Validade registrada.');
    },
    editar: function (id, loteId) {
      var p = (st().inventory || []).find(function (x) { return x.id === id; }); if (!p) return;
      var l = V.lotes(p).find(function (x) { return x.id === loteId; }); if (!l) return;
      F().modal('valModal', '✏️ Lote de ' + esc(p.nome), '<div class="form-grid">' + V.campos('ve') + '</div><p class="fin-sub" style="margin-top:8px">Quantidade do lote: ' + qtdBR(l.qtd) + ' ' + esc(p.unidade) + '. Para mudar a quantidade, use entrada, saída ou ajuste no produto.</p>',
        '<button class="btn-ghost" onclick="fin.fechar(\'valModal\')">Cancelar</button><button class="btn-primary" onclick="validade.salvarLote(\'' + id + '\',\'' + loteId + '\')">Salvar</button>');
      el('veLote').value = l.lote || ''; el('veVal').value = l.validade || '';
    },
    salvarLote: function (id, loteId) {
      var p = (st().inventory || []).find(function (x) { return x.id === id; }); if (!p) return;
      var l = V.lotes(p).find(function (x) { return x.id === loteId; }); if (!l) return;
      l.lote = el('veLote').value.trim().slice(0, 40); l.validade = dataOk(el('veVal').value) ? el('veVal').value : '';
      salvar(); F().fechar('valModal'); if (window.renderInventory) window.renderInventory(); toast('Lote atualizado.');
    },
    perda: function (id, loteId) {
      var p = (st().inventory || []).find(function (x) { return x.id === id; }); if (!p) return;
      var l = V.lotes(p).find(function (x) { return x.id === loteId; }); if (!l) return;
      var valor = r2(Number(l.qtd) * (Number(p.custo) || 0));
      if (!confirm('Dar baixa de ' + qtdBR(l.qtd) + ' ' + p.unidade + ' de ' + p.nome + (l.lote ? ' (lote ' + l.lote + ')' : '') + ' como perda por vencimento? Valor a custo: ' + moeda(valor) + '.')) return;
      window.est.movimentar(id, 'perda', Number(l.qtd), Number(p.custo) || 0, 'Perda por vencimento' + (l.lote ? ' — lote ' + l.lote : '') + (l.validade ? ' (venceu ' + F().dataBR(l.validade) + ')' : ''), true, hoje(), '', { loteId: loteId });
      if (window.renderInventory) window.renderInventory();
      toast('Baixa registrada: ' + moeda(valor) + ' de perda.');
    },
    exportar: function () {
      var linhas = ['Código;Produto;Lote;Validade;Dias para vencer;Quantidade;Unidade;Custo unitário;Valor a custo'].concat(V.todos().map(function (x) {
        return [x.p.sku || '', '"' + String(x.p.nome).replace(/"/g, '""') + '"', '"' + String(x.l.lote || '').replace(/"/g, '""') + '"', x.l.validade ? F().dataBR(x.l.validade) : '', x.s.dias === null ? '' : x.s.dias, qtdBR(x.l.qtd), x.p.unidade, (Number(x.p.custo) || 0).toFixed(2).replace('.', ','), x.valor.toFixed(2).replace('.', ',')].join(';');
      }));
      F().baixarArquivo('﻿' + linhas.join('\n'), 'validades-' + hoje() + '.csv', 'text/csv');
    }
  };
  window.maxcfoValidade = V;

  window.initValidadeModule = function () {
    if (!el('valEstilo')) {
      var css = document.createElement('style'); css.id = 'valEstilo';
      css.textContent = '.val-perto{color:#d97706}.fin-btn.val-on{background:var(--gold);color:#0B1220;border-color:var(--gold)}.est-abas{display:flex;gap:6px;margin:0 0 14px;flex-wrap:wrap}.est-abas button{border:1px solid var(--border);background:transparent;color:var(--text);padding:8px 14px;border-radius:999px;cursor:pointer;font-weight:600;font-size:13px}.est-abas button.on{background:var(--gold);color:#0B1220;border-color:var(--gold)}';
      document.head.appendChild(css);
    }
  };
})();
