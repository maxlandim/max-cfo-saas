/**
 * Landim Advisory — Vendas e operação
 * CRM (oportunidades), orçamentos, ordens de serviço, comissões, estoque e contratos recorrentes.
 * Tudo grava na nuvem com o restante da empresa e se liga ao contas a receber e a pagar.
 */
(function () {
  'use strict';
  var F = function () { return window.fin; };
  function st() { return window.state; }
  function el(id) { return document.getElementById(id); }
  function esc(s) { return F().esc(s); }
  function moeda(v) { return F().moeda(v); }
  function toast(m, t) { if (window.showToast) window.showToast(m, t || 'success'); }
  function salvar() { if (window.persist) window.persist(); }
  function r2(v) { return Math.round(v * 100) / 100; }
  function r4(v) { return Math.round(v * 10000) / 10000; }
  function num(v) { return window.fin.num(v); }
  function novoId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function hoje() { return F().hoje(); }
  function dataBR(d) { return F().dataBR(d); }
  function proximo(chave, prefixo) {
    st().seq = st().seq || {};
    st().seq[chave] = (st().seq[chave] || 0) + 1;
    return prefixo + String(st().seq[chave]).padStart(4, '0');
  }
  function listaContatos(tipo) {
    return F().todosContatos().filter(function (c) { return !tipo || c.tipo === tipo || c.tipo === 'ambos'; }).map(function (c) { return '<option value="' + esc(c.nome) + '">'; }).join('');
  }
  function telefoneDe(nome) { var c = (st().contatos || {})[nome]; return c && c.telefone ? c.telefone : ''; }
  function whatsLink(tel, texto) {
    var d = String(tel || '').replace(/\D/g, ''); if (d.length < 10) return '';
    if (d.indexOf('55') !== 0 || d.length <= 11) d = '55' + d;
    return 'https://wa.me/' + d + '?text=' + encodeURIComponent(texto);
  }
  function empresa() { var s = st().settings || {}; return { nome: s.company || s.name || '', cnpj: s.cnpj || '', tel: s.telefone || '', email: s.email || '' }; }
  function imprimir(titulo, corpo) {
    var w = window.open('', '_blank');
    if (!w) return toast('Libere as janelas do navegador para imprimir.', 'error');
    var e = empresa();
    w.document.write('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>' + esc(titulo) + '</title><style>body{font-family:Arial,sans-serif;color:#111;max-width:800px;margin:30px auto;padding:0 24px;font-size:14px}header{display:flex;justify-content:space-between;border-bottom:2px solid #111;padding-bottom:10px;margin-bottom:18px}h1{font-size:20px;margin:0}table{width:100%;border-collapse:collapse;margin:12px 0}th,td{border-bottom:1px solid #ccc;padding:7px;text-align:left}td.n,th.n{text-align:right}.tot{font-size:17px;font-weight:bold;text-align:right}.ass{margin-top:60px;display:flex;gap:40px}.ass div{flex:1;border-top:1px solid #111;text-align:center;padding-top:6px}button{margin-top:24px}@media print{button{display:none}}</style></head><body>' +
      '<header><div><b>' + esc(e.nome || 'Minha empresa') + '</b>' + (e.cnpj ? '<br>CNPJ ' + esc(F().docFmt(e.cnpj)) : '') + (e.tel ? '<br>' + esc(e.tel) : '') + '</div><div style="text-align:right"><h1>' + esc(titulo) + '</h1>' + dataBR(hoje()) + '</div></header>' + corpo +
      '<button onclick="print()">Imprimir ou salvar em PDF</button></body></html>');
    w.document.close();
  }
  function estilos() {
    if (el('op-estilos')) return;
    var s = document.createElement('style'); s.id = 'op-estilos';
    s.textContent = '.op-board{display:grid;grid-template-columns:repeat(4,minmax(230px,1fr));gap:12px;overflow-x:auto;padding-bottom:6px}.op-col{background:var(--bg-surf);border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px;min-height:140px}' +
      '.op-col h3{font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--text-muted);margin:2px 4px 10px;display:flex;justify-content:space-between}.op-card{background:var(--bg-card);border:1px solid var(--border);border-radius:10px;padding:10px 12px;margin-bottom:8px}' +
      '.op-card .t{font-weight:700}.op-card .m{font-size:12px;color:var(--text-muted);margin-top:2px}.op-card .v{color:var(--gold);font-weight:800;margin-top:6px}.op-card .a{display:flex;gap:4px;flex-wrap:wrap;margin-top:8px}' +
      '.op-itens td{padding:4px}.op-itens input{width:100%}@media (max-width:900px){.op-board{grid-template-columns:repeat(4,240px)}}';
    document.head.appendChild(s);
  }
  function cabecalho(titulo, sub, botoes) {
    return '<div class="page-header"><div class="page-header-text"><h1>' + titulo + '</h1><p class="page-subtitle">' + sub + '</p></div><div class="page-header-actions">' + (botoes || '') + '</div></div>';
  }
  function kpis(itens) {
    return '<div class="fin-kpis">' + itens.map(function (k) { return '<div class="fin-kpi2"><div class="v ' + (k.c || '') + '"' + (k.gold ? ' style="color:var(--gold)"' : '') + '>' + k.v + '</div><div class="l">' + k.l + '</div>' + (k.s ? '<div class="s">' + k.s + '</div>' : '') + '</div>'; }).join('') + '</div>';
  }

  // ═════════════════════════ CRM ═════════════════════════
  var ETAPAS = [['novo', 'Novo', 10], ['contato', 'Contato feito', 25], ['proposta', 'Proposta enviada', 50], ['negociacao', 'Negociação', 75]];
  var ORIGENS = ['Indicação', 'WhatsApp', 'Instagram', 'Site', 'Google', 'Evento', 'Cliente antigo', 'Outro'];
  function migrarCRM() {
    st().crm = (st().crm || []).map(function (l) {
      if (l.etapa) return l;
      var mapa = { Leads: 'novo', Negociacao: 'negociacao', Fechado: 'ganho' };
      return { id: l.id || novoId(), nome: l.name || l.nome || 'Oportunidade', cliente: l.name || '', valor: num(l.value), etapa: mapa[l.status] || 'novo', origem: '', criadoEm: hoje(), fechadoEm: l.status === 'Fechado' ? hoje() : '' };
    });
  }
  window.renderCRM = function () {
    var v = el('view-crm'); if (!v) return;
    migrarCRM();
    var abertas = st().crm.filter(function (l) { return l.etapa !== 'ganho' && l.etapa !== 'perdido'; });
    var limite = F().addDias(hoje(), -90), mes = F().mesAtual();
    var fechadas90 = st().crm.filter(function (l) { return (l.etapa === 'ganho' || l.etapa === 'perdido') && (l.fechadoEm || '') >= limite; });
    var ganhas90 = fechadas90.filter(function (l) { return l.etapa === 'ganho'; });
    var ganhasMes = st().crm.filter(function (l) { return l.etapa === 'ganho' && (l.fechadoEm || '').slice(0, 7) === mes; });
    var ponderado = abertas.reduce(function (a, l) { var e = ETAPAS.find(function (x) { return x[0] === l.etapa; }); return a + l.valor * (e ? e[2] : 10) / 100; }, 0);
    var col = ETAPAS.map(function (e, ie) {
      var itens = abertas.filter(function (l) { return l.etapa === e[0]; });
      return '<div class="op-col"><h3><span>' + e[1] + '</span><span>' + itens.length + ' · ' + moeda(itens.reduce(function (a, l) { return a + l.valor; }, 0)) + '</span></h3>' +
        itens.map(function (l) {
          var atrasada = l.proximaData && l.proximaData < hoje();
          return '<div class="op-card"><div class="t">' + esc(l.nome) + '</div><div class="m">' + esc([l.cliente, l.origem].filter(Boolean).join(' · ')) + '</div>' +
            (l.proximaData ? '<div class="m" style="color:' + (atrasada ? 'var(--danger)' : 'var(--text-muted)') + '">' + (atrasada ? '⏰ ' : '📅 ') + dataBR(l.proximaData) + (l.proximaAcao ? ' — ' + esc(l.proximaAcao) : '') + '</div>' : '') +
            '<div class="v">' + moeda(l.valor) + '</div><div class="a">' +
            (ie > 0 ? '<button class="fin-btn" title="Voltar etapa" onclick="crm.mover(\'' + l.id + '\',-1)">◀</button>' : '') +
            (ie < ETAPAS.length - 1 ? '<button class="fin-btn" title="Avançar etapa" onclick="crm.mover(\'' + l.id + '\',1)">▶</button>' : '') +
            '<button class="fin-btn ok" onclick="crm.ganhar(\'' + l.id + '\')">✓ Ganho</button><button class="fin-btn" onclick="crm.perder(\'' + l.id + '\')">✗</button>' +
            '<button class="fin-btn" onclick="crm.editar(\'' + l.id + '\')">✏️</button>' +
            (l.telefone ? '<a class="fin-btn" target="_blank" rel="noopener" href="' + esc(whatsLink(l.telefone, 'Olá' + (l.cliente ? ', ' + l.cliente.split(' ')[0] : '') + '! ')) + '">💬</a>' : '') +
            '</div></div>';
        }).join('') + '</div>';
    }).join('');
    var recentes = st().crm.filter(function (l) { return l.etapa === 'ganho' || l.etapa === 'perdido'; }).sort(function (a, b) { return (b.fechadoEm || '') > (a.fechadoEm || '') ? 1 : -1; }).slice(0, 10);
    v.innerHTML = cabecalho('CRM — Oportunidades', 'Funil de vendas com valor, próxima ação e taxa de conversão', '<button class="btn-primary" onclick="crm.editar()">+ Oportunidade</button>') +
      kpis([
        { v: abertas.length, l: 'Oportunidades abertas', s: moeda(abertas.reduce(function (a, l) { return a + l.valor; }, 0)) + ' no funil' },
        { v: moeda(r2(ponderado)), l: 'Previsão ponderada', s: 'valor × chance de cada etapa', gold: true },
        { v: moeda(ganhasMes.reduce(function (a, l) { return a + l.valor; }, 0)), l: 'Ganho no mês', c: 'fin-pos' },
        { v: fechadas90.length ? Math.round(ganhas90.length / fechadas90.length * 100) + '%' : '—', l: 'Conversão (90 dias)', s: ganhas90.length + ' de ' + fechadas90.length + ' fechadas' }
      ]) +
      '<div class="op-board">' + col + '</div>' +
      (recentes.length ? '<div class="card" style="margin-top:16px"><div class="card-title" style="margin-bottom:8px">Fechadas recentemente</div><div class="table-scroll"><table class="data-table"><thead><tr><th>Oportunidade</th><th>Valor</th><th>Resultado</th><th>Data</th><th></th></tr></thead><tbody>' +
        recentes.map(function (l) { return '<tr><td><b>' + esc(l.nome) + '</b><div class="fin-sub">' + esc(l.cliente || '') + (l.motivo ? ' · ' + esc(l.motivo) : '') + '</div></td><td>' + moeda(l.valor) + '</td><td><span class="fin-sit ' + (l.etapa === 'ganho' ? 'ok' : 'atraso') + '">' + (l.etapa === 'ganho' ? 'Ganha' : 'Perdida') + '</span></td><td>' + dataBR(l.fechadoEm) + '</td><td><button class="fin-btn" onclick="crm.reabrir(\'' + l.id + '\')">Reabrir</button></td></tr>'; }).join('') + '</tbody></table></div></div>' : '');
  };
  window.crm = {
    editar: function (id) {
      var l = id ? st().crm.find(function (x) { return x.id === id; }) : null;
      F().modal('crmModal2', l ? '✏️ Editar oportunidade' : '🤝 Nova oportunidade',
        '<div class="form-grid">' +
        '<div class="form-field span-2"><label class="form-label" for="crNome">Negócio *</label><input class="form-input" id="crNome" maxlength="80" placeholder="Ex.: Consultoria mensal" value="' + esc(l ? l.nome : '') + '"></div>' +
        '<div class="form-field"><label class="form-label" for="crCliente">Cliente</label><input class="form-input" id="crCliente" list="crListaCli" maxlength="80" value="' + esc(l ? l.cliente : '') + '"><datalist id="crListaCli">' + listaContatos('cliente') + '</datalist></div>' +
        '<div class="form-field"><label class="form-label" for="crTel">WhatsApp</label><input class="form-input" id="crTel" maxlength="20" value="' + esc(l ? l.telefone || '' : '') + '"></div>' +
        '<div class="form-field"><label class="form-label" for="crValor">Valor estimado (R$)</label><input type="number" step="0.01" min="0" class="form-input" id="crValor" value="' + (l ? l.valor : '') + '"></div>' +
        '<div class="form-field"><label class="form-label" for="crEtapa">Etapa</label><select class="form-input" id="crEtapa">' + ETAPAS.map(function (e) { return '<option value="' + e[0] + '"' + (l && l.etapa === e[0] ? ' selected' : '') + '>' + e[1] + '</option>'; }).join('') + '</select></div>' +
        '<div class="form-field"><label class="form-label" for="crOrigem">Origem</label><select class="form-input" id="crOrigem"><option value="">—</option>' + ORIGENS.map(function (o) { return '<option' + (l && l.origem === o ? ' selected' : '') + '>' + o + '</option>'; }).join('') + '</select></div>' +
        '<div class="form-field"><label class="form-label" for="crData">Próxima ação em</label><input type="date" class="form-input" id="crData" value="' + esc(l ? l.proximaData || '' : F().addDias(hoje(), 2)) + '"></div>' +
        '<div class="form-field span-2"><label class="form-label" for="crAcao">Próxima ação</label><input class="form-input" id="crAcao" maxlength="100" placeholder="Ex.: Ligar para apresentar proposta" value="' + esc(l ? l.proximaAcao || '' : '') + '"></div>' +
        '<div class="form-field span-2"><label class="form-label" for="crObs">Observações</label><input class="form-input" id="crObs" maxlength="300" value="' + esc(l ? l.obs || '' : '') + '"></div>' +
        '</div>',
        (l ? '<button class="btn-ghost" style="margin-right:auto;color:var(--danger)" onclick="crm.excluir(\'' + l.id + '\')">Excluir</button>' : '') +
        '<button class="btn-ghost" onclick="fin.fechar(\'crmModal2\')">Cancelar</button><button class="btn-primary" onclick="crm.salvar(\'' + (l ? l.id : '') + '\')">Salvar</button>');
      el('crCliente').addEventListener('change', function () { if (!el('crTel').value) el('crTel').value = telefoneDe(el('crCliente').value); });
    },
    salvar: function (id) {
      var nome = el('crNome').value.trim(); if (!nome) return toast('Dê um nome para a oportunidade.', 'error');
      var dados = { nome: nome, cliente: el('crCliente').value.trim(), telefone: el('crTel').value.trim(), valor: r2(num(el('crValor').value)), etapa: el('crEtapa').value, origem: el('crOrigem').value, proximaData: el('crData').value, proximaAcao: el('crAcao').value.trim(), obs: el('crObs').value.trim() };
      if (id) Object.assign(st().crm.find(function (x) { return x.id === id; }) || {}, dados);
      else st().crm.push(Object.assign({ id: novoId(), criadoEm: hoje() }, dados));
      if (dados.cliente) { F().registrarContato(dados.cliente, 'RECEITA'); var c = st().contatos[dados.cliente]; if (c && dados.telefone && !c.telefone) c.telefone = dados.telefone; }
      salvar(); F().fechar('crmModal2'); window.renderCRM(); toast('Oportunidade salva.');
    },
    mover: function (id, d) {
      var l = st().crm.find(function (x) { return x.id === id; }); if (!l) return;
      var i = ETAPAS.findIndex(function (e) { return e[0] === l.etapa; });
      var n = Math.max(0, Math.min(ETAPAS.length - 1, i + d)); l.etapa = ETAPAS[n][0];
      salvar(); window.renderCRM();
    },
    ganhar: function (id) {
      var l = st().crm.find(function (x) { return x.id === id; }); if (!l) return;
      l.etapa = 'ganho'; l.fechadoEm = hoje();
      if (l.cliente) F().registrarContato(l.cliente, 'RECEITA');
      salvar(); window.renderCRM();
      if (confirm('Oportunidade ganha! Criar um orçamento para "' + (l.cliente || l.nome) + '" agora?')) orc.editar(null, { cliente: l.cliente, itens: [{ desc: l.nome, qtd: 1, valor: l.valor }], crmId: l.id });
    },
    perder: function (id) {
      var l = st().crm.find(function (x) { return x.id === id; }); if (!l) return;
      var motivo = prompt('Por que foi perdida? (preço, prazo, concorrente…)', '');
      if (motivo === null) return;
      l.etapa = 'perdido'; l.fechadoEm = hoje(); l.motivo = motivo.slice(0, 100);
      salvar(); window.renderCRM();
    },
    reabrir: function (id) { var l = st().crm.find(function (x) { return x.id === id; }); if (!l) return; l.etapa = 'negociacao'; l.fechadoEm = ''; salvar(); window.renderCRM(); },
    excluir: function (id) { if (!confirm('Excluir esta oportunidade?')) return; st().crm = st().crm.filter(function (x) { return x.id !== id; }); salvar(); F().fechar('crmModal2'); window.renderCRM(); }
  };

  // ═════════════════════════ ORÇAMENTOS ═════════════════════════
  var STATUS_ORC = { rascunho: ['Rascunho', 'aberto'], enviado: ['Enviado', 'hoje'], aprovado: ['Aprovado', 'ok'], recusado: ['Recusado', 'atraso'], faturado: ['Faturado', 'ok'] };
  function migrarOrc() {
    st().budgets = (st().budgets || []).map(function (b) {
      if (b.itens) return b;
      var mapa = { 'Rascunho': 'rascunho', 'Enviado': 'enviado', 'Aprovado': 'aprovado', 'Em Execução': 'aprovado', 'Concluído': 'aprovado', 'Faturado': 'faturado' };
      return { id: b.id || novoId(), numero: b.num || proximo('orc', 'ORC-'), cliente: b.cliente || '', itens: [{ desc: 'Valor total', qtd: 1, valor: num(b.total) }], desconto: 0, data: (b.data || hoje()).slice(0, 10), validade: '', status: mapa[b.status] || 'rascunho' };
    });
  }
  function totalOrc(b) { return r2(Math.max(0, (b.itens || []).reduce(function (a, i) { return a + num(i.qtd) * num(i.valor); }, 0) - num(b.desconto))); }
  function textoOrc(b) {
    var e = empresa();
    return 'Olá' + (b.cliente ? ', ' + b.cliente.split(' ')[0] : '') + '! Segue o orçamento *' + b.numero + '*' + (e.nome ? ' da ' + e.nome : '') + ':\n\n' +
      b.itens.map(function (i) { return '• ' + i.desc + ' — ' + num(i.qtd) + ' x ' + moeda(num(i.valor)) + ' = ' + moeda(r2(num(i.qtd) * num(i.valor))); }).join('\n') +
      (num(b.desconto) ? '\nDesconto: −' + moeda(num(b.desconto)) : '') + '\n\n*Total: ' + moeda(totalOrc(b)) + '*' +
      (b.condicoes ? '\nCondições: ' + b.condicoes : '') + (b.validade ? '\nVálido até ' + dataBR(b.validade) + '.' : '') + '\n\nQualquer dúvida, estou à disposição.';
  }
  window.renderBudget = function () {
    var v = el('view-budget'); if (!v) return;
    migrarOrc();
    var lista = st().budgets.slice().sort(function (a, b) { return (b.data || '') > (a.data || '') ? 1 : -1; });
    var mes = F().mesAtual(), h = hoje();
    var abertos = lista.filter(function (b) { return b.status === 'rascunho' || b.status === 'enviado'; });
    var aprovados = lista.filter(function (b) { return b.status === 'aprovado'; });
    var fatMes = lista.filter(function (b) { return b.status === 'faturado' && (b.faturadoEm || '').slice(0, 7) === mes; });
    var decididos = lista.filter(function (b) { return ['aprovado', 'faturado', 'recusado'].indexOf(b.status) > -1; });
    var soma = function (l) { return r2(l.reduce(function (a, b) { return a + totalOrc(b); }, 0)); };
    v.innerHTML = cabecalho('Orçamentos', 'Proposta com itens, envio pelo WhatsApp, impressão e faturamento para o contas a receber', '<button class="btn-primary" onclick="orc.editar()">+ Novo orçamento</button>') +
      kpis([
        { v: moeda(soma(abertos)), l: 'Em aberto (' + abertos.length + ')', s: 'rascunhos e enviados' },
        { v: moeda(soma(aprovados)), l: 'Aprovados a faturar (' + aprovados.length + ')', gold: true },
        { v: moeda(soma(fatMes)), l: 'Faturado no mês', c: 'fin-pos' },
        { v: decididos.length ? Math.round(decididos.filter(function (b) { return b.status !== 'recusado'; }).length / decididos.length * 100) + '%' : '—', l: 'Taxa de aprovação' }
      ]) +
      '<div class="card">' + (lista.length ? '<div class="table-scroll"><table class="data-table"><thead><tr><th>Número</th><th>Cliente</th><th>Total</th><th>Situação</th><th>Data</th><th>Ações</th></tr></thead><tbody>' +
        lista.map(function (b) {
          var s = STATUS_ORC[b.status] || STATUS_ORC.rascunho, vencido = b.validade && b.validade < h && (b.status === 'rascunho' || b.status === 'enviado');
          var acoes = '<button class="fin-btn" onclick="orc.editar(\'' + b.id + '\')">✏️</button><button class="fin-btn" onclick="orc.imprimir(\'' + b.id + '\')" title="Imprimir ou PDF">🖨️</button><button class="fin-btn" onclick="orc.enviar(\'' + b.id + '\')" title="Enviar no WhatsApp">💬</button>';
          if (b.status === 'rascunho' || b.status === 'enviado') acoes += '<button class="fin-btn ok" onclick="orc.status(\'' + b.id + '\',\'aprovado\')">✓ Aprovar</button><button class="fin-btn" onclick="orc.status(\'' + b.id + '\',\'recusado\')">✗</button>';
          if (b.status === 'aprovado') acoes += '<button class="fin-btn gold" onclick="orc.faturar(\'' + b.id + '\')">💰 Faturar</button>';
          acoes += '<button class="fin-btn" onclick="orc.duplicar(\'' + b.id + '\')" title="Duplicar">⧉</button>';
          return '<tr><td><b>' + esc(b.numero) + '</b></td><td>' + esc(b.cliente || '—') + '<div class="fin-sub">' + (b.itens || []).length + ' item(ns)' + (b.vendedor ? ' · ' + esc(b.vendedor) : '') + '</div></td><td style="font-weight:700">' + moeda(totalOrc(b)) + '</td>' +
            '<td><span class="fin-sit ' + (vencido ? 'atraso' : s[1]) + '">' + (vencido ? 'Validade vencida' : s[0]) + '</span></td><td>' + dataBR(b.data) + (b.validade ? '<div class="fin-sub">válido até ' + dataBR(b.validade) + '</div>' : '') + '</td><td><div class="fin-acoes">' + acoes + '</div></td></tr>';
        }).join('') + '</tbody></table></div>' : '<div class="empty-block" style="padding:28px">Nenhum orçamento. Crie o primeiro e envie pelo WhatsApp.</div>') + '</div>';
  };
  function linhaItem(i, k) {
    return '<tr><td><input class="form-input" list="orcListaProd" data-k="desc" value="' + esc(i.desc || '') + '" placeholder="Produto ou serviço" oninput="orc.recalc()" onchange="orc.produto(this)"></td>' +
      '<td style="width:80px"><input class="form-input" type="number" step="0.01" min="0" data-k="qtd" value="' + (i.qtd == null ? 1 : i.qtd) + '" oninput="orc.recalc()"></td>' +
      '<td style="width:120px"><input class="form-input" type="number" step="0.01" min="0" data-k="valor" value="' + (i.valor == null ? '' : i.valor) + '" oninput="orc.recalc()"></td>' +
      '<td style="width:110px;text-align:right" class="op-sub">—</td><td style="width:34px"><button class="fin-btn" onclick="this.closest(\'tr\').remove();orc.recalc()" aria-label="Remover item">✕</button></td></tr>';
  }
  window.orc = {
    editar: function (id, base) {
      migrarOrc();
      var b = id ? st().budgets.find(function (x) { return x.id === id; }) : Object.assign({ itens: [{ desc: '', qtd: 1, valor: '' }], desconto: 0, validade: F().addDias(hoje(), 15) }, base || {});
      orc._editando = id || null; orc._base = base || null;
      var prods = (st().inventory || []).map(function (p) { return '<option value="' + esc(p.nome) + '">'; }).join('');
      F().modal('orcModal2', id ? '✏️ Orçamento ' + esc(b.numero) : '📝 Novo orçamento',
        '<div class="form-grid">' +
        '<div class="form-field"><label class="form-label" for="orCliente">Cliente *</label><input class="form-input" id="orCliente" list="orListaCli" maxlength="80" value="' + esc(b.cliente || '') + '"><datalist id="orListaCli">' + listaContatos('cliente') + '</datalist><datalist id="orcListaProd">' + prods + '</datalist></div>' +
        '<div class="form-field"><label class="form-label" for="orVendedor">Vendedor (comissão)</label><input class="form-input" id="orVendedor" maxlength="60" value="' + esc(b.vendedor || '') + '"></div>' +
        '<div class="form-field span-2"><table class="op-itens" style="width:100%"><thead><tr><th style="text-align:left">Item</th><th>Qtd</th><th>Valor unit.</th><th style="text-align:right">Subtotal</th><th></th></tr></thead><tbody id="orItens">' + (b.itens || []).map(linhaItem).join('') + '</tbody></table>' +
        '<button class="fin-btn gold" style="margin-top:6px" onclick="orc.addItem()">+ Item</button></div>' +
        '<div class="form-field"><label class="form-label" for="orDesc">Desconto (R$)</label><input type="number" step="0.01" min="0" class="form-input" id="orDesc" value="' + (b.desconto || 0) + '" oninput="orc.recalc()"></div>' +
        '<div class="form-field"><label class="form-label" for="orValid">Válido até</label><input type="date" class="form-input" id="orValid" value="' + esc(b.validade || '') + '"></div>' +
        '<div class="form-field span-2"><label class="form-label" for="orCond">Condições de pagamento e prazo</label><input class="form-input" id="orCond" maxlength="200" placeholder="Ex.: 50% na aprovação e 50% na entrega · entrega em 10 dias" value="' + esc(b.condicoes || '') + '"></div>' +
        '<div class="form-field span-2"><label class="form-label" for="orObs">Observações</label><input class="form-input" id="orObs" maxlength="300" value="' + esc(b.obs || '') + '"></div>' +
        '<div class="form-field span-2" style="text-align:right;font-size:18px;font-weight:800">Total: <span id="orTotal">—</span></div>' +
        '</div>',
        (id ? '<button class="btn-ghost" style="margin-right:auto;color:var(--danger)" onclick="orc.excluir(\'' + id + '\')">Excluir</button>' : '') +
        '<button class="btn-ghost" onclick="fin.fechar(\'orcModal2\')">Cancelar</button><button class="btn-primary" onclick="orc.salvar()">Salvar</button>', true);
      orc.recalc();
    },
    addItem: function () { var tb = el('orItens'); tb.insertAdjacentHTML('beforeend', linhaItem({ qtd: 1 })); tb.lastElementChild.querySelector('input').focus(); orc.recalc(); },
    produto: function (inp) {
      var p = (st().inventory || []).find(function (x) { return x.nome === inp.value; });
      if (!p) return;
      var tr = inp.closest('tr'); var v = tr.querySelector('[data-k="valor"]'); if (!v.value) v.value = p.preco || '';
      tr.dataset.produto = p.id; orc.recalc();
    },
    lerItens: function () {
      return [].map.call(document.querySelectorAll('#orItens tr'), function (tr) {
        var g = function (k) { return tr.querySelector('[data-k="' + k + '"]').value; };
        return { desc: g('desc').trim(), qtd: num(g('qtd')), valor: r2(num(g('valor'))), produtoId: tr.dataset.produto || '' };
      }).filter(function (i) { return i.desc; });
    },
    recalc: function () {
      [].forEach.call(document.querySelectorAll('#orItens tr'), function (tr) {
        var q = num(tr.querySelector('[data-k="qtd"]').value), v = num(tr.querySelector('[data-k="valor"]').value);
        tr.querySelector('.op-sub').textContent = moeda(r2(q * v));
      });
      var t = { itens: orc.lerItens(), desconto: num((el('orDesc') || {}).value) };
      if (el('orTotal')) el('orTotal').textContent = moeda(totalOrc(t));
    },
    salvar: function () {
      var cliente = el('orCliente').value.trim(), itens = orc.lerItens();
      if (!cliente) return toast('Informe o cliente.', 'error');
      if (!itens.length) return toast('Inclua pelo menos um item.', 'error');
      var dados = { cliente: cliente, vendedor: el('orVendedor').value.trim(), itens: itens, desconto: r2(num(el('orDesc').value)), validade: el('orValid').value, condicoes: el('orCond').value.trim(), obs: el('orObs').value.trim() };
      if (totalOrc(dados) <= 0) return toast('O total precisa ser maior que zero.', 'error');
      if (orc._editando) Object.assign(st().budgets.find(function (x) { return x.id === orc._editando; }), dados);
      else st().budgets.push(Object.assign({ id: novoId(), numero: proximo('orc', 'ORC-'), data: hoje(), status: 'rascunho', crmId: (orc._base || {}).crmId || '' }, dados));
      F().registrarContato(cliente, 'RECEITA');
      salvar(); F().fechar('orcModal2'); toast('Orçamento salvo.');
      if (el('view-budget').classList.contains('active')) window.renderBudget(); else window.switchView('budget');
    },
    status: function (id, s) {
      var b = st().budgets.find(function (x) { return x.id === id; }); if (!b) return;
      b.status = s; if (s === 'aprovado') b.aprovadoEm = hoje();
      salvar(); window.renderBudget(); toast('Orçamento ' + STATUS_ORC[s][0].toLowerCase() + '.');
    },
    enviar: function (id) {
      var b = st().budgets.find(function (x) { return x.id === id; }); if (!b) return;
      var tel = telefoneDe(b.cliente) || prompt('WhatsApp do cliente (com DDD):', '');
      if (!tel) return;
      var link = whatsLink(tel, textoOrc(b)); if (!link) return toast('Telefone inválido.', 'error');
      if ((st().contatos || {})[b.cliente] && !st().contatos[b.cliente].telefone) st().contatos[b.cliente].telefone = tel;
      if (b.status === 'rascunho') b.status = 'enviado';
      b.enviadoEm = hoje(); salvar(); window.renderBudget();
      window.open(link, '_blank', 'noopener');
    },
    imprimir: function (id) {
      var b = st().budgets.find(function (x) { return x.id === id; }); if (!b) return;
      var cont = (st().contatos || {})[b.cliente] || {};
      imprimir('Orçamento ' + b.numero,
        '<p><b>Cliente:</b> ' + esc(b.cliente) + (cont.documento ? ' · ' + esc(F().docFmt(cont.documento)) : '') + (cont.cidade ? ' · ' + esc(cont.cidade) : '') + '</p>' +
        '<table><thead><tr><th>Item</th><th class="n">Qtd</th><th class="n">Valor unit.</th><th class="n">Subtotal</th></tr></thead><tbody>' +
        b.itens.map(function (i) { return '<tr><td>' + esc(i.desc) + '</td><td class="n">' + num(i.qtd) + '</td><td class="n">' + moeda(num(i.valor)) + '</td><td class="n">' + moeda(r2(num(i.qtd) * num(i.valor))) + '</td></tr>'; }).join('') + '</tbody></table>' +
        (num(b.desconto) ? '<p style="text-align:right">Desconto: −' + moeda(num(b.desconto)) + '</p>' : '') + '<p class="tot">Total: ' + moeda(totalOrc(b)) + '</p>' +
        (b.condicoes ? '<p><b>Condições:</b> ' + esc(b.condicoes) + '</p>' : '') + (b.validade ? '<p><b>Validade:</b> ' + dataBR(b.validade) + '</p>' : '') + (b.obs ? '<p>' + esc(b.obs) + '</p>' : '') +
        '<div class="ass"><div>' + esc(empresa().nome || 'Empresa') + '</div><div>De acordo — ' + esc(b.cliente) + '</div></div>');
    },
    faturar: function (id) {
      var b = st().budgets.find(function (x) { return x.id === id; }); if (!b) return;
      var temEstoque = b.itens.some(function (i) { return i.produtoId; });
      F().faturar({ titulo: '💰 Faturar ' + b.numero, desc: 'Orçamento ' + b.numero + ' — ' + b.itens.map(function (i) { return i.desc; }).join(', ').slice(0, 70), contato: b.cliente, valor: totalOrc(b), categoria: temEstoque ? 'Vendas de Produto' : 'Serviços Prestados', origem: { tipo: 'orcamento', id: b.id } }, function (ids) {
        b.status = 'faturado'; b.faturadoEm = hoje(); b.txIds = ids;
        if (temEstoque && confirm('Dar saída no estoque dos itens deste orçamento?')) {
          b.itens.forEach(function (i) { if (i.produtoId) est.movimentar(i.produtoId, 'saida', num(i.qtd), num(i.valor), 'Orçamento ' + b.numero, true); });
        }
        salvar(); window.renderBudget();
      });
    },
    duplicar: function (id) { var b = st().budgets.find(function (x) { return x.id === id; }); if (b) orc.editar(null, { cliente: b.cliente, vendedor: b.vendedor, itens: JSON.parse(JSON.stringify(b.itens)), desconto: b.desconto, condicoes: b.condicoes, obs: b.obs, validade: F().addDias(hoje(), 15) }); },
    excluir: function (id) { if (!confirm('Excluir este orçamento?')) return; st().budgets = st().budgets.filter(function (x) { return x.id !== id; }); salvar(); F().fechar('orcModal2'); window.renderBudget(); }
  };

  // ═════════════════════════ ORDENS DE SERVIÇO ═════════════════════════
  var COLS_OS = [['pending', 'Aberta'], ['progress', 'Em andamento'], ['done', 'Concluída'], ['billed', 'Faturada']];
  function migrarOS() { (st().os || []).forEach(function (o) { if (!o.numero) o.numero = proximo('os', 'OS-'); o.value = num(o.value); }); st().os = st().os || []; }
  window.initOS = function () {
    var v = el('view-os'); if (!v) return;
    migrarOS();
    var lista = st().os, mes = F().mesAtual();
    var aFaturar = lista.filter(function (o) { return o.status === 'done'; });
    v.innerHTML = cabecalho('Ordens de Serviço', 'Do atendimento ao faturamento, com impressão para assinatura e aviso no WhatsApp', '<button class="btn-primary" onclick="os.editar()">+ Nova OS</button>') +
      kpis([
        { v: lista.filter(function (o) { return o.status === 'pending'; }).length, l: 'Abertas' },
        { v: lista.filter(function (o) { return o.status === 'progress'; }).length, l: 'Em andamento' },
        { v: moeda(r2(aFaturar.reduce(function (a, o) { return a + o.value; }, 0))), l: 'Concluídas a faturar (' + aFaturar.length + ')', gold: true },
        { v: moeda(r2(lista.filter(function (o) { return o.status === 'billed' && (o.faturadoEm || '').slice(0, 7) === mes; }).reduce(function (a, o) { return a + o.value; }, 0))), l: 'Faturado no mês', c: 'fin-pos' }
      ]) +
      '<div class="op-board">' + COLS_OS.map(function (c, ic) {
        var itens = lista.filter(function (o) { return o.status === c[0]; }).sort(function (a, b) { return (a.date || '') > (b.date || '') ? 1 : -1; });
        if (c[0] === 'billed') itens = itens.slice(-8).reverse();
        return '<div class="op-col"><h3><span>' + c[1] + '</span><span>' + itens.length + '</span></h3>' + itens.map(function (o) {
          var atrasada = o.date && o.date < hoje() && (o.status === 'pending' || o.status === 'progress');
          return '<div class="op-card"><div class="t">' + esc(o.numero) + ' · ' + esc(o.client) + '</div><div class="m">' + esc(o.equipamento ? o.equipamento + ' — ' : '') + esc((o.desc || '').slice(0, 90)) + '</div>' +
            (o.date ? '<div class="m" style="color:' + (atrasada ? 'var(--danger)' : 'var(--text-muted)') + '">' + (atrasada ? '⏰ prevista ' : '📅 prevista ') + dataBR(o.date) + (o.tecnico ? ' · ' + esc(o.tecnico) : '') + '</div>' : '') +
            '<div class="v">' + moeda(o.value) + '</div><div class="a">' +
            (ic > 0 && ic < 3 ? '<button class="fin-btn" onclick="os.mover(\'' + o.id + '\',-1)" title="Voltar">◀</button>' : '') +
            (ic < 2 ? '<button class="fin-btn" onclick="os.mover(\'' + o.id + '\',1)" title="Avançar">▶</button>' : '') +
            (c[0] === 'done' ? '<button class="fin-btn gold" onclick="os.faturar(\'' + o.id + '\')">💰 Faturar</button>' : '') +
            ((c[0] === 'done' || c[0] === 'billed') && !o.nfId && !window.maxcfoLeitura && window.nfse ? '<button class="fin-btn" onclick="nfse.daOS(\'' + o.id + '\')" title="Emitir a NFS-e desta OS">🧾 NF</button>' : '') +
            (o.nfId ? '<span class="fin-sub" title="Nota fiscal emitida">🧾 com nota</span>' : '') +
            '<button class="fin-btn" onclick="os.imprimir(\'' + o.id + '\')" title="Imprimir">🖨️</button>' +
            (c[0] === 'done' ? '<button class="fin-btn" onclick="os.avisar(\'' + o.id + '\')" title="Avisar o cliente">💬</button>' : '') +
            '<button class="fin-btn" onclick="os.editar(\'' + o.id + '\')">✏️</button></div></div>';
        }).join('') + '</div>';
      }).join('') + '</div>';
  };
  window.os = {
    editar: function (id) {
      migrarOS();
      var o = id ? st().os.find(function (x) { return x.id === id; }) : null;
      F().modal('osModal2', o ? '✏️ ' + esc(o.numero) : '🛠️ Nova ordem de serviço',
        '<div class="form-grid">' +
        '<div class="form-field"><label class="form-label" for="oCliente">Cliente *</label><input class="form-input" id="oCliente" list="oListaCli" maxlength="80" value="' + esc(o ? o.client : '') + '"><datalist id="oListaCli">' + listaContatos('cliente') + '</datalist></div>' +
        '<div class="form-field"><label class="form-label" for="oTel">WhatsApp</label><input class="form-input" id="oTel" maxlength="20" value="' + esc(o ? o.telefone || '' : '') + '"></div>' +
        '<div class="form-field span-2"><label class="form-label" for="oEquip">Equipamento, local ou serviço</label><input class="form-input" id="oEquip" maxlength="80" value="' + esc(o ? o.equipamento || '' : '') + '"></div>' +
        '<div class="form-field span-2"><label class="form-label" for="oDesc">O que será feito *</label><textarea class="form-input" id="oDesc" rows="3" maxlength="600">' + esc(o ? o.desc : '') + '</textarea></div>' +
        '<div class="form-field"><label class="form-label" for="oValor">Valor (R$)</label><input type="number" step="0.01" min="0" class="form-input" id="oValor" value="' + (o ? o.value : '') + '"></div>' +
        '<div class="form-field"><label class="form-label" for="oData">Data prevista</label><input type="date" class="form-input" id="oData" value="' + esc(o ? o.date || '' : F().addDias(hoje(), 3)) + '"></div>' +
        '<div class="form-field"><label class="form-label" for="oTec">Responsável / técnico</label><input class="form-input" id="oTec" maxlength="60" value="' + esc(o ? o.tecnico || '' : '') + '"></div>' +
        '<div class="form-field"><label class="form-label" for="oStatus">Situação</label><select class="form-input" id="oStatus">' + COLS_OS.slice(0, 3).map(function (c) { return '<option value="' + c[0] + '"' + (o && o.status === c[0] ? ' selected' : '') + '>' + c[1] + '</option>'; }).join('') + '</select></div>' +
        '</div>',
        (o ? '<button class="btn-ghost" style="margin-right:auto;color:var(--danger)" onclick="os.excluir(\'' + o.id + '\')">Excluir</button>' : '') +
        '<button class="btn-ghost" onclick="fin.fechar(\'osModal2\')">Cancelar</button><button class="btn-primary" onclick="os.salvar(\'' + (o ? o.id : '') + '\')">Salvar</button>');
      el('oCliente').addEventListener('change', function () { if (!el('oTel').value) el('oTel').value = telefoneDe(el('oCliente').value); });
    },
    salvar: function (id) {
      var client = el('oCliente').value.trim(), desc = el('oDesc').value.trim();
      if (!client || !desc) return toast('Preencha cliente e o que será feito.', 'error');
      var dados = { client: client, telefone: el('oTel').value.trim(), equipamento: el('oEquip').value.trim(), desc: desc, value: r2(num(el('oValor').value)), date: el('oData').value, tecnico: el('oTec').value.trim(), status: el('oStatus').value };
      if (id) { var o = st().os.find(function (x) { return x.id === id; }); if (o.status === 'billed') dados.status = 'billed'; Object.assign(o, dados); }
      else st().os.push(Object.assign({ id: novoId(), numero: proximo('os', 'OS-'), createdAt: new Date().toISOString() }, dados));
      F().registrarContato(client, 'RECEITA');
      var c = st().contatos[client]; if (c && dados.telefone && !c.telefone) c.telefone = dados.telefone;
      if (window.logAudit) window.logAudit(id ? 'update' : 'create', 'os', id || '', 'OS de ' + client + (id ? ' atualizada' : ' criada'));
      salvar(); F().fechar('osModal2'); window.initOS(); toast('OS salva.');
    },
    mover: function (id, d) {
      var o = st().os.find(function (x) { return x.id === id; }); if (!o) return;
      var i = COLS_OS.findIndex(function (c) { return c[0] === o.status; }), n = Math.max(0, Math.min(2, i + d));
      o.status = COLS_OS[n][0]; if (o.status === 'done') o.concluidaEm = hoje();
      salvar(); window.initOS();
    },
    faturar: function (id) {
      var o = st().os.find(function (x) { return x.id === id; }); if (!o) return;
      if (!(o.value > 0)) return toast('Informe o valor da OS antes de faturar.', 'error');
      F().faturar({ titulo: '💰 Faturar ' + o.numero, desc: o.numero + ' — ' + (o.equipamento || o.desc).slice(0, 80), contato: o.client, valor: o.value, categoria: 'Serviços Prestados', origem: { tipo: 'os', id: o.id } }, function (ids) {
        o.status = 'billed'; o.faturadoEm = hoje(); o.txIds = ids; salvar(); window.initOS();
      });
    },
    imprimir: function (id) {
      var o = st().os.find(function (x) { return x.id === id; }); if (!o) return;
      imprimir('Ordem de Serviço ' + o.numero, '<p><b>Cliente:</b> ' + esc(o.client) + (o.telefone ? ' · ' + esc(o.telefone) : '') + '</p>' + (o.equipamento ? '<p><b>Equipamento/serviço:</b> ' + esc(o.equipamento) + '</p>' : '') +
        '<p><b>Descrição:</b><br>' + esc(o.desc).replace(/\n/g, '<br>') + '</p><p><b>Previsão:</b> ' + dataBR(o.date) + (o.tecnico ? ' · <b>Responsável:</b> ' + esc(o.tecnico) : '') + '</p><p class="tot">Valor: ' + moeda(o.value) + '</p>' +
        '<div class="ass"><div>Responsável</div><div>Cliente — ' + esc(o.client) + '</div></div>');
    },
    avisar: function (id) {
      var o = st().os.find(function (x) { return x.id === id; }); if (!o) return;
      var tel = o.telefone || telefoneDe(o.client) || prompt('WhatsApp do cliente (com DDD):', '');
      var link = whatsLink(tel, 'Olá, ' + o.client.split(' ')[0] + '! Sua ordem de serviço ' + o.numero + (o.equipamento ? ' (' + o.equipamento + ')' : '') + ' está concluída. Valor: ' + moeda(o.value) + '. ' + (empresa().nome ? '— ' + empresa().nome : ''));
      if (!link) return toast('Telefone inválido.', 'error');
      window.open(link, '_blank', 'noopener');
    },
    excluir: function (id) { if (!confirm('Excluir esta OS?')) return; st().os = st().os.filter(function (x) { return x.id !== id; }); salvar(); F().fechar('osModal2'); window.initOS(); }
  };

  // ═════════════════════════ COMISSÕES ═════════════════════════
  function migrarComissoes() {
    st().commissions = (st().commissions || []).map(function (c) {
      if (c.valor !== undefined) return c;
      return { id: c.id || novoId(), vendedor: c.vendedor, competencia: c.competencia || F().mesAtual(), base: num(c.vendaBruta), taxa: num(c.taxa), valor: r2(num(c.valorComissao)), origem: 'manual', txId: '' };
    });
  }
  function vendasPorVendedor(mes) {
    var mapa = {};
    (st().budgets || []).forEach(function (b) { if (b.status === 'faturado' && b.vendedor && (b.faturadoEm || '').slice(0, 7) === mes) mapa[b.vendedor] = r2((mapa[b.vendedor] || 0) + totalOrc(b)); });
    return mapa;
  }
  window.renderCommissions = function () {
    var v = el('view-commissions'); if (!v) return;
    migrarComissoes();
    var lista = st().commissions.slice().sort(function (a, b) { return (b.competencia || '') > (a.competencia || '') ? 1 : -1; });
    var situacao = function (c) { var t = c.txId ? F().tx(c.txId) : null; return !t ? ['A lançar', 'aberto'] : F().estaPago(t) ? ['Paga em ' + dataBR(t.pagoEm), 'ok'] : ['A pagar até ' + dataBR(t.vencimento), 'hoje']; };
    var aLancar = lista.filter(function (c) { return !c.txId; }), aPagar = lista.filter(function (c) { var t = c.txId && F().tx(c.txId); return t && !F().estaPago(t); });
    var meses = F().mesesAte(F().mesAtual(), 3), ranking = {};
    meses.forEach(function (m) { var vp = vendasPorVendedor(m); Object.keys(vp).forEach(function (k) { ranking[k] = (ranking[k] || 0) + vp[k]; }); });
    var rk = Object.keys(ranking).sort(function (a, b) { return ranking[b] - ranking[a]; });
    v.innerHTML = cabecalho('Comissões', 'Calculadas sobre os orçamentos faturados de cada vendedor e lançadas no contas a pagar', '<button class="btn-secondary" onclick="com.manual()">+ Comissão avulsa</button><button class="btn-primary" onclick="com.calcular()">Calcular do mês</button>') +
      kpis([
        { v: moeda(r2(aLancar.reduce(function (a, c) { return a + c.valor; }, 0))), l: 'A lançar (' + aLancar.length + ')' },
        { v: moeda(r2(aPagar.reduce(function (a, c) { return a + c.valor; }, 0))), l: 'Lançadas a pagar (' + aPagar.length + ')', c: 'fin-neg' },
        { v: rk.length ? esc(rk[0]) : '—', l: 'Quem mais vendeu (3 meses)', s: rk.length ? moeda(ranking[rk[0]]) : 'informe o vendedor nos orçamentos', gold: true }
      ]) +
      (rk.length ? '<div class="card" style="margin-bottom:16px"><div class="card-title" style="margin-bottom:8px">Vendas faturadas por vendedor — ' + F().nomeMes(meses[0]) + ' a ' + F().nomeMes(meses[2]) + '</div>' + rk.map(function (k, i) { return '<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--border)"><span>' + (i + 1) + '. ' + esc(k) + '</span><b>' + moeda(ranking[k]) + '</b></div>'; }).join('') + '</div>' : '') +
      '<div class="card">' + (lista.length ? '<div class="table-scroll"><table class="data-table"><thead><tr><th>Vendedor</th><th>Competência</th><th>Base</th><th>Taxa</th><th>Comissão</th><th>Situação</th><th></th></tr></thead><tbody>' +
        lista.map(function (c) { var s = situacao(c); return '<tr><td><b>' + esc(c.vendedor) + '</b></td><td>' + F().nomeMes(c.competencia) + '</td><td>' + moeda(c.base) + '</td><td>' + String(c.taxa).replace('.', ',') + '%</td><td style="font-weight:700">' + moeda(c.valor) + '</td><td><span class="fin-sit ' + s[1] + '">' + s[0] + '</span></td><td><div class="fin-acoes">' + (!c.txId ? '<button class="fin-btn gold" onclick="com.lancar(\'' + c.id + '\')">Lançar a pagar</button><button class="fin-btn" onclick="com.excluir(\'' + c.id + '\')">🗑️</button>' : '') + '</div></td></tr>'; }).join('') +
        '</tbody></table></div>' : '<div class="empty-block" style="padding:28px">Informe o vendedor nos orçamentos. Depois clique em <b>Calcular do mês</b> para gerar as comissões.</div>') + '</div>';
  };
  window.com = {
    calcular: function () {
      migrarComissoes();
      var mes = prompt('Competência (AAAA-MM):', F().mes(F().addMeses(hoje(), -1)));
      if (!mes || !/^\d{4}-\d{2}$/.test(mes)) return;
      var vendas = vendasPorVendedor(mes), nomes = Object.keys(vendas);
      if (!nomes.length) return toast('Nenhum orçamento faturado com vendedor em ' + F().nomeMes(mes) + '.', 'warn');
      var taxa = num(prompt('Taxa de comissão (%) para todos os vendedores:', (st().settings || {}).taxaComissao || '5'));
      if (!(taxa > 0)) return;
      st().settings.taxaComissao = taxa;
      var criadas = 0;
      nomes.forEach(function (n) {
        if (st().commissions.some(function (c) { return c.vendedor === n && c.competencia === mes && c.origem === 'calculada'; })) return;
        st().commissions.push({ id: novoId(), vendedor: n, competencia: mes, base: vendas[n], taxa: taxa, valor: r2(vendas[n] * taxa / 100), origem: 'calculada', txId: '' });
        criadas++;
      });
      salvar(); window.renderCommissions();
      toast(criadas ? criadas + ' comissão(ões) calculada(s).' : 'As comissões desse mês já tinham sido calculadas.', criadas ? 'success' : 'warn');
    },
    manual: function () {
      F().modal('comModal2', '+ Comissão avulsa',
        '<div class="form-grid"><div class="form-field"><label class="form-label" for="cmVend">Vendedor *</label><input class="form-input" id="cmVend" maxlength="60"></div>' +
        '<div class="form-field"><label class="form-label" for="cmMes">Competência</label><input type="month" class="form-input" id="cmMes" value="' + F().mesAtual() + '"></div>' +
        '<div class="form-field"><label class="form-label" for="cmBase">Base (R$)</label><input type="number" step="0.01" class="form-input" id="cmBase"></div>' +
        '<div class="form-field"><label class="form-label" for="cmTaxa">Taxa (%)</label><input type="number" step="0.01" class="form-input" id="cmTaxa" value="' + ((st().settings || {}).taxaComissao || 5) + '"></div></div>',
        '<button class="btn-ghost" onclick="fin.fechar(\'comModal2\')">Cancelar</button><button class="btn-primary" onclick="com.salvarManual()">Salvar</button>');
    },
    salvarManual: function () {
      var v = el('cmVend').value.trim(), base = num(el('cmBase').value), taxa = num(el('cmTaxa').value);
      if (!v || !(base > 0) || !(taxa > 0)) return toast('Preencha vendedor, base e taxa.', 'error');
      st().commissions.push({ id: novoId(), vendedor: v, competencia: el('cmMes').value || F().mesAtual(), base: r2(base), taxa: taxa, valor: r2(base * taxa / 100), origem: 'manual', txId: '' });
      salvar(); F().fechar('comModal2'); window.renderCommissions();
    },
    lancar: function (id) {
      var c = st().commissions.find(function (x) { return x.id === id; }); if (!c) return;
      var venc = prompt('Vencimento do pagamento (DD/MM/AAAA):', F().dataBR(F().addDias(F().addMeses(c.competencia + '-01', 1), 4)));
      if (!venc) return;
      var p = venc.split('/'); var iso = p.length === 3 ? p[2] + '-' + p[1].padStart(2, '0') + '-' + p[0].padStart(2, '0') : hoje();
      var t = F().criarLancamento({ type: 'DESPESA', desc: 'Comissão ' + F().nomeMes(c.competencia) + ' — ' + c.vendedor, amount: c.valor, category: 'Comissões de Vendas', date: F().addDias(F().addMeses(c.competencia + '-01', 1), -1), vencimento: iso, contato: c.vendedor });
      c.txId = t.id; salvar(); window.renderCommissions(); F().atualizarTudo(); toast('Comissão lançada em Contas a pagar.');
    },
    excluir: function (id) { if (!confirm('Excluir esta comissão?')) return; st().commissions = st().commissions.filter(function (x) { return x.id !== id; }); salvar(); window.renderCommissions(); }
  };

  // ═════════════════════════ ESTOQUE ═════════════════════════
  function migrarEstoque() {
    st().inventory = (st().inventory || []).map(function (p) {
      if (p.nome !== undefined) return p;
      return { id: p.id || novoId(), sku: p.sku || '', nome: p.name || 'Produto', unidade: 'un', qtd: num(p.qty), minimo: 0, custo: 0, preco: 0 };
    });
    st().movEstoque = Array.isArray(st().movEstoque) ? st().movEstoque : [];
  }
  function saidas30(id) { var lim = F().addDias(hoje(), -30); return st().movEstoque.filter(function (m) { return m.produtoId === id && m.tipo === 'saida' && m.data >= lim; }).reduce(function (a, m) { return a + m.qtd; }, 0); }
  window.renderInventory = function () {
    var v = el('view-inventory'); if (!v) return;
    migrarEstoque();
    var lista = st().inventory.slice().sort(function (a, b) { return a.nome.localeCompare(b.nome, 'pt-BR'); });
    var valor = r2(lista.reduce(function (a, p) { return a + p.qtd * p.custo; }, 0));
    var baixos = lista.filter(function (p) { return p.minimo > 0 && p.qtd <= p.minimo; });
    var comMargem = lista.filter(function (p) { return p.preco > 0 && p.custo > 0; });
    var margem = comMargem.length ? comMargem.reduce(function (a, p) { return a + (p.preco - p.custo) / p.preco; }, 0) / comMargem.length * 100 : null;
    var Vd = window.maxcfoValidade, comVal = Vd ? lista.filter(function (p) { return p.controlaValidade || (p.lotes && p.lotes.length); }) : [];
    var rv = Vd && comVal.length ? Vd.resumo() : null, aba = window.est && window.est.aba === 'validade' && Vd ? 'validade' : 'produtos';
    var abas = Vd ? '<div class="est-abas"><button class="' + (aba === 'produtos' ? 'on' : '') + '" onclick="est.verAba(\'produtos\')">📦 Produtos</button><button class="' + (aba === 'validade' ? 'on' : '') + '" onclick="est.verAba(\'validade\')">🗓️ Validades' + (rv && (rv.vencidos.length + rv.perto.length) ? ' (' + (rv.vencidos.length + rv.perto.length) + ')' : '') + '</button></div>' : '';
    if (aba === 'validade') {
      v.innerHTML = cabecalho('Estoque', 'Validade dos produtos por lote: o que venceu, o que vence logo e o valor em risco', '<button class="btn-secondary" onclick="estNota.abrir()">📄 Entrada por nota fiscal</button><button class="btn-primary" onclick="est.editar()">+ Produto</button>') + abas + Vd.painel();
      return;
    }
    v.innerHTML = cabecalho('Estoque', 'Produtos com custo médio, estoque mínimo e movimentações ligadas ao financeiro', '<button class="btn-secondary" onclick="est.exportar()">⬇️ Exportar</button><button class="btn-secondary" onclick="estNota.abrir()">📄 Entrada por nota fiscal</button><button class="btn-primary" onclick="est.editar()">+ Produto</button>') +
      kpis([
        { v: lista.length, l: 'Produtos' },
        { v: moeda(valor), l: 'Valor em estoque (a custo)', gold: true },
        { v: baixos.length, l: 'No mínimo ou abaixo', c: baixos.length ? 'fin-neg' : 'fin-pos' },
        { v: margem === null ? '—' : margem.toFixed(1).replace('.', ',') + '%', l: 'Margem média (preço × custo)' }
      ]) + abas +
      (rv && rv.vencidos.length ? '<div class="fin-alerta red">🗓️ ' + rv.vencidos.length + (rv.vencidos.length === 1 ? ' lote vencido' : ' lotes vencidos') + ' no estoque (' + moeda(rv.valorVencido) + ' a custo). <a href="#" class="link-go" onclick="validade.abrir(\'vencidos\');return false">Ver e dar baixa</a></div>' : '') +
      (rv && rv.perto.length ? '<div class="fin-alerta gold">🗓️ ' + rv.perto.length + (rv.perto.length === 1 ? ' lote vence' : ' lotes vencem') + ' nos próximos ' + rv.aviso + ' dias (' + moeda(rv.valorPerto) + '). <a href="#" class="link-go" onclick="validade.abrir(\'alerta\');return false">Ver quais</a></div>' : '') +
      (baixos.length ? '<div class="fin-alerta red">⚠️ Repor: ' + baixos.map(function (p) { return esc(p.nome) + ' (' + p.qtd + ' ' + esc(p.unidade) + ')'; }).join(', ') + '</div>' : '') +
      '<div class="card">' + (lista.length ? '<div class="table-scroll"><table class="data-table"><thead><tr><th>Produto</th><th>Estoque</th><th class="fin-hide-sm">Custo médio</th><th class="fin-hide-sm">Preço</th><th class="fin-hide-sm">Saídas 30 dias</th><th>Dura</th>' + (comVal.length ? '<th>Validade</th>' : '') + '<th>Ações</th></tr></thead><tbody>' +
        lista.map(function (p) {
          var s30 = saidas30(p.id), dias = s30 > 0 ? Math.floor(p.qtd / (s30 / 30)) : null;
          return '<tr><td><b>' + esc(p.nome) + '</b><div class="fin-sub">' + esc(p.sku || '') + (p.minimo ? ' · mínimo ' + p.minimo : '') + '</div></td>' +
            '<td style="font-weight:700" class="' + (p.minimo > 0 && p.qtd <= p.minimo ? 'fin-neg' : '') + '">' + String(p.qtd).replace('.', ',') + ' ' + esc(p.unidade) + '</td>' +
            '<td class="fin-hide-sm">' + moeda(p.custo) + '</td><td class="fin-hide-sm">' + (p.preco ? moeda(p.preco) : '—') + '</td><td class="fin-hide-sm">' + (s30 || '—') + '</td>' +
            '<td>' + (dias === null ? '<span class="fin-sub">sem saídas</span>' : '~' + dias + ' dias') + '</td>' +
            (comVal.length ? '<td>' + (Vd.etiqueta(p) || '<span class="fin-sub">—</span>') + '</td>' : '') +
            '<td><div class="fin-acoes"><button class="fin-btn ok" onclick="est.mov(\'' + p.id + '\',\'entrada\')">+ Entrada</button><button class="fin-btn" onclick="est.mov(\'' + p.id + '\',\'saida\')">− Saída</button><button class="fin-btn" onclick="est.mov(\'' + p.id + '\',\'ajuste\')" title="Ajuste de inventário">⚖️</button><button class="fin-btn" onclick="est.historico(\'' + p.id + '\')" title="Histórico">🕘</button><button class="fin-btn" onclick="est.editar(\'' + p.id + '\')">✏️</button></div></td></tr>';
        }).join('') + '</tbody></table></div><p class="fin-sub" style="margin-top:8px">"Dura" é a estimativa pelo ritmo de saídas dos últimos 30 dias.</p>' : '<div class="empty-block" style="padding:28px">Nenhum produto cadastrado.</div>') + '</div>';
  };
  window.est = {
    aba: 'produtos',
    verAba: function (a) { window.est.aba = a; window.renderInventory(); },
    editar: function (id) {
      migrarEstoque();
      var p = id ? st().inventory.find(function (x) { return x.id === id; }) : null;
      F().modal('estModal2', p ? '✏️ ' + esc(p.nome) : '📦 Novo produto',
        '<div class="form-grid">' +
        '<div class="form-field span-2"><label class="form-label" for="pNome">Nome *</label><input class="form-input" id="pNome" maxlength="80" value="' + esc(p ? p.nome : '') + '"></div>' +
        '<div class="form-field"><label class="form-label" for="pSku">Código (SKU)</label><input class="form-input" id="pSku" maxlength="30" placeholder="Gerado se vazio" value="' + esc(p ? p.sku : '') + '"></div>' +
        '<div class="form-field"><label class="form-label" for="pUn">Unidade</label><select class="form-input" id="pUn">' + ['un', 'cx', 'kg', 'g', 'l', 'ml', 'm', 'm²', 'pct', 'h'].map(function (u) { return '<option' + (p && p.unidade === u ? ' selected' : '') + '>' + u + '</option>'; }).join('') + '</select></div>' +
        (p ? '' : '<div class="form-field"><label class="form-label" for="pQtd">Estoque inicial</label><input type="number" step="0.001" min="0" class="form-input" id="pQtd" value="0"></div>') +
        (window.maxcfoValidade ? '<div class="form-field span-2"><label class="fin-check"><input type="checkbox" id="pCtrlVal"' + (p && p.controlaValidade ? ' checked' : '') + (p ? '' : ' onchange="document.getElementById(\'pValIni\').style.display=this.checked?\'contents\':\'none\'"') + '> Controlar validade (lotes): pedir lote e validade nas entradas e avisar antes de vencer</label></div>' +
          (p ? '' : '<div id="pValIni" style="display:none">' + window.maxcfoValidade.campos('pIni') + '</div>') : '') +
        '<div class="form-field"><label class="form-label" for="pMin">Estoque mínimo</label><input type="number" step="0.001" min="0" class="form-input" id="pMin" value="' + (p ? p.minimo : 0) + '"></div>' +
        '<div class="form-field"><label class="form-label" for="pCusto">Custo unitário (R$)</label><input type="number" step="0.01" min="0" class="form-input" id="pCusto" value="' + (p ? p.custo : '') + '"></div>' +
        '<div class="form-field"><label class="form-label" for="pPreco">Preço de venda (R$)</label><input type="number" step="0.01" min="0" class="form-input" id="pPreco" value="' + (p ? p.preco : '') + '"></div>' +
        '</div>',
        (p ? '<button class="btn-ghost" style="margin-right:auto;color:var(--danger)" onclick="est.excluir(\'' + p.id + '\')">Excluir</button>' : '') +
        '<button class="btn-ghost" onclick="fin.fechar(\'estModal2\')">Cancelar</button><button class="btn-primary" onclick="est.salvar(\'' + (p ? p.id : '') + '\')">Salvar</button>');
    },
    salvar: function (id) {
      var nome = el('pNome').value.trim(); if (!nome) return toast('Informe o nome.', 'error');
      var sku = el('pSku').value.trim() || proximo('prd', 'PRD-');
      if (st().inventory.some(function (x) { return x.sku === sku && x.id !== id; })) return toast('Já existe um produto com esse código.', 'error');
      var dados = { nome: nome, sku: sku, unidade: el('pUn').value, minimo: num(el('pMin').value), custo: r2(num(el('pCusto').value)), preco: r2(num(el('pPreco').value)) };
      if (el('pCtrlVal')) dados.controlaValidade = el('pCtrlVal').checked;
      var loteIni = dados.controlaValidade && window.maxcfoValidade ? window.maxcfoValidade.ler('pIni') : null;
      if (id) Object.assign(st().inventory.find(function (x) { return x.id === id; }), dados);
      else {
        var p = Object.assign({ id: novoId(), qtd: 0 }, dados); st().inventory.push(p);
        var q = num(el('pQtd').value); if (q > 0) { p.qtd = q; var lt = loteIni ? window.maxcfoValidade.adicionar(p, loteIni, q, 'inicial', hoje()) : null; st().movEstoque.push({ id: novoId(), produtoId: p.id, data: hoje(), tipo: 'ajuste', qtd: q, custo: p.custo, obs: 'Estoque inicial', lote: lt || undefined }); }
      }
      salvar(); F().fechar('estModal2'); window.renderInventory(); toast('Produto salvo.');
    },
    mov: function (id, tipo) {
      var p = st().inventory.find(function (x) { return x.id === id; }); if (!p) return;
      var titulos = { entrada: '+ Entrada (compra)', saida: '− Saída (venda ou uso)', ajuste: '⚖️ Ajuste de inventário' };
      var Vd = window.maxcfoValidade, ctrl = Vd && (p.controlaValidade || (p.lotes && p.lotes.length));
      var corpo = '<p class="fin-sub" style="margin-bottom:10px">' + esc(p.nome) + ' · estoque atual ' + p.qtd + ' ' + esc(p.unidade) + '</p><div class="form-grid">' +
        '<div class="form-field"><label class="form-label" for="mQtd">' + (tipo === 'ajuste' ? 'Quantidade contada' : 'Quantidade') + '</label><input type="number" step="0.001" min="0" class="form-input" id="mQtd"></div>' +
        (tipo !== 'ajuste' ? '<div class="form-field"><label class="form-label" for="mValor">' + (tipo === 'entrada' ? 'Custo unitário (R$)' : 'Preço unitário (R$)') + '</label><input type="number" step="0.01" min="0" class="form-input" id="mValor" value="' + (tipo === 'entrada' ? p.custo || '' : p.preco || '') + '"></div>' : '') +
        '<div class="form-field"><label class="form-label" for="mData">Data</label><input type="date" class="form-input" id="mData" value="' + hoje() + '"></div>' +
        '<div class="form-field"><label class="form-label" for="mObs">' + (tipo === 'entrada' ? 'Fornecedor' : tipo === 'saida' ? 'Cliente' : 'Motivo') + '</label><input class="form-input" id="mObs" maxlength="80" list="mListaCt"><datalist id="mListaCt">' + listaContatos(tipo === 'entrada' ? 'fornecedor' : tipo === 'saida' ? 'cliente' : '') + '</datalist></div>' +
        (ctrl && tipo === 'entrada' ? Vd.campos('m', true) : '') +
        (ctrl && tipo === 'ajuste' ? Vd.campos('m') + '<div class="form-field span-2 fin-sub">Se a contagem for maior que o estoque, a diferença entra com o lote e a validade acima. Se for menor, sai primeiro o que vence antes.</div>' : '') +
        (ctrl && tipo === 'saida' ? Vd.infoSaida(p) : '') +
        (tipo === 'entrada' ? '<div class="form-field span-2"><label class="fin-check"><input type="checkbox" id="mFin" checked> Lançar a compra em Contas a pagar, vencimento <input type="date" class="form-input" id="mVenc" value="' + F().addDias(hoje(), 30) + '" style="width:auto;display:inline-block;margin-left:6px;padding:4px 8px"></label></div>' : '') +
        (tipo === 'saida' ? '<div class="form-field span-2"><label class="fin-check"><input type="checkbox" id="mFin" checked> Gerar a venda em Contas a receber</label></div>' : '') +
        '</div>';
      F().modal('movModal', titulos[tipo], corpo, '<button class="btn-ghost" onclick="fin.fechar(\'movModal\')">Cancelar</button><button class="btn-primary" onclick="est.confirmar(\'' + id + '\',\'' + tipo + '\')">Confirmar</button>');
    },
    confirmar: function (id, tipo) {
      var p = st().inventory.find(function (x) { return x.id === id; }); if (!p) return;
      var q = num(el('mQtd').value), val = el('mValor') ? r2(num(el('mValor').value)) : 0, data = el('mData').value || hoje(), obs = el('mObs').value.trim();
      if (!(q > 0) && tipo !== 'ajuste') return toast('Informe a quantidade.', 'error');
      if (tipo === 'saida' && q > p.qtd && !confirm('A saída é maior que o estoque (' + p.qtd + '). Continuar mesmo assim?')) return;
      var lanc = el('mFin') && el('mFin').checked, venc = el('mVenc') ? el('mVenc').value : '';
      var lote = window.maxcfoValidade ? window.maxcfoValidade.ler('m') : null;
      if (el('mLoteSai') && el('mLoteSai').value) lote = { loteId: el('mLoteSai').value };
      if (tipo === 'entrada' && el('mVal') && !el('mVal').value && !confirm('Este produto controla validade. Dar entrada sem informar a validade?')) return;
      if (lote && lote.validade && lote.validade < hoje() && tipo !== 'saida' && !confirm('A validade informada já passou. Continuar?')) return;
      F().fechar('movModal');
      if (tipo === 'saida' && lanc && val > 0) {
        F().faturar({ titulo: '💰 Venda de ' + p.nome, desc: 'Venda — ' + q + ' ' + p.unidade + ' de ' + p.nome, contato: obs, valor: r2(q * val), categoria: 'Vendas de Produto', competencia: data, origem: { tipo: 'estoque', id: p.id } }, function () { est.movimentar(id, 'saida', q, val, obs || 'Venda', true, data, '', lote); window.renderInventory(); });
        return;
      }
      var txId = '';
      if (tipo === 'entrada' && lanc && val > 0) {
        var t = F().criarLancamento({ type: 'DESPESA', desc: 'Compra — ' + q + ' ' + p.unidade + ' de ' + p.nome, amount: r2(q * val), category: 'Custo de Mercadorias e Serviços', date: data, vencimento: venc || data, contato: obs });
        txId = t.id; F().atualizarTudo();
      }
      est.movimentar(id, tipo, q, val, obs, false, data, txId, lote);
      window.renderInventory(); toast('Estoque atualizado.');
    },
    // lote: { lote, validade } nas entradas (e ajuste para cima); { loteId } para tirar de um lote específico nas saídas
    movimentar: function (id, tipo, q, val, obs, silencioso, data, txId, lote) {
      migrarEstoque();
      var p = st().inventory.find(function (x) { return x.id === id; }); if (!p) return;
      var Vd = window.maxcfoValidade, lotesMov = null;
      if (tipo === 'entrada') {
        // custo médio ponderado
        var totalAntes = Math.max(p.qtd, 0) * p.custo, novaQtd = Math.max(p.qtd, 0) + q;
        if (val > 0 && novaQtd > 0) p.custo = r2((totalAntes + q * val) / novaQtd);
        p.qtd = r4(p.qtd + q);
        if (Vd && lote) { var a = Vd.adicionar(p, lote, q, txId ? 'compra' : 'entrada', data); if (a) lotesMov = [a]; }
      } else if (tipo === 'saida' || tipo === 'perda') {
        p.qtd = r4(p.qtd - q);
        if (Vd && p.lotes && p.lotes.length) lotesMov = Vd.consumir(p, q, lote && lote.loteId);
      } else {
        var dif = r4(q - p.qtd); p.qtd = q; q = dif;
        if (Vd && dif < 0 && p.lotes && p.lotes.length) lotesMov = Vd.consumir(p, -dif, lote && lote.loteId);
        if (Vd && dif > 0 && lote) { var b = Vd.adicionar(p, lote, dif, 'ajuste', data); if (b) lotesMov = [b]; }
      }
      if (Vd && p.lotes && p.lotes.length) Vd.conferir(p);
      var m = { id: novoId(), produtoId: id, data: data || hoje(), tipo: tipo, qtd: q, valor: val, obs: obs || '', txId: txId || '' };
      if (lotesMov && lotesMov.length) m.lotes = lotesMov;
      st().movEstoque.push(m);
      if (window.logAudit) window.logAudit('update', 'estoque', id, tipo + ' de ' + q + ' ' + p.unidade + ' — ' + p.nome + (lotesMov && lotesMov.length ? ' (' + lotesMov.map(function (l) { return (l.lote ? 'lote ' + l.lote : 'sem lote') + (l.validade ? ' val. ' + dataBR(l.validade) : ''); }).join(', ') + ')' : ''));
      salvar();
      if (!silencioso) return;
    },
    historico: function (id) {
      var p = st().inventory.find(function (x) { return x.id === id; }); if (!p) return;
      var movs = st().movEstoque.filter(function (m) { return m.produtoId === id; }).slice(-40).reverse();
      F().modal('histModal', '🕘 ' + esc(p.nome), movs.length ? '<div class="table-scroll"><table class="data-table"><thead><tr><th>Data</th><th>Tipo</th><th>Qtd</th><th>Valor unit.</th><th>Lote / validade</th><th>Obs.</th></tr></thead><tbody>' +
        movs.map(function (m) { return '<tr><td>' + dataBR(m.data) + '</td><td>' + ({ entrada: 'Entrada', saida: 'Saída', ajuste: 'Ajuste', perda: '<span class="fin-neg">Perda</span>' }[m.tipo] || esc(m.tipo)) + '</td><td>' + String(m.qtd).replace('.', ',') + '</td><td>' + (m.valor ? moeda(m.valor) : '—') + '</td><td class="fin-sub">' + (m.lotes ? m.lotes.map(function (l) { return esc((l.lote || 's/ lote') + (l.validade ? ' · ' + dataBR(l.validade) : '') + (m.lotes.length > 1 ? ' (' + String(l.qtd).replace('.', ',') + ')' : '')); }).join('<br>') : m.lote ? esc((m.lote.lote || '') + (m.lote.validade ? ' · ' + dataBR(m.lote.validade) : '')) : '—') + '</td><td>' + esc(m.obs || '') + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<p class="fin-sub">Sem movimentações.</p>',
        '<button class="btn-ghost" onclick="fin.fechar(\'histModal\')">Fechar</button>', true);
    },
    exportar: function () {
      migrarEstoque();
      var l = ['Código;Produto;Unidade;Estoque;Mínimo;Custo médio;Preço;Valor em estoque'].concat(st().inventory.map(function (p) { return [p.sku, '"' + p.nome.replace(/"/g, '""') + '"', p.unidade, String(p.qtd).replace('.', ','), String(p.minimo).replace('.', ','), p.custo.toFixed(2).replace('.', ','), p.preco.toFixed(2).replace('.', ','), (p.qtd * p.custo).toFixed(2).replace('.', ',')].join(';'); }));
      F().baixarArquivo('﻿' + l.join('\n'), 'estoque-' + hoje() + '.csv', 'text/csv');
    },
    excluir: function (id) {
      if (!confirm('Excluir este produto e o histórico dele?')) return;
      st().inventory = st().inventory.filter(function (x) { return x.id !== id; });
      st().movEstoque = st().movEstoque.filter(function (m) { return m.produtoId !== id; });
      salvar(); F().fechar('estModal2'); window.renderInventory();
    }
  };

  // ═════════════════════════ CONTRATOS RECORRENTES ═════════════════════════
  function migrarContratos() {
    st().assinaturas = (st().assinaturas || []).map(function (c) {
      if (c.dia) return c;
      return { id: c.id || novoId(), cliente: c.cliente || '', descricao: c.plano || 'Mensalidade', valor: num(c.valor), dia: 10, inicio: c.mrrmes || F().mesAtual(), fim: c.status === 'Ativa' ? '' : (c.mrrmes || F().mesAtual()), status: c.status === 'Ativa' ? 'ativo' : 'encerrado', categoria: 'Assinaturas e Mensalidades', gerados: {} };
    });
  }
  function diaNoMes(ym, dia) { var p = ym.split('-'), ultimo = new Date(+p[0], +p[1], 0).getDate(); return ym + '-' + String(Math.min(dia, ultimo)).padStart(2, '0'); }
  // Gera a conta a receber do mês atual e do próximo para cada contrato ativo (sem duplicar)
  function gerarCobrancas() {
    migrarContratos();
    var meses = [F().mesAtual(), F().mes(F().addMeses(hoje(), 1))], criadas = 0;
    st().assinaturas.forEach(function (c) {
      if (c.status !== 'ativo') return;
      c.gerados = c.gerados || {};
      meses.forEach(function (m) {
        if (m < c.inicio || (c.fim && m > c.fim) || c.gerados[m]) return;
        var existe = st().transactions.some(function (t) { return t.contratoId === c.id && t.mesContrato === m; });
        if (existe) { c.gerados[m] = true; return; }
        var t = F().criarLancamento({ type: 'RECEITA', desc: c.descricao + ' — ' + F().nomeMes(m), amount: c.valor, category: c.categoria || 'Assinaturas e Mensalidades', date: m + '-01', vencimento: diaNoMes(m, c.dia), contato: c.cliente, contaId: c.contaId || undefined, contratoId: c.id, mesContrato: m });
        c.gerados[m] = t.id; criadas++;
      });
    });
    if (criadas) salvar();
    return criadas;
  }
  window.renderPlans = function () {
    var v = el('view-plans'); if (!v) return;
    migrarContratos();
    var lista = st().assinaturas.slice().sort(function (a, b) { return (a.cliente || '').localeCompare(b.cliente || '', 'pt-BR'); });
    var ativos = lista.filter(function (c) { return c.status === 'ativo'; });
    var mrr = r2(ativos.reduce(function (a, c) { return a + c.valor; }, 0));
    var lim = F().mes(F().addMeses(hoje(), -12));
    var encerrados12 = lista.filter(function (c) { return c.status === 'encerrado' && (c.fim || '') >= lim; });
    var atrasados = st().transactions.filter(function (t) { return t.contratoId && F().situacao(t) === 'vencido'; });
    v.innerHTML = cabecalho('Contratos Recorrentes', 'Mensalidades que geram as contas a receber sozinhas, todo mês', '<button class="btn-primary" onclick="ctr.editar()">+ Contrato</button>') +
      kpis([
        { v: moeda(mrr), l: 'Receita recorrente mensal (MRR)', s: 'ARR ' + moeda(r2(mrr * 12)), gold: true },
        { v: ativos.length, l: 'Contratos ativos', s: ativos.length ? 'ticket médio ' + moeda(r2(mrr / ativos.length)) : '' },
        { v: encerrados12.length, l: 'Encerrados em 12 meses', s: (ativos.length + encerrados12.length) ? 'cancelamento ' + Math.round(encerrados12.length / (ativos.length + encerrados12.length) * 100) + '%' : '' },
        { v: moeda(F().somar(atrasados)), l: 'Mensalidades em atraso (' + atrasados.length + ')', c: atrasados.length ? 'fin-neg' : '' }
      ]) +
      '<div class="card">' + (lista.length ? '<div class="table-scroll"><table class="data-table"><thead><tr><th>Cliente</th><th>Descrição</th><th>Valor</th><th>Vence dia</th><th>Vigência</th><th>Situação</th><th></th></tr></thead><tbody>' +
        lista.map(function (c) { return '<tr><td><b>' + esc(c.cliente) + '</b></td><td>' + esc(c.descricao) + '</td><td style="font-weight:700">' + moeda(c.valor) + '</td><td>' + c.dia + '</td><td>' + F().nomeMes(c.inicio) + (c.fim ? ' a ' + F().nomeMes(c.fim) : ' em diante') + '</td><td><span class="fin-sit ' + (c.status === 'ativo' ? 'ok' : 'atraso') + '">' + (c.status === 'ativo' ? 'Ativo' : 'Encerrado') + '</span></td>' +
          '<td><div class="fin-acoes"><button class="fin-btn" onclick="fin.verContas(\'' + esc(c.cliente).replace(/'/g, '') + '\',\'todas\')">Cobranças</button><button class="fin-btn" onclick="ctr.editar(\'' + c.id + '\')">✏️</button>' + (c.status === 'ativo' ? '<button class="fin-btn" onclick="ctr.encerrar(\'' + c.id + '\')">Encerrar</button>' : '<button class="fin-btn ok" onclick="ctr.reativar(\'' + c.id + '\')">Reativar</button>') + '</div></td></tr>'; }).join('') +
        '</tbody></table></div><p class="fin-sub" style="margin-top:8px">A cobrança do mês atual e do próximo é criada automaticamente em Contas a receber para cada contrato ativo.</p>' : '<div class="empty-block" style="padding:28px">Cadastre mensalidades (honorários, assinaturas, aluguéis) e a Landim Advisory cria as contas a receber todo mês.</div>') + '</div>';
  };
  window.ctr = {
    editar: function (id) {
      migrarContratos();
      var c = id ? st().assinaturas.find(function (x) { return x.id === id; }) : null;
      var cats = (window.CATEGORIES.RECEITA || []).map(function (k) { return '<option' + ((c ? c.categoria : 'Assinaturas e Mensalidades') === k ? ' selected' : '') + '>' + esc(k) + '</option>'; }).join('');
      F().modal('ctrModal', c ? '✏️ Contrato' : '🔁 Novo contrato recorrente',
        '<div class="form-grid">' +
        '<div class="form-field"><label class="form-label" for="ctCli">Cliente *</label><input class="form-input" id="ctCli" list="ctListaCli" maxlength="80" value="' + esc(c ? c.cliente : '') + '"><datalist id="ctListaCli">' + listaContatos('cliente') + '</datalist></div>' +
        '<div class="form-field"><label class="form-label" for="ctDescr">Descrição *</label><input class="form-input" id="ctDescr" maxlength="80" placeholder="Ex.: Honorários BPO financeiro" value="' + esc(c ? c.descricao : '') + '"></div>' +
        '<div class="form-field"><label class="form-label" for="ctValor">Valor mensal (R$) *</label><input type="number" step="0.01" min="0.01" class="form-input" id="ctValor" value="' + (c ? c.valor : '') + '"></div>' +
        '<div class="form-field"><label class="form-label" for="ctDia">Dia do vencimento</label><input type="number" min="1" max="31" class="form-input" id="ctDia" value="' + (c ? c.dia : 10) + '"></div>' +
        '<div class="form-field"><label class="form-label" for="ctIni">Primeiro mês</label><input type="month" class="form-input" id="ctIni" value="' + (c ? c.inicio : F().mesAtual()) + '"></div>' +
        '<div class="form-field"><label class="form-label" for="ctFim">Último mês (opcional)</label><input type="month" class="form-input" id="ctFim" value="' + (c ? c.fim || '' : '') + '"></div>' +
        '<div class="form-field"><label class="form-label" for="ctCat">Categoria</label><select class="form-input" id="ctCat">' + cats + '</select></div>' +
        '<div class="form-field"><label class="form-label" for="ctConta">Conta de recebimento</label><select class="form-input" id="ctConta">' + st().contas.map(function (k) { return '<option value="' + esc(k.id) + '"' + (c && c.contaId === k.id ? ' selected' : '') + '>' + esc(k.nome) + '</option>'; }).join('') + '</select></div>' +
        '</div>',
        (c ? '<button class="btn-ghost" style="margin-right:auto;color:var(--danger)" onclick="ctr.excluir(\'' + c.id + '\')">Excluir</button>' : '') +
        '<button class="btn-ghost" onclick="fin.fechar(\'ctrModal\')">Cancelar</button><button class="btn-primary" onclick="ctr.salvar(\'' + (c ? c.id : '') + '\')">Salvar</button>');
    },
    salvar: function (id) {
      var cli = el('ctCli').value.trim(), desc = el('ctDescr').value.trim(), valor = r2(num(el('ctValor').value));
      if (!cli || !desc || !(valor > 0)) return toast('Preencha cliente, descrição e valor.', 'error');
      var dados = { cliente: cli, descricao: desc, valor: valor, dia: Math.min(31, Math.max(1, parseInt(el('ctDia').value, 10) || 10)), inicio: el('ctIni').value || F().mesAtual(), fim: el('ctFim').value || '', categoria: el('ctCat').value, contaId: el('ctConta').value };
      if (dados.fim && dados.fim < dados.inicio) return toast('O último mês é anterior ao primeiro.', 'error');
      if (id) {
        var c = st().assinaturas.find(function (x) { return x.id === id; });
        Object.assign(c, dados);
        // atualiza as cobranças futuras ainda em aberto
        st().transactions.forEach(function (t) { if (t.contratoId === id && !F().estaPago(t) && t.mesContrato >= F().mesAtual()) Object.assign(t, { amount: valor, contato: cli, category: dados.categoria, contaId: dados.contaId, vencimento: diaNoMes(t.mesContrato, dados.dia), desc: desc + ' — ' + F().nomeMes(t.mesContrato), atualizadoEm: Date.now() }); });
      } else st().assinaturas.push(Object.assign({ id: novoId(), status: 'ativo', gerados: {} }, dados));
      F().registrarContato(cli, 'RECEITA');
      var n = gerarCobrancas(); salvar(); F().fechar('ctrModal'); window.renderPlans(); F().atualizarTudo();
      toast('Contrato salvo' + (n ? ' e ' + n + ' cobrança(s) criada(s)' : '') + '.');
    },
    encerrar: function (id) {
      var c = st().assinaturas.find(function (x) { return x.id === id; }); if (!c) return;
      if (!confirm('Encerrar o contrato de ' + c.cliente + '?')) return;
      c.status = 'encerrado'; c.fim = F().mesAtual();
      var futuras = st().transactions.filter(function (t) { return t.contratoId === id && !F().estaPago(t) && t.mesContrato > F().mesAtual(); });
      if (futuras.length && confirm('Excluir ' + futuras.length + ' cobrança(s) futura(s) em aberto?')) st().transactions = st().transactions.filter(function (t) { return futuras.indexOf(t) === -1; });
      salvar(); window.renderPlans(); F().atualizarTudo();
    },
    reativar: function (id) { var c = st().assinaturas.find(function (x) { return x.id === id; }); if (!c) return; c.status = 'ativo'; c.fim = ''; if (c.inicio < F().mesAtual()) c.inicio = F().mesAtual(); gerarCobrancas(); salvar(); window.renderPlans(); F().atualizarTudo(); },
    excluir: function (id) { if (!confirm('Excluir o contrato? As cobranças já criadas continuam em Contas a receber.')) return; st().assinaturas = st().assinaturas.filter(function (x) { return x.id !== id; }); salvar(); F().fechar('ctrModal'); window.renderPlans(); }
  };

  // ═════════════════════════ INÍCIO ═════════════════════════
  window.initOperacaoModule = function () {
    estilos();
    migrarCRM(); migrarOrc(); migrarOS(); migrarComissoes(); migrarEstoque(); migrarContratos();
    var n = gerarCobrancas();
    if (n) setTimeout(function () { toast(n + ' mensalidade(s) de contratos foram lançadas em Contas a receber.', 'info'); }, 1500);
    var vm = window.viewMeta = window.viewMeta || {};
    vm.crm = { label: 'CRM — Oportunidades', render: window.renderCRM };
    vm.inventory = { label: 'Estoque', render: window.renderInventory };
    vm.budget = { label: 'Orçamentos', render: window.renderBudget };
    vm.os = { label: 'Ordens de Serviço', render: window.initOS };
    vm.commissions = { label: 'Comissões', render: window.renderCommissions };
    vm.plans = { label: 'Contratos Recorrentes', render: window.renderPlans };
    var rot = function (id, t) { var a = el('nav-' + id); if (a) { var l = a.querySelector('.nav-label'); if (l) l.textContent = t; } };
    var np = el('nav-plans'), nc = el('nav-contatos'); if (np && nc && nc.parentNode) nc.parentNode.insertBefore(np, nc.nextSibling);
    rot('crm', 'CRM — Oportunidades'); rot('inventory', 'Estoque'); rot('budget', 'Orçamentos'); rot('os', 'Ordens de Serviço'); rot('commissions', 'Comissões'); rot('plans', 'Contratos Recorrentes');
  };
  window.orcTotal = totalOrc;
})();
