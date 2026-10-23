/**
 * Landim Advisory — Entrada de estoque pela nota fiscal de compra
 * XML da NF-e: lido aqui no navegador, exato. PDF (DANFE): lido pelo leitor do sistema (leitor.js), sem IA externa,
 * conferindo a soma dos itens com o total da nota.
 * Antes de gravar, mostra cada item com o produto do estoque correspondente (ou "criar novo"), o custo com frete e
 * impostos rateados e as parcelas para Contas a pagar. Lembra o vínculo código do fornecedor → produto.
 */
(function () {
  'use strict';
  var F = function () { return window.fin; };
  function st() { return window.state; }
  function el(id) { return document.getElementById(id); }
  function esc(s) { return F().esc(s); }
  function moeda(v) { return F().moeda(v); }
  function toast(m, t) { if (window.showToast) window.showToast(m, t || 'success'); }
  function r2(v) { return Math.round(v * 100) / 100; }
  function r4(v) { return Math.round(v * 10000) / 10000; }
  function novoId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function norm(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
  function qtdBR(v) { return String(r4(v)).replace('.', ','); }
  function numero(v) { var x = typeof v === 'number' ? v : Number(String(v || '').replace(/\./g, '').replace(',', '.')); return isFinite(x) ? x : 0; }

  var UNIDADES = { UN: 'un', UND: 'un', UNID: 'un', UNI: 'un', PC: 'un', PÇ: 'un', PCA: 'un', PECA: 'un', CX: 'cx', CXA: 'cx', KG: 'kg', G: 'g', GR: 'g', L: 'l', LT: 'l', LTS: 'l', ML: 'ml', M: 'm', MT: 'm', MTS: 'm', M2: 'm²', 'M²': 'm²', PCT: 'pct', PT: 'pct', PAC: 'pct', FD: 'pct', H: 'h', HR: 'h' };
  function unidade(u) { return UNIDADES[String(u || '').toUpperCase().replace(/[^A-Z0-9²Ç]/g, '')] || 'un'; }

  var sessao = null; // { nota, linhas: [{ item, destino, fator }], duplicada, contaParecida }

  // ── Leitura do XML da NF-e (padrão nacional; funciona com nfeProc ou só NFe) ──
  function lerXml(texto) {
    var doc = new DOMParser().parseFromString(texto, 'application/xml');
    if (doc.getElementsByTagName('parsererror').length) throw new Error('O arquivo não é um XML válido.');
    var tag = function (no, nome) { return (no || doc).getElementsByTagNameNS('*', nome); };
    var v = function (no, nome) { var e = no && tag(no, nome)[0]; return e ? e.textContent.trim() : ''; };
    var numero = function (t) { var x = Number(String(t || '').trim()); return isFinite(x) ? x : 0; }; // no XML o decimal é sempre ponto
    var inf = tag(doc, 'infNFe')[0];
    if (!inf) throw new Error('Este XML não é de uma NF-e (nota de produtos).');
    var emit = tag(inf, 'emit')[0], ide = tag(inf, 'ide')[0], tot = tag(inf, 'ICMSTot')[0];
    var itens = Array.prototype.map.call(tag(inf, 'det'), function (det) {
      var p = tag(det, 'prod')[0];
      var qtd = numero(v(p, 'qCom')), vt = numero(v(p, 'vProd'));
      return { codigo: v(p, 'cProd'), descricao: v(p, 'xProd'), ncm: v(p, 'NCM'), ean: /^\d{8,14}$/.test(v(p, 'cEAN')) ? v(p, 'cEAN') : '', unidade: v(p, 'uCom').toUpperCase(),
        quantidade: qtd, valorUnitario: numero(v(p, 'vUnCom')) || (qtd ? vt / qtd : 0), valorTotal: vt, desconto: numero(v(p, 'vDesc')),
        // rastreabilidade (medicamentos, alimentos, bebidas…): lote, quantidade do lote, fabricação e validade
        lotes: Array.prototype.map.call(tag(det, 'rastro'), function (r) { return { lote: v(r, 'nLote'), qtd: numero(v(r, 'qLote')), fabricacao: v(r, 'dFab').slice(0, 10), validade: v(r, 'dVal').slice(0, 10) }; }).filter(function (r) { return r.lote || /^\d{4}-\d{2}-\d{2}$/.test(r.validade); }) };
    }).filter(function (i) { return i.descricao && i.quantidade > 0; });
    var parcelas = Array.prototype.map.call(tag(inf, 'dup'), function (d) { return { numero: v(d, 'nDup'), vencimento: v(d, 'dVenc'), valor: numero(v(d, 'vDup')) }; }).filter(function (p) { return p.valor > 0; });
    return {
      fornecedor: v(emit, 'xFant') && v(emit, 'xNome').length > 40 ? v(emit, 'xFant') : v(emit, 'xNome'), razao: v(emit, 'xNome'), cnpj: v(emit, 'CNPJ') || v(emit, 'CPF'),
      numero: v(ide, 'nNF'), serie: v(ide, 'serie'), chave: (inf.getAttribute('Id') || '').replace(/\D/g, ''), dataEmissao: (v(ide, 'dhEmi') || v(ide, 'dEmi')).slice(0, 10),
      valorProdutos: numero(v(tot, 'vProd')), frete: numero(v(tot, 'vFrete')), seguro: numero(v(tot, 'vSeg')), desconto: numero(v(tot, 'vDesc')), outras: numero(v(tot, 'vOutro')),
      ipi: numero(v(tot, 'vIPI')), icmsST: numero(v(tot, 'vST')), valorTotal: numero(v(tot, 'vNF')), parcelas: parcelas, itens: itens, origem: 'xml'
    };
  }

  // ── Produto do estoque que corresponde ao item da nota ──
  function chaveRef(nota, item) { return (nota.cnpj || norm(nota.fornecedor)) + '|' + (item.codigo || norm(item.descricao)); }
  function encontrar(nota, item) {
    var lista = st().inventory || [], k = chaveRef(nota, item), n = norm(item.descricao);
    var p = lista.find(function (x) { return x.refs && x.refs[k]; });
    if (p) return { id: p.id, fator: numero(p.refs[k]) || 1, como: 'já usado antes' };
    if (item.ean) { p = lista.find(function (x) { return x.ean === item.ean; }); if (p) return { id: p.id, fator: 1, como: 'pelo código de barras' }; }
    if (item.codigo) { p = lista.find(function (x) { return x.sku && x.sku === item.codigo; }); if (p) return { id: p.id, fator: 1, como: 'pelo código' }; }
    p = lista.find(function (x) { return norm(x.nome) === n; });
    if (p) return { id: p.id, fator: 1, como: 'pelo nome' };
    return { id: 'novo', fator: 1, como: '' };
  }
  function idNota(n) { return n.chave && n.chave.length === 44 ? n.chave : [n.cnpj, n.numero, n.serie].join('|'); }

  function preparar(nota) {
    if (window.est && typeof window.renderInventory === 'function') { try { window.renderInventory(); } catch (e) { } } // garante o estoque no formato novo
    st().inventory = st().inventory || []; st().movEstoque = st().movEstoque || []; st().notasEntrada = st().notasEntrada || [];
    var minhaEmpresa = String(((st().settings || {}).cnpj) || '').replace(/\D/g, '');
    var total = nota.valorTotal || r2(nota.itens.reduce(function (a, i) { return a + i.valorTotal; }, 0));
    sessao = {
      nota: nota, total: total,
      linhas: nota.itens.map(function (i) {
        var m = encontrar(nota, i), lt = Array.isArray(i.lotes) ? i.lotes : [];
        return { item: i, destino: m.id, fator: m.fator, como: m.como, lote: lt.length === 1 ? lt[0].lote || '' : '', validade: lt.length === 1 ? lt[0].validade || '' : '', multi: lt.length > 1 };
      }),
      duplicada: st().notasEntrada.find(function (x) { return x.id === idNota(nota); }) || null,
      propria: minhaEmpresa && nota.cnpj === minhaEmpresa,
      contaParecida: (st().transactions || []).find(function (t) { return t.type === 'DESPESA' && Math.abs(numero(t.amount) - total) < 0.01 && (!nota.fornecedor || norm(t.contato).indexOf(norm(nota.fornecedor).split(' ')[0]) > -1); }) || null,
      rateio: true, lancar: true
    };
    sessao.mostrarVal = sessao.linhas.some(function (l) { var p = (st().inventory || []).find(function (x) { return x.id === l.destino; }); return l.validade || l.lote || l.multi || (p && p.controlaValidade); });
    sessao.lancar = !sessao.contaParecida;
  }

  // Frete, seguro, outras despesas, IPI e ST somam ao custo; o desconto da nota abate. Rateado pelo valor de cada item.
  function extras(n) { return r2((n.frete || 0) + (n.seguro || 0) + (n.outras || 0) + (n.ipi || 0) + (n.icmsST || 0) - (n.desconto || 0)); }
  function custos() {
    var n = sessao.nota, ex = sessao.rateio ? extras(n) : 0, base = n.itens.reduce(function (a, i) { return a + i.valorTotal; }, 0) || 1;
    return sessao.linhas.map(function (l) {
      var totalItem = l.item.valorTotal + ex * (l.item.valorTotal / base), fator = l.fator > 0 ? l.fator : 1;
      var qtd = r4(l.item.quantidade * fator);
      return { qtd: qtd, custo: qtd ? r4(totalItem / qtd) : 0, total: r2(totalItem) };
    });
  }

  function previa() {
    var n = sessao.nota, prods = (st().inventory || []).slice().sort(function (a, b) { return a.nome.localeCompare(b.nome, 'pt-BR'); });
    var opcoes = function (sel) {
      return '<option value="novo"' + (sel === 'novo' ? ' selected' : '') + '>➕ Criar produto novo</option><option value="ignorar"' + (sel === 'ignorar' ? ' selected' : '') + '>Não dar entrada</option>' +
        (prods.length ? '<optgroup label="Produtos do estoque">' + prods.map(function (p) { return '<option value="' + esc(p.id) + '"' + (sel === p.id ? ' selected' : '') + '>' + esc(p.nome) + ' (' + esc(p.unidade) + ')</option>'; }).join('') + '</optgroup>' : '');
    };
    var c = custos(), ex = extras(n);
    var novos = sessao.linhas.filter(function (l) { return l.destino === 'novo'; }).length, ign = sessao.linhas.filter(function (l) { return l.destino === 'ignorar'; }).length;
    var parcelas = n.parcelas && n.parcelas.length ? n.parcelas : null;
    var corpo = '' +
      (n.origem === 'leitor' && n.conferido ? '<div class="fin-alerta green">Lido ' + (n.ocr ? 'da foto' : 'do PDF') + ': a chave de acesso e a soma dos itens conferem com o total da nota. Com o XML vêm também lote e validade.</div>' : '') +
      (n.origem === 'leitor' && !n.conferido ? '<div class="fin-alerta gold">⚠️ Lido ' + (n.ocr ? 'da foto' : 'do PDF') + ', mas a soma dos itens não bateu com o total dos produtos da nota (' + moeda(n.valorProdutos || 0) + '). Confira quantidades e valores com a nota antes de confirmar, ou use o XML, que é exato.</div>' : '') +
      (sessao.duplicada ? '<div class="fin-alerta red">⚠️ Esta nota já deu entrada no estoque em ' + F().dataBR(String(sessao.duplicada.em).slice(0, 10)) + '. Confirmar de novo vai somar as quantidades outra vez.</div>' : '') +
      (sessao.propria ? '<div class="fin-alerta red">⚠️ Esta nota foi emitida pela sua própria empresa (é uma venda). A entrada de estoque é para notas de compra.</div>' : '') +
      '<div class="fin-kpis" style="margin:4px 0 12px">' +
      '<div class="fin-kpi2"><div class="v" style="font-size:16px">' + esc(n.fornecedor || '—') + '</div><div class="l">Fornecedor' + (n.cnpj ? ' · ' + esc(n.cnpj.length === 14 ? n.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') : n.cnpj) : '') + '</div></div>' +
      '<div class="fin-kpi2"><div class="v" style="font-size:16px">NF ' + esc(n.numero || '—') + (n.serie ? '/' + esc(n.serie) : '') + '</div><div class="l">Emissão ' + F().dataBR(n.dataEmissao) + '</div></div>' +
      '<div class="fin-kpi2"><div class="v" style="font-size:16px;color:var(--gold)">' + moeda(sessao.total) + '</div><div class="l">Total da nota · ' + n.itens.length + ' itens</div></div>' +
      '</div>' +
      (ex ? '<label class="fin-check" style="margin-bottom:8px"><input type="checkbox" id="enRateio"' + (sessao.rateio ? ' checked' : '') + ' onchange="estNota.opcao(\'rateio\',this.checked)"> Somar ao custo dos produtos o frete, IPI, ST e outras despesas, menos o desconto (' + (ex > 0 ? '+' : '') + moeda(ex) + ' rateados pelo valor de cada item)</label>' : '') +
      '<div class="table-scroll" style="max-height:46vh"><table class="data-table"><thead><tr><th>Item da nota</th><th>Qtd na nota</th><th title="Quantas unidades do seu estoque vêm em cada unidade da nota (ex.: caixa com 12 = 12)">Unid. por item</th><th>Entra no estoque</th><th>Custo unit.</th><th>Vai para o produto</th>' + (sessao.mostrarVal ? '<th>Lote e validade</th>' : '') + '</tr></thead><tbody>' +
      sessao.linhas.map(function (l, i) {
        var it = l.item, p = (st().inventory || []).find(function (x) { return x.id === l.destino; });
        var und = p ? p.unidade : unidade(it.unidade);
        return '<tr style="' + (l.destino === 'ignorar' ? 'opacity:.45' : '') + '"><td style="min-width:220px"><div style="font-weight:600">' + esc(it.descricao) + '</div><div class="fin-sub">' + esc([it.codigo && 'cód. ' + it.codigo, it.ncm && 'NCM ' + it.ncm].filter(Boolean).join(' · ')) + '</div></td>' +
          '<td style="white-space:nowrap">' + qtdBR(it.quantidade) + ' ' + esc(it.unidade || '') + '<div class="fin-sub">' + moeda(it.valorTotal) + '</div></td>' +
          '<td><input type="number" min="0.0001" step="any" class="form-input" style="width:78px;padding:6px 8px" value="' + l.fator + '" onchange="estNota.fator(' + i + ',this.value)"></td>' +
          '<td style="white-space:nowrap;font-weight:700">' + qtdBR(c[i].qtd) + ' ' + esc(und) + '</td>' +
          '<td style="white-space:nowrap">' + moeda(c[i].custo) + '</td>' +
          '<td style="min-width:220px"><select class="form-input" style="padding:6px 8px" onchange="estNota.destino(' + i + ',this.value)">' + opcoes(l.destino) + '</select>' + (l.como && l.destino !== 'novo' && l.destino !== 'ignorar' ? '<div class="fin-sub">encontrado ' + esc(l.como) + '</div>' : '') + '</td>' +
          (sessao.mostrarVal ? '<td style="min-width:150px">' + (l.multi
            ? it.lotes.map(function (r) { return '<div class="fin-sub" style="white-space:nowrap"><b>' + esc(r.lote || 's/ lote') + '</b> · ' + qtdBR(r.qtd) + (r.validade ? ' · val. ' + F().dataBR(r.validade) : '') + '</div>'; }).join('')
            : '<input class="form-input" style="padding:5px 8px;margin-bottom:4px" placeholder="Lote" maxlength="40" value="' + esc(l.lote || '') + '" onchange="estNota.lote(' + i + ',\'lote\',this.value)"><input type="date" class="form-input" style="padding:5px 8px" title="Validade" value="' + esc(l.validade || '') + '" onchange="estNota.lote(' + i + ',\'validade\',this.value)">') + '</td>' : '') + '</tr>';
      }).join('') + '</tbody></table></div>' +
      '<p class="fin-sub" style="margin:8px 0 12px">' + (novos ? novos + ' produto(s) novo(s) serão criados. ' : '') + (ign ? ign + ' item(ns) sem entrada. ' : '') + 'O custo médio de cada produto é recalculado com a entrada. O vínculo item → produto fica guardado para as próximas notas deste fornecedor.' + (sessao.mostrarVal ? (sessao.linhas.some(function (l) { return l.validade || l.multi; }) ? ' Produtos com validade passam a ter o controle de vencimento.' : '') : ' <a href="#" class="link-go" onclick="estNota.opcao(\'mostrarVal\',true);return false">🗓️ Informar lote e validade</a>') + '</p>' +
      '<div style="border-top:1px dashed var(--border);padding-top:12px"><label class="fin-check"><input type="checkbox" id="enLancar"' + (sessao.lancar ? ' checked' : '') + ' onchange="estNota.opcao(\'lancar\',this.checked)"> Lançar a compra em Contas a pagar</label>' +
      (sessao.contaParecida ? '<div class="fin-alerta gold" style="margin-top:8px">Já existe uma conta a pagar parecida: ' + esc(sessao.contaParecida.desc) + ' · ' + moeda(sessao.contaParecida.amount) + ' · vence ' + F().dataBR(sessao.contaParecida.vencimento) + '. Por isso esta opção veio desmarcada.</div>' : '') +
      (sessao.lancar ? (parcelas
        ? '<div class="fin-sub" style="margin-top:6px">Parcelas da nota: ' + parcelas.map(function (p, i) { return (i + 1) + 'ª ' + moeda(p.valor) + ' em ' + F().dataBR(p.vencimento); }).join(' · ') + '</div>'
        : '<div style="margin-top:8px;display:flex;gap:8px;align-items:center;flex-wrap:wrap"><span class="fin-sub">A nota não traz parcelas. Vencimento:</span><input type="date" class="form-input" id="enVenc" style="width:auto;padding:6px 8px" value="' + (sessao.venc || F().addDias(n.dataEmissao || F().hoje(), 30)) + '" onchange="estNota.opcao(\'venc\',this.value)"><span class="fin-sub">valor ' + moeda(sessao.total) + '</span></div>') : '') +
      '</div>';
    F().modal('enModal', '📄 Entrada pela nota fiscal', corpo,
      '<button class="btn-ghost" onclick="fin.fechar(\'enModal\')">Cancelar</button><button class="btn-primary" id="enOk" onclick="estNota.confirmar()">Dar entrada em ' + (sessao.linhas.length - ign) + ' ' + (sessao.linhas.length - ign === 1 ? 'item' : 'itens') + '</button>');
    var box = el('enModal') && el('enModal').querySelector('.modal-box'); if (box) box.style.maxWidth = sessao.mostrarVal ? '1260px' : '1080px';
  }

  window.estNota = {
    abrir: function () {
      F().modal('enModal', '📄 Entrada de estoque pela nota fiscal',
        '<p style="line-height:1.6;margin-bottom:12px">Envie a nota de compra do fornecedor. Os produtos entram no estoque com quantidade e custo, e a compra vai para Contas a pagar.</p>' +
        '<div class="drop-zone" id="enDrop" style="padding:28px;text-align:center;border:2px dashed var(--border);border-radius:12px;cursor:pointer" onclick="document.getElementById(\'enArq\').click()">' +
        '<div style="font-size:30px">📄</div><b>Clique ou arraste o arquivo aqui</b><div class="fin-sub" style="margin-top:4px">XML da NF-e, PDF da nota (DANFE) ou foto</div></div>' +
        '<input type="file" id="enArq" accept=".xml,text/xml,application/xml,.pdf,application/pdf,image/*" style="display:none" onchange="estNota.arquivo(this.files[0])">' +
        '<div id="enStatus" style="margin-top:12px"></div>' +
        '<ul class="fin-sub" style="margin:10px 0 0 18px;line-height:1.7"><li><b>XML</b>: leitura exata, na hora, com lote e validade. O fornecedor envia por e-mail junto com a nota.</li><li><b>PDF (DANFE)</b>: o sistema lê a tabela de produtos e confere com o total da nota.</li><li><b>Foto</b>: o sistema lê o texto da nota; confira os itens antes de confirmar.</li></ul>',
        '<button class="btn-ghost" onclick="fin.fechar(\'enModal\')">Fechar</button>');
      var d = el('enDrop');
      if (d) {
        d.addEventListener('dragover', function (e) { e.preventDefault(); d.style.borderColor = 'var(--gold)'; });
        d.addEventListener('dragleave', function () { d.style.borderColor = ''; });
        d.addEventListener('drop', function (e) { e.preventDefault(); if (e.dataTransfer.files[0]) window.estNota.arquivo(e.dataTransfer.files[0]); });
      }
    },
    arquivo: async function (arq) {
      var s = el('enStatus'); if (!arq || !s) return;
      var aviso = function (t, cor) { s.innerHTML = '<div class="fin-alerta ' + (cor || 'gold') + '">' + t + '</div>'; };
      var nome = (arq.name || '').toLowerCase(), nota = null;
      try {
        if (/\.xml$/.test(nome) || /xml/.test(arq.type || '')) {
          aviso('⏳ Lendo o XML…');
          nota = lerXml(await arq.text());
        } else {
          var tipo = F().tipoArquivo(arq);
          if (tipo !== 'application/pdf' && !/^image\//.test(tipo)) return aviso('Use o XML, o PDF ou uma foto da nota.', 'red');
          if (arq.size > 15 * 1024 * 1024) return aviso('Arquivo grande demais (máximo 15 MB).', 'red');
          if (!window.leitor) return aviso('O leitor não carregou. Atualize a página e tente de novo.', 'red');
          if (/^image\//.test(tipo)) {
            try { nota = await window.leitor.notaDaImagem(arq, function (t) { aviso(esc(t)); }); } catch (e) { console.warn('OCR:', e); }
            if (!nota) return aviso('Não consegui ler a nota nesta foto. Tire outra foto reta, com boa luz e a nota inteira na tela, ou use o XML (vem no e-mail do fornecedor), que é exato.', 'red');
          } else {
            aviso('⏳ Lendo a nota…');
            var pl = null;
            try { pl = await F().analisarPdf(arq, 10); } catch (e) { console.warn('PDF:', e); }
            if (!pl) return aviso('Não consegui abrir este PDF (pode estar protegido por senha). Use o XML da nota.', 'red');
            nota = window.leitor.danfePdf(pl);
            // PDF escaneado: lê a imagem da 1ª página
            if (!nota && pl.imagem && !(pl.texto || '').trim()) { try { var bi = atob(pl.imagem), u = new Uint8Array(bi.length); for (var q = 0; q < bi.length; q++) u[q] = bi.charCodeAt(q); nota = await window.leitor.notaDaImagem(new File([u], 'pagina.jpg', { type: 'image/jpeg' }), function (t) { aviso(esc(t)); }); } catch (e) { console.warn('OCR:', e); } }
            if (!nota) return aviso('Este PDF não parece um DANFE (nota fiscal de produtos). Use o XML da nota, que é exato.', 'red');
          }
          if (!nota.itens.length) return aviso('Achei a nota ' + esc(nota.numero || '') + (nota.fornecedor ? ' de ' + esc(nota.fornecedor) : '') + ', mas não consegui ler a tabela de produtos deste modelo de PDF. Use o XML da nota, que é exato.', 'red');
        }
      } catch (e) { return aviso(esc(e.message || 'Não foi possível ler a nota.'), 'red'); }
      if (!nota || !nota.itens || !nota.itens.length) return aviso('Não encontrei produtos nessa nota.', 'red');
      preparar(nota); previa();
    },
    destino: function (i, v) { var l = sessao.linhas[i]; l.destino = v; l.como = ''; if (v !== 'novo' && v !== 'ignorar') { var m = encontrar(sessao.nota, l.item); if (m.id === v) l.fator = m.fator; } previa(); },
    fator: function (i, v) { var f = numero(v); sessao.linhas[i].fator = f > 0 ? f : 1; previa(); },
    opcao: function (k, v) { sessao[k] = v; if (k !== 'venc') previa(); },
    lote: function (i, k, v) { var l = sessao.linhas[i]; if (l) l[k] = String(v || '').trim(); },
    confirmar: function () {
      if (!sessao) return;
      var n = sessao.nota, c = custos(), usar = sessao.linhas.map(function (l, i) { return { l: l, c: c[i] }; }).filter(function (x) { return x.l.destino !== 'ignorar' && x.c.qtd > 0; });
      if (!usar.length) return toast('Nenhum item para dar entrada.', 'error');
      if (sessao.duplicada && !confirm('Esta nota já deu entrada antes. Somar as quantidades de novo?')) return;
      var data = n.dataEmissao || F().hoje(), obs = 'NF ' + (n.numero || '') + ' — ' + (n.fornecedor || 'fornecedor');
      // 1) Contas a pagar
      var txIds = [];
      if (sessao.lancar && sessao.total > 0) {
        var cats = (window.CATEGORIES && window.CATEGORIES.DESPESA) || [];
        var cat = cats.indexOf('Custo de Mercadorias e Serviços') > -1 ? 'Custo de Mercadorias e Serviços' : F().sugerir(n.fornecedor, 'DESPESA');
        var notas = [n.chave ? 'Chave NF-e ' + n.chave : '', n.cnpj ? 'CNPJ ' + n.cnpj : ''].filter(Boolean).join(' · ');
        var parc = n.parcelas && n.parcelas.length ? n.parcelas : [{ vencimento: sessao.venc || (el('enVenc') && el('enVenc').value) || F().addDias(data, 30), valor: sessao.total }];
        parc.forEach(function (p, i) {
          var t = F().criarLancamento({ type: 'DESPESA', desc: 'Compra ' + obs + (parc.length > 1 ? ' (' + (i + 1) + '/' + parc.length + ')' : ''), amount: r2(p.valor), category: cat, date: data, vencimento: p.vencimento || data, contato: n.fornecedor || '', notes: notas, parcela: parc.length > 1 ? (i + 1) + '/' + parc.length : '', status: 'pendente', origem: 'nfe-entrada' });
          if (t && t.id) txIds.push(t.id);
        });
      }
      // 2) Estoque
      var criados = 0;
      usar.forEach(function (x) {
        var l = x.l, it = l.item, p;
        if (l.destino === 'novo') {
          var sku = it.codigo && !st().inventory.some(function (q) { return q.sku === it.codigo; }) ? it.codigo : null;
          if (!sku) { st().seq = st().seq || {}; st().seq.prd = (st().seq.prd || 0) + 1; sku = 'PRD-' + String(st().seq.prd).padStart(4, '0'); }
          p = { id: novoId(), sku: sku, nome: String(it.descricao).slice(0, 80), unidade: l.fator === 1 ? unidade(it.unidade) : 'un', qtd: 0, minimo: 0, custo: 0, preco: 0, ncm: it.ncm || '', ean: it.ean || '' };
          st().inventory.push(p); criados++;
        } else p = st().inventory.find(function (q) { return q.id === l.destino; });
        if (!p) return;
        p.refs = p.refs || {}; p.refs[chaveRef(n, it)] = l.fator;
        if (!p.ncm && it.ncm) p.ncm = it.ncm;
        if (l.multi && it.lotes && it.lotes.length) {
          // um lançamento por lote da nota; o último fica com o que sobrar (arredondamento ou fator)
          var resto = x.c.qtd;
          it.lotes.forEach(function (r, k) {
            var q = k === it.lotes.length - 1 ? r4(resto) : r4(Math.min(resto, (r.qtd || 0) * (l.fator > 0 ? l.fator : 1)));
            resto = r4(resto - q);
            if (q > 0) window.est.movimentar(p.id, 'entrada', q, x.c.custo, obs, true, data, txIds[0] || '', { lote: r.lote, validade: r.validade });
          });
        } else window.est.movimentar(p.id, 'entrada', x.c.qtd, x.c.custo, obs, true, data, txIds[0] || '', l.lote || l.validade ? { lote: l.lote, validade: l.validade } : null);
      });
      st().notasEntrada.push({ id: idNota(n), chave: n.chave || '', numero: n.numero || '', fornecedor: n.fornecedor || '', cnpj: n.cnpj || '', data: data, total: sessao.total, itens: usar.length, em: new Date().toISOString() });
      if (window.logAudit) window.logAudit('create', 'estoque', '', 'Entrada pela ' + obs + ' (' + usar.length + ' itens)');
      if (window.persist) window.persist();
      F().fechar('enModal'); sessao = null;
      if (F().atualizarTudo) F().atualizarTudo();
      window.renderInventory();
      toast('Entrada feita: ' + usar.length + ' itens' + (criados ? ', ' + criados + ' produto(s) novo(s)' : '') + (txIds.length ? ' e ' + txIds.length + ' conta(s) a pagar.' : '.'));
    },
    _sessao: function () { return sessao; },
    _lerXml: lerXml
  };
})();
