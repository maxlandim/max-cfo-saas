/**
 * Landim Advisory — Permissões da equipe numa empresa compartilhada
 * Papéis (definidos pelo dono em "Equipe e acessos"):
 *   leitura  — só consulta (modo leitura, em acessos.js)
 *   analista — lança e edita; não exclui, não mexe em configurações nem na equipe; contas a pagar ficam aguardando aprovação
 *   gestor   — lança, edita, exclui e aprova pagamentos; não mexe na equipe nem nas configurações da empresa
 * A gravação é liberada pelas regras do Firestore (firestore.rules) só para analista e gestor com e-mail confirmado.
 */
(function () {
  'use strict';
  function el(id) { return document.getElementById(id); }
  function toast(m, t) { if (window.showToast) window.showToast(m, t || 'success'); }
  function esc(s) { return window.fin && window.fin.esc ? window.fin.esc(s) : String(s == null ? '' : s); }
  var NOME = { leitura: 'Consulta', analista: 'Analista', gestor: 'Gestor' };
  window.maxcfoPapeis = NOME;

  // Ações que cada papel não pode fazer: [objeto global, função]
  var BLOQUEIOS = {
    analista: [['fin', 'excluir'], ['fin', 'removerContato'], ['fin', 'removerConta'], ['os', 'excluir'], ['orc', 'excluir'], ['est', 'excluir'], ['ctr', 'excluir'], ['crm', 'excluir'], ['com', 'excluir'],
      ['cfg', 'removerCentro'], ['cfg', 'removerCat'], ['window', 'deleteTx'], ['window', 'saveSettings'], ['window', 'removeTeamMember'], ['window', 'submitTeamMember'],
      ['acessos', 'convidar'], ['acessos', 'revogar'], ['empresas', 'remover'], ['cobranca', 'conectarModal'], ['cobranca', 'desconectar'], ['fin', 'estornar']],
    gestor: [['window', 'saveSettings'], ['window', 'removeTeamMember'], ['window', 'submitTeamMember'], ['acessos', 'convidar'], ['acessos', 'revogar'], ['empresas', 'remover'], ['cobranca', 'conectarModal'], ['cobranca', 'desconectar']],
  };

  function bloquear(papel) {
    (BLOQUEIOS[papel] || []).forEach(function (b) {
      var obj = b[0] === 'window' ? window : window[b[0]];
      if (!obj || typeof obj[b[1]] !== 'function' || obj[b[1]].__bloqueado) return;
      var f = function () { toast('Seu acesso de ' + NOME[papel] + ' não permite esta ação. Fale com o dono da empresa.', 'info'); };
      f.__bloqueado = true; obj[b[1]] = f;
    });
  }

  function estilo(papel) {
    if (el('equipeEstilo')) return;
    var css = document.createElement('style'); css.id = 'equipeEstilo';
    var esconder = papel === 'analista'
      ? '[onclick*="excluir"],[onclick*="removerC"],[onclick*="deleteTx"],[onclick*="estornar"],[onclick*="removeTeamMember"],[onclick*="openTeamModal"],#acessoBtn,#acessosCartao,#cobCartao,#lembretesCartao,#view-settings .btn-primary,[onclick*="empresas.remover"],[onclick*="empresas.nova"]'
      : '[onclick*="removeTeamMember"],[onclick*="openTeamModal"],#acessoBtn,#acessosCartao,#cobCartao,#lembretesCartao,#view-settings .btn-primary,[onclick*="empresas.remover"],[onclick*="empresas.nova"]';
    css.textContent = '.equipe-faixa{position:sticky;top:0;z-index:50;display:flex;gap:10px;align-items:center;flex-wrap:wrap;background:rgba(59,130,246,.12);border-bottom:1px solid rgba(59,130,246,.4);color:var(--text);padding:9px 18px;font-size:13px}' +
      esconder + '{display:none!important}';
    document.head.appendChild(css);
  }

  function faixa(e) {
    var main = document.querySelector('.main-wrap');
    if (!main || el('equipeFaixa')) return;
    var f = document.createElement('div'); f.className = 'equipe-faixa'; f.id = 'equipeFaixa';
    var oque = e.papel === 'analista' ? 'Você lança e edita; contas a pagar novas ficam aguardando aprovação.' : 'Você lança, edita, exclui e aprova pagamentos.';
    f.innerHTML = '<span>👥 Você está na <b>' + esc(e.empresa || 'empresa') + '</b>' + (e.donoNome ? ', de ' + esc(e.donoNome) : '') + ', como <b>' + NOME[e.papel] + '</b>. ' + oque + '</span>' +
      (window.maxcfoAcessos && window.maxcfoAcessos.temAcessoProprio ? '<button class="fin-btn gold" style="margin-left:auto" onclick="acessos.voltar()">Voltar para as minhas empresas</button>' : '');
    main.insertBefore(f, main.firstChild);
  }

  // Para o dono e o gestor: alerta no Início com os pagamentos aguardando aprovação
  function alertaAprovacoes() {
    if (window.maxcfoPapel === 'analista' || window.maxcfoLeitura) return;
    var v = el('view-dashboard'); if (!v || !window.state) return;
    var pend = (window.state.transactions || []).filter(function (t) { return t.aprovacao === 'pendente' && t.status !== 'pago'; });
    var a = el('equipeAprovar');
    if (!pend.length) { if (a) a.remove(); return; }
    if (!a) { a = document.createElement('div'); a.id = 'equipeAprovar'; a.className = 'fin-alerta gold'; a.style.margin = '0 0 14px'; var h = v.querySelector('.lay-hero'); if (h && h.nextSibling) v.insertBefore(a, h.nextSibling); else v.insertBefore(a, v.firstChild); }
    var total = pend.reduce(function (s, t) { return s + Number(t.amount || 0); }, 0);
    a.innerHTML = '⏳ <b>' + pend.length + (pend.length === 1 ? ' conta a pagar aguarda' : ' contas a pagar aguardam') + ' a sua aprovação</b> (' + (window.fin && window.fin.moeda ? window.fin.moeda(total) : total) + '). <a href="#" class="link-go" onclick="switchView(\'pagar\');return false">Ver e aprovar</a>';
  }

  window.initEquipeModule = function () {
    var e = window.maxcfoEquipe;
    if (e && (e.papel === 'analista' || e.papel === 'gestor')) {
      window.maxcfoPapel = e.papel;
      document.body.classList.add('papel-' + e.papel);
      estilo(e.papel); faixa(e); bloquear(e.papel);
      // módulos que se registram depois também ficam bloqueados
      setTimeout(function () { bloquear(e.papel); }, 3000);
    }
    var orig = window.renderInicio;
    if (typeof orig === 'function' && !orig.__equipe) {
      var novo = function () { var r = orig.apply(this, arguments); try { alertaAprovacoes(); } catch (err) { console.warn(err); } return r; };
      novo.__equipe = true; window.renderInicio = novo;
    }
  };
})();
