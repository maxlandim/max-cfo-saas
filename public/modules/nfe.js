/**
 * Landim Advisory — Notas fiscais
 * Emissor próprio de NFS-e no padrão nacional (Sefin Nacional): a empresa envia o certificado digital A1 uma vez
 * (fica cifrado no servidor e nunca volta ao navegador), configura os dados fiscais e emite a nota direto daqui,
 * com DANFSe para imprimir, XML oficial, cancelamento e conta a receber automática.
 * Notas emitidas em outro lugar (NF-e de produto, prefeitura) continuam podendo ser registradas à mão.
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
  var CONSULTA = 'https://www.nfse.gov.br/ConsultaPublica/?tpc=1&chave=';
  function F() { return window.fin; }
  function esc(s) { return F() ? F().esc(s) : String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function moeda(v) { return F() ? F().moeda(v) : 'R$ ' + Number(v || 0).toFixed(2); }
  function el(id) { return document.getElementById(id); }
  function hoje() { return F() ? F().hoje() : new Date().toISOString().slice(0, 10); }
  function dataBR(d) { return F() && d ? F().dataBR(String(d).slice(0, 10)) : (d || ''); }
  function toast(m, t) { if (window.showToast) window.showToast(m, t || 'success'); }
  function dig(v) { return String(v == null ? '' : v).replace(/\D/g, ''); }
  function salvar() { if (window.persist) window.persist(); }
  function mascaraDoc(d) {
    d = dig(d);
    if (d.length === 14) return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
    if (d.length === 11) return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
    return d;
  }
  function novoId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function livre() { return !window.maxcfoLeitura && !window.maxcfoDemo && window.workspaceId; }
  function valida(n) { return n.status !== 'Cancelada' && !n.teste; }
  window.nfeValida = valida;

  async function api(metodo, caminho, corpo) {
    var token = window.getAuthToken ? await window.getAuthToken() : '';
    var r = await fetch(caminho, { method: metodo, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: corpo ? JSON.stringify(corpo) : undefined });
    var d = await r.json().catch(function () { return {}; });
    if (!r.ok) { var e = new Error(d.error || 'Não consegui falar com o servidor.'); e.dados = d; e.status = r.status; throw e; }
    return d;
  }

  // ---------- situação do emissor ----------
  var emissor = { ws: '', carregado: false, dados: null, erro: '' };
  async function carregarEmissor(forcar) {
    if (!livre()) return emissor;
    if (!forcar && emissor.ws === window.workspaceId && emissor.carregado) return emissor;
    try {
      var d = await api('GET', '/api/nfse?wsId=' + encodeURIComponent(window.workspaceId));
      emissor = { ws: window.workspaceId, carregado: true, dados: d, erro: '' };
      sincronizarNotas();
    } catch (e) { emissor = { ws: window.workspaceId, carregado: true, dados: null, erro: e.message }; }
    return emissor;
  }
  function souDono() { return emissor.dados && emissor.dados.papel === 'dono'; }

  // Notas emitidas pelo emissor que ainda não estão no painel (ex.: emissão que ficou sem resposta e foi recuperada)
  var sincronizado = '';
  async function sincronizarNotas() {
    if (sincronizado === window.workspaceId) return;
    sincronizado = window.workspaceId;
    try {
      var d = await api('GET', '/api/nfse?wsId=' + encodeURIComponent(window.workspaceId) + '&lista=1');
      var mudou = false;
      (d.notas || []).forEach(function (s) {
        var n = (window.state.nfes || []).find(function (x) { return x.chave === s.chave; });
        if (!n) { window.state.nfes.push(daServidor(s)); mudou = true; }
        else if (s.status === 'cancelada' && n.status !== 'Cancelada') { n.status = 'Cancelada'; mudou = true; }
        else if (s.numero && !n.numero) { n.numero = s.numero; mudou = true; }
      });
      if (mudou) { salvar(); window.renderNFe(); }
    } catch (e) { sincronizado = ''; }
  }
  function daServidor(s) {
    return {
      id: novoId(), modelo: 'NFS-e', origem: 'emissor', numero: s.numero || '', chave: s.chave, ambiente: s.ambiente, teste: s.ambiente !== '1',
      tomador: (s.tomador && s.tomador.nome) || 'Consumidor', cnpj: (s.tomador && s.tomador.documento) || '', servico: String(s.descricao || '').split('\n')[0].slice(0, 120),
      valor: s.valor || 0, issRetido: s.issRetido || 0, dataEmissao: new Date(s.emitidaEm || Date.now()).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }),
      competencia: s.competencia, status: s.status === 'cancelada' ? 'Cancelada' : 'Emitida',
    };
  }

  // ---------- tela ----------
  window.renderNFe = function () {
    var v = el('view-nfe'); if (!v) return;
    if (livre() && !(emissor.ws === window.workspaceId && emissor.carregado)) carregarEmissor().then(function () { window.renderNFe(); });
    var notas = (window.state.nfes || []).slice().sort(function (a, b) { return (b.dataEmissao || b.data || '') > (a.dataEmissao || a.data || '') ? 1 : -1; });
    var validas = notas.filter(valida);
    var mes = hoje().slice(0, 7);
    var doMes = validas.filter(function (n) { return (n.dataEmissao || n.data || '').slice(0, 7) === mes; });
    var limite12 = F() ? F().addMeses(hoje(), -12) : '';
    var rbt12 = validas.filter(function (n) { return (n.dataEmissao || n.data || '').slice(0, 10) > limite12; }).reduce(function (a, n) { return a + (n.valor || 0); }, 0);
    var linhas = notas.map(function (n) {
      var cancel = n.status === 'Cancelada';
      var rec = n.txId && F() ? F().tx(n.txId) : null;
      var proprio = n.origem === 'emissor';
      var acoes = '';
      if (proprio) acoes += '<button class="fin-btn" onclick="nfse.danfse(\'' + esc(n.id) + '\')">🖨️ DANFSe</button><button class="fin-btn" onclick="nfse.xml(\'' + esc(n.id) + '\')">XML</button>';
      else if (n.anexo) acoes += '<a class="fin-btn" href="' + esc(n.anexo) + '" target="_blank" rel="noopener">📎 PDF</a>';
      if (rec && rec.status !== 'pago' && !cancel) acoes += '<button class="fin-btn gold" onclick="fin.cobrar(\'' + esc(rec.id) + '\')">💠 Cobrar</button>';
      if (!cancel && !window.maxcfoLeitura) acoes += '<button class="fin-btn" onclick="cancelarNFe(\'' + esc(n.id) + '\')">Cancelar</button>';
      var situacao = cancel ? '<span class="fin-sit atraso">Cancelada</span>'
        : n.teste ? '<span class="fin-sit">Teste</span>'
        : rec ? '<span class="fin-sit ' + F().rotuloSituacao(rec).cls + '">' + F().rotuloSituacao(rec).txt + '</span>'
        : '<span class="fin-sit ok">' + (proprio ? 'Autorizada' : 'Registrada') + '</span>';
      return '<tr' + (cancel ? ' style="opacity:.55"' : '') + '><td><strong>' + esc(n.numero || '—') + '</strong><div class="fin-sub">' + esc(n.modelo || 'NFS-e') + (proprio ? ' · emitida aqui' : '') + '</div></td>' +
        '<td><div style="font-weight:600">' + esc(n.tomador) + '</div><div class="fin-sub">' + esc(mascaraDoc(n.cnpj)) + '</div></td>' +
        '<td>' + esc(n.servico) + '</td><td style="font-weight:700;white-space:nowrap">' + moeda(n.valor) + (n.issRetido ? '<div class="fin-sub">ISS retido ' + moeda(n.issRetido) + '</div>' : '') + '</td>' +
        '<td style="white-space:nowrap">' + dataBR(n.dataEmissao || n.data) + '</td>' +
        '<td>' + situacao + '</td><td><div class="fin-acoes">' + acoes + '</div></td></tr>';
    }).join('');
    var d = emissor.ws === window.workspaceId ? emissor.dados : null;
    var botaoEmitir = window.maxcfoLeitura ? '' : '<button class="btn-primary" onclick="nfse.abrirEmissao()">+ Emitir NFS-e</button>';
    v.innerHTML = '' +
      '<div class="page-header"><div class="page-header-text"><h1>Notas Fiscais</h1><p class="page-subtitle">Emissão de NFS-e no padrão nacional, com conta a receber e faturamento de 12 meses</p></div>' +
      '<div class="page-header-actions">' + (window.maxcfoLeitura ? '' : '<button class="btn-secondary" onclick="nfse.configurar()">⚙️ Configurar emissão</button><button class="btn-secondary" onclick="openNFeModal()">Registrar nota de outro sistema</button>') + botaoEmitir + '</div></div>' +
      cartaoEmissor(d) +
      '<div class="fin-kpis"><div class="fin-kpi2"><div class="v">' + doMes.length + '</div><div class="l">Notas no mês</div></div>' +
      '<div class="fin-kpi2"><div class="v fin-pos">' + moeda(doMes.reduce(function (a, n) { return a + (n.valor || 0); }, 0)) + '</div><div class="l">Faturado no mês</div></div>' +
      '<div class="fin-kpi2"><div class="v" style="color:var(--gold)">' + moeda(rbt12) + '</div><div class="l">Faturamento 12 meses (RBT12)</div><div class="s">base do Simples Nacional · limite R$ 4,8 milhões</div></div></div>' +
      '<div class="card">' + (notas.length ? '<div class="table-scroll"><table class="data-table"><thead><tr><th>Número</th><th>Tomador</th><th>Serviço</th><th>Valor</th><th>Emissão</th><th>Situação</th><th>Ações</th></tr></thead><tbody>' + linhas + '</tbody></table></div>'
        : '<div class="empty-block" style="padding:28px">Nenhuma nota ainda. Configure a emissão uma vez e clique em <b>Emitir NFS-e</b>.</div>') + '</div>';
  };

  function cartaoEmissor(d) {
    if (window.maxcfoDemo) return '<div class="fin-alerta gold" style="margin-top:14px">🧾 <b>Emissor de NFS-e:</b> na sua conta, você envia o certificado digital A1 da empresa e emite a nota de serviço direto daqui, no padrão nacional.</div>';
    if (!livre()) return '';
    if (!d) return '<div class="fin-alerta" style="margin-top:14px">' + (emissor.erro ? '⚠️ ' + esc(emissor.erro) : '⏳ Conferindo o emissor de notas…') + '</div>';
    var amb = d.config && d.config.ambiente === '1' ? '<span class="fin-sit ok">Produção</span>' : '<span class="fin-sit">Testes (sem valor fiscal)</span>';
    if (!d.pronto) {
      return '<div class="fin-alerta gold" style="margin-top:14px">🧾 <b>Emita NFS-e direto daqui.</b> Desde 01/11/2026, MEs e EPPs do Simples emitem nota de serviço no padrão nacional. ' +
        'Falta configurar: <b>' + esc((d.falta || []).join(', ')) + '</b>. ' + (souDono() ? '<button class="fin-btn gold" onclick="nfse.configurar()">Configurar agora</button>' : 'Peça ao dono da empresa para configurar.') + '</div>';
    }
    var c = d.certificado || {};
    var aviso = c.diasParaVencer != null && c.diasParaVencer <= 30 ? ' · <b style="color:var(--danger)">certificado vence em ' + c.diasParaVencer + ' dia(s)</b>' : '';
    return '<div class="fin-alerta" style="margin-top:14px">🧾 <b>Emissor pronto</b> · ' + amb + ' · certificado de ' + esc(c.titular || '') + ' (' + esc(mascaraDoc(c.documento)) + '), válido até ' + dataBR(c.validade) + aviso + '</div>';
  }

  // ---------- configuração (dono) ----------
  var SERVICOS = [
    ['170101', '17.01 Assessoria ou consultoria de qualquer natureza'], ['170301', '17.03 Planejamento, organização técnica, financeira ou administrativa'],
    ['171201', '17.12 Administração em geral, inclusive de bens e negócios de terceiros'], ['171901', '17.19 Contabilidade, auditoria, técnicos em contabilidade'],
    ['171401', '17.14 Advocacia'], ['170601', '17.06 Propaganda e publicidade'], ['010101', '01.01 Análise e desenvolvimento de sistemas'],
    ['010501', '01.05 Licenciamento ou cessão de uso de programas de computação'], ['010701', '01.07 Suporte técnico em informática'],
    ['080201', '08.02 Instrução, treinamento, orientação pedagógica, cursos'], ['060101', '06.01 Barbearia, cabeleireiros, manicuros e congêneres'],
    ['060201', '06.02 Esteticistas, tratamento de pele, depilação'], ['040101', '04.01 Medicina e biomedicina'], ['041201', '04.12 Odontologia'],
    ['040801', '04.08 Terapia ocupacional, fisioterapia e fonoaudiologia'], ['140101', '14.01 Manutenção e conserto de máquinas, veículos e aparelhos'],
    ['100501', '10.05 Agenciamento, corretagem ou intermediação de bens'], ['230101', '23.01 Programação e comunicação visual, desenho industrial'],
  ];
  function opc(lista, sel) { return lista.map(function (o) { return '<option value="' + o[0] + '"' + (String(sel) === o[0] ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join(''); }
  function campo(id, rotulo, valor, extra, dica, largo) {
    return '<div class="form-field' + (largo ? ' span-2' : '') + '"><label class="form-label" for="' + id + '">' + rotulo + '</label><input class="form-input" id="' + id + '" value="' + esc(valor == null ? '' : valor) + '" ' + (extra || '') + '>' + (dica ? '<div class="fin-sub" style="margin-top:4px">' + dica + '</div>' : '') + '</div>';
  }

  window.nfse = window.nfse || {};
  nfse.configurar = async function () {
    if (window.maxcfoDemo) { toast('No modo demonstração a emissão fica desligada. Crie sua conta para emitir.', 'warn'); return; }
    if (!livre()) return;
    await carregarEmissor(true);
    if (!emissor.dados) { toast(emissor.erro || 'Não consegui abrir o emissor agora.', 'error'); return; }
    if (!souDono()) { toast('Só o dono da empresa configura a emissão e envia o certificado.', 'warn'); return; }
    var d = emissor.dados, c = d.certificado, cfg = d.config || {}, s = (window.state.settings || {});
    var cert = c
      ? '<div class="fin-alerta" style="margin:0 0 10px">🔐 <b>' + esc(c.titular) + '</b> · ' + esc(mascaraDoc(c.documento)) + ' · válido até <b>' + dataBR(c.validade) + '</b>' + (c.vencido ? ' <b style="color:var(--danger)">(vencido)</b>' : '') +
        '<div class="fin-sub" style="margin-top:4px">Guardado cifrado no servidor. Nem a Landim Advisory consegue baixar o arquivo.</div>' +
        '<div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap"><button class="fin-btn" onclick="nfse.trocarCertificado()">Trocar certificado</button><button class="fin-btn" onclick="nfse.removerCertificado()">Remover</button><button class="fin-btn" onclick="nfse.testar()">Testar conexão com a Sefin</button></div></div>'
      : '';
    var envio = '<div id="nfseEnvio"' + (c ? ' style="display:none"' : '') + '><div class="form-grid">' +
      '<div class="form-field span-2"><label class="form-label" for="nfseArq">Certificado digital A1 da empresa (.pfx ou .p12)</label><input type="file" class="form-input" id="nfseArq" accept=".pfx,.p12,application/x-pkcs12"></div>' +
      '<div class="form-field"><label class="form-label" for="nfseSenha">Senha do certificado</label><input type="password" class="form-input" id="nfseSenha" autocomplete="off"></div>' +
      '<div class="form-field" style="align-self:end"><button class="btn-primary" id="nfseEnviarBtn" onclick="nfse.enviarCertificado()">Enviar certificado</button></div></div>' +
      '<div class="fin-sub">O arquivo e a senha vão direto para o servidor por conexão segura e ficam cifrados (AES-256). Eles nunca voltam para o navegador. Use o e-CNPJ A1 da empresa; o A3 (cartão ou token) não funciona.</div></div>';
    var corpo = '<h3 style="margin:4px 0 8px;font-size:15px">1. Certificado digital</h3>' + cert + envio +
      '<h3 style="margin:18px 0 8px;font-size:15px">2. Dados fiscais da empresa</h3><div class="form-grid">' +
      campo('nfCfgDoc', 'CNPJ', mascaraDoc(cfg.documento || s.cnpj), 'maxlength="18"', 'Saia do campo para buscar o município na Receita') +
      campo('nfCfgRazao', 'Razão social', cfg.razao || s.company, 'maxlength="120"') +
      campo('nfCfgIm', 'Inscrição municipal', cfg.im, 'maxlength="15"', 'Se a prefeitura não exige, deixe em branco') +
      campo('nfCfgMun', 'Código IBGE do município', cfg.cMun, 'maxlength="7" inputmode="numeric"', '<span id="nfCfgMunNome">' + esc(cfg.municipio || '') + '</span> Brasília = 5300108') +
      '<div class="form-field"><label class="form-label" for="nfCfgOp">Simples Nacional</label><select class="form-input" id="nfCfgOp" onchange="nfse.ajustarSimples()">' + opc([['3', 'Optante ME/EPP'], ['2', 'MEI'], ['1', 'Não optante']], cfg.opSimpNac || '3') + '</select></div>' +
      '<div class="form-field" id="nfCfgRegBox"><label class="form-label" for="nfCfgReg">Apuração no Simples</label><select class="form-input" id="nfCfgReg">' + opc([['1', 'Tributos federais e ISS pelo Simples'], ['2', 'Federais pelo Simples, ISS fora (sublimite)'], ['3', 'Federais e ISS fora do Simples']], cfg.regApTribSN || '1') + '</select></div>' +
      campo('nfCfgTrib', 'Tributos aproximados do Simples (%)', cfg.pTotTribSN, 'inputmode="decimal" placeholder="ex.: 6,00"', 'Alíquota efetiva do seu DAS. O contador informa.') +
      '<div class="form-field"><label class="form-label" for="nfCfgEsp">Regime especial</label><select class="form-input" id="nfCfgEsp">' + opc([['0', 'Nenhum'], ['3', 'Microempresa municipal'], ['5', 'Profissional autônomo'], ['6', 'Sociedade de profissionais'], ['1', 'Ato cooperado'], ['2', 'Estimativa'], ['4', 'Notário ou registrador'], ['9', 'Outros']], cfg.regEspTrib || '0') + '</select></div>' +
      campo('nfCfgEmail', 'E-mail que vai na nota', cfg.email || s.email, 'maxlength="80" type="email"') +
      campo('nfCfgFone', 'Telefone', cfg.fone, 'maxlength="20" inputmode="tel"') + '</div>' +
      '<h3 style="margin:18px 0 8px;font-size:15px">3. Serviço que você mais emite</h3><div class="form-grid">' +
      campo('nfCfgServ', 'Código de tributação nacional', cfg.cTribNac, 'maxlength="8" list="nfCfgServLista" inputmode="numeric"', 'Item e subitem da lista da LC 116 + desdobramento (ex.: 17.01 → 170101). Confira com o contador.') +
      '<datalist id="nfCfgServLista">' + SERVICOS.map(function (x) { return '<option value="' + x[0] + '">' + esc(x[1]) + '</option>'; }).join('') + '</datalist>' +
      campo('nfCfgServMun', 'Código municipal (opcional)', cfg.cTribMun, 'maxlength="3" inputmode="numeric"', '3 dígitos, só se a prefeitura usa') +
      campo('nfCfgAliq', 'Alíquota do ISS (%)', cfg.aliquota, 'inputmode="decimal" placeholder="ex.: 2,00"', 'Deixe em branco se o ISS é pago no DAS e não é retido') +
      campo('nfCfgNbs', 'Código NBS (opcional)', cfg.cNBS, 'maxlength="9" inputmode="numeric"') +
      '<div class="form-field span-2"><label class="form-label" for="nfCfgDesc">Descrição padrão do serviço</label><textarea class="form-input" id="nfCfgDesc" rows="2" maxlength="2000">' + esc(cfg.descricaoPadrao || '') + '</textarea></div>' +
      campo('nfCfgVenc', 'Vencimento da conta a receber (dias)', cfg.vencimentoDias != null ? cfg.vencimentoDias : 30, 'type="number" min="0" max="365"') +
      campo('nfCfgSerie', 'Série da DPS', cfg.serie || 1, 'type="number" min="1" max="49999"', 'Deixe 1, a não ser que outro sistema já use essa série') + '</div>' +
      '<h3 style="margin:18px 0 8px;font-size:15px">4. Ambiente</h3>' +
      '<label class="fin-check"><input type="radio" name="nfCfgAmb" value="2"' + (cfg.ambiente !== '1' ? ' checked' : '') + '> <b>Testes</b> (produção restrita da Receita): a nota não tem valor fiscal. Comece por aqui.</label>' +
      '<label class="fin-check" style="margin-top:6px"><input type="radio" name="nfCfgAmb" value="1"' + (cfg.ambiente === '1' ? ' checked' : '') + '> <b>Produção</b>: notas reais, com valor fiscal.</label>';
    F().modal('nfseCfgModal', '⚙️ Configurar emissão de NFS-e', corpo,
      '<button class="btn-ghost" onclick="fin.fechar(\'nfseCfgModal\')">Fechar</button><button class="btn-primary" id="nfCfgSalvar" onclick="nfse.salvarConfig()">Salvar configuração</button>', true);
    nfse.ajustarSimples();
    el('nfCfgDoc').addEventListener('blur', buscarEmpresa);
    el('nfCfgMun').addEventListener('change', function () { var n = el('nfCfgMunNome'); if (n) n.textContent = ''; });
  };
  nfse.ajustarSimples = function () {
    var op = el('nfCfgOp') ? el('nfCfgOp').value : '3';
    if (el('nfCfgRegBox')) el('nfCfgRegBox').style.display = op === '3' ? '' : 'none';
    if (el('nfCfgTrib')) el('nfCfgTrib').closest('.form-field').style.display = op === '3' ? '' : 'none';
  };
  nfse.trocarCertificado = function () { var b = el('nfseEnvio'); if (b) { b.style.display = ''; el('nfseArq').focus(); } };

  async function buscarEmpresa() {
    var d = dig(el('nfCfgDoc').value);
    if (d.length !== 14) return;
    try {
      var r = await fetch('https://brasilapi.com.br/api/cnpj/v1/' + d);
      if (!r.ok) return;
      var j = await r.json();
      if (!el('nfCfgRazao').value && j.razao_social) el('nfCfgRazao').value = String(j.razao_social).slice(0, 120);
      if (!el('nfCfgMun').value && j.codigo_municipio_ibge) { el('nfCfgMun').value = String(j.codigo_municipio_ibge); el('nfCfgMunNome').textContent = (j.municipio || '') + (j.uf ? '/' + j.uf : '') + ' ·'; el('nfCfgMun').dataset.nome = (j.municipio || '') + (j.uf ? '/' + j.uf : ''); }
      if (!el('nfCfgEmail').value && j.email) el('nfCfgEmail').value = String(j.email).toLowerCase().slice(0, 80);
      if (!el('nfCfgFone').value && j.ddd_telefone_1) el('nfCfgFone').value = dig(j.ddd_telefone_1);
      if (j.opcao_pelo_mei) el('nfCfgOp').value = '2'; else if (j.opcao_pelo_simples === true) el('nfCfgOp').value = '3'; else if (j.opcao_pelo_simples === false) el('nfCfgOp').value = '1';
      nfse.ajustarSimples();
      toast('Dados da empresa encontrados na Receita.', 'success');
    } catch (e) { /* sem internet ou CNPJ não encontrado */ }
  }

  function lerArquivoBase64(arq) {
    return new Promise(function (ok, falha) {
      var fr = new FileReader();
      fr.onload = function () { ok(String(fr.result).split(',')[1] || ''); };
      fr.onerror = function () { falha(new Error('Não consegui ler o arquivo.')); };
      fr.readAsDataURL(arq);
    });
  }
  nfse.enviarCertificado = async function () {
    var arq = el('nfseArq').files[0];
    if (!arq) { toast('Escolha o arquivo .pfx do certificado.', 'error'); return; }
    if (arq.size > 60000) { toast('Esse arquivo é grande demais para um certificado A1.', 'error'); return; }
    var btn = el('nfseEnviarBtn'); btn.disabled = true; btn.textContent = 'Conferindo…';
    try {
      var b64 = await lerArquivoBase64(arq);
      var senha = el('nfseSenha').value;
      el('nfseSenha').value = '';
      var d = await api('POST', '/api/nfse', { acao: 'certificado', wsId: window.workspaceId, arquivo: b64, senha: senha });
      b64 = ''; senha = '';
      emissor.dados = Object.assign({}, emissor.dados, d);
      toast('Certificado de ' + (d.certificado.titular || '') + ' guardado com segurança.', 'success');
      nfse.configurar();
    } catch (e) { toast(e.message, 'error'); btn.disabled = false; btn.textContent = 'Enviar certificado'; }
  };
  nfse.removerCertificado = async function () {
    if (!confirm('Remover o certificado digital? Sem ele não dá para emitir nem cancelar notas por aqui.')) return;
    try { var d = await api('POST', '/api/nfse', { acao: 'removerCertificado', wsId: window.workspaceId }); emissor.dados = Object.assign({}, emissor.dados, d); toast('Certificado removido.', 'warn'); nfse.configurar(); }
    catch (e) { toast(e.message, 'error'); }
  };
  nfse.testar = async function () {
    toast('Testando a conexão com a Sefin Nacional…', 'info');
    try { var d = await api('POST', '/api/nfse', { acao: 'testar', wsId: window.workspaceId }); toast('Conexão aceita pela Sefin Nacional (' + (d.ambiente === '1' ? 'produção' : 'testes') + '). Certificado OK.', 'success'); }
    catch (e) { toast(e.message, 'error'); }
  };
  nfse.salvarConfig = async function () {
    var amb = (document.querySelector('input[name="nfCfgAmb"]:checked') || {}).value || '2';
    var antes = emissor.dados && emissor.dados.config ? emissor.dados.config.ambiente : '2';
    if (amb === '1' && antes !== '1' && !confirm('Mudar para PRODUÇÃO? A partir daqui as notas são reais e têm valor fiscal.')) return;
    var cfg = {
      documento: dig(el('nfCfgDoc').value), razao: el('nfCfgRazao').value, im: el('nfCfgIm').value, cMun: dig(el('nfCfgMun').value),
      municipio: el('nfCfgMun').dataset.nome || (emissor.dados && emissor.dados.config && emissor.dados.config.cMun === dig(el('nfCfgMun').value) ? emissor.dados.config.municipio : ''),
      opSimpNac: el('nfCfgOp').value, regApTribSN: el('nfCfgReg').value, pTotTribSN: el('nfCfgTrib').value, regEspTrib: el('nfCfgEsp').value,
      email: el('nfCfgEmail').value, fone: el('nfCfgFone').value, cTribNac: dig(el('nfCfgServ').value), cTribMun: dig(el('nfCfgServMun').value),
      aliquota: el('nfCfgAliq').value, cNBS: dig(el('nfCfgNbs').value), descricaoPadrao: el('nfCfgDesc').value, vencimentoDias: el('nfCfgVenc').value, serie: el('nfCfgSerie').value, ambiente: amb,
    };
    var btn = el('nfCfgSalvar'); btn.disabled = true;
    try {
      var d = await api('POST', '/api/nfse', { acao: 'config', wsId: window.workspaceId, config: cfg });
      emissor.dados = Object.assign({}, emissor.dados, d);
      F().fechar('nfseCfgModal');
      toast(d.pronto ? 'Emissor configurado. Já dá para emitir.' : 'Configuração salva. Falta: ' + d.falta.join(', ') + '.', d.pronto ? 'success' : 'warn');
      window.renderNFe();
    } catch (e) { toast(e.message, 'error'); btn.disabled = false; }
  };

  // ---------- emissão ----------
  nfse.abrirEmissao = async function (pre) {
    if (window.maxcfoDemo) { toast('No modo demonstração a emissão fica desligada. Crie sua conta para emitir.', 'warn'); return; }
    if (!livre()) return;
    await carregarEmissor(!(emissor.dados && emissor.dados.pronto));
    var d = emissor.dados;
    if (!d) { toast(emissor.erro || 'Não consegui abrir o emissor agora.', 'error'); return; }
    if (!d.pronto) { if (souDono()) { toast('Antes de emitir, complete: ' + d.falta.join(', ') + '.', 'warn'); nfse.configurar(); } else toast('O dono da empresa precisa configurar a emissão primeiro.', 'warn'); return; }
    pre = pre || {};
    var cfg = d.config, teste = cfg.ambiente !== '1';
    var venc = F() ? F().addDias(hoje(), cfg.vencimentoDias != null ? cfg.vencimentoDias : 30) : hoje();
    var corpo = (teste ? '<div class="fin-alerta gold" style="margin:0 0 10px">🧪 Ambiente de <b>testes</b>: a nota não tem valor fiscal. Quando estiver tudo certo, mude para produção em Configurar emissão.</div>' : '') +
      '<div class="form-grid">' +
      campo('nfeTDoc', 'CPF ou CNPJ do tomador', mascaraDoc(pre.documento), 'maxlength="18"', 'Saia do campo para buscar o CNPJ na Receita. Vazio = consumidor não identificado') +
      campo('nfeTNome', 'Nome do tomador', pre.nome, 'maxlength="120"') +
      campo('nfeTEmail', 'E-mail do tomador', pre.email, 'maxlength="80" type="email"') +
      campo('nfeTCep', 'CEP (opcional)', pre.cep, 'maxlength="9" inputmode="numeric"', 'Saia do campo para completar o endereço') +
      campo('nfeTLgr', 'Endereço', pre.logradouro, 'maxlength="255"') +
      campo('nfeTNro', 'Número', pre.numero, 'maxlength="60"') +
      campo('nfeTBairro', 'Bairro', pre.bairro, 'maxlength="60"') +
      campo('nfeTMun', 'Código IBGE do município do tomador', pre.cMun, 'maxlength="7" inputmode="numeric"') +
      '<div class="form-field span-2"><label class="form-label" for="nfeDesc">Descrição do serviço *</label><textarea class="form-input" id="nfeDesc" rows="3" maxlength="2000">' + esc(pre.descricao || cfg.descricaoPadrao || '') + '</textarea></div>' +
      campo('nfeVal', 'Valor do serviço (R$) *', pre.valor, 'type="number" step="0.01" min="0.01"') +
      campo('nfeComp', 'Competência (mês do serviço)', pre.competencia || hoje(), 'type="date" max="' + hoje() + '"') +
      campo('nfeServ', 'Código do serviço', cfg.cTribNac, 'maxlength="8" list="nfCfgServLista2" inputmode="numeric"') +
      '<datalist id="nfCfgServLista2">' + SERVICOS.map(function (x) { return '<option value="' + x[0] + '">' + esc(x[1]) + '</option>'; }).join('') + '</datalist>' +
      campo('nfeAliq', 'Alíquota do ISS (%)', cfg.aliquota, 'inputmode="decimal"', 'Obrigatória quando o ISS é retido') +
      '<div class="form-field span-2"><label class="fin-check"><input type="checkbox" id="nfeRet"> ISS retido pelo tomador</label></div>' +
      '<div class="form-field span-2"><label class="fin-check"><input type="checkbox" id="nfeRec"' + (teste ? '' : ' checked') + '> Criar conta a receber com vencimento em <input type="date" class="form-input" id="nfeVenc" value="' + venc + '" style="width:auto;display:inline-block;margin-left:6px;padding:4px 8px"></label></div>' +
      '</div><div id="nfeErros"></div>';
    F().modal('nfseEmitirModal', '🧾 Emitir NFS-e' + (teste ? ' (teste)' : ''), corpo,
      '<button class="btn-ghost" onclick="fin.fechar(\'nfseEmitirModal\')">Cancelar</button><button class="btn-primary" id="nfeEmitirBtn" onclick="nfse.emitir()">Emitir nota</button>', true);
    el('nfeTDoc').addEventListener('blur', buscarTomador);
    el('nfeTCep').addEventListener('blur', buscarCep);
  };

  async function buscarTomador() {
    var d = dig(el('nfeTDoc').value);
    if (d.length !== 14) return;
    try {
      var r = await fetch('https://brasilapi.com.br/api/cnpj/v1/' + d);
      if (!r.ok) return;
      var j = await r.json();
      if (!el('nfeTNome').value) el('nfeTNome').value = String(j.razao_social || j.nome_fantasia || '').slice(0, 120);
      if (!el('nfeTEmail').value && j.email) el('nfeTEmail').value = String(j.email).toLowerCase().slice(0, 80);
      if (!el('nfeTCep').value && j.cep) {
        el('nfeTCep').value = dig(j.cep);
        el('nfeTLgr').value = [j.descricao_tipo_de_logradouro, j.logradouro].filter(Boolean).join(' ').slice(0, 255);
        el('nfeTNro').value = String(j.numero || 'S/N').slice(0, 60);
        el('nfeTBairro').value = String(j.bairro || '').slice(0, 60);
        if (j.codigo_municipio_ibge) el('nfeTMun').value = String(j.codigo_municipio_ibge);
      }
      toast('Tomador encontrado na Receita: ' + el('nfeTNome').value, 'success');
    } catch (e) { /* sem internet ou CNPJ não encontrado */ }
  }
  async function buscarCep() {
    var c = dig(el('nfeTCep').value);
    if (c.length !== 8) return;
    try {
      var r = await fetch('https://viacep.com.br/ws/' + c + '/json/');
      if (!r.ok) return;
      var j = await r.json();
      if (j.erro) return;
      if (!el('nfeTLgr').value) el('nfeTLgr').value = String(j.logradouro || '').slice(0, 255);
      if (!el('nfeTBairro').value) el('nfeTBairro').value = String(j.bairro || '').slice(0, 60);
      if (j.ibge) el('nfeTMun').value = String(j.ibge);
    } catch (e) { /* sem internet */ }
  }

  function mostrarErros(lista) {
    var box = el('nfeErros'); if (!box) return;
    box.innerHTML = lista && lista.length ? '<div class="fin-alerta" style="margin-top:10px;border-color:var(--danger)"><b>Corrija antes de emitir:</b><ul style="margin:6px 0 0 18px">' + lista.map(function (m) { return '<li>' + esc(m) + '</li>'; }).join('') + '</ul></div>' : '';
  }

  nfse.emitir = async function () {
    var cfg = emissor.dados.config;
    var valor = Math.round(parseFloat(el('nfeVal').value) * 100) / 100;
    var nota = {
      competencia: el('nfeComp').value || hoje(), valor: valor, descricao: el('nfeDesc').value, retido: el('nfeRet').checked ? '2' : '1',
      aliquota: el('nfeAliq').value, cTribNac: dig(el('nfeServ').value),
      tomador: { documento: dig(el('nfeTDoc').value), nome: el('nfeTNome').value, email: el('nfeTEmail').value,
        end: { cep: dig(el('nfeTCep').value), logradouro: el('nfeTLgr').value, numero: el('nfeTNro').value, bairro: el('nfeTBairro').value, cMun: dig(el('nfeTMun').value) } },
    };
    var erros = [];
    if (!(valor > 0)) erros.push('Informe o valor do serviço.');
    if (!String(nota.descricao).trim()) erros.push('Descreva o serviço prestado.');
    if (nota.tomador.documento && !String(nota.tomador.nome).trim()) erros.push('Informe o nome do tomador.');
    if (nota.retido === '2' && !(parseFloat(String(nota.aliquota).replace(',', '.')) > 0)) erros.push('Com ISS retido, informe a alíquota do ISS.');
    if (erros.length) { mostrarErros(erros); return; }
    if (!nota.tomador.documento) nota.tomador = null;
    var criarConta = el('nfeRec').checked, venc = el('nfeVenc').value;
    var btn = el('nfeEmitirBtn'); btn.disabled = true; btn.textContent = 'Emitindo na Sefin Nacional…';
    mostrarErros([]);
    try {
      var r = await api('POST', '/api/nfse', { acao: 'emitir', wsId: window.workspaceId, nota: nota });
      var n = registrarEmitida(r, nota, criarConta, venc);
      F().fechar('nfseEmitirModal');
      sucesso(n, r);
    } catch (e) {
      btn.disabled = false; btn.textContent = 'Emitir nota';
      var dd = e.dados || {};
      if (dd.semResposta) { mostrarErros([e.message]); btn.textContent = 'Tentar de novo'; return; }
      mostrarErros(dd.erros && dd.erros.length ? dd.erros : [e.message]);
    }
  };

  function registrarEmitida(r, nota, criarConta, venc) {
    var dd = r.dados || {}, val = dd.valores || {};
    var existente = (window.state.nfes || []).find(function (x) { return x.chave === r.chave; });
    if (existente) return existente;
    var to = nota.tomador || {};
    var n = {
      id: novoId(), modelo: 'NFS-e', origem: 'emissor', numero: r.numero || '', chave: r.chave, idDps: r.idDps, ambiente: r.ambiente, teste: r.ambiente !== '1',
      tomador: (dd.tomador && dd.tomador.nome) || to.nome || 'Consumidor', cnpj: to.documento || '', servico: String(nota.descricao).split('\n')[0].slice(0, 120),
      valor: val.servico || nota.valor, issRetido: val.retido || 0, iss: val.iss || 0, aliquota: val.aliquota || 0, dataEmissao: hoje(), competencia: nota.competencia,
      status: 'Emitida', dados: resumoDanfse(dd, nota),
    };
    if (criarConta && window.state.transactions) {
      var liquido = Math.round(((val.liquido || n.valor) - 0) * 100) / 100;
      var tx = {
        id: 'nf' + n.id, type: 'RECEITA', desc: ('NFS-e ' + (n.numero || '')).trim() + ' — ' + n.servico.slice(0, 80), amount: liquido,
        category: 'Serviços Prestados', date: n.dataEmissao, vencimento: venc || n.dataEmissao, status: 'pendente', pagoEm: '', contato: n.tomador,
        contaId: ((window.state.contas || [])[0] || {}).id, notes: (n.issRetido ? 'ISS retido: ' + moeda(n.issRetido) + '. ' : '') + 'Chave da NFS-e: ' + n.chave, nfId: n.id, atualizadoEm: Date.now(),
      };
      window.state.transactions.push(tx);
      n.txId = tx.id;
      if (window.logAudit) window.logAudit('create', 'transaction', tx.id, 'Conta a receber criada pela NFS-e ' + (n.numero || ''), null, tx);
    }
    window.state.nfes.push(n);
    salvar();
    window.renderNFe();
    if (F()) F().atualizarTudo();
    return n;
  }
  // Só o necessário para o DANFSe (o XML completo fica no servidor)
  function resumoDanfse(dd, nota) {
    dd = dd || {};
    return {
      localEmissao: dd.localEmissao || '', localPrestacao: dd.localPrestacao || '', localIncidencia: dd.localIncidencia || '', tributacaoNacional: dd.tributacaoNacional || '', tributacaoMunicipal: dd.tributacaoMunicipal || '',
      processadaEm: dd.processadaEm || '', numeroDfse: dd.numeroDfse || '', emitente: dd.emitente || null, tomador: dd.tomador || null, dps: dd.dps || null,
      servico: dd.servico || { descricao: nota.descricao }, valores: dd.valores || null,
    };
  }

  function sucesso(n, r) {
    var aviso = (r.alertas || []).length ? '<div class="fin-alerta" style="margin-top:10px">' + r.alertas.map(esc).join('<br>') + '</div>' : '';
    F().modal('nfseOkModal', '✅ NFS-e ' + esc(n.numero || '') + ' autorizada' + (n.teste ? ' (teste)' : ''),
      '<p style="line-height:1.6">Nota de <b>' + moeda(n.valor) + '</b> para <b>' + esc(n.tomador) + '</b>' + (n.txId ? ', com conta a receber criada' : '') + '.</p>' +
      '<p class="fin-sub" style="word-break:break-all">Chave de acesso: ' + esc(n.chave) + '</p>' + aviso,
      '<a class="btn-ghost" href="' + CONSULTA + encodeURIComponent(n.chave) + '" target="_blank" rel="noopener">Consulta pública ↗</a>' +
      '<button class="btn-secondary" onclick="nfse.xml(\'' + esc(n.id) + '\')">Baixar XML</button>' +
      (n.txId && F().cobrar ? '<button class="btn-secondary" onclick="fin.fechar(\'nfseOkModal\');fin.cobrar(\'' + esc(n.txId) + '\')">💠 Cobrar</button>' : '') +
      '<button class="btn-primary" onclick="nfse.danfse(\'' + esc(n.id) + '\')">🖨️ DANFSe</button>');
  }

  // ---------- XML e DANFSe ----------
  function notaPorId(id) { return (window.state.nfes || []).find(function (x) { return x.id === id; }); }
  nfse.xml = async function (id) {
    var n = notaPorId(id); if (!n || !n.chave) return;
    try {
      var token = window.getAuthToken ? await window.getAuthToken() : '';
      var r = await fetch('/api/nfse?wsId=' + encodeURIComponent(window.workspaceId) + '&xml=' + encodeURIComponent(n.chave), { headers: { Authorization: 'Bearer ' + token } });
      if (!r.ok) { var d = await r.json().catch(function () { return {}; }); throw new Error(d.error || 'Não consegui baixar o XML.'); }
      var blob = await r.blob();
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'NFSe-' + (n.numero || n.chave) + '.xml';
      document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    } catch (e) { toast(e.message, 'error'); }
  };

  nfse.danfse = function (id) {
    var n = notaPorId(id); if (!n) return;
    var d = n.dados || {}, e = d.emitente || {}, t = d.tomador || {}, v = d.valores || {}, sv = d.servico || {}, dps = d.dps || {};
    var cfg = (emissor.dados && emissor.dados.config) || {};
    var linha = function (r, val) { return '<div class="c"><div class="r">' + r + '</div><div class="v">' + (val || '—') + '</div></div>'; };
    var ret = { '1': 'Não retido', '2': 'Retido pelo tomador', '3': 'Retido pelo intermediário' }[v.tpRetISSQN] || (n.issRetido ? 'Retido pelo tomador' : 'Não retido');
    var html = '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>DANFSe ' + esc(n.numero || '') + '</title><style>' +
      'body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:24px;font-size:12px}h1{font-size:16px;margin:0}.top{display:flex;justify-content:space-between;align-items:flex-start;border:1px solid #333;padding:10px}' +
      '.sec{border:1px solid #333;border-top:0;padding:8px 10px}.sec h2{font-size:11px;margin:0 0 6px;text-transform:uppercase;background:#eee;padding:3px 6px}.g{display:grid;grid-template-columns:repeat(4,1fr);gap:6px 12px}' +
      '.g2{grid-template-columns:repeat(2,1fr)}.r{font-size:9px;color:#555;text-transform:uppercase}.v{font-weight:bold;word-break:break-word}.desc{white-space:pre-wrap}.teste{color:#b00;font-weight:bold;font-size:14px;text-align:center;border:2px solid #b00;padding:6px;margin-bottom:8px}' +
      '.btn{margin:12px 0;padding:8px 14px;font-size:14px}@media print{.btn{display:none}body{margin:8mm}}</style></head><body>' +
      '<button class="btn" onclick="window.print()">Imprimir ou salvar em PDF</button>' +
      (n.teste ? '<div class="teste">AMBIENTE DE TESTES (PRODUÇÃO RESTRITA) — SEM VALOR FISCAL</div>' : '') +
      (n.status === 'Cancelada' ? '<div class="teste">NFS-e CANCELADA</div>' : '') +
      '<div class="top"><div><h1>DANFSe — Documento Auxiliar da NFS-e</h1><div>Nota Fiscal de Serviço eletrônica · padrão nacional</div></div><div style="text-align:right"><div class="r">Número da NFS-e</div><div class="v" style="font-size:18px">' + esc(n.numero || '—') + '</div><div class="r">Emissão</div><div class="v">' + esc(dataBR(n.dataEmissao)) + '</div></div></div>' +
      '<div class="sec"><div class="g g2">' + linha('Chave de acesso', esc(n.chave)) + linha('Competência', esc(dataBR(dps.competencia || n.competencia))) + linha('DPS (série / número)', esc((dps.serie || '') + ' / ' + (dps.numero || ''))) + linha('Processada em', esc(String(d.processadaEm || '').replace('T', ' ').slice(0, 19))) + '</div></div>' +
      '<div class="sec"><h2>Prestador do serviço</h2><div class="g">' + linha('Nome / razão social', esc(e.nome || cfg.razao)) + linha('CNPJ / CPF', esc(mascaraDoc(e.documento || cfg.documento))) + linha('Inscrição municipal', esc(e.im || cfg.im)) + linha('Município', esc(d.localEmissao || cfg.municipio)) +
        linha('Endereço', esc([e.logradouro, e.numero, e.bairro].filter(Boolean).join(', '))) + linha('CEP', esc(e.cep)) + linha('E-mail', esc(e.email || cfg.email)) + linha('Telefone', esc(e.fone || cfg.fone)) + '</div></div>' +
      '<div class="sec"><h2>Tomador do serviço</h2><div class="g">' + linha('Nome / razão social', esc(t.nome || n.tomador)) + linha('CNPJ / CPF', esc(mascaraDoc(t.documento || n.cnpj))) + linha('E-mail', esc(t.email)) + linha('Endereço', esc([t.logradouro, t.numero, t.bairro].filter(Boolean).join(', '))) + '</div></div>' +
      '<div class="sec"><h2>Serviço prestado</h2><div class="g g2">' + linha('Código de tributação nacional', esc((sv.cTribNac || '') + (d.tributacaoNacional ? ' — ' + d.tributacaoNacional : ''))) + linha('Local da prestação', esc(d.localPrestacao)) +
        (sv.cTribMun || d.tributacaoMunicipal ? linha('Tributação municipal', esc((sv.cTribMun || '') + ' ' + (d.tributacaoMunicipal || ''))) : '') + linha('Município de incidência do ISSQN', esc(d.localIncidencia || d.localPrestacao)) + '</div>' +
        '<div style="margin-top:6px"><div class="r">Descrição</div><div class="v desc">' + esc(sv.descricao || n.servico) + '</div></div></div>' +
      '<div class="sec"><h2>Valores</h2><div class="g">' + linha('Valor do serviço', moeda(v.servico || n.valor)) + linha('Base de cálculo', v.baseCalculo ? moeda(v.baseCalculo) : '—') + linha('Alíquota', v.aliquota ? String(v.aliquota).replace('.', ',') + '%' : '—') + linha('ISSQN', v.iss ? moeda(v.iss) : '—') +
        linha('Retenção do ISSQN', esc(ret)) + linha('Total retido', moeda(v.retido || n.issRetido || 0)) + linha('Tributos aprox. (Simples)', v.pTotTribSN ? String(v.pTotTribSN).replace('.', ',') + '%' : '—') + linha('Valor líquido', moeda(v.liquido || n.valor)) + '</div></div>' +
      '<div class="sec" style="font-size:10px">A autenticidade desta NFS-e pode ser conferida em ' + esc(CONSULTA) + esc(n.chave) + ' . Documento gerado pela Landim Advisory a partir da NFS-e autorizada pela Sefin Nacional; o documento fiscal é o XML.</div>' +
      '</body></html>';
    var w = window.open('', '_blank');
    if (!w) { toast('Libere as janelas pop-up para abrir o DANFSe.', 'warn'); return; }
    w.document.open(); w.document.write(html); w.document.close();
  };

  // ---------- cancelamento ----------
  function cancelarEmitida(n) {
    F().modal('nfseCancModal', 'Cancelar NFS-e ' + esc(n.numero || ''),
      '<p style="line-height:1.6">O cancelamento vai para a Sefin Nacional e não pode ser desfeito. O prazo e as regras dependem da prefeitura.</p><div class="form-grid">' +
      '<div class="form-field span-2"><label class="form-label" for="nfeCMot">Motivo</label><select class="form-input" id="nfeCMot"><option value="1">Erro na emissão</option><option value="2">Serviço não prestado</option><option value="9">Outros</option></select></div>' +
      '<div class="form-field span-2"><label class="form-label" for="nfeCJus">Explique (mínimo 15 letras)</label><textarea class="form-input" id="nfeCJus" rows="2" maxlength="255"></textarea></div></div><div id="nfeCErro"></div>',
      '<button class="btn-ghost" onclick="fin.fechar(\'nfseCancModal\')">Voltar</button><button class="btn-primary" id="nfeCBtn" onclick="nfse.confirmarCancelamento(\'' + esc(n.id) + '\')">Cancelar a nota</button>');
  }
  nfse.confirmarCancelamento = async function (id) {
    var n = notaPorId(id); if (!n) return;
    var jus = el('nfeCJus').value.trim();
    if (jus.length < 15) { el('nfeCErro').innerHTML = '<div class="fin-alerta" style="margin-top:8px">Explique o motivo com pelo menos 15 letras.</div>'; return; }
    var btn = el('nfeCBtn'); btn.disabled = true; btn.textContent = 'Cancelando…';
    try {
      await api('POST', '/api/nfse', { acao: 'cancelar', wsId: window.workspaceId, chave: n.chave, motivo: el('nfeCMot').value, justificativa: jus });
      F().fechar('nfseCancModal');
      marcarCancelada(n, true);
      toast('NFS-e ' + (n.numero || '') + ' cancelada na Sefin Nacional.', 'success');
    } catch (e) { btn.disabled = false; btn.textContent = 'Cancelar a nota'; el('nfeCErro').innerHTML = '<div class="fin-alerta" style="margin-top:8px">' + esc(e.message) + '</div>'; }
  };
  function marcarCancelada(n, perguntar) {
    n.status = 'Cancelada';
    var tx = n.txId && F() ? F().tx(n.txId) : null;
    if (tx && tx.status !== 'pago' && (!perguntar || confirm('Excluir a conta a receber ligada a essa nota?'))) {
      window.state.transactions = window.state.transactions.filter(function (t) { return t.id !== tx.id; });
    }
    salvar();
    window.renderNFe();
    if (F()) F().atualizarTudo();
  }

  // ---------- notas de outros sistemas (registro manual) ----------
  window.openNFeModal = function () {
    var id = 'finNotaModal', m = el(id);
    if (!m) { m = document.createElement('div'); m.className = 'modal-overlay'; m.id = id; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); document.body.appendChild(m); }
    var venc = F() ? F().addDias(hoje(), 30) : hoje();
    m.innerHTML = '<div class="modal-box" style="max-width:720px"><div class="modal-head"><div><h2 class="modal-title">🧾 Registrar nota de outro sistema</h2><p class="modal-subtitle">Para NF-e de produto ou nota emitida no portal da prefeitura</p></div><button class="modal-x" aria-label="Fechar" onclick="closeModal(\'finNotaModal\')">✕</button></div>' +
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
    el('nfDoc').addEventListener('blur', buscarTomadorManual);
  };

  async function buscarTomadorManual() {
    var d = dig(el('nfDoc').value);
    if (d.length !== 14 || el('nfTomador').value) return;
    try {
      var r = await fetch('https://brasilapi.com.br/api/cnpj/v1/' + d);
      if (!r.ok) return;
      var j = await r.json();
      el('nfTomador').value = (j.razao_social || j.nome_fantasia || '').slice(0, 80);
      toast('Tomador encontrado na Receita: ' + el('nfTomador').value, 'success');
    } catch (e) { /* sem internet ou CNPJ não encontrado */ }
  }

  window.gerarNFe = async function () {
    var tomador = el('nfTomador').value.trim(), servico = el('nfServico').value.trim(), valor = Math.round(parseFloat(el('nfValor').value) * 100) / 100;
    if (!tomador || !servico || !(valor > 0)) { toast('Preencha tomador, descrição e valor.', 'error'); return; }
    var btn = el('nfSalvar'); btn.disabled = true; btn.textContent = 'Salvando…';
    var anexo = '';
    var arq = el('nfPdf').files[0];
    if (arq && window.uploadFileToFirebase && window.workspaceId) { try { anexo = (await window.uploadFileToFirebase(window.workspaceId, arq)) || ''; } catch (e) { } }
    var nota = {
      id: novoId(), modelo: el('nfModelo').value, numero: el('nfNumero').value.trim(),
      tomador: tomador, cnpj: dig(el('nfDoc').value), servico: servico, valor: valor,
      issRetido: Math.max(0, Math.round((parseFloat(el('nfIss').value) || 0) * 100) / 100), dataEmissao: el('nfData').value || hoje(),
      chave: el('nfChave').value.trim(), anexo: anexo, status: 'Emitida', origem: 'manual'
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
    salvar();
    if (window.closeModal) window.closeModal('finNotaModal');
    toast('Nota registrada' + (nota.txId ? ' e conta a receber criada' : '') + '.', 'success');
    window.renderNFe();
    if (F()) F().atualizarTudo();
  };

  window.cancelarNFe = function (id) {
    var n = notaPorId(id);
    if (!n) return;
    if (n.origem === 'emissor' && n.chave) {
      if (window.maxcfoDemo) { toast('No modo demonstração a emissão fica desligada.', 'warn'); return; }
      return cancelarEmitida(n);
    }
    if (!confirm('Marcar a nota ' + (n.numero || '') + ' como cancelada? Cancele também no sistema onde ela foi emitida (' + EMISSOR.replace('https://', '') + ' ou prefeitura).')) return;
    marcarCancelada(n, true);
  };
})();
