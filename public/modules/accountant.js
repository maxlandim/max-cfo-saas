/**
 * MAX CFO AI — Portal do Contador
 * Pacote mensal para a contabilidade: lançamentos com competência e pagamento, DRE, notas fiscais
 * e lista de comprovantes. Mostra o que falta organizar antes de enviar.
 */

window.initAccountantModule = function () {};

(function () {
  function F() { return window.fin; }
  function el(id) { return document.getElementById(id); }
  var mesSel = null;

  function dadosDoMes(mes) {
    var txs = (window.state.transactions || []).filter(function (t) { return (t.date || '').slice(0, 7) === mes || (t.pagoEm || '').slice(0, 7) === mes; });
    var notas = (window.state.nfes || []).filter(function (n) { return (n.dataEmissao || n.data || '').slice(0, 7) === mes; });
    return { txs: txs, notas: notas };
  }
  function q(v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; }
  function br(v) { return Number(v || 0).toFixed(2).replace('.', ','); }
  function baixar(nome, linhas) { F().baixarArquivo('﻿' + linhas.join('\n'), nome, 'text/csv'); }

  window.renderAccountant = function () {
    var v = el('view-accountant'); if (!v || !F()) return;
    var hoje = F().hoje();
    if (!mesSel) mesSel = F().mes(F().addMeses(hoje, -1)); // padrão: mês passado (o que o contador fecha)
    var d = dadosDoMes(mesSel);
    var semAnexo = d.txs.filter(function (t) { return F().estaPago(t) && !t.attachmentUrl && t.amount >= 100; });
    var outros = d.txs.filter(function (t) { return t.category === 'Outros'; });
    var abertos = d.txs.filter(function (t) { return !F().estaPago(t) && t.vencimento < hoje; });
    var empresa = (window.state.settings || {}).company || '';
    var res = F().dreDoMes(F().porMes([mesSel], 'competencia')[mesSel]);
    var resumo = 'Olá! Segue o fechamento de ' + F().nomeMes(mesSel) + (empresa ? ' da ' + empresa : '') + ':\n' +
      '• ' + d.txs.length + ' lançamentos (' + d.txs.filter(function (t) { return t.type === 'RECEITA'; }).length + ' receitas e ' + d.txs.filter(function (t) { return t.type === 'DESPESA'; }).length + ' despesas)\n' +
      '• Receita bruta (competência): ' + F().moeda(res.bruta) + '\n• Resultado gerencial: ' + F().moeda(res.resultado) + '\n' +
      '• ' + d.notas.filter(function (n) { return n.status !== 'Cancelada'; }).length + ' nota(s) fiscal(is) emitida(s)\n' +
      'Os arquivos (lançamentos, DRE e notas) vão em anexo. Gerado pelo MAX CFO AI.';
    v.innerHTML = '' +
      '<div class="page-header"><div class="page-header-text"><h1>Portal do Contador</h1><p class="page-subtitle">Pacote mensal pronto para a contabilidade</p></div>' +
      '<div class="page-header-actions"><input type="month" class="form-input" style="width:auto" value="' + mesSel + '" onchange="contador.mes(this.value)" aria-label="Mês"></div></div>' +
      '<div class="fin-kpis">' +
      '<div class="fin-kpi2"><div class="v">' + d.txs.length + '</div><div class="l">Lançamentos em ' + F().nomeMes(mesSel) + '</div></div>' +
      '<div class="fin-kpi2"><div class="v">' + d.notas.length + '</div><div class="l">Notas fiscais</div></div>' +
      '<div class="fin-kpi2"><div class="v ' + (semAnexo.length ? 'fin-neg' : 'fin-pos') + '">' + semAnexo.length + '</div><div class="l">Pagos sem comprovante</div><div class="s">acima de R$ 100</div></div>' +
      '<div class="fin-kpi2"><div class="v ' + (outros.length ? 'fin-neg' : 'fin-pos') + '">' + outros.length + '</div><div class="l">Sem categoria ("Outros")</div></div>' +
      '</div>' +
      (semAnexo.length || outros.length || abertos.length ? '<div class="fin-alerta gold"><b>Antes de enviar:</b> ' + [semAnexo.length ? semAnexo.length + ' pagamento(s) sem comprovante anexado' : '', outros.length ? outros.length + ' lançamento(s) sem categoria' : '', abertos.length ? abertos.length + ' conta(s) vencida(s) ainda em aberto (foram pagas?)' : ''].filter(Boolean).join(' · ') + '. <a class="link-go" onclick="switchView(\'finance\')">Revisar lançamentos →</a></div>' : '<div class="fin-alerta green">✅ Mês organizado: tudo categorizado e com comprovante.</div>') +
      '<div class="grid-2col">' +
      '<div class="card"><h3 class="card-title">Arquivos do mês</h3><p class="fin-sub" style="margin:6px 0 14px">Planilhas em CSV (abrem no Excel e importam em sistemas contábeis).</p>' +
      '<div style="display:flex;flex-direction:column;gap:8px">' +
      '<button class="btn-primary" onclick="contador.lancamentos()">⬇️ Lançamentos (competência e pagamento)</button>' +
      '<button class="btn-secondary" onclick="contador.dre()">⬇️ DRE gerencial do mês</button>' +
      '<button class="btn-secondary" onclick="contador.notas()">⬇️ Notas fiscais do mês</button>' +
      '<button class="btn-secondary" onclick="contador.comprovantes()">⬇️ Lista de comprovantes (links)</button>' +
      '</div></div>' +
      '<div class="card"><h3 class="card-title">Mensagem para o contador</h3><p class="fin-sub" style="margin:6px 0 10px">Copie e envie junto com os arquivos.</p>' +
      '<textarea class="form-input" id="contadorResumo" rows="8" style="width:100%;font-size:13px">' + F().esc(resumo) + '</textarea>' +
      '<div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap"><button class="fin-btn gold" onclick="fin.copiar(\'contadorResumo\')">Copiar</button>' +
      '<a class="fin-btn" href="mailto:?subject=' + encodeURIComponent('Fechamento ' + F().nomeMes(mesSel) + (empresa ? ' — ' + empresa : '')) + '&body=' + encodeURIComponent(resumo) + '">Abrir no e-mail</a>' +
      '<a class="fin-btn" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent(resumo) + '">WhatsApp</a></div>' +
      '<p class="fin-sub" style="margin-top:12px">Acesso de leitura para o contador entrar direto no MAX CFO: em desenvolvimento.</p></div>' +
      '</div>';
  };

  window.contador = {
    mes: function (m) { if (m) { mesSel = m; window.renderAccountant(); } },
    lancamentos: function () {
      var d = dadosDoMes(mesSel), conta = function (id) { return (F().contaPorId(id) || {}).nome || ''; };
      if (!d.txs.length) return window.showToast && window.showToast('Nenhum lançamento nesse mês.', 'warn');
      var l = ['Competência;Pagamento;Vencimento;Situação;Tipo;Descrição;Cliente/Fornecedor;Categoria;Grupo DRE;Centro de custo;Conta;Forma;Valor;Comprovante;Observação'];
      d.txs.sort(function (a, b) { return (a.date || '') > (b.date || '') ? 1 : -1; }).forEach(function (t) {
        l.push([t.date, t.pagoEm || '', t.vencimento || '', F().estaPago(t) ? 'Pago' : 'Em aberto', t.type === 'RECEITA' ? 'Receita' : 'Despesa', q(t.desc), q(t.contato), q(t.category), q(F().GRUPOS[F().grupoDe(t)].nome), q(t.centroCusto), q(conta(t.contaId)), q(t.forma), br(t.amount), q(t.attachmentUrl), q(t.notes)].join(';'));
      });
      baixar('lancamentos-' + mesSel + '.csv', l);
    },
    dre: function () {
      var r = F().dreDoMes(F().porMes([mesSel], 'competencia')[mesSel]), c = F().dreDoMes(F().porMes([mesSel], 'caixa')[mesSel]);
      var nomes = [['bruta', 'Receita bruta'], ['deducoes', '(-) Impostos sobre vendas'], ['liquida', 'Receita líquida'], ['custos', '(-) Custos'], ['lucroBruto', 'Lucro bruto'], ['pessoal', '(-) Pessoal'], ['operacionais', '(-) Despesas operacionais'], ['operacional', 'Resultado operacional'], ['finRec', '(+) Receitas financeiras'], ['finDesp', '(-) Despesas financeiras'], ['outras', '(+) Outras receitas'], ['resultado', 'Resultado'], ['fora', 'Fora do resultado (empréstimos, aportes, investimentos)']];
      baixar('dre-' + mesSel + '.csv', ['Linha;Competência;Caixa'].concat(nomes.map(function (n) { return n[1] + ';' + br(r[n[0]]) + ';' + br(c[n[0]]); })));
    },
    notas: function () {
      var d = dadosDoMes(mesSel);
      if (!d.notas.length) return window.showToast && window.showToast('Nenhuma nota registrada nesse mês.', 'warn');
      baixar('notas-' + mesSel + '.csv', ['Tipo;Número;Emissão;Tomador;CPF/CNPJ;Descrição;Valor;ISS retido;Situação;Chave/código;PDF'].concat(d.notas.map(function (n) {
        return [n.modelo || 'NFS-e', q(n.numero), (n.dataEmissao || n.data || '').slice(0, 10), q(n.tomador), q(n.cnpj), q(n.servico), br(n.valor), br(n.issRetido), n.status, q(n.chave), q(n.anexo)].join(';');
      })));
    },
    comprovantes: function () {
      var d = dadosDoMes(mesSel), com = d.txs.filter(function (t) { return t.attachmentUrl; });
      if (!com.length) return window.showToast && window.showToast('Nenhum comprovante anexado nesse mês.', 'warn');
      baixar('comprovantes-' + mesSel + '.csv', ['Data;Descrição;Valor;Link do comprovante'].concat(com.map(function (t) { return [t.pagoEm || t.date, q(t.desc), br(t.amount), q(t.attachmentUrl)].join(';'); })));
    }
  };
})();
