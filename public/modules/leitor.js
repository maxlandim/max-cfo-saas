/**
 * Landim Advisory — Leitor próprio de documentos (sem IA, no navegador, sem custo)
 * - Boleto bancário e conta de consumo/tributo em PDF: código de barras ou linha digitável → valor e vencimento exatos;
 *   beneficiário, pagador, CNPJ e categoria pelos rótulos do documento.
 * - Foto do boleto: lê o código de barras (Interleaved 2 of 5, 44 dígitos) e confere o dígito verificador.
 * - DANFE (PDF da NF-e): chave de acesso (confere o DV), fornecedor, totais, duplicatas e a tabela de produtos,
 *   conferindo quantidade × valor unitário e a soma dos itens com o total da nota.
 * Tudo roda no navegador: nenhum documento é enviado para IA externa.
 */
(function () {
  'use strict';
  var F = function () { return window.fin; };
  function st() { return window.state || {}; }
  function pad(n) { return String(n).padStart(2, '0'); }
  function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function semAcento(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function so(s) { return String(s || '').replace(/\D/g, ''); }
  function r2(v) { return Math.round(v * 100) / 100; }
  function r4(v) { return Math.round(v * 10000) / 10000; }
  // "1.234,56" → 1234.56 ; "10,0000" → 10 ; "1234.56" → 1234.56
  function numero(s) {
    s = String(s || '').replace(/R\$\s*/i, '').trim();
    if (!/\d/.test(s)) return NaN;
    if (/,\d+$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
    else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
    var x = Number(s.replace(/[^\d.\-]/g, ''));
    return isFinite(x) ? x : NaN;
  }
  function dataBRparaISO(s) { var m = String(s || '').match(/(\d{2})\/(\d{2})\/(\d{4})/); return m ? m[3] + '-' + m[2] + '-' + m[1] : ''; }
  var reValor = /^(R\$\s*)?\d{1,3}(\.\d{3})*,\d{2}$/;
  var reData = /\d{2}\/\d{2}\/\d{4}/;

  var L = {};

  // ═════════════ Dígitos verificadores ═════════════
  function mod10(s) {
    var t = 0, m = 2;
    for (var i = s.length - 1; i >= 0; i--) { var p = Number(s[i]) * m; t += Math.floor(p / 10) + (p % 10); m = m === 2 ? 1 : 2; }
    return (10 - (t % 10)) % 10;
  }
  function soma11(s) { var t = 0, w = 2; for (var i = s.length - 1; i >= 0; i--) { t += Number(s[i]) * w; w = w === 9 ? 2 : w + 1; } return t; }
  function dvBancario(s43) { var d = 11 - (soma11(s43) % 11); return d === 0 || d === 10 || d === 11 ? 1 : d; }
  function dvArrec11(s43) { var r = soma11(s43) % 11; return r <= 1 ? 0 : 11 - r; }
  L.cnpjValido = function (c) {
    c = so(c); if (c.length !== 14 || /^(\d)\1+$/.test(c)) return false;
    var calc = function (n) { var t = 0, p = n - 7; for (var i = 0; i < n; i++) { t += Number(c[i]) * p--; if (p < 2) p = 9; } var r = t % 11; return r < 2 ? 0 : 11 - r; };
    return calc(12) === Number(c[12]) && calc(13) === Number(c[13]);
  };

  // ═════════════ Código de barras ↔ linha digitável ═════════════
  L.codigoValido = function (c) {
    c = so(c); if (c.length !== 44) return false;
    if (c[0] === '8') {
      var resto = c.slice(0, 3) + c.slice(4), ref = c[2];
      if (ref === '6' || ref === '7') return mod10(resto) === Number(c[3]);
      if (ref === '8' || ref === '9') return dvArrec11(resto) === Number(c[3]);
      return false;
    }
    return dvBancario(c.slice(0, 4) + c.slice(5)) === Number(c[4]);
  };
  L.linhaParaCodigo = function (l) {
    l = so(l);
    if (l.length === 47 && l[0] !== '8') return l.slice(0, 4) + l[32] + l.slice(33, 47) + l.slice(4, 9) + l.slice(10, 20) + l.slice(21, 31);
    if (l.length === 48 && l[0] === '8') return l.slice(0, 11) + l.slice(12, 23) + l.slice(24, 35) + l.slice(36, 47);
    return '';
  };
  L.codigoParaLinha = function (c) {
    if (c[0] === '8') {
      var m = c[2] === '6' || c[2] === '7' ? mod10 : function (b) { return dvArrec11(b); };
      return [0, 11, 22, 33].map(function (i) { var b = c.slice(i, i + 11); return b + '-' + m(b); }).join(' ');
    }
    var livre = c.slice(19), c1 = c.slice(0, 4) + livre.slice(0, 5), c2 = livre.slice(5, 15), c3 = livre.slice(15, 25);
    c1 += mod10(c1); c2 += mod10(c2); c3 += mod10(c3);
    return c1.slice(0, 5) + '.' + c1.slice(5) + ' ' + c2.slice(0, 5) + '.' + c2.slice(5) + ' ' + c3.slice(0, 5) + '.' + c3.slice(5) + ' ' + c[4] + ' ' + c.slice(5, 19);
  };
  // Fator de vencimento: a contagem recomeçou em 1000 no dia 22/02/2025; fica a data mais próxima de hoje
  L.dataDoFator = function (fator) {
    fator = Number(fator); if (!(fator >= 1000)) return '';
    var nova = new Date(2025, 1, 22, 12); nova.setDate(nova.getDate() + (fator - 1000));
    var antiga = new Date(1997, 9, 7, 12); antiga.setDate(antiga.getDate() + fator);
    var agora = Date.now();
    return iso(Math.abs(nova - agora) <= Math.abs(antiga - agora) ? nova : antiga);
  };
  var SEGMENTOS = { 1: 'Prefeitura', 2: 'Água e esgoto', 3: 'Energia elétrica e gás', 4: 'Telefone e internet', 5: 'Órgão público', 6: 'Carnê', 7: 'Multa de trânsito' };
  L.doCodigo = function (c) {
    c = so(c); if (!L.codigoValido(c)) return null;
    if (c[0] === '8') {
      var real = c[2] === '6' || c[2] === '8';
      return { codigo: c, linha: L.codigoParaLinha(c), tipo: 'arrecadacao', segmento: Number(c[1]), valor: real ? r2(Number(c.slice(4, 15)) / 100) : 0, vencimento: '' };
    }
    return { codigo: c, linha: L.codigoParaLinha(c), tipo: 'bancario', banco: c.slice(0, 3), valor: r2(Number(c.slice(9, 19)) / 100), vencimento: L.dataDoFator(c.slice(5, 9)) };
  };
  // Procura a linha digitável (ou o código de barras) num texto e devolve o primeiro que confere
  L.codigoNoTexto = function (texto) {
    var t = String(texto || ''), achados = [];
    [/\d{5}[.\s]?\d{5}\s*\d{5}[.\s]?\d{6}\s*\d{5}[.\s]?\d{6}\s*\d\s*\d{14}/g, /8\d{10}[-\s]?\d\s*\d{11}[-\s]?\d\s*\d{11}[-\s]?\d\s*\d{11}[-\s]?\d/g, /\b\d{47,48}\b/g, /\b\d{44}\b/g].forEach(function (re) {
      (t.match(re) || []).forEach(function (x) { achados.push(so(x)); });
    });
    for (var i = 0; i < achados.length; i++) {
      var d = achados[i], c = d.length === 44 ? d : L.linhaParaCodigo(d);
      var r = c && L.doCodigo(c);
      if (r) return r;
    }
    return null;
  };

  // ═════════════ Campos de PDF pelo rótulo ═════════════
  // itens: [{s, p, x, y, w, h}] (y = linha de base, de cima para baixo). Procura o valor na mesma caixa de texto,
  // à direita na mesma linha ou logo abaixo do rótulo. 'ok' decide se um candidato serve.
  function pareceRotulo(o, rot) { return rot.h < 7.5 && o.h <= rot.h * 1.05; }
  L.campo = function (itens, re, ok, todos) {
    ok = ok || function (v) { return v.length > 1; };
    var cands = [];
    (itens || []).forEach(function (it) {
      var m = it.s.match(re); if (!m) return;
      var resto = it.s.slice(m.index + m[0].length).replace(/^[\s:.\-–()=]+/, '').trim();
      if (resto && ok(resto)) { cands.push({ v: resto, d: 0, it: it }); return; }
      var x2 = it.x + it.w;
      itens.forEach(function (o) {
        if (o === it || o.p !== it.p) return;
        var v = o.s.trim(); if (!v) return;
        var dy = o.y - it.y, alto = Math.max(it.h, o.h);
        if (Math.abs(dy) < alto * 0.6 && o.x - x2 > -2 && o.x - x2 < 260) {
          if (!pareceRotulo(o, it) && ok(v)) cands.push({ v: v, d: (o.x - x2) / 4 + 1, it: o });
        } else if (dy > 0 && dy < Math.max(it.h, 6) * 4.6 && o.x > it.x - 14 && o.x < it.x + Math.max(it.w, 60) + 40) {
          if (!pareceRotulo(o, it) && ok(v)) cands.push({ v: v, d: dy + Math.abs(o.x - it.x) / 10, it: o });
        }
      });
    });
    cands.sort(function (a, b) { return a.d - b.d; });
    if (todos) return cands;
    return cands.length ? cands[0].v : '';
  };
  function valorDe(itens, re) { var v = L.campo(itens, re, function (x) { return reValor.test(x.trim()); }); return v ? r2(numero(v)) : 0; }
  function dataDe(itens, re) { var v = L.campo(itens, re, function (x) { return reData.test(x); }); return dataBRparaISO(v); }
  function docs(texto) { return (String(texto || '').match(/\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/g) || []).map(so).filter(L.cnpjValido); }
  function limparNome(s) {
    s = String(s || '').replace(/\s+/g, ' ');
    s = s.split(/\s[-–]?\s*(CNPJ|CPF|CNPJ\/CPF|CPF\/CNPJ)\b|\s\d{2}\.\d{3}\.\d{3}\/|\s{2,}/i)[0];
    return s.replace(/[\s\-–:,]+$/, '').trim().slice(0, 80);
  }
  function nomeCurto(s) { return limparNome(s).split(' ').filter(function (p) { return !/^(ltda|me|epp|s\.?a\.?|eireli|-)$/i.test(p); }).slice(0, 4).join(' '); }
  function titulo(s) { return String(s || '').toLowerCase().replace(/(^|\s)(\S)/g, function (m, a, b) { return a + b.toUpperCase(); }).replace(/\b(Ltda|Me|Epp|Sa)\b|S\.a\./g, function (m) { return m.toUpperCase(); }).replace(/\b(De|Da|Do|Das|Dos|E)\b/g, function (m) { return m.toLowerCase(); }); }
  function contatoPorDoc(doc) {
    var c = st().contatos || {}, k = Object.keys(c).find(function (n) { var d = so((c[n] || {}).documento || (c[n] || {}).cnpj || ''); return d && d === doc; });
    return k || '';
  }
  function minhaEmpresa() { var s = st().settings || {}; return { cnpj: so(s.cnpj), nome: semAcento(s.company || '').toLowerCase().trim() }; }
  function categoria(nome, extra, tipo) {
    var f = F(); if (!f) return '';
    return (f.sugerirAprendida && f.sugerirAprendida(nome, tipo)) || (f.sugerirPadrao && (f.sugerirPadrao(nome, tipo) || f.sugerirPadrao(extra || '', tipo))) || '';
  }

  // ═════════════ Boleto e contas em PDF ═════════════
  var CONHECIDOS = [
    [/neoenergia/i, 'Neoenergia'], [/\benel\b/i, 'Enel'], [/cemig/i, 'Cemig'], [/copel/i, 'Copel'], [/\blight\b/i, 'Light'], [/celesc/i, 'Celesc'], [/equatorial/i, 'Equatorial'], [/energisa/i, 'Energisa'], [/cpfl/i, 'CPFL'], [/coelba/i, 'Coelba'],
    [/caesb/i, 'Caesb'], [/sabesp/i, 'Sabesp'], [/copasa/i, 'Copasa'], [/cedae|aguas do rio/i, 'Águas do Rio'], [/sanepar/i, 'Sanepar'], [/embasa/i, 'Embasa'], [/compesa/i, 'Compesa'], [/saneago/i, 'Saneago'],
    [/\bclaro\b/i, 'Claro'], [/\bvivo\b|telefonica/i, 'Vivo'], [/\btim\b/i, 'TIM'], [/\boi\b/i, 'Oi'], [/algar/i, 'Algar'],
    [/simples nacional/i, 'Receita Federal'], [/\bdarf\b|receita federal/i, 'Receita Federal'], [/\bgps\b|previd[eê]ncia social/i, 'INSS'], [/\bfgts\b/i, 'Caixa (FGTS)'], [/detran/i, 'Detran']
  ];
  L.boletoPdf = function (pdf) {
    if (!pdf) return null;
    var texto = pdf.texto || '', itens = pdf.itens || [], cod = L.codigoNoTexto(texto);
    if (!cod) return null;
    var eu = minhaEmpresa(), d = { forma: 'Boleto', linhaDigitavel: so(cod.linha), valor: cod.valor, vencimento: cod.vencimento, _leitor: true };
    var lido = function (re) { return L.campo(itens, re, function (v) { return /[A-Za-zÀ-ú]{3}/.test(v) && !/^(cpf|cnpj|ag[eê]ncia|nosso|c[oó]digo|data|vencimento|valor|endere[cç]o)/i.test(v); }); };
    if (cod.tipo === 'arrecadacao') {
      var das = /simples nacional/i.test(texto);
      var conhecido = CONHECIDOS.find(function (k) { return k[0].test(texto); });
      d.contato = conhecido ? conhecido[1] : '';
      d.vencimento = dataDe(itens, /pagar (este documento )?at[eé]|data de vencimento|vencimento|data limite/i) || (texto.match(/vencimento\D{0,20}(\d{2}\/\d{2}\/\d{4})/i) ? dataBRparaISO(RegExp.$1) : '');
      if (!(d.valor > 0)) d.valor = valorDe(itens, /total a pagar|valor total( do documento)?|valor a pagar|valor do documento|valor cobrado/i);
      var ref = L.campo(itens, /per[ií]odo de apura[cç][aã]o|refer[eê]ncia|conta referente a|m[eê]s de refer[eê]ncia/i, function (v) { return /\d|jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez/i.test(v) && v.length < 30; });
      var seg = SEGMENTOS[cod.segmento] || 'Conta';
      d.descricao = (das ? 'DAS — Simples Nacional' : (d.contato ? d.contato + ' — ' + seg.toLowerCase() : seg)) + (ref ? ' ' + ref : '');
      d.categoria = categoria(d.contato, '', 'DESPESA') || (das || cod.segmento === 1 || cod.segmento === 5 ? 'Impostos e Taxas' : cod.segmento >= 2 && cod.segmento <= 4 ? 'Energia e Utilidades' : '');
      d.tipo = 'DESPESA';
      d.completo = d.valor > 0 && !!d.vencimento && !!d.contato;
      return d;
    }
    // Boleto bancário
    var benef = lido(/\b(benefici[aá]rio|cedente)( final)?\b/i), pagador = lido(/\b(pagador|sacado)\b/i);
    var docBenef = docs(benef)[0] || '', docPag = docs(pagador)[0] || '';
    if (!docBenef) {
      // CNPJ perto do rótulo do beneficiário, ou o primeiro que não é do pagador
      var perto = L.campo(itens, /\b(benefici[aá]rio|cedente)\b|cpf\/?cnpj/i, function (v) { return docs(v).length > 0; });
      docBenef = docs(perto)[0] || docs(texto).filter(function (c) { return c !== docPag && c !== eu.cnpj; })[0] || '';
    }
    var nomeB = limparNome(benef), nomeP = limparNome(pagador);
    var ehMeu = (eu.cnpj && docBenef === eu.cnpj) || (eu.nome && nomeB && semAcento(nomeB).toLowerCase().indexOf(eu.nome.split(' ').slice(0, 2).join(' ')) === 0);
    d.tipo = ehMeu ? 'RECEITA' : 'DESPESA';
    var outro = ehMeu ? { nome: nomeP, doc: docPag } : { nome: nomeB, doc: docBenef };
    d.contato = (outro.doc && contatoPorDoc(outro.doc)) || titulo(outro.nome);
    if (outro.doc) d.documento = outro.doc;
    if (!(d.valor > 0)) d.valor = valorDe(itens, /valor (do documento|cobrado)|\(=\)\s*valor/i);
    if (!d.vencimento) d.vencimento = dataDe(itens, /vencimento/i);
    var instr = L.campo(itens, /instru[cç][oõ]es|n[ºo°.]\s*do documento|refer[eê]nte|descri[cç][aã]o/i, function (v) { return /[A-Za-zÀ-ú]{4}/.test(v); });
    var curto = titulo(nomeCurto(outro.nome || ''));
    var refx = texto.match(/refer[eê]nte\s+(?:(?:aos|ao|às|as|à|a)\s+)?([^.;\n]{3,60})/i);
    var sobre = refx ? refx[1].trim() : (/^[A-Za-zÀ-ú]{4}/.test(instr || '') ? titulo(instr) : '');
    d.descricao = (sobre ? sobre.replace(/^\S/, function (m) { return m.toUpperCase(); }) + (curto ? ' — ' + curto : '') : (ehMeu ? 'Cobrança ' : 'Boleto ') + curto).trim().slice(0, 120);
    d.categoria = categoria(d.contato, sobre + ' ' + (instr || ''), d.tipo);
    d.completo = d.valor > 0 && !!d.vencimento && !!d.contato;
    return d;
  };

  // ═════════════ DANFE (PDF da NF-e) ═════════════
  L.chaveValida = function (c) { c = so(c); return c.length === 44 && /^(55|65)$/.test(c.slice(20, 22)) && (function () { var r = 11 - (soma11(c.slice(0, 43)) % 11); return (r >= 10 ? 0 : r) === Number(c[43]); })(); };
  function chaveNoTexto(t) {
    var m = String(t || '').match(/(\d{4}[\s.]?){10}\d{4}/g) || [];
    for (var i = 0; i < m.length; i++) { var c = so(m[i]); if (L.chaveValida(c)) return c; }
    var corrido = so(t), j;
    for (j = 0; j + 44 <= corrido.length; j++) { var x = corrido.slice(j, j + 44); if (L.chaveValida(x)) return x; }
    return '';
  }
  function itensDaTabela(itens) {
    var out = [], porPag = {};
    itens.forEach(function (it) { (porPag[it.p] = porPag[it.p] || []).push(it); });
    Object.keys(porPag).forEach(function (p) {
      var pg = porPag[p];
      var hNcm = pg.find(function (it) { return /^NCM/i.test(it.s.trim()); }); if (!hNcm) return;
      var banda = pg.filter(function (it) { return Math.abs(it.y - hNcm.y) < 9; });
      var achar = function (re) { var h = banda.find(function (it) { return re.test(semAcento(it.s).trim()); }); return h ? h.x : null; };
      var col = { cod: achar(/^COD/i), desc: achar(/^DESCRI/i), ncm: hNcm.x, cst: achar(/CST|^O\/CS|^CSOSN/i), cfop: achar(/^CFOP/i), un: achar(/^UN/i), qtd: achar(/^QU?A?NT/i), vu: achar(/^V(A?LO?R|L)\.?\s*UNIT|^VALOR UNIT|^V\.\s*UNIT|UNIT/i), vt: achar(/^V(A?LO?R|L)\.?\s*TOTAL|^VALOR TOTAL|^V\.\s*TOTAL/i) };
      if (col.desc === null || col.qtd === null || col.vt === null) return;
      var nomes = Object.keys(col).filter(function (k) { return col[k] !== null; }).sort(function (a, b) { return col[a] - col[b]; });
      var limites = nomes.map(function (k, i) { return i + 1 < nomes.length ? (col[k] + col[nomes[i + 1]]) / 2 - 2 : 1e9; });
      var colunaDe = function (x) { for (var i = 0; i < nomes.length; i++) if (x < limites[i]) return nomes[i]; return nomes[nomes.length - 1]; };
      // colunas depois do valor total (ICMS, IPI…) ficam de fora
      var depois = banda.filter(function (it) { return it.x > col.vt + 4; }).map(function (it) { return it.x; }).sort(function (a, b) { return a - b; })[0] || 1e9;
      var fim = pg.filter(function (it) { return it.y > hNcm.y + 6 && /DADOS ADICIONAIS|INFORMA[CÇ][OÕ]ES COMPLEMENTARES|C[AÁ]LCULO DO ISSQN|RESERVADO AO FISCO/i.test(it.s); }).map(function (it) { return it.y; }).sort(function (a, b) { return a - b; })[0] || 1e9;
      var corpo = pg.filter(function (it) { return it.y > hNcm.y + 5 && it.y < fim - 2 && it.x < depois - 2; }).sort(function (a, b) { return a.y - b.y || a.x - b.x; });
      var linhas = [];
      corpo.forEach(function (it) { var l = linhas[linhas.length - 1]; if (l && Math.abs(l.y - it.y) < 2.5) l.its.push(it); else linhas.push({ y: it.y, its: [it] }); });
      linhas.forEach(function (l) {
        var v = {};
        l.its.sort(function (a, b) { return a.x - b.x; }).forEach(function (it) { var k = colunaDe(it.x); v[k] = (v[k] ? v[k] + ' ' : '') + it.s.trim(); });
        var ncm = so(v.ncm || '');
        if ((ncm.length === 8 || ncm === '00') && !isNaN(numero(v.qtd)) && !isNaN(numero(v.vt))) {
          var q = numero(v.qtd), vt = numero(v.vt), vu = numero(v.vu);
          out.push({ codigo: (v.cod || '').trim(), descricao: (v.desc || '').trim(), ncm: ncm.length === 8 ? ncm : '', ean: '', unidade: String(v.un || '').trim().toUpperCase(), quantidade: r4(q), valorUnitario: isNaN(vu) ? (q ? r4(vt / q) : 0) : r4(vu), valorTotal: r2(vt), desconto: 0, cfop: so(v.cfop) });
        } else if (out.length && v.desc && Object.keys(v).length === 1) {
          out[out.length - 1].descricao += ' ' + v.desc.trim(); // descrição em mais de uma linha
        }
      });
    });
    return out;
  }
  L.danfePdf = function (pdf) {
    if (!pdf) return null;
    var texto = pdf.texto || '', itens = pdf.itens || [];
    if (!/DANFE|Documento Auxiliar da Nota Fiscal/i.test(texto)) return null;
    var chave = chaveNoTexto(texto); if (!chave) return null;
    var n = { chave: chave, cnpj: chave.slice(6, 20), serie: String(Number(chave.slice(22, 25))), numero: String(Number(chave.slice(25, 34))), origem: 'leitor' };
    var receb = texto.match(/RECEBEMOS DE\s+(.+?)\s+OS PRODUTOS/i);
    n.razao = receb ? limparNome(receb[1]) : limparNome(L.campo(itens, /IDENTIFICA[CÇ][AÃ]O DO EMITENTE/i, function (v) { return /[A-Za-z]{3}/.test(v); }));
    n.fornecedor = titulo(n.razao);
    n.dataEmissao = dataDe(itens, /DATA D[AE] EMISS[AÃ]O/i) || dataBRparaISO((texto.match(/EMISS[AÃ]O:?\s*(\d{2}\/\d{2}\/\d{4})/i) || [])[1]);
    n.valorProdutos = valorDe(itens, /VALOR TOTAL DOS PRODUTOS|V\.?\s*TOTAL PRODUTOS/i);
    n.frete = valorDe(itens, /VALOR DO FRETE/i); n.seguro = valorDe(itens, /VALOR DO SEGURO/i);
    n.desconto = valorDe(itens, /^DESCONTO$|^VALOR DO DESCONTO|^DESCONTOS?$/i); n.outras = valorDe(itens, /OUTRAS DESPESAS/i);
    n.ipi = valorDe(itens, /VALOR (TOTAL )?DO IPI|V\.?\s*IPI$/i); n.icmsST = valorDe(itens, /VALOR DO ICMS SUBST|VALOR DO ICMS ST|V\.?\s*ICMS SUBST/i);
    n.valorTotal = valorDe(itens, /VALOR TOTAL DA NOTA|V\.?\s*TOTAL DA NOTA/i) || r2(numero((texto.match(/VALOR TOTAL:?\s*R\$\s*([\d.]+,\d{2})/i) || [])[1]));
    // duplicatas, entre "FATURA/DUPLICATA" e "CÁLCULO DO IMPOSTO"
    var ini = texto.search(/FATURA|DUPLICATA/i), fimF = texto.search(/C[AÁ]LCULO DO IMPOSTO/i);
    n.parcelas = [];
    if (ini > -1) {
      var trecho = texto.slice(ini, fimF > ini ? fimF : ini + 1500), re = /(\d{1,3}[A-Z]?)\D{0,40}?(\d{2}\/\d{2}\/\d{4})\D{0,40}?(\d{1,3}(?:\.\d{3})*,\d{2})/g, m;
      while ((m = re.exec(trecho))) n.parcelas.push({ numero: m[1], vencimento: dataBRparaISO(m[2]), valor: r2(numero(m[3])) });
    }
    n.itens = itensDaTabela(itens);
    var soma = r2(n.itens.reduce(function (a, i) { return a + i.valorTotal; }, 0));
    var linhasOk = n.itens.length > 0 && n.itens.every(function (i) { return i.descricao && Math.abs(i.quantidade * i.valorUnitario - i.valorTotal) <= Math.max(0.02, i.valorTotal * 0.005); });
    var parcOk = !n.parcelas.length || Math.abs(n.parcelas.reduce(function (a, p) { return a + p.valor; }, 0) - n.valorTotal) < 0.05;
    if (!parcOk) n.parcelas = [];
    n.conferido = linhasOk && n.valorProdutos > 0 && Math.abs(soma - n.valorProdutos) < 0.05 && n.valorTotal > 0;
    n.cabecalhoOk = !!(n.fornecedor && n.valorTotal > 0);
    return n;
  };
  // Para "Ler boleto ou nota" no financeiro: a nota vira uma conta a pagar (ou a receber, se a emitente é a própria empresa)
  L.contaDaNota = function (n) {
    if (!n || !n.cabecalhoOk) return null;
    var eu = minhaEmpresa(), minha = eu.cnpj && n.cnpj === eu.cnpj;
    var venc = n.parcelas && n.parcelas[0] ? n.parcelas[0].vencimento : n.dataEmissao;
    return { tipo: minha ? 'RECEITA' : 'DESPESA', descricao: (minha ? 'Venda NF ' : 'Compra NF ') + n.numero + (minha ? '' : ' — ' + nomeCurto(n.fornecedor)), contato: minha ? '' : (contatoPorDoc(n.cnpj) || n.fornecedor), documento: minha ? '' : n.cnpj,
      valor: n.valorTotal, vencimento: venc, dataEmissao: n.dataEmissao, categoria: minha ? 'Vendas de Produto' : categoria(n.fornecedor, '', 'DESPESA') || 'Fornecedores', chaveNfe: n.chave, forma: n.parcelas && n.parcelas.length ? 'Boleto' : '',
      parcelas: n.parcelas && n.parcelas.length > 1 ? n.parcelas : null, _leitor: true, completo: !minha };
  };
  // Um PDF qualquer: tenta nota e boleto
  L.lerPdf = function (pdf) {
    var n = L.danfePdf(pdf);
    if (n && n.cabecalhoOk) return L.contaDaNota(n);
    return L.boletoPdf(pdf);
  };

  // ═════════════ Foto: código de barras do boleto (Interleaved 2 of 5) ═════════════
  var PADRAO = { nnwwn: 0, wnnnw: 1, nwnnw: 2, wwnnn: 3, nnwnw: 4, wnwnn: 5, nwwnn: 6, nnnww: 7, wnnwn: 8, nwnwn: 9 };
  function classe(ws) {
    var s = ws.slice().sort(function (a, b) { return a - b; });
    if (s[3] < s[2] * 1.35) return null;
    var lim = (s[2] + s[3]) / 2;
    return ws.map(function (w) { return w > lim ? 'w' : 'n'; }).join('');
  }
  function decodificar(r) { // r: larguras alternadas começando por barra
    for (var i = 0; i + 4 + 220 + 3 <= r.length; i += 2) {
      var n = (r[i] + r[i + 1] + r[i + 2] + r[i + 3]) / 4;
      if (Math.max(r[i], r[i + 1], r[i + 2], r[i + 3]) > n * 1.8 || Math.min(r[i], r[i + 1], r[i + 2], r[i + 3]) < n * 0.45) continue;
      if (i > 0 && r[i - 1] < n * 4) continue; // margem branca antes do início
      var dig = '', j = i + 4, ok = true;
      for (var k = 0; k < 22; k++) {
        var pb = classe([r[j], r[j + 2], r[j + 4], r[j + 6], r[j + 8]]), ps = classe([r[j + 1], r[j + 3], r[j + 5], r[j + 7], r[j + 9]]);
        if (!pb || !ps || PADRAO[pb] === undefined || PADRAO[ps] === undefined) { ok = false; break; }
        dig += PADRAO[pb] + '' + PADRAO[ps]; j += 10;
      }
      if (!ok) continue;
      if (L.codigoValido(dig)) return dig;
    }
    return null;
  }
  function larguras(row, lim) {
    var runs = [], cor = null, cont = 0;
    for (var x = 0; x < row.length; x++) {
      var escuro = row[x] < lim;
      if (cor === null) { if (!escuro) continue; cor = true; cont = 1; continue; }
      if (escuro === cor) cont++; else { runs.push(cont); cor = escuro; cont = 1; }
    }
    if (cor !== null) runs.push(cont);
    return runs;
  }
  function varrer(canvas) {
    var w = canvas.width, h = canvas.height, ctx = canvas.getContext('2d', { willReadFrequently: true });
    var px = ctx.getImageData(0, 0, w, h).data, lum = new Uint8Array(w * h);
    for (var i = 0, j = 0; i < px.length; i += 4, j++) lum[j] = (px[i] * 299 + px[i + 1] * 587 + px[i + 2] * 114) / 1000;
    var passo = Math.max(2, Math.floor(h / 260)), row = new Float32Array(w);
    for (var y = 3; y < h - 3; y += passo) {
      // média de 5 linhas: as barras são verticais, então o ruído some e as barras ficam
      for (var x = 0; x < w; x++) { var a = 0; for (var d = -2; d <= 2; d++) a += lum[(y + d) * w + x]; row[x] = a / 5; }
      var amostra = [];
      for (x = 0; x < w; x += 3) amostra.push(row[x]);
      amostra.sort(function (a, b) { return a - b; });
      var p10 = amostra[Math.floor(amostra.length * 0.1)], p90 = amostra[Math.floor(amostra.length * 0.9)];
      if (p90 - p10 < 30) continue;
      var r = larguras(row, (p10 + p90) / 2);
      if (r.length < 227) continue;
      var c = decodificar(r);
      if (c) return c;
    }
    return null;
  }
  function desenhar(bmp, ang, maxLado) {
    var esc = Math.min(1, maxLado / Math.max(bmp.width, bmp.height)), w = bmp.width * esc, h = bmp.height * esc;
    var rad = ang * Math.PI / 180, cw = Math.round(Math.abs(w * Math.cos(rad)) + Math.abs(h * Math.sin(rad))), ch = Math.round(Math.abs(w * Math.sin(rad)) + Math.abs(h * Math.cos(rad)));
    var cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
    var ctx = cv.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cw, ch);
    ctx.translate(cw / 2, ch / 2); ctx.rotate(rad); ctx.drawImage(bmp, -w / 2, -h / 2, w, h);
    return cv;
  }
  L.codigoNaImagem = async function (arq) {
    var bmp;
    try { bmp = await createImageBitmap(arq, { imageOrientation: 'from-image' }); } catch (e) { try { bmp = await createImageBitmap(arq); } catch (e2) { return null; } }
    // 1) leitor de código de barras do próprio navegador (Android, Mac), quando existe
    try {
      if (window.BarcodeDetector) {
        var fmts = await window.BarcodeDetector.getSupportedFormats();
        if (fmts.indexOf('itf') > -1) {
          var achados = await new window.BarcodeDetector({ formats: ['itf'] }).detect(bmp);
          for (var i = 0; i < achados.length; i++) { var v = so(achados[i].rawValue); if (L.codigoValido(v)) return v; }
        }
      }
    } catch (e) { console.warn('BarcodeDetector:', e); }
    // 2) leitor próprio: várias inclinações e escalas
    var angulos = [0, 180, -2, 2, -4, 4, -7, 7, 90, -90, -10, 10], tamanhos = [2200, 1400, 3000];
    for (var t = 0; t < tamanhos.length; t++) {
      for (var a = 0; a < angulos.length; a++) {
        var c = varrer(desenhar(bmp, angulos[a], tamanhos[t]));
        if (c) return c;
      }
    }
    return null;
  };
  L.boletoDaImagem = async function (arq) {
    var c = await L.codigoNaImagem(arq); if (!c) return null;
    var r = L.doCodigo(c); if (!r) return null;
    var seg = r.tipo === 'arrecadacao' ? (SEGMENTOS[r.segmento] || 'Conta') : 'Boleto';
    return { tipo: 'DESPESA', forma: 'Boleto', linhaDigitavel: so(r.linha), valor: r.valor, vencimento: r.vencimento, descricao: seg, categoria: r.tipo === 'arrecadacao' ? (r.segmento === 1 || r.segmento === 5 ? 'Impostos e Taxas' : r.segmento >= 2 && r.segmento <= 4 ? 'Energia e Utilidades' : '') : '', _leitor: true, _soCodigo: true, completo: false };
  };

  window.leitor = L;
})();
