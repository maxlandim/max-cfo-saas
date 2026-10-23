/**
 * Landim Advisory — Gestão
 * Auditoria (histórico de alterações), RH e folha, imobilizado, checklist fiscal,
 * configurações da empresa e simulador de cenários sobre a média real.
 */
(function () {
  'use strict';
  var F = function () { return window.fin; };
  function st() { return window.state; }
  function el(id) { return document.getElementById(id); }
  function esc(s) { return F() ? F().esc(s) : String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function moeda(v) { return F().moeda(v); }
  function toast(m, t) { if (window.showToast) window.showToast(m, t || 'success'); }
  function salvar() { if (window.persist) window.persist(); }
  function r2(v) { return Math.round(v * 100) / 100; }
  function num(v) { return window.fin.num(v); }
  function novoId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function hoje() { return F().hoje(); }
  function cab(t, s, b) { return '<div class="page-header"><div class="page-header-text"><h1>' + t + '</h1><p class="page-subtitle">' + s + '</p></div><div class="page-header-actions">' + (b || '') + '</div></div>'; }
  function kpis(itens) { return '<div class="fin-kpis">' + itens.map(function (k) { return '<div class="fin-kpi2"><div class="v ' + (k.c || '') + '"' + (k.gold ? ' style="color:var(--gold)"' : '') + '>' + k.v + '</div><div class="l">' + k.l + '</div>' + (k.s ? '<div class="s">' + k.s + '</div>' : '') + '</div>'; }).join('') + '</div>'; }

  // ═════════════ AUDITORIA: histórico de alterações ═════════════
  // Uso: logAudit(acao, modulo, idDoRegistro, descricao)
  window.logAudit = function (acao, modulo, id, descricao) {
    if (!window.state) return;
    var s = window.state; s.auditLogs = Array.isArray(s.auditLogs) ? s.auditLogs : [];
    var u = window.maxcfoUser || {};
    s.auditLogs.unshift({ id: novoId(), timestamp: new Date().toISOString(), user: u.name || u.email || 'Usuário', email: u.email || '', action: acao, module: modulo, registro: typeof id === 'string' ? id : '', details: typeof descricao === 'string' ? descricao : (typeof id === 'string' && !descricao ? id : '') });
    if (s.auditLogs.length > 500) s.auditLogs.length = 500;
  };
  window.initAuditModule = function () { if (window.state && !Array.isArray(window.state.auditLogs)) window.state.auditLogs = []; };
  var filtroAud = { modulo: '', busca: '' };
  window.renderAudit = function () {
    var v = el('view-audit'); if (!v) return;
    var logs = (st().auditLogs || []);
    var modulos = logs.map(function (l) { return l.module; }).filter(function (m, i, a) { return m && a.indexOf(m) === i; });
    var nomes = { transaction: 'Financeiro', os: 'Ordem de serviço', estoque: 'Estoque' };
    var acoes = { create: ['Criou', 'ok'], update: ['Alterou', 'hoje'], delete: ['Excluiu', 'atraso'] };
    var q = (filtroAud.busca || '').toLowerCase();
    var vis = logs.filter(function (l) { return (!filtroAud.modulo || l.module === filtroAud.modulo) && (!q || (l.details + ' ' + l.user).toLowerCase().indexOf(q) > -1); }).slice(0, 300);
    v.innerHTML = cab('Histórico de alterações', 'Quem criou, alterou ou excluiu cada registro (últimas 500 ações)', '<button class="btn-secondary" onclick="aud.exportar()">⬇️ Exportar</button>') +
      '<div class="card"><div class="fin-bar"><select class="select-sm" onchange="aud.filtro(\'modulo\',this.value)" aria-label="Módulo"><option value="">Todos os módulos</option>' + modulos.map(function (m) { return '<option value="' + esc(m) + '"' + (filtroAud.modulo === m ? ' selected' : '') + '>' + esc(nomes[m] || m) + '</option>'; }).join('') + '</select>' +
      '<input class="search-sm" placeholder="Buscar…" value="' + esc(filtroAud.busca) + '" oninput="aud.filtro(\'busca\',this.value)" aria-label="Buscar"></div>' +
      (vis.length ? '<div class="table-scroll"><table class="data-table"><thead><tr><th>Quando</th><th>Quem</th><th>Ação</th><th>Módulo</th><th>O quê</th></tr></thead><tbody>' +
        vis.map(function (l) { var a = acoes[l.action] || [l.action, 'aberto']; return '<tr><td style="white-space:nowrap">' + new Date(l.timestamp).toLocaleString('pt-BR') + '</td><td>' + esc(l.user) + '</td><td><span class="fin-sit ' + a[1] + '">' + esc(a[0]) + '</span></td><td>' + esc(nomes[l.module] || l.module || '') + '</td><td>' + esc(l.details || '') + '</td></tr>'; }).join('') + '</tbody></table></div>'
        : '<div class="empty-block" style="padding:28px">Nenhuma ação registrada ainda.</div>') + '</div>';
  };
  var tAud = null;
  window.aud = {
    filtro: function (k, v) { filtroAud[k] = v; clearTimeout(tAud); tAud = setTimeout(function () { window.renderAudit(); if (k === 'busca') { var i = document.querySelector('#view-audit .search-sm'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } } }, k === 'busca' ? 250 : 0); },
    exportar: function () { F().baixarArquivo('﻿' + ['Quando;Quem;Ação;Módulo;Descrição'].concat((st().auditLogs || []).map(function (l) { return [new Date(l.timestamp).toLocaleString('pt-BR'), '"' + (l.user || '') + '"', l.action, l.module, '"' + String(l.details || '').replace(/"/g, '""') + '"'].join(';'); })).join('\n'), 'historico-alteracoes.csv', 'text/csv'); }
  };

  // ═════════════ RH: folha e provisões ═════════════
  var REGIMES = {
    mei: ['MEI', 3], simples: ['Simples Nacional (anexos I, II, III ou V)', 0], simples_iv: ['Simples Nacional — anexo IV', 21],
    presumido: ['Lucro Presumido', 27.8], real: ['Lucro Real', 27.8]
  };
  function encargoPatronal() { var s = st().settings || {}; if (s.encargoPatronal !== undefined && s.encargoPatronal !== '') return num(s.encargoPatronal); return (REGIMES[s.regime] || REGIMES.simples)[1]; }
  function provisoes(e) {
    var sal = num(e.salarioBruto), pat = encargoPatronal() / 100;
    var ferias = sal / 12 * (4 / 3), decimo = sal / 12;
    var fgts = (sal + ferias + decimo) * 0.08, inss = (sal + ferias + decimo) * pat;
    return { ferias: r2(ferias), decimo: r2(decimo), fgts: r2(fgts), inss: r2(inss), total: r2(sal + ferias + decimo + fgts + inss) };
  }
  window.calculateProvisions = function (e) { var p = provisoes(e); return { ferias: p.ferias, decimoTerceiro: p.decimo, encargos: r2(p.fgts + p.inss), total: p.total }; };
  window.renderHR = function () {
    var v = el('view-hr'); if (!v) return;
    st().employees = Array.isArray(st().employees) ? st().employees : [];
    var ativos = st().employees.filter(function (e) { return e.ativo !== false; });
    var tot = ativos.reduce(function (a, e) { var p = provisoes(e); a.sal += num(e.salarioBruto); a.prov += p.ferias + p.decimo; a.enc += p.fgts + p.inss; a.total += p.total; return a; }, { sal: 0, prov: 0, enc: 0, total: 0 });
    var s = st().settings || {}, reg = REGIMES[s.regime] ? s.regime : 'simples';
    var folhas = st().folhas || {};
    var mesRef = F().mes(F().addMeses(hoje(), -1));
    v.innerHTML = cab('RH e Folha', 'Custo real de cada colaborador com férias, 13º e encargos, e a folha lançada no contas a pagar', '<button class="btn-secondary" onclick="rh.lancarFolha()">Lançar folha do mês</button><button class="btn-primary" onclick="rh.editar()">+ Colaborador</button>') +
      kpis([
        { v: ativos.length, l: 'Colaboradores ativos' },
        { v: moeda(r2(tot.sal)), l: 'Salários brutos / mês' },
        { v: moeda(r2(tot.prov)), l: 'Provisão de férias e 13º / mês', c: 'fin-neg' },
        { v: moeda(r2(tot.total)), l: 'Custo total / mês', s: 'com FGTS e INSS patronal de ' + String(encargoPatronal()).replace('.', ',') + '%', gold: true }
      ]) +
      '<div class="card" style="margin-bottom:14px"><div class="form-grid" style="align-items:end"><div class="form-field"><label class="form-label" for="rhRegime">Regime da empresa</label><select class="form-input" id="rhRegime" onchange="rh.regime(this.value)">' + Object.keys(REGIMES).map(function (k) { return '<option value="' + k + '"' + (reg === k ? ' selected' : '') + '>' + REGIMES[k][0] + '</option>'; }).join('') + '</select></div>' +
      '<div class="form-field"><label class="form-label" for="rhPat">INSS patronal + RAT + terceiros (%)</label><input type="number" step="0.1" min="0" class="form-input" id="rhPat" value="' + encargoPatronal() + '" onchange="rh.patronal(this.value)"></div></div>' +
      '<p class="fin-sub" style="margin-top:6px">No Simples (anexos I, II, III e V) a contribuição patronal já está no DAS. Confirme a alíquota com o contador. FGTS: 8%.' + (folhas[mesRef] ? ' Folha de ' + F().nomeMes(mesRef) + ' já lançada.' : '') + '</p></div>' +
      '<div class="card">' + (ativos.length ? '<div class="table-scroll"><table class="data-table"><thead><tr><th>Colaborador</th><th>Salário bruto</th><th class="fin-hide-sm">Férias + 1/3</th><th class="fin-hide-sm">13º</th><th class="fin-hide-sm">FGTS</th><th class="fin-hide-sm">INSS patronal</th><th>Custo/mês</th><th></th></tr></thead><tbody>' +
        ativos.map(function (e) { var p = provisoes(e); return '<tr><td><b>' + esc(e.nome) + '</b><div class="fin-sub">' + esc(e.cargo || '') + (e.dataAdmissao ? ' · desde ' + F().dataBR(e.dataAdmissao) : '') + '</div></td><td>' + moeda(num(e.salarioBruto)) + '</td><td class="fin-hide-sm">' + moeda(p.ferias) + '</td><td class="fin-hide-sm">' + moeda(p.decimo) + '</td><td class="fin-hide-sm">' + moeda(p.fgts) + '</td><td class="fin-hide-sm">' + moeda(p.inss) + '</td><td style="font-weight:700">' + moeda(p.total) + '</td><td><div class="fin-acoes"><button class="fin-btn" onclick="rh.editar(\'' + e.id + '\')">✏️</button><button class="fin-btn" onclick="rh.desligar(\'' + e.id + '\')">Desligar</button></div></td></tr>'; }).join('') +
        '</tbody></table></div>' : '<div class="empty-block" style="padding:28px">Cadastre os colaboradores para ver o custo real da folha.</div>') + '</div>';
  };
  window.rh = {
    regime: function (r) { st().settings.regime = r; st().settings.encargoPatronal = REGIMES[r][1]; salvar(); window.renderHR(); },
    patronal: function (v) { st().settings.encargoPatronal = num(v); salvar(); window.renderHR(); },
    editar: function (id) {
      var e = id ? st().employees.find(function (x) { return x.id === id; }) : null;
      F().modal('rhModal2', e ? '✏️ Colaborador' : '+ Colaborador',
        '<div class="form-grid"><div class="form-field span-2"><label class="form-label" for="rhNome">Nome *</label><input class="form-input" id="rhNome" maxlength="80" value="' + esc(e ? e.nome : '') + '"></div>' +
        '<div class="form-field"><label class="form-label" for="rhCargo">Cargo</label><input class="form-input" id="rhCargo" maxlength="60" value="' + esc(e ? e.cargo : '') + '"></div>' +
        '<div class="form-field"><label class="form-label" for="rhSal">Salário bruto (R$) *</label><input type="number" step="0.01" min="0" class="form-input" id="rhSal" value="' + (e ? e.salarioBruto : '') + '"></div>' +
        '<div class="form-field"><label class="form-label" for="rhAdm">Admissão</label><input type="date" class="form-input" id="rhAdm" value="' + esc(e ? e.dataAdmissao || '' : hoje()) + '"></div>' +
        '<div class="form-field"><label class="form-label" for="rhPix">Chave Pix (para pagar)</label><input class="form-input" id="rhPix" maxlength="80" value="' + esc(e ? e.pix || '' : '') + '"></div></div>',
        '<button class="btn-ghost" onclick="fin.fechar(\'rhModal2\')">Cancelar</button><button class="btn-primary" onclick="rh.salvar(\'' + (e ? e.id : '') + '\')">Salvar</button>');
    },
    salvar: function (id) {
      var nome = el('rhNome').value.trim(), sal = r2(num(el('rhSal').value));
      if (!nome || !(sal > 0)) return toast('Preencha nome e salário.', 'error');
      var dados = { nome: nome, cargo: el('rhCargo').value.trim(), salarioBruto: sal, dataAdmissao: el('rhAdm').value, pix: el('rhPix').value.trim() };
      if (id) Object.assign(st().employees.find(function (x) { return x.id === id; }), dados); else st().employees.push(Object.assign({ id: novoId(), ativo: true }, dados));
      salvar(); F().fechar('rhModal2'); window.renderHR(); toast('Colaborador salvo.');
    },
    desligar: function (id) {
      var e = st().employees.find(function (x) { return x.id === id; }); if (!e || !confirm('Registrar o desligamento de ' + e.nome + '? As verbas rescisórias devem ser calculadas pelo contador.')) return;
      e.ativo = false; e.desligadoEm = hoje(); salvar(); window.renderHR();
    },
    lancarFolha: function () {
      var ativos = (st().employees || []).filter(function (e) { return e.ativo !== false; });
      if (!ativos.length) return toast('Cadastre os colaboradores primeiro.', 'error');
      var mes = prompt('Competência da folha (AAAA-MM):', F().mes(F().addMeses(hoje(), -1)));
      if (!mes || !/^\d{4}-\d{2}$/.test(mes)) return;
      st().folhas = st().folhas || {};
      if (st().folhas[mes] && !confirm('A folha de ' + F().nomeMes(mes) + ' já foi lançada. Lançar de novo?')) return;
      var prox = F().mes(F().addMeses(mes + '-01', 1)), fimMes = F().addDias(prox + '-01', -1);
      var sal = r2(ativos.reduce(function (a, e) { return a + num(e.salarioBruto); }, 0));
      var fgts = r2(sal * 0.08), inss = r2(sal * encargoPatronal() / 100), ids = [];
      ids.push(F().criarLancamento({ type: 'DESPESA', desc: 'Folha de pagamento ' + F().nomeMes(mes) + ' (salários brutos)', amount: sal, category: 'Salários e Pró-labore', date: fimMes, vencimento: prox + '-05', notes: ativos.length + ' colaborador(es). O INSS e o IRRF descontados saem deste valor: confira o líquido com o contador.' }).id);
      ids.push(F().criarLancamento({ type: 'DESPESA', desc: 'FGTS ' + F().nomeMes(mes), amount: fgts, category: 'Encargos e Benefícios', date: fimMes, vencimento: prox + '-20' }).id);
      if (inss > 0) ids.push(F().criarLancamento({ type: 'DESPESA', desc: 'INSS patronal ' + F().nomeMes(mes), amount: inss, category: 'Encargos e Benefícios', date: fimMes, vencimento: prox + '-20' }).id);
      st().folhas[mes] = ids; salvar(); window.renderHR(); F().atualizarTudo();
      toast('Folha de ' + F().nomeMes(mes) + ' lançada em Contas a pagar (' + ids.length + ' contas).');
    }
  };
  window.submitEmployee = function (e) { if (e) e.preventDefault(); window.rh.editar(); };

  // ═════════════ IMOBILIZADO ═════════════
  function mesesEntre(a, b) { var x = F().data(a), y = F().data(b); return Math.max(0, (y.getFullYear() - x.getFullYear()) * 12 + y.getMonth() - x.getMonth()); }
  window.renderAssets = function () {
    var v = el('view-assets'); if (!v) return;
    st().assets = Array.isArray(st().assets) ? st().assets : [];
    var lista = st().assets.filter(function (a) { return !a.baixadoEm; });
    var calc = lista.map(function (a) {
      var vida = Math.max(1, num(a.vidaUtil)) * 12, mensal = r2(num(a.valor) / vida), usados = Math.min(vida, mesesEntre(a.data || hoje(), hoje()));
      return { a: a, mensal: usados >= vida ? 0 : mensal, acum: r2(Math.min(num(a.valor), mensal * usados)), residual: r2(Math.max(0, num(a.valor) - mensal * usados)) };
    });
    var soma = function (k) { return r2(calc.reduce(function (s, c) { return s + c[k]; }, 0)); };
    var aluguel = lista.reduce(function (s, a) { return s + num(a.aluguel); }, 0), valorTot = lista.reduce(function (s, a) { return s + num(a.valor); }, 0);
    v.innerHTML = cab('Imobilizado', 'Bens da empresa com depreciação linear e rendimento de aluguel', '<button class="btn-primary" onclick="atv.editar()">+ Bem</button>') +
      kpis([{ v: moeda(r2(valorTot)), l: 'Valor de aquisição' }, { v: moeda(soma('residual')), l: 'Valor contábil hoje', gold: true }, { v: moeda(soma('mensal')), l: 'Depreciação por mês', c: 'fin-neg' }, { v: aluguel ? (aluguel * 12 / valorTot * 100).toFixed(1).replace('.', ',') + '% a.a.' : '—', l: 'Rendimento de aluguel' }]) +
      '<div class="card">' + (calc.length ? '<div class="table-scroll"><table class="data-table"><thead><tr><th>Bem</th><th>Aquisição</th><th class="fin-hide-sm">Vida útil</th><th>Depreciação/mês</th><th>Valor hoje</th><th></th></tr></thead><tbody>' +
        calc.map(function (c) { var a = c.a; return '<tr><td><b>' + esc(a.nome) + '</b><div class="fin-sub">' + esc(a.tipo || '') + (a.aluguel ? ' · aluguel ' + moeda(num(a.aluguel)) + '/mês' : '') + '</div></td><td>' + moeda(num(a.valor)) + '<div class="fin-sub">' + F().dataBR(a.data) + '</div></td><td class="fin-hide-sm">' + num(a.vidaUtil) + ' anos</td><td>' + moeda(c.mensal) + '</td><td style="font-weight:700">' + moeda(c.residual) + '</td><td><div class="fin-acoes"><button class="fin-btn" onclick="atv.editar(\'' + a.id + '\')">✏️</button><button class="fin-btn" onclick="atv.baixar(\'' + a.id + '\')">Baixar</button></div></td></tr>'; }).join('') +
        '</tbody></table></div><p class="fin-sub" style="margin-top:8px">Depreciação gerencial linear. A depreciação fiscal segue as taxas da Receita (IN 1.700/2017): confirme com o contador.</p>' : '<div class="empty-block" style="padding:28px">Nenhum bem cadastrado.</div>') + '</div>';
  };
  window.atv = {
    editar: function (id) {
      var a = id ? st().assets.find(function (x) { return x.id === id; }) : null;
      var vidas = { 'Imóvel': 25, 'Veículo': 5, 'Máquina': 10, 'Computador': 5, 'Móveis': 10, 'Outro': 10 };
      F().modal('atvModal', a ? '✏️ Bem' : '+ Bem do imobilizado',
        '<div class="form-grid"><div class="form-field span-2"><label class="form-label" for="aNome">Descrição *</label><input class="form-input" id="aNome" maxlength="80" value="' + esc(a ? a.nome : '') + '"></div>' +
        '<div class="form-field"><label class="form-label" for="aTipo">Tipo</label><select class="form-input" id="aTipo" onchange="if(!document.getElementById(\'aVida\').dataset.mexeu)document.getElementById(\'aVida\').value=({\'Imóvel\':25,\'Veículo\':5,\'Máquina\':10,\'Computador\':5,\'Móveis\':10,\'Outro\':10})[this.value]">' + Object.keys(vidas).map(function (t) { return '<option' + (a && a.tipo === t ? ' selected' : '') + '>' + t + '</option>'; }).join('') + '</select></div>' +
        '<div class="form-field"><label class="form-label" for="aValor">Valor de aquisição (R$) *</label><input type="number" step="0.01" min="0" class="form-input" id="aValor" value="' + (a ? a.valor : '') + '"></div>' +
        '<div class="form-field"><label class="form-label" for="aData">Data de aquisição</label><input type="date" class="form-input" id="aData" value="' + esc(a ? a.data : hoje()) + '"></div>' +
        '<div class="form-field"><label class="form-label" for="aVida">Vida útil (anos)</label><input type="number" min="1" class="form-input" id="aVida" oninput="this.dataset.mexeu=1" value="' + (a ? a.vidaUtil : 25) + '"></div>' +
        '<div class="form-field"><label class="form-label" for="aAluguel">Aluguel recebido (R$/mês)</label><input type="number" step="0.01" min="0" class="form-input" id="aAluguel" value="' + (a ? a.aluguel || 0 : 0) + '"></div></div>',
        '<button class="btn-ghost" onclick="fin.fechar(\'atvModal\')">Cancelar</button><button class="btn-primary" onclick="atv.salvar(\'' + (a ? a.id : '') + '\')">Salvar</button>');
    },
    salvar: function (id) {
      var nome = el('aNome').value.trim(), valor = r2(num(el('aValor').value));
      if (!nome || !(valor > 0)) return toast('Preencha descrição e valor.', 'error');
      var d = { nome: nome, tipo: el('aTipo').value, valor: valor, data: el('aData').value || hoje(), vidaUtil: Math.max(1, parseInt(el('aVida').value, 10) || 1), aluguel: r2(num(el('aAluguel').value)) };
      if (id) Object.assign(st().assets.find(function (x) { return x.id === id; }), d); else st().assets.push(Object.assign({ id: novoId() }, d));
      salvar(); F().fechar('atvModal'); window.renderAssets();
    },
    baixar: function (id) { var a = st().assets.find(function (x) { return x.id === id; }); if (!a || !confirm('Dar baixa em "' + a.nome + '" (venda ou descarte)?')) return; a.baixadoEm = hoje(); salvar(); window.renderAssets(); }
  };
  window.submitAsset = function (e) { if (e) e.preventDefault(); window.atv.editar(); };

  // ═════════════ CHECKLIST FISCAL ═════════════
  window.renderTaxAudit = function () {
    var v = el('view-tax-audit'); if (!v || !F()) return;
    F().garantirModelo();
    var s = st().settings || {}, regime = s.regime || '', h = hoje(), mes = F().mesAtual(), mesAnt = F().mes(F().addMeses(h, -1));
    var meses12 = F().mesesAte(mes, 12), pm = F().porMes(meses12, 'competencia');
    var rbt12 = r2(meses12.reduce(function (a, m) { return a + (pm[m].grupos.receita || 0); }, 0));
    var folha12 = r2(meses12.reduce(function (a, m) { return a + (pm[m].grupos.pessoal || 0); }, 0));
    var itens = [];
    var add = function (nivel, titulo, texto, acao) { itens.push({ nivel: nivel, titulo: titulo, texto: texto, acao: acao }); };
    if (!regime) add('alerta', 'Regime tributário não informado', 'Informe o regime em Configurações para o checklist e o RH usarem as regras certas.', "switchView('settings')");
    else add('ok', 'Regime: ' + ((REGIMES[regime] || [regime])[0]), 'Usado nos cálculos de encargos e neste checklist.');
    if (regime === 'mei') add(rbt12 > 81000 ? 'critico' : rbt12 > 64800 ? 'alerta' : 'ok', 'Faturamento de 12 meses: ' + moeda(rbt12), rbt12 > 81000 ? 'Passou do limite do MEI (R$ 81 mil/ano). Procure o contador para o desenquadramento.' : 'Limite do MEI: R$ 81 mil por ano.');
    else if (regime.indexOf('simples') === 0) add(rbt12 > 4800000 ? 'critico' : rbt12 > 3600000 ? 'alerta' : 'ok', 'RBT12: ' + moeda(rbt12), rbt12 > 4800000 ? 'Acima do teto do Simples (R$ 4,8 milhões).' : rbt12 > 3600000 ? 'Acima do sublimite de R$ 3,6 milhões: ICMS e ISS passam a ser recolhidos fora do DAS.' : 'Dentro do limite do Simples. Receita bruta dos últimos 12 meses pelos lançamentos.');
    if (regime === 'simples' || regime === 'simples_iv') {
      var fr = rbt12 > 0 ? folha12 / rbt12 : 0;
      add('info', 'Fator R: ' + (fr * 100).toFixed(1).replace('.', ',') + '%', 'Folha de 12 meses ' + moeda(folha12) + ' ÷ RBT12. Com 28% ou mais, atividades do anexo V podem ser tributadas pelo anexo III. Simule no Simulador Tributário.', "switchView('tributario')");
    }
    var receitasMes = st().transactions.filter(function (t) { return t.type === 'RECEITA' && F().mes(t.date) === mesAnt && ['receita'].indexOf(F().grupoDe(t)) > -1; });
    var semNota = receitasMes.filter(function (t) { return !t.nfId; });
    if (receitasMes.length) add(semNota.length ? 'alerta' : 'ok', semNota.length ? semNota.length + ' receita(s) de ' + F().nomeMes(mesAnt) + ' sem nota vinculada' : 'Receitas de ' + F().nomeMes(mesAnt) + ' com nota', semNota.length ? moeda(F().somar(semNota)) + ' em receitas sem nota fiscal registrada na Landim Advisory. Se a nota foi emitida, registre-a em Notas Fiscais.' : 'Todas as receitas operacionais do mês têm nota registrada.', "switchView('nfe')");
    var impostoAnt = st().transactions.filter(function (t) { return t.type === 'DESPESA' && t.category === 'Impostos e Taxas' && (F().mes(t.date) === mesAnt || F().mes(t.vencimento) === mes); });
    var recAnt = (F().porMes([mesAnt], 'competencia')[mesAnt].grupos.receita || 0);
    if (recAnt > 0 && regime !== '') add(impostoAnt.length ? 'ok' : 'alerta', impostoAnt.length ? 'Imposto de ' + F().nomeMes(mesAnt) + ' lançado' : 'Nenhum imposto lançado para ' + F().nomeMes(mesAnt), impostoAnt.length ? moeda(F().somar(impostoAnt)) + ' em impostos e taxas.' : 'Houve faturamento de ' + moeda(recAnt) + '. Lance a guia (DAS, DARF ou ISS) em Contas a pagar; o DAS vence dia 20.', "fin.novo('DESPESA',{status:'pendente'})");
    var semComp = st().transactions.filter(function (t) { return t.type === 'DESPESA' && F().estaPago(t) && t.amount >= 100 && !t.attachmentUrl && F().mes(t.pagoEm || t.date) === mesAnt && !t.transferenciaId; });
    add(semComp.length ? 'alerta' : 'ok', semComp.length ? semComp.length + ' pagamento(s) de ' + F().nomeMes(mesAnt) + ' sem comprovante' : 'Comprovantes de ' + F().nomeMes(mesAnt) + ' em dia', semComp.length ? 'Anexe nota ou recibo nos lançamentos (acima de R$ 100). Sem documento a despesa pode não ser aceita pelo contador.' : 'Todos os pagamentos acima de R$ 100 têm anexo.', "switchView('accountant')");
    var outros = st().transactions.filter(function (t) { return t.category === 'Outros'; });
    add(outros.length ? 'alerta' : 'ok', outros.length ? outros.length + ' lançamento(s) sem categoria' : 'Lançamentos categorizados', outros.length ? 'Lançamentos em "Outros" deixam o DRE e o pacote do contador imprecisos.' : 'Nenhum lançamento em "Outros".', "switchView('finance')");
    var notasMes = (st().nfes || []).filter(function (n) { return n.status !== 'Cancelada' && (n.dataEmissao || '').slice(0, 7) === mesAnt; });
    var issRet = r2(notasMes.reduce(function (a, n) { return a + num(n.issRetido); }, 0));
    if (issRet) add('info', 'ISS retido em ' + F().nomeMes(mesAnt) + ': ' + moeda(issRet), 'Informe ao contador para não pagar o ISS em duplicidade no DAS.');
    if (regime.indexOf('simples') === 0) add(h >= '2026-11-01' ? 'info' : 'alerta', 'NFS-e no padrão nacional', 'Obrigatória para ME e EPP do Simples a partir de 01/11/2026 (Resolução CGSN nº 191/2026). Emita pelo Emissor Nacional e registre a nota aqui.', "switchView('nfe')");
    var conta = { critico: 0, alerta: 0, ok: 0, info: 0 }; itens.forEach(function (i) { conta[i.nivel]++; });
    var avaliados = conta.critico + conta.alerta + conta.ok, pontos = avaliados ? Math.round(conta.ok / avaliados * 100) : 0;
    var cor = { critico: ['🔴', 'red'], alerta: ['🟡', 'gold'], ok: ['🟢', 'green'], info: ['ℹ️', 'gold'] };
    v.innerHTML = cab('Checklist Fiscal', 'Conferências feitas com os seus lançamentos, notas e regime. Não substitui o contador.', '<button class="btn-secondary" onclick="renderTaxAudit()">↻ Conferir de novo</button>') +
      kpis([{ v: pontos + '%', l: 'Itens em dia', gold: true, s: conta.ok + ' de ' + avaliados + ' conferências' }, { v: conta.critico, l: 'Críticos', c: conta.critico ? 'fin-neg' : '' }, { v: conta.alerta, l: 'Atenção', c: conta.alerta ? 'fin-neg' : '' }, { v: moeda(rbt12), l: 'Receita bruta 12 meses' }]) +
      itens.sort(function (a, b) { var o = { critico: 0, alerta: 1, info: 2, ok: 3 }; return o[a.nivel] - o[b.nivel]; }).map(function (i) {
        return '<div class="fin-alerta ' + cor[i.nivel][1] + '"' + (i.acao ? ' style="cursor:pointer" onclick="' + i.acao + '"' : '') + '>' + cor[i.nivel][0] + ' <b>' + esc(i.titulo) + '</b><br><span style="color:var(--text-muted)">' + esc(i.texto) + '</span>' + (i.acao ? ' <span style="color:var(--gold)">→</span>' : '') + '</div>';
      }).join('');
  };

  // ═════════════ CONFIGURAÇÕES ═════════════
  window.renderConfiguracoes = function () {
    var v = el('view-settings'); if (!v || !F()) return;
    var s = st().settings || {}, pix = s.pix || {};
    var custom = st().categoriasCustom || [];
    var grupos = F().GRUPOS;
    var catLista = function (tipo) {
      return (window.CATEGORIES[tipo] || []).map(function (c) {
        var pad = F().ehPadrao(tipo, c) || c === 'Outros', g = F().grupoDe({ type: tipo, category: c });
        return '<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--border)"><span>' + esc(c) + ' <span class="fin-sub">· ' + esc(grupos[g].nome.replace(/^\([+−-]\) /, '')) + '</span></span>' + (pad ? '<span class="fin-sub">padrão</span>' : '<button class="fin-btn" onclick="cfg.removerCat(\'' + esc(c).replace(/'/g, '') + '\',\'' + tipo + '\')">Remover</button>') + '</div>';
      }).join('');
    };
    var tamanho = (function () { try { return Math.round(JSON.stringify(st()).length / 1024); } catch (e) { return 0; } })();
    v.innerHTML = cab('Configurações', 'Dados da empresa, Pix, categorias, centros de custo e backup') +
      '<div class="grid-2col">' +
      '<div class="card"><h3 class="card-title" style="margin-bottom:12px">🏢 Empresa</h3><div class="form-grid">' +
      '<div class="form-field"><label class="form-label" for="cfCnpj">CNPJ</label><input class="form-input" id="cfCnpj" maxlength="18" value="' + esc(F().docFmt(s.cnpj || '')) + '" placeholder="Busca os dados na Receita"></div>' +
      '<div class="form-field"><label class="form-label" for="cfEmpresa">Nome da empresa</label><input class="form-input" id="cfEmpresa" maxlength="80" value="' + esc(s.company || '') + '"></div>' +
      '<div class="form-field"><label class="form-label" for="cfNome">Seu nome</label><input class="form-input" id="cfNome" maxlength="60" value="' + esc(s.name && s.name !== 'CFO Master' ? s.name : ((window.maxcfoUser || {}).name || '')) + '"></div>' +
      '<div class="form-field"><label class="form-label" for="cfTel">Telefone / WhatsApp</label><input class="form-input" id="cfTel" maxlength="20" value="' + esc(s.telefone || '') + '"></div>' +
      '<div class="form-field"><label class="form-label" for="cfSetor">Setor</label><select class="form-input" id="cfSetor">' + ['Serviços', 'Consultoria', 'Comércio', 'Indústria', 'Tecnologia', 'Saúde', 'Educação', 'Construção', 'Alimentação', 'Outros'].map(function (o) { return '<option' + (s.sector === o ? ' selected' : '') + '>' + o + '</option>'; }).join('') + '</select></div>' +
      '<div class="form-field"><label class="form-label" for="cfRegime">Regime tributário</label><select class="form-input" id="cfRegime"><option value="">—</option>' + Object.keys(REGIMES).map(function (k) { return '<option value="' + k + '"' + (s.regime === k ? ' selected' : '') + '>' + REGIMES[k][0] + '</option>'; }).join('') + '</select></div>' +
      '</div><button class="btn-primary" style="margin-top:12px" onclick="cfg.salvarEmpresa()">Salvar</button></div>' +
      '<div class="card"><h3 class="card-title" style="margin-bottom:12px">💠 Pix para cobranças</h3><div class="form-grid">' +
      '<div class="form-field"><label class="form-label" for="cfPixTipo">Tipo de chave</label><select class="form-input" id="cfPixTipo">' + [['cpfcnpj', 'CPF ou CNPJ'], ['celular', 'Celular'], ['email', 'E-mail'], ['aleatoria', 'Chave aleatória']].map(function (o) { return '<option value="' + o[0] + '"' + (pix.tipo === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></div>' +
      '<div class="form-field"><label class="form-label" for="cfPixChave">Chave</label><input class="form-input" id="cfPixChave" value="' + esc(pix.chaveDigitada || pix.chave || '') + '"></div>' +
      '<div class="form-field"><label class="form-label" for="cfPixNome">Nome do recebedor</label><input class="form-input" id="cfPixNome" maxlength="25" value="' + esc(pix.nome || s.company || '') + '"></div>' +
      '<div class="form-field"><label class="form-label" for="cfPixCidade">Cidade</label><input class="form-input" id="cfPixCidade" maxlength="15" value="' + esc(pix.cidade || 'Brasilia') + '"></div>' +
      '</div><button class="btn-primary" style="margin-top:12px" onclick="cfg.salvarPix()">Salvar chave</button></div>' +
      '<div class="card"><h3 class="card-title" style="margin-bottom:8px">🏷️ Categorias</h3><p class="fin-sub" style="margin-bottom:10px">Cada categoria cai numa linha do DRE. Crie as suas para detalhar receitas e despesas.</p>' +
      '<div class="form-grid" style="align-items:end"><div class="form-field"><label class="form-label" for="cfCatNome">Nova categoria</label><input class="form-input" id="cfCatNome" maxlength="50"></div>' +
      '<div class="form-field"><label class="form-label" for="cfCatTipo">Tipo</label><select class="form-input" id="cfCatTipo" onchange="cfg.gruposDoTipo()"><option value="DESPESA">Despesa</option><option value="RECEITA">Receita</option></select></div>' +
      '<div class="form-field span-2"><label class="form-label" for="cfCatGrupo">Linha do DRE</label><select class="form-input" id="cfCatGrupo"></select></div></div>' +
      '<button class="btn-secondary" style="margin-top:10px" onclick="cfg.addCat()">+ Adicionar</button>' +
      '<details style="margin-top:14px"><summary style="cursor:pointer;color:var(--gold)">Ver categorias de despesa (' + (window.CATEGORIES.DESPESA || []).length + ')</summary>' + catLista('DESPESA') + '</details>' +
      '<details style="margin-top:8px"><summary style="cursor:pointer;color:var(--gold)">Ver categorias de receita (' + (window.CATEGORIES.RECEITA || []).length + ')</summary>' + catLista('RECEITA') + '</details></div>' +
      '<div class="card"><h3 class="card-title" style="margin-bottom:8px">🎯 Centros de custo</h3><p class="fin-sub" style="margin-bottom:10px">Separe receitas e despesas por loja, projeto, filial ou área. Depois filtre Contas a receber, Contas a pagar e o DRE por centro.</p>' +
      '<div style="display:flex;gap:8px;align-items:end"><div class="form-field" style="flex:1"><label class="form-label" for="cfCentroNome">Novo centro de custo</label><input class="form-input" id="cfCentroNome" maxlength="60" placeholder="Ex.: Loja Centro, Projeto X, Administrativo" onkeydown="if(event.key===\'Enter\')cfg.addCentro()"></div><button class="btn-secondary" onclick="cfg.addCentro()">+ Adicionar</button></div>' +
      '<div id="cfCentros" style="display:flex;gap:6px;flex-wrap:wrap;margin-top:12px">' + (F().centros().length ? F().centros().map(function (c) { var n = st().transactions.filter(function (t) { return t.centroCusto === c; }).length; return '<span class="fin-sit" style="display:inline-flex;gap:6px;align-items:center;padding:5px 10px">' + esc(c) + ' <span class="fin-sub">' + n + '</span>' + (n ? '' : '<a style="cursor:pointer" title="Remover" onclick="cfg.removerCentro(this.dataset.c)" data-c="' + esc(c) + '">✕</a>') + '</span>'; }).join('') : '<span class="fin-sub">Nenhum centro de custo ainda.</span>') + '</div></div>' +
      '<div class="card"><h3 class="card-title" style="margin-bottom:12px">🗄️ Dados e backup</h3><div class="data-info">' +
      '<div class="data-info-row"><span>Lançamentos</span><strong>' + st().transactions.length + '</strong></div><div class="data-info-row"><span>Clientes e fornecedores</span><strong>' + Object.keys(st().contatos || {}).length + '</strong></div>' +
      '<div class="data-info-row"><span>Espaço usado na nuvem</span><strong>' + tamanho + ' KB de ~900 KB</strong></div></div>' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:14px"><button class="btn-secondary" onclick="exportAllData()">⬇️ Backup completo</button><button class="btn-secondary" onclick="exportCSV()">⬇️ Lançamentos (Excel)</button><button class="btn-secondary" onclick="importData()">⬆️ Restaurar backup</button><button class="btn-danger-outline" onclick="cfg.limpar()">🗑️ Apagar tudo</button></div>' +
      '<input type="file" id="importFileInput" style="display:none" accept=".json" onchange="handleImport(event)">' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:14px;align-items:center"><span class="fin-sub">Aparência:</span><select class="select-sm" id="cfTema" onchange="applyTheme(this.value)" aria-label="Tema">' + (function () { var t = 'escuro'; try { t = localStorage.getItem('maxcfo_tema') || 'escuro'; } catch (e) { } return [['escuro', '🌙 Escuro'], ['claro', '☀️ Claro'], ['auto', '💻 Automático (igual ao aparelho)']].map(function (o) { return '<option value="' + o[0] + '"' + (t === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join(''); })() + '</select>' +
      '<a class="fin-btn gold" href="/pricing">Plano e assinatura</a></div></div>' +
      '</div>' +
      '<div class="card" style="margin-top:16px"><h3 class="card-title" style="margin-bottom:8px">ℹ️ Sobre</h3><p class="fin-sub" style="line-height:1.7">Landim Advisory v5. Os dados de cada empresa ficam na nuvem do Google Firebase, separados por login, com cópia no navegador para abrir mais rápido. O CFO e a leitura de documentos funcionam no próprio navegador, sem IA de terceiros; a consulta de CNPJ usa dados públicos da Receita Federal (BrasilAPI). Detalhes na <a class="link-go" href="/privacidade" target="_blank">Política de Privacidade</a>.</p></div>';
    window.cfg.gruposDoTipo();
    var c = el('cfCnpj');
    c.addEventListener('blur', async function () {
      var d = c.value.replace(/\D/g, ''); if (d.length !== 14) return;
      try {
        var r = await fetch('https://brasilapi.com.br/api/cnpj/v1/' + d); if (!r.ok) return; var j = await r.json();
        if (!el('cfEmpresa').value) el('cfEmpresa').value = (j.nome_fantasia || j.razao_social || '').slice(0, 80);
        if (!el('cfRegime').value) el('cfRegime').value = j.opcao_pelo_mei ? 'mei' : j.opcao_pelo_simples ? 'simples' : '';
        if (!el('cfTel').value && j.ddd_telefone_1) el('cfTel').value = j.ddd_telefone_1;
        toast('Dados da Receita preenchidos. Confira e salve.', 'info');
      } catch (e) { }
    });
  };
  window.cfg = {
    gruposDoTipo: function () {
      var tipo = (el('cfCatTipo') || {}).value || 'DESPESA', sel = el('cfCatGrupo'); if (!sel) return;
      var opc = tipo === 'RECEITA' ? ['receita', 'financeiro_rec', 'outras_rec', 'fora'] : ['deducoes', 'custos', 'pessoal', 'operacionais', 'financeiro_desp', 'fora'];
      sel.innerHTML = opc.map(function (g) { return '<option value="' + g + '">' + esc(F().GRUPOS[g].nome) + '</option>'; }).join('');
      sel.value = tipo === 'RECEITA' ? 'receita' : 'operacionais';
    },
    addCat: function () {
      var erro = F().addCategoria(el('cfCatNome').value, el('cfCatTipo').value, el('cfCatGrupo').value);
      if (erro) return toast(erro, 'error');
      toast('Categoria criada.'); window.renderConfiguracoes();
    },
    addCentro: function () { var n = F().addCentro(el('cfCentroNome').value); if (!n) return toast('Digite o nome do centro de custo.', 'error'); toast('Centro de custo criado.'); window.renderConfiguracoes(); },
    removerCentro: function (nome) { st().centrosCusto = (st().centrosCusto || []).filter(function (c) { return c !== nome; }); if (window.persist) window.persist(); toast('Centro de custo removido.', 'warn'); window.renderConfiguracoes(); },
    removerCat: function (nome, tipo) { if (F().removerCategoria(nome, tipo)) { toast('Categoria removida.', 'warn'); window.renderConfiguracoes(); } },
    salvarEmpresa: function () {
      var s = st().settings;
      s.cnpj = el('cfCnpj').value.replace(/\D/g, ''); s.company = el('cfEmpresa').value.trim(); s.name = el('cfNome').value.trim(); s.telefone = el('cfTel').value.trim(); s.sector = el('cfSetor').value;
      if (el('cfRegime').value !== s.regime) { s.regime = el('cfRegime').value; if (REGIMES[s.regime]) s.encargoPatronal = REGIMES[s.regime][1]; }
      if (window.maxcfoEmpresas && s.company) { var e = window.maxcfoEmpresas; e.renomear(e.ativa || '', s.company); }
      salvar(); if (window.applySettings) window.applySettings(); toast('Dados da empresa salvos.');
    },
    salvarPix: function () {
      var tipo = el('cfPixTipo').value, dig = el('cfPixChave').value, chave = F().normalizarChavePix(tipo, dig), erro = F().validarChavePix(tipo, chave);
      if (erro) return toast(erro, 'error');
      st().settings.pix = { tipo: tipo, chave: chave, chaveDigitada: dig, nome: el('cfPixNome').value.trim(), cidade: el('cfPixCidade').value.trim() || 'Brasilia' };
      salvar(); toast('Chave Pix salva.');
    },
    limpar: function () {
      if (prompt('Isso apaga TODOS os dados desta empresa. Digite APAGAR para confirmar:') !== 'APAGAR') return;
      var manter = { settings: st().settings, contas: [{ id: 'conta-principal', nome: 'Conta principal', tipo: 'Conta corrente', saldoInicial: 0, dataSaldo: '' }] };
      Object.keys(st()).forEach(function (k) { if (Array.isArray(st()[k])) st()[k] = []; else if (k === 'contatos' || k === 'regras' || k === 'folhas' || k === 'seq') st()[k] = {}; });
      Object.assign(st(), manter); salvar(); toast('Dados apagados.', 'warn'); if (F()) F().atualizarTudo(); window.renderConfiguracoes();
    }
  };

  // ═════════════ SIMULADOR: base na média real ═════════════
  window.fin_baseSimulacao = function () {
    var meses = F().mesesAte(F().mes(F().addMeses(hoje(), -1)), 3), pm = F().porMes(meses, 'competencia');
    var rec = meses.reduce(function (a, m) { return a + pm[m].receitas; }, 0) / 3, desp = meses.reduce(function (a, m) { return a + pm[m].despesas; }, 0) / 3;
    if (!rec && !desp) { var atual = F().porMes([F().mesAtual()], 'competencia')[F().mesAtual()]; rec = atual.receitas; desp = atual.despesas; }
    return { receitas: r2(rec), despesas: r2(desp), saldo: r2(rec - desp), txCount: st().transactions.length };
  };

  window.initGestaoModule = function () {
    window.initAuditModule();
    var vm = window.viewMeta = window.viewMeta || {};
    vm.audit = { label: 'Histórico de alterações', render: window.renderAudit };
    vm.hr = { label: 'RH e Folha', render: window.renderHR };
    vm.assets = { label: 'Imobilizado', render: window.renderAssets };
    vm['tax-audit'] = { label: 'Checklist Fiscal', render: window.renderTaxAudit };
    vm.settings = { label: 'Configurações', render: window.renderConfiguracoes };
    window.updateSettingsPanel = window.renderConfiguracoes;
    var rot = function (id, t) { var a = el('nav-' + id); if (a) { var l = a.querySelector('.nav-label'); if (l) l.textContent = t; } };
    rot('audit', 'Histórico de alterações'); rot('hr', 'RH e Folha'); rot('assets', 'Imobilizado'); rot('tax-audit', 'Checklist Fiscal'); rot('companies', 'Consulta de CNPJ'); rot('simulator', 'Simulador de Cenários'); rot('reports', 'Relatórios');
  };
})();
