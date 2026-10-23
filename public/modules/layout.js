/**
 * Landim Advisory — Layout simples para quem usa no dia a dia
 * Menu enxuto conforme o tipo de negócio (o resto fica em "Mais ferramentas"), nomes em português
 * do dia a dia, boas-vindas no primeiro acesso, "Primeiros passos", Início limpo,
 * botão "+ Novo" que pergunta o que registrar e barra de atalhos no celular.
 */
(function () {
  'use strict';
  var F = function () { return window.fin; };
  function st() { return window.state; }
  function el(id) { return document.getElementById(id); }
  function esc(s) { return F().esc(s); }
  function moeda(v) { return F().moeda(v); }
  function salvar() { if (window.persist) window.persist(); }

  // Módulos (categorias) e, dentro de cada um, as funcionalidades
  var SECOES = [
    ['Início', '🏠', [['dashboard', '🏠', 'Início']]],
    ['Financeiro', '💰', [['receber', '⬇️', 'Contas a receber'], ['pagar', '⬆️', 'Contas a pagar'], ['bancos', '🏦', 'Contas financeiras'], ['fluxo', '📈', 'Fluxo de caixa'], ['contas', '📅', 'Agenda de vencimentos'], ['reconciliation', '🔄', 'Importar extrato'], ['finance', '📒', 'Todos os lançamentos'], ['dre', '📊', 'Resultado (DRE)'], ['reports', '📄', 'Relatório mensal (PDF)']]],
    ['Vendas', '🛒', [['contatos', '👥', 'Clientes e fornecedores'], ['budget', '📝', 'Orçamentos'], ['os', '🛠️', 'Ordens de serviço'], ['plans', '🔁', 'Mensalidades e contratos'], ['crm', '🤝', 'Funil de vendas'], ['commissions', '💸', 'Comissões'], ['inventory', '📦', 'Estoque']]],
    ['Fiscal', '🧾', [['nfe', '🧾', 'Notas fiscais'], ['tributario', '⚖️', 'Impostos e reforma'], ['tax-audit', '✅', 'Checklist fiscal'], ['accountant', '🧮', 'Enviar ao contador']]],
    ['Pessoas e patrimônio', '🧑‍💼', [['hr', '🧑‍💼', 'Funcionários e folha'], ['assets', '🏢', 'Bens da empresa']]],
    ['CFO com IA', '🤖', [['chat', '🤖', 'Pergunte ao CFO'], ['simulator', '🔮', 'Simular cenários'], ['companies', '🔍', 'Consultar CNPJ']]],
    ['Empresa e ajustes', '⚙️', [['settings', '⚙️', 'Configurações'], ['bpo', '🗂️', 'Todas as empresas'], ['team', '👤', 'Equipe e acessos'], ['audit', '🕘', 'Histórico de alterações']]]
  ];
  var FIXOS = ['dashboard', 'receber', 'pagar', 'bancos', 'fluxo', 'contatos', 'chat', 'settings'];
  var PERFIS = {
    servicos: { nome: 'Prestação de serviços', desc: 'Consultoria, agência, clínica, escola, profissional liberal', telas: ['reconciliation', 'dre', 'reports', 'budget', 'plans', 'nfe', 'tributario', 'accountant'] },
    comercio: { nome: 'Comércio e revenda', desc: 'Loja, distribuidora, e-commerce, revenda', telas: ['reconciliation', 'dre', 'reports', 'inventory', 'budget', 'nfe', 'commissions', 'tributario', 'accountant'] },
    tecnico: { nome: 'Serviço técnico ou obra', desc: 'Assistência, manutenção, instalação, reforma', telas: ['reconciliation', 'dre', 'reports', 'os', 'budget', 'inventory', 'nfe', 'tributario', 'accountant'] },
    bpo: { nome: 'BPO financeiro ou contabilidade', desc: 'Cuido do financeiro de várias empresas', telas: ['reconciliation', 'dre', 'reports', 'bpo', 'plans', 'accountant', 'tax-audit', 'nfe', 'tributario', 'finance', 'contas'] }
  };
  function visiveis() {
    var s = st().settings || {};
    if (Array.isArray(s.menuTelas)) return FIXOS.concat(s.menuTelas);
    return FIXOS.concat((PERFIS[s.perfil] || PERFIS.servicos).telas);
  }
  function rotulo(id) { var r = null; SECOES.forEach(function (s) { s[2].forEach(function (i) { if (i[0] === id) r = i[2]; }); }); return r; }
  function moduloDe(id) { var m = null; SECOES.forEach(function (s) { s[2].forEach(function (i) { if (i[0] === id) m = s; }); }); return m; }
  var aberto = null, verMais = {};

  // ── Planos: o que cada nível libera (1 Básico, 2 Intermediário, 3 Completo, 4 Escritório) ──
  var NIVEL_TELA = { budget: 2, os: 2, plans: 2, crm: 2, commissions: 2, inventory: 2, nfe: 2, 'tax-audit': 2, accountant: 2, reports: 2, companies: 2,
    chat: 3, simulator: 3, tributario: 3, bpo: 3, hr: 3, assets: 3, team: 3, audit: 3 };
  var NOME_NIVEL = { 1: 'Básico', 2: 'Intermediário', 3: 'Completo', 4: 'Escritório' };
  function nivelAtual() { var p = window.maxcfoPlano; return p && p.nivel ? p.nivel : 4; }
  function liberado(id) { return (NIVEL_TELA[id] || 1) <= nivelAtual(); }
  function oferta(nivel, oque) {
    var p = window.maxcfoPlano || {}, atual = NOME_NIVEL[nivelAtual()] || '';
    F().modal('layPlano', '🔒 Disponível no plano ' + NOME_NIVEL[nivel],
      '<p style="font-size:15px;line-height:1.6;margin-bottom:10px"><b>' + esc(oque) + '</b> faz parte do plano <b>' + NOME_NIVEL[nivel] + '</b> ou superior.</p>' +
      '<p class="fin-sub" style="line-height:1.6">Seu plano hoje: ' + esc(atual) + '. Ao mudar de plano, tudo o que você já lançou continua aqui e o recurso libera na hora.</p>',
      '<button class="btn-ghost" onclick="fin.fechar(\'layPlano\')">Agora não</button><a class="btn-primary" href="/pricing" style="text-decoration:none">Ver planos</a>');
    return false;
  }

  function estilos() {
    if (el('lay-estilos')) return;
    var css = '' +
      '.lay-mod{margin:2px 0}.lay-mod-h{width:100%;display:flex;align-items:center;gap:10px;background:none;border:0;color:var(--text);font:inherit;font-size:14px;font-weight:600;padding:10px 12px;border-radius:var(--radius-sm);cursor:pointer;text-align:left}.lay-mod-h:hover{background:var(--bg-hover)}' +
      '.lay-mod-h .nav-label{flex:1}.lay-mod-h .ch{font-size:11px;color:var(--text-faint);transition:transform .2s}.lay-mod.aberto .lay-mod-h .ch{transform:rotate(90deg)}.lay-mod.tem-ativa .lay-mod-h{color:var(--gold)}' +
      '.lay-mod-itens{display:none;margin:0 0 6px 22px;padding-left:8px;border-left:1px solid var(--border)}.lay-mod.aberto .lay-mod-itens{display:block}' +
      '.lay-mod-itens .nav-item{font-size:13px;padding:7px 10px}.lay-mod-itens .nav-icon{font-size:13px}' +
      '.lay-trava{opacity:.62}.lay-trava:hover{opacity:1}.lay-cad{margin-left:auto;font-size:11px}' +
      '.lay-vermais{background:none;border:0;color:var(--text-faint);font-size:12px;padding:6px 10px;cursor:pointer}.lay-vermais:hover{color:var(--gold)}' +
      '.lay-subnav{display:flex;gap:6px;align-items:center;overflow-x:auto;scrollbar-width:none;height:48px;box-sizing:border-box;padding:0 26px;border-bottom:1px solid var(--border);background:var(--bg-surf)}.lay-subnav::-webkit-scrollbar{display:none}' +
      'body.com-subnav .view{height:calc(100vh - var(--topbar-h) - 48px)}' +
      '.lay-subnav-mod{font-size:12px;color:var(--text-faint);white-space:nowrap;margin-right:4px}' +
      '.lay-subnav button{white-space:nowrap;background:var(--bg-surf);border:1px solid var(--border);color:var(--text-muted);border-radius:99px;padding:6px 13px;font-size:13px;cursor:pointer}.lay-subnav button:hover{color:var(--text);border-color:var(--gold-border)}.lay-subnav button.on{background:var(--gold-dim);border-color:var(--gold);color:var(--gold);font-weight:700}' +
      '.lay-btn-menu{background:none;border:1px dashed var(--border);color:var(--text-faint);border-radius:var(--radius-sm);padding:8px;margin:10px 4px 0;cursor:pointer;font-size:12px}.lay-btn-menu:hover{color:var(--gold);border-color:var(--gold-border)}' +
      '.lay-hero{display:flex;justify-content:space-between;align-items:flex-end;gap:12px;flex-wrap:wrap;margin-bottom:18px}.lay-hero h1{font-size:26px;letter-spacing:-.02em}.lay-hero p{color:var(--text-muted);margin-top:4px}' +
      '.lay-acoes{display:flex;gap:8px;flex-wrap:wrap}.lay-acoes button{padding:11px 16px;font-size:14px}' +
      '.lay-cards{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:18px}.lay-card{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:18px 20px;cursor:pointer;transition:var(--transition)}.lay-card:hover{border-color:var(--gold-border);transform:translateY(-2px)}' +
      '.lay-card .l{font-size:13px;color:var(--text-muted);display:flex;align-items:center;gap:6px}.lay-card .v{font-size:26px;font-weight:800;letter-spacing:-.02em;margin:6px 0 4px}.lay-card .s{font-size:12px;color:var(--text-faint)}' +
      '.lay-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px}.lay-item{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)}.lay-item:last-child{border-bottom:0}.lay-item .d{flex:1;min-width:0}.lay-item .d b{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
      '.lay-passos{background:linear-gradient(135deg,rgba(212,175,55,.10),rgba(212,175,55,.02));border:1px solid var(--gold-border);border-radius:var(--radius);padding:18px 20px;margin-bottom:18px}' +
      '.lay-barra{height:8px;background:rgba(255,255,255,.07);border-radius:99px;overflow:hidden;margin:10px 0 14px}.lay-barra div{height:100%;background:var(--gold);border-radius:99px}' +
      '.lay-passo{display:flex;align-items:center;gap:12px;padding:9px 0;border-top:1px solid var(--border)}.lay-passo .n{width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;background:var(--bg-hover);flex:none}.lay-passo.feito .n{background:var(--success);color:#04130d}.lay-passo.feito .t{color:var(--text-faint);text-decoration:line-through}.lay-passo .t{flex:1}' +
      '.lay-opcoes{display:grid;grid-template-columns:1fr 1fr;gap:10px}.lay-op{text-align:left;background:var(--bg-surf);border:1px solid var(--border);border-radius:var(--radius-sm);padding:14px;cursor:pointer;color:var(--text);font-size:14px}.lay-op:hover,.lay-op.on{border-color:var(--gold);background:var(--gold-dim)}.lay-op small{display:block;color:var(--text-muted);margin-top:4px;font-size:12px}' +
      '.lay-novo{display:grid;grid-template-columns:1fr 1fr;gap:10px}.lay-novo button{display:flex;align-items:center;gap:10px;text-align:left;background:var(--bg-surf);border:1px solid var(--border);border-radius:var(--radius-sm);padding:14px;cursor:pointer;color:var(--text);font-size:14px;font-weight:600}.lay-novo button:hover{border-color:var(--gold)}.lay-novo span{font-size:22px}' +
      '.lay-bottom{display:none}' +
      '@media (max-width:900px){.lay-cards{grid-template-columns:1fr 1fr}.lay-grid{grid-template-columns:1fr}}' +
      '@media (max-width:700px){.lay-bottom{display:flex;position:fixed;left:0;right:0;bottom:0;z-index:8000;background:var(--bg-surf);border-top:1px solid var(--border);padding:6px 6px calc(6px + env(safe-area-inset-bottom))}' +
      '.lay-bottom button{flex:1;background:none;border:0;color:var(--text-muted);font-size:11px;display:flex;flex-direction:column;align-items:center;gap:2px;padding:4px 0;cursor:pointer}.lay-bottom button span{font-size:19px}.lay-bottom button.on{color:var(--gold)}' +
      '.lay-bottom .mais{background:var(--gold);color:#0B1220;border-radius:14px;margin:0 4px;font-weight:800}.views-container{padding-bottom:84px!important}.maxcfo-banner{bottom:78px!important}' +
      '.lay-subnav{padding:0 14px}.lay-subnav-mod{display:none}.lay-hero h1{font-size:22px}.lay-acoes{width:100%}.lay-acoes button{flex:1}.lay-card{padding:14px}.lay-card .v{font-size:20px}.lay-opcoes,.lay-novo{grid-template-columns:1fr}.topbar-action-btn{display:none}}';
    var s = document.createElement('style'); s.id = 'lay-estilos'; s.textContent = css; document.head.appendChild(s);
  }

  // ═════════════ MENU (módulos que abrem as funcionalidades) ═════════════
  function montarMenu() {
    var nav = document.querySelector('.sidebar-nav'); if (!nav) return;
    var vm = window.viewMeta || {}, vis = visiveis();
    var ativa = document.querySelector('.view.active'), idAtiva = ativa ? ativa.id.replace('view-', '') : 'dashboard';
    if (aberto === null) { var ma = moduloDe(idAtiva); aberto = ma && ma[2].length > 1 ? ma[0] : 'Financeiro'; }
    var item = function (i, sub) { var trava = !liberado(i[0]); return '<a class="nav-item' + (sub ? ' lay-sub' : '') + (trava ? ' lay-trava' : '') + '" data-view="' + i[0] + '" id="nav-' + i[0] + '"' + (trava ? ' title="Disponível no plano ' + NOME_NIVEL[NIVEL_TELA[i[0]]] + '"' : '') + '><span class="nav-icon">' + i[1] + '</span><span class="nav-label">' + i[2] + '</span>' + (trava ? '<span class="lay-cad">🔒</span>' : '') + '</a>'; };
    var html = '';
    SECOES.forEach(function (sec) {
      var todos = sec[2].filter(function (i) { return vm[i[0]]; }); if (!todos.length) return;
      if (todos.length === 1 && sec[0] === 'Início') { html += item(todos[0]); return; }
      var on = todos.filter(function (i) { return vis.indexOf(i[0]) > -1; }), off = todos.filter(function (i) { return vis.indexOf(i[0]) === -1; });
      if (!on.length) { on = off; off = []; }
      var abre = aberto === sec[0];
      html += '<div class="lay-mod' + (abre ? ' aberto' : '') + '" data-mod="' + esc(sec[0]) + '"><button class="lay-mod-h" aria-expanded="' + abre + '"><span class="nav-icon">' + sec[1] + '</span><span class="nav-label">' + sec[0] + '</span><span class="ch">▸</span></button>' +
        '<div class="lay-mod-itens">' + on.map(function (i) { return item(i, true); }).join('') +
        (off.length ? (verMais[sec[0]] ? off.map(function (i) { return item(i, true); }).join('') + '<button class="lay-vermais" data-mais="' + esc(sec[0]) + '">Mostrar menos</button>' : '<button class="lay-vermais" data-mais="' + esc(sec[0]) + '">+ ' + off.length + ' outra' + (off.length > 1 ? 's' : '') + '</button>') : '') + '</div></div>';
    });
    html += (window.maxcfoAdmin ? '<a class="lay-btn-menu" style="display:block;text-align:center;text-decoration:none;border-style:solid;border-color:var(--gold-border);color:var(--gold)" href="/admin">📊 Painel do administrador</a>' : '') + (window.maxcfoLeitura ? '' : '<a class="lay-btn-menu" style="display:block;text-align:center;text-decoration:none" href="/assinatura">💳 Minha assinatura</a>') + '<button class="lay-btn-menu" onclick="layout.personalizar()">Personalizar menu</button>' + (window.maxcfoSair ? '<button class="lay-btn-menu" style="border-style:solid" onclick="if(confirm(\'Sair da sua conta neste aparelho?\'))window.maxcfoSair()">Sair da conta</button>' : '');
    nav.innerHTML = html;
    nav.querySelectorAll('.nav-item').forEach(function (a) { a.addEventListener('click', function () { window.switchView(a.dataset.view); }); });
    nav.querySelectorAll('.lay-mod-h').forEach(function (h) {
      h.addEventListener('click', function () { var m = h.parentNode.dataset.mod; aberto = aberto === m ? '' : m; montarMenu(); });
    });
    nav.querySelectorAll('.lay-vermais').forEach(function (b) { b.addEventListener('click', function () { verMais[b.dataset.mais] = !verMais[b.dataset.mais]; montarMenu(); }); });
    var a = el('nav-' + idAtiva); if (a) a.classList.add('active');
    nav.querySelectorAll('.lay-mod').forEach(function (m) { if (m.querySelector('.nav-item.active')) m.classList.add('tem-ativa'); });
    SECOES.forEach(function (s) { s[2].forEach(function (i) { if (vm[i[0]]) vm[i[0]].label = i[2]; }); });
  }

  // Abas da funcionalidade no topo da tela (as outras do mesmo módulo)
  function subnav(id) {
    var box = el('laySubnav');
    if (!box) { var vc = el('viewsContainer'); if (!vc) return; box = document.createElement('div'); box.id = 'laySubnav'; box.className = 'lay-subnav'; box.setAttribute('role', 'tablist'); vc.insertBefore(box, vc.firstChild); }
    var m = moduloDe(id), vm = window.viewMeta || {}, vis = visiveis();
    var esconder = function () { box.style.display = 'none'; document.body.classList.remove('com-subnav'); };
    if (!m || m[2].length < 2) return esconder();
    var itens = m[2].filter(function (i) { return vm[i[0]] && (vis.indexOf(i[0]) > -1 || i[0] === id); });
    if (itens.length < 2) return esconder();
    box.style.display = ''; document.body.classList.add('com-subnav');
    box.innerHTML = '<span class="lay-subnav-mod">' + m[1] + ' ' + m[0] + '</span>' + itens.map(function (i) { return '<button role="tab" aria-selected="' + (i[0] === id) + '" class="' + (i[0] === id ? 'on' : '') + '" onclick="switchView(\'' + i[0] + '\')">' + i[2] + (liberado(i[0]) ? '' : ' 🔒') + '</button>'; }).join('');
    var on = box.querySelector('.on'); if (on && on.scrollIntoView && box.scrollWidth > box.clientWidth) box.scrollLeft = on.offsetLeft - 40;
  }

  // ═════════════ BOAS-VINDAS E PERSONALIZAÇÃO ═════════════
  function boasVindas() {
    var s = st().settings || {}, escolhido = s.perfil || '';
    F().modal('layBoasVindas', '👋 Bem-vindo à Landim Advisory',
      '<p style="color:var(--text-muted);margin-bottom:14px">Duas perguntas rápidas para deixar o sistema do seu jeito. Dá para mudar depois em Configurações.</p>' +
      '<div class="form-grid" style="margin-bottom:14px"><div class="form-field"><label class="form-label" for="bvCnpj">CNPJ da empresa (opcional)</label><input class="form-input" id="bvCnpj" maxlength="18" placeholder="Preenche o nome sozinho" value="' + esc(F().docFmt(s.cnpj || '')) + '"></div>' +
      '<div class="form-field"><label class="form-label" for="bvNome">Nome da empresa</label><input class="form-input" id="bvNome" maxlength="80" value="' + esc(s.company || '') + '"></div></div>' +
      '<div class="form-label" style="margin-bottom:8px">Como é o seu negócio?</div><div class="lay-opcoes">' +
      Object.keys(PERFIS).map(function (k) { return '<button class="lay-op' + (escolhido === k ? ' on' : '') + '" data-p="' + k + '" onclick="layout.escolher(this)"><b>' + PERFIS[k].nome + '</b><small>' + PERFIS[k].desc + '</small></button>'; }).join('') + '</div>',
      '<button class="btn-ghost" onclick="layout.salvarBoasVindas(true)">Pular</button><button class="btn-primary" onclick="layout.salvarBoasVindas()">Começar</button>', true);
    var c = el('bvCnpj');
    c.addEventListener('blur', async function () {
      var d = c.value.replace(/\D/g, ''); if (d.length !== 14) return;
      try { var r = await fetch('https://brasilapi.com.br/api/cnpj/v1/' + d); if (!r.ok) return; var j = await r.json(); if (!el('bvNome').value) el('bvNome').value = (j.nome_fantasia || j.razao_social || '').slice(0, 80); st().settings._regimeSugerido = j.opcao_pelo_mei ? 'mei' : j.opcao_pelo_simples ? 'simples' : ''; } catch (e) { }
    });
  }

  function primeirosPassos() {
    var s = st().settings || {}, txs = st().transactions || [];
    return [
      { feito: !!(s.company && s.cnpj), t: 'Cadastre sua empresa (CNPJ e regime)', a: "switchView('settings')" },
      { feito: (st().contas || []).some(function (c) { return c.dataSaldo; }), t: 'Informe o saldo atual da sua conta no banco', a: "switchView('bancos');fin.editarConta((state.contas[0]||{}).id)" },
      { feito: txs.some(function (t) { return t.type === 'RECEITA'; }), t: 'Lance algo que você tem a receber', a: "fin.novo('RECEITA',{status:'pendente'})" },
      { feito: txs.some(function (t) { return t.type === 'DESPESA'; }), t: 'Lance uma conta a pagar (ou leia um boleto com a câmera)', a: "fin.novo('DESPESA',{status:'pendente'})" },
      { feito: !!(s.pix && s.pix.chave), t: 'Cadastre sua chave Pix para cobrar clientes', a: "switchView('settings')" },
      { feito: txs.some(function (t) { return t.fitid || t.notes === 'Importado do extrato'; }), t: 'Importe o extrato do banco para conferir tudo', a: "switchView('reconciliation')" },
      { feito: !!s.viuFluxo, t: 'Veja quanto vai sobrar ou faltar no caixa nos próximos 90 dias', a: "switchView('fluxo')" }
    ];
  }

  // ═════════════ INÍCIO ═════════════
  window.renderInicio = function () {
    var v = el('view-dashboard'); if (!v || !F()) return;
    F().garantirModelo();
    var k = F().indicadores(), d = k.atual.dre, s = st().settings || {};
    var u = window.maxcfoUser || {}, nome = (s.name && s.name !== 'CFO Master' ? s.name : u.name || '').split(' ')[0];
    var hora = new Date().getHours(), saud = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
    var passos = primeirosPassos(), feitos = passos.filter(function (p) { return p.feito; }).length;
    var mostrarPassos = !s.passosOcultos && feitos < passos.length;
    var vencRec = F().somar(k.vencidosRec), vencPag = F().somar(k.vencidosPag);
    var resultado = r2(k.atual.receitas - k.atual.despesas);
    var alertas = F().alertas();
    if (d.bruta > 0 && d.resultado < 0) alertas.push({ cls: 'red', t: '📉 O mês está com prejuízo de ' + moeda(Math.abs(d.resultado)) + '. Veja onde está o gasto no Resultado do mês.', go: 'dre' });
    var proximos = F().pendentes().filter(function (t) { return F().diffDias(F().hoje(), t.vencimento) <= 10; }).sort(function (a, b) { return a.vencimento > b.vencimento ? 1 : -1; }).slice(0, 7);
    v.innerHTML = '' +
      '<div class="lay-hero"><div><h1>' + saud + (nome ? ', ' + esc(nome) : '') + '!</h1><p>' + new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }) + (s.company ? ' · ' + esc(s.company) : '') + '</p></div>' +
      '<div class="lay-acoes"><button class="btn-primary" onclick="fin.novo(\'RECEITA\',{status:\'pendente\'})">+ Vou receber</button><button class="btn-danger-outline" onclick="fin.novo(\'DESPESA\',{status:\'pendente\'})">+ Vou pagar</button><button class="btn-secondary" onclick="fin.abrirLeitura()">📷 Ler boleto</button></div></div>' +
      (mostrarPassos ? '<div class="lay-passos"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><b>Primeiros passos · ' + feitos + ' de ' + passos.length + '</b><button class="fin-btn" onclick="layout.ocultarPassos()">Ocultar</button></div><div class="lay-barra"><div style="width:' + Math.round(feitos / passos.length * 100) + '%"></div></div>' +
        passos.map(function (p, i) { return '<div class="lay-passo' + (p.feito ? ' feito' : '') + '"><div class="n">' + (p.feito ? '✓' : i + 1) + '</div><div class="t">' + p.t + '</div>' + (p.feito ? '' : '<button class="fin-btn gold" onclick="' + p.a + '">Fazer agora</button>') + '</div>'; }).join('') + '</div>' : '') +
      '<div class="lay-cards">' +
      '<div class="lay-card" onclick="switchView(\'bancos\')"><div class="l">🏦 Quanto tenho hoje</div><div class="v" style="color:var(--gold)">' + moeda(k.saldo) + '</div><div class="s">' + (k.negativoEm ? '<span class="fin-neg">fica negativo em ' + F().dataBR(k.negativoEm) + '</span>' : 'saldo das contas bancárias') + '</div></div>' +
      '<div class="lay-card" onclick="fin.verContas(\'\',\'receber\')"><div class="l">⬇️ Vou receber (30 dias)</div><div class="v fin-pos">' + moeda(k.aReceber30) + '</div><div class="s">' + (vencRec ? '<span class="fin-neg">' + moeda(vencRec) + ' atrasado</span>' : 'nada atrasado') + '</div></div>' +
      '<div class="lay-card" onclick="fin.verContas(\'\',\'pagar\')"><div class="l">⬆️ Vou pagar (30 dias)</div><div class="v fin-neg">' + moeda(k.aPagar30) + '</div><div class="s">' + (vencPag ? '<span class="fin-neg">' + moeda(vencPag) + ' vencido</span>' : 'nada vencido') + '</div></div>' +
      '<div class="lay-card" onclick="switchView(\'dre\')"><div class="l">📊 Resultado de ' + F().nomeMes(k.mes) + '</div><div class="v ' + (resultado < 0 ? 'fin-neg' : 'fin-pos') + '">' + moeda(resultado) + '</div><div class="s">entrou ' + moeda(k.atual.receitas) + ' · saiu ' + moeda(k.atual.despesas) + '</div></div>' +
      '</div>' +
      '<div class="lay-grid">' +
      '<div class="card"><div class="card-title" style="margin-bottom:6px">Precisa da sua atenção</div>' +
      (alertas.length ? alertas.slice(0, 6).map(function (a) { return '<div class="lay-item"' + (a.go ? ' style="cursor:pointer" onclick="' + (a.acao || "switchView('" + a.go + "')") + '"' : '') + '><div class="d" style="white-space:normal">' + esc(a.t) + '</div>' + (a.go ? '<span style="color:var(--gold)">→</span>' : '') + '</div>'; }).join('') : '<div class="lay-item"><div class="d">✅ Tudo em dia. Nada vencido e o caixa segue positivo nos próximos 90 dias.</div></div>') + '</div>' +
      '<div class="card"><div class="card-header-row"><span class="card-title">Vence nos próximos 10 dias</span><a class="btn-link" onclick="fin.verContas(\'\',\'todas\')">Ver tudo →</a></div>' +
      (proximos.length ? proximos.map(function (t) {
        var rs = F().rotuloSituacao(t), rec = t.type === 'RECEITA';
        return '<div class="lay-item"><div class="d"><b>' + esc(t.desc) + '</b><span class="fin-sub">' + esc(t.contato || '') + (t.contato ? ' · ' : '') + '<span class="fin-sit ' + rs.cls + '">' + rs.txt + '</span></span></div><span class="' + (rec ? 'fin-pos' : 'fin-neg') + '" style="font-weight:800;white-space:nowrap">' + (rec ? '+' : '−') + moeda(t.amount) + '</span><button class="fin-btn ok" onclick="fin.baixar(\'' + t.id + '\')">' + (rec ? 'Recebi' : 'Paguei') + '</button></div>';
      }).join('') : '<div class="lay-item"><div class="d fin-sub">Nenhuma conta vencendo. Lance o que você tem a receber e a pagar para acompanhar aqui.</div></div>') + '</div>' +
      '</div>' +
      '<div class="lay-grid">' +
      '<div class="card"><div class="card-title" style="margin-bottom:8px">Entradas e saídas — últimos 6 meses</div><canvas id="trendChart" style="width:100%;height:170px;display:block"></canvas><div class="chart-legend" style="margin-top:8px"><span class="legend-dot green"></span> Entradas <span class="legend-dot red" style="margin-left:12px"></span> Saídas</div></div>' +
      '<div class="card"><div class="card-title" style="margin-bottom:8px">Resumo de ' + F().nomeMes(k.mes) + '</div>' +
      '<div class="dre-row"><span class="dre-lbl">Vendas e serviços</span><span class="dre-val fin-pos">' + moeda(d.bruta) + '</span></div>' +
      '<div class="dre-row"><span class="dre-lbl">Impostos e custos diretos</span><span class="dre-val fin-neg">−' + moeda(r2(d.deducoes + d.custos)) + '</span></div>' +
      '<div class="dre-row"><span class="dre-lbl">Pessoal</span><span class="dre-val fin-neg">−' + moeda(d.pessoal) + '</span></div>' +
      '<div class="dre-row"><span class="dre-lbl">Despesas do dia a dia</span><span class="dre-val fin-neg">−' + moeda(d.operacionais) + '</span></div>' +
      '<div class="dre-row sep bold"><span class="dre-lbl">Lucro do mês</span><span class="dre-val" style="color:' + (d.resultado >= 0 ? 'var(--success)' : 'var(--danger)') + '">' + moeda(d.resultado) + '</span></div>' +
      '<button class="btn-ghost-full" onclick="switchView(\'dre\')">Ver detalhado →</button></div>' +
      '</div>';
    if (window.drawTrendChart) requestAnimationFrame(function () { window.drawTrendChart(); });
    var dot = el('notifDot'); if (dot && !st().notifSeen) dot.style.display = alertas.some(function (a) { return a.cls === 'red' || a.cls === 'gold'; }) ? 'block' : 'none';
  };
  function r2(v) { return Math.round(v * 100) / 100; }

  // ═════════════ "+ NOVO" ═════════════
  function novo() {
    var vis = visiveis(), op = [
      ['⬇️', 'Vou receber', "fin.novo('RECEITA',{status:'pendente'})"], ['⬆️', 'Vou pagar', "fin.novo('DESPESA',{status:'pendente'})"],
      ['✅', 'Já recebi', "fin.novo('RECEITA',{status:'pago'})"], ['💳', 'Já paguei', "fin.novo('DESPESA',{status:'pago'})"],
      ['📷', 'Ler boleto ou nota', 'fin.abrirLeitura()'], ['👥', 'Cliente ou fornecedor', "switchView('contatos');setTimeout(function(){fin.editarContato()},80)"]
    ];
    var se = function (tela, acao) { return liberado(tela) ? acao : "switchView('" + tela + "')"; };
    if (vis.indexOf('budget') > -1) op.push(['📝', 'Orçamento', se('budget', "switchView('budget');setTimeout(function(){orc.editar()},80)")]);
    if (vis.indexOf('os') > -1) op.push(['🛠️', 'Ordem de serviço', se('os', "switchView('os');setTimeout(function(){os.editar()},80)")]);
    if (vis.indexOf('plans') > -1) op.push(['🔁', 'Mensalidade', se('plans', "switchView('plans');setTimeout(function(){ctr.editar()},80)")]);
    op.push(['🔄', 'Importar extrato', "switchView('reconciliation')"]);
    op.push(['📥', 'Importar planilha', "imp.abrir('RECEITA')"]);
    F().modal('layNovo', 'O que você quer registrar?', '<div class="lay-novo">' + op.map(function (o) { return '<button onclick="fin.fechar(\'layNovo\');' + o[2] + '"><span>' + o[0] + '</span>' + o[1] + '</button>'; }).join('') + '</div>', '<button class="btn-ghost" onclick="fin.fechar(\'layNovo\')">Fechar</button>');
  }

  // ═════════════ BARRA DO CELULAR ═════════════
  function barraCelular() {
    if (el('layBottom')) return;
    var b = document.createElement('nav'); b.id = 'layBottom'; b.className = 'lay-bottom'; b.setAttribute('aria-label', 'Atalhos');
    b.innerHTML = '<button data-v="dashboard"><span>🏠</span>Início</button><button data-v="receber"><span>⬇️</span>Receber</button><button class="mais" data-a="novo"><span>＋</span>Novo</button><button data-v="pagar"><span>⬆️</span>Pagar</button><button data-a="menu"><span>☰</span>Menu</button>';
    b.addEventListener('click', function (e) {
      var x = e.target.closest('button'); if (!x) return;
      if (x.dataset.v) window.switchView(x.dataset.v);
      else if (x.dataset.a === 'novo') novo();
      else { var sb = el('sidebar'), ov = el('sidebarOverlay'); if (sb) { sb.classList.add('open'); if (ov) ov.style.display = 'block'; } }
    });
    document.body.appendChild(b);
  }
  function marcarBarra(id) { var b = el('layBottom'); if (!b) return; b.querySelectorAll('button[data-v]').forEach(function (x) { x.classList.toggle('on', x.dataset.v === id); }); }

  window.layout = {
    escolher: function (btn) { document.querySelectorAll('#layBoasVindas .lay-op').forEach(function (b) { b.classList.remove('on'); }); btn.classList.add('on'); },
    salvarBoasVindas: function (pular) {
      var s = st().settings;
      if (!pular) {
        var p = document.querySelector('#layBoasVindas .lay-op.on');
        if (!p) return window.showToast('Escolha o tipo do seu negócio.', 'error');
        s.perfil = p.dataset.p; delete s.menuTelas;
        var cnpj = el('bvCnpj').value.replace(/\D/g, ''), nome = el('bvNome').value.trim();
        if (cnpj) s.cnpj = cnpj; if (nome) s.company = nome;
        if (nome) { var en = el('empSeletorNome'); if (en) en.textContent = nome; if (window.maxcfoEmpresas) window.maxcfoEmpresas.renomear(window.maxcfoEmpresas.ativa || '', nome); }
        if (s._regimeSugerido && !s.regime) s.regime = s._regimeSugerido;
      }
      delete s._regimeSugerido; s.boasVindas = true;
      salvar(); F().fechar('layBoasVindas'); montarMenu(); if (window.applySettings) window.applySettings(); window.renderInicio();
    },
    ocultarPassos: function () { st().settings.passosOcultos = true; salvar(); window.renderInicio(); },
    personalizar: function () {
      var vis = visiveis(), vm = window.viewMeta || {};
      F().modal('layMenu', 'Personalizar menu',
        '<p class="fin-sub" style="margin-bottom:12px">Marque o que você usa. O que ficar desmarcado continua dentro do módulo, em "+ outras".</p>' +
        '<div class="form-label" style="margin-bottom:6px">Começar do modelo</div><div class="fin-tabs" style="margin-bottom:14px">' + Object.keys(PERFIS).map(function (k) { return '<button class="fin-tab" onclick="layout.aplicarPerfil(\'' + k + '\')">' + PERFIS[k].nome + '</button>'; }).join('') + '</div>' +
        '<div style="columns:2 220px;column-gap:20px">' + SECOES.slice(1).map(function (sec) { return '<div style="margin-bottom:10px;break-inside:avoid"><div class="form-label">' + sec[1] + ' ' + sec[0] + '</div>' + sec[2].filter(function (i) { return vm[i[0]]; }).map(function (i) { var fixo = FIXOS.indexOf(i[0]) > -1; return '<label class="fin-check" style="padding:4px 0"><input type="checkbox" data-t="' + i[0] + '"' + (vis.indexOf(i[0]) > -1 ? ' checked' : '') + (fixo ? ' disabled' : '') + '> ' + i[1] + ' ' + i[2] + (fixo ? ' <span class="fin-sub">(sempre)</span>' : '') + '</label>'; }).join('') + '</div>'; }).join('') + '</div>',
        '<button class="btn-ghost" onclick="fin.fechar(\'layMenu\')">Cancelar</button><button class="btn-primary" onclick="layout.salvarMenu()">Salvar</button>', true);
    },
    aplicarPerfil: function (k) { var t = PERFIS[k].telas; document.querySelectorAll('#layMenu input[data-t]').forEach(function (c) { if (!c.disabled) c.checked = t.indexOf(c.dataset.t) > -1; }); st().settings.perfil = k; },
    salvarMenu: function () {
      st().settings.menuTelas = [].map.call(document.querySelectorAll('#layMenu input[data-t]:checked:not(:disabled)'), function (c) { return c.dataset.t; });
      salvar(); F().fechar('layMenu'); montarMenu(); window.showToast('Menu atualizado.');
    },
    novo: novo,
    montarMenu: montarMenu,
    liberado: liberado, nivel: nivelAtual, oferta: oferta,
    secoes: SECOES
  };

  // Botão de tema claro/escuro na barra do topo
  function botaoTema() {
    if (el('temaBtn')) return;
    var dir = document.querySelector('.topbar-right'); if (!dir) return;
    var b = document.createElement('button'); b.id = 'temaBtn'; b.className = 'topbar-icon-btn tema-btn'; b.setAttribute('aria-label', 'Tema claro ou escuro');
    b.addEventListener('click', function () { if (window.alternarTema) window.alternarTema(); var sel = el('cfTema'); if (sel) { try { sel.value = localStorage.getItem('maxcfo_tema') || 'escuro'; } catch (e) { } } });
    var notif = el('notifBtn'); dir.insertBefore(b, notif || dir.firstChild);
    var fr = el('tributarioFrame');
    if (fr) fr.addEventListener('load', function () { try { fr.contentDocument.documentElement.dataset.theme = document.documentElement.dataset.tema === 'claro' ? 'light' : 'dark'; } catch (e) { } });
  }

  window.initLayoutModule = function () {
    estilos();
    botaoTema(); if (window.applySettings) window.applySettings();
    montarMenu();
    barraCelular();
    window.quickAdd = novo;
    var ler = F().abrirLeitura;
    if (ler && !ler.__plano) { F().abrirLeitura = function () { if (nivelAtual() < 2) return oferta(2, 'Leitura automática de boleto e nota'); return ler.apply(this, arguments); }; F().abrirLeitura.__plano = true; }
    // marca o atalho do celular e o menu na troca de tela
    var trocar = window.switchView;
    if (trocar && !trocar.__lay) {
      window.switchView = function (id) {
        if (!liberado(id)) { if (window.innerWidth <= 900) { var sb0 = el('sidebar'), ov0 = el('sidebarOverlay'); if (sb0) sb0.classList.remove('open'); if (ov0) ov0.style.display = 'none'; } return oferta(NIVEL_TELA[id], rotulo(id) || 'Este recurso'); }
        trocar(id); marcarBarra(id); subnav(id);
        var m = moduloDe(id); if (m && m[2].length > 1 && aberto !== m[0]) { aberto = m[0]; montarMenu(); }
        else { var nav = document.querySelector('.sidebar-nav'); if (nav) nav.querySelectorAll('.lay-mod').forEach(function (x) { x.classList.toggle('tem-ativa', !!x.querySelector('.nav-item.active')); }); }
        if (window.innerWidth <= 900) { var sb = el('sidebar'), ov = el('sidebarOverlay'); if (sb) sb.classList.remove('open'); if (ov) ov.style.display = 'none'; }
      };
      window.switchView.__lay = true;
    }
    marcarBarra('dashboard');
    var s = st().settings || {};
    if (!s.boasVindas && !(st().transactions || []).length) setTimeout(boasVindas, 400);
    else if (!s.boasVindas) { s.boasVindas = true; salvar(); }
  };
})();
