/**
 * Landim Advisory — Acesso do cliente ou do contador (somente leitura) e lembretes de vencimento por e-mail
 * O dono dá acesso por e-mail (tela "Equipe e acessos"); a pessoa entra com o próprio login e senha
 * e vê os números da empresa sem conseguir alterar nada. A segurança fica nas regras do Firestore;
 * aqui ficam a tela de convites, a seção "Compartilhadas com você" e o modo leitura do painel.
 */
(function () {
  'use strict';
  function A() { return window.maxcfoAcessos; }
  function F() { return window.fin; }
  function el(id) { return document.getElementById(id); }
  function esc(s) { return F() ? F().esc(s) : String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function toast(m, t) { if (window.showToast) window.showToast(m, t || 'success'); }
  function st() { return window.state || {}; }
  function lista() { var s = st(); if (!Array.isArray(s.acessosLeitura)) s.acessosLeitura = []; return s.acessosLeitura; }
  function site() { return (window.location && window.location.origin) || ''; }
  function nomeEmpresa() {
    var e = window.maxcfoEmpresas, s = st().settings || {};
    if (e && e.ativa) { var x = (e.lista || []).find(function (i) { return i.id === e.ativa; }); if (x) return x.nome; }
    return (e && e.principal) || s.company || 'Minha empresa';
  }
  function textoConvite(email) {
    return 'Olá! Liberei para você o acesso de consulta aos números da ' + nomeEmpresa() + ' na Landim Advisory.\n\n' +
      '1. Abra ' + site() + '/login\n2. Entre (ou crie sua conta) com o e-mail ' + email + '\n' +
      '3. Confirme o e-mail, se o sistema pedir\n4. Clique no nome da empresa, no alto do menu, e abra a ' + nomeEmpresa() + ' em "Compartilhadas com você".\n\n' +
      'O que você pode fazer depende do papel que eu escolhi (consulta, analista ou gestor); aparece no alto do painel.';
  }

  // ── Tela "Equipe e acessos": cartão de convites ──
  function cartao() {
    var v = el('view-team'); if (!v) return;
    var c = el('acessosCartao');
    if (!c) {
      c = document.createElement('div'); c.id = 'acessosCartao'; c.className = 'card'; c.style.marginBottom = '20px';
      var cab = v.querySelector('.page-header');
      if (cab && cab.nextSibling) v.insertBefore(c, cab.nextSibling); else v.appendChild(c);
    }
    if (window.maxcfoLeitura) { c.innerHTML = '<div class="card-title">🔐 Acesso do cliente ou do contador</div><p class="fin-sub">Disponível só para o dono da empresa.</p>'; return; }
    var l = lista();
    c.innerHTML = '<div class="card-title">🔐 Acessos da equipe, do cliente e do contador</div>' +
      '<p class="fin-sub" style="margin:6px 0 14px;line-height:1.6">A pessoa entra com o próprio e-mail e senha e trabalha na <b>' + esc(nomeEmpresa()) + '</b> conforme o papel: <b>Consulta</b> só vê os números; <b>Analista</b> lança e edita, mas não exclui e as contas a pagar ficam aguardando aprovação; <b>Gestor</b> lança, edita, exclui e aprova pagamentos. Configurações e acessos continuam só com você.</p>' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end"><div class="form-field" style="flex:1;min-width:220px;margin:0"><label class="form-label" for="acessoEmail">E-mail da pessoa</label><input class="form-input" id="acessoEmail" type="email" placeholder="analista@escritorio.com.br" autocomplete="off"></div>' +
      '<div class="form-field" style="margin:0"><label class="form-label" for="acessoPapel">Papel</label><select class="form-input" id="acessoPapel"><option value="leitura">Consulta (só vê)</option><option value="analista">Analista (lança, com aprovação)</option><option value="gestor">Gestor (lança e aprova)</option></select></div>' +
      '<button class="btn-primary" id="acessoBtn" onclick="acessos.convidar()">Dar acesso</button></div>' +
      (l.length ? '<div class="table-scroll" style="margin-top:16px"><table class="data-table"><thead><tr><th>E-mail</th><th>Acesso</th><th>Desde</th><th></th></tr></thead><tbody>' +
        l.map(function (a, i) {
          return '<tr><td style="font-weight:600">' + esc(a.email) + '</td><td><span class="fin-sit ok">' + esc((window.maxcfoPapeis || {})[a.papel || 'leitura'] || 'Consulta') + '</span></td><td>' + esc((a.em || '').slice(0, 10).split('-').reverse().join('/')) + '</td>' +
            '<td style="white-space:nowrap"><button class="fin-btn" onclick="acessos.copiar(' + i + ')">📋 Copiar convite</button> <a class="fin-btn" style="text-decoration:none" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent(textoConvite(a.email)) + '">WhatsApp</a> <a class="fin-btn" style="text-decoration:none" href="mailto:' + encodeURIComponent(a.email) + '?subject=' + encodeURIComponent('Acesso aos números da ' + nomeEmpresa()) + '&body=' + encodeURIComponent(textoConvite(a.email)) + '">E-mail</a> <button class="fin-btn" style="color:var(--danger)" onclick="acessos.revogar(' + i + ')">Remover acesso</button></td></tr>';
        }).join('') + '</tbody></table></div>'
        : '<p class="fin-sub" style="margin-top:14px">Ninguém mais tem acesso a esta empresa ainda.</p>') +
      '<p class="fin-sub" style="margin-top:12px">Depois de dar o acesso, envie o convite pelo WhatsApp ou e-mail. A pessoa precisa confirmar o e-mail dela para abrir a empresa.</p>';
    var inp = el('acessoEmail'); if (inp) inp.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') window.acessos.convidar(); });
  }

  // ── Seção do seletor de empresas ──
  function secaoSeletor() {
    var a = A(); if (!a || !a.compartilhadas || !a.compartilhadas.length) return '';
    var lido = window.maxcfoLeitura;
    return '<div style="margin-top:16px;border-top:1px dashed var(--border);padding-top:14px"><div style="font-weight:800;margin-bottom:8px">👁 Compartilhadas com você</div>' +
      (a.emailVerificado ? '' : '<div class="fin-alerta gold" style="margin-bottom:10px">Para abrir, confirme o seu e-mail (' + esc(a.email) + '). <button class="fin-btn gold" onclick="acessos.enviarVerificacao()">Enviar e-mail de confirmação</button> <button class="fin-btn" onclick="acessos.jaVerifiquei()">Já confirmei</button></div>') +
      '<div style="display:flex;flex-direction:column;gap:8px">' + a.compartilhadas.map(function (c) {
        var aberta = (lido && lido.wsId === c.wsId) || (window.maxcfoEquipe && window.maxcfoEquipe.wsId === c.wsId);
        return '<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid ' + (aberta ? 'var(--gold-border)' : 'var(--border)') + ';border-radius:10px;background:' + (aberta ? 'var(--gold-dim)' : 'var(--bg-surf)') + '">' +
          '<div style="flex:1;min-width:0"><div style="font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(c.empresa || 'Empresa') + '</div><div class="fin-sub">de ' + esc(c.donoNome || c.donoEmail || '—') + ' · ' + esc((window.maxcfoPapeis || {})[c.papel || 'leitura'] || 'Consulta') + '</div></div>' +
          (aberta ? '<span class="fin-sit ok">Aberta</span>' : a.emailVerificado ? '<button class="fin-btn gold" onclick="acessos.abrir(\'' + esc(c.wsId) + '\')">Abrir</button>' : '') + '</div>';
      }).join('') + '</div></div>';
  }

  // ── Modo leitura: aviso fixo e botões de alteração escondidos ──
  function modoLeitura() {
    var l = window.maxcfoLeitura; if (!l) return;
    document.body.classList.add('modo-leitura');
    if (!el('acessosEstilo')) {
      var css = document.createElement('style'); css.id = 'acessosEstilo';
      css.textContent = '.acessos-faixa{position:sticky;top:0;z-index:50;display:flex;gap:10px;align-items:center;flex-wrap:wrap;background:var(--gold-dim);border-bottom:1px solid var(--gold-border);color:var(--text);padding:9px 18px;font-size:13px}' +
        '.modo-leitura .page-header-actions .btn-primary,.modo-leitura .page-header-actions .btn-danger-outline,.modo-leitura #addBtn,.modo-leitura .lay-tabbar .mais,.modo-leitura [onclick*="imp.abrir"],.modo-leitura #nav-bpo,.modo-leitura #acessoBtn{display:none!important}' +
        '.acessos-tela{position:fixed;inset:0;z-index:99990;background:var(--bg,#070B14);display:flex;align-items:center;justify-content:center;padding:24px}.acessos-tela .caixa{max-width:460px;text-align:center;line-height:1.6}';
      document.head.appendChild(css);
    }
    if (l.pendente) {
      // Só tem acesso de consulta e o e-mail ainda não foi confirmado
      var t = document.createElement('div'); t.className = 'acessos-tela'; t.id = 'acessosTela';
      t.innerHTML = '<div class="caixa"><img src="/logo.svg" alt="" width="54" height="54" style="border-radius:14px;margin-bottom:12px"><h1 style="font-size:22px;margin-bottom:8px">Confirme o seu e-mail</h1>' +
        '<p class="fin-sub" style="font-size:14px">' + esc(l.donoNome || 'Uma empresa') + ' compartilhou a <b>' + esc(l.empresa) + '</b> com você. Para abrir, confirme que o e-mail <b>' + esc((A() || {}).email || '') + '</b> é seu.</p>' +
        '<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:18px"><button class="btn-primary" onclick="acessos.enviarVerificacao()">Enviar e-mail de confirmação</button><button class="btn-secondary" onclick="acessos.jaVerifiquei()">Já confirmei</button></div>' +
        '<p class="fin-sub" style="margin-top:14px">Não chegou? Veja a caixa de spam. <a class="link-go" href="#" onclick="window.maxcfoSair&&window.maxcfoSair();return false">Sair</a></p></div>';
      document.body.appendChild(t);
      return;
    }
    var main = document.querySelector('.main-wrap');
    if (main && !el('acessosFaixa')) {
      var f = document.createElement('div'); f.className = 'acessos-faixa'; f.id = 'acessosFaixa';
      f.innerHTML = '<span>👁 <b>Somente leitura:</b> você está vendo a <b>' + esc(l.empresa || 'empresa') + '</b>' + (l.donoNome ? ', de ' + esc(l.donoNome) : '') + '. Nada do que for feito aqui é salvo.</span>' +
        (A() && A().temAcessoProprio ? '<button class="fin-btn gold" style="margin-left:auto" onclick="acessos.voltar()">Voltar para as minhas empresas</button>' : '');
      main.insertBefore(f, main.firstChild);
    }
  }


  // ── Configurações › Lembretes por e-mail (o envio é feito pelo servidor, uma vez por dia) ──
  function cfgLembretes() {
    var s = st(); s.settings = s.settings || {};
    var c = s.settings.lembretes = Object.assign({ resumoDono: true, avisarClientes: false, diasAntes: 3, noDia: true, email: '' }, s.settings.lembretes || {});
    return c;
  }
  function cartaoLembretes() {
    var v = el('view-settings'); if (!v || window.maxcfoLeitura) return;
    var g = v.querySelector('.grid-2col') || v.querySelector('.settings-grid') || v;
    var c = el('lembretesCartao');
    if (!c || !v.contains(c)) { c = document.createElement('div'); c.id = 'lembretesCartao'; c.className = 'card settings-card'; g.appendChild(c); }
    var l = cfgLembretes(), pix = (st().settings || {}).pix || {};
    var semEmail = Object.keys(st().contatos || {}).length && !Object.keys(st().contatos || {}).some(function (k) { return (st().contatos[k] || {}).email; });
    var meuEmail = ((window.maxcfoUser || {}).email || '');
    c.innerHTML = '<h3 class="settings-section-title">📧 Lembretes por e-mail</h3>' +
      '<label style="display:flex;gap:10px;align-items:flex-start;margin:6px 0 10px;cursor:pointer"><input type="checkbox" id="lemResumo"' + (l.resumoDono ? ' checked' : '') + ' style="margin-top:3px"><span><b>Resumo diário para mim</b><br><span class="fin-sub">Todo dia de manhã: o que vence hoje, o que está em atraso e o que vence na semana. Só chega quando há algo para ver.</span></span></label>' +
      '<div class="form-group"><label for="lemEmail">E-mail que recebe o resumo</label><input class="form-input" id="lemEmail" type="email" placeholder="' + esc(meuEmail || 'seu@email.com') + '" value="' + esc(l.email || '') + '"></div>' +
      '<label style="display:flex;gap:10px;align-items:flex-start;margin:10px 0;cursor:pointer"><input type="checkbox" id="lemClientes"' + (l.avisarClientes ? ' checked' : '') + ' style="margin-top:3px"><span><b>Avisar meus clientes antes do vencimento</b><br><span class="fin-sub">E-mail com o valor, a data e o Pix copia e cola. Vai para o e-mail do cadastro do cliente; a resposta volta para você.</span></span></label>' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center"><select class="form-input" id="lemDias" style="width:auto">' + [1, 2, 3, 5, 7].map(function (d) { return '<option value="' + d + '"' + (+l.diasAntes === d ? ' selected' : '') + '>' + d + (d === 1 ? ' dia antes' : ' dias antes') + '</option>'; }).join('') + '</select>' +
      '<label style="display:flex;gap:6px;align-items:center;cursor:pointer"><input type="checkbox" id="lemNoDia"' + (l.noDia ? ' checked' : '') + '> e no dia do vencimento</label></div>' +
      (!pix.chave ? '<div class="fin-alerta gold" style="margin-top:10px">Cadastre a sua chave Pix para o código ir junto no aviso: em Contas a receber, clique em Cobrar numa conta em aberto.</div>' : '') +
      (semEmail ? '<div class="fin-alerta gold" style="margin-top:10px">Nenhum cliente tem e-mail no cadastro ainda. Preencha em Clientes e fornecedores.</div>' : '') +
      '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:14px"><button class="btn-primary" onclick="acessos.salvarLembretes()">💾 Salvar</button><button class="btn-secondary" id="lemTesteBtn" onclick="acessos.testarLembretes()">Enviar teste para mim</button></div>';
  }

  window.acessos = {
    salvarLembretes: function () {
      var l = cfgLembretes(), email = (el('lemEmail') || {}).value || '';
      email = email.trim().toLowerCase();
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return toast('E-mail inválido.', 'error');
      l.resumoDono = !!(el('lemResumo') || {}).checked; l.avisarClientes = !!(el('lemClientes') || {}).checked;
      l.diasAntes = +((el('lemDias') || {}).value || 3); l.noDia = !!(el('lemNoDia') || {}).checked; l.email = email;
      if (window.persist) window.persist();
      toast('Lembretes salvos. O envio acontece todo dia de manhã.');
    },
    testarLembretes: async function () {
      window.acessos.salvarLembretes();
      var b = el('lemTesteBtn'); if (b) { b.disabled = true; b.textContent = 'Enviando…'; }
      try {
        await new Promise(function (ok) { setTimeout(ok, 2500); }); // espera a gravação na nuvem
        var tk = window.getAuthToken ? await window.getAuthToken() : '';
        var r = await fetch('/api/lembretes', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tk }, body: JSON.stringify({ wsId: window.workspaceId }) });
        var j = await r.json().catch(function () { return {}; });
        if (!r.ok) toast(j.error || 'Não consegui enviar o teste agora.', 'error');
        else toast('Teste enviado para ' + j.para + (j.avisosHoje ? ' (com um exemplo do aviso ao cliente).' : '.'));
      } catch (e) { toast('Sem conexão com o servidor agora.', 'error'); }
      if (b) { b.disabled = false; b.textContent = 'Enviar teste para mim'; }
    },
    secaoSeletor: secaoSeletor,
    convidar: async function () {
      var a = A(), inp = el('acessoEmail'); if (!a || !inp) return;
      var email = inp.value.trim().toLowerCase();
      if (lista().some(function (x) { return x.email === email; })) return toast('Este e-mail já tem acesso.', 'info');
      var b = el('acessoBtn'); if (b) { b.disabled = true; b.textContent = 'Salvando…'; }
      var papel = ((el('acessoPapel') || {}).value) || 'leitura';
      var r = await a.convidar(email, nomeEmpresa(), papel);
      if (b) { b.disabled = false; b.textContent = 'Dar acesso'; }
      if (r.erro) return toast(r.erro, 'error');
      lista().push({ email: email, papel: papel, em: new Date().toISOString() });
      if (window.addAuditEntry) window.addAuditEntry('deu acesso de ' + ((window.maxcfoPapeis || {})[papel] || papel) + ' para ' + email); else if (window.persist) window.persist();
      toast('Acesso liberado. Agora envie o convite para ' + email + '.');
      cartao();
    },
    revogar: async function (i) {
      var a = A(), x = lista()[i]; if (!a || !x) return;
      if (!confirm('Remover o acesso de ' + x.email + ' a esta empresa?')) return;
      var r = await a.revogar(x.email);
      if (r.erro) return toast(r.erro, 'error');
      lista().splice(i, 1);
      if (window.addAuditEntry) window.addAuditEntry('removeu o acesso de ' + x.email); else if (window.persist) window.persist();
      toast('Acesso removido.', 'warn');
      cartao();
    },
    copiar: function (i) {
      var x = lista()[i]; if (!x) return;
      var txt = textoConvite(x.email);
      if (navigator.clipboard) navigator.clipboard.writeText(txt).then(function () { toast('Convite copiado. Cole no WhatsApp ou no e-mail.'); }, function () { prompt('Copie o convite:', txt); });
      else prompt('Copie o convite:', txt);
    },
    abrir: function (wsId) { if (A()) { toast('Abrindo empresa…', 'info'); A().abrir(wsId); } },
    voltar: function () { if (A()) A().voltar(); },
    enviarVerificacao: async function () {
      if (!A()) return; var r = await A().enviarVerificacao();
      toast(r.erro || 'E-mail enviado para ' + A().email + '. Abra o link e depois clique em "Já confirmei".', r.erro ? 'error' : 'success');
    },
    jaVerifiquei: async function () { if (!A()) return; var r = await A().jaVerifiquei(); if (r.erro) toast(r.erro, 'error'); },
    _cartao: cartao
  };

  window.initAcessosModule = function () {
    modoLeitura();
    // A tela de equipe ganha o cartão de convites sempre que é desenhada
    var orig = window.renderTeam;
    if (typeof orig === 'function' && !orig.__acessos) {
      var novo = function () { var r = orig.apply(this, arguments); try { cartao(); } catch (e) { console.warn(e); } return r; };
      novo.__acessos = true; window.renderTeam = novo;
    }
    var vm = window.viewMeta && window.viewMeta.settings;
    if (vm && !vm.__lembretes) {
      var r0 = vm.render;
      vm.render = function () { var r = r0 && r0.apply(this, arguments); try { cartaoLembretes(); } catch (e) { console.warn(e); } return r; };
      vm.__lembretes = true;
    }
    var sub = document.querySelector('#view-team .page-subtitle');
    if (sub) sub.textContent = 'Responsáveis internos e acesso de consulta para o cliente ou o contador.';
  };
})();
