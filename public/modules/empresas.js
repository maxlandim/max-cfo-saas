/**
 * Landim Advisory — Várias empresas no mesmo login (BPO financeiro, contadores, grupos)
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
    if (window.maxcfoLeitura) return '👁 ' + (window.maxcfoLeitura.empresa || 'Empresa compartilhada');
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
        var ativa = !window.maxcfoLeitura && (x.id || '') === (e.ativa || '');
        return '<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid ' + (ativa ? 'var(--gold-border)' : 'var(--border)') + ';border-radius:10px;background:' + (ativa ? 'var(--gold-dim)' : 'var(--bg-surf)') + '">' +
          '<div style="flex:1;min-width:0"><div style="font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(x.nome) + (x.id ? '' : ' <span class="fin-sub">(principal)</span>') + '</div><div class="fin-sub">' + esc(doc(x.cnpj) || 'sem CNPJ') + '</div></div>' +
          (ativa ? '<span class="fin-sit ok">Aberta</span>' : '<button class="fin-btn gold" onclick="empresas.trocar(\'' + esc(x.id) + '\')">Abrir</button>') +
          '<button class="fin-btn" title="Renomear" onclick="empresas.renomear(\'' + esc(x.id) + '\')">✏️</button>' +
          (x.id ? '<button class="fin-btn" title="Excluir" onclick="empresas.remover(\'' + esc(x.id) + '\')">🗑️</button>' : '') + '</div>';
      }).join('') + '</div>' +
      (podeCriar
        ? '<div style="margin-top:16px;border-top:1px dashed var(--border);padding-top:14px"><div class="form-grid"><div class="form-field"><label class="form-label" for="empCnpj">CNPJ</label><input class="form-input" id="empCnpj" placeholder="Busca o nome na Receita" maxlength="18"></div><div class="form-field"><label class="form-label" for="empNome">Nome da empresa *</label><input class="form-input" id="empNome" maxlength="80"></div></div>' +
          '<button class="btn-primary" style="margin-top:10px" id="empCriarBtn" onclick="empresas.criar()">+ Adicionar empresa</button></div>'
        : '<div class="fin-alerta gold" style="margin-top:14px">Seu plano permite ' + e.limite + (e.limite === 1 ? ' empresa' : ' empresas') + '. ' + (e.limite >= 30 && e.limite < 9999 ? 'Para mais de 30 empresas, <a class="link-go" href="https://wa.me/5561992105889?text=' + encodeURIComponent('Olá! Preciso de mais de 30 empresas na Landim Advisory.') + '" target="_blank" rel="noopener">fale com a gente no WhatsApp</a>.' : 'Para atender mais clientes, <a class="link-go" href="/pricing">mude de plano</a>.') + '</div>') +
      (window.acessos ? window.acessos.secaoSeletor() : '') +
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
    var hoje = F().hoje(), mes = F().mes(hoje);
    var linhas = cache.map(function (emp) {
      var ehAtiva = (emp.id || '') === (E().ativa || '');
      var estado = ehAtiva ? window.state : JSON.parse(JSON.stringify(emp.estado || { transactions: [] }));
      var k = F().comEstado(estado, function () { return F().indicadores(); });
      // último lançamento: data mais recente de alteração ou, sem ela, a data do próprio lançamento
      var ultimo = 0;
      (estado.transactions || []).forEach(function (t) { var q = t.atualizadoEm || (t.date ? Date.parse(t.date + 'T12:00:00') : 0); if (q > ultimo) ultimo = q; });
      if (!ultimo && emp.atualizadoEm) ultimo = Date.parse(emp.atualizadoEm) || 0;
      var dias = ultimo ? Math.floor((Date.now() - ultimo) / 864e5) : null;
      var semMov = !(estado.transactions || []).length || (dias !== null && dias >= 7);
      var atencao = !!(k.negativoEm || k.vencidosPag.length || k.vencidosRec.length || semMov);
      if (!emp.id && (!emp.nome || emp.nome === 'Empresa principal') && estado.settings && estado.settings.company) emp = Object.assign({}, emp, { nome: estado.settings.company });
      return { emp: emp, k: k, ativa: ehAtiva, dias: dias, semMov: semMov, atencao: atencao, vazia: !(estado.transactions || []).length };
    });
    var soma = function (f) { return Math.round(linhas.reduce(function (a, l) { return a + f(l.k); }, 0) * 100) / 100; };
    var moeda = F().moeda, somar = F().somar;
    var filtro = filtroPainel;
    var filtradas = linhas.filter(function (l) {
      if (filtro === 'atencao') return l.atencao;
      if (filtro === 'negativo') return !!l.k.negativoEm;
      if (filtro === 'atrasados') return l.k.vencidosRec.length || l.k.vencidosPag.length;
      if (filtro === 'parado') return l.semMov;
      return true;
    }).sort(function (a, b) { return (b.atencao - a.atencao) || (b.k.atual.receitas - a.k.atual.receitas); });
    var cont = function (f) { return linhas.filter(f).length; };
    var nAt = cont(function (l) { return l.atencao; }), nNeg = cont(function (l) { return l.k.negativoEm; }), nAtr = cont(function (l) { return l.k.vencidosRec.length || l.k.vencidosPag.length; }), nPar = cont(function (l) { return l.semMov; });
    var fat = soma(function (k) { return k.atual.receitas; }), res = soma(function (k) { return k.atual.dre.resultado; });
    var maior = Math.max.apply(null, linhas.map(function (l) { return l.k.atual.receitas; }).concat([1]));
    var chip = function (id, txt, n) { return '<button class="fin-tab' + (filtro === id ? ' on' : '') + '" onclick="empresas.filtrar(\'' + id + '\')">' + txt + (n ? '<b>' + n + '</b>' : '') + '</button>'; };
    var ultimoTxt = function (l) { return l.vazia ? '<span class="fin-sit atraso">sem lançamentos</span>' : l.dias === null ? '—' : l.dias === 0 ? 'hoje' : l.dias === 1 ? 'ontem' : '<span class="' + (l.dias >= 7 ? 'fin-neg' : '') + '">há ' + l.dias + ' dias</span>'; };
    v.innerHTML = '' +
      '<div class="page-header"><div class="page-header-text"><h1>Todas as empresas</h1><p class="page-subtitle">Indicadores de todas as empresas que você atende, lado a lado. Atualizado ao abrir a tela.</p></div>' +
      '<div class="page-header-actions"><button class="btn-secondary" onclick="empresas.atualizarPainel()">↻ Atualizar</button><button class="btn-primary" onclick="empresas.abrir()">+ Empresa</button></div></div>' +
      '<div class="fin-kpis">' +
      '<div class="fin-kpi2"><div class="v">' + linhas.length + '</div><div class="l">Empresas atendidas</div><div class="s">' + (nAt ? '<span class="fin-neg">' + nAt + ' precisando de atenção</span>' : 'todas em dia') + '</div></div>' +
      '<div class="fin-kpi2"><div class="v fin-pos">' + moeda(fat) + '</div><div class="l">Faturamento somado de ' + F().nomeMes(mes) + '</div><div class="s">soma das receitas do mês</div></div>' +
      '<div class="fin-kpi2"><div class="v ' + (res < 0 ? 'fin-neg' : 'fin-pos') + '">' + moeda(res) + '</div><div class="l">Resultado somado do mês</div><div class="s">' + cont(function (l) { return l.k.atual.dre.resultado < 0; }) + ' com prejuízo</div></div>' +
      '<div class="fin-kpi2"><div class="v" style="color:var(--gold)">' + moeda(soma(function (k) { return k.saldo; })) + '</div><div class="l">Caixa somado hoje</div><div class="s">' + (nNeg ? '<span class="fin-neg">' + nNeg + ' com caixa negativo previsto</span>' : 'nenhum caixa negativo previsto') + '</div></div>' +
      '<div class="fin-kpi2"><div class="v ' + (nPar ? 'fin-neg' : '') + '">' + nPar + '</div><div class="l">Sem lançamento há 7+ dias</div><div class="s">rotina do BPO em dia?</div></div>' +
      '</div>' +
      (linhas.length > 1 ? '<div class="card" style="margin-bottom:14px"><div class="card-title" style="margin-bottom:10px">Faturamento de ' + F().nomeMes(mes) + ' por empresa</div>' +
        linhas.slice().sort(function (a, b) { return b.k.atual.receitas - a.k.atual.receitas; }).slice(0, 12).map(function (l) {
          return '<div style="display:flex;align-items:center;gap:10px;margin:6px 0;font-size:13px"><div style="width:170px;flex:none;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(l.emp.nome) + '</div>' +
            '<div style="flex:1;background:var(--bg-hover);border-radius:4px;height:12px"><div style="width:' + Math.max(1, l.k.atual.receitas / maior * 100).toFixed(1) + '%;height:12px;border-radius:4px;background:var(--gold)"></div></div>' +
            '<div style="width:110px;text-align:right;font-weight:700">' + moeda(l.k.atual.receitas) + '</div></div>';
        }).join('') + '</div>' : '') +
      '<div class="card"><div class="fin-bar"><div class="fin-tabs">' + chip('todas', 'Todas', 0) + chip('atencao', 'Precisam de atenção', nAt) + chip('atrasados', 'Com atrasados', nAtr) + chip('negativo', 'Caixa negativo', nNeg) + chip('parado', 'Sem movimento', nPar) + '</div></div>' +
      (filtradas.length ? '<div class="table-scroll"><table class="data-table"><thead><tr><th>Empresa</th><th>Caixa hoje</th><th>Faturamento do mês</th><th>Resultado do mês</th><th>Próximos 30 dias</th><th>Atrasados</th><th>Último lançamento</th><th>Alerta</th><th></th></tr></thead><tbody>' +
      filtradas.map(function (l) {
        var k = l.k, alerta = k.negativoEm ? '<span class="fin-sit atraso">Caixa negativo em ' + F().dataBR(k.negativoEm).slice(0, 5) + '</span>'
          : k.vencidosPag.length ? '<span class="fin-sit atraso">' + k.vencidosPag.length + ' conta(s) vencida(s)</span>'
            : k.vencidosRec.length ? '<span class="fin-sit atraso">' + k.vencidosRec.length + ' a receber em atraso</span>'
              : l.semMov ? '<span class="fin-sit hoje">Sem movimento</span>'
                : k.venceHoje.length ? '<span class="fin-sit hoje">' + k.venceHoje.length + ' vence(m) hoje</span>'
                  : '<span class="fin-sit ok">Em dia</span>';
        return '<tr><td><div style="font-weight:700">' + esc(l.emp.nome) + '</div>' + (l.ativa ? '<div class="fin-sub">aberta agora</div>' : '') + '</td>' +
          '<td style="font-weight:700" class="' + (k.saldo < 0 ? 'fin-neg' : '') + '">' + moeda(k.saldo) + '</td>' +
          '<td class="fin-pos">' + moeda(k.atual.receitas) + '</td>' +
          '<td class="' + (k.atual.dre.resultado < 0 ? 'fin-neg' : '') + '">' + moeda(k.atual.dre.resultado) + '</td>' +
          '<td style="white-space:nowrap"><div class="fin-pos">+' + moeda(k.aReceber30) + '</div><div class="fin-neg">−' + moeda(k.aPagar30) + '</div></td>' +
          '<td style="white-space:nowrap">' + (k.vencidosRec.length || k.vencidosPag.length ? '<div class="fin-pos">+' + moeda(somar(k.vencidosRec)) + '</div><div class="fin-neg">−' + moeda(somar(k.vencidosPag)) + '</div>' : '—') + '</td>' +
          '<td style="white-space:nowrap">' + ultimoTxt(l) + '</td><td>' + alerta + '</td>' +
          '<td style="white-space:nowrap"><button class="fin-btn" title="Relatório mensal em PDF" onclick="rel.abrirEmpresa(\'' + esc(l.emp.id || '') + '\')">📄 Relatório</button> ' + (l.ativa ? '' : '<button class="fin-btn gold" onclick="empresas.trocar(\'' + esc(l.emp.id) + '\')">Abrir</button>') + '</td></tr>';
      }).join('') + '</tbody></table></div>' : '<div class="empty-block" style="padding:24px">Nenhuma empresa neste filtro. 👏</div>') +
      '<p class="fin-sub" style="margin-top:10px">Os números vêm dos lançamentos de cada empresa. Em "Próximos 30 dias" e "Atrasados": verde é a receber, vermelho é a pagar. "Sem movimento" = nenhum lançamento alterado nos últimos 7 dias. Hoje: ' + F().dataBR(hoje) + '.</p></div>';
  }
  var filtroPainel = 'todas';

  window.empresas = {
    filtrar: function (f) { filtroPainel = f; renderPainel(); },
    estadoDe: function (id) {
      var e = (cache || []).find(function (x) { return (x.id || '') === (id || ''); }); if (!e) return null;
      var ativa = (e.id || '') === (E().ativa || '');
      return { ativa: ativa, nome: e.nome, estado: ativa ? window.state : JSON.parse(JSON.stringify(e.estado || { transactions: [] })) };
    },
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
