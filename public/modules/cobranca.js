/**
 * Landim Advisory — Cobrança dos clientes pelo Asaas, com baixa automática
 * A empresa conecta a própria conta do Asaas (Configurações). Na tela "💠 Cobrar" de uma conta a receber,
 * o sistema gera a cobrança (o cliente escolhe Pix, boleto ou cartão) e, quando o cliente paga,
 * o aviso do Asaas chega ao servidor e o painel dá a baixa sozinho.
 */
(function () {
  'use strict';
  function F() { return window.fin; }
  function el(id) { return document.getElementById(id); }
  function esc(s) { return F() ? F().esc(s) : String(s == null ? '' : s); }
  function st() { return window.state || {}; }
  function toast(m, t) { if (window.showToast) window.showToast(m, t || 'success'); }
  function salvar() { if (window.saveStateToFirebase) window.saveStateToFirebase(window.workspaceId, st()); }
  function moeda(v) { return F() && F().moeda ? F().moeda(v) : 'R$ ' + Number(v || 0).toFixed(2).replace('.', ','); }
  function dataBR(d) { return F() && F().dataBR ? F().dataBR(d) : d; }
  function livre() { return !window.maxcfoLeitura && !window.maxcfoDemo && window.workspaceId; }
  async function api(metodo, caminho, corpo) {
    var token = window.getAuthToken ? await window.getAuthToken() : '';
    var r = await fetch(caminho, { method: metodo, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: corpo ? JSON.stringify(corpo) : undefined });
    var d = await r.json().catch(function () { return {}; });
    if (!r.ok) throw new Error(d.error || 'Não consegui falar com o servidor.');
    return d;
  }

  var status = { ws: '', conectado: null, conta: {} };
  async function carregarStatus(forcar) {
    if (!livre()) return status;
    if (!forcar && status.ws === window.workspaceId && status.conectado !== null) return status;
    try { var d = await api('GET', '/api/cobrancas?wsId=' + encodeURIComponent(window.workspaceId)); status = { ws: window.workspaceId, conectado: !!d.conectado, conta: d.conta || {}, sandbox: !!d.sandbox }; }
    catch (e) { status = { ws: window.workspaceId, conectado: false, conta: {}, erro: e.message }; }
    return status;
  }

  var SIT = { PENDING: 'aguardando pagamento', OVERDUE: 'vencida', RECEIVED: 'paga', CONFIRMED: 'paga', RECEIVED_IN_CASH: 'paga', paga: 'paga', vencida: 'vencida', aberta: 'aguardando pagamento', cancelada: 'cancelada', estornada: 'estornada' };
  function mensagem(t) {
    var s = st().settings || {}, quem = ((s.pix || {}).nome || s.company || '').trim();
    return 'Olá' + (t.contato ? ', ' + t.contato.split(' ')[0] : '') + '! Tudo bem?\n\nSegue a cobrança de *' + t.desc + '*, no valor de *' + moeda(t.amount) + '*, com vencimento em ' + dataBR(t.cobranca.vencimento || t.vencimento) + '.\n\n' +
      'Você pode pagar com *Pix, boleto ou cartão* por este link:\n' + t.cobranca.url + '\n\nQualquer dúvida, é só responder esta mensagem.' + (quem ? '\n\n' + quem : '');
  }

  // Seção dentro da janela "💠 Cobrar"
  async function secao(id) {
    var t = F().tx(id); if (!t || !livre()) return;
    var pix = el('finPixCfg'); if (!pix) return;
    var box = el('cobAsaas');
    if (!box) { box = document.createElement('div'); box.id = 'cobAsaas'; box.className = 'fin-alerta gold'; box.style.cssText = 'margin-bottom:14px;display:block'; pix.parentNode.insertBefore(box, pix); }
    box.innerHTML = '<span class="fin-sub">Verificando a cobrança pelo Asaas…</span>';
    var s = await carregarStatus(!status.conectado); // confere de novo se ainda não estava conectada (pode ter conectado em outra aba)
    if (!el('cobAsaas')) return;
    if (t.cobranca && t.cobranca.url) {
      box.innerHTML = '<b>🔗 Cobrança pelo Asaas: ' + esc(SIT[t.cobranca.status] || t.cobranca.status || '') + '</b>' +
        '<div class="fin-sub" style="margin:4px 0 8px">O cliente paga com Pix, boleto ou cartão pelo link. Quando ele pagar, a conta é baixada sozinha.</div>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap"><input class="form-input" id="cobLink" readonly value="' + esc(t.cobranca.url) + '" style="flex:1;min-width:200px">' +
        '<button class="fin-btn gold" onclick="fin.copiar(\'cobLink\')">Copiar link</button><a class="fin-btn" href="' + esc(t.cobranca.url) + '" target="_blank" rel="noopener">Abrir</a>' +
        (t.cobranca.status !== 'paga' ? '<button class="fin-btn" onclick="cobranca.cancelar(\'' + esc(t.id) + '\')">Cancelar cobrança</button>' : '') + '</div>';
      return;
    }
    if (!s.conectado) {
      box.innerHTML = '<b>⚡ Boleto e Pix com baixa automática</b><div class="fin-sub" style="margin:4px 0 8px">Conecte a conta do Asaas da empresa: o cliente recebe um link para pagar com Pix, boleto ou cartão e a conta é baixada sozinha quando ele paga.</div>' +
        '<button class="fin-btn gold" onclick="cobranca.conectarModal()">Conectar minha conta do Asaas</button>';
      return;
    }
    var c = (st().contatos || {})[t.contato || ''] || {};
    box.innerHTML = '<b>⚡ Gerar cobrança pelo Asaas</b>' + (s.sandbox ? ' <span class="fin-sub">(ambiente de teste)</span>' : '') +
      '<div class="fin-sub" style="margin:4px 0 8px">O cliente escolhe Pix, boleto ou cartão. Quando ele pagar, a conta é baixada sozinha.</div>' +
      '<div class="form-grid">' +
      '<div class="form-field"><label class="form-label" for="cobNome">Nome do cliente</label><input class="form-input" id="cobNome" value="' + esc(t.contato || c.nome || '') + '"></div>' +
      '<div class="form-field"><label class="form-label" for="cobDoc">CPF ou CNPJ do cliente</label><input class="form-input" id="cobDoc" inputmode="numeric" value="' + esc(c.documento || c.cpfCnpj || '') + '"></div>' +
      '<div class="form-field"><label class="form-label" for="cobEmail">E-mail (o Asaas envia a cobrança)</label><input class="form-input" id="cobEmail" type="email" value="' + esc(c.email || '') + '"></div>' +
      '<div class="form-field"><label class="form-label" for="cobTel">Celular</label><input class="form-input" id="cobTel" value="' + esc(c.telefone || '') + '"></div>' +
      '</div><button class="btn-primary" id="cobGerarBtn" style="margin-top:10px" onclick="cobranca.gerar(\'' + esc(t.id) + '\')">Gerar cobrança de ' + moeda(t.amount) + '</button>';
  }

  window.cobranca = {
    secao: secao,
    carregarStatus: carregarStatus,
    conectarModal: function () {
      F().modal('cobConectar', '⚡ Conectar a conta do Asaas',
        '<p style="color:var(--text-muted)">Com a conta do Asaas da empresa conectada, você gera boleto e Pix para os seus clientes aqui no sistema e a baixa é automática quando eles pagam. O dinheiro cai direto na conta do Asaas da empresa.</p>' +
        '<ol style="color:var(--text-muted);padding-left:20px;line-height:1.7;margin:10px 0"><li>Crie a conta grátis em <a href="https://www.asaas.com" target="_blank" rel="noopener" style="color:var(--gold)">asaas.com</a> (CPF ou CNPJ) e envie os documentos.</li><li>No Asaas, abra <b>Integrações → Chaves de API</b> e gere uma chave.</li><li>Cole a chave abaixo. Ela fica guardada criptografada no servidor e não aparece mais na tela.</li></ol>' +
        '<div class="form-field"><label class="form-label" for="cobChave">Chave de API do Asaas</label><input class="form-input" id="cobChave" autocomplete="off" placeholder="$aact_prod_..."></div>',
        '<button class="btn-ghost" onclick="fin.fechar(\'cobConectar\')">Cancelar</button><button class="btn-primary" id="cobConectarBtn" onclick="cobranca.conectar()">Conectar</button>');
    },
    conectar: async function () {
      var k = (el('cobChave') || {}).value || '', b = el('cobConectarBtn');
      if (!/aact_(prod|hmlg)_/.test(k)) return toast('Cole a chave de API do Asaas (começa com $aact_prod_).', 'error');
      if (b) { b.disabled = true; b.textContent = 'Conectando…'; }
      try {
        var d = await api('POST', '/api/cobrancas', { acao: 'conectar', wsId: window.workspaceId, chave: k.trim() });
        status = { ws: window.workspaceId, conectado: true, conta: d.conta || {}, sandbox: !!d.sandbox };
        F().fechar('cobConectar'); toast('Conta do Asaas conectada' + (d.conta && d.conta.nome ? ': ' + d.conta.nome : '') + '.');
        if (el('cobAsaas') && window.__cobTx) secao(window.__cobTx);
        cartaoConfig();
      } catch (e) { toast(e.message, 'error'); }
      if (b) { b.disabled = false; b.textContent = 'Conectar'; }
    },
    desconectar: async function () {
      if (!confirm('Desconectar a conta do Asaas desta empresa? As cobranças já geradas continuam no Asaas, mas a baixa automática para.')) return;
      try { await api('POST', '/api/cobrancas', { acao: 'desconectar', wsId: window.workspaceId }); status = { ws: window.workspaceId, conectado: false, conta: {} }; toast('Conta do Asaas desconectada.', 'warn'); cartaoConfig(); }
      catch (e) { toast(e.message, 'error'); }
    },
    gerar: async function (id) {
      var t = F().tx(id); if (!t) return;
      var b = el('cobGerarBtn'), cli = { nome: el('cobNome').value.trim(), documento: el('cobDoc').value, email: el('cobEmail').value.trim(), telefone: el('cobTel').value };
      if (!cli.nome) return toast('Informe o nome do cliente.', 'error');
      if (String(cli.documento).replace(/\D/g, '').length < 11) return toast('Informe o CPF ou CNPJ do cliente.', 'error');
      if (b) { b.disabled = true; b.textContent = 'Gerando…'; }
      try {
        var d = await api('POST', '/api/cobrancas', { acao: 'gerar', wsId: window.workspaceId, txId: t.id, descricao: t.desc + (t.parcela ? ' (parcela ' + t.parcela + ')' : ''), valor: t.amount, vencimento: t.vencimento, cliente: cli });
        t.cobranca = { id: d.cobranca.id, url: d.cobranca.url, status: 'aberta', vencimento: d.cobranca.vencimento, criadaEm: d.cobranca.criadaEm };
        t.atualizadoEm = Date.now();
        var nome = t.contato || cli.nome;
        st().contatos = st().contatos || {};
        st().contatos[nome] = Object.assign({}, st().contatos[nome], { nome: nome, documento: cli.documento, email: cli.email || (st().contatos[nome] || {}).email, telefone: cli.telefone || (st().contatos[nome] || {}).telefone });
        if (!t.contato) t.contato = nome;
        salvar(); toast('Cobrança gerada. Envie o link para o cliente.');
        secao(t.id);
        var w = el('finWhats'); if (w && !w.value && cli.telefone) w.value = cli.telefone;
      } catch (e) { toast(e.message, 'error'); if (b) { b.disabled = false; b.textContent = 'Gerar cobrança de ' + moeda(t.amount); } }
    },
    cancelar: async function (id) {
      var t = F().tx(id); if (!t || !t.cobranca) return;
      if (!confirm('Cancelar esta cobrança no Asaas? O link para de funcionar.')) return;
      try { await api('POST', '/api/cobrancas', { acao: 'cancelar', wsId: window.workspaceId, cobrancaId: t.cobranca.id }); t.cobranca = null; t.atualizadoEm = Date.now(); salvar(); toast('Cobrança cancelada.', 'warn'); secao(id); }
      catch (e) { toast(e.message, 'error'); }
    },
    mensagem: mensagem,
    sincronizar: sincronizar,
  };

  // Aplica no painel os pagamentos avisados pelo Asaas
  var sincronizando = false;
  async function sincronizar() {
    if (sincronizando || !livre() || !F()) return;
    var s = await carregarStatus(); if (!s.conectado) return;
    sincronizando = true;
    try {
      var d = await api('GET', '/api/cobrancas/eventos?wsId=' + encodeURIComponent(window.workspaceId));
      var feitos = [], mudou = false, pagos = [];
      var FORMA = { PIX: 'Pix', BOLETO: 'Boleto', CREDIT_CARD: 'Cartão de crédito', DEBIT_CARD: 'Cartão de débito' };
      (d.eventos || []).forEach(function (ev) {
        var t = F().tx(ev.txId);
        feitos.push(ev.id);
        if (!t) return;
        t.cobranca = t.cobranca || { id: ev.id, url: ev.url };
        if (['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'].indexOf(ev.status) > -1) {
          if (t.status !== 'pago') {
            var antes = Object.assign({}, t);
            t.status = 'pago'; t.pagoEm = String(ev.pagoEm || '').slice(0, 10) || F().hoje(); t.forma = FORMA[ev.forma] || t.forma || 'Pix';
            t.notes = ((t.notes || '') + ' Recebido pelo Asaas.').trim().slice(0, 500);
            if (window.logAudit) window.logAudit('update', 'transaction', t.id, 'Baixa automática pelo Asaas de "' + t.desc + '"', antes, t);
            pagos.push(t);
          }
          t.cobranca.status = 'paga';
        } else if (ev.status === 'OVERDUE') t.cobranca.status = 'vencida';
        else if (ev.evento === 'PAYMENT_DELETED') t.cobranca.status = 'cancelada';
        else if (ev.evento === 'PAYMENT_REFUNDED') { t.cobranca.status = 'estornada'; toast('O pagamento de "' + t.desc + '" foi estornado no Asaas. Confira a conta.', 'warn'); }
        else if (ev.status === 'PENDING') t.cobranca.status = 'aberta';
        if (ev.url) t.cobranca.url = ev.url;
        t.atualizadoEm = Date.now(); mudou = true;
      });
      if (mudou) { salvar(); if (F().atualizarTudo) F().atualizarTudo(); }
      if (pagos.length) toast(pagos.length === 1 ? 'Pagamento recebido pelo Asaas: ' + pagos[0].desc + ' (' + moeda(pagos[0].amount) + ').' : pagos.length + ' pagamentos recebidos pelo Asaas e baixados.');
      if (feitos.length) await api('POST', '/api/cobrancas/eventos', { wsId: window.workspaceId, ids: feitos });
    } catch (e) { console.warn('Sincronizar cobranças:', e.message); }
    sincronizando = false;
  }

  // Configurações › Cobrança pelo Asaas
  function cartaoConfig() {
    var v = el('view-settings'); if (!v || !livre()) return;
    var g = v.querySelector('.grid-2col') || v.querySelector('.settings-grid') || v;
    var c = el('cobCartao');
    if (!c || !v.contains(c)) { c = document.createElement('div'); c.id = 'cobCartao'; c.className = 'card settings-card'; g.appendChild(c); }
    var s = status.ws === window.workspaceId ? status : { conectado: null };
    c.innerHTML = '<h3 class="settings-section-title">⚡ Cobrança pelo Asaas (boleto e Pix)</h3>' +
      (s.conectado === null ? '<p class="fin-sub">Verificando…</p>'
        : s.conectado ? '<p class="fin-sub">Conectada' + (s.conta && s.conta.nome ? ' à conta <b>' + esc(s.conta.nome) + '</b>' : '') + (s.sandbox ? ' (ambiente de teste)' : '') + '. Em Contas a receber, use <b>💠 Cobrar</b> para gerar o link; a baixa é automática.</p><button class="btn-secondary" onclick="cobranca.desconectar()">Desconectar</button>'
          : '<p class="fin-sub">Gere boleto e Pix para os seus clientes com baixa automática quando eles pagarem. O dinheiro cai na conta do Asaas da sua empresa.</p><button class="btn-primary" onclick="cobranca.conectarModal()">Conectar minha conta do Asaas</button>');
    if (s.conectado === null) carregarStatus(true).then(cartaoConfig);
  }

  window.initCobrancaModule = function () {
    if (!F() || F().__cobranca) return;
    F().__cobranca = true;
    var orig = F().cobrar;
    F().cobrar = function (id) { var r = orig.apply(this, arguments); window.__cobTx = id; try { secao(id); } catch (e) { console.warn(e); } return r; };
    var vm = window.viewMeta && window.viewMeta.settings;
    if (vm && !vm.__cobranca) { var r0 = vm.render; vm.render = function () { var r = r0 && r0.apply(this, arguments); try { cartaoConfig(); } catch (e) { console.warn(e); } return r; }; vm.__cobranca = true; }
    // busca pagamentos ao abrir, a cada 2 minutos e quando a pessoa volta para a aba
    setTimeout(sincronizar, 4000);
    setInterval(sincronizar, 120000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) sincronizar(); });
  };
})();
