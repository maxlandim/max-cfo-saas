/**
 * Landim Advisory — Importação de planilha (Excel ou CSV) de contas a pagar e a receber.
 * Reconhece as colunas pelo nome, deixa ajustar, mostra a prévia com erros e duplicados
 * e lança tudo de uma vez. Tem um modelo de planilha para baixar.
 */
(function () {
  'use strict';
  var F = function () { return window.fin; };
  function el(id) { return document.getElementById(id); }
  function esc(s) { return F().esc(s); }
  function moeda(v) { return F().moeda(v); }
  function toast(m, t) { if (window.showToast) window.showToast(m, t || 'success'); }
  function st() { return window.state; }
  function sa(s) { return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim(); }
  function r2(v) { return Math.round(v * 100) / 100; }

  // Campos do sistema e os nomes de coluna que costumam aparecer nas planilhas
  var CAMPOS = [
    ['tipo', 'Tipo (receber ou pagar)', ['tipo', 'natureza', 'operacao', 'receber/pagar', 'entrada/saida', 'movimento', 'r/p']],
    ['desc', 'Descrição', ['descricao', 'historico', 'item', 'referente', 'documento', 'nome da conta', 'conta', 'produto']],
    ['contato', 'Cliente ou fornecedor', ['cliente', 'fornecedor', 'cliente/fornecedor', 'favorecido', 'contato', 'pagador', 'beneficiario', 'razao social', 'nome']],
    ['valor', 'Valor', ['valor', 'valor (r$)', 'valor r$', 'total', 'montante', 'valor total', 'preco', 'quantia']],
    ['venc', 'Vencimento', ['vencimento', 'data de vencimento', 'data vencimento', 'venc', 'vence em', 'data']],
    ['comp', 'Competência (opcional)', ['competencia', 'data de emissao', 'emissao', 'data emissao', 'data do documento']],
    ['categoria', 'Categoria', ['categoria', 'plano de contas', 'classificacao', 'conta contabil', 'grupo']],
    ['centro', 'Centro de custo', ['centro de custo', 'centro', 'cc', 'projeto', 'filial', 'unidade']],
    ['status', 'Situação (pago ou em aberto)', ['situacao', 'status', 'pago', 'quitado', 'baixado']],
    ['pagoEm', 'Data do pagamento', ['data do pagamento', 'data pagamento', 'pago em', 'data da baixa', 'data baixa', 'data de recebimento', 'recebido em', 'data recebimento', 'liquidacao']],
    ['forma', 'Forma de pagamento', ['forma de pagamento', 'forma', 'meio de pagamento', 'meio']],
    ['notas', 'Observação', ['observacao', 'observacoes', 'obs', 'notas', 'comentario', 'detalhes']]
  ];
  var sessao = null; // { linhas: [[...]], cab: [...], mapa: {campo: indice}, tipoPadrao, criarCats }

  // ── Leitura do arquivo ──
  function carregarXlsx() {
    if (window.XLSX) return Promise.resolve(window.XLSX);
    return new Promise(function (ok, erro) {
      var s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
      s.onload = function () { ok(window.XLSX); }; s.onerror = function () { erro(new Error('Não consegui abrir arquivos do Excel agora. Salve a planilha como CSV e tente de novo.')); };
      document.head.appendChild(s);
    });
  }
  function lerTexto(arq) {
    return arq.arrayBuffer().then(function (buf) {
      var t = new TextDecoder('utf-8').decode(buf);
      if (t.indexOf('�') > -1) t = new TextDecoder('windows-1252').decode(buf); // CSV salvo pelo Excel em português
      return t.replace(/^﻿/, '');
    });
  }
  function csvParaLinhas(t) {
    var primeira = t.split(/\r?\n/)[0] || '';
    var sep = (primeira.match(/;/g) || []).length >= (primeira.match(/,/g) || []).length ? ';' : ((primeira.match(/\t/g) || []).length > (primeira.match(/,/g) || []).length ? '\t' : ',');
    var linhas = [], linha = [], campo = '', aspas = false;
    for (var i = 0; i < t.length; i++) {
      var c = t[i];
      if (aspas) {
        if (c === '"') { if (t[i + 1] === '"') { campo += '"'; i++; } else aspas = false; } else campo += c;
      } else if (c === '"') aspas = true;
      else if (c === sep) { linha.push(campo); campo = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && t[i + 1] === '\n') i++; linha.push(campo); linhas.push(linha); linha = []; campo = ''; }
      else campo += c;
    }
    if (campo !== '' || linha.length) { linha.push(campo); linhas.push(linha); }
    return linhas;
  }
  async function lerArquivo(arq) {
    var nome = String(arq.name || '').toLowerCase();
    if (/\.(xlsx|xlsm|xls|ods)$/.test(nome)) {
      var X = await carregarXlsx();
      var wb = X.read(await arq.arrayBuffer(), { type: 'array', cellDates: true });
      var aba = wb.Sheets[wb.SheetNames[0]];
      return X.utils.sheet_to_json(aba, { header: 1, raw: true, defval: '' });
    }
    return csvParaLinhas(await lerTexto(arq));
  }

  // ── Conversões ──
  function numero(v) {
    if (typeof v === 'number') return isFinite(v) ? v : NaN;
    var t = String(v == null ? '' : v).trim();
    if (!t) return NaN;
    var neg = /^\(.*\)$/.test(t) || /^[^\d]*-/.test(t) || /-\s*$/.test(t);
    t = t.replace(/[^\d,.\-]/g, '');
    if (t.indexOf(',') > -1 && t.lastIndexOf(',') > t.lastIndexOf('.')) t = t.replace(/\./g, '').replace(',', '.');
    else t = t.replace(/,/g, '');
    var n = parseFloat(t);
    if (!isFinite(n)) return NaN;
    return neg && n > 0 ? -n : n;
  }
  function pad(n) { return String(n).padStart(2, '0'); }
  function dataISO(v) {
    if (v == null || v === '') return '';
    if (v instanceof Date && !isNaN(v)) return v.getFullYear() + '-' + pad(v.getMonth() + 1) + '-' + pad(v.getDate());
    if (typeof v === 'number' && v > 20000 && v < 80000) { var d = new Date(Math.round((v - 25569) * 864e5) + 12 * 3600e3); return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()); }
    var t = String(v).trim(), m;
    if ((m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) return m[1] + '-' + pad(m[2]) + '-' + pad(m[3]);
    if ((m = t.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})/))) { var a = m[3].length === 2 ? '20' + m[3] : m[3]; if (+m[2] >= 1 && +m[2] <= 12 && +m[1] >= 1 && +m[1] <= 31) return a + '-' + pad(m[2]) + '-' + pad(m[1]); }
    return '';
  }
  function tipoDe(v) {
    var t = sa(v); if (!t) return '';
    if (/^(r|c|e|\+)$|receb|receita|entrada|credito|venda|cliente/.test(t)) return 'RECEITA';
    if (/^(p|d|s|-)$|pag|despesa|saida|debito|compra|fornecedor/.test(t)) return 'DESPESA';
    return '';
  }
  function pagoDe(v) {
    var t = sa(v); if (!t) return null;
    if (/^(sim|s|x|ok|1|true)$|pago|recebido|quitad|baixad|liquidad|realizado|conciliado/.test(t)) return true;
    if (/^(nao|n|0|false)$|aberto|pendente|a pagar|a receber|previsto|vencid/.test(t)) return false;
    return null;
  }
  function categoriaDe(nome, tipo) {
    var lista = (window.CATEGORIES && window.CATEGORIES[tipo]) || [], alvo = sa(nome);
    if (!alvo) return '';
    for (var i = 0; i < lista.length; i++) if (sa(lista[i]) === alvo) return lista[i];
    return '';
  }

  // ── Mapeamento automático das colunas ──
  function acharCabecalho(linhas) {
    for (var i = 0; i < Math.min(linhas.length, 15); i++) {
      var cheias = (linhas[i] || []).filter(function (c) { return String(c).trim() !== ''; });
      if (cheias.length >= 2 && cheias.every(function (c) { return isNaN(numero(c)) || /[a-z]/i.test(String(c)); })) return i;
    }
    return 0;
  }
  function mapear(cab) {
    var mapa = {}, usadas = {};
    CAMPOS.forEach(function (c) {
      var melhor = -1, nota = 0;
      cab.forEach(function (h, i) {
        if (usadas[i]) return; var n = sa(h); if (!n) return;
        c[2].forEach(function (sin) {
          var p = n === sin ? 3 : (n.indexOf(sin) === 0 ? 2 : (n.indexOf(sin) > -1 ? 1 : 0));
          if (sin.length <= 2 && p < 3) p = 0; // siglas só valem exatas
          if (p > nota) { nota = p; melhor = i; }
        });
      });
      if (melhor > -1) { mapa[c[0]] = melhor; usadas[melhor] = 1; }
    });
    return mapa;
  }

  // ── Monta os lançamentos a partir das linhas ──
  function montar() {
    var s = sessao, mp = s.mapa, hoje = F().hoje();
    var chaves = {};
    st().transactions.forEach(function (t) { chaves[[t.type, t.vencimento, r2(t.amount), sa(t.desc)].join('|')] = 1; });
    var vistos = {};
    return s.linhas.map(function (lin, idx) {
      var g = function (c) { return mp[c] == null ? '' : lin[mp[c]]; };
      var erros = [];
      var valor = numero(g('valor'));
      var tipo = tipoDe(g('tipo')) || (mp.tipo == null && isFinite(valor) && valor < 0 ? 'DESPESA' : '') || s.tipoPadrao;
      if (!isFinite(valor) || valor === 0) erros.push('valor');
      valor = Math.abs(valor);
      var venc = dataISO(g('venc')), comp = dataISO(g('comp')), pagoEm = dataISO(g('pagoEm'));
      if (!venc) venc = pagoEm || comp;
      if (!venc) erros.push('vencimento');
      var contato = String(g('contato') || '').trim().slice(0, 80);
      var desc = String(g('desc') || '').trim().slice(0, 120) || contato || (g('categoria') ? String(g('categoria')).trim() : '');
      if (!desc) erros.push('descrição');
      var pago = pagoDe(g('status')); if (pago === null) pago = !!pagoEm;
      var catTxt = String(g('categoria') || '').trim().slice(0, 50), cat = categoriaDe(catTxt, tipo), catNova = '';
      if (!cat && catTxt && s.criarCats) { cat = catTxt; catNova = catTxt; }
      if (!cat) cat = F().sugerir(contato || desc, tipo) || 'Outros';
      var o = { type: tipo, desc: desc, amount: r2(valor), vencimento: venc, date: comp || venc, status: pago ? 'pago' : 'pendente', pagoEm: pago ? (pagoEm || venc) : '', contato: contato, category: cat,
        centroCusto: String(g('centro') || '').trim().slice(0, 60), forma: String(g('forma') || '').trim().slice(0, 30), notes: String(g('notas') || '').trim().slice(0, 500), origem: 'planilha' };
      var chave = [o.type, o.vencimento, o.amount, sa(o.desc)].join('|');
      var dup = !!chaves[chave] || !!vistos[chave]; vistos[chave] = 1;
      return { n: idx + 1, o: o, erros: erros, dup: dup, catNova: catNova, atrasado: !pago && venc && venc < hoje };
    }).filter(function (x) { return x.o.desc || isFinite(x.o.amount); });
  }

  // ── Telas ──
  function passo1(tipoPadrao) {
    sessao = { tipoPadrao: tipoPadrao === 'DESPESA' ? 'DESPESA' : 'RECEITA', criarCats: false, pularDup: true };
    F().modal('impModal', '📥 Importar planilha',
      '<p style="color:var(--text-muted);line-height:1.6;margin-bottom:14px">Traga suas contas a receber e a pagar de uma planilha do <b>Excel</b> (.xlsx) ou <b>CSV</b>, ou de outro sistema. As colunas são reconhecidas pelo nome e você confere tudo antes de importar.</p>' +
      '<label class="fin-drop" id="impDrop" style="display:block;border:2px dashed var(--border);border-radius:14px;padding:28px;text-align:center;cursor:pointer">' +
      '<div style="font-size:30px">📄</div><b>Escolher planilha</b><div class="fin-sub" style="margin-top:4px">Excel (.xlsx, .xls) ou CSV · primeira aba · uma conta por linha</div>' +
      '<input type="file" id="impArq" accept=".csv,.txt,.xlsx,.xls,.xlsm,.ods,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" style="display:none" onchange="imp.arquivo(this.files[0])"></label>' +
      '<div id="impStatus" style="margin-top:12px"></div>' +
      '<div style="margin-top:14px;display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:center"><span class="fin-sub">Não tem uma planilha pronta? Use o modelo:</span><button class="btn-secondary" onclick="imp.modelo()">⬇️ Baixar modelo</button></div>',
      '<button class="btn-ghost" onclick="fin.fechar(\'impModal\')">Cancelar</button>', true);
    var d = el('impDrop');
    if (d) {
      d.addEventListener('dragover', function (e) { e.preventDefault(); d.style.borderColor = 'var(--gold)'; });
      d.addEventListener('dragleave', function () { d.style.borderColor = ''; });
      d.addEventListener('drop', function (e) { e.preventDefault(); if (e.dataTransfer.files[0]) window.imp.arquivo(e.dataTransfer.files[0]); });
    }
  }
  function passo2() {
    var s = sessao, itens = montar(), ok = itens.filter(function (x) { return !x.erros.length && !(x.dup && s.pularDup); });
    var rec = ok.filter(function (x) { return x.o.type === 'RECEITA'; }), pag = ok.filter(function (x) { return x.o.type === 'DESPESA'; });
    var soma = function (l) { return r2(l.reduce(function (a, x) { return a + x.o.amount; }, 0)); };
    var comErro = itens.filter(function (x) { return x.erros.length; }).length, dups = itens.filter(function (x) { return x.dup; }).length;
    var novasCats = {}; ok.forEach(function (x) { if (x.catNova) novasCats[x.o.type + '|' + x.catNova] = 1; });
    var opc = function (campo) { var v = s.mapa[campo]; return '<option value="">— não usar —</option>' + s.cab.map(function (h, i) { return '<option value="' + i + '"' + (v === i ? ' selected' : '') + '>' + esc(String(h || 'Coluna ' + (i + 1)).slice(0, 40)) + '</option>'; }).join(''); };
    var corpo = '' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px">' +
      '<div class="fin-kpi2" style="flex:1;min-width:140px"><div class="v fin-pos">' + moeda(soma(rec)) + '</div><div class="l">' + rec.length + ' a receber</div></div>' +
      '<div class="fin-kpi2" style="flex:1;min-width:140px"><div class="v fin-neg">' + moeda(soma(pag)) + '</div><div class="l">' + pag.length + ' a pagar</div></div>' +
      '<div class="fin-kpi2" style="flex:1;min-width:140px"><div class="v' + (comErro ? ' fin-neg' : '') + '">' + comErro + '</div><div class="l">com erro (ficam de fora)</div></div>' +
      '<div class="fin-kpi2" style="flex:1;min-width:140px"><div class="v">' + dups + '</div><div class="l">já existem no sistema</div></div></div>' +
      '<details' + (comErro || !s.mapa.valor || !s.mapa.venc ? ' open' : '') + ' style="margin-bottom:14px"><summary style="cursor:pointer;color:var(--gold);font-weight:700">Conferir colunas da planilha</summary>' +
      '<div class="form-grid" style="margin-top:10px">' + CAMPOS.map(function (c) { return '<div class="form-field"><label class="form-label">' + c[1] + '</label><select class="form-input" onchange="imp.coluna(\'' + c[0] + '\',this.value)">' + opc(c[0]) + '</select></div>'; }).join('') +
      '<div class="form-field"><label class="form-label">Quando a linha não diz o tipo</label><select class="form-input" onchange="imp.opcao(\'tipoPadrao\',this.value)"><option value="RECEITA"' + (s.tipoPadrao === 'RECEITA' ? ' selected' : '') + '>É conta a receber</option><option value="DESPESA"' + (s.tipoPadrao === 'DESPESA' ? ' selected' : '') + '>É conta a pagar</option></select></div></div></details>' +
      '<div style="display:flex;gap:18px;flex-wrap:wrap;margin-bottom:12px">' +
      '<label class="fin-check"><input type="checkbox"' + (s.pularDup ? ' checked' : '') + ' onchange="imp.opcao(\'pularDup\',this.checked)"> Pular as que já existem</label>' +
      '<label class="fin-check"><input type="checkbox"' + (s.criarCats ? ' checked' : '') + ' onchange="imp.opcao(\'criarCats\',this.checked)"> Criar as categorias da planilha que não existem</label></div>' +
      '<div class="table-scroll" style="max-height:340px"><table class="data-table"><thead><tr><th>#</th><th>Tipo</th><th>Vencimento</th><th>Descrição</th><th>Categoria</th><th>Valor</th><th>Situação</th></tr></thead><tbody>' +
      itens.slice(0, 60).map(function (x) {
        var o = x.o, aviso = x.erros.length ? '<span class="fin-sit atraso">falta ' + x.erros.join(', ') + '</span>' : x.dup ? '<span class="fin-sit">já existe</span>' : '<span class="fin-sit ' + (o.status === 'pago' ? 'ok' : (x.atrasado ? 'atraso' : 'hoje')) + '">' + (o.status === 'pago' ? (o.type === 'RECEITA' ? 'recebido' : 'pago') : (x.atrasado ? 'atrasado' : 'em aberto')) + '</span>';
        return '<tr style="' + (x.erros.length || (x.dup && s.pularDup) ? 'opacity:.55' : '') + '"><td class="fin-sub">' + x.n + '</td><td>' + (o.type === 'RECEITA' ? '⬇️ Receber' : '⬆️ Pagar') + '</td><td style="white-space:nowrap">' + (o.vencimento ? F().dataBR(o.vencimento) : '—') + '</td><td><b>' + esc(o.desc || '—') + '</b>' + (o.contato ? '<div class="fin-sub">' + esc(o.contato) + '</div>' : '') + '</td><td>' + esc(o.category) + (x.catNova ? ' <span class="fin-sub">(nova)</span>' : '') + '</td><td style="white-space:nowrap;font-weight:700" class="' + (o.type === 'RECEITA' ? 'fin-pos' : 'fin-neg') + '">' + (isFinite(o.amount) ? moeda(o.amount) : '—') + '</td><td>' + aviso + '</td></tr>';
      }).join('') + '</tbody></table></div>' +
      (itens.length > 60 ? '<div class="fin-sub" style="margin-top:6px">Mostrando 60 de ' + itens.length + ' linhas. Todas entram na importação.</div>' : '') +
      (Object.keys(novasCats).length ? '<div class="fin-sub" style="margin-top:8px">Categorias novas: ' + Object.keys(novasCats).map(function (k) { return esc(k.split('|')[1]); }).join(', ') + '</div>' : '');
    F().modal('impModal', '📥 Conferir importação · ' + esc(s.nomeArq), corpo,
      '<button class="btn-ghost" onclick="imp.abrir(\'' + s.tipoPadrao + '\')">Outra planilha</button><button class="btn-primary" id="impOk" onclick="imp.importar()"' + (ok.length ? '' : ' disabled') + '>Importar ' + ok.length + ' conta' + (ok.length === 1 ? '' : 's') + '</button>', true);
  }

  window.imp = {
    abrir: passo1,
    arquivo: async function (arq) {
      if (!arq) return;
      var stt = el('impStatus');
      if (arq.size > 8 * 1024 * 1024) { if (stt) stt.innerHTML = '<div class="fin-alerta red">A planilha precisa ter até 8 MB.</div>'; return; }
      if (stt) stt.innerHTML = '<div class="fin-alerta gold">⏳ Lendo a planilha…</div>';
      try {
        var linhas = (await lerArquivo(arq)).map(function (l) { return (l || []).map(function (c) { return c == null ? '' : c; }); });
        var i = acharCabecalho(linhas), cab = (linhas[i] || []).map(function (c) { return String(c).trim(); });
        var dados = linhas.slice(i + 1).filter(function (l) { return l.some(function (c) { return String(c).trim() !== ''; }); });
        if (!dados.length) throw new Error('Não encontrei linhas com dados nessa planilha.');
        if (dados.length > 3000) throw new Error('A planilha tem ' + dados.length + ' linhas. Importe no máximo 3.000 por vez.');
        sessao.linhas = dados; sessao.cab = cab; sessao.mapa = mapear(cab); sessao.nomeArq = arq.name || 'planilha';
        passo2();
      } catch (e) { if (stt) stt.innerHTML = '<div class="fin-alerta red">' + esc(e.message || 'Não consegui ler essa planilha.') + '</div>'; }
    },
    coluna: function (campo, v) {
      if (v === '') delete sessao.mapa[campo];
      else { Object.keys(sessao.mapa).forEach(function (k) { if (sessao.mapa[k] === +v) delete sessao.mapa[k]; }); sessao.mapa[campo] = +v; }
      passo2();
    },
    opcao: function (k, v) { sessao[k] = v; passo2(); },
    importar: function () {
      var itens = montar().filter(function (x) { return !x.erros.length && !(x.dup && sessao.pularDup); });
      if (!itens.length) return;
      var log = window.logAudit; window.logAudit = null; // um registro só no histórico
      var cats = 0;
      try {
        itens.forEach(function (x) {
          if (x.catNova && !F().ehPadrao(x.catNova) && (window.CATEGORIES[x.o.type] || []).indexOf(x.catNova) === -1) {
            if (!F().addCategoria(x.catNova, x.o.type, x.o.type === 'RECEITA' ? 'receita' : 'operacionais')) cats++;
          }
          F().criarLancamento(x.o);
        });
      } finally { window.logAudit = log; }
      var rec = itens.filter(function (x) { return x.o.type === 'RECEITA'; }).length;
      if (window.logAudit) window.logAudit('create', 'transaction', 'planilha', 'Importação de planilha "' + sessao.nomeArq + '": ' + itens.length + ' contas');
      if (window.persist) window.persist();
      F().fechar('impModal');
      toast('✅ ' + itens.length + ' contas importadas (' + rec + ' a receber, ' + (itens.length - rec) + ' a pagar)' + (cats ? ' e ' + cats + ' categorias criadas' : '') + '.');
      F().atualizarTudo && F().atualizarTudo();
      var alvo = rec >= itens.length - rec ? 'receber' : 'pagar'; window.switchView(alvo);
    },
    modelo: function () {
      var linhas = [['Tipo', 'Descrição', 'Cliente/Fornecedor', 'Valor', 'Vencimento', 'Categoria', 'Centro de custo', 'Situação', 'Data do pagamento', 'Observação'],
        ['Receber', 'Mensalidade outubro', 'Cliente Exemplo Ltda', '1.500,00', '10/11/2026', 'Assinaturas e Mensalidades', 'Loja Centro', 'Em aberto', '', 'Contrato 2026'],
        ['Pagar', 'Aluguel da sala', 'Imobiliária Exemplo', '2.300,00', '05/11/2026', 'Aluguel e Condomínio', 'Administrativo', 'Em aberto', '', ''],
        ['Pagar', 'Energia elétrica', 'Distribuidora de Energia', '412,37', '15/10/2026', 'Energia e Utilidades', '', 'Pago', '15/10/2026', '']];
      var csv = '﻿' + linhas.map(function (l) { return l.map(function (c) { return /[;"\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c; }).join(';'); }).join('\r\n');
      var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); a.download = 'modelo-contas-landim-advisory.csv';
      document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
      toast('Modelo baixado. Abra no Excel, preencha e importe aqui.', 'info');
    },
    _montar: montar, _numero: numero, _data: dataISO, _sessao: function () { return sessao; }
  };
})();
