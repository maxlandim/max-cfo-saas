/**
 * MAX CFO AI — Notas fiscais
 * Registro das notas emitidas (NFS-e padrão nacional, NF-e ou da prefeitura), com consulta de CNPJ do
 * tomador, conta a receber automática e faturamento de 12 meses (RBT12).
 * A emissão direta pelo MAX CFO ainda não existe: a nota é emitida no Emissor Nacional e registrada aqui.
 */

window.initNFeModule = function () {
  if (!window.state) window.state = {};
  window.state.nfes = Array.isArray(window.state.nfes) ? window.state.nfes : [];
  // Notas de exemplo de versões antigas (protocolo inventado) são removidas
  window.state.nfes = window.state.nfes.filter(function (n) { return !(n.cnpj === '12.345.678/0001-90' || n.cnpj === '00.000.000/0001-00'); });
  window.state.nfes.forEach(function (n) { if (!/^[\w-]{1,64}$/.test(String(n.id || ''))) n.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6); });
};

(function () {
  var EMISSOR = 'https://www.nfse.gov.br/EmissorNacional';
  function F() { return window.fin; }
  function esc(s) { return F() ? F().esc(s) : String(s == null ? '' : s); }
  function moeda(v) { return F() ? F().moeda(v) : 'R$ ' + Number(v || 0).toFixed(2); }
  function el(id) { return document.getElementById(id); }
  function hoje() { return F() ? F().hoje() : new Date().toISOString().slice(0, 10); }
  function mascaraDoc(d) {
    d = String(d || '').replace(/\D/g, '');
    if (d.length === 14) return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
    if (d.length === 11) return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
    return d;
  }

  window.renderNFe = function () {
    var v = el('view-nfe'); if (!v) return;
    var notas = (window.state.nfes || []).slice().sort(function (a, b) { return (b.dataEmissao || b.data || '') > (a.dataEmissao || a.data || '') ? 1 : -1; });
    var validas = notas.filter(function (n) { return n.status !== 'Cancelada'; });
    var mes = hoje().slice(0, 7);
    var doMes = validas.filter(function (n) { return (n.dataEmissao || n.data || '').slice(0, 7) === mes; });
    var limite12 = F() ? F().addMeses(hoje(), -12) : '';
    var rbt12 = validas.filter(function (n) { return (n.dataEmissao || n.data || '').slice(0, 10) > limite12; }).reduce(function (a, n) { return a + (n.valor || 0); }, 0);
    var depois = hoje() >= '2026-11-01';
    var linhas = notas.map(function (n) {
      var cancel = n.status === 'Cancelada';
      var rec = n.txId && F() ? F().tx(n.txId) : null;
      return '<tr' + (cancel ? ' style="opacity:.55"' : '') + '><td><strong>' + esc(n.numero || '—') + '</strong><div class="fin-sub">' + esc(n.modelo || 'NFS-e') + '</div></td>' +
        '<td><div style="font-weight:600">' + esc(n.tomador) + '</div><div class="fin-sub">' + esc(mascaraDoc(n.cnpj)) + '</div></td>' +
        '<td>' + esc(n.servico) + '</td><td style="font-weight:700;white-space:nowrap">' + moeda(n.valor) + (n.issRetido ? '<div class="fin-sub">ISS retido ' + moeda(n.issRetido) + '</div>' : '') + '</td>' +
        '<td style="white-space:nowrap">' + (F() ? F().dataBR((n.dataEmissao || n.data || '').slice(0, 10)) : '') + '</td>' +
        '<td>' + (cancel ? '<span class="fin-sit atraso">Cancelada</span>' : rec ? '<span class="fin-sit ' + F().rotuloSituacao(rec).cls + '">' + F().rotuloSituacao(rec).txt + '</span>' : '<span class="fin-sit ok">Registrada</span>') + '</td>' +
        '<td><div class="fin-acoes">' + (n.anexo ? '<a class="fin-btn" href="' + esc(n.anexo) + '" target="_blank" rel="noopener">📎 PDF</a>' : '') +
        (rec && rec.status !== 'pago' ? '<button class="fin-btn gold" onclick="fin.cobrar(\'' + esc(rec.id) + '\')">💠 Cobrar</button>' : '') +
        (!cancel ? '<button class="fin-btn" onclick="cancelarNFe(\'' + esc(n.id) + '\')">Cancelar</button>' : '') + '</div></td></tr>';
    }).join('');
    v.innerHTML = '' +
      '<div class="page-header"><div class="page-header-text"><h1>Notas Fiscais</h1><p class="page-subtitle">Registro das notas emitidas, com conta a receber e faturamento de 12 meses</p></div>' +
      '<div class="page-header-actions"><a class="btn-secondary" href="' + EMISSOR + '" target="_blank" rel="noopener">Abrir Emissor Nacional ↗</a><button class="btn-primary" onclick="openNFeModal()">+ Registrar nota emitida</button></div></div>' +
      '<div class="fin-alerta gold" style="margin-top:14px">🧾 <b>NFS-e no padrão nacional:</b> ' + (depois ? 'desde' : 'a partir de') + ' <b>01/11/2026</b>, MEs e EPPs do Simples Nacional emitem nota de serviço pelo padrão nacional (Resolução CGSN nº 191/2026), no Emissor Nacional ou por integração. Emita lá e registre aqui para o MAX CFO criar a conta a receber e somar o faturamento. A emissão direto pelo MAX CFO está em desenvolvimento.</div>' +
      '<div class="fin-kpis"><div class="fin-kpi2"><div class="v">' + doMes.length + '</div><div class="l">Notas no mês</div></div>' +
      '<div class="fin-kpi2"><div class="v fin-pos">' + moeda(doMes.reduce(function (a, n) { return a + (n.valor || 0); }, 0)) + '</div><div class="l">Faturado no mês</div></div>' +
      '<div class="fin-kpi2"><div class="v" style="color:var(--gold)">' + moeda(rbt12) + '</div><div class="l">Faturamento 12 meses (RBT12)</div><div class="s">base do Simples Nacional · limite R$ 4,8 milhões</div></div></div>' +
      '<div class="card">' + (notas.length ? '<div class="table-scroll"><table class="data-table"><thead><tr><th>Número</th><th>Tomador</th><th>Serviço</th><th>Valor</th><th>Emissão</th><th>Situação</th><th>Ações</th></tr></thead><tbody>' + linhas + '</tbody></table></div>'
        : '<div class="empty-block" style="padding:28px">Nenhuma nota registrada. Depois de emitir no Emissor Nacional, clique em <b>Registrar nota emitida</b>.</div>') + '</div>';
  };

  window.openNFeModal = function () {
    var id = 'finNotaModal', m = el(id);
    if (!m) { m = document.createElement('div'); m.className = 'modal-overlay'; m.id = id; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); document.body.appendChild(m); }
    var venc = F() ? F().addDias(hoje(), 30) : hoje();
    m.innerHTML = '<div class="modal-box" style="max-width:720px"><div class="modal-head"><div><h2 class="modal-title">🧾 Registrar nota emitida</h2><p class="modal-subtitle">Copie os dados da nota que você emitiu</p></div><button class="modal-x" aria-label="Fechar" onclick="closeModal(\'finNotaModal\')">✕</button></div>' +
      '<div style="padding:0 24px"><div class="form-grid">' +
      '<div class="form-field"><label class="form-label" for="nfModelo">Tipo</label><select class="form-input" id="nfModelo"><option>NFS-e</option><option>NF-e</option><option>NFC-e</option></select></div>' +
      '<div class="form-field"><label class="form-label" for="nfNumero">Número da nota</label><input class="form-input" id="nfNumero" maxlength="20"></div>' +
      '<div class="form-field"><label class="form-label" for="nfDoc">CPF/CNPJ do tomador</label><input class="form-input" id="nfDoc" maxlength="18" placeholder="Digite e saia do campo para buscar"></div>' +
      '<div class="form-field"><label class="form-label" for="nfTomador">Nome do tomador *</label><input class="form-input" id="nfTomador" maxlength="80"></div>' +
      '<div class="form-field span-2"><label class="form-label" for="nfServico">Descrição do serviço ou produto *</label><input class="form-input" id="nfServico" maxlength="120"></div>' +
      '<div class="form-field"><label class="form-label" for="nfValor">Valor total (R$) *</label><input type="number" step="0.01" min="0.01" class="form-input" id="nfValor"></div>' +
      '<div class="form-field"><label class="form-label" for="nfIss">ISS retido pelo tomador (R$)</label><input type="number" step="0.01" min="0" class="form-input" id="nfIss" placeholder="0,00"></div>' +
      '<div class="form-field"><label class="form-label" for="nfData">Data de emissão</label><input type="date" class="form-input" id="nfData" value="' + hoje() + '"></div>' +
      '<div class="form-field"><label class="form-label" for="nfChave">Chave de acesso / código de verificação</label><input class="form-input" id="nfChave" maxlength="60"></div>' +
      '<div class="form-field span-2"><label class="form-label" for="nfPdf">PDF da nota (opcional)</label><input type="file" class="form-input" id="nfPdf" accept=".pdf,.xml,image/*"></div>' +
      '<div class="form-field span-2"><label class="fin-check"><input type="checkbox" id="nfReceber" checked> Criar conta a receber com vencimento em <input type="date" class="form-input" id="nfVenc" value="' + venc + '" style="width:auto;display:inline-block;margin-left:6px;padding:4px 8px"></label></div>' +
      '</div></div><div class="modal-foot"><button class="btn-ghost" onclick="closeModal(\'finNotaModal\')">Cancelar</button><button class="btn-primary" id="nfSalvar" onclick="gerarNFe()">Registrar</button></div></div>';
    if (window.openModalEl) window.openModalEl(id);
    el('nfDoc').addEventListener('blur', buscarTomador);
  };

  async function buscarTomador() {
    var d = el('nfDoc').value.replace(/\D/g, '');
    if (d.length !== 14 || el('nfTomador').value) return;
    try {
      var r = await fetch('https://brasilapi.com.br/api/cnpj/v1/' + d);
      if (!r.ok) return;
      var j = await r.json();
      el('nfTomador').value = (j.razao_social || j.nome_fantasia || '').slice(0, 80);
      if (window.showToast) window.showToast('Tomador encontrado na Receita: ' + el('nfTomador').value, 'success');
    } catch (e) { /* sem internet ou CNPJ não encontrado */ }
  }

  window.gerarNFe = async function () {
    var tomador = el('nfTomador').value.trim(), servico = el('nfServico').value.trim(), valor = Math.round(parseFloat(el('nfValor').value) * 100) / 100;
    if (!tomador || !servico || !(valor > 0)) { if (window.showToast) window.showToast('Preencha tomador, descrição e valor.', 'error'); return; }
    var btn = el('nfSalvar'); btn.disabled = true; btn.textContent = 'Salvando…';
    var anexo = '';
    var arq = el('nfPdf').files[0];
    if (arq && window.uploadFileToFirebase && window.workspaceId) { try { anexo = (await window.uploadFileToFirebase(window.workspaceId, arq)) || ''; } catch (e) { } }
    var nota = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), modelo: el('nfModelo').value, numero: el('nfNumero').value.trim(),
      tomador: tomador, cnpj: el('nfDoc').value.replace(/\D/g, ''), servico: servico, valor: valor,
      issRetido: Math.max(0, Math.round((parseFloat(el('nfIss').value) || 0) * 100) / 100), dataEmissao: el('nfData').value || hoje(),
      chave: el('nfChave').value.trim(), anexo: anexo, status: 'Emitida'
    };
    if (el('nfReceber').checked && window.state.transactions) {
      var liquido = Math.round((valor - nota.issRetido) * 100) / 100;
      var tx = {
        id: 'nf' + nota.id, type: 'RECEITA', desc: (nota.modelo + ' ' + (nota.numero || '')).trim() + ' — ' + servico.slice(0, 80), amount: liquido,
        category: nota.modelo === 'NFS-e' ? 'Serviços Prestados' : 'Vendas de Produto', date: nota.dataEmissao, vencimento: el('nfVenc').value || nota.dataEmissao,
        status: 'pendente', pagoEm: '', contato: tomador, contaId: ((window.state.contas || [])[0] || {}).id, notes: nota.issRetido ? 'ISS retido: ' + moeda(nota.issRetido) : '', attachmentUrl: anexo, nfId: nota.id, atualizadoEm: Date.now()
      };
      window.state.transactions.push(tx);
      nota.txId = tx.id;
      if (window.logAudit) window.logAudit('create', 'transaction', tx.id, 'Conta a receber criada pela nota ' + (nota.numero || ''), null, tx);
    }
    window.state.nfes.push(nota);
    if (window.persist) window.persist();
    if (window.closeModal) window.closeModal('finNotaModal');
    if (window.showToast) window.showToast('Nota registrada' + (nota.txId ? ' e conta a receber criada' : '') + '.', 'success');
    window.renderNFe();
    if (F()) F().atualizarTudo();
  };

  window.cancelarNFe = function (id) {
    var n = (window.state.nfes || []).find(function (x) { return x.id === id; });
    if (!n) return;
    if (!confirm('Marcar a nota ' + (n.numero || '') + ' como cancelada? Cancele também no emissor onde ela foi emitida.')) return;
    n.status = 'Cancelada';
    var tx = n.txId && F() ? F().tx(n.txId) : null;
    if (tx && tx.status !== 'pago' && confirm('Excluir a conta a receber ligada a essa nota?')) {
      window.state.transactions = window.state.transactions.filter(function (t) { return t.id !== tx.id; });
    }
    if (window.persist) window.persist();
    window.renderNFe();
    if (F()) F().atualizarTudo();
  };
})();
