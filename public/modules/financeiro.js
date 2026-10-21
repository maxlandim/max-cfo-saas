/**
 * MAX CFO AI — Núcleo financeiro (v5)
 * Contas a pagar e receber, contas bancárias, fluxo de caixa projetado,
 * DRE gerencial (competência e caixa), cobrança por Pix com QR Code,
 * lembrete por WhatsApp, categorização que aprende e leitura de documentos com IA.
 *
 * Modelo de cada lançamento (state.transactions):
 *   id, type ('RECEITA'|'DESPESA'), desc, amount, category, notes, attachmentUrl,
 *   date        → data de competência (quando o fato aconteceu; usada no DRE)
 *   vencimento  → data de vencimento
 *   status      → 'pago' | 'pendente'
 *   pagoEm      → data em que foi pago/recebido (usada no fluxo de caixa)
 *   contaId, contato, centroCusto, forma, grupo, parcela ('2/6')
 */
(function () {
  'use strict';
  var F = (window.fin = window.fin || {});

  // ════════════════ DATAS (sempre no fuso do usuário) ════════════════
  function pad(n) { return String(n).padStart(2, '0'); }
  F.iso = function (d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  F.hoje = function () { return F.iso(new Date()); };
  F.data = function (iso) { var p = String(iso || '').split('-'); return new Date(+p[0], (+p[1] || 1) - 1, +p[2] || 1, 12); };
  F.addDias = function (iso, n) { var d = F.data(iso); d.setDate(d.getDate() + n); return F.iso(d); };
  F.addMeses = function (iso, n) {
    var d = F.data(iso), dia = d.getDate();
    var alvo = new Date(d.getFullYear(), d.getMonth() + n, 1, 12);
    var ultimo = new Date(alvo.getFullYear(), alvo.getMonth() + 1, 0).getDate();
    alvo.setDate(Math.min(dia, ultimo));
    return F.iso(alvo);
  };
  F.diffDias = function (a, b) { return Math.round((F.data(b) - F.data(a)) / 86400000); };
  F.mes = function (iso) { return String(iso || '').slice(0, 7); };
  F.mesAtual = function () { return F.mes(F.hoje()); };
  F.mesesAte = function (fimYM, n) {
    var p = fimYM.split('-'), lista = [];
    for (var i = n - 1; i >= 0; i--) { var d = new Date(+p[0], +p[1] - 1 - i, 1, 12); lista.push(d.getFullYear() + '-' + pad(d.getMonth() + 1)); }
    return lista;
  };
  var NOMES_MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  F.nomeMes = function (ym) { var p = ym.split('-'); return NOMES_MES[+p[1] - 1] + '/' + p[0].slice(2); };
  F.dataBR = function (iso) { if (!iso) return '—'; var p = iso.split('-'); return p[2] + '/' + p[1] + '/' + p[0]; };

  // ════════════════ UTILIDADES ════════════════
  function st() { return F._estado || window.state; }
  // Executa os cálculos sobre o estado de outra empresa (painel multiempresas)
  F.comEstado = function (estado, fn) {
    var antes = F._estado; F._estado = estado;
    try { F.garantirModelo(); return fn(); } finally { F._estado = antes; }
  };
  function moeda(v) { return (window.fmt ? window.fmt(v) : 'R$ ' + Number(v || 0).toFixed(2)); }
  F.moeda = moeda;
  function esc(s) { return window.escHtml ? window.escHtml(String(s == null ? '' : s)) : String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  F.esc = esc;
  function novoId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function toast(m, t) { if (window.showToast) window.showToast(m, t || 'success'); }
  function salvar() { if (window.persist) window.persist(); }
  function semAcento(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  // Aceita "1050.00" (campo numérico) e "1.050,00" (digitado no padrão brasileiro)
  function num(v) {
    if (typeof v === 'number') return isFinite(v) ? v : 0;
    var t = String(v == null ? '' : v).trim().replace(/[R$\s]/g, '');
    if (t.indexOf(',') > -1) t = t.replace(/\./g, '').replace(',', '.');
    var n = parseFloat(t); return isFinite(n) ? n : 0;
  }
  F.num = num;
  function el(id) { return document.getElementById(id); }
  function r2(v) { return Math.round(v * 100) / 100; }

  F.FORMAS = ['Pix', 'Boleto', 'Transferência', 'Cartão de crédito', 'Cartão de débito', 'Dinheiro', 'Débito automático', 'Outro'];
  F.TIPOS_CONTA = ['Conta corrente', 'Conta poupança', 'Conta de pagamento', 'Caixa (dinheiro)', 'Cartão de crédito', 'Investimento'];

  // ════════════════ CATEGORIAS E DRE ════════════════
  // Grupo do DRE de cada categoria. Categorias novas ou personalizadas caem em "outras".
  F.GRUPOS = {
    receita: { nome: 'Receita bruta', sinal: 1 },
    deducoes: { nome: '(-) Impostos sobre vendas', sinal: -1 },
    custos: { nome: '(-) Custos (mercadorias e serviços)', sinal: -1 },
    pessoal: { nome: '(-) Pessoal e pró-labore', sinal: -1 },
    operacionais: { nome: '(-) Despesas operacionais', sinal: -1 },
    financeiro_rec: { nome: '(+) Receitas financeiras', sinal: 1 },
    financeiro_desp: { nome: '(-) Despesas financeiras', sinal: -1 },
    outras_rec: { nome: '(+) Outras receitas', sinal: 1 },
    fora: { nome: 'Fora do resultado', sinal: 0 }
  };
  var MAPA = {
    RECEITA: {
      'Consultoria': 'receita', 'Vendas de Produto': 'receita', 'Serviços Prestados': 'receita', 'Licenciamento': 'receita', 'Royalties': 'receita', 'Assinaturas e Mensalidades': 'receita',
      'Rendimentos Financeiros': 'financeiro_rec', 'Investimentos': 'financeiro_rec', 'Dividendos': 'financeiro_rec',
      'Aluguéis Recebidos': 'outras_rec', 'Outros': 'outras_rec',
      'Empréstimos Recebidos': 'fora', 'Aporte dos Sócios': 'fora', 'Transferência entre Contas': 'fora'
    },
    DESPESA: {
      'Impostos e Taxas': 'deducoes', 'Taxas, Licenças e IPTU': 'operacionais',
      'Custo de Mercadorias e Serviços': 'custos', 'Fornecedores': 'custos', 'Comissões de Vendas': 'custos',
      'Salários e Pró-labore': 'pessoal', 'Encargos e Benefícios': 'pessoal',
      'Aluguel e Condomínio': 'operacionais', 'Marketing e Publicidade': 'operacionais', 'TI e Software': 'operacionais', 'Transporte e Logística': 'operacionais', 'Energia e Utilidades': 'operacionais', 'Contabilidade e Serviços': 'operacionais', 'Outros': 'operacionais',
      'Tarifas Bancárias e Juros': 'financeiro_desp',
      'Equipamentos': 'fora', 'Empréstimos e Financiamentos (parcelas)': 'fora', 'Distribuição de Lucros': 'fora', 'Transferência entre Contas': 'fora'
    }
  };
  F.grupoDe = function (t) {
    var m = MAPA[t.type] || {};
    if (m[t.category]) return m[t.category];
    var custom = (st().categoriasCustom || []).find(function (c) { return c.tipo === t.type && c.nome === t.category; });
    if (custom && F.GRUPOS[custom.grupo]) return custom.grupo;
    return t.type === 'RECEITA' ? 'outras_rec' : 'operacionais';
  };
  F.atualizarCategorias = function () {
    if (!window.CATEGORIES) return;
    ['RECEITA', 'DESPESA'].forEach(function (tipo) {
      var atuais = window.CATEGORIES[tipo] || [];
      Object.keys(MAPA[tipo]).forEach(function (c) { if (atuais.indexOf(c) === -1) atuais.splice(Math.max(atuais.length - 1, 0), 0, c); });
      (st().categoriasCustom || []).forEach(function (c) { if (c.tipo === tipo && atuais.indexOf(c.nome) === -1) atuais.splice(Math.max(atuais.length - 1, 0), 0, c.nome); });
      // "Outros" sempre por último
      var i = atuais.indexOf('Outros'); if (i > -1) { atuais.splice(i, 1); atuais.push('Outros'); }
      window.CATEGORIES[tipo] = atuais;
    });
  };

  F.MAPA = MAPA;
  F.ehPadrao = function (tipo, nome) { return !!(MAPA[tipo] || {})[nome]; };
  F.addCategoria = function (nome, tipo, grupo) {
    nome = String(nome || '').trim().slice(0, 50);
    if (!nome) return 'Dê um nome para a categoria.';
    if ((window.CATEGORIES[tipo] || []).indexOf(nome) > -1) return 'Essa categoria já existe.';
    st().categoriasCustom = st().categoriasCustom || [];
    st().categoriasCustom.push({ nome: nome, tipo: tipo, grupo: F.GRUPOS[grupo] ? grupo : (tipo === 'RECEITA' ? 'receita' : 'operacionais') });
    F.atualizarCategorias(); salvar(); return null;
  };
  F.removerCategoria = function (nome, tipo) {
    var usados = st().transactions.filter(function (t) { return t.type === tipo && t.category === nome; });
    if (usados.length && !confirm(usados.length + ' lançamento(s) usam "' + nome + '". Eles vão para "Outros". Continuar?')) return false;
    usados.forEach(function (t) { t.category = 'Outros'; });
    st().categoriasCustom = (st().categoriasCustom || []).filter(function (c) { return !(c.nome === nome && c.tipo === tipo); });
    var lista = window.CATEGORIES[tipo] || [], i = lista.indexOf(nome); if (i > -1) lista.splice(i, 1);
    salvar(); return true;
  };

  // ════════════════ MODELO ════════════════
  F.garantirModelo = function () {
    var s = st();
    if (!Array.isArray(s.transactions)) s.transactions = [];
    if (!Array.isArray(s.contas) || !s.contas.length) {
      s.contas = [{ id: 'conta-principal', nome: 'Conta principal', tipo: 'Conta corrente', saldoInicial: 0, dataSaldo: '' }];
    }
    if (!s.regras || typeof s.regras !== 'object') s.regras = {};
    if (!s.contatos || typeof s.contatos !== 'object') s.contatos = {};
    if (!s.settings) s.settings = {};
    // Ids entram em atributos onclick: só letras, números, "_" e "-" (protege contra backups adulterados)
    var seguro = function (id) { return /^[\w-]{1,64}$/.test(String(id || '')); };
    s.contas.forEach(function (c) { if (!seguro(c.id)) { var novo = 'conta-' + novoId(); s.transactions.forEach(function (t) { if (t.contaId === c.id) t.contaId = novo; }); c.id = novo; } });
    var contaPadrao = s.contas[0].id;
    s.transactions.forEach(function (t) {
      if (!seguro(t.id)) t.id = novoId();
      t.amount = num(t.amount);
      if (!t.date) t.date = t.vencimento || F.hoje();
      if (!t.status) t.status = 'pago';
      if (!t.vencimento) t.vencimento = t.date;
      if (t.status === 'pago' && !t.pagoEm) t.pagoEm = t.date;
      if (!t.contaId || !s.contas.some(function (c) { return c.id === t.contaId; })) t.contaId = contaPadrao;
      if (!t.category) t.category = 'Outros';
    });
  };

  F.estaPago = function (t) { return !t.status || t.status === 'pago'; };
  F.situacao = function (t) {
    if (F.estaPago(t)) return 'pago';
    var d = F.diffDias(F.hoje(), t.vencimento);
    return d < 0 ? 'vencido' : d === 0 ? 'hoje' : 'aberto';
  };
  F.rotuloSituacao = function (t) {
    var s = F.situacao(t), d = F.diffDias(F.hoje(), t.vencimento);
    var rec = t.type === 'RECEITA';
    if (s === 'pago') return { cls: 'ok', txt: (rec ? 'Recebido' : 'Pago') + ' em ' + F.dataBR(t.pagoEm) };
    if (s === 'vencido') return { cls: 'atraso', txt: 'Vencido há ' + (-d) + (d === -1 ? ' dia' : ' dias') };
    if (s === 'hoje') return { cls: 'hoje', txt: 'Vence hoje' };
    return { cls: 'aberto', txt: d === 1 ? 'Vence amanhã' : 'Vence em ' + d + ' dias' };
  };

  F.contaPorId = function (id) { return (st().contas || []).find(function (c) { return c.id === id; }); };
  F.saldoConta = function (conta, ate) {
    ate = ate || F.hoje();
    var s = num(conta.saldoInicial);
    st().transactions.forEach(function (t) {
      if (!F.estaPago(t) || t.contaId !== conta.id || !(t.pagoEm || t.date)) return;
      var quando = t.pagoEm || t.date;
      // Saldo informado = saldo do extrato naquele momento. Movimentos de datas anteriores já estão nele;
      // no mesmo dia, só os registrados antes de o saldo ser informado.
      if (conta.dataSaldo && (quando < conta.dataSaldo || (quando === conta.dataSaldo && (t.atualizadoEm || 0) <= (conta.saldoInformadoEm || Infinity)))) return;
      if (quando > ate) return;
      s += t.type === 'RECEITA' ? t.amount : -t.amount;
    });
    return r2(s);
  };
  F.saldoTotal = function (ate) {
    return r2((st().contas || []).reduce(function (a, c) { return c.tipo === 'Cartão de crédito' ? a : a + F.saldoConta(c, ate); }, 0));
  };
  F.pendentes = function (tipo) {
    return st().transactions.filter(function (t) { return !F.estaPago(t) && (!tipo || t.type === tipo); });
  };
  F.somar = function (lista) { return r2(lista.reduce(function (a, t) { return a + t.amount; }, 0)); };

  // Projeção diária do saldo. Atrasados entram hoje (se incluir) — é o que vai sair/entrar assim que for pago.
  F.projecao = function (dias, incluirAtrasados) {
    dias = dias || 90;
    var hoje = F.hoje(), saldo = F.saldoTotal(hoje), mapa = {};
    F.pendentes().forEach(function (t) {
      var dia = t.vencimento < hoje ? (incluirAtrasados === false ? null : hoje) : t.vencimento;
      if (!dia || F.diffDias(hoje, dia) > dias) return;
      mapa[dia] = mapa[dia] || { ent: 0, sai: 0 };
      if (t.type === 'RECEITA') mapa[dia].ent += t.amount; else mapa[dia].sai += t.amount;
    });
    var pontos = [];
    for (var i = 0; i <= dias; i++) {
      var d = F.addDias(hoje, i), m = mapa[d] || { ent: 0, sai: 0 };
      saldo = r2(saldo + m.ent - m.sai);
      pontos.push({ data: d, ent: r2(m.ent), sai: r2(m.sai), saldo: saldo });
    }
    return pontos;
  };

  // Totais por mês e grupo do DRE. regime: 'competencia' (data) ou 'caixa' (pagoEm, só pagos)
  F.porMes = function (meses, regime) {
    var res = {};
    meses.forEach(function (m) { res[m] = { receitas: 0, despesas: 0, grupos: {}, cats: {} }; });
    st().transactions.forEach(function (t) {
      var ref = regime === 'caixa' ? (F.estaPago(t) ? (t.pagoEm || t.date) : null) : t.date;
      if (!ref) return;
      var m = F.mes(ref);
      if (!res[m]) return;
      var g = F.grupoDe(t), b = res[m];
      b.grupos[g] = r2((b.grupos[g] || 0) + t.amount);
      var chave = t.type + '|' + t.category;
      b.cats[chave] = r2((b.cats[chave] || 0) + t.amount);
      if (g === 'fora') return;
      if (t.type === 'RECEITA') b.receitas = r2(b.receitas + t.amount); else b.despesas = r2(b.despesas + t.amount);
    });
    return res;
  };
  F.dreDoMes = function (b) {
    var g = b.grupos || {}, v = function (k) { return g[k] || 0; };
    var bruta = v('receita');
    var liquida = bruta - v('deducoes');
    var lucroBruto = liquida - v('custos');
    var operacional = lucroBruto - v('pessoal') - v('operacionais');
    var resultado = operacional + v('financeiro_rec') - v('financeiro_desp') + v('outras_rec');
    return { bruta: r2(bruta), deducoes: r2(v('deducoes')), liquida: r2(liquida), custos: r2(v('custos')), lucroBruto: r2(lucroBruto), pessoal: r2(v('pessoal')), operacionais: r2(v('operacionais')), operacional: r2(operacional), finRec: r2(v('financeiro_rec')), finDesp: r2(v('financeiro_desp')), outras: r2(v('outras_rec')), resultado: r2(resultado), fora: r2(v('fora')) };
  };

  // Média mensal de despesas pagas nos últimos 3 meses completos (para o runway)
  F.queimaMensal = function () {
    var meses = F.mesesAte(F.mes(F.addMeses(F.hoje(), -1)), 3);
    var pm = F.porMes(meses, 'caixa');
    var tot = 0, com = 0;
    meses.forEach(function (m) { var d = pm[m].despesas; if (d > 0) { tot += d; com++; } });
    if (!com) { // sem histórico: usa o mês atual
      var atual = F.porMes([F.mesAtual()], 'caixa')[F.mesAtual()].despesas;
      return atual;
    }
    return r2(tot / com);
  };

  // ════════════════ CATEGORIZAÇÃO QUE APRENDE ════════════════
  F.chaveTexto = function (s) {
    var limpo = semAcento(s).toLowerCase().replace(/[0-9]+/g, ' ').replace(/[^a-z ]+/g, ' ').replace(/\b(pix|ted|doc|pagamento|pgto|pag|recebido|recebimento|transf|transferencia|enviado|compra|cartao|debito|credito|de|da|do|para|em|no|na)\b/g, ' ').replace(/\s+/g, ' ').trim();
    return limpo.split(' ').filter(function (w) { return w.length > 2; }).slice(0, 3).join(' ');
  };
  F.aprender = function (t) {
    var k = F.chaveTexto(t.contato || t.desc);
    if (!k || !t.category || t.category === 'Outros') return;
    st().regras[t.type + '|' + k] = t.category;
    if (t.contato) st().regras[t.type + '|' + F.chaveTexto(t.desc)] = t.category;
  };
  var PADROES = {
    DESPESA: [
      [/tarifa|pacote de servi|manutencao de conta|anuidade|iof|juros|encargo|multa/, 'Tarifas Bancárias e Juros'],
      [/\bdas\b|simples nacional|darf|gps|inss|fgts|\biss\b|icms|receita federal|sefaz|guia/, 'Impostos e Taxas'],
      [/salario|folha|pro.?labore|ferias|rescis/, 'Salários e Pró-labore'],
      [/aluguel|condominio|locacao/, 'Aluguel e Condomínio'],
      [/energia|neoenergia|enel|cemig|copel|light|celesc|equatorial|ceb\b|agua|saneamento|caesb|sabesp|copasa|\bgas\b|comgas|vivo|claro|\btim\b|\boi\b|telefon|internet/, 'Energia e Utilidades'],
      [/google|\bmeta\b|facebook|instagram|\bads\b|anuncio|marketing/, 'Marketing e Publicidade'],
      [/software|saas|microsoft|adobe|aws|amazon web|hostinger|dominio|assinatura|conta azul|omie|zoom|notion|canva/, 'TI e Software'],
      [/\buber|99 ?app|99pop|combustivel|posto|shell|ipiranga|petrobras|frete|correios|transport|pedagio|estacion/, 'Transporte e Logística'],
      [/contab|contador|honorario|advoc|juridic/, 'Contabilidade e Serviços'],
      [/emprestimo|financiamento|parcela contrato|consorcio/, 'Empréstimos e Financiamentos (parcelas)'],
      [/distribuicao de lucro|dividendo/, 'Distribuição de Lucros']
    ],
    RECEITA: [
      [/rendimento|aplicacao|cdb|resgate|juros recebidos/, 'Rendimentos Financeiros'],
      [/emprestimo|credito pessoal|capital de giro/, 'Empréstimos Recebidos'],
      [/aporte|integraliza/, 'Aporte dos Sócios']
    ]
  };
  F.sugerirPadrao = function (texto, tipo) {
    var t = semAcento(texto).toLowerCase();
    var achou = (PADROES[tipo] || []).find(function (p) { return p[0].test(t); });
    return achou ? achou[1] : null;
  };
  F.sugerir = function (texto, tipo) {
    var aprendida = F.sugerirAprendida(texto, tipo);
    return aprendida || F.sugerirPadrao(texto, tipo);
  };
  F.sugerirAprendida = function (texto, tipo) {
    var k = F.chaveTexto(texto); if (!k) return null;
    var r = st().regras || {};
    if (r[tipo + '|' + k]) return r[tipo + '|' + k];
    // tenta pela primeira palavra
    var primeira = k.split(' ')[0];
    var achou = Object.keys(r).find(function (chave) { return chave.indexOf(tipo + '|' + primeira) === 0; });
    return achou ? r[achou] : null;
  };

  // ════════════════ PIX (BR Code / copia e cola) ════════════════
  function campo(id, valor) { valor = String(valor); return id + pad(valor.length) + valor; }
  F.crc16 = function (s) {
    var crc = 0xFFFF;
    for (var i = 0; i < s.length; i++) {
      crc ^= s.charCodeAt(i) << 8;
      for (var j = 0; j < 8; j++) crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
      crc &= 0xFFFF;
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
  };
  F.normalizarChavePix = function (tipo, chave) {
    chave = String(chave || '').trim();
    if (tipo === 'cpfcnpj') return chave.replace(/\D/g, '');
    if (tipo === 'celular') { var d = chave.replace(/\D/g, ''); if (d.indexOf('55') !== 0 || d.length <= 11) d = '55' + d; return '+' + d; }
    if (tipo === 'email') return chave.toLowerCase();
    return chave;
  };
  F.validarChavePix = function (tipo, chave) {
    if (!chave) return 'Informe a chave Pix.';
    if (tipo === 'cpfcnpj' && !/^(\d{11}|\d{14})$/.test(chave)) return 'CPF precisa de 11 dígitos e CNPJ de 14.';
    if (tipo === 'celular' && !/^\+55\d{10,11}$/.test(chave)) return 'Celular com DDD, ex.: (61) 99999-9999.';
    if (tipo === 'email' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(chave)) return 'E-mail inválido.';
    if (tipo === 'aleatoria' && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(chave)) return 'A chave aleatória tem o formato 8-4-4-4-12 (36 caracteres).';
    return null;
  };
  F.pixPayload = function (o) {
    var nome = semAcento(o.nome || 'RECEBEDOR').toUpperCase().replace(/[^A-Z0-9 ]/g, '').trim().slice(0, 25) || 'RECEBEDOR';
    var cidade = semAcento(o.cidade || 'BRASILIA').toUpperCase().replace(/[^A-Z0-9 ]/g, '').trim().slice(0, 15) || 'BRASILIA';
    var txid = String(o.txid || '***').replace(/[^A-Za-z0-9]/g, '').slice(0, 25) || '***';
    var gui = campo('00', 'br.gov.bcb.pix') + campo('01', o.chave);
    var info = semAcento(o.descricao || '').replace(/[^A-Za-z0-9 .,\-\/]/g, '').trim();
    var maxInfo = 99 - gui.length - 4;
    if (info && maxInfo > 0) gui += campo('02', info.slice(0, maxInfo));
    var p = campo('00', '01') + campo('26', gui) + campo('52', '0000') + campo('53', '986');
    if (o.valor > 0) p += campo('54', Number(o.valor).toFixed(2));
    p += campo('58', 'BR') + campo('59', nome) + campo('60', cidade) + campo('62', campo('05', txid)) + '6304';
    return p + F.crc16(p);
  };
  var qrCarregando = null;
  F.carregarQR = function () {
    if (window.gerarMatrizQR) return Promise.resolve();
    if (qrCarregando) return qrCarregando;
    qrCarregando = new Promise(function (ok) {
      var s = document.createElement('script'); s.src = '/vendor/qrcode.min.js'; s.onload = ok; s.onerror = ok; document.body.appendChild(s);
    });
    return qrCarregando;
  };
  F.qrSVG = function (texto, tamanho) {
    if (!window.gerarMatrizQR) return '';
    var m = window.gerarMatrizQR(texto), n = m.length, margem = 4, total = n + margem * 2, d = '';
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (m[r][c]) d += 'M' + (c + margem) + ' ' + (r + margem) + 'h1v1h-1z';
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + total + ' ' + total + '" width="' + (tamanho || 220) + '" height="' + (tamanho || 220) + '" shape-rendering="crispEdges" role="img" aria-label="QR Code Pix"><rect width="100%" height="100%" fill="#fff"/><path d="' + d + '" fill="#000"/></svg>';
  };

  // ════════════════ ESTILOS ════════════════
  function injetarEstilos() {
    if (el('fin-estilos')) return;
    var css = '' +
      '.fin-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin:18px 0}' +
      '.fin-kpi2{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-sm);padding:14px 16px}' +
      '.fin-kpi2 .v{font-size:20px;font-weight:800;letter-spacing:-.01em}.fin-kpi2 .l{font-size:12px;color:var(--text-muted);margin-top:2px}.fin-kpi2 .s{font-size:11px;color:var(--text-faint);margin-top:4px}' +
      '.fin-tabs{display:flex;gap:6px;flex-wrap:wrap}.fin-tab{background:transparent;border:1px solid var(--border);color:var(--text-muted);padding:7px 12px;border-radius:999px;cursor:pointer;font-size:13px}' +
      '.fin-tab.on{background:var(--gold-dim);border-color:var(--gold-border);color:var(--gold)}.fin-tab b{margin-left:6px;font-size:11px;background:rgba(255,255,255,.08);padding:1px 7px;border-radius:999px}' +
      '.fin-bar{display:flex;gap:10px;flex-wrap:wrap;align-items:center;justify-content:space-between;margin-bottom:12px}' +
      '.fin-sit{display:inline-block;font-size:11px;font-weight:700;padding:3px 9px;border-radius:999px;white-space:nowrap}' +
      '.fin-sit.ok{background:rgba(16,185,129,.12);color:#34D399}.fin-sit.atraso{background:rgba(239,68,68,.14);color:#F87171}.fin-sit.hoje{background:rgba(245,158,11,.16);color:#FBBF24}.fin-sit.aberto{background:rgba(59,130,246,.13);color:#93C5FD}' +
      '.fin-acoes{display:flex;gap:4px;flex-wrap:wrap}.fin-btn{background:var(--bg-hover);border:1px solid var(--border);color:var(--text);padding:5px 9px;border-radius:8px;cursor:pointer;font-size:12px;white-space:nowrap}' +
      '.fin-btn:hover{border-color:var(--gold-border)}.fin-btn.ok{color:#34D399}.fin-btn.gold{color:var(--gold)}' +
      '.fin-sub{font-size:11px;color:var(--text-faint)}.fin-neg{color:var(--danger)}.fin-pos{color:var(--success)}' +
      '.fin-alerta{border-radius:var(--radius-sm);padding:12px 14px;margin:12px 0;font-size:13px;line-height:1.5}' +
      '.fin-alerta.red{background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.35)}.fin-alerta.gold{background:var(--gold-dim);border:1px solid var(--gold-border)}.fin-alerta.green{background:rgba(16,185,129,.08);border:1px solid rgba(16,185,129,.3)}' +
      '.fin-contas{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px}' +
      '.fin-conta{background:var(--bg-surf);border:1px solid var(--border);border-radius:var(--radius-sm);padding:12px 14px;cursor:pointer}.fin-conta:hover{border-color:var(--gold-border)}' +
      '.fin-dre td,.fin-dre th{padding:8px 10px;text-align:right;white-space:nowrap;border-bottom:1px solid var(--border);font-size:13px}.fin-dre td:first-child,.fin-dre th:first-child{text-align:left;position:sticky;left:0;background:var(--bg-card)}' +
      '.fin-dre tr.tot td{font-weight:800;background:rgba(255,255,255,.025)}.fin-dre tr.tot td:first-child{background:#141c2f}.fin-dre tr.res td{font-weight:900;color:var(--gold)}.fin-dre tr.cat td{color:var(--text-muted);font-size:12px}.fin-dre tr.cat td:first-child{padding-left:26px}' +
      '.fin-pix{display:grid;grid-template-columns:auto 1fr;gap:18px;align-items:start}.fin-pix .qr{background:#fff;border-radius:12px;padding:8px;line-height:0}' +
      '.fin-pix textarea{width:100%;min-height:92px;font-family:monospace;font-size:11px;resize:vertical}' +
      '.fin-extra{display:contents}.fin-linha{grid-column:1/-1;border-top:1px dashed var(--border);margin:4px 0 0;padding-top:8px;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--text-faint)}' +
      '.fin-check{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--text-muted);cursor:pointer}' +
      '@media (max-width:700px){.fin-pix{grid-template-columns:1fr}.fin-pix .qr{justify-self:center}.fin-hide-sm{display:none}}' +
      '.nav-item.fin-escondido{display:none}' +
      '@media (max-width:700px){.topbar-date-time,.topbar-divider,.breadcrumb-root,.breadcrumb-sep{display:none!important}.topbar-right{gap:6px}.breadcrumb-current{max-width:44vw;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:block}}';
    var s = document.createElement('style'); s.id = 'fin-estilos'; s.textContent = css; document.head.appendChild(s);
  }

  // ════════════════ MENU E TELAS ════════════════
  function navItem(view, icone, rotulo) {
    var a = document.createElement('a');
    a.className = 'nav-item'; a.dataset.view = view; a.id = 'nav-' + view;
    a.innerHTML = '<span class="nav-icon">' + icone + '</span><span class="nav-label">' + rotulo + '</span>';
    a.addEventListener('click', function () { window.switchView(view); });
    return a;
  }
  function secao(id, rotulo) {
    var s = el('view-' + id);
    if (s) return s;
    s = document.createElement('section'); s.className = 'view'; s.id = 'view-' + id; s.setAttribute('aria-label', rotulo);
    (el('viewsContainer') || document.body).appendChild(s);
    return s;
  }
  function rotular(id, texto) { var a = el('nav-' + id); if (a) { var l = a.querySelector('.nav-label'); if (l) l.textContent = texto; } }

  F.montarMenu = function () {
    var fin = el('nav-finance');
    if (fin && !el('nav-contas')) {
      var depois = fin;
      [['contas', '📅', 'Contas a Pagar e Receber'], ['contatos', '👥', 'Clientes e Fornecedores'], ['fluxo', '🌊', 'Fluxo de Caixa e Bancos'], ['dre', '📊', 'DRE Gerencial']].forEach(function (x) {
        var item = navItem(x[0], x[1], x[2]);
        depois.parentNode.insertBefore(item, depois.nextSibling); depois = item;
      });
    }
    rotular('finance', 'Lançamentos');
    rotular('reconciliation', 'Conciliação (OFX/CSV)');
    rotular('nfe', 'Notas Fiscais');
    rotular('team', 'Equipe');
    rotular('accountant', 'Portal do Contador');
    [].forEach.call(document.querySelectorAll('.nav-section-label'), function (l) {
      l.textContent = l.textContent.replace('FINTECH & FATURAMENTO', 'FATURAMENTO').replace('ONBOARDING & EQUIPE', 'CONTA E EQUIPE').replace('OPERAÇÃO & VENDAS', 'FINANCEIRO E VENDAS');
    });
    // Telas sem integração real ficam fora do menu até existirem de verdade
    // Telas sem integração real saem do painel
    ['fintech', 'thermofinance', 'checkout', 'billing'].forEach(function (v) { var a = el('nav-' + v); if (a) a.remove(); var sec = el('view-' + v); if (sec) sec.remove(); });
    ['billingModal', 'checkoutModal', 'nfeModal', 'ocrModal', 'crmModal', 'invModal', 'budgetModal', 'commModal', 'hrModal', 'assetModal', 'planModal'].forEach(function (id) { var m = el(id); if (m) m.remove(); });
    [].forEach.call(document.querySelectorAll('.nav-section-label'), function (l) { var prox = l.nextElementSibling; if (!prox || prox.classList.contains('nav-section-label')) l.remove(); });
    secao('contas', 'Contas a pagar e receber');
    secao('fluxo', 'Fluxo de caixa');
    secao('dre', 'DRE gerencial');
    secao('contatos', 'Clientes e fornecedores');
    window.viewMeta.contatos = { label: 'Clientes e Fornecedores', render: function () { F.renderContatos(); } };
    window.viewMeta = window.viewMeta || {};
    window.viewMeta.contas = { label: 'Contas a Pagar e Receber', render: F.renderContas };
    window.viewMeta.fluxo = { label: 'Fluxo de Caixa e Bancos', render: F.renderFluxo };
    window.viewMeta.dre = { label: 'DRE Gerencial', render: F.renderDRE };
    window.viewMeta.reconciliation = { label: 'Conciliação Bancária', render: F.renderConciliacao };
    window.processBankFile = F.processarExtrato;
    window.openOCRModal = F.abrirLeitura;
    // Telas escondidas apontam para o equivalente real
    window.viewMeta.billing = { label: 'Contas a Pagar e Receber', render: function () { setTimeout(function () { window.switchView('contas'); }, 0); } };
    window.viewMeta.checkout = window.viewMeta.billing;
    window.viewMeta.fintech = window.viewMeta.billing;
    window.viewMeta.thermofinance = window.viewMeta.billing;
    // Botão de leitura com IA na tela de lançamentos
    var acoes = document.querySelector('#view-finance .page-header-actions');
    if (acoes && !el('fin-btn-ia')) {
      var b = document.createElement('button'); b.className = 'btn-secondary'; b.id = 'fin-btn-ia'; b.textContent = '📷 Ler boleto ou nota';
      b.onclick = function () { F.abrirLeitura(); };
      acoes.insertBefore(b, acoes.firstChild);
    }
  };

  // ════════════════ FORMULÁRIO DE LANÇAMENTO (campos extras) ════════════════
  F.ampliarFormulario = function () {
    var grid = document.querySelector('#txForm .form-grid');
    if (!grid || el('txStatus')) return;
    var lblData = document.querySelector('label[for="txDate"]'); if (lblData) lblData.textContent = 'Competência *';
    var html = '' +
      '<div class="form-field"><label class="form-label" for="txStatus">Situação</label><select class="form-input" id="txStatus"><option value="pago">Pago / recebido</option><option value="pendente">Em aberto (a pagar ou receber)</option></select></div>' +
      '<div class="form-field"><label class="form-label" for="txVenc">Vencimento</label><input type="date" class="form-input" id="txVenc"></div>' +
      '<div class="form-field" id="txPagoEmBox"><label class="form-label" for="txPagoEm">Data do pagamento</label><input type="date" class="form-input" id="txPagoEm"></div>' +
      '<div class="form-field"><label class="form-label" for="txConta">Conta bancária</label><select class="form-input" id="txConta"></select></div>' +
      '<div class="form-field"><label class="form-label" for="txContato" id="txContatoLbl">Cliente / fornecedor</label><input type="text" class="form-input" id="txContato" list="finListaContatos" maxlength="80" autocomplete="off" placeholder="Opcional"><datalist id="finListaContatos"></datalist></div>' +
      '<div class="form-field"><label class="form-label" for="txForma">Forma de pagamento</label><select class="form-input" id="txForma"><option value="">—</option>' + F.FORMAS.map(function (f) { return '<option>' + f + '</option>'; }).join('') + '</select></div>' +
      '<div class="form-field"><label class="form-label" for="txCentro">Centro de custo</label><input type="text" class="form-input" id="txCentro" list="finListaCentros" maxlength="60" autocomplete="off" placeholder="Opcional, ex.: Loja 1"><datalist id="finListaCentros"></datalist></div>' +
      '<div class="form-field" id="txRepetirBox"><label class="form-label" for="txRepetir">Repetir</label><select class="form-input" id="txRepetir"><option value="">Não repete</option><option value="parcelado">Parcelar o valor</option><option value="mensal">Repetir todo mês</option></select></div>' +
      '<div class="form-field span-2" id="txSerieBox" style="display:none"><label class="fin-check"><input type="checkbox" id="txSerie"> <span id="txSerieTxt">Aplicar também às próximas parcelas em aberto</span></label></div>' +
      '<div class="form-field" id="txVezesBox" style="display:none"><label class="form-label" for="txVezes" id="txVezesLbl">Quantas vezes</label><input type="number" class="form-input" id="txVezes" min="2" max="120" value="2"><span class="fin-sub" id="txVezesInfo"></span></div>';
    var notas = el('txNotes'); var ref = notas ? notas.closest('.form-field') : null;
    var wrap = document.createElement('div'); wrap.className = 'fin-extra'; wrap.innerHTML = html;
    if (ref) grid.insertBefore(wrap, ref); else grid.appendChild(wrap);

    var atualizar = function () {
      var pago = el('txStatus').value === 'pago';
      el('txPagoEmBox').style.display = pago ? '' : 'none';
      var rep = el('txRepetir').value;
      el('txVezesBox').style.display = rep ? '' : 'none';
      el('txVezesLbl').textContent = rep === 'parcelado' ? 'Número de parcelas' : 'Repetir por quantos meses';
      var v = num(el('txAmount').value), n = Math.max(2, parseInt(el('txVezes').value || '2', 10));
      el('txVezesInfo').textContent = rep === 'parcelado' && v > 0 ? n + 'x de ' + moeda(r2(v / n)) + ' (último ajusta centavos)' : rep === 'mensal' && v > 0 ? n + ' lançamentos de ' + moeda(v) : '';
    };
    ['txStatus', 'txRepetir', 'txVezes', 'txAmount'].forEach(function (id) { el(id).addEventListener('input', atualizar); el(id).addEventListener('change', atualizar); });
    el('txDate').addEventListener('change', function () { if (!el('txEditId').value && el('txVenc').dataset.mexeu !== '1') el('txVenc').value = el('txDate').value; });
    el('txVenc').addEventListener('change', function () { el('txVenc').dataset.mexeu = '1'; });
    var sugerir = function () {
      var tipo = el('txType').value, texto = el('txContato').value || el('txDesc').value;
      if (el('txEditId').value) return;
      var cat = F.sugerir(texto, tipo);
      if (cat && el('txCategory').dataset.mexeu !== '1') {
        var sel = el('txCategory');
        if (![].some.call(sel.options, function (o) { return o.value === cat; })) sel.add(new Option(cat, cat));
        sel.value = cat; sel.classList.add('fin-sugerida'); toast('Categoria sugerida: ' + cat, 'info');
      }
    };
    el('txDesc').addEventListener('blur', sugerir);
    el('txContato').addEventListener('blur', sugerir);
    el('txCategory').addEventListener('change', function () { el('txCategory').dataset.mexeu = '1'; });
    F._atualizarForm = atualizar;
  };

  F.preencherFormulario = function (tx, opcoes) {
    opcoes = opcoes || {};
    F.ampliarFormulario();
    if (!el('txStatus')) return;
    var s = st();
    el('txConta').innerHTML = s.contas.map(function (c) { return '<option value="' + esc(c.id) + '">' + esc(c.nome) + '</option>'; }).join('');
    var contatos = {}, centros = {};
    s.transactions.forEach(function (t) { if (t.contato) contatos[t.contato] = 1; if (t.centroCusto) centros[t.centroCusto] = 1; });
    Object.keys(s.contatos || {}).forEach(function (n) { contatos[n] = 1; });
    el('finListaContatos').innerHTML = Object.keys(contatos).sort().map(function (n) { return '<option value="' + esc(n) + '">'; }).join('');
    el('finListaCentros').innerHTML = Object.keys(centros).sort().map(function (n) { return '<option value="' + esc(n) + '">'; }).join('');
    var tipo = el('txType').value;
    el('txContatoLbl').textContent = tipo === 'RECEITA' ? 'Cliente' : 'Fornecedor';
    el('txCategory').dataset.mexeu = ''; el('txVenc').dataset.mexeu = '';
    if (tx) {
      el('txStatus').value = tx.status || 'pago';
      el('txVenc').value = tx.vencimento || tx.date;
      el('txPagoEm').value = tx.pagoEm || F.hoje();
      el('txConta').value = tx.contaId || s.contas[0].id;
      el('txContato').value = tx.contato || '';
      el('txForma').value = tx.forma || '';
      el('txCentro').value = tx.centroCusto || '';
      el('txRepetir').value = ''; el('txRepetirBox').style.display = 'none';
      var prox = tx.grupo ? s.transactions.filter(function (x) { return x.grupo === tx.grupo && x.id !== tx.id && !F.estaPago(x) && (x.vencimento || '') > (tx.vencimento || ''); }) : [];
      el('txSerieBox').style.display = prox.length ? '' : 'none'; el('txSerie').checked = false;
      el('txSerieTxt').textContent = 'Aplicar descrição, valor, categoria, cliente e conta também às próximas ' + prox.length + ' parcela(s) em aberto';
    } else {
      el('txSerieBox').style.display = 'none'; el('txSerie').checked = false;
      var hoje = F.hoje();
      el('txDate').value = opcoes.data || hoje;
      el('txStatus').value = opcoes.status || 'pago';
      el('txVenc').value = opcoes.vencimento || opcoes.data || hoje;
      el('txPagoEm').value = hoje;
      el('txConta').value = s.contas[0].id;
      el('txContato').value = opcoes.contato || ''; el('txForma').value = ''; el('txCentro').value = '';
      el('txRepetir').value = ''; el('txVezes').value = 2; el('txRepetirBox').style.display = '';
    }
    F._atualizarForm && F._atualizarForm();
  };

  // Lê o formulário e devolve a lista de lançamentos a gravar (1 ou vários, se repetir)
  F.lerFormulario = function (base) {
    var g = function (id) { var e = el(id); return e ? e.value : ''; };
    var status = g('txStatus') || 'pago';
    var venc = g('txVenc') || base.date;
    var extra = {
      status: status, vencimento: venc, pagoEm: status === 'pago' ? (g('txPagoEm') || F.hoje()) : '',
      contaId: g('txConta') || (st().contas[0] || {}).id, contato: g('txContato').trim(), forma: g('txForma'), centroCusto: g('txCentro').trim()
    };
    var rep = g('txRepetir'), n = Math.min(120, Math.max(2, parseInt(g('txVezes') || '2', 10)));
    if (!rep || base.editando) return [Object.assign({}, base, extra)];
    var grupo = novoId(), lista = [];
    var valorParc = rep === 'parcelado' ? Math.floor(base.amount / n * 100) / 100 : base.amount;
    for (var i = 0; i < n; i++) {
      var valor = rep === 'parcelado' && i === n - 1 ? r2(base.amount - valorParc * (n - 1)) : valorParc;
      var primeiro = i === 0;
      lista.push(Object.assign({}, base, extra, {
        id: primeiro ? base.id : novoId(),
        amount: valor,
        date: rep === 'mensal' ? F.addMeses(base.date, i) : base.date,
        vencimento: F.addMeses(venc, i),
        status: primeiro ? status : 'pendente',
        pagoEm: primeiro && status === 'pago' ? extra.pagoEm : '',
        grupo: grupo, parcela: (i + 1) + '/' + n,
        attachmentUrl: primeiro ? base.attachmentUrl : ''
      }));
    }
    return lista;
  };

  // ════════════════ MODAIS PRÓPRIOS ════════════════
  function modal(id, titulo, corpo, rodape, largo) {
    var m = el(id);
    if (!m) {
      m = document.createElement('div'); m.className = 'modal-overlay'; m.id = id; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true');
      document.body.appendChild(m);
      m.addEventListener('click', function (e) { if (e.target === m) fechar(id); });
    }
    m.innerHTML = '<div class="modal-box"' + (largo ? ' style="max-width:720px"' : '') + '><div class="modal-head"><div><h2 class="modal-title">' + titulo + '</h2></div><button class="modal-x" aria-label="Fechar" onclick="fin.fechar(\'' + id + '\')">✕</button></div><div style="padding:0 24px 8px">' + corpo + '</div><div class="modal-foot">' + (rodape || '') + '</div></div>';
    if (window.openModalEl) window.openModalEl(id); else { m.style.display = 'flex'; m.classList.add('open'); }
    return m;
  }
  function fechar(id) { if (window.closeModal) window.closeModal(id); else { var m = el(id); if (m) { m.classList.remove('open'); m.style.display = 'none'; } } }
  F.fechar = fechar;
  F.modal = modal;

  F.tx = function (id) { return st().transactions.find(function (t) { return t.id === id; }); };

  F.novo = function (tipo, opcoes) {
    if (window.openModal) window.openModal(tipo === 'RECEITA' ? 'receita' : 'despesa', '', opcoes || {});
  };

  // Dar baixa (pagar / receber), com juros/multa, desconto e baixa parcial
  F.baixar = function (id) {
    var t = F.tx(id); if (!t) return;
    var rec = t.type === 'RECEITA';
    var contas = st().contas.map(function (c) { return '<option value="' + esc(c.id) + '"' + (c.id === t.contaId ? ' selected' : '') + '>' + esc(c.nome) + '</option>'; }).join('');
    modal('finBaixaModal', (rec ? '✅ Registrar recebimento' : '✅ Registrar pagamento'),
      '<p style="color:var(--text-muted);margin-bottom:14px">' + esc(t.desc) + (t.contato ? ' · ' + esc(t.contato) : '') + ' · ' + moeda(t.amount) + ' · vencimento ' + F.dataBR(t.vencimento) + '</p>' +
      '<div class="form-grid">' +
      '<div class="form-field"><label class="form-label" for="finBxData">Data do ' + (rec ? 'recebimento' : 'pagamento') + '</label><input type="date" class="form-input" id="finBxData" value="' + F.hoje() + '"></div>' +
      '<div class="form-field"><label class="form-label" for="finBxConta">Conta</label><select class="form-input" id="finBxConta">' + contas + '</select></div>' +
      '<div class="form-field"><label class="form-label" for="finBxJuros">Juros e multa (R$)</label><input type="number" step="0.01" min="0" class="form-input" id="finBxJuros" value="0"></div>' +
      '<div class="form-field"><label class="form-label" for="finBxDesc">Desconto (R$)</label><input type="number" step="0.01" min="0" class="form-input" id="finBxDesc" value="0"></div>' +
      '<div class="form-field"><label class="form-label" for="finBxValor">Valor ' + (rec ? 'recebido' : 'pago') + ' (R$)</label><input type="number" step="0.01" min="0.01" class="form-input" id="finBxValor" value="' + t.amount + '"><span class="fin-sub" id="finBxInfo"></span></div>' +
      '<div class="form-field"><label class="form-label" for="finBxForma">Forma</label><select class="form-input" id="finBxForma"><option value="">—</option>' + F.FORMAS.map(function (f) { return '<option' + (f === t.forma ? ' selected' : '') + '>' + f + '</option>'; }).join('') + '</select></div>' +
      '</div>',
      '<button class="btn-ghost" onclick="fin.fechar(\'finBaixaModal\')">Cancelar</button><button class="btn-primary" onclick="fin.confirmarBaixa(\'' + esc(t.id) + '\')">Confirmar</button>');
    var atualizar = function (mexeuValor) {
      var j = num(el('finBxJuros').value), d = num(el('finBxDesc').value), devido = r2(t.amount + j - d);
      if (!mexeuValor) el('finBxValor').value = devido.toFixed(2);
      var v = num(el('finBxValor').value);
      el('finBxInfo').textContent = v < r2(t.amount - d) - 0.004 ? 'Baixa parcial: ' + moeda(r2(t.amount - d - v)) + ' ficam em aberto com o mesmo vencimento.' : (j ? 'Os juros entram como lançamento separado, no resultado financeiro.' : '');
    };
    ['finBxJuros', 'finBxDesc'].forEach(function (i) { el(i).addEventListener('input', function () { atualizar(false); }); });
    el('finBxValor').addEventListener('input', function () { atualizar(true); });
    atualizar(true);
  };
  F.confirmarBaixa = function (id) {
    var t = F.tx(id); if (!t) return;
    var pago = r2(num(el('finBxValor').value)), juros = r2(num(el('finBxJuros').value)), desc = r2(num(el('finBxDesc').value));
    if (!(pago > 0)) return toast('Informe o valor.', 'error');
    if (desc >= t.amount) return toast('O desconto não pode ser maior que o valor.', 'error');
    var data = el('finBxData').value || F.hoje(), conta = el('finBxConta').value, forma = el('finBxForma').value || t.forma || '';
    var antes = Object.assign({}, t), principal = r2(t.amount - desc), rec = t.type === 'RECEITA', msg;
    if (pago < principal - 0.004) {
      // Baixa parcial: o que foi pago baixa; o restante continua em aberto
      var resto = r2(principal - pago);
      var novo = Object.assign({}, t, { id: novoId(), amount: resto, status: 'pendente', pagoEm: '', parcela: (t.parcela ? t.parcela + ' ' : '') + '(saldo)', grupo: t.grupo || t.id, fitid: '', cobradoEm: '', atualizadoEm: Date.now() });
      delete novo.valorOriginal;
      st().transactions.push(novo);
      t.valorOriginal = t.valorOriginal || t.amount; t.amount = pago; t.grupo = t.grupo || t.id;
      msg = 'Baixa parcial: ' + moeda(pago) + ' ' + (rec ? 'recebido' : 'pago') + ', ' + moeda(resto) + ' em aberto.';
    } else {
      if (desc) { t.valorOriginal = t.valorOriginal || t.amount; t.amount = principal; t.desconto = desc; }
      var extra = r2(pago - principal);
      if (extra > 0.004) {
        // Juros e multa viram um lançamento próprio (resultado financeiro no DRE)
        st().transactions.push({ id: novoId(), type: t.type, desc: 'Juros/multa — ' + t.desc, amount: extra, category: rec ? 'Rendimentos Financeiros' : 'Tarifas Bancárias e Juros', date: data, vencimento: data, status: 'pago', pagoEm: data, contaId: conta, contato: t.contato || '', forma: forma, vinculo: t.id, atualizadoEm: Date.now() });
      }
      msg = rec ? 'Recebimento registrado.' : 'Pagamento registrado.';
    }
    t.status = 'pago'; t.pagoEm = data; t.contaId = conta; t.forma = forma; t.atualizadoEm = Date.now();
    if (window.logAudit) window.logAudit('update', 'transaction', t.id, 'Baixa de "' + t.desc + '" (' + moeda(pago) + ')', antes, t);
    salvar(); fechar('finBaixaModal'); toast(msg);
    F.atualizarTudo();
  };
  // Transferência entre contas: sai de uma, entra na outra, fora do resultado
  F.transferir = function () {
    var contas = st().contas;
    if (contas.length < 2) { toast('Cadastre pelo menos duas contas para transferir.', 'error'); return F.editarConta(); }
    var op = function (sel) { return contas.map(function (c, i) { return '<option value="' + esc(c.id) + '"' + (i === sel ? ' selected' : '') + '>' + esc(c.nome) + '</option>'; }).join(''); };
    modal('finTransfModal', '🔁 Transferência entre contas',
      '<div class="form-grid"><div class="form-field"><label class="form-label" for="finTrDe">De</label><select class="form-input" id="finTrDe">' + op(0) + '</select></div>' +
      '<div class="form-field"><label class="form-label" for="finTrPara">Para</label><select class="form-input" id="finTrPara">' + op(1) + '</select></div>' +
      '<div class="form-field"><label class="form-label" for="finTrValor">Valor (R$)</label><input type="number" step="0.01" min="0.01" class="form-input" id="finTrValor"></div>' +
      '<div class="form-field"><label class="form-label" for="finTrData">Data</label><input type="date" class="form-input" id="finTrData" value="' + F.hoje() + '"></div>' +
      '<div class="form-field span-2"><span class="fin-sub">Não entra no DRE: é dinheiro mudando de conta.</span></div></div>',
      '<button class="btn-ghost" onclick="fin.fechar(\'finTransfModal\')">Cancelar</button><button class="btn-primary" onclick="fin.confirmarTransferencia()">Transferir</button>');
  };
  F.confirmarTransferencia = function () {
    var de = el('finTrDe').value, para = el('finTrPara').value, valor = r2(num(el('finTrValor').value)), data = el('finTrData').value || F.hoje();
    if (de === para) return toast('Escolha contas diferentes.', 'error');
    if (!(valor > 0)) return toast('Informe o valor.', 'error');
    var id = novoId(), nDe = (F.contaPorId(de) || {}).nome, nPara = (F.contaPorId(para) || {}).nome, agora = Date.now();
    var base = { amount: valor, category: 'Transferência entre Contas', date: data, vencimento: data, status: 'pago', pagoEm: data, transferenciaId: id, atualizadoEm: agora };
    st().transactions.push(Object.assign({ id: novoId(), type: 'DESPESA', desc: 'Transferência para ' + nPara, contaId: de }, base));
    st().transactions.push(Object.assign({ id: novoId(), type: 'RECEITA', desc: 'Transferência de ' + nDe, contaId: para }, base));
    salvar(); fechar('finTransfModal'); toast('Transferência registrada.'); F.atualizarTudo();
  };
  // Duplicar: abre um lançamento novo com os mesmos dados, para o mês seguinte
  F.duplicar = function (id) {
    var t = F.tx(id); if (!t) return;
    F.novo(t.type, { status: 'pendente', data: F.addMeses(t.date, 1), vencimento: F.addMeses(t.vencimento || t.date, 1), contato: t.contato || '' });
    setTimeout(function () {
      el('txDesc').value = t.desc; el('txAmount').value = t.amount; el('txNotes').value = t.notes || '';
      var sel = el('txCategory'); if (![].some.call(sel.options, function (o) { return o.value === t.category; })) sel.add(new Option(t.category, t.category));
      sel.value = t.category; sel.dataset.mexeu = '1';
      el('txConta').value = t.contaId; el('txForma').value = t.forma || ''; el('txCentro').value = t.centroCusto || '';
      el('txModalSubtitle').textContent = 'Cópia de um lançamento. Ajuste e salve.';
      F._atualizarForm && F._atualizarForm();
    }, 60);
  };
  // Recibo para imprimir ou salvar em PDF
  F.extenso = function (v) {
    var u = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
    var d = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
    var c = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];
    var ate999 = function (n) {
      if (n === 100) return 'cem';
      var partes = [], ce = Math.floor(n / 100), r = n % 100;
      if (ce) partes.push(c[ce]);
      if (r < 20) { if (r) partes.push(u[r]); } else { partes.push(d[Math.floor(r / 10)] + (r % 10 ? ' e ' + u[r % 10] : '')); }
      return partes.join(' e ');
    };
    var inteiro = Math.floor(v), cent = Math.round((v - inteiro) * 100);
    var grupos = [], n = inteiro;
    while (n > 0) { grupos.push(n % 1000); n = Math.floor(n / 1000); }
    var nomes = [['', ''], ['mil', 'mil'], ['milhão', 'milhões'], ['bilhão', 'bilhões']], txt = [];
    for (var i = grupos.length - 1; i >= 0; i--) {
      var g = grupos[i]; if (!g) continue;
      var parte = (i === 1 && g === 1) ? 'mil' : ate999(g) + (i ? ' ' + nomes[i][g > 1 ? 1 : 0] : '');
      txt.push(parte);
    }
    var reais = txt.length ? txt.join(txt.length > 1 && grupos[0] && (grupos[0] < 100 || grupos[0] % 100 === 0) ? ' e ' : ', ').replace(/, (?=[^,]*$)/, ' e ') : 'zero';
    var res = reais + (inteiro === 1 ? ' real' : ' reais');
    if (/(milhão|milhões|bilhão|bilhões)$/.test(reais)) res = reais + ' de reais';
    if (cent) res += ' e ' + ate999(cent) + (cent === 1 ? ' centavo' : ' centavos');
    return res;
  };
  F.recibo = function (id) {
    var t = F.tx(id); if (!t || !F.estaPago(t)) return;
    var s = st().settings || {}, emp = s.company || s.name || '', doc = s.cnpj || '', rec = t.type === 'RECEITA';
    var cont = (st().contatos || {})[t.contato] || {};
    var quem = rec ? (t.contato || '________________') : emp, para = rec ? emp : (t.contato || '________________');
    var w = window.open('', '_blank');
    if (!w) return toast('Libere as janelas do navegador para gerar o recibo.', 'error');
    w.document.write('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Recibo</title><style>body{font-family:Arial,sans-serif;max-width:720px;margin:40px auto;padding:0 24px;color:#111}h1{text-align:center;letter-spacing:.2em}.v{font-size:22px;font-weight:bold;text-align:right;border:2px solid #111;padding:8px 14px;display:inline-block;float:right}p{line-height:1.8;font-size:15px;clear:both}.ass{margin-top:70px;text-align:center}.ass div{border-top:1px solid #111;width:60%;margin:0 auto;padding-top:6px}button{margin-top:30px}@media print{button{display:none}}</style></head><body>' +
      '<h1>RECIBO</h1><div class="v">' + esc(moeda(t.amount)) + '</div>' +
      '<p>Recebi(emos) de <b>' + esc(quem) + '</b>' + (rec && cont.documento ? ' (CPF/CNPJ ' + esc(cont.documento) + ')' : '') + ' a importância de <b>' + esc(F.extenso(t.amount)) + '</b>, referente a <b>' + esc(t.desc) + (t.parcela ? ' (parcela ' + esc(t.parcela) + ')' : '') + '</b>' + (t.forma ? ', pago via ' + esc(t.forma) : '') + '.</p>' +
      '<p>Para clareza, firmo(amos) o presente recibo.</p><p style="text-align:right">' + F.dataBR(t.pagoEm) + '</p>' +
      '<div class="ass"><div>' + esc(para) + (rec && doc ? '<br>CNPJ ' + esc(doc) : '') + '</div></div><button onclick="print()">Imprimir ou salvar em PDF</button></body></html>');
    w.document.close();
  };
  F.estornar = function (id) {
    var t = F.tx(id); if (!t) return;
    if (!confirm('Voltar "' + t.desc + '" para em aberto?')) return;
    t.status = 'pendente'; t.pagoEm = ''; t.atualizadoEm = Date.now();
    if (t.valorOriginal) { t.amount = t.valorOriginal; delete t.valorOriginal; }
    salvar(); F.atualizarTudo(); toast('Lançamento voltou para em aberto.', 'warn');
  };
  F.baixarSelecionados = function () {
    var ids = [].map.call(document.querySelectorAll('.fin-sel:checked'), function (c) { return c.value; });
    if (!ids.length) return toast('Marque os lançamentos primeiro.', 'error');
    if (!confirm('Dar baixa em ' + ids.length + ' lançamento(s) com a data de hoje?')) return;
    ids.forEach(function (id) { var t = F.tx(id); if (t && t.status !== 'pago') { t.status = 'pago'; t.pagoEm = F.hoje(); t.atualizadoEm = Date.now(); } });
    salvar(); F.atualizarTudo(); toast(ids.length + ' baixa(s) registrada(s).');
  };
  F.excluir = function (id) {
    var t = F.tx(id); if (!t) return;
    if (t.transferenciaId) {
      if (!confirm('Excluir a transferência (sai das duas contas)?')) return;
      st().transactions = st().transactions.filter(function (x) { return x.transferenciaId !== t.transferenciaId; });
      salvar(); F.atualizarTudo(); return toast('Transferência excluída.', 'warn');
    }
    var doGrupo = t.grupo ? st().transactions.filter(function (x) { return x.grupo === t.grupo && x.status !== 'pago' && x.id !== t.id; }) : [];
    var msg = 'Excluir "' + t.desc + '"' + (t.parcela ? ' (' + t.parcela + ')' : '') + '?';
    if (!confirm(msg)) return;
    var apagar = [t.id];
    if (doGrupo.length && confirm('Excluir também as outras ' + doGrupo.length + ' parcela(s) em aberto desta série?')) apagar = apagar.concat(doGrupo.map(function (x) { return x.id; }));
    st().transactions = st().transactions.filter(function (x) { return apagar.indexOf(x.id) === -1; });
    if (window.logAudit) window.logAudit('delete', 'transaction', t.id, 'Exclusão de "' + t.desc + '"', t, null);
    salvar(); F.atualizarTudo(); toast('Lançamento excluído.', 'warn');
  };

  // Cobrança por Pix + WhatsApp
  F.cobrar = function (id) {
    var t = F.tx(id); if (!t) return;
    var pix = (st().settings.pix = st().settings.pix || {});
    var contato = (st().contatos[t.contato || ''] || {});
    var tipos = [['cpfcnpj', 'CPF ou CNPJ'], ['celular', 'Celular'], ['email', 'E-mail'], ['aleatoria', 'Chave aleatória']];
    var corpo = '' +
      '<p style="color:var(--text-muted);margin-bottom:12px">' + esc(t.desc) + (t.contato ? ' · <b>' + esc(t.contato) + '</b>' : '') + ' · <b>' + moeda(t.amount) + '</b> · vence ' + F.dataBR(t.vencimento) + '</p>' +
      '<details id="finPixCfg"' + (pix.chave ? '' : ' open') + ' style="margin-bottom:14px"><summary style="cursor:pointer;color:var(--gold);font-size:13px">Sua chave Pix de recebimento</summary>' +
      '<div class="form-grid" style="margin-top:10px">' +
      '<div class="form-field"><label class="form-label" for="finPixTipo">Tipo de chave</label><select class="form-input" id="finPixTipo">' + tipos.map(function (x) { return '<option value="' + x[0] + '"' + (pix.tipo === x[0] ? ' selected' : '') + '>' + x[1] + '</option>'; }).join('') + '</select></div>' +
      '<div class="form-field"><label class="form-label" for="finPixChave">Chave</label><input class="form-input" id="finPixChave" value="' + esc(pix.chaveDigitada || pix.chave || '') + '" autocomplete="off"></div>' +
      '<div class="form-field"><label class="form-label" for="finPixNome">Nome do recebedor</label><input class="form-input" id="finPixNome" maxlength="25" value="' + esc(pix.nome || st().settings.company || st().settings.name || '') + '"></div>' +
      '<div class="form-field"><label class="form-label" for="finPixCidade">Cidade</label><input class="form-input" id="finPixCidade" maxlength="15" value="' + esc(pix.cidade || 'Brasilia') + '"></div>' +
      '</div><button class="fin-btn gold" style="margin-top:8px" onclick="fin.salvarPix(\'' + esc(t.id) + '\')">Salvar chave e gerar</button></details>' +
      '<div id="finPixArea"></div>' +
      '<div class="form-grid" style="margin-top:14px">' +
      '<div class="form-field"><label class="form-label" for="finWhats">WhatsApp do cliente</label><input class="form-input" id="finWhats" placeholder="(61) 99999-9999" value="' + esc(contato.telefone || '') + '"></div>' +
      '<div class="form-field" style="justify-content:flex-end"><button class="btn-primary" style="width:100%" onclick="fin.enviarWhats(\'' + esc(t.id) + '\')">💬 Enviar cobrança no WhatsApp</button></div>' +
      '</div>';
    modal('finCobrancaModal', '💠 Cobrar por Pix', corpo, '<button class="btn-ghost" onclick="fin.fechar(\'finCobrancaModal\')">Fechar</button>', true);
    if (pix.chave) F.mostrarPix(t.id);
  };
  F.salvarPix = function (id) {
    var tipo = el('finPixTipo').value, digitada = el('finPixChave').value;
    var chave = F.normalizarChavePix(tipo, digitada);
    var erro = F.validarChavePix(tipo, chave);
    if (erro) return toast(erro, 'error');
    st().settings.pix = { tipo: tipo, chave: chave, chaveDigitada: digitada, nome: el('finPixNome').value.trim(), cidade: el('finPixCidade').value.trim() || 'Brasilia' };
    salvar();
    var d = el('finPixCfg'); if (d) d.open = false;
    F.mostrarPix(id);
  };
  F.codigoPix = function (t) {
    var pix = st().settings.pix || {};
    if (!pix.chave) return '';
    return F.pixPayload({ chave: pix.chave, nome: pix.nome, cidade: pix.cidade, valor: t.amount, txid: 'MAXCFO' + String(t.id).replace(/[^A-Za-z0-9]/g, '').slice(-15), descricao: t.parcela ? 'Parcela ' + t.parcela : '' });
  };
  F.mostrarPix = function (id) {
    var t = F.tx(id), area = el('finPixArea'); if (!t || !area) return;
    var codigo = F.codigoPix(t);
    area.innerHTML = '<div class="fin-pix"><div class="qr" id="finQr">Gerando…</div><div><label class="form-label" for="finPixCodigo">Pix copia e cola</label><textarea class="form-input" id="finPixCodigo" readonly>' + esc(codigo) + '</textarea>' +
      '<div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap"><button class="fin-btn gold" onclick="fin.copiar(\'finPixCodigo\')">Copiar código</button><button class="fin-btn" onclick="fin.baixarQR(\'' + esc(t.id) + '\')">Baixar QR Code</button></div>' +
      '<p class="fin-sub" style="margin-top:8px">QR Code estático com o valor de ' + moeda(t.amount) + '. Quando o cliente pagar, registre o recebimento para baixar a conta.</p></div></div>';
    F.carregarQR().then(function () { var q = el('finQr'); if (q) q.innerHTML = F.qrSVG(codigo, 190) || '<span style="color:#000;font-size:12px;padding:8px;display:block">Use o código ao lado.</span>'; });
  };
  F.baixarQR = function (id) {
    var t = F.tx(id); if (!t) return;
    var svg = F.qrSVG(F.codigoPix(t), 600); if (!svg) return;
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' })); a.download = 'pix-' + (t.contato || t.desc).replace(/[^\w]+/g, '-').slice(0, 30) + '.svg'; a.click();
  };
  F.copiar = function (idCampo) {
    var c = el(idCampo); if (!c) return;
    var texto = c.value || c.textContent;
    (navigator.clipboard ? navigator.clipboard.writeText(texto) : Promise.reject()).then(function () { toast('Copiado!'); }).catch(function () { c.select && c.select(); document.execCommand('copy'); toast('Copiado!'); });
  };
  F.mensagemCobranca = function (t) {
    var pix = st().settings.pix || {}, codigo = F.codigoPix(t);
    var quem = (pix.nome || st().settings.company || '').trim();
    var venc = F.situacao(t) === 'vencido' ? 'que venceu em ' + F.dataBR(t.vencimento) : 'com vencimento em ' + F.dataBR(t.vencimento);
    return 'Olá' + (t.contato ? ', ' + t.contato.split(' ')[0] : '') + '! Tudo bem?\n\n' +
      'Segue a cobrança de *' + t.desc + '*' + (t.parcela ? ' (parcela ' + t.parcela + ')' : '') + ', no valor de *' + moeda(t.amount) + '*, ' + venc + '.\n\n' +
      (codigo ? 'Para pagar, use o Pix copia e cola abaixo:\n\n' + codigo + '\n\n' : '') +
      'Qualquer dúvida, é só responder esta mensagem.' + (quem ? '\n\n' + quem : '');
  };
  F.enviarWhats = function (id) {
    var t = F.tx(id); if (!t) return;
    var tel = String(el('finWhats').value || '').replace(/\D/g, '');
    if (tel.length < 10) return toast('Informe o WhatsApp com DDD.', 'error');
    if (tel.indexOf('55') !== 0 || tel.length <= 11) tel = '55' + tel;
    if (t.contato) { st().contatos[t.contato] = Object.assign({}, st().contatos[t.contato], { telefone: el('finWhats').value }); }
    t.cobradoEm = F.hoje(); salvar();
    window.open('https://wa.me/' + tel + '?text=' + encodeURIComponent(F.mensagemCobranca(t)), '_blank', 'noopener');
  };

  // Contas bancárias
  F.editarConta = function (id) {
    var c = id ? F.contaPorId(id) : null;
    var saldoHoje = c ? F.saldoConta(c) : 0;
    modal('finContaModal', c ? '🏦 Editar conta' : '🏦 Nova conta',
      '<div class="form-grid">' +
      '<div class="form-field span-2"><label class="form-label" for="finCtNome">Nome</label><input class="form-input" id="finCtNome" maxlength="40" placeholder="Ex.: Itaú PJ, Caixa da loja" value="' + esc(c ? c.nome : '') + '"></div>' +
      '<div class="form-field"><label class="form-label" for="finCtTipo">Tipo</label><select class="form-input" id="finCtTipo">' + F.TIPOS_CONTA.map(function (x) { return '<option' + (c && c.tipo === x ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select></div>' +
      '<div class="form-field"><label class="form-label" for="finCtSaldo">Saldo atual do extrato (R$)</label><input type="number" step="0.01" class="form-input" id="finCtSaldo" value="' + (c ? saldoHoje : '') + '" placeholder="0,00"></div>' +
      '<div class="form-field"><label class="form-label" for="finCtData">Data desse saldo</label><input type="date" class="form-input" id="finCtData" value="' + F.hoje() + '"></div>' +
      '<div class="form-field span-2"><span class="fin-sub">Digite o saldo que aparece no banco agora. Daqui em diante, cada pagamento ou recebimento registrado nesta conta atualiza o saldo sozinho.</span></div>' +
      '</div>',
      (c && st().contas.length > 1 ? '<button class="btn-ghost" style="margin-right:auto;color:var(--danger)" onclick="fin.removerConta(\'' + esc(c.id) + '\')">Remover</button>' : '') +
      '<button class="btn-ghost" onclick="fin.fechar(\'finContaModal\')">Cancelar</button><button class="btn-primary" onclick="fin.salvarConta(\'' + (c ? esc(c.id) : '') + '\')">Salvar</button>');
  };
  F.salvarConta = function (id) {
    var nome = el('finCtNome').value.trim(); if (!nome) return toast('Dê um nome para a conta.', 'error');
    var c = id ? F.contaPorId(id) : null;
    if (!c) { c = { id: 'conta-' + novoId() }; st().contas.push(c); }
    c.nome = nome; c.tipo = el('finCtTipo').value; c.saldoInicial = r2(num(el('finCtSaldo').value)); c.dataSaldo = el('finCtData').value || F.hoje(); c.saldoInformadoEm = Date.now();
    salvar(); fechar('finContaModal'); F.atualizarTudo(); toast('Conta salva.');
  };
  F.removerConta = function (id) {
    var s = st(); if (s.contas.length < 2) return;
    var usados = s.transactions.filter(function (t) { return t.contaId === id; }).length;
    var destino = s.contas.find(function (c) { return c.id !== id; });
    if (!confirm('Remover a conta?' + (usados ? ' Os ' + usados + ' lançamentos dela vão para "' + destino.nome + '".' : ''))) return;
    s.transactions.forEach(function (t) { if (t.contaId === id) t.contaId = destino.id; });
    s.contas = s.contas.filter(function (c) { return c.id !== id; });
    salvar(); fechar('finContaModal'); F.atualizarTudo();
  };

  // ════════════════ CRIAR LANÇAMENTOS A PARTIR DE OUTROS MÓDULOS ════════════════
  F.criarLancamento = function (o) {
    var t = Object.assign({ id: novoId(), status: 'pendente', pagoEm: '', contaId: (st().contas[0] || {}).id, notes: '', category: 'Outros', atualizadoEm: Date.now() }, o);
    t.amount = r2(num(t.amount));
    if (!t.contaId) t.contaId = (st().contas[0] || {}).id;
    if (!t.date) t.date = F.hoje();
    if (!t.vencimento) t.vencimento = t.date;
    if (t.status === 'pago' && !t.pagoEm) t.pagoEm = t.vencimento;
    st().transactions.push(t);
    if (t.contato) F.registrarContato(t.contato, t.type);
    if (window.logAudit) window.logAudit('create', 'transaction', t.id, 'Lançamento "' + t.desc + '" criado', null, t);
    return t;
  };
  // Janela única para "faturar" (orçamento, OS, venda): vencimento, parcelas e conta → contas a receber
  F.faturar = function (o, aoConcluir) {
    F._faturamento = { o: o, cb: aoConcluir };
    var contas = st().contas.map(function (c) { return '<option value="' + esc(c.id) + '">' + esc(c.nome) + '</option>'; }).join('');
    var cats = (window.CATEGORIES[o.tipo || 'RECEITA'] || []).map(function (c) { return '<option' + (c === o.categoria ? ' selected' : '') + '>' + esc(c) + '</option>'; }).join('');
    modal('finFaturarModal', o.titulo || '💰 Gerar conta a receber',
      '<p style="color:var(--text-muted);margin-bottom:12px">' + esc(o.desc) + (o.contato ? ' · <b>' + esc(o.contato) + '</b>' : '') + ' · <b>' + moeda(o.valor) + '</b></p>' +
      '<div class="form-grid">' +
      '<div class="form-field"><label class="form-label" for="fatVenc">Primeiro vencimento</label><input type="date" class="form-input" id="fatVenc" value="' + (o.vencimento || F.addDias(F.hoje(), 7)) + '"></div>' +
      '<div class="form-field"><label class="form-label" for="fatParc">Parcelas</label><select class="form-input" id="fatParc">' + [1, 2, 3, 4, 5, 6, 10, 12].map(function (n) { return '<option value="' + n + '">' + (n === 1 ? 'À vista (1x)' : n + 'x de ' + moeda(r2(o.valor / n))) + '</option>'; }).join('') + '</select></div>' +
      '<div class="form-field"><label class="form-label" for="fatCat">Categoria</label><select class="form-input" id="fatCat">' + cats + '</select></div>' +
      '<div class="form-field"><label class="form-label" for="fatConta">Conta de ' + ((o.tipo || 'RECEITA') === 'RECEITA' ? 'recebimento' : 'pagamento') + '</label><select class="form-input" id="fatConta">' + contas + '</select></div>' +
      '<div class="form-field span-2"><label class="fin-check"><input type="checkbox" id="fatPago"> Já foi ' + ((o.tipo || 'RECEITA') === 'RECEITA' ? 'recebido' : 'pago') + ' (à vista, hoje)</label></div>' +
      '</div>',
      '<button class="btn-ghost" onclick="fin.fechar(\'finFaturarModal\')">Cancelar</button><button class="btn-primary" onclick="fin.confirmarFaturamento()">Gerar lançamento</button>');
  };
  F.confirmarFaturamento = function () {
    var f = F._faturamento; if (!f) return;
    var o = f.o, n = parseInt(el('fatParc').value, 10) || 1, venc = el('fatVenc').value || F.hoje(), pago = el('fatPago').checked;
    if (pago) n = 1;
    var grupo = n > 1 ? novoId() : '', base = Math.floor(o.valor / n * 100) / 100, ids = [];
    for (var i = 0; i < n; i++) {
      var t = F.criarLancamento({
        type: o.tipo || 'RECEITA', desc: o.desc, amount: i === n - 1 ? r2(o.valor - base * (n - 1)) : base, category: el('fatCat').value,
        date: o.competencia || F.hoje(), vencimento: pago ? F.hoje() : F.addMeses(venc, i), status: pago ? 'pago' : 'pendente', pagoEm: pago ? F.hoje() : '',
        contaId: el('fatConta').value, contato: o.contato || '', notes: o.notas || '', grupo: grupo, parcela: n > 1 ? (i + 1) + '/' + n : '', origem: o.origem || null
      });
      ids.push(t.id);
    }
    salvar(); fechar('finFaturarModal');
    toast(n > 1 ? n + ' parcelas criadas em Contas a receber.' : (pago ? 'Recebimento registrado.' : 'Conta a receber criada.'));
    if (f.cb) f.cb(ids);
    F._faturamento = null;
    F.atualizarTudo();
  };

  // ════════════════ CLIENTES E FORNECEDORES ════════════════
  F.contatos = function () { st().contatos = st().contatos || {}; return st().contatos; };
  F.registrarContato = function (nome, tipoTx) {
    nome = String(nome || '').trim(); if (!nome) return;
    var c = F.contatos(), tipo = tipoTx === 'RECEITA' ? 'cliente' : 'fornecedor';
    if (!c[nome]) c[nome] = { nome: nome, tipo: tipo, criadoEm: F.hoje() };
    else { if (!c[nome].nome) c[nome].nome = nome; if (c[nome].tipo && c[nome].tipo !== tipo && c[nome].tipo !== 'ambos') c[nome].tipo = 'ambos'; if (!c[nome].tipo) c[nome].tipo = tipo; }
  };
  F.todosContatos = function () {
    var c = F.contatos();
    st().transactions.forEach(function (t) { if (t.contato && !c[t.contato]) F.registrarContato(t.contato, t.type); });
    return Object.keys(c).map(function (n) { return Object.assign({ nome: n }, c[n]); }).sort(function (a, b) { return a.nome.localeCompare(b.nome, 'pt-BR'); });
  };
  var filtroCt = { tipo: 'todos', busca: '' };
  F.renderContatos = function () {
    var v = el('view-contatos'); if (!v) return;
    F.garantirModelo();
    var lista = F.todosContatos(), hoje = F.hoje(), ano = F.addMeses(hoje, -12);
    var resumo = {};
    st().transactions.forEach(function (t) {
      if (!t.contato) return;
      var r = resumo[t.contato] = resumo[t.contato] || { rec: 0, pag: 0, atraso: 0, mov12: 0, ultimo: '' };
      if (!F.estaPago(t)) { if (t.type === 'RECEITA') r.rec += t.amount; else r.pag += t.amount; if (F.situacao(t) === 'vencido') r.atraso += t.amount; }
      else if ((t.pagoEm || t.date) > ano) r.mov12 += t.amount;
      if ((t.date || '') > r.ultimo) r.ultimo = t.date;
    });
    var q = semAcento(filtroCt.busca).toLowerCase();
    var vis = lista.filter(function (c) {
      if (filtroCt.tipo !== 'todos' && c.tipo !== filtroCt.tipo && c.tipo !== 'ambos') return false;
      return !q || semAcento([c.nome, c.documento, c.email, c.telefone, c.cidade].join(' ')).toLowerCase().indexOf(q) > -1;
    });
    var nClientes = lista.filter(function (c) { return c.tipo !== 'fornecedor'; }).length, nForn = lista.filter(function (c) { return c.tipo !== 'cliente'; }).length;
    var linhas = vis.map(function (c, i) {
      var r = resumo[c.nome] || { rec: 0, pag: 0, atraso: 0, mov12: 0 };
      var rotulo = c.tipo === 'ambos' ? 'Cliente e fornecedor' : c.tipo === 'fornecedor' ? 'Fornecedor' : 'Cliente';
      return '<tr><td><div style="font-weight:700">' + esc(c.nome) + '</div><div class="fin-sub">' + esc([rotulo, c.documento ? docFmt(c.documento) : '', c.cidade].filter(Boolean).join(' · ')) + '</div></td>' +
        '<td class="fin-hide-sm">' + esc(c.telefone || '—') + (c.email ? '<div class="fin-sub">' + esc(c.email) + '</div>' : '') + '</td>' +
        '<td class="fin-pos">' + (r.rec ? moeda(r2(r.rec)) : '—') + '</td><td class="fin-neg">' + (r.pag ? moeda(r2(r.pag)) : '—') + '</td>' +
        '<td>' + (r.atraso ? '<span class="fin-sit atraso">' + moeda(r2(r.atraso)) + '</span>' : '—') + '</td>' +
        '<td class="fin-hide-sm">' + (r.mov12 ? moeda(r2(r.mov12)) : '—') + '</td>' +
        '<td><div class="fin-acoes"><button class="fin-btn" data-ct="' + i + '" onclick="fin.verContasDe(this)">Lançamentos</button><button class="fin-btn" data-ct="' + i + '" onclick="fin.editarContato(this)">✏️</button></div></td></tr>';
    }).join('');
    F._contatosVisiveis = vis;
    v.innerHTML = '<div class="page-header"><div class="page-header-text"><h1>Clientes e Fornecedores</h1><p class="page-subtitle">Cadastro com CPF/CNPJ, contato e o que cada um tem em aberto</p></div>' +
      '<div class="page-header-actions"><button class="btn-secondary" onclick="fin.exportarContatos()">⬇️ Exportar</button><button class="btn-primary" onclick="fin.editarContato()">+ Novo cadastro</button></div></div>' +
      '<div class="fin-kpis"><div class="fin-kpi2"><div class="v">' + nClientes + '</div><div class="l">Clientes</div></div><div class="fin-kpi2"><div class="v">' + nForn + '</div><div class="l">Fornecedores</div></div>' +
      '<div class="fin-kpi2"><div class="v fin-neg">' + moeda(r2(Object.keys(resumo).reduce(function (a, k) { return a + resumo[k].atraso; }, 0))) + '</div><div class="l">Em atraso (todos)</div></div></div>' +
      '<div class="card"><div class="fin-bar"><div class="fin-tabs">' + [['todos', 'Todos'], ['cliente', 'Clientes'], ['fornecedor', 'Fornecedores']].map(function (a) { return '<button class="fin-tab' + (filtroCt.tipo === a[0] ? ' on' : '') + '" onclick="fin.filtroContatos(\'tipo\',\'' + a[0] + '\')">' + a[1] + '</button>'; }).join('') + '</div>' +
      '<input class="search-sm" placeholder="Buscar nome, CNPJ, cidade…" value="' + esc(filtroCt.busca) + '" oninput="fin.filtroContatos(\'busca\',this.value)" aria-label="Buscar"></div>' +
      (vis.length ? '<div class="table-scroll"><table class="data-table"><thead><tr><th>Nome</th><th class="fin-hide-sm">Contato</th><th>A receber</th><th>A pagar</th><th>Atrasado</th><th class="fin-hide-sm">Movimentado 12 meses</th><th></th></tr></thead><tbody>' + linhas + '</tbody></table></div>'
        : '<div class="empty-block" style="padding:28px">Nenhum cadastro ainda. Eles também são criados sozinhos quando você informa o cliente ou o fornecedor num lançamento.</div>') + '</div>';
  };
  function docFmt(d) { d = String(d || '').replace(/\D/g, ''); return d.length === 14 ? d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') : d.length === 11 ? d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4') : d; }
  F.docFmt = docFmt;
  var tCt = null;
  F.filtroContatos = function (k, v) {
    filtroCt[k] = v; clearTimeout(tCt);
    tCt = setTimeout(function () { F.renderContatos(); if (k === 'busca') { var i = document.querySelector('#view-contatos .search-sm'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } } }, k === 'busca' ? 250 : 0);
  };
  F.verContasDe = function (btn) { var c = (F._contatosVisiveis || [])[+btn.dataset.ct]; if (c) F.verContas(c.nome, 'todas'); };
  F.editarContato = function (btn) {
    var c = btn && btn.dataset ? (F._contatosVisiveis || [])[+btn.dataset.ct] : null;
    F._contatoEditando = c ? c.nome : null;
    c = c || { tipo: 'cliente' };
    modal('finContatoModal', c.nome ? '✏️ Editar cadastro' : '👥 Novo cliente ou fornecedor',
      '<div class="form-grid">' +
      '<div class="form-field"><label class="form-label" for="ctDoc">CPF ou CNPJ</label><input class="form-input" id="ctDoc" maxlength="18" value="' + esc(docFmt(c.documento)) + '" placeholder="Com CNPJ, busca os dados na Receita"></div>' +
      '<div class="form-field"><label class="form-label" for="ctTipo">Tipo</label><select class="form-input" id="ctTipo">' + [['cliente', 'Cliente'], ['fornecedor', 'Fornecedor'], ['ambos', 'Cliente e fornecedor']].map(function (o) { return '<option value="' + o[0] + '"' + (c.tipo === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></div>' +
      '<div class="form-field span-2"><label class="form-label" for="ctNome">Nome *</label><input class="form-input" id="ctNome" maxlength="80" value="' + esc(c.nome || '') + '"></div>' +
      '<div class="form-field"><label class="form-label" for="ctTel">WhatsApp / telefone</label><input class="form-input" id="ctTel" maxlength="20" value="' + esc(c.telefone || '') + '"></div>' +
      '<div class="form-field"><label class="form-label" for="ctEmail">E-mail</label><input class="form-input" id="ctEmail" type="email" maxlength="80" value="' + esc(c.email || '') + '"></div>' +
      '<div class="form-field"><label class="form-label" for="ctCidade">Cidade / UF</label><input class="form-input" id="ctCidade" maxlength="60" value="' + esc(c.cidade || '') + '"></div>' +
      '<div class="form-field"><label class="form-label" for="ctObs">Observação</label><input class="form-input" id="ctObs" maxlength="200" value="' + esc(c.obs || '') + '"></div>' +
      '</div>',
      (c.nome ? '<button class="btn-ghost" style="margin-right:auto;color:var(--danger)" onclick="fin.removerContato()">Excluir</button>' : '') +
      '<button class="btn-ghost" onclick="fin.fechar(\'finContatoModal\')">Cancelar</button><button class="btn-primary" onclick="fin.salvarContato()">Salvar</button>');
    el('ctDoc').addEventListener('blur', async function () {
      var d = el('ctDoc').value.replace(/\D/g, ''); if (d.length !== 14) return;
      try {
        var r = await fetch('https://brasilapi.com.br/api/cnpj/v1/' + d); if (!r.ok) return;
        var j = await r.json();
        if (!el('ctNome').value) el('ctNome').value = (j.nome_fantasia || j.razao_social || '').slice(0, 80);
        if (!el('ctCidade').value && j.municipio) el('ctCidade').value = j.municipio + (j.uf ? '/' + j.uf : '');
        if (!el('ctTel').value && j.ddd_telefone_1) el('ctTel').value = j.ddd_telefone_1;
        if (!el('ctEmail').value && j.email) el('ctEmail').value = String(j.email).toLowerCase();
        toast('Dados da Receita preenchidos.', 'info');
      } catch (e) { }
    });
  };
  F.salvarContato = function () {
    var nome = el('ctNome').value.trim(); if (!nome) return toast('Informe o nome.', 'error');
    var c = F.contatos(), antigo = F._contatoEditando;
    if (nome !== antigo && c[nome]) return toast('Já existe um cadastro com esse nome.', 'error');
    var dados = { nome: nome, tipo: el('ctTipo').value, documento: el('ctDoc').value.replace(/\D/g, ''), telefone: el('ctTel').value.trim(), email: el('ctEmail').value.trim(), cidade: el('ctCidade').value.trim(), obs: el('ctObs').value.trim(), criadoEm: (antigo && c[antigo] && c[antigo].criadoEm) || F.hoje() };
    if (antigo && antigo !== nome) {
      delete c[antigo];
      st().transactions.forEach(function (t) { if (t.contato === antigo) t.contato = nome; });
      (st().nfes || []).forEach(function (n) { if (n.tomador === antigo) n.tomador = nome; });
    }
    c[nome] = dados; salvar(); fechar('finContatoModal'); toast('Cadastro salvo.'); F.renderContatos();
  };
  F.removerContato = function () {
    var nome = F._contatoEditando; if (!nome) return;
    var usados = st().transactions.filter(function (t) { return t.contato === nome; }).length;
    if (usados) return toast('Esse cadastro tem ' + usados + ' lançamento(s). Renomeie em vez de excluir.', 'error');
    if (!confirm('Excluir "' + nome + '"?')) return;
    delete F.contatos()[nome]; salvar(); fechar('finContatoModal'); F.renderContatos();
  };
  F.exportarContatos = function () {
    var linhas = ['Nome;Tipo;CPF/CNPJ;Telefone;E-mail;Cidade;Observação'].concat(F.todosContatos().map(function (c) { return ['"' + c.nome.replace(/"/g, '""') + '"', c.tipo || '', docFmt(c.documento), c.telefone || '', c.email || '', '"' + (c.cidade || '') + '"', '"' + (c.obs || '').replace(/"/g, '""') + '"'].join(';'); }));
    baixarArquivo('﻿' + linhas.join('\n'), 'clientes-fornecedores.csv', 'text/csv');
  };

  // ════════════════ TELA: CONTAS A PAGAR E RECEBER ════════════════
  var filtro = { aba: 'receber', periodo: 'todos', busca: '', conta: '', categoria: '' };
  F.filtrarContas = function (aba, periodo, busca) {
    var hoje = F.hoje();
    return st().transactions.filter(function (t) {
      var sit = F.situacao(t);
      if (filtro.conta && t.contaId !== filtro.conta) return false;
      if (filtro.categoria && t.category !== filtro.categoria) return false;
      if (t.transferenciaId && aba !== 'pagas' && aba !== 'todas') return false;
      if (aba === 'receber' && (t.type !== 'RECEITA' || sit === 'pago')) return false;
      if (aba === 'pagar' && (t.type !== 'DESPESA' || sit === 'pago')) return false;
      if (aba === 'vencidas' && sit !== 'vencido') return false;
      if (aba === 'pagas' && sit !== 'pago') return false;
      var ref = sit === 'pago' ? t.pagoEm : t.vencimento;
      if (periodo === '7' && !(sit === 'vencido' || F.diffDias(hoje, ref) <= 7)) return false;
      if (periodo === '30' && !(sit === 'vencido' || F.diffDias(hoje, ref) <= 30)) return false;
      if (periodo === 'mes' && F.mes(ref) !== F.mes(hoje)) return false;
      if (periodo === 'passado' && F.mes(ref) !== F.mes(F.addMeses(hoje, -1))) return false;
      if (busca) {
        var q = semAcento(busca).toLowerCase();
        if (semAcento([t.desc, t.contato, t.category, t.centroCusto, t.notes].join(' ')).toLowerCase().indexOf(q) === -1) return false;
      }
      return true;
    }).sort(function (a, b) {
      var ra = F.situacao(a) === 'pago' ? a.pagoEm : a.vencimento, rb = F.situacao(b) === 'pago' ? b.pagoEm : b.vencimento;
      return aba === 'pagas' ? (rb > ra ? 1 : -1) : (ra > rb ? 1 : -1);
    });
  };
  F.renderContas = function () {
    var v = el('view-contas'); if (!v) return;
    F.garantirModelo();
    var hoje = F.hoje(), mes = F.mes(hoje);
    var aRec = F.pendentes('RECEITA'), aPag = F.pendentes('DESPESA');
    var venc = F.pendentes().filter(function (t) { return F.situacao(t) === 'vencido'; });
    var vencRec = venc.filter(function (t) { return t.type === 'RECEITA'; }), vencPag = venc.filter(function (t) { return t.type === 'DESPESA'; });
    var pagosMes = st().transactions.filter(function (t) { return t.status === 'pago' && F.mes(t.pagoEm) === mes; });
    var recMes = F.somar(pagosMes.filter(function (t) { return t.type === 'RECEITA'; })), pagMes = F.somar(pagosMes.filter(function (t) { return t.type === 'DESPESA'; }));
    var cont = { receber: aRec.length, pagar: aPag.length, vencidas: venc.length };
    var lista = F.filtrarContas(filtro.aba, filtro.periodo, filtro.busca);
    var totalLista = r2(lista.reduce(function (a, t) { return a + (t.type === 'RECEITA' ? t.amount : -t.amount); }, 0));
    var abas = [['receber', 'A receber'], ['pagar', 'A pagar'], ['vencidas', 'Vencidas'], ['pagas', 'Pagas e recebidas'], ['todas', 'Todas']];
    var linhas = lista.map(function (t) {
      var s = F.rotuloSituacao(t), rec = t.type === 'RECEITA', conta = F.contaPorId(t.contaId), sit = F.situacao(t);
      var acoes = sit === 'pago'
        ? (t.transferenciaId ? '' : '<button class="fin-btn" onclick="fin.estornar(\'' + t.id + '\')" title="Voltar para em aberto">↩︎ Estornar</button><button class="fin-btn" onclick="fin.recibo(\'' + t.id + '\')" title="Recibo">🧾 Recibo</button>')
        : '<button class="fin-btn ok" onclick="fin.baixar(\'' + t.id + '\')">✓ ' + (rec ? 'Receber' : 'Pagar') + '</button>' + (rec ? '<button class="fin-btn gold" onclick="fin.cobrar(\'' + t.id + '\')">💠 Cobrar</button>' : '');
      if (!t.transferenciaId) acoes += '<button class="fin-btn" onclick="fin.duplicar(\'' + t.id + '\')" title="Duplicar">⧉</button>';
      return '<tr>' +
        '<td>' + (sit === 'pago' ? '' : '<input type="checkbox" class="fin-sel" value="' + t.id + '" aria-label="Selecionar">') + '</td>' +
        '<td style="white-space:nowrap">' + F.dataBR(sit === 'pago' ? t.pagoEm : t.vencimento) + '</td>' +
        '<td><div style="font-weight:600">' + esc(t.desc) + (t.parcela ? ' <span class="fin-sub">(' + esc(t.parcela) + ')</span>' : '') + '</div><div class="fin-sub">' + esc([t.contato, t.category, t.centroCusto].filter(Boolean).join(' · ')) + (t.cobradoEm ? ' · cobrado em ' + F.dataBR(t.cobradoEm) : '') + '</div></td>' +
        '<td class="fin-hide-sm">' + esc(conta ? conta.nome : '—') + '</td>' +
        '<td style="font-weight:800;white-space:nowrap" class="' + (rec ? 'fin-pos' : 'fin-neg') + '">' + (rec ? '+' : '−') + moeda(t.amount) + '</td>' +
        '<td><span class="fin-sit ' + s.cls + '">' + s.txt + '</span></td>' +
        '<td><div class="fin-acoes">' + acoes + '<button class="fin-btn" onclick="editTx(\'' + t.id + '\')" title="Editar">✏️</button><button class="fin-btn" onclick="fin.excluir(\'' + t.id + '\')" title="Excluir">🗑️</button></div></td>' +
        '</tr>';
    }).join('');
    v.innerHTML = '' +
      '<div class="page-header"><div class="page-header-text"><h1>Contas a Pagar e Receber</h1><p class="page-subtitle">Vencimentos, baixas, parcelas e cobrança por Pix</p></div>' +
      '<div class="page-header-actions"><button class="btn-secondary" onclick="fin.abrirLeitura()">📷 Ler boleto ou nota</button><button class="btn-primary" onclick="fin.novo(\'RECEITA\',{status:\'pendente\'})">+ A receber</button><button class="btn-danger-outline" onclick="fin.novo(\'DESPESA\',{status:\'pendente\'})">+ A pagar</button></div></div>' +
      '<div class="fin-kpis">' +
      '<div class="fin-kpi2"><div class="v fin-pos">' + moeda(F.somar(aRec)) + '</div><div class="l">A receber (' + aRec.length + ')</div><div class="s">' + (vencRec.length ? moeda(F.somar(vencRec)) + ' em atraso' : 'nada em atraso') + '</div></div>' +
      '<div class="fin-kpi2"><div class="v fin-neg">' + moeda(F.somar(aPag)) + '</div><div class="l">A pagar (' + aPag.length + ')</div><div class="s">' + (vencPag.length ? moeda(F.somar(vencPag)) + ' em atraso' : 'nada em atraso') + '</div></div>' +
      '<div class="fin-kpi2"><div class="v">' + moeda(recMes) + '</div><div class="l">Recebido no mês</div></div>' +
      '<div class="fin-kpi2"><div class="v">' + moeda(pagMes) + '</div><div class="l">Pago no mês</div></div>' +
      '<div class="fin-kpi2"><div class="v" style="color:var(--gold)">' + moeda(r2(F.saldoTotal() + F.somar(aRec) - F.somar(aPag))) + '</div><div class="l">Saldo previsto</div><div class="s">caixa + a receber − a pagar</div></div>' +
      '</div>' +
      '<div class="card"><div class="fin-bar"><div class="fin-tabs">' + abas.map(function (a) { return '<button class="fin-tab' + (filtro.aba === a[0] ? ' on' : '') + '" onclick="fin.filtro(\'aba\',\'' + a[0] + '\')">' + a[1] + (cont[a[0]] ? '<b>' + cont[a[0]] + '</b>' : '') + '</button>'; }).join('') + '</div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap"><select class="select-sm" onchange="fin.filtro(\'periodo\',this.value)" aria-label="Período">' +
      [['todos', 'Todo período'], ['7', 'Próximos 7 dias'], ['30', 'Próximos 30 dias'], ['mes', 'Este mês'], ['passado', 'Mês passado']].map(function (p) { return '<option value="' + p[0] + '"' + (filtro.periodo === p[0] ? ' selected' : '') + '>' + p[1] + '</option>'; }).join('') +
      '</select><select class="select-sm" onchange="fin.filtro(\'conta\',this.value)" aria-label="Conta"><option value="">Todas as contas</option>' + st().contas.map(function (c) { return '<option value="' + esc(c.id) + '"' + (filtro.conta === c.id ? ' selected' : '') + '>' + esc(c.nome) + '</option>'; }).join('') + '</select>' +
      '<select class="select-sm" onchange="fin.filtro(\'categoria\',this.value)" aria-label="Categoria"><option value="">Todas as categorias</option>' + (window.CATEGORIES.RECEITA || []).concat(window.CATEGORIES.DESPESA || []).filter(function (c, i, a) { return a.indexOf(c) === i; }).map(function (c) { return '<option' + (filtro.categoria === c ? ' selected' : '') + '>' + esc(c) + '</option>'; }).join('') + '</select>' +
      '<input class="search-sm" placeholder="Buscar cliente, descrição…" value="' + esc(filtro.busca) + '" oninput="fin.filtro(\'busca\',this.value,true)" aria-label="Buscar"></div></div>' +
      (lista.length ? '<div class="table-scroll"><table class="data-table"><thead><tr><th style="width:28px"><input type="checkbox" aria-label="Marcar todos" onchange="document.querySelectorAll(\'.fin-sel\').forEach(function(c){c.checked=event.target.checked})"></th><th>Data</th><th>Descrição</th><th class="fin-hide-sm">Conta</th><th>Valor</th><th>Situação</th><th>Ações</th></tr></thead><tbody>' + linhas + '</tbody></table></div>' +
        '<div class="table-footer"><span class="table-count">' + lista.length + ' lançamento(s) · <a class="link-go" onclick="fin.baixarSelecionados()">dar baixa nas marcadas</a></span><span class="table-total ' + (totalLista >= 0 ? 'fin-pos' : 'fin-neg') + '">Total: ' + moeda(totalLista) + '</span></div>'
        : '<div class="empty-block" style="padding:28px">' + (filtro.aba === 'vencidas' ? 'Nenhuma conta vencida. 👏' : 'Nada por aqui. Cadastre uma conta ' + (filtro.aba === 'pagar' ? 'a pagar' : 'a receber') + ' ou leia um boleto com IA.') + '</div>') +
      '</div>';
  };
  var tBusca = null;
  F.verContas = function (busca, aba) { filtro.busca = busca || ''; filtro.aba = aba || 'todas'; filtro.periodo = 'todos'; filtro.conta = ''; filtro.categoria = ''; window.switchView('contas'); };
  F.filtro = function (k, v, atrasar) {
    filtro[k] = v;
    clearTimeout(tBusca);
    if (atrasar) {
      tBusca = setTimeout(function () {
        F.renderContas();
        var i = document.querySelector('#view-contas .search-sm'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); }
      }, 250);
    } else F.renderContas();
  };

  // ════════════════ TELA: FLUXO DE CAIXA E BANCOS ════════════════
  var fluxoCfg = { dias: 90, atrasados: true };
  F.renderFluxo = function () {
    var v = el('view-fluxo'); if (!v) return;
    F.garantirModelo();
    var pts = F.projecao(fluxoCfg.dias, fluxoCfg.atrasados);
    var saldoHoje = F.saldoTotal();
    var negativo = pts.find(function (p) { return p.saldo < 0; });
    var minimo = pts.reduce(function (a, p) { return p.saldo < a.saldo ? p : a; }, pts[0]);
    var em = function (d) { var p = pts[Math.min(d, pts.length - 1)]; return p ? p.saldo : saldoHoje; };
    var atrasoRec = F.somar(F.pendentes('RECEITA').filter(function (t) { return F.situacao(t) === 'vencido'; }));
    var atrasoPag = F.somar(F.pendentes('DESPESA').filter(function (t) { return F.situacao(t) === 'vencido'; }));
    // agrupa por semana
    var semanas = [];
    for (var i = 0; i < pts.length; i += 7) {
      var bloco = pts.slice(i, i + 7);
      semanas.push({ ini: bloco[0].data, fim: bloco[bloco.length - 1].data, ent: r2(bloco.reduce(function (a, p) { return a + p.ent; }, 0)), sai: r2(bloco.reduce(function (a, p) { return a + p.sai; }, 0)), saldo: bloco[bloco.length - 1].saldo });
    }
    var alerta = negativo
      ? '<div class="fin-alerta red">🔴 <b>Seu caixa fica negativo em ' + F.dataBR(negativo.data) + '</b> (' + moeda(negativo.saldo) + '). O ponto mais baixo é ' + moeda(minimo.saldo) + ' em ' + F.dataBR(minimo.data) + '. Antecipe recebimentos, negocie prazos ou adie pagamentos antes dessa data.</div>'
      : '<div class="fin-alerta green">🟢 O caixa fica positivo nos próximos ' + fluxoCfg.dias + ' dias. O ponto mais baixo é ' + moeda(minimo.saldo) + ' em ' + F.dataBR(minimo.data) + '.</div>';
    v.innerHTML = '' +
      '<div class="page-header"><div class="page-header-text"><h1>Fluxo de Caixa e Bancos</h1><p class="page-subtitle">Saldo real das contas e projeção com o que está a pagar e a receber</p></div>' +
      '<div class="page-header-actions"><button class="btn-secondary" onclick="fin.exportarFluxo()">⬇️ Exportar</button><button class="btn-secondary" onclick="fin.transferir()">🔁 Transferir</button><button class="btn-primary" onclick="fin.editarConta()">+ Conta bancária</button></div></div>' +
      '<div class="fin-kpis">' +
      '<div class="fin-kpi2"><div class="v" style="color:var(--gold)">' + moeda(saldoHoje) + '</div><div class="l">Saldo hoje</div><div class="s">soma das contas (sem cartão)</div></div>' +
      '<div class="fin-kpi2"><div class="v ' + (em(30) < 0 ? 'fin-neg' : '') + '">' + moeda(em(30)) + '</div><div class="l">Previsto em 30 dias</div></div>' +
      '<div class="fin-kpi2"><div class="v ' + (em(60) < 0 ? 'fin-neg' : '') + '">' + moeda(em(60)) + '</div><div class="l">Previsto em 60 dias</div></div>' +
      '<div class="fin-kpi2"><div class="v ' + (em(90) < 0 ? 'fin-neg' : '') + '">' + moeda(em(90)) + '</div><div class="l">Previsto em 90 dias</div></div>' +
      '<div class="fin-kpi2"><div class="v">' + moeda(atrasoRec) + ' / ' + moeda(atrasoPag) + '</div><div class="l">Em atraso: a receber / a pagar</div></div>' +
      '</div>' + alerta +
      '<div class="card" style="margin-bottom:16px"><div class="card-header-row"><span class="card-title">Saldo projetado dia a dia</span>' +
      '<div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap"><label class="fin-check"><input type="checkbox" ' + (fluxoCfg.atrasados ? 'checked' : '') + ' onchange="fin.cfgFluxo(\'atrasados\',this.checked)"> Contar atrasados como hoje</label>' +
      '<select class="select-sm" onchange="fin.cfgFluxo(\'dias\',+this.value)" aria-label="Horizonte">' + [30, 60, 90, 180].map(function (d) { return '<option value="' + d + '"' + (fluxoCfg.dias === d ? ' selected' : '') + '>' + d + ' dias</option>'; }).join('') + '</select></div></div>' +
      '<canvas id="finFluxoChart" height="220" style="width:100%;height:220px;display:block"></canvas></div>' +
      '<div class="grid-2col">' +
      '<div class="card"><div class="card-title" style="margin-bottom:10px">Contas bancárias</div><div class="fin-contas">' +
      st().contas.map(function (c) { var s = F.saldoConta(c); return '<div class="fin-conta" onclick="fin.editarConta(\'' + esc(c.id) + '\')"><div class="fin-sub">' + esc(c.tipo) + '</div><div style="font-weight:700;margin:2px 0">' + esc(c.nome) + '</div><div style="font-size:18px;font-weight:800" class="' + (s < 0 ? 'fin-neg' : '') + '">' + moeda(s) + '</div>' + (c.dataSaldo ? '<div class="fin-sub">saldo informado em ' + F.dataBR(c.dataSaldo) + '</div>' : '<div class="fin-sub">toque para informar o saldo do extrato</div>') + '</div>'; }).join('') +
      '</div></div>' +
      '<div class="card"><div class="card-title" style="margin-bottom:10px">Semana a semana</div><div class="table-scroll"><table class="data-table"><thead><tr><th>Semana</th><th>Entradas</th><th>Saídas</th><th>Saldo final</th></tr></thead><tbody>' +
      semanas.map(function (s) { return '<tr><td style="white-space:nowrap">' + F.dataBR(s.ini).slice(0, 5) + ' a ' + F.dataBR(s.fim).slice(0, 5) + '</td><td class="fin-pos">' + (s.ent ? moeda(s.ent) : '—') + '</td><td class="fin-neg">' + (s.sai ? moeda(s.sai) : '—') + '</td><td style="font-weight:700" class="' + (s.saldo < 0 ? 'fin-neg' : '') + '">' + moeda(s.saldo) + '</td></tr>'; }).join('') +
      '</tbody></table></div></div>' +
      '</div>';
    F._pontosFluxo = pts;
    requestAnimationFrame(function () { F.desenharFluxo(pts); });
  };
  F.cfgFluxo = function (k, v) { fluxoCfg[k] = v; F.renderFluxo(); };
  F.desenharFluxo = function (pts) {
    var c = el('finFluxoChart'); if (!c || !pts.length) return;
    var dpr = window.devicePixelRatio || 1, W = c.clientWidth || 600, H = c.clientHeight || 220;
    c.width = W * dpr; c.height = H * dpr;
    var g = c.getContext('2d'); g.scale(dpr, dpr); g.clearRect(0, 0, W, H);
    var vals = pts.map(function (p) { return p.saldo; });
    var max = Math.max.apply(null, vals.concat([0])), min = Math.min.apply(null, vals.concat([0]));
    if (max === min) { max += 1; min -= 1; }
    var pl = 64, pr = 12, pt = 12, pb = 26, w = W - pl - pr, h = H - pt - pb;
    var X = function (i) { return pl + i / Math.max(pts.length - 1, 1) * w; };
    var Y = function (v) { return pt + (max - v) / (max - min) * h; };
    g.font = '11px Inter, system-ui, sans-serif'; g.fillStyle = '#94A3B8'; g.strokeStyle = 'rgba(255,255,255,.06)'; g.lineWidth = 1;
    for (var k = 0; k <= 4; k++) {
      var val = min + (max - min) * k / 4, y = Y(val);
      g.beginPath(); g.moveTo(pl, y); g.lineTo(W - pr, y); g.stroke();
      g.textAlign = 'right'; g.fillText(abreviar(val), pl - 8, y + 4);
    }
    // linha do zero
    if (min < 0) { g.strokeStyle = 'rgba(239,68,68,.55)'; g.setLineDash([4, 4]); g.beginPath(); g.moveTo(pl, Y(0)); g.lineTo(W - pr, Y(0)); g.stroke(); g.setLineDash([]); }
    // área
    var grad = g.createLinearGradient(0, pt, 0, pt + h); grad.addColorStop(0, 'rgba(212,175,55,.28)'); grad.addColorStop(1, 'rgba(212,175,55,0)');
    g.beginPath(); g.moveTo(X(0), Y(Math.max(min, 0)));
    pts.forEach(function (p, i) { g.lineTo(X(i), Y(p.saldo)); });
    g.lineTo(X(pts.length - 1), Y(Math.max(min, 0))); g.closePath(); g.fillStyle = grad; g.fill();
    g.beginPath(); pts.forEach(function (p, i) { if (i) g.lineTo(X(i), Y(p.saldo)); else g.moveTo(X(i), Y(p.saldo)); });
    g.strokeStyle = '#D4AF37'; g.lineWidth = 2; g.stroke();
    // trechos negativos em vermelho
    g.strokeStyle = '#EF4444'; g.lineWidth = 2.5;
    for (var i = 1; i < pts.length; i++) if (pts[i].saldo < 0 || pts[i - 1].saldo < 0) { g.beginPath(); g.moveTo(X(i - 1), Y(pts[i - 1].saldo)); g.lineTo(X(i), Y(pts[i].saldo)); g.stroke(); }
    // datas
    g.fillStyle = '#94A3B8'; g.textAlign = 'center';
    var passos = 6;
    for (var j = 0; j <= passos; j++) { var idx = Math.round((pts.length - 1) * j / passos); g.fillText(F.dataBR(pts[idx].data).slice(0, 5), X(idx), H - 8); }
    // dica ao passar o mouse
    c.onmousemove = function (e) {
      var r = c.getBoundingClientRect(), i = Math.round((e.clientX - r.left - pl) / w * (pts.length - 1));
      if (i < 0 || i >= pts.length) return; var p = pts[i];
      c.title = F.dataBR(p.data) + ' — saldo ' + moeda(p.saldo) + (p.ent ? '\nentradas ' + moeda(p.ent) : '') + (p.sai ? '\nsaídas ' + moeda(p.sai) : '');
    };
  };
  function abreviar(v) {
    var a = Math.abs(v), s = v < 0 ? '-' : '';
    if (a >= 1e6) return s + 'R$' + (a / 1e6).toFixed(1).replace('.', ',') + 'mi';
    if (a >= 1e3) return s + 'R$' + (a / 1e3).toFixed(a >= 1e4 ? 0 : 1).replace('.', ',') + 'mil';
    return s + 'R$' + a.toFixed(0);
  }
  F.exportarFluxo = function () {
    var pts = F._pontosFluxo || F.projecao(fluxoCfg.dias, fluxoCfg.atrasados);
    var csv = 'Data;Entradas previstas;Saídas previstas;Saldo projetado\n' + pts.map(function (p) { return [F.dataBR(p.data), br(p.ent), br(p.sai), br(p.saldo)].join(';'); }).join('\n');
    baixarArquivo('﻿' + csv, 'fluxo-de-caixa-' + F.hoje() + '.csv', 'text/csv');
  };
  function br(v) { return Number(v || 0).toFixed(2).replace('.', ','); }
  function baixarArquivo(conteudo, nome, tipo) {
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([conteudo], { type: tipo + ';charset=utf-8' })); a.download = nome; a.click();
  }
  F.baixarArquivo = baixarArquivo;

  // ════════════════ TELA: DRE GERENCIAL ════════════════
  var dreCfg = { periodo: '6m', regime: 'competencia', detalhar: false };
  F.mesesDoPeriodo = function (p) {
    var hoje = F.hoje(), ano = +hoje.slice(0, 4);
    if (p === 'ano') return F.mesesAte(ano + '-12', 12);
    if (p === 'anoPassado') return F.mesesAte((ano - 1) + '-12', 12);
    if (p === '12m') return F.mesesAte(F.mes(hoje), 12);
    if (p === '3m') return F.mesesAte(F.mes(hoje), 3);
    return F.mesesAte(F.mes(hoje), 6);
  };
  F.calcularDRE = function (meses, regime) {
    var pm = F.porMes(meses, regime), cols = meses.map(function (m) { return F.dreDoMes(pm[m]); });
    var total = F.dreDoMes({ grupos: meses.reduce(function (acc, m) { var g = pm[m].grupos; Object.keys(g).forEach(function (k) { acc[k] = r2((acc[k] || 0) + g[k]); }); return acc; }, {}) });
    return { meses: meses, pm: pm, cols: cols, total: total };
  };
  F.renderDRE = function () {
    var v = el('view-dre'); if (!v) return;
    F.garantirModelo();
    var meses = F.mesesDoPeriodo(dreCfg.periodo), d = F.calcularDRE(meses, dreCfg.regime);
    var linhas = [
      ['bruta', 'Receita bruta', 'tot', 'receita'], ['deducoes', '(−) Impostos sobre vendas', '', 'deducoes'], ['liquida', 'Receita líquida', 'tot'],
      ['custos', '(−) Custos de mercadorias e serviços', '', 'custos'], ['lucroBruto', 'Lucro bruto', 'tot'],
      ['pessoal', '(−) Pessoal e pró-labore', '', 'pessoal'], ['operacionais', '(−) Despesas operacionais', '', 'operacionais'], ['operacional', 'Resultado operacional (EBITDA)', 'tot'],
      ['finRec', '(+) Receitas financeiras', '', 'financeiro_rec'], ['finDesp', '(−) Despesas financeiras', '', 'financeiro_desp'], ['outras', '(+) Outras receitas', '', 'outras_rec'],
      ['resultado', 'Resultado do período', 'res']
    ];
    var pct = function (val, base) { return base ? (val / base * 100).toFixed(1).replace('.', ',') + '%' : '—'; };
    var cel = function (val, cls) { return '<td class="' + (cls || '') + (val < 0 ? ' fin-neg' : '') + '">' + (val ? moeda(val) : '—') + '</td>'; };
    var catsDoGrupo = function (grupo) {
      var nomes = {};
      meses.forEach(function (m) { Object.keys(d.pm[m].cats).forEach(function (k) { var p = k.split('|'); if (F.grupoDe({ type: p[0], category: p[1] }) === grupo) nomes[k] = 1; }); });
      return Object.keys(nomes).sort();
    };
    var corpo = linhas.map(function (l) {
      var html = '<tr class="' + l[2] + '"><td>' + l[1] + '</td>' + d.cols.map(function (c) { return cel(c[l[0]]); }).join('') + cel(d.total[l[0]]) + '<td class="fin-sub">' + pct(d.total[l[0]], d.total.bruta) + '</td></tr>';
      if (dreCfg.detalhar && l[3]) {
        catsDoGrupo(l[3]).forEach(function (k) {
          var tot = meses.reduce(function (a, m) { return a + (d.pm[m].cats[k] || 0); }, 0);
          html += '<tr class="cat"><td>' + esc(k.split('|')[1]) + '</td>' + meses.map(function (m) { return cel(d.pm[m].cats[k] || 0); }).join('') + cel(r2(tot)) + '<td class="fin-sub">' + pct(tot, d.total.bruta) + '</td></tr>';
        });
      }
      return html;
    }).join('');
    var margem = d.total.bruta ? d.total.resultado / d.total.bruta * 100 : 0;
    var semClassificar = st().transactions.filter(function (t) { return t.category === 'Outros'; }).length;
    v.innerHTML = '' +
      '<div class="page-header"><div class="page-header-text"><h1>DRE Gerencial</h1><p class="page-subtitle">Resultado mês a mês, calculado a partir dos seus lançamentos</p></div>' +
      '<div class="page-header-actions"><button class="btn-secondary" onclick="fin.exportarDRE()">⬇️ Exportar CSV</button><button class="btn-secondary" onclick="window.print()">🖨️ Imprimir</button></div></div>' +
      '<div class="fin-kpis">' +
      '<div class="fin-kpi2"><div class="v fin-pos">' + moeda(d.total.bruta) + '</div><div class="l">Receita bruta no período</div></div>' +
      '<div class="fin-kpi2"><div class="v">' + moeda(d.total.lucroBruto) + '</div><div class="l">Lucro bruto</div><div class="s">margem bruta ' + pct(d.total.lucroBruto, d.total.bruta) + '</div></div>' +
      '<div class="fin-kpi2"><div class="v">' + moeda(d.total.operacional) + '</div><div class="l">Resultado operacional</div><div class="s">margem ' + pct(d.total.operacional, d.total.bruta) + '</div></div>' +
      '<div class="fin-kpi2"><div class="v ' + (d.total.resultado < 0 ? 'fin-neg' : '') + '" style="' + (d.total.resultado >= 0 ? 'color:var(--gold)' : '') + '">' + moeda(d.total.resultado) + '</div><div class="l">Resultado do período</div><div class="s">margem líquida ' + margem.toFixed(1).replace('.', ',') + '%</div></div>' +
      '</div>' +
      '<div class="card"><div class="fin-bar"><div class="fin-tabs">' +
      [['competencia', 'Competência'], ['caixa', 'Caixa']].map(function (r) { return '<button class="fin-tab' + (dreCfg.regime === r[0] ? ' on' : '') + '" onclick="fin.cfgDRE(\'regime\',\'' + r[0] + '\')">' + r[1] + '</button>'; }).join('') +
      '</div><div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><label class="fin-check"><input type="checkbox" ' + (dreCfg.detalhar ? 'checked' : '') + ' onchange="fin.cfgDRE(\'detalhar\',this.checked)"> Abrir por categoria</label>' +
      '<select class="select-sm" onchange="fin.cfgDRE(\'periodo\',this.value)" aria-label="Período">' + [['3m', 'Últimos 3 meses'], ['6m', 'Últimos 6 meses'], ['12m', 'Últimos 12 meses'], ['ano', 'Este ano'], ['anoPassado', 'Ano passado']].map(function (p) { return '<option value="' + p[0] + '"' + (dreCfg.periodo === p[0] ? ' selected' : '') + '>' + p[1] + '</option>'; }).join('') + '</select></div></div>' +
      '<p class="fin-sub" style="margin-bottom:10px">' + (dreCfg.regime === 'competencia' ? 'Competência: cada lançamento entra no mês em que aconteceu, pago ou não.' : 'Caixa: só o que foi pago ou recebido, no mês do pagamento.') + '</p>' +
      '<div class="table-scroll"><table class="fin-dre" style="width:100%;border-collapse:collapse"><thead><tr><th></th>' + meses.map(function (m) { return '<th>' + F.nomeMes(m) + '</th>'; }).join('') + '<th>Total</th><th>% receita</th></tr></thead><tbody>' + corpo + '</tbody></table></div>' +
      (d.total.fora ? '<p class="fin-sub" style="margin-top:10px">Fora do resultado no período: ' + moeda(d.total.fora) + ' (empréstimos, aportes, compra de equipamentos, distribuição de lucros e transferências). Esses valores mexem no caixa, mas não são receita nem despesa.</p>' : '') +
      (semClassificar ? '<div class="fin-alerta gold">' + semClassificar + ' lançamento(s) estão na categoria "Outros". Classifique-os para o DRE ficar mais preciso.</div>' : '') +
      '</div>';
  };
  F.cfgDRE = function (k, v) { dreCfg[k] = v; F.renderDRE(); };
  F.exportarDRE = function () {
    var meses = F.mesesDoPeriodo(dreCfg.periodo), d = F.calcularDRE(meses, dreCfg.regime);
    var nomes = { bruta: 'Receita bruta', deducoes: '(-) Impostos sobre vendas', liquida: 'Receita líquida', custos: '(-) Custos', lucroBruto: 'Lucro bruto', pessoal: '(-) Pessoal', operacionais: '(-) Despesas operacionais', operacional: 'Resultado operacional', finRec: '(+) Receitas financeiras', finDesp: '(-) Despesas financeiras', outras: '(+) Outras receitas', resultado: 'Resultado do período' };
    var csv = 'DRE (' + (dreCfg.regime === 'caixa' ? 'caixa' : 'competência') + ');' + meses.map(F.nomeMes).join(';') + ';Total\n' +
      Object.keys(nomes).map(function (k) { return nomes[k] + ';' + d.cols.map(function (c) { return br(c[k]); }).join(';') + ';' + br(d.total[k]); }).join('\n');
    baixarArquivo('﻿' + csv, 'dre-' + F.hoje() + '.csv', 'text/csv');
  };

  // ════════════════ LEITURA DE BOLETO / NOTA COM IA ════════════════
  F.abrirLeitura = function () {
    modal('finIAModal', '📷 Ler boleto, nota ou recibo com IA',
      '<p style="color:var(--text-muted);margin-bottom:14px">Envie a foto ou o PDF. A IA lê valor, vencimento, fornecedor e sugere a categoria. Você confere antes de salvar.</p>' +
      '<label class="drop-zone" style="display:block;cursor:pointer;text-align:center;padding:28px;border:2px dashed var(--gold-border);border-radius:var(--radius-sm)" id="finIADrop">' +
      '<div style="font-size:34px">🧾</div><div style="font-weight:700;margin-top:6px">Toque para escolher o arquivo</div><div class="fin-sub">Foto ou PDF até 3 MB</div>' +
      '<input type="file" id="finIAArquivo" accept="image/*,application/pdf" style="display:none" onchange="fin.lerArquivo(this.files[0])"></label>' +
      '<div id="finIAStatus" style="margin-top:12px"></div>',
      '<button class="btn-ghost" onclick="fin.fechar(\'finIAModal\')">Cancelar</button>');
    var drop = el('finIADrop');
    if (drop) {
      drop.addEventListener('dragover', function (e) { e.preventDefault(); });
      drop.addEventListener('drop', function (e) { e.preventDefault(); if (e.dataTransfer.files[0]) F.lerArquivo(e.dataTransfer.files[0]); });
    }
  };
  // Fotos grandes são reduzidas no aparelho (até 1800 px, JPEG) para caber no envio
  F.prepararArquivo = function (arq) {
    return new Promise(function (ok, falha) {
      var leitor = new FileReader();
      leitor.onerror = function () { falha(new Error('Não consegui abrir o arquivo.')); };
      leitor.onload = function () {
        var url = String(leitor.result);
        if (!/^image\/(jpeg|png|webp)$/.test(arq.type) || arq.size < 900 * 1024) return ok({ base64: url.split(',')[1], tipo: arq.type });
        var img = new Image();
        img.onload = function () {
          var esc2 = Math.min(1, 1800 / Math.max(img.width, img.height));
          var c = document.createElement('canvas'); c.width = Math.round(img.width * esc2); c.height = Math.round(img.height * esc2);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          ok({ base64: c.toDataURL('image/jpeg', 0.85).split(',')[1], tipo: 'image/jpeg' });
        };
        img.onerror = function () { ok({ base64: url.split(',')[1], tipo: arq.type }); };
        img.src = url;
      };
      leitor.readAsDataURL(arq);
    });
  };
  F.lerArquivo = async function (arq) {
    var status = el('finIAStatus'); if (!arq || !status) return;
    if (arq.type === 'application/pdf' && arq.size > 3 * 1024 * 1024) { status.innerHTML = '<div class="fin-alerta red">O PDF precisa ter até 3 MB.</div>'; return; }
    if (arq.size > 15 * 1024 * 1024) { status.innerHTML = '<div class="fin-alerta red">Arquivo grande demais.</div>'; return; }
    status.innerHTML = '<div class="fin-alerta gold">⏳ Lendo o documento…</div>';
    try {
      var prep = await F.prepararArquivo(arq);
      if (prep.base64.length * 0.75 > 3.2 * 1024 * 1024) throw new Error('O arquivo precisa ter até 3 MB.');
      var token = window.getAuthToken ? await window.getAuthToken() : '';
      var r = await fetch('/api/ler-documento', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: token ? 'Bearer ' + token : '' }, body: JSON.stringify({ arquivo: prep.base64, tipo: prep.tipo || arq.type, categorias: window.CATEGORIES }) });
      var d = await r.json().catch(function () { return {}; });
      if (!r.ok || !d.dados) throw new Error(d.error || 'Não foi possível ler o documento.');
      fechar('finIAModal');
      F.preencherComLeitura(d.dados);
      F.anexoPendente = arq; // o arquivo original vira o anexo do lançamento
    } catch (e) {
      status.innerHTML = '<div class="fin-alerta red">' + esc(e.message) + '</div>';
    }
  };
  F.preencherComLeitura = function (x) {
    var tipo = x.tipo === 'RECEITA' ? 'RECEITA' : 'DESPESA';
    var hoje = F.hoje();
    var venc = /^\d{4}-\d{2}-\d{2}$/.test(x.vencimento || '') ? x.vencimento : '';
    var emissao = /^\d{4}-\d{2}-\d{2}$/.test(x.dataEmissao || '') ? x.dataEmissao : '';
    var pago = !!x.jaPago;
    F.novo(tipo, { status: pago ? 'pago' : 'pendente', data: emissao || venc || hoje, vencimento: venc || emissao || hoje, contato: x.contato || '' });
    setTimeout(function () {
      if (x.descricao) el('txDesc').value = String(x.descricao).slice(0, 120);
      if (x.valor > 0) el('txAmount').value = Number(x.valor).toFixed(2);
      var cat = x.categoria && (window.CATEGORIES[tipo] || []).indexOf(x.categoria) > -1 ? x.categoria : F.sugerir(x.contato || x.descricao, tipo);
      if (cat) { el('txCategory').value = cat; el('txCategory').dataset.mexeu = '1'; }
      var notas = [];
      if (x.documento) notas.push((String(x.documento).replace(/\D/g, '').length > 11 ? 'CNPJ ' : 'CPF ') + x.documento);
      if (x.numeroDocumento) notas.push('Doc. ' + x.numeroDocumento);
      if (x.linhaDigitavel) notas.push('Linha digitável: ' + x.linhaDigitavel);
      if (notas.length) el('txNotes').value = notas.join(' · ').slice(0, 200);
      if (x.forma && F.FORMAS.indexOf(x.forma) > -1) el('txForma').value = x.forma;
      F._atualizarForm && F._atualizarForm();
      var sub = el('txModalSubtitle'); if (sub) sub.textContent = 'Lido pela IA. Confira os dados antes de salvar.';
    }, 80);
  };

  // ════════════════ PAINEL (dashboard) COM NÚMEROS REAIS ════════════════
  F.resumoMes = function (ym) {
    var b = F.porMes([ym], 'competencia')[ym];
    var d = F.dreDoMes(b);
    return { receitas: b.receitas, despesas: b.despesas, dre: d };
  };
  F.indicadores = function () {
    var hoje = F.hoje(), mes = F.mes(hoje), mesAnt = F.mes(F.addMeses(hoje, -1));
    var atual = F.resumoMes(mes), anterior = F.resumoMes(mesAnt);
    var saldo = F.saldoTotal(), queima = F.queimaMensal();
    var aRec = F.pendentes('RECEITA'), aPag = F.pendentes('DESPESA');
    var em30 = function (lista) { return F.somar(lista.filter(function (t) { return F.diffDias(hoje, t.vencimento) <= 30; })); };
    var vencidos = F.pendentes().filter(function (t) { return F.situacao(t) === 'vencido'; });
    var hojeLista = F.pendentes().filter(function (t) { return F.situacao(t) === 'hoje'; });
    var proj = F.projecao(90, true), neg = proj.find(function (p) { return p.saldo < 0; });
    return {
      mes: mes, atual: atual, anterior: anterior, saldo: saldo, queima: queima,
      runway: queima > 0 ? saldo / queima : null,
      aReceber30: em30(aRec), aPagar30: em30(aPag), aReceber: F.somar(aRec), aPagar: F.somar(aPag),
      vencidosRec: vencidos.filter(function (t) { return t.type === 'RECEITA'; }), vencidosPag: vencidos.filter(function (t) { return t.type === 'DESPESA'; }),
      venceHoje: hojeLista, negativoEm: neg ? neg.data : null, saldoNegativo: neg ? neg.saldo : null,
      proximos: F.pendentes().filter(function (t) { return F.diffDias(hoje, t.vencimento) <= 7; }).sort(function (a, b) { return a.vencimento > b.vencimento ? 1 : -1; }).slice(0, 6)
    };
  };
  F.alertas = function () {
    var k = F.indicadores(), lista = [];
    if (k.vencidosRec.length) lista.push({ cls: 'red', t: '💸 ' + k.vencidosRec.length + ' recebimento(s) em atraso: ' + moeda(F.somar(k.vencidosRec)) + '. Cobre por Pix em Contas a receber.', go: 'contas' });
    if (k.vencidosPag.length) lista.push({ cls: 'red', t: '⏰ ' + k.vencidosPag.length + ' conta(s) a pagar vencida(s): ' + moeda(F.somar(k.vencidosPag)) + '.', go: 'contas' });
    if (k.venceHoje.length) lista.push({ cls: 'gold', t: '📅 ' + k.venceHoje.length + ' conta(s) vencem hoje: ' + moeda(F.somar(k.venceHoje)) + '.', go: 'contas' });
    if (k.negativoEm) lista.push({ cls: 'red', t: '🔴 O caixa fica negativo em ' + F.dataBR(k.negativoEm) + ' (' + moeda(k.saldoNegativo) + ').', go: 'fluxo' });
    if (k.runway !== null && k.runway < 3 && k.saldo > 0) lista.push({ cls: 'gold', t: '⏳ O saldo cobre ' + k.runway.toFixed(1).replace('.', ',') + ' meses de despesas. O ideal é ter pelo menos 3.', go: 'fluxo' });
    var semConta = (st().contas || []).every(function (c) { return !c.dataSaldo; });
    if (semConta && st().transactions.length) lista.push({ cls: 'blue', t: '🏦 Informe o saldo do extrato das suas contas para o caixa ficar exato.', go: 'fluxo' });
    return lista;
  };
  F.atualizarTudo = function () {
    try { if (window.renderDashboard) window.renderDashboard(); } catch (e) { console.warn(e); }
    var ativa = document.querySelector('.view.active');
    var id = ativa ? ativa.id.replace('view-', '') : '';
    if (id === 'contas') F.renderContas();
    if (id === 'fluxo') F.renderFluxo();
    if (id === 'dre') F.renderDRE();
    if (id === 'finance' && window.renderFinance) window.renderFinance();
  };

  // Contexto mais rico para o CFO IA
  F.contextoIA = function () {
    var k = F.indicadores();
    var top = {};
    st().transactions.forEach(function (t) { if (t.type === 'DESPESA' && F.mes(t.date) === k.mes) top[t.category] = (top[t.category] || 0) + t.amount; });
    var topLista = Object.keys(top).sort(function (a, b) { return top[b] - top[a]; }).slice(0, 5).map(function (c) { return c + ': ' + moeda(top[c]); });
    return {
      saldoCaixa: k.saldo, aReceber: k.aReceber, aPagar: k.aPagar, aReceber30: k.aReceber30, aPagar30: k.aPagar30,
      vencidosReceber: F.somar(k.vencidosRec), vencidosPagar: F.somar(k.vencidosPag),
      mesAtual: { receitas: k.atual.receitas, despesas: k.atual.despesas, resultado: k.atual.dre.resultado },
      mesAnterior: { receitas: k.anterior.receitas, despesas: k.anterior.despesas, resultado: k.anterior.dre.resultado },
      queimaMensal: k.queima, runwayMeses: k.runway, caixaNegativoEm: k.negativoEm, maioresDespesasMes: topLista
    };
  };

  // ════════════════ CONCILIAÇÃO BANCÁRIA (OFX / CSV) ════════════════
  F.lerOFX = function (txt) {
    var lista = [], re = /<STMTTRN>([\s\S]*?)(?:<\/STMTTRN>|(?=<STMTTRN>)|<\/BANKTRANLIST>)/gi, m;
    var tag = function (bloco, nome) { var r = new RegExp('<' + nome + '>([^<\\r\\n]*)', 'i').exec(bloco); return r ? r[1].trim() : ''; };
    while ((m = re.exec(txt)) !== null) {
      var b = m[1], dt = tag(b, 'DTPOSTED'), val = tag(b, 'TRNAMT');
      if (!dt || !val) continue;
      var valor = parseFloat(val.replace(',', '.'));
      if (!isFinite(valor) || !valor) continue;
      var desc = [tag(b, 'NAME'), tag(b, 'MEMO')].filter(Boolean).filter(function (x, i, a) { return a.indexOf(x) === i; }).join(' — ') || 'Movimento bancário';
      lista.push({ data: dt.slice(0, 4) + '-' + dt.slice(4, 6) + '-' + dt.slice(6, 8), valor: valor, desc: desc, fitid: tag(b, 'FITID') });
    }
    return lista;
  };
  F.lerCSV = function (txt) {
    var linhas = txt.replace(/\r/g, '').split('\n').filter(function (l) { return l.trim(); });
    if (linhas.length < 2) return [];
    var sep = (linhas[0].split(';').length > linhas[0].split(',').length) ? ';' : (linhas[0].indexOf('\t') > -1 ? '\t' : ',');
    var dividir = function (l) { var out = [], cur = '', q = false; for (var i = 0; i < l.length; i++) { var ch = l[i]; if (ch === '"') q = !q; else if (ch === sep && !q) { out.push(cur); cur = ''; } else cur += ch; } out.push(cur); return out.map(function (x) { return x.trim(); }); };
    var cab = dividir(linhas[0]).map(function (h) { return semAcento(h).toLowerCase(); });
    var idx = function (nomes) { return cab.findIndex(function (h) { return nomes.some(function (n) { return h.indexOf(n) > -1; }); }); };
    var iData = idx(['data', 'date']), iDesc = idx(['descri', 'historico', 'lancamento', 'memo', 'detalhe']), iVal = idx(['valor', 'amount', 'quantia']);
    var iCred = idx(['credito', 'entrada']), iDeb = idx(['debito', 'saida']);
    var temCab = iData > -1 || iVal > -1;
    if (!temCab) { iData = 0; iDesc = 1; iVal = 2; }
    var valorBR = function (s) {
      s = String(s || '').replace(/[R$\s]/g, '');
      if (!s) return 0;
      var neg = /^-|\(.*\)|D$/i.test(s); s = s.replace(/[()DdCc-]/g, '');
      if (s.indexOf(',') > -1) s = s.replace(/\./g, '').replace(',', '.');
      var n = parseFloat(s); return isFinite(n) ? (neg ? -n : n) : 0;
    };
    var dataISO = function (s) {
      s = String(s || '').trim();
      var m1 = /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/.exec(s);
      if (m1) { var a = m1[3].length === 2 ? '20' + m1[3] : m1[3]; return a + '-' + pad(+m1[2]) + '-' + pad(+m1[1]); }
      var m2 = /^(\d{4})-(\d{2})-(\d{2})/.exec(s); return m2 ? m2[0] : '';
    };
    var lista = [];
    linhas.slice(temCab ? 1 : 0).forEach(function (l) {
      var c = dividir(l), data = dataISO(c[iData]);
      var valor = iVal > -1 ? valorBR(c[iVal]) : valorBR(c[iCred]) - Math.abs(valorBR(c[iDeb]));
      if (!data || !valor) return;
      var desc = (iDesc > -1 ? c[iDesc] : '') || 'Movimento bancário';
      if (/saldo/i.test(desc) && !/pix|ted|doc/i.test(desc)) return; // linhas de saldo do extrato
      lista.push({ data: data, valor: valor, desc: desc, fitid: '' });
    });
    return lista;
  };
  var extrato = null;
  F.processarExtrato = function (arquivo) {
    var leitor = new FileReader();
    leitor.onload = function () {
      var txt = String(leitor.result || '');
      var nome = (arquivo.name || '').toLowerCase();
      var movs = nome.endsWith('.ofx') || /<OFX>/i.test(txt) ? F.lerOFX(txt) : F.lerCSV(txt);
      if (!movs.length) return toast('Não encontrei movimentos nesse arquivo. Use o OFX do banco ou um CSV com data, descrição e valor.', 'error');
      extrato = { contaId: (el('finConcConta') || {}).value || st().contas[0].id, itens: F.casarExtrato(movs, (el('finConcConta') || {}).value || st().contas[0].id), arquivo: arquivo.name };
      F.renderConciliacao();
    };
    // Bancos brasileiros ainda exportam OFX em latin-1
    leitor.readAsText(arquivo, /\.ofx$/i.test(arquivo.name) ? 'ISO-8859-1' : 'UTF-8');
  };
  F.casarExtrato = function (movs, contaId) {
    var usados = {};
    return movs.map(function (mv, i) {
      var tipo = mv.valor >= 0 ? 'RECEITA' : 'DESPESA', valor = r2(Math.abs(mv.valor));
      var item = { i: i, data: mv.data, valor: valor, tipo: tipo, desc: mv.desc, fitid: mv.fitid, acao: 'importar', categoria: F.sugerir(mv.desc, tipo) || 'Outros' };
      // 1) já importado antes (mesmo identificador do banco)
      var dup = mv.fitid && st().transactions.find(function (t) { return t.fitid && t.fitid === mv.fitid; });
      if (dup) { item.acao = 'ja'; item.alvo = dup.id; usados[dup.id] = 1; return item; }
      // 2) lançamento pago com mesmo valor e data próxima
      var pago = st().transactions.find(function (t) { return !usados[t.id] && t.status === 'pago' && t.type === tipo && r2(t.amount) === valor && Math.abs(F.diffDias(t.pagoEm || t.date, mv.data)) <= 3; });
      if (pago) { item.acao = 'ja'; item.alvo = pago.id; usados[pago.id] = 1; return item; }
      // 3) conta em aberto com mesmo valor, vencimento até 7 dias de distância → dar baixa
      var cands = st().transactions.filter(function (t) { return !usados[t.id] && t.status !== 'pago' && t.type === tipo && r2(t.amount) === valor && Math.abs(F.diffDias(t.vencimento, mv.data)) <= 7; })
        .sort(function (a, b) { return Math.abs(F.diffDias(a.vencimento, mv.data)) - Math.abs(F.diffDias(b.vencimento, mv.data)); });
      if (cands[0]) { item.acao = 'baixar'; item.alvo = cands[0].id; usados[cands[0].id] = 1; }
      return item;
    });
  };
  F.renderConciliacao = function () {
    var v = el('view-reconciliation'); if (!v) return;
    F.garantirModelo();
    var contas = st().contas.map(function (c) { return '<option value="' + esc(c.id) + '"' + (extrato && extrato.contaId === c.id ? ' selected' : '') + '>' + esc(c.nome) + '</option>'; }).join('');
    var topo = '<div class="page-header"><div class="page-header-text"><h1>Conciliação Bancária</h1><p class="page-subtitle">Importe o extrato (OFX ou CSV). O sistema reconhece o que já foi lançado, dá baixa nas contas em aberto e sugere a categoria do resto.</p></div></div>';
    if (!extrato) {
      v.innerHTML = topo + '<div class="card" style="margin-top:12px"><div class="form-grid" style="max-width:520px;margin-bottom:14px"><div class="form-field span-2"><label class="form-label" for="finConcConta">Este extrato é da conta</label><select class="form-input" id="finConcConta">' + contas + '</select></div></div>' +
        '<label class="drop-zone" id="finConcDrop" style="display:block;text-align:center;cursor:pointer;padding:34px;border:2px dashed var(--gold-border);border-radius:var(--radius-sm)"><span style="font-size:32px;display:block;margin-bottom:10px">📄</span><h3>Arraste o extrato do banco aqui</h3><p class="fin-sub" style="margin-top:6px">Ou clique para escolher (.OFX ou .CSV). No app ou internet banking, procure por "exportar extrato" → OFX.</p>' +
        '<input type="file" accept=".ofx,.csv,.txt" style="display:none" onchange="this.files[0]&&fin.processarExtrato(this.files[0])"></label></div>';
      var drop = el('finConcDrop');
      if (drop) { drop.addEventListener('dragover', function (e) { e.preventDefault(); }); drop.addEventListener('drop', function (e) { e.preventDefault(); if (e.dataTransfer.files[0]) F.processarExtrato(e.dataTransfer.files[0]); }); }
      return;
    }
    var n = { ja: 0, baixar: 0, importar: 0, ignorar: 0 };
    extrato.itens.forEach(function (it) { n[it.acao]++; });
    var opcoesCat = function (it) { return (window.CATEGORIES[it.tipo] || []).map(function (c) { return '<option' + (c === it.categoria ? ' selected' : '') + '>' + esc(c) + '</option>'; }).join(''); };
    var linhas = extrato.itens.map(function (it) {
      var alvo = it.alvo ? F.tx(it.alvo) : null, rec = it.tipo === 'RECEITA';
      var sit = it.acao === 'ja' ? '<span class="fin-sit ok">Já lançado</span>' : it.acao === 'baixar' ? '<span class="fin-sit hoje">Dar baixa</span>' : it.acao === 'ignorar' ? '<span class="fin-sit">Ignorar</span>' : '<span class="fin-sit aberto">Novo</span>';
      var det = it.acao === 'ja' && alvo ? '<div class="fin-sub">↔ ' + esc(alvo.desc) + '</div>'
        : it.acao === 'baixar' && alvo ? '<div class="fin-sub">↔ ' + esc(alvo.desc) + (alvo.contato ? ' · ' + esc(alvo.contato) : '') + ' (venc. ' + F.dataBR(alvo.vencimento) + ')</div>'
          : it.acao === 'importar' ? '<select class="select-sm" style="margin-top:4px;max-width:240px" onchange="fin.concCat(' + it.i + ',this.value)" aria-label="Categoria">' + opcoesCat(it) + '</select>' : '';
      var acao = it.acao === 'ja' ? '—' : '<select class="select-sm" onchange="fin.concAcao(' + it.i + ',this.value)" aria-label="Ação">' +
        (it.alvo ? '<option value="baixar"' + (it.acao === 'baixar' ? ' selected' : '') + '>Baixar a conta</option>' : '') +
        '<option value="importar"' + (it.acao === 'importar' ? ' selected' : '') + '>Lançar como novo</option><option value="ignorar"' + (it.acao === 'ignorar' ? ' selected' : '') + '>Ignorar</option></select>';
      return '<tr><td style="white-space:nowrap">' + F.dataBR(it.data) + '</td><td><div style="font-weight:600">' + esc(it.desc) + '</div>' + det + '</td><td style="font-weight:700;white-space:nowrap" class="' + (rec ? 'fin-pos' : 'fin-neg') + '">' + (rec ? '+' : '−') + moeda(it.valor) + '</td><td>' + sit + '</td><td>' + acao + '</td></tr>';
    }).join('');
    var conta = F.contaPorId(extrato.contaId);
    v.innerHTML = topo + '<div class="fin-kpis"><div class="fin-kpi2"><div class="v">' + extrato.itens.length + '</div><div class="l">Movimentos no extrato</div><div class="s">' + esc(extrato.arquivo) + ' · ' + esc(conta ? conta.nome : '') + '</div></div>' +
      '<div class="fin-kpi2"><div class="v fin-pos">' + n.ja + '</div><div class="l">Já lançados</div></div><div class="fin-kpi2"><div class="v" style="color:#FBBF24">' + n.baixar + '</div><div class="l">Contas em aberto a baixar</div></div><div class="fin-kpi2"><div class="v" style="color:#93C5FD">' + n.importar + '</div><div class="l">Novos a lançar</div></div></div>' +
      '<div class="card"><div class="fin-bar"><span class="card-title">Revise e confirme</span><div style="display:flex;gap:8px"><button class="btn-ghost" onclick="fin.concCancelar()">Cancelar</button><button class="btn-primary" onclick="fin.concConfirmar()">Confirmar conciliação</button></div></div>' +
      '<div class="table-scroll" style="max-height:560px"><table class="data-table"><thead><tr><th>Data</th><th>Movimento do banco</th><th>Valor</th><th>Situação</th><th>Ação</th></tr></thead><tbody>' + linhas + '</tbody></table></div></div>';
  };
  F.concAcao = function (i, acao) { if (extrato) { extrato.itens[i].acao = acao; F.renderConciliacao(); } };
  F.concCat = function (i, cat) { if (extrato) extrato.itens[i].categoria = cat; };
  F.concCancelar = function () { extrato = null; F.renderConciliacao(); };
  F.concConfirmar = function () {
    if (!extrato) return;
    var baixas = 0, novos = 0;
    extrato.itens.forEach(function (it) {
      if (it.acao === 'baixar' && it.alvo) {
        var t = F.tx(it.alvo); if (!t) return;
        if (r2(t.amount) !== it.valor) { t.valorOriginal = t.amount; t.amount = it.valor; }
        t.status = 'pago'; t.pagoEm = it.data; t.contaId = extrato.contaId; t.atualizadoEm = Date.now(); if (it.fitid) t.fitid = it.fitid; baixas++;
      } else if (it.acao === 'importar') {
        var nt = { id: novoId(), type: it.tipo, desc: it.desc.slice(0, 120), amount: it.valor, category: it.categoria || 'Outros', date: it.data, vencimento: it.data, status: 'pago', pagoEm: it.data, contaId: extrato.contaId, notes: 'Importado do extrato', fitid: it.fitid || '', atualizadoEm: Date.now() };
        st().transactions.push(nt); F.aprender(nt); novos++;
      }
    });
    salvar();
    extrato = null;
    toast('Conciliação concluída: ' + baixas + ' baixa(s) e ' + novos + ' lançamento(s) novo(s).');
    F.renderConciliacao(); F.atualizarTudo();
  };

  // ════════════════ RELATÓRIOS E RESPOSTAS DO CFO COM NÚMEROS REAIS ════════════════
  // Substitui as fórmulas de exemplo do motor antigo (percentuais fixos) por cálculos dos lançamentos.
  F.periodoRecente = function () {
    var meses = F.mesesAte(F.mesAtual(), 3);
    var d = F.calcularDRE(meses, 'competencia');
    return { meses: meses, d: d, t: d.total };
  };
  F.patchEngine = function () {
    var E = (typeof engine !== 'undefined') ? engine : window.engine;
    if (!E || E.__fin) return;
    E.__fin = true;
    var p = function (v) { return (v * 100).toFixed(1).replace('.', ',') + '%'; };
    var sem = function () { return st().transactions.length === 0; };
    var vazio = 'Ainda não há lançamentos. Cadastre receitas e despesas (ou importe o extrato em Conciliação) para eu analisar com os seus números.';

    E.calcScore = function () {
      if (sem()) return 0;
      var k = F.indicadores(), r = F.periodoRecente().t, s = 50;
      s += r.resultado > 0 ? 15 : -25;
      var mg = r.bruta > 0 ? r.resultado / r.bruta : -1;
      if (mg >= 0.2) s += 15; else if (mg >= 0.1) s += 8; else if (mg < 0) s -= 5;
      if (k.runway !== null) { if (k.runway >= 6) s += 10; else if (k.runway >= 3) s += 5; else if (k.runway < 1) s -= 15; }
      if (k.aReceber > 0 && F.somar(k.vencidosRec) / k.aReceber > 0.2) s -= 10;
      if (k.negativoEm) s -= 15;
      if (k.saldo < 0) s -= 10;
      return Math.max(0, Math.min(100, Math.round(s)));
    };
    E.generateReport = function () {
      if (sem()) return vazio;
      var k = F.indicadores(), d = k.atual.dre, score = E.calcScore();
      return '**RESUMO FINANCEIRO — ' + F.nomeMes(k.mes).toUpperCase() + '**\n\n' +
        '• **Saldo em caixa hoje:** ' + moeda(k.saldo) + '\n' +
        '• **Receitas do mês:** ' + moeda(k.atual.receitas) + ' (mês passado: ' + moeda(k.anterior.receitas) + ')\n' +
        '• **Despesas do mês:** ' + moeda(k.atual.despesas) + ' (mês passado: ' + moeda(k.anterior.despesas) + ')\n' +
        '• **Resultado do mês:** ' + moeda(d.resultado) + (d.bruta ? ' — margem ' + p(d.resultado / d.bruta) : '') + '\n' +
        '• **A receber:** ' + moeda(k.aReceber) + (k.vencidosRec.length ? ' (' + moeda(F.somar(k.vencidosRec)) + ' em atraso)' : '') + '\n' +
        '• **A pagar:** ' + moeda(k.aPagar) + (k.vencidosPag.length ? ' (' + moeda(F.somar(k.vencidosPag)) + ' vencido)' : '') + '\n' +
        '• **Saúde financeira:** ' + score + '/100\n\n' +
        (k.negativoEm ? '⚠️ **Atenção:** pelo que está lançado, o caixa fica negativo em ' + F.dataBR(k.negativoEm) + '. Veja o Fluxo de Caixa.' : '✅ Pelo que está lançado, o caixa segue positivo nos próximos 90 dias.');
    };
    E.generateDRE = function () {
      if (sem()) return vazio;
      var r = F.periodoRecente(), t = r.t;
      var linha = function (n, v) { return '• ' + n + ': **' + moeda(v) + '**' + (t.bruta ? ' (' + p(v / t.bruta) + ')' : '') + '\n'; };
      return '**DRE — ' + F.nomeMes(r.meses[0]) + ' a ' + F.nomeMes(r.meses[2]) + ' (competência)**\n\n' +
        linha('Receita bruta', t.bruta) + linha('(−) Impostos sobre vendas', t.deducoes) + linha('(=) Receita líquida', t.liquida) +
        linha('(−) Custos', t.custos) + linha('(=) Lucro bruto', t.lucroBruto) + linha('(−) Pessoal', t.pessoal) + linha('(−) Despesas operacionais', t.operacionais) +
        linha('(=) Resultado operacional', t.operacional) + linha('(±) Financeiro e outras', t.finRec - t.finDesp + t.outras) + linha('(=) Resultado do período', t.resultado) +
        '\nO DRE completo, mês a mês e por categoria, está no menu **DRE Gerencial**.';
    };
    E.generateBurnRate = function () {
      if (sem()) return vazio;
      var k = F.indicadores();
      if (!k.queima) return '**RUNWAY**\n\nAinda não há despesas pagas nos últimos meses para calcular o ritmo de gastos. Saldo em caixa hoje: **' + moeda(k.saldo) + '**.';
      return '**BURN RATE E RUNWAY**\n\n• **Saldo em caixa hoje:** ' + moeda(k.saldo) + '\n• **Gasto médio mensal (pago, últimos 3 meses):** ' + moeda(k.queima) + '\n• **Runway:** **' + (k.runway > 0 ? k.runway.toFixed(1).replace('.', ',') + ' meses' : 'sem caixa') + '**\n\n' +
        'É quanto tempo o caixa atual paga as despesas sem nenhuma venda nova. ' + (k.runway >= 6 ? 'Está confortável (acima de 6 meses).' : k.runway >= 3 ? 'Está razoável; o ideal é passar de 6 meses.' : 'Está curto: priorize cobrar os atrasados e renegociar prazos.');
    };
    E.generateCashFlow = function () {
      if (sem()) return vazio;
      var k = F.indicadores(), pts = F.projecao(30, true), fim = pts[pts.length - 1].saldo;
      return '**FLUXO DE CAIXA — PRÓXIMOS 30 DIAS**\n\n• **Saldo hoje:** ' + moeda(k.saldo) + '\n• **Entradas previstas:** ' + moeda(k.aReceber30) + '\n• **Saídas previstas:** ' + moeda(k.aPagar30) + '\n• **Saldo previsto em 30 dias:** **' + moeda(fim) + '**\n\n' +
        (k.negativoEm ? '⚠️ O caixa fica negativo em **' + F.dataBR(k.negativoEm) + '**.' : '✅ Sem dia negativo previsto nos próximos 90 dias.') + '\n\nO gráfico dia a dia está em **Fluxo de Caixa e Bancos**.';
    };
    E.generateForecast = function () {
      if (sem()) return vazio;
      var hoje = F.hoje(), base = F.mesesAte(F.mes(F.addMeses(hoje, -1)), 3), pm = F.porMes(base, 'competencia');
      var mr = base.reduce(function (a, m) { return a + pm[m].receitas; }, 0) / 3, md = base.reduce(function (a, m) { return a + pm[m].despesas; }, 0) / 3;
      var txt = '**PROJEÇÃO DOS PRÓXIMOS 3 MESES**\n(o que já está lançado + média dos últimos 3 meses para o resto)\n\n';
      for (var i = 1; i <= 3; i++) {
        var m = F.mes(F.addMeses(hoje, i));
        var lanc = F.porMes([m], 'competencia')[m];
        var rec = Math.max(lanc.receitas, mr), desp = Math.max(lanc.despesas, md);
        txt += '**' + F.nomeMes(m) + ':** receitas ' + moeda(rec) + ' · despesas ' + moeda(desp) + ' · resultado **' + moeda(rec - desp) + '**' + (lanc.receitas || lanc.despesas ? ' (já lançado: ' + moeda(lanc.receitas) + ' / ' + moeda(lanc.despesas) + ')' : '') + '\n';
      }
      return txt;
    };
    E.generateBreakEven = function () {
      if (sem()) return vazio;
      var t = F.periodoRecente().t;
      if (!t.bruta) return '**PONTO DE EQUILÍBRIO**\n\nPreciso de receitas nos últimos 3 meses para calcular.';
      var variaveis = t.deducoes + t.custos, fixos = (t.pessoal + t.operacionais + t.finDesp) / 3;
      var mc = (t.bruta - variaveis) / t.bruta;
      if (mc <= 0) return '**PONTO DE EQUILÍBRIO**\n\nOs custos variáveis estão maiores que a receita (margem de contribuição negativa). Revise preços antes de tudo.';
      var pe = fixos / mc;
      return '**PONTO DE EQUILÍBRIO (últimos 3 meses)**\n\n• **Margem de contribuição:** ' + p(mc) + ' (receita − impostos − custos)\n• **Gastos fixos por mês:** ' + moeda(fixos) + ' (pessoal, operacionais e financeiros)\n• **Faturamento mínimo:** **' + moeda(pe) + ' por mês**\n• **Faturamento médio atual:** ' + moeda(t.bruta / 3) + ' por mês\n\n' +
        (t.bruta / 3 >= pe ? '✅ Você fatura acima do ponto de equilíbrio. Folga de ' + moeda(t.bruta / 3 - pe) + '/mês.' : '⚠️ Faltam ' + moeda(pe - t.bruta / 3) + '/mês para cobrir os gastos fixos.') +
        '\n\nPara o cálculo ficar certo, classifique fornecedores de mercadoria como "Custo de Mercadorias e Serviços" e impostos sobre faturamento como "Impostos e Taxas".';
    };
    E.generateWorkingCapital = function () {
      if (sem()) return vazio;
      var k = F.indicadores(), cg = k.saldo + k.aReceber30 - k.aPagar30;
      return '**CAPITAL DE GIRO (próximos 30 dias)**\n\n• Caixa hoje: ' + moeda(k.saldo) + '\n• (+) A receber em 30 dias: ' + moeda(k.aReceber30) + '\n• (−) A pagar em 30 dias: ' + moeda(k.aPagar30) + '\n• (=) **Folga de giro: ' + moeda(cg) + '**\n\n' +
        (cg < 0 ? '⚠️ Os compromissos dos próximos 30 dias passam do que você tem e vai receber. Negocie prazos com fornecedores ou antecipe recebíveis.' : '✅ Há folga para os compromissos dos próximos 30 dias.') +
        (k.vencidosRec.length ? '\n\n💸 ' + moeda(F.somar(k.vencidosRec)) + ' a receber já está em atraso: cobrar isso é o jeito mais barato de reforçar o giro.' : '');
    };
    E.generateKPIs = function () {
      if (sem()) return vazio;
      var k = F.indicadores(), t = F.periodoRecente().t, d = k.atual.dre;
      return '**INDICADORES**\n\n• Receita do mês: ' + moeda(d.bruta) + '\n• Margem bruta (3 meses): ' + (t.bruta ? p(t.lucroBruto / t.bruta) : '—') + '\n• Margem operacional (3 meses): ' + (t.bruta ? p(t.operacional / t.bruta) : '—') + '\n• Margem líquida (3 meses): ' + (t.bruta ? p(t.resultado / t.bruta) : '—') +
        '\n• Peso do pessoal na receita: ' + (t.bruta ? p(t.pessoal / t.bruta) : '—') + '\n• Inadimplência (atrasado ÷ a receber): ' + (k.aReceber ? p(F.somar(k.vencidosRec) / k.aReceber) : '0%') + '\n• Runway: ' + (k.runway !== null ? k.runway.toFixed(1).replace('.', ',') + ' meses' : '—') + '\n• Saúde financeira: ' + E.calcScore() + '/100';
    };
    E.generateMargins = E.generateKPIs;
    E.generateTaxPlanning = function () {
      var meses = F.mesesAte(F.mesAtual(), 12), pm = F.porMes(meses, 'competencia');
      var rbt12 = meses.reduce(function (a, m) { return a + (pm[m].grupos.receita || 0); }, 0);
      var regime = rbt12 <= 81000 ? 'MEI (até R$ 81 mil/ano)' : rbt12 <= 4800000 ? 'Simples Nacional' : rbt12 <= 78000000 ? 'Lucro Presumido ou Real' : 'Lucro Real';
      return '**PLANEJAMENTO TRIBUTÁRIO**\n\n• **Receita bruta dos últimos 12 meses (RBT12):** ' + moeda(rbt12) + '\n• **Faixa de enquadramento possível:** ' + regime + '\n\nPara comparar Simples, Presumido e Real com Fator R, sublimite e a transição da reforma (CBS/IBS de 2026 a 2033), abra o **Simulador Tributário** no menu. Confirme sempre com seu contador.';
    };
    E.generateCostReduction = function () {
      if (sem()) return vazio;
      var meses = F.mesesAte(F.mesAtual(), 3), pm = F.porMes(meses, 'competencia'), cats = {};
      meses.forEach(function (m) { Object.keys(pm[m].cats).forEach(function (k) { if (k.indexOf('DESPESA|') === 0) cats[k.slice(8)] = (cats[k.slice(8)] || 0) + pm[m].cats[k]; }); });
      var top = Object.keys(cats).sort(function (a, b) { return cats[b] - cats[a]; }).slice(0, 5);
      if (!top.length) return 'Não encontrei despesas nos últimos 3 meses.';
      var tot = Object.keys(cats).reduce(function (a, c) { return a + cats[c]; }, 0);
      return '**ONDE ESTÃO SEUS GASTOS (últimos 3 meses)**\n\n' + top.map(function (c, i) { return (i + 1) + '. **' + c + '**: ' + moeda(cats[c]) + ' (' + p(cats[c] / tot) + ' do total)'; }).join('\n') +
        '\n\nCortar 10% das duas maiores linhas libera cerca de **' + moeda((cats[top[0]] + (cats[top[1]] || 0)) * 0.1 / 3) + ' por mês**. Comece renegociando os contratos dessas categorias.';
    };
    E.generateInvestmentAdvice = function () {
      var k = F.indicadores();
      if (k.saldo <= 0) return 'Seu caixa está zerado ou negativo. Antes de investir, o foco é recompor o caixa: cobrar atrasados e reduzir saídas.';
      var reserva = k.queima * 3, livre = k.saldo - reserva - Math.max(0, k.aPagar30 - k.aReceber30);
      return '**USO DO CAIXA**\n\n• Caixa hoje: ' + moeda(k.saldo) + '\n• Reserva de 3 meses de gastos: ' + moeda(reserva) + '\n• Compromissos líquidos dos próximos 30 dias: ' + moeda(Math.max(0, k.aPagar30 - k.aReceber30)) + '\n• **Sobra para investir: ' + moeda(Math.max(0, livre)) + '**\n\n' +
        (livre > 0 ? 'A reserva pode ficar em aplicação de liquidez diária. A sobra pode ir para prazos maiores ou para crescimento do negócio. Não é recomendação de investimento: avalie com seu assessor.' : 'Ainda não há sobra depois da reserva de segurança. Priorize formar a reserva.');
    };
    E.generateDiagnosis = function () {
      if (sem()) return vazio;
      var k = F.indicadores(), t = F.periodoRecente().t, score = E.calcScore();
      var fortes = [], atencao = [];
      if (t.resultado > 0) fortes.push('Resultado positivo nos últimos 3 meses (' + moeda(t.resultado) + ').'); else atencao.push('Resultado negativo nos últimos 3 meses (' + moeda(t.resultado) + ').');
      if (t.bruta && t.resultado / t.bruta >= 0.15) fortes.push('Margem líquida de ' + p(t.resultado / t.bruta) + ', acima de 15%.'); else if (t.bruta) atencao.push('Margem líquida de ' + p(t.resultado / t.bruta) + '; o ideal é passar de 15%.');
      if (k.runway !== null) (k.runway >= 6 ? fortes : atencao).push('Runway de ' + k.runway.toFixed(1).replace('.', ',') + ' meses' + (k.runway >= 6 ? '.' : ' (ideal: 6 ou mais).'));
      if (k.vencidosRec.length) atencao.push(moeda(F.somar(k.vencidosRec)) + ' a receber em atraso (' + k.vencidosRec.length + ' conta(s)).');
      if (k.vencidosPag.length) atencao.push(moeda(F.somar(k.vencidosPag)) + ' em contas a pagar vencidas.');
      if (k.negativoEm) atencao.push('Caixa projetado fica negativo em ' + F.dataBR(k.negativoEm) + '.');
      if (!k.vencidosRec.length && !k.vencidosPag.length) fortes.push('Nenhuma conta em atraso.');
      return '**DIAGNÓSTICO FINANCEIRO**\n\n**Saúde financeira:** ' + score + '/100\n\n**Pontos fortes**\n' + (fortes.length ? fortes.map(function (x) { return '• ' + x; }).join('\n') : '• Ainda sem destaques.') +
        '\n\n**Pontos de atenção**\n' + (atencao.length ? atencao.map(function (x) { return '• ' + x; }).join('\n') : '• Nada crítico agora.') +
        '\n\nPergunte o que quiser sobre esses números, por exemplo: "o que faço primeiro para melhorar o caixa?"';
    };
    // Comandos rápidos ficam locais (instantâneos, com números reais); perguntas livres vão para a IA.
    var NAO_ENTENDI = 'Desculpe, não entendi. Pode reformular?';
    var tem = function (c, lista) { return lista.some(function (w) { return c.indexOf(w) > -1; }); };
    E.processCommand = function (cmd) {
      var c = String(cmd || '').toLowerCase().trim(), curto = c.length <= 45;
      if (c.length <= 20 && tem(c, ['oi', 'olá', 'ola', 'bom dia', 'boa tarde', 'boa noite', 'hello'])) return E.getGreeting();
      if (c.length <= 20 && tem(c, ['obrigad', 'valeu', 'thanks'])) return E.getThanks();
      if (curto) {
        if (tem(c, ['ajuda', 'o que você faz', 'comandos'])) return E.getHelp();
        if (tem(c, ['resumo', 'visão geral'])) return E.generateReport();
        if (tem(c, ['dre', 'demonstrativo'])) return E.generateDRE();
        if (tem(c, ['diagnóst', 'saúde financeira', 'score'])) return E.generateDiagnosis();
        if (tem(c, ['margem', 'margens', 'kpi', 'indicadores'])) return E.generateKPIs();
        if (tem(c, ['burn rate', 'runway'])) return E.generateBurnRate();
        if (tem(c, ['fluxo de caixa', 'cash flow'])) return E.generateCashFlow();
        if (tem(c, ['forecast', 'previsão', 'projeção'])) return E.generateForecast();
        if (tem(c, ['capital de giro'])) return E.generateWorkingCapital();
        if (tem(c, ['ponto de equilíbrio', 'break even', 'breakeven'])) return E.generateBreakEven();
        if (tem(c, ['planejamento tributário'])) return E.generateTaxPlanning();
        if (tem(c, ['investir', 'excedente'])) return E.generateInvestmentAdvice();
        if (tem(c, ['reduzir custo', 'cortar gasto', 'cortar custo'])) return E.generateCostReduction();
      }
      return NAO_ENTENDI;
    };
    E.generateSmartResponse = function () { return NAO_ENTENDI; };
    // Relatórios da tela "Relatórios" que abrem as telas novas
    if (window.reportDefs) {
      window.reportDefs.dre = { title: 'DRE Gerencial', fn: function () { setTimeout(function () { window.switchView('dre'); }, 0); return E.generateDRE(); }, tile: 'tile-dre' };
      window.reportDefs.cashflow = { title: 'Fluxo de Caixa', fn: function () { setTimeout(function () { window.switchView('fluxo'); }, 0); return E.generateCashFlow(); }, tile: 'tile-cashflow' };
    }
  };

  // ════════════════ INÍCIO ════════════════
  window.initFinanceiroModule = function () {
    injetarEstilos();
    F.atualizarCategorias();
    F.garantirModelo();
    F.montarMenu();
    F.ampliarFormulario();
    F.patchEngine();
  };
})();
