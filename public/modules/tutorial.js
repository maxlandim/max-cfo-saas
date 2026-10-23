/**
 * Landim Advisory — Tutorial guiado
 * Na primeira vez que a pessoa abre um módulo do menu, uma apresentação curta do módulo e da rotina recomendada.
 * Na primeira vez que abre cada tela, um passo a passo que destaca as partes da tela e explica como usar.
 * Pode pular a qualquer momento; o botão ❔ no topo refaz o tutorial da tela aberta.
 * O que já foi visto fica guardado neste aparelho, por login.
 */
(function () {
  'use strict';
  function el(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  // ── Conteúdo ──
  // sel: lista de alvos na ordem de preferência. "btn:Texto" = botão da tela que contém o texto. Sem alvo visível, o cartão fica no centro.
  function V(id) { return '#view-' + id; }
  function cab(id) { return [V(id) + ' .page-header-text', V(id) + ' h1']; }
  function acoes(id) { return [V(id) + ' .page-header-actions']; }
  function kpis(id) { return [V(id) + ' .fin-kpis', V(id) + ' .lay-cards', V(id) + ' .finance-kpi-row']; }
  function abas(id) { return [V(id) + ' .fin-tabs', V(id) + ' .fin-bar']; }
  function lista(id) { return [V(id) + ' table', V(id) + ' .empty-block', V(id) + ' .card:last-of-type']; }
  function b(id, txt) { return ['btn:' + id + ':' + txt]; }

  var MODULOS = {
    'Financeiro': { t: '💰 Financeiro: o coração do sistema', x: 'Tudo o que entra e sai de dinheiro. A rotina que deixa os números certos:<ol style="margin:8px 0 0 18px;line-height:1.7"><li>Em <b>Contas financeiras</b>, cadastre os bancos e o caixa com o saldo do extrato.</li><li>Lance o que vai <b>receber</b> e <b>pagar</b>, com vencimento.</li><li>Dê baixa (Recebi / Paguei) quando o dinheiro entrar ou sair.</li><li>Uma vez por semana, <b>importe o extrato</b> para conferir.</li></ol>Com isso, fluxo de caixa, DRE e relatório mensal se montam sozinhos.' },
    'Vendas': { t: '🛒 Vendas: do contato ao dinheiro no caixa', x: 'Cadastre clientes, faça <b>orçamentos</b> e, quando o cliente aprovar, transforme em <b>ordem de serviço</b> ou venda. Ao faturar, a conta a receber é criada sozinha. Contratos mensais geram as cobranças todo mês, e o estoque baixa a cada venda.' },
    'Fiscal': { t: '🧾 Fiscal: notas, impostos e contador', x: 'Registre as notas que você emitiu (o faturamento de 12 meses é somado para o Simples), simule o imposto em cada regime e o efeito da reforma tributária, siga o checklist do mês e envie ao contador o pacote pronto.' },
    'Pessoas e patrimônio': { t: '🧑‍💼 Pessoas e patrimônio', x: 'Cadastre funcionários para calcular a folha com encargos e provisões (férias e 13º) e lançar tudo em Contas a pagar. Em <b>Bens da empresa</b>, registre máquinas, veículos e equipamentos para acompanhar a depreciação.' },
    'CFO com IA': { t: '🤖 CFO com IA', x: 'Pergunte em português sobre os números da empresa ("posso contratar?", "onde estou gastando mais?") e receba a resposta com base nos seus lançamentos. Também dá para simular cenários de crescimento ou corte e consultar qualquer CNPJ.' },
    'Empresa e ajustes': { t: '⚙️ Empresa e ajustes', x: 'Dados da empresa, Pix, categorias e lembretes por e-mail ficam em <b>Configurações</b>. Quem atende várias empresas acompanha todas em <b>Todas as empresas</b>. Em <b>Equipe e acessos</b> você libera o acesso de consulta para o cliente ou o contador.' }
  };

  var TELAS = {
    dashboard: [
      { sel: cab('dashboard'), t: 'Bem-vindo ao Início', x: 'Esta é a tela para abrir todo dia. Em poucos segundos você vê como está o caixa e o que precisa fazer hoje.' },
      { sel: kpis('dashboard'), t: 'Os números do dia', x: 'Quanto tem hoje em banco e caixa, quanto vai receber e pagar nos próximos 30 dias e o resultado do mês. Tudo vem dos seus lançamentos.' },
      { sel: [V('dashboard') + ' .card'], t: 'O que precisa da sua atenção', x: 'Contas vencidas, que vencem hoje e o aviso de caixa negativo aparecem aqui. Clique para resolver direto.' },
      { sel: ['#addBtn', '.lay-tabbar .mais'], t: 'Botão + Novo', x: 'O jeito mais rápido de registrar qualquer coisa: conta a receber, a pagar, boleto pela câmera, cliente ou importar planilha.' },
      { sel: ['.sidebar-nav'], t: 'Menu por módulos', x: 'As funções estão agrupadas em módulos. Clique em um módulo para ver as telas dele. Na primeira vez, cada tela mostra um tutorial como este.' },
      { sel: ['#empSeletor'], t: 'Trocar de empresa', x: 'Se você cuida de mais de uma empresa, troque por aqui. Cada empresa tem os dados separados.' },
      { sel: ['#tutBotao'], t: 'Quer rever depois?', x: 'Clique no ❔ para ver de novo o tutorial da tela aberta, quando quiser.' }
    ],
    receber: [
      { sel: cab('receber'), t: 'Contas a receber', x: 'Tudo o que clientes devem para a empresa. Lance aqui cada venda a prazo, mensalidade ou parcela, com o vencimento.' },
      { sel: b('receber', 'Nova conta'), t: 'Lançar uma conta', x: 'Informe cliente, valor, vencimento e categoria. Dá para parcelar (3x, 10x…) ou repetir todo mês.' },
      { sel: b('receber', 'Importar planilha'), t: 'Já tem tudo numa planilha?', x: 'Importe do Excel ou CSV de uma vez. O sistema reconhece as colunas e não duplica o que já existe.' },
      { sel: kpis('receber'), t: 'Resumo', x: 'Quanto está em aberto, quanto já venceu, o que vence em 30 dias e o que entrou no mês.' },
      { sel: abas('receber'), t: 'Filtros', x: 'Veja só as vencidas para cobrar, as em aberto ou as recebidas. Os filtros de período, categoria e conta ajudam a achar rápido.' },
      { sel: lista('receber'), t: 'Cobrar e dar baixa', x: 'Em cada conta: <b>Cobrar</b> gera o Pix com QR Code e a mensagem pronta para o WhatsApp; <b>Recebi</b> dá baixa. Dê baixa no dia em que o dinheiro cai, escolhendo o banco, para o saldo bater com o extrato.' }
    ],
    pagar: [
      { sel: cab('pagar'), t: 'Contas a pagar', x: 'Fornecedores, aluguel, impostos, folha: tudo o que a empresa deve, com vencimento. Assim nada vence sem você ver.' },
      { sel: b('pagar', 'Ler boleto'), t: 'Boleto pela câmera ou PDF', x: 'Envie o PDF do boleto ou da nota, a foto do código de barras ou cole a linha digitável: o sistema preenche valor, vencimento e fornecedor. Você só confere e salva.' },
      { sel: b('pagar', 'Nova conta'), t: 'Lançar à mão', x: 'Para contas sem boleto. Dá para parcelar ou repetir todo mês (aluguel, internet, contador).' },
      { sel: kpis('pagar'), t: 'Resumo', x: 'O que está em aberto, o que venceu e o que vence nos próximos 30 dias.' },
      { sel: lista('pagar'), t: 'Paguei', x: 'Quando pagar, clique em <b>Paguei</b> e escolha de qual banco saiu. Juros e multa podem ser informados na baixa.' }
    ],
    bancos: [
      { sel: cab('bancos'), t: 'Contas financeiras', x: 'Cada banco, o caixa da loja e o cartão de crédito da empresa. O saldo de cada um é calculado com as baixas.' },
      { sel: b('bancos', 'Nova conta'), t: 'Cadastre com o saldo do extrato', x: 'Informe o saldo que aparece no extrato e a data. A partir daí, tudo que for recebido ou pago soma e subtrai.' },
      { sel: b('bancos', 'Transferir'), t: 'Transferências', x: 'Dinheiro que vai de uma conta para outra da empresa (ex.: do banco para o caixa). Não conta como receita nem despesa.' },
      { sel: [V('bancos') + ' .card'], t: 'Movimentações', x: 'Clique em uma conta para ver o extrato dela no sistema e comparar com o do banco.' }
    ],
    fluxo: [
      { sel: cab('fluxo'), t: 'Fluxo de caixa', x: 'A previsão do saldo dia a dia, somando o que vai entrar e sair das contas em aberto.' },
      { sel: [V('fluxo') + ' .fin-alerta', V('fluxo') + ' .card'], t: 'O aviso mais importante', x: 'Se o caixa vai ficar negativo, o sistema mostra o dia e o valor com antecedência, para você antecipar recebimentos, negociar ou adiar pagamentos.' },
      { sel: ['#finFluxoChart'], t: 'Saldo projetado', x: 'Passe o mouse no gráfico para ver o saldo, as entradas e as saídas de cada dia.' },
      { sel: [V('fluxo') + ' table'], t: 'Semana a semana', x: 'O mesmo fluxo resumido por semana. Use o Exportar para levar para a planilha ou para o banco.' }
    ],
    contas: [
      { sel: cab('contas'), t: 'Agenda de vencimentos', x: 'Contas a receber e a pagar juntas, em ordem de vencimento. Boa para planejar a semana.' },
      { sel: abas('contas'), t: 'Filtros', x: 'Veja só o que vence hoje, nesta semana ou o que está atrasado.' },
      { sel: lista('contas'), t: 'Dê baixa daqui', x: 'Recebi e Paguei funcionam direto nesta lista.' }
    ],
    reconciliation: [
      { sel: cab('reconciliation'), t: 'Importar extrato', x: 'A forma mais rápida de conferir o financeiro com o banco, sem digitar.' },
      { sel: ['#finConcConta'], t: '1. Escolha a conta', x: 'Selecione de qual banco é o extrato.' },
      { sel: ['#finConcDrop'], t: '2. Envie o arquivo', x: 'Baixe o extrato no internet banking em OFX (melhor) ou CSV e arraste aqui.' },
      { sel: [V('reconciliation') + ' .card'], t: '3. Confira e confirme', x: 'O sistema reconhece o que já foi lançado, dá baixa nas contas em aberto que batem e sugere a categoria do resto. Ele aprende com as suas escolhas.' }
    ],
    finance: [
      { sel: cab('finance'), t: 'Todos os lançamentos', x: 'A lista completa de receitas e despesas, pagas ou não. Use para pesquisar e corrigir.' },
      { sel: [V('finance') + ' .filter-bar', V('finance') + ' .card-header-row'], t: 'Busca e filtros', x: 'Filtre por período, tipo ou digite parte da descrição.' },
      { sel: acoes('finance'), t: 'Exportar', x: 'Baixe tudo em CSV para abrir no Excel.' }
    ],
    dre: [
      { sel: cab('dre'), t: 'Resultado (DRE)', x: 'Mostra se a empresa deu lucro ou prejuízo, mês a mês: receita, impostos, custos, despesas e resultado.' },
      { sel: abas('dre'), t: 'Competência ou caixa', x: '<b>Competência</b> considera o mês da venda ou da despesa; <b>caixa</b>, o mês em que o dinheiro entrou ou saiu. Para saber se o negócio dá lucro, use competência.' },
      { sel: lista('dre'), t: 'As linhas vêm das categorias', x: 'Cada categoria cai numa linha da DRE. Por isso, classificar bem os lançamentos é o que deixa o resultado certo. Os grupos das categorias ficam em Configurações.' }
    ],
    reports: [
      { sel: cab('reports'), t: 'Relatório mensal', x: 'Um PDF com o resumo do mês, gráficos, contas e previsão de caixa, pronto para enviar ao cliente ou sócio.' },
      { sel: ['#relMes'], t: 'Escolha o mês', x: 'O relatório usa os lançamentos do período escolhido.' },
      { sel: ['#relComentario'], t: 'Seu comentário', x: 'Escreva a análise do mês com as suas palavras. Ela entra no início do relatório.' },
      { sel: ['#relEscritorio', '#relCor'], t: 'Sua marca', x: 'Nome, contato, cor e logo do seu escritório no relatório (plano Completo).' },
      { sel: ['#relPdfBtn'], t: 'Baixe e envie', x: 'Baixe o PDF ou mande o resumo pelo WhatsApp.' }
    ],
    contatos: [
      { sel: cab('contatos'), t: 'Clientes e fornecedores', x: 'O cadastro de quem compra e de quem vende para a empresa. Ele se preenche sozinho com os lançamentos.' },
      { sel: b('contatos', 'Novo cadastro'), t: 'Cadastre com o CNPJ', x: 'Digite o CNPJ e o nome e o endereço vêm da Receita. Preencha telefone e e-mail: eles são usados na cobrança por WhatsApp e nos lembretes por e-mail.' },
      { sel: lista('contatos'), t: 'Histórico de cada um', x: 'Clique em um cadastro para ver quanto ele deve, quanto já pagou e as contas dele.' }
    ],
    budget: [
      { sel: cab('budget'), t: 'Orçamentos', x: 'Monte a proposta com itens, valores e validade, e envie em PDF ou pelo WhatsApp.' },
      { sel: acoes('budget'), t: 'Novo orçamento', x: 'Escolha o cliente, adicione produtos ou serviços e o desconto.' },
      { sel: lista('budget'), t: 'Aprovado? Fature', x: 'Quando o cliente aprovar, marque como aprovado e fature: a conta a receber é criada com as parcelas.' }
    ],
    os: [
      { sel: cab('os'), t: 'Ordens de serviço', x: 'Controle cada serviço do pedido até a entrega: equipamento, defeito, peças, mão de obra e situação.' },
      { sel: acoes('os'), t: 'Nova OS', x: 'Abra a OS com o cliente e o que precisa ser feito. Peças do estoque baixam sozinhas.' },
      { sel: [V('os') + ' .op-board'].concat(lista('os')), t: 'Concluiu? Fature', x: 'Cada coluna é uma etapa: aberta, em andamento, concluída e faturada. Ao concluir, fature a OS para gerar a conta a receber.' }
    ],
    plans: [
      { sel: cab('plans'), t: 'Mensalidades e contratos', x: 'Para quem cobra todo mês o mesmo cliente: mensalidade, aluguel, assinatura, honorários.' },
      { sel: acoes('plans'), t: 'Novo contrato', x: 'Informe cliente, valor, dia do vencimento e início. As contas a receber de cada mês são criadas sozinhas.' },
      { sel: kpis('plans'), t: 'Receita recorrente', x: 'O total que entra todo mês com os contratos ativos.' }
    ],
    crm: [
      { sel: cab('crm'), t: 'Funil de vendas', x: 'Acompanhe as oportunidades até fechar: do primeiro contato à proposta e ao fechamento.' },
      { sel: acoes('crm'), t: 'Nova oportunidade', x: 'Registre o cliente, o valor estimado e a próxima ação.' },
      { sel: kpis('crm'), t: 'Previsão', x: 'O valor em negociação e quanto já foi ganho.' }
    ],
    commissions: [
      { sel: cab('commissions'), t: 'Comissões', x: 'Calcule a comissão dos vendedores sobre o que foi recebido no mês.' },
      { sel: b('commissions', 'Calcular'), t: 'Calcular do mês', x: 'O sistema soma as vendas recebidas de cada vendedor e aplica a taxa dele.' },
      { sel: lista('commissions'), t: 'Lance para pagar', x: 'Com um clique, a comissão vira uma conta a pagar.' }
    ],
    inventory: [
      { sel: cab('inventory'), t: 'Estoque', x: 'Produtos com quantidade, custo médio, preço e estoque mínimo. As entradas e saídas se ligam ao financeiro.' },
      { sel: b('inventory', 'Entrada por nota'), t: 'Entrada pela nota fiscal', x: 'Envie o XML (exato) ou o PDF da nota do fornecedor: os produtos entram com quantidade e custo, e a compra vai para Contas a pagar.' },
      { sel: b('inventory', 'Produto'), t: 'Cadastrar à mão', x: 'Para produtos sem nota ou para o estoque inicial.' },
      { sel: kpis('inventory'), t: 'Valor e reposição', x: 'Valor do estoque a custo, produtos no mínimo e a margem média. Defina o mínimo de cada produto para receber o aviso de reposição.' },
      { sel: lista('inventory'), t: 'Entrada, saída e ajuste', x: 'Em cada produto: <b>+ Entrada</b> (compra), <b>− Saída</b> (venda, gera a conta a receber) e ⚖️ ajuste depois de contar o estoque.' },
      { sel: [V('inventory') + ' .est-abas'], t: 'Validade dos produtos', x: 'Em ✏️ marque <b>Controlar validade</b> no produto: as entradas pedem lote e validade (no XML da nota isso vem sozinho) e as saídas tiram primeiro o que vence antes. Em <b>🗓️ Validades</b> você vê o que venceu, o que vence em 30, 60 e 90 dias, o valor em risco, e dá baixa das perdas. Os avisos também aparecem no Início.' }
    ],
    nfe: [
      { sel: cab('nfe'), t: 'Notas fiscais', x: 'Registre as notas que a empresa emitiu. O sistema cria a conta a receber e soma o faturamento dos últimos 12 meses (o limite do Simples).' },
      { sel: b('nfe', 'Emissor Nacional'), t: 'Emita no Emissor Nacional', x: 'A NFS-e é emitida no portal do governo. Depois, registre aqui com número, valor e cliente.' },
      { sel: kpis('nfe'), t: 'Faturamento', x: 'O total do mês e dos últimos 12 meses.' }
    ],
    tributario: [
      { sel: ['#tributarioFrame'], t: 'Impostos e reforma', x: 'Compare quanto a empresa pagaria no Simples, no Lucro Presumido e no Lucro Real, e veja como a reforma tributária (IBS e CBS) muda o preço e a margem. Use os números do seu faturamento.' }
    ],
    'tax-audit': [
      { sel: cab('tax-audit'), t: 'Checklist fiscal', x: 'A lista do que precisa estar em dia no mês: regime informado, notas registradas, impostos lançados e documentos para o contador.' },
      { sel: [V('tax-audit') + ' .fin-alerta'].concat(lista('tax-audit')), t: 'Resolva cada item', x: 'Clique no item para ir direto à tela que resolve. Depois, use "Conferir de novo".' }
    ],
    accountant: [
      { sel: cab('accountant'), t: 'Enviar ao contador', x: 'O pacote do mês pronto: lançamentos, notas e comprovantes, sem precisar juntar tudo à mão.' },
      { sel: [V('accountant') + ' .card'], t: 'Arquivos do mês', x: 'Baixe os arquivos e mande a mensagem pronta para o contador.' }
    ],
    hr: [
      { sel: cab('hr'), t: 'Funcionários e folha', x: 'Salários, encargos e provisões de férias e 13º, para saber o custo real de cada funcionário.' },
      { sel: b('hr', 'Colaborador'), t: 'Cadastre a equipe', x: 'Nome, cargo, salário e data de admissão.' },
      { sel: b('hr', 'Lançar folha'), t: 'Lance a folha do mês', x: 'Cria em Contas a pagar os salários, FGTS e INSS com os vencimentos certos.' }
    ],
    assets: [
      { sel: cab('assets'), t: 'Bens da empresa', x: 'Máquinas, veículos, computadores e móveis, com valor de compra e depreciação mensal.' },
      { sel: acoes('assets'), t: 'Novo bem', x: 'Informe o valor, a data da compra e a vida útil. A depreciação é calculada sozinha.' }
    ],
    chat: [
      { sel: ['#chatInput'], t: 'Pergunte ao CFO', x: 'Escreva como falaria com um consultor: "posso contratar mais uma pessoa?", "qual cliente mais atrasa?", "como reduzir custos?". A resposta usa os números da empresa.' },
      { sel: [V('chat') + ' .chat-commands-section', V('chat') + ' .chat-panel'], t: 'Análises prontas', x: 'Atalhos para as perguntas mais comuns: resumo, DRE, diagnóstico, fluxo de caixa.' },
      { sel: ['#voiceBtn'], t: 'Por voz', x: 'No Chrome, toque no microfone e fale a pergunta.' }
    ],
    simulator: [
      { sel: cab('simulator'), t: 'Simular cenários', x: 'E se as vendas crescerem 30%? E se os custos subirem 10%? Veja o efeito no resultado antes de decidir.' },
      { sel: ['#recSlider'], t: 'Mexa nas variáveis', x: 'Arraste para mudar receita e despesa. O resultado projetado e o parecer mudam na hora.' }
    ],
    companies: [
      { sel: cab('companies'), t: 'Consultar CNPJ', x: 'Veja os dados públicos de um cliente ou fornecedor antes de fechar negócio: situação na Receita, sócios, atividade e endereço.' },
      { sel: ['#cnpjInput'], t: 'Digite o CNPJ', x: 'E clique em Analisar.' }
    ],
    settings: [
      { sel: cab('settings'), t: 'Configurações', x: 'Os dados que o sistema usa em todo lugar. Vale preencher no primeiro dia.' },
      { sel: ['#cfCnpj', '#cfEmpresa'], t: 'Dados da empresa', x: 'CNPJ, nome e regime tributário. O regime é usado nos impostos, na folha e no checklist.' },
      { sel: ['#cfPixChave'], t: 'Pix para cobranças', x: 'Com a chave Pix cadastrada, cada cobrança sai com QR Code e Pix copia e cola com o valor certo.' },
      { sel: ['#cfCatNome'], t: 'Categorias e centros de custo', x: 'Crie as categorias do seu negócio e escolha em qual linha da DRE cada uma entra. Centros de custo separam por loja, projeto ou área.' },
      { sel: ['#lembretesCartao'], t: 'Lembretes por e-mail', x: 'Receba todo dia de manhã o resumo do que vence e avise os clientes antes do vencimento, com o Pix.' }
    ],
    bpo: [
      { sel: cab('bpo'), t: 'Todas as empresas', x: 'Para quem cuida do financeiro de várias empresas: os números de todas lado a lado.' },
      { sel: kpis('bpo'), t: 'Visão da carteira', x: 'Faturamento e resultado somados, caixa, empresas com caixa negativo previsto e as que estão sem lançamento há 7 dias ou mais.' },
      { sel: abas('bpo'), t: 'Comece pelo que precisa de atenção', x: 'Filtre as empresas com atraso, caixa negativo ou sem movimento: é a lista de trabalho do dia.' },
      { sel: lista('bpo'), t: 'Abra ou gere o relatório', x: 'Em cada empresa, gere o relatório mensal em PDF ou abra a empresa para trabalhar nela.' }
    ],
    team: [
      { sel: cab('team'), t: 'Equipe e acessos', x: 'Quem pode ver os números desta empresa.' },
      { sel: ['#acessosCartao'], t: 'Acesso do cliente ou do contador', x: 'Informe o e-mail e clique em Dar acesso. A pessoa entra com a própria senha e só consulta: não consegue lançar nem apagar nada. Depois, envie o convite pelo WhatsApp.' }
    ],
    audit: [
      { sel: cab('audit'), t: 'Histórico de alterações', x: 'Quem criou, alterou ou apagou cada lançamento, e quando. Útil para conferir o que mudou de um dia para o outro.' }
    ]
  };

  // ── Estado (por login, neste aparelho) ──
  function chave() { var u = window.maxcfoUser || {}; return 'maxcfo_tutorial_' + (u.uid || 'local'); }
  function ler() { try { return JSON.parse(localStorage.getItem(chave()) || '{}') || {}; } catch (e) { return {}; } }
  function gravar(o) { try { localStorage.setItem(chave(), JSON.stringify(o)); } catch (e) { } }
  function desligado() { try { if (localStorage.getItem('maxcfo_tutorial_off') === '1') return true; } catch (e) { } return !!ler().desligado; }
  function visto(k) { return !!(ler().visto || {})[k]; }
  function marcar(k) { var o = ler(); o.visto = o.visto || {}; o.visto[k] = Date.now(); gravar(o); }

  // ── Motor do passo a passo ──
  var tour = null; // { passos, i, chave }
  function visivel(e) {
    if (!e || !e.getClientRects().length) return false;
    var r = e.getBoundingClientRect(); if (r.width < 4 || r.height < 4) return false;
    var s = getComputedStyle(e); if (s.visibility === 'hidden' || s.display === 'none') return false;
    var p = e; while (p) { if (p.classList && p.classList.contains('view') && !p.classList.contains('active')) return false; p = p.parentElement; }
    return true;
  }
  function achar(sels) {
    for (var i = 0; i < (sels || []).length; i++) {
      var s = sels[i], cands = [];
      if (s.indexOf('btn:') === 0) {
        var partes = s.split(':'), raiz = el('view-' + partes[1]), txt = partes.slice(2).join(':').toLowerCase();
        cands = raiz ? Array.prototype.filter.call(raiz.querySelectorAll('button, a'), function (x) { return (x.innerText || '').toLowerCase().indexOf(txt) > -1; }) : [];
      } else { try { cands = Array.prototype.slice.call(document.querySelectorAll(s)); } catch (e) { cands = []; } }
      for (var j = 0; j < cands.length; j++) if (visivel(cands[j])) return cands[j];
    }
    return null;
  }
  function estilos() {
    if (el('tutEstilos')) return;
    var c = document.createElement('style'); c.id = 'tutEstilos';
    c.textContent = '' +
      '#tutFundo{position:fixed;inset:0;background:rgba(4,7,14,.62);z-index:99990;pointer-events:none}' +
      '#tutFoco{position:fixed;z-index:99991;border-radius:12px;box-shadow:0 0 0 9999px rgba(4,7,14,.62),0 0 0 3px var(--gold,#C5A059);pointer-events:none;transition:all .25s ease}' +
      '#tutCard{position:fixed;z-index:99992;width:360px;max-width:calc(100vw - 24px);background:var(--bg-card,#131d30);color:var(--text,#E8EFF8);border:1px solid var(--gold-border,rgba(197,160,89,.45));border-radius:14px;box-shadow:0 18px 50px rgba(0,0,0,.45);padding:16px 18px 14px;font-size:14px;line-height:1.55}' +
      '#tutCard h3{font-size:16px;margin:0 0 6px;color:var(--gold,#C5A059);padding-right:22px}' +
      '#tutCard .tut-x{position:absolute;top:8px;right:10px;background:none;border:0;color:var(--text-muted,#8899B0);font-size:18px;cursor:pointer;line-height:1}' +
      '#tutCard .tut-pe{display:flex;align-items:center;gap:8px;margin-top:14px}' +
      '#tutCard .tut-pontos{display:flex;gap:4px;margin-right:auto}#tutCard .tut-pontos i{width:7px;height:7px;border-radius:50%;background:var(--border,#2a3650)}#tutCard .tut-pontos i.on{background:var(--gold,#C5A059)}' +
      '#tutCard .tut-b{border-radius:8px;padding:7px 13px;font-weight:700;font-size:13px;cursor:pointer;border:1px solid var(--border,#2a3650);background:transparent;color:var(--text,#E8EFF8)}' +
      '#tutCard .tut-b.p{background:var(--gold,#C5A059);border-color:var(--gold,#C5A059);color:#0B1220}' +
      '#tutCard .tut-desl{display:flex;gap:6px;align-items:center;margin-top:10px;font-size:12px;color:var(--text-muted,#8899B0);cursor:pointer}' +
      '#tutBotao{font-size:15px}' +
      '@media (max-width:640px){#tutCard{left:12px!important;right:12px;bottom:12px!important;top:auto!important;width:auto}}';
    document.head.appendChild(c);
  }
  function limpar() { ['tutFundo', 'tutFoco', 'tutCard'].forEach(function (id) { var e = el(id); if (e) e.remove(); }); window.removeEventListener('resize', posicionar); window.removeEventListener('scroll', posicionar, true); }
  function fechar() { tour = null; limpar(); }
  function posicionar() {
    if (!tour) return;
    var p = tour.passos[tour.i], alvo = p._alvo, foco = el('tutFoco'), fundo = el('tutFundo'), card = el('tutCard'); if (!card) return;
    var vw = window.innerWidth, vh = window.innerHeight, cw = card.offsetWidth, ch = card.offsetHeight, m = 12;
    if (alvo && visivel(alvo)) {
      var r = alvo.getBoundingClientRect(), pad = 6;
      var top = Math.max(r.top - pad, 4), left = Math.max(r.left - pad, 4), h = Math.min(r.height + pad * 2, vh - top - 4), w = Math.min(r.width + pad * 2, vw - left - 4);
      foco.style.display = 'block'; fundo.style.display = 'none';
      foco.style.top = top + 'px'; foco.style.left = left + 'px'; foco.style.width = w + 'px'; foco.style.height = h + 'px';
      if (vw <= 640) return; // no celular o cartão fica fixo embaixo
      var y, x;
      if (top + h + m + ch <= vh) y = top + h + m;            // embaixo
      else if (top - m - ch >= 0) y = top - m - ch;           // em cima
      else y = Math.max(m, Math.min(vh - ch - m, r.top));     // ao lado
      if (y === top + h + m || y === top - m - ch) x = Math.min(Math.max(m, left), vw - cw - m);
      else x = left + w + m + cw <= vw ? left + w + m : Math.max(m, left - m - cw);
      card.style.top = y + 'px'; card.style.left = x + 'px';
    } else {
      foco.style.display = 'none'; fundo.style.display = 'block';
      if (vw > 640) { card.style.top = Math.max(m, (vh - ch) / 2) + 'px'; card.style.left = Math.max(m, (vw - cw) / 2) + 'px'; }
    }
  }
  function mostrar(i) {
    if (!tour) return;
    tour.i = i;
    var p = tour.passos[i], n = tour.passos.length, ultimo = i === n - 1;
    p._alvo = achar(p.sel);
    if (p._alvo && p._alvo.scrollIntoView) { var r = p._alvo.getBoundingClientRect(); if (r.top < 70 || r.bottom > window.innerHeight - 40) p._alvo.scrollIntoView({ block: r.height > window.innerHeight * 0.6 ? 'start' : 'center' }); }
    estilos();
    if (!el('tutFundo')) { var f = document.createElement('div'); f.id = 'tutFundo'; document.body.appendChild(f); }
    if (!el('tutFoco')) { var o = document.createElement('div'); o.id = 'tutFoco'; document.body.appendChild(o); }
    var card = el('tutCard');
    if (!card) { card = document.createElement('div'); card.id = 'tutCard'; card.setAttribute('role', 'dialog'); card.setAttribute('aria-live', 'polite'); document.body.appendChild(card); }
    card.innerHTML = '<button class="tut-x" aria-label="Fechar tutorial" onclick="tutorial.fechar()">✕</button><h3>' + esc(p.t) + '</h3><div>' + p.x + '</div>' +
      (ultimo && tour.auto && /^tela:/.test(tour.chave || '') ? '<label class="tut-desl"><input type="checkbox" id="tutDesligar"> Não abrir tutoriais sozinho (o ❔ no topo continua funcionando)</label>' : '') +
      '<div class="tut-pe"><div class="tut-pontos">' + (n > 1 ? tour.passos.map(function (_, k) { return '<i class="' + (k === i ? 'on' : '') + '"></i>'; }).join('') : '') + '</div>' +
      (n > 1 && !ultimo ? '<button class="tut-b" onclick="tutorial.fechar()">Pular</button>' : '') +
      (i > 0 ? '<button class="tut-b" onclick="tutorial.voltar()">Voltar</button>' : '') +
      '<button class="tut-b p" id="tutProximo" onclick="tutorial.proximo()">' + (ultimo ? 'Entendi' : 'Próximo (' + (i + 1) + '/' + n + ')') + '</button></div>';
    window.addEventListener('resize', posicionar); window.addEventListener('scroll', posicionar, true);
    posicionar(); setTimeout(posicionar, 60);
    var bt = el('tutProximo'); if (bt) try { bt.focus({ preventScroll: true }); } catch (e) { }
  }
  function iniciar(passos, k, auto) {
    if (!passos || !passos.length) return false;
    limpar(); tour = { passos: passos.map(function (p) { return Object.assign({}, p); }), i: 0, chave: k, auto: !!auto };
    if (k) marcar(k);
    mostrar(0); return true;
  }

  // ── Abertura automática ──
  var telaAtual = 'dashboard', espera = null;
  function algumaJanelaAberta() {
    return Array.prototype.some.call(document.querySelectorAll('.modal-overlay'), function (m) { return m.classList.contains('open') || m.style.display === 'flex'; }) ||
      !!el('acessosTela') || Array.prototype.some.call(document.querySelectorAll('div'), function (d) { var s = d.style; return s && s.position === 'fixed' && +s.zIndex >= 99998; });
  }
  function automatico(id) {
    clearTimeout(espera);
    if (desligado() || !TELAS[id] || visto('tela:' + id)) return;
    var tentativas = 0;
    (function tentar() {
      if (telaAtual !== id || tour) return;
      if (algumaJanelaAberta()) { if (++tentativas < 60) espera = setTimeout(tentar, 800); return; }
      iniciar(TELAS[id], 'tela:' + id, true);
    })();
  }
  function aoAbrirModulo(nome) {
    if (desligado() || !MODULOS[nome] || visto('mod:' + nome) || tour) return;
    setTimeout(function () {
      var m = document.querySelector('.lay-mod[data-mod="' + nome.replace(/"/g, '') + '"]');
      if (!m || !m.classList.contains('aberto') || tour || algumaJanelaAberta()) return;
      iniciar([{ sel: ['.lay-mod[data-mod="' + nome.replace(/"/g, '') + '"]'], t: MODULOS[nome].t, x: MODULOS[nome].x }], 'mod:' + nome, true);
    }, 120);
  }

  function botaoTopo() {
    if (el('tutBotao')) return;
    var alvo = el('notifBtn'); if (!alvo || !alvo.parentNode) return;
    var b = document.createElement('button');
    b.id = 'tutBotao'; b.className = 'topbar-icon-btn'; b.type = 'button'; b.title = 'Como usar esta tela'; b.setAttribute('aria-label', 'Como usar esta tela'); b.textContent = '❔';
    b.onclick = function () { window.tutorial.desta(); };
    alvo.parentNode.insertBefore(b, alvo);
  }

  window.tutorial = {
    proximo: function () {
      if (!tour) return;
      var d = el('tutDesligar'); if (d && d.checked) { var o = ler(); o.desligado = true; gravar(o); if (window.showToast) window.showToast('Tutoriais automáticos desligados. Use o ❔ quando quiser.', 'info'); }
      if (tour.i < tour.passos.length - 1) mostrar(tour.i + 1); else fechar();
    },
    voltar: function () { if (tour && tour.i > 0) mostrar(tour.i - 1); },
    fechar: fechar,
    desta: function () {
      var id = telaAtual;
      if (!iniciar(TELAS[id], 'tela:' + id, false)) {
        var lbl = (window.viewMeta && window.viewMeta[id] && window.viewMeta[id].label) || 'esta tela';
        iniciar([{ sel: [], t: 'Como usar: ' + lbl, x: 'Esta tela ainda não tem um tutorial próprio. Dúvidas? Fale com a gente no WhatsApp (61) 99210-5889.' }], '', false);
      }
    },
    ligar: function () { var o = ler(); o.desligado = false; o.visto = {}; gravar(o); },
    _telas: TELAS, _modulos: MODULOS, _ativo: function () { return tour ? { chave: tour.chave, i: tour.i, n: tour.passos.length, alvo: !!tour.passos[tour.i]._alvo } : null }
  };

  window.initTutorialModule = function () {
    botaoTopo();
    // a troca de tela fecha o tutorial aberto e, se for a primeira vez nesta tela, abre o dela
    var trocar = window.switchView;
    if (trocar && !trocar.__tut) {
      window.switchView = function (id) {
        var antes = telaAtual; trocar.apply(this, arguments);
        var ativa = document.querySelector('.view.active'); var agora = ativa ? ativa.id.replace(/^view-/, '') : id;
        if (agora !== antes || !tour) { if (tour) fechar(); }
        telaAtual = agora;
        setTimeout(function () { botaoTopo(); automatico(agora); }, 450);
      };
      window.switchView.__tut = true;
    }
    // clique num módulo do menu
    document.addEventListener('click', function (ev) {
      var h = ev.target && ev.target.closest && ev.target.closest('.lay-mod-h'); if (!h) return;
      var m = h.parentNode && h.parentNode.dataset ? h.parentNode.dataset.mod : ''; if (m) aoAbrirModulo(m);
    }, true);
    document.addEventListener('keydown', function (ev) {
      if (!tour) return;
      if (ev.key === 'Escape') fechar();
      else if (ev.key === 'ArrowRight' && !/INPUT|TEXTAREA|SELECT/.test((ev.target || {}).tagName || '')) window.tutorial.proximo();
      else if (ev.key === 'ArrowLeft' && !/INPUT|TEXTAREA|SELECT/.test((ev.target || {}).tagName || '')) window.tutorial.voltar();
    });
    var ativa = document.querySelector('.view.active'); telaAtual = ativa ? ativa.id.replace(/^view-/, '') : 'dashboard';
    setTimeout(function () { automatico(telaAtual); }, 1200);
  };
})();
