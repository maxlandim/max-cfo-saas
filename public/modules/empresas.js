/**
 * MAX CFO AI — Várias empresas no mesmo login (BPO financeiro, contadores, grupos)
 * Seletor de empresa no menu e painel consolidado com caixa, contas e vencidos de todas as empresas.
 */
(function () {
  'use strict';
  function E() { return window.maxcfoEmpresas; }
  function F() { return window.fin; }
  function el(id) { return document.getElementById(id); }
  function esc(s) { return F() ? F().esc(s) : String(s == null ? '' : s); }
  function toast(m, t) { if (window.showToast) window.showToast(m, t || 'success'); }
  function doc(d) { d = String(d || '').replace(/\D/g, ''); return d.length === 14 ? d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') : d; }

  function nomeAtiva() {
    var e = E(); if (!e) return '';
    if (!e.ativa) return e.principal || (window.state && window.state.settings && window.state.settings.company) || 'Empresa principal';
    var x = e.lista.find(function (i) { return i.id === e.ativa; });
    return x ? x.nome : 'Empresa';
  }
  function total() { var e = E(); return e ? 1 + e.lista.length : 1; }

  function montar() {
    if (!E() || el('empSeletor')) return;
    var brand = document.querySelector('.sidebar-brand');
    if (brand) {
      var b = document.createElement('button');
      b.id = 'empSeletor'; b.type = 'button';
      b.style.cssText = 'display:flex;align-items:center;gap:8px;width:calc(100% - 24px);margin:0 12px 10px;padding:9px 12px;border-radius:10px;border:1px solid var(--gold-border);background:var(--gold-dim);color:var(--text);cursor:pointer;font-size:13px;text-align:left';
      b.innerHTML = '<span>🏢</span><span id="empSeletorNome" style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600"></span><span style="color:var(--gold)">▾</span>';
      b.title = 'Trocar de empresa';
      b.onclick = abrir;
      brand.parentNode.insertBefore(b, brand.nextSibling);
    }
    var dash = el('nav-dashboard');
    if (dash && !el('nav-bpo')) {
      var a = document.createElement('a');
      a.className = 'nav-item'; a.dataset.view = 'bpo'; a.id = 'nav-bpo';
      a.innerHTML = '<span class="nav-icon">🏢</span><span class="nav-label">Painel Multiempresas</span>';
      a.onclick = function () { window.switchView('bpo'); };
      dash.parentNode.insertBefore(a, dash.nextSibling);
    }
    if (!el('view-bpo')) {
      var s = document.createElement('section'); s.className = 'view'; s.id = 'view-bpo'; s.setAttribute('aria-label', 'Painel multiempresas');
      (el('viewsContainer') || document.body).appendChild(s);
    }
    window.viewMeta = window.viewMeta || {};
    window.viewMeta.bpo = { label: 'Painel Multiempresas', render: renderPainel };
    atualizarNome();
  }
  function atualizarNome() { var n = el('empSeletorNome'); if (n) n.textContent = nomeAtiva(); }

  function abrir() {
    var e = E(); if (!e) return;
    var todas = [{ id: '', nome: e.principal || (window.state.settings || {}).company || 'Empresa principal', cnpj: (window.state.settings || {}).cnpj || '' }].concat(e.lista);
    var podeCriar = total() < e.limite;
    var m = el('empModal');
    if (!m) { m = document.createElement('div'); m.className = 'modal-overlay'; m.id = 'empModal'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); document.body.appendChild(m); m.addEventListener('click', function (ev) { if (ev.target === m) window.closeModal('empModal'); }); }
    m.innerHTML = '<div class="modal-box" style="max-width:620px"><div class="modal-head"><div><h2 class="modal-title">🏢 Suas empresas</h2><p class="modal-subtitle">' + total() + ' de ' + (e.limite >= 9999 ? 'ilimitadas' : e.limite) + ' no seu plano · cada empresa tem dados separados</p></div><button class="modal-x" aria-label="Fechar" onclick="closeModal(\'empModal\')">✕</button></div>' +
      '<div style="padding:0 24px 8px"><div style="display:flex;flex-direction:column;gap:8px">' +
      todas.map(function (x) {
        var ativa = (x.id || '') === (e.ativa || '');
        return '<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid ' + (ativa ? 'var(--gold-border)' : 'var(--border)') + ';border-radius:10px;background:' + (ativa ? 'var(--gold-dim)' : 'var(--bg-surf)') + '">' +
          '<div style="flex:1;min-width:0"><div style="font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(x.nome) + (x.id ? '' : ' <span class="fin-sub">(principal)</span>') + '</div><div class="fin-sub">' + esc(doc(x.cnpj) || 'sem CNPJ') + '</div></div>' +
          (ativa ? '<span class="fin-sit ok">Aberta</span>' : '<button class="fin-btn gold" onclick="empresas.trocar(\'' + esc(x.id) + '\')">Abrir</button>') +
          '<button class="fin-btn" title="Renomear" onclick="empresas.renomear(\'' + esc(x.id) + '\')">✏️</button>' +
          (x.id ? '<button class="fin-btn" title="Excluir" onclick="empresas.remover(\'' + esc(x.id) + '\')">🗑️</button>' : '') + '</div>';
      }).join('') + '</div>' +
      (podeCriar
        ? '<div style="margin-top:16px;border-top:1px dashed var(--border);padding-top:14px"><div class="form-grid"><div class="form-field"><label class="form-label" for="empCnpj">CNPJ</label><input class="form-input" id="empCnpj" placeholder="Busca o nome na Receita" maxlength="18"></div><div class="form-field"><label class="form-label" for="empNome">Nome da empresa *</label><input class="form-input" id="empNome" maxlength="80"></div></div>' +
          '<button class="btn-primary" style="margin-top:10px" id="empCriarBtn" onclick="empresas.criar()">+ Adicionar empresa</button></div>'
        : '<div class="fin-alerta gold" style="margin-top:14px">Seu plano permite ' + e.limite + (e.limite === 1 ? ' empresa' : ' empresas') + '. Para atender mais clientes, <a class="link-go" href="/pricing">mude de plano</a>.</div>') +
      '</div><div class="modal-foot"><button class="btn-ghost" onclick="closeModal(\'empModal\')">Fechar</button><button class="btn-secondary" onclick="closeModal(\'empModal\');switchView(\'bpo\')">Ver painel de todas</button></div></div>';
    if (window.openModalEl) window.openModalEl('empModal');
    var c = el('empCnpj');
    if (c) c.addEventListener('blur', async function () {
      var d = c.value.replace(/\D/g, ''); if (d.length !== 14 || el('empNome').value) return;
      try { var r = await fetch('https://brasilapi.com.br/api/cnpj/v1/' + d); if (r.ok) { var j = await r.json(); el('empNome').value = (j.nome_fantasia || j.razao_social || '').slice(0, 80); } } catch (err) { }
    });
  }

  // ── Painel consolidado ──
  var cache = null;
  async function renderPainel(recarregar) {
    var v = el('view-bpo'); if (!v || !E() || !F()) return;
    if (!cache || recarregar === true) {
      v.innerHTML = '<div class="page-header"><div class="page-header-text"><h1>Painel Multiempresas</h1><p class="page-subtitle">Carregando as empresas…</p></div></div>';
      try { cache = await E().carregarTodas(); } catch (e) { cache = []; }
    }
    var hoje = F().hoje();
    var linhas = cache.map(function (emp) {
      var ehAtiva = (emp.id || '') === (E().ativa || '');
      var estado = ehAtiva ? window.state : JSON.parse(JSON.stringify(emp.estado || { transactions: [] }));
      var k = F().comEstado(estado, function () { return F().indicadores(); });
      return { emp: emp, k: k, ativa: ehAtiva };
    });
    var soma = function (f) { return linhas.reduce(function (a, l) { return a + f(l.k); }, 0); };
    var moeda = F().moeda, somar = F().somar;
    var criticas = linhas.filter(function (l) { return l.k.negativoEm || l.k.vencidosPag.length; }).length;
    v.innerHTML = '' +
      '<div class="page-header"><div class="page-header-text"><h1>Painel Multiempresas</h1><p class="page-subtitle">Todas as empresas do seu login, lado a lado. Ideal para BPO financeiro e grupos.</p></div>' +
      '<div class="page-header-actions"><button class="btn-secondary" onclick="empresas.atualizarPainel()">↻ Atualizar</button><button class="btn-primary" onclick="empresas.abrir()">+ Empresa</button></div></div>' +
      '<div class="fin-kpis">' +
      '<div class="fin-kpi2"><div class="v">' + linhas.length + '</div><div class="l">Empresas</div><div class="s">' + criticas + ' precisando de atenção</div></div>' +
      '<div class="fin-kpi2"><div class="v" style="color:var(--gold)">' + moeda(soma(function (k) { return k.saldo; })) + '</div><div class="l">Caixa somado</div></div>' +
      '<div class="fin-kpi2"><div class="v fin-pos">' + moeda(soma(function (k) { return k.aReceber30; })) + '</div><div class="l">A receber em 30 dias</div></div>' +
      '<div class="fin-kpi2"><div class="v fin-neg">' + moeda(soma(function (k) { return k.aPagar30; })) + '</div><div class="l">A pagar em 30 dias</div></div>' +
      '<div class="fin-kpi2"><div class="v fin-neg">' + moeda(soma(function (k) { return somar(k.vencidosRec); })) + '</div><div class="l">Recebimentos em atraso</div></div>' +
      '</div>' +
      '<div class="card"><div class="table-scroll"><table class="data-table"><thead><tr><th>Empresa</th><th>Caixa hoje</th><th>A receber 30d</th><th>A pagar 30d</th><th>Atrasados</th><th>Resultado do mês</th><th>Alerta</th><th></th></tr></thead><tbody>' +
      linhas.map(function (l) {
        var k = l.k, alerta = k.negativoEm ? '<span class="fin-sit atraso">Caixa negativo em ' + F().dataBR(k.negativoEm).slice(0, 5) + '</span>'
          : k.vencidosPag.length ? '<span class="fin-sit atraso">' + k.vencidosPag.length + ' conta(s) vencida(s)</span>'
            : k.venceHoje.length ? '<span class="fin-sit hoje">' + k.venceHoje.length + ' vence(m) hoje</span>'
              : '<span class="fin-sit ok">Em dia</span>';
        return '<tr><td><div style="font-weight:700">' + esc(l.emp.nome) + '</div><div class="fin-sub">' + (l.emp.atualizadoEm ? 'atualizado ' + F().dataBR(String(l.emp.atualizadoEm).slice(0, 10)) : '') + '</div></td>' +
          '<td style="font-weight:700" class="' + (k.saldo < 0 ? 'fin-neg' : '') + '">' + moeda(k.saldo) + '</td><td class="fin-pos">' + moeda(k.aReceber30) + '</td><td class="fin-neg">' + moeda(k.aPagar30) + '</td>' +
          '<td>' + (k.vencidosRec.length || k.vencidosPag.length ? '<div class="fin-pos">' + moeda(somar(k.vencidosRec)) + '</div><div class="fin-neg">' + moeda(somar(k.vencidosPag)) + '</div>' : '—') + '</td>' +
          '<td class="' + (k.atual.dre.resultado < 0 ? 'fin-neg' : '') + '">' + moeda(k.atual.dre.resultado) + '</td><td>' + alerta + '</td>' +
          '<td>' + (l.ativa ? '<span class="fin-sub">aberta</span>' : '<button class="fin-btn gold" onclick="empresas.trocar(\'' + esc(l.emp.id) + '\')">Abrir</button>') + '</td></tr>';
      }).join('') + '</tbody></table></div>' +
      '<p class="fin-sub" style="margin-top:10px">Os números vêm dos lançamentos de cada empresa. Atrasados: verde a receber, vermelho a pagar. Hoje: ' + F().dataBR(hoje) + '.</p></div>';
  }

  window.empresas = {
    abrir: abrir,
    trocar: function (id) { if (E()) { toast('Abrindo empresa…', 'info'); E().trocar(id || ''); } },
    criar: async function () {
      var nome = (el('empNome') || {}).value || '', cnpj = (el('empCnpj') || {}).value || '';
      if (!nome.trim()) return toast('Informe o nome da empresa.', 'error');
      var b = el('empCriarBtn'); if (b) { b.disabled = true; b.textContent = 'Criando…'; }
      var r = await E().criar(nome, cnpj);
      if (r.erro) { toast(r.erro, 'error'); if (b) { b.disabled = false; b.textContent = '+ Adicionar empresa'; } return; }
      toast('Empresa criada. Abrindo…');
      E().trocar(r.item.id);
    },
    renomear: async function (id) {
      var atual = id ? (E().lista.find(function (x) { return x.id === id; }) || {}).nome : (E().principal || (window.state.settings || {}).company || '');
      var nome = prompt('Nome da empresa:', atual || '');
      if (nome === null || !nome.trim()) return;
      await E().renomear(id, nome.trim());
      if ((id || '') === (E().ativa || '') && window.state.settings) { window.state.settings.company = nome.trim(); if (window.persist) window.persist(); }
      atualizarNome(); abrir(); cache = null;
    },
    remover: async function (id) {
      var x = E().lista.find(function (i) { return i.id === id; }); if (!x) return;
      var conf = prompt('Isso apaga TODOS os dados de "' + x.nome + '" (lançamentos, contas, notas). Para confirmar, digite EXCLUIR:');
      if (conf !== 'EXCLUIR') return;
      await E().remover(id);
      toast('Empresa excluída.', 'warn'); cache = null; abrir();
    },
    atualizarPainel: function () { renderPainel(true); }
  };

  window.initEmpresasModule = function () { montar(); };
})();
