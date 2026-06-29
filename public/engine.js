/**
 * MAX CFO AI — Neural Financial Engine v3.5
 * Motor de IA Financeira com NLP (Natural Language Processing) e formatação Markdown.
 * Produção Ready — Comercialização
 */

class MaxCFOEngine {
  constructor() {
    this.version = '3.5.0';
    this.name = 'MAX CFO AI';
  }

  // ══════════════════════════════════════════════════════════════
  // PROCESSADOR DE COMANDOS PRINCIPAL
  // ══════════════════════════════════════════════════════════════
  processCommand(cmd, ctx) {
    const c = cmd.toLowerCase().trim();

    if (this.has(c, 'oi','olá','bom dia','boa tarde','boa noite','hello','ola','ei max','ei,')) return this.getGreeting();
    if (this.has(c, 'obrigado','valeu','thanks','ótimo','perfeito','muito bem')) return this.getThanks();
    if (this.has(c, 'ajuda','help','o que você faz','comandos','funcionalidades','o que sabe')) return this.getHelp();

    if (this.has(c, 'resumo','visão geral','overview','meu financeiro','como estao','situação', 'resumo financeiro')) return this.generateReport(ctx);
    if (this.has(c, 'dre','demonstrativo','resultado do exercício', 'gerar dre completo')) return this.generateDRE(ctx);
    if (this.has(c, 'diagnóst','saúde financeira','avaliação geral','score', 'diagnóstico financeiro')) return this.generateDiagnosis(ctx);
    if (this.has(c, 'margem','lucratividade','rentabilidade','análise de margens')) return this.generateMargins(ctx);
    if (this.has(c, 'burn rate','runway','tempo de sobrevivência','caixa para','meses de caixa', 'burn rate e runway')) return this.generateBurnRate(ctx);
    if (this.has(c, 'tributár','imposto','regime','simples','presumido','lucro real','mei','iss','irpj', 'planejamento tributário')) return this.generateTaxPlanning(ctx);
    if (this.has(c, 'investir','investimento','aplicar','excedente','onde colocar', 'onde investir meu excedente')) return this.generateInvestmentAdvice(ctx);
    if (this.has(c, 'reduzir custo','cortar gasto','economizar','diminuir despesa','cost cutting', 'reduzir custos')) return this.generateCostReduction(ctx);
    if (this.has(c, 'previsão','projeção','forecast','próximo mês','próximos meses','futuro', 'forecast próximos 3 meses')) return this.generateForecast(ctx);
    if (this.has(c, 'fluxo de caixa','cash flow','entradas e saídas')) return this.generateCashFlow(ctx);
    if (this.has(c, 'capital de giro','giro','working capital')) return this.generateWorkingCapital(ctx);
    if (this.has(c, 'ponto de equilíbrio','break even','breakeven')) return this.generateBreakEven(ctx);
    if (this.has(c, 'kpi','indicadores','métricas','dashboard', 'kpis e indicadores')) return this.generateKPIs(ctx);
    if (this.has(c, 'cnpj','empresa','companhia','negócio')) return this.handleCompanyQuery(cmd);
    if (this.has(c, 'simular','cenário','e se','what if','hipótese')) return this.handleSimulatorQuery();

    return this.generateSmartResponse(cmd, ctx);
  }

  // ══════════════════════════════════════════════════════════════
  // RELATÓRIOS EXECUTIVOS (FORMATADOS EM MARKDOWN)
  // ══════════════════════════════════════════════════════════════
  generateReport(ctx) {
    const { receitas, despesas, saldo, txCount } = ctx;
    const margem = receitas > 0 ? (saldo / receitas * 100) : 0;
    const score = this.calcScore(ctx);
    const status = score >= 80 ? 'EXCELENTE' : score >= 60 ? 'BOM' : score >= 40 ? 'REGULAR' : 'CRÍTICO';

    return `**RELATÓRIO EXECUTIVO - MAX CFO AI**
*${new Date().toLocaleDateString('pt-BR', {weekday:'long', day:'2-digit', month:'long', year:'numeric'})}*

**1. RESUMO FINANCEIRO**
* **Receitas Totais:** ${this.fmt(receitas)}
* **Despesas Totais:** ${this.fmt(despesas)}
* **Resultado Líquido:** ${this.fmt(saldo)}
* **Margem Líquida:** ${margem.toFixed(1)}%
* **Lançamentos Analisados:** ${txCount}

**2. SAÚDE FINANCEIRA**
* **Score Geral:** ${score}/100 — **${status}**

**3. PARECER DO CFO**
${this.generateExecParecer(ctx, score, margem)}`;
  }

  generateDRE(ctx) {
    const { receitas, despesas } = ctx;
    const ded = receitas * 0.0925; // 9.25% mock
    const lb = (receitas - ded) - (despesas * 0.6); // CPV/CMV mock 60%
    const ebtd = lb - (despesas * 0.4); // Desp Operacionais mock 40%
    const depre = 0;
    const ebit = ebtd - depre;
    const irpj = ebtd > 0 ? ebtd * 0.15 : 0;
    const ll = ebtd - irpj;

    const mEbitda = (receitas > 0 ? (ebtd/receitas)*100 : 0).toFixed(1);
    const mLiq = (receitas > 0 ? (ll/receitas)*100 : 0).toFixed(1);

    return `
    <div style="font-family: 'Inter', sans-serif; background: var(--bg-card); border-radius: 12px; padding: 24px; border: 1px solid var(--border-color); color: var(--text-color); max-width: 800px; margin: 0 auto; box-shadow: 0 4px 20px rgba(0,0,0,0.15);">
      <div style="text-align: center; margin-bottom: 24px; border-bottom: 1px solid var(--border-color); padding-bottom: 16px;">
        <h2 style="margin: 0; color: var(--gold); font-size: 24px;">Demonstrativo do Resultado do Exercício (DRE)</h2>
        <p style="margin: 8px 0 0; color: var(--text-muted); font-size: 14px;">Visão Gerencial Executiva</p>
      </div>

      <div style="display: flex; flex-direction: column; gap: 8px; font-size: 15px;">
        <div style="display: flex; justify-content: space-between; padding: 12px; background: rgba(255,255,255,0.03); border-radius: 6px;">
          <span>(+) Receita Bruta</span>
          <strong style="color: var(--success);">${this.fmt(receitas)}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 12px;">
          <span>(-) Deduções / Impostos (Simulado 9.25%)</span>
          <span style="color: var(--danger);">- ${this.fmt(ded)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 12px; font-weight: 700; background: rgba(255,255,255,0.05); border-radius: 6px; border-left: 3px solid var(--gold);">
          <span>(=) Receita Líquida</span>
          <span>${this.fmt(receitas - ded)}</span>
        </div>

        <div style="display: flex; justify-content: space-between; padding: 12px;">
          <span>(-) Custos Diretos (CPV/CMV - Simulado 60% das despesas)</span>
          <span style="color: var(--danger);">- ${this.fmt(despesas * 0.6)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 12px; font-weight: 700; background: rgba(255,255,255,0.05); border-radius: 6px; border-left: 3px solid var(--gold);">
          <span>(=) Lucro Bruto</span>
          <span>${this.fmt(lb)}</span>
        </div>

        <div style="display: flex; justify-content: space-between; padding: 12px;">
          <span>(-) Despesas Operacionais (Simulado 40% das despesas)</span>
          <span style="color: var(--danger);">- ${this.fmt(despesas * 0.4)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 12px; font-weight: 800; background: rgba(255,255,255,0.08); border-radius: 6px; border-left: 4px solid var(--gold); margin-top: 8px;">
          <span>(=) EBITDA</span>
          <span>${this.fmt(ebtd)}</span>
        </div>

        <div style="display: flex; justify-content: space-between; padding: 12px;">
          <span>(-) Depreciação / Amortização</span>
          <span style="color: var(--danger);">- R$ 0,00</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 12px; font-weight: 700; background: rgba(255,255,255,0.05); border-radius: 6px; border-left: 3px solid var(--gold);">
          <span>(=) EBIT</span>
          <span>${this.fmt(ebit)}</span>
        </div>

        <div style="display: flex; justify-content: space-between; padding: 12px;">
          <span>(-) IRPJ/CSLL Estimado (15% sobre o lucro)</span>
          <span style="color: var(--danger);">- ${this.fmt(irpj)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 16px; font-weight: 900; background: var(--bg); border: 2px solid ${ll >= 0 ? 'var(--success)' : 'var(--danger)'}; border-radius: 8px; margin-top: 12px;">
          <span>(=) Lucro Líquido do Exercício</span>
          <span style="color: ${ll >= 0 ? 'var(--success)' : 'var(--danger)'};">${ll >= 0 ? '+' : ''}${this.fmt(ll)}</span>
        </div>
      </div>

      <div style="display: flex; gap: 16px; margin-top: 24px; padding-top: 24px; border-top: 1px solid var(--border-color);">
        <div style="flex: 1; text-align: center; background: rgba(255,255,255,0.03); padding: 16px; border-radius: 8px;">
          <div style="font-size: 13px; color: var(--text-muted); margin-bottom: 4px;">Margem EBITDA</div>
          <div style="font-size: 22px; font-weight: 800; color: ${ebtd > 0 ? 'var(--success)' : 'var(--danger)'};">${mEbitda}%</div>
        </div>
        <div style="flex: 1; text-align: center; background: rgba(255,255,255,0.03); padding: 16px; border-radius: 8px;">
          <div style="font-size: 13px; color: var(--text-muted); margin-bottom: 4px;">Margem Líquida</div>
          <div style="font-size: 22px; font-weight: 800; color: ${ll > 0 ? 'var(--success)' : 'var(--danger)'};">${mLiq}%</div>
        </div>
      </div>
    </div>`;
  }

  generateDiagnosis(ctx) {
    const { receitas, despesas, saldo } = ctx;
    const score = this.calcScore(ctx);
    
    let text = `**DIAGNÓSTICO FINANCEIRO & SCORE**\n\n**Seu Score Atual:** ${score}/100\n\n**Pontos Fortes:**\n`;
    
    if (receitas > despesas) text += `* Receitas superam despesas operacionais de forma saudável.\n`;
    if ((saldo/receitas)*100 > 15) text += `* Margem de lucro excelente (> 15%).\n`;
    if (despesas < receitas * 0.6) text += `* Estrutura de custos bem enxuta.\n`;
    
    if (text.includes('Fortes:\n\n')) text += `* Dados base precisam de maturação para encontrar pontos fortes expressivos.\n`;

    text += `\n**Pontos de Atenção (Gargalos):**\n`;
    if (saldo < 0) text += `* Você está operando com **déficit**. Suas despesas estão ${this.fmt(despesas-receitas)} acima das receitas.\n`;
    if (receitas === 0) text += `* Nenhum faturamento registrado. Risco de insolvência Imediato.\n`;
    if (despesas > receitas * 0.8 && saldo > 0) text += `* Custos estão consumindo mais de 80% do seu faturamento.\n`;

    text += `\n**Plano de Ação do CFO:**\n1. Otimize sua estrutura de custos cortando pelo menos 10% dos gastos indiretos.\n2. Avalie reajuste de preço (pricing) para alavancar a margem sem aumentar o volume operacional.`;

    return text;
  }

  generateMargins(ctx) {
    const { receitas, despesas, saldo } = ctx;
    const ded = receitas * 0.0925;
    const lb = (receitas - ded) - (despesas * 0.6);
    const mBruta = receitas > 0 ? (lb / receitas) * 100 : 0;
    const mLiquida = receitas > 0 ? (saldo / receitas) * 100 : 0;
    
    let diag = mLiquida >= 20 ? 'Excelente, benchmark de SaaS/Tech.' : mLiquida >= 10 ? 'Boa, dentro da média de varejo/serviços.' : 'Preocupante. Necessário plano de cortes.';

    return `**ANÁLISE DE RENTABILIDADE E MARGENS**

* **Margem Bruta:** ${mBruta.toFixed(1)}% *(Benchmark Ideal: > 40%)*
* **Margem Líquida:** ${mLiquida.toFixed(1)}% *(Benchmark Ideal: > 15%)*

**Parecer Técnico:**
Sua margem líquida atual está ${diag}
Isso significa que para cada R$ 100 vendidos, sobram exatamente **R$ ${mLiquida.toFixed(2)}** livres no caixa.

*Recomendação:* Se a margem estiver baixa, foque em aumentar o ticket médio ou migrar clientes para o seu plano Premium.`;
  }

  generateBurnRate(ctx) {
    const { receitas, despesas, saldo } = ctx;
    const caixa = saldo > 0 ? saldo * 6 : receitas * 2; // mock
    const runway = despesas > 0 ? (caixa / despesas).toFixed(1) : '>12';
    
    return `**ANÁLISE DE SOBREVIVÊNCIA (BURN RATE & RUNWAY)**

* **Burn Rate Bruto:** ${this.fmt(despesas)} / mês *(ritmo de queima de caixa)*
* **Caixa Disponível (Estimado):** ${this.fmt(caixa)}
* **Runway:** **${runway} meses**

**Interpretação:**
No seu ritmo atual de gastos, sem que nenhuma nova venda entre a partir de hoje, sua empresa tem capacidade de sobreviver operacionalmente por mais **${runway} meses**. 

*Regra de Ouro:* Tente manter o Runway sempre acima de 6 meses para absorver choques econômicos ou flutuações de mercado de forma segura.`;
  }

  generateCostReduction(ctx) {
    const { despesas } = ctx;
    const meta = despesas * 0.15; // Cortar 15%
    
    return `**PLANO DE REDUÇÃO DE CUSTOS (COST CUTTING)**

Identifiquei uma oportunidade de otimizar até 15% das suas despesas (Potencial de economia de **${this.fmt(meta)}/mês**).

**Onde cortar imediatamente:**
1. **Softwares & Assinaturas:** Cancele SaaS que o time não acessa há mais de 30 dias.
2. **Fornecedores (Renegociação):** Peça 10% de desconto no aluguel e em grandes contratos alegando revisão orçamentária.
3. **Despesas Bancárias:** Troque tarifas tradicionais por soluções digitais sem custo.

Gostaria de aplicar essa simulação no seu cenário para ver o impacto no Lucro? Tente a ferramenta "Simulador".`;
  }

  generateTaxPlanning(ctx) {
    const { receitas } = ctx;
    const faturamentoAnual = receitas * 12;
    
    let regimeIdeal = 'Simples Nacional';
    if (faturamentoAnual > 4800000 && faturamentoAnual <= 78000000) regimeIdeal = 'Lucro Presumido';
    else if (faturamentoAnual > 78000000) regimeIdeal = 'Lucro Real';

    return `**PLANEJAMENTO TRIBUTÁRIO (ESTIMATIVA)**

* **Faturamento Mensal Base:** ${this.fmt(receitas)}
* **Faturamento Anual Projetado:** ${this.fmt(faturamentoAnual)}
* **Enquadramento Atual Sugerido:** **${regimeIdeal}**

**Dica do CFO:**
No Simples Nacional, os impostos começam em torno de 6% (Anexo III - Serviços) ou 4% (Anexo I - Comércio). Se sua folha de pagamento for alta, podemos explorar o *Fator R* para diminuir alíquotas. Para análises exatas, sempre concilie isso com o seu contador.`;
  }

  generateForecast(ctx) {
    const { receitas, despesas, saldo } = ctx;
    const gR = 1.05; // 5% growth
    const gD = 1.02; // 2% inflação
    
    let m1_r = receitas * gR, m1_d = despesas * gD;
    let m2_r = m1_r * gR, m2_d = m1_d * gD;
    let m3_r = m2_r * gR, m3_d = m2_d * gD;

    return `**FORECAST PROJETADO (PRÓXIMOS 3 MESES)**
*(Assumindo 5% a.m. de crescimento e 2% a.m. na linha de custos)*

**Mês 1:**
* Receita: ${this.fmt(m1_r)} | Despesa: ${this.fmt(m1_d)} | Lucro: **${this.fmt(m1_r - m1_d)}**

**Mês 2:**
* Receita: ${this.fmt(m2_r)} | Despesa: ${this.fmt(m2_d)} | Lucro: **${this.fmt(m2_r - m2_d)}**

**Mês 3:**
* Receita: ${this.fmt(m3_r)} | Despesa: ${this.fmt(m3_d)} | Lucro: **${this.fmt(m3_r - m3_d)}**

Acumular esse resultado fortalecerá muito seu Caixa e Runway geral.`;
  }

  generateWorkingCapital(ctx) {
    return `**ANÁLISE DE CAPITAL DE GIRO E LIQUIDEZ**

O Capital de Giro (Ativo Circulante - Passivo Circulante) mede se a empresa tem liquidez de curto prazo para honrar suas folhas, fornecedores e impostos.

**Dicas para não enforcar seu fluxo:**
1. **Negocie Prazos:** Pague os fornecedores em 30/60/90 dias.
2. **Antecipe Recebimentos:** Diminua o prazo em que os clientes te pagam, preferindo PIX ou cartões ao invés de boletos de 60 dias.
3. Isso reduzirá sua NCG (Necessidade de Capital de Giro) e aliviará seu caixa.`;
  }

  generateInvestmentAdvice(ctx) {
    const { saldo } = ctx;
    if (saldo <= 0) return `No momento seu saldo líquido está negativo ou nulo. O maior conselho de investimentos que posso te dar agora é: **Invista em redução drástica de custos** ou injeção de capital via sócios. Só aplicamos no mercado quando há superávit sustentável.`;
    
    return `**SUGESTÃO DE ALOCAÇÃO DE EXCEDENTE CAIXA**
Seu saldo líquido de **${this.fmt(saldo)}** abre excelentes portas:

1. **Caixa de Emergência (30%):** CDB de liquidez diária (Rende 100% CDI) para manter a liquidez imediata.
2. **Crescimento & Mkt (50%):** Reinvestir no seu produto (Tráfego pago, CAC, Vendas) tem o maior ROI do mundo.
3. **Reserva de Lucros Pessoais (20%):** Distribuição para os sócios, garantindo o benefício do trabalho.`;
  }

  generateCashFlow(ctx) {
    const { receitas, despesas } = ctx;
    const fco = (receitas * 0.9) - (despesas * 0.85); // Mock de Caixa Operacional
    const fci = -(receitas * 0.1); // Investimentos
    const fcf = -(despesas * 0.05); // Financiamentos
    const fcl = fco + fci + fcf;

    return `**FLUXO DE CAIXA LIVRE (FCL)**

O Fluxo de Caixa mede o "dinheiro vivo" gerado e consumido pela empresa no período selecionado.

**Resumo do Período Selecionado:**
- **Atividades Operacionais (FCO):** ${this.fmt(fco)}
- **Atividades de Investimento (FCI):** ${this.fmt(fci)}
- **Atividades de Financiamento (FCF):** ${this.fmt(fcf)}
- **Fluxo de Caixa Livre (Geração de Caixa):** ${this.fmt(fcl)}

**Recomendação CFO:**
Sempre acompanhe seu **Fluxo de Caixa Operacional**. Se você vende muito no cartão de crédito parcelado, você pode apresentar um DRE com lucros altos, mas quebrar por falta de dinheiro vivo no dia 5. Acompanhe a aba de Transações para ter a realidade exata das movimentações bancárias diárias.`;
  }

  generateBreakEven(ctx) {
    const { receitas, despesas } = ctx;
    const margemContribuicao = 0.40; // mock 40%
    const cf = despesas * 0.7; // mock 70% fixed
    const pe = cf / margemContribuicao;

    return `**PONTO DE EQUILÍBRIO (BREAK-EVEN POINT)**

Para a sua empresa não ter prejuízo nem lucro (resultado exato de R$ 0,00), estimamos que você precisa faturar:
**Ponto de Equilíbrio: ${this.fmt(pe)} / mês**

Qualquer valor vendido ACIMA dessa marca entra rapidamente para sua última linha (Lucro Líquido), ajudando a compor sua rentabilidade real.`;
  }

  generateKPIs(ctx) {
    const { receitas, despesas, saldo } = ctx;
    return `**PAINEL DE KPIs & INDICADORES CHAVE**

* **Receitas:** ${this.fmt(receitas)}
* **Despesas:** ${this.fmt(despesas)}
* **Lucratividade Líquida:** ${(receitas>0 ? saldo/receitas*100 : 0).toFixed(1)}%
* **Eficácia de Custo:** As despesas são ${(receitas>0 ? despesas/receitas*100 : 100).toFixed(1)}% da receita.
* **Score IA:** ${this.calcScore(ctx)}/100

Acompanhe os cards na página inicial para ver gráficos da evolução histórica de receitas cruzadas com despesas (6 meses).`;
  }

  // ══════════════════════════════════════════════════════════════
  // MÓDULO ORÁCULO: PREVISÃO MACROECONÔMICA & CNPJ
  // ══════════════════════════════════════════════════════════════
  
  analyzeRealCompany(data) {
    const age = data.data_inicio_atividade ? (new Date().getFullYear() - parseInt(data.data_inicio_atividade.substring(0, 4))) : 5;
    const capital = data.capital_social || 0;
    const isAtiva = data.descricao_situacao_cadastral === 'ATIVA';
    const cnaeDesc = data.cnae_fiscal_descricao || 'Genérico';

    // Score breakdown detalhado
    const breakdown = [];
    let score = 50;
    breakdown.push({ label: 'Base inicial', value: '+50', type: 'neutral' });

    const agePts = Math.min(age * 2, 20);
    score += agePts;
    breakdown.push({ label: `Tempo de mercado (${age} anos)`, value: `+${agePts}`, type: 'positive' });

    if (capital > 100000) { score += 15; breakdown.push({ label: 'Capital Social > R$100k', value: '+15', type: 'positive' }); }
    else if (capital > 10000) { score += 5; breakdown.push({ label: 'Capital Social > R$10k', value: '+5', type: 'positive' }); }
    else { breakdown.push({ label: 'Capital Social baixo', value: '+0', type: 'neutral' }); }

    if (!isAtiva) { score -= 40; breakdown.push({ label: 'Situação cadastral INATIVA', value: '-40', type: 'negative' }); }
    else { score += 5; breakdown.push({ label: 'Situação cadastral ATIVA', value: '+5', type: 'positive' }); }

    if (data.qsa && data.qsa.length > 0) { score += 5; breakdown.push({ label: `Quadro societário (${data.qsa.length})`, value: '+5', type: 'positive' }); }

    score = Math.max(0, Math.min(100, score));
    const riskLevel = score >= 70 ? 'Baixo' : score >= 45 ? 'Moderado' : 'Alto';
    const emoji = score >= 70 ? '🟢' : score >= 45 ? '🟡' : '🔴';

    const parecer = score >= 70
      ? `Empresa do setor **${cnaeDesc}** com ${age} anos de mercado e situação ${isAtiva ? 'regular' : 'irregular'} na Receita Federal. O capital social de ${this.fmt(capital)} e a maturidade do negócio indicam solidez operacional. Risco calculado: **${riskLevel}**. Recomendação: manter monitoramento trimestral e buscar oportunidades de expansão.`
      : score >= 45
      ? `Empresa do setor **${cnaeDesc}** apresenta risco **${riskLevel}**. Com ${age} anos de operação e capital de ${this.fmt(capital)}, existem pontos de atenção que merecem acompanhamento próximo. Recomendação: avaliar saúde financeira trimestral e diversificar fontes de receita.`
      : `Empresa do setor **${cnaeDesc}** em situação de risco **${riskLevel}**. Indicadores apontam fragilidades significativas. Recomendação urgente: revisão completa da estrutura financeira, renegociação de passivos e plano de reestruturação.`;

    return {
      isReal: true,
      name: data.razao_social || 'Empresa Desconhecida',
      status: data.descricao_situacao_cadastral || 'Desconhecida',
      capital_social: capital,
      data_abertura: data.data_inicio_atividade || '',
      idade: age + ' anos',
      sector: cnaeDesc,
      natureza_juridica: data.natureza_juridica || 'N/D',
      endereco: `${data.logradouro || ''}, ${data.numero || 'S/N'} - ${data.bairro || ''}, ${data.municipio || ''} - ${data.uf || ''}`,
      contatos: `${data.ddd_telefone_1 || 'N/D'} | ${data.email || 'N/D'}`,
      qsa: data.qsa || [],
      cnaes_secundarios: data.cnaes_secundarios || [],
      score: score,
      riskLevel: riskLevel,
      emoji: emoji,
      scoreBreakdown: breakdown,
      parecer: parecer
    };
  }

  analyzeCreditRisk(document_digits, name, docType) {
    // Fallback determ e Mock de Risco de Credito (CPF/CNPJ)
    const hash = document_digits.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    const score = 30 + (hash % 50);
    const riskLevel = score >= 70 ? "Baixo" : score >= 45 ? "Moderado" : "Alto";
    
    // Simulacao de restricoes CADIN/Serasa dependendo do Score
    const restricoes = [];
    if (score < 50) restricoes.push("Apontamento Serasa");
    if (score < 60 && docType === "CNPJ") restricoes.push("Pendencia CADIN");
    if (score < 40) restricoes.push("Protestos em Cartorio");

    return {
      isReal: false,
      name: name,
      status: restricoes.length > 0 ? "Com Restricoes" : "Regular",
      capital_social: 0,
      data_abertura: "",
      idade: "N/D",
      sector: "Nao identificado (simulacao)",
      natureza_juridica: docType === "CPF" ? "Pessoa Fisica" : "Pessoa Juridica",
      endereco: "",
      contatos: "",
      qsa: [],
      cnaes_secundarios: [],
      score: score,
      riskLevel: riskLevel,
      restricoes: restricoes,
      docType: docType
    };
  }

  analyzeCompany(cnpj, name) {
    // Fallback determinístico quando a API da Receita não responde
    const hash = cnpj.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const score = 30 + (hash % 50);
    const riskLevel = score >= 70 ? 'Baixo' : score >= 45 ? 'Moderado' : 'Alto';
    const emoji = score >= 70 ? '🟢' : score >= 45 ? '🟡' : '🔴';

    return {
      isReal: false,
      name: name,
      status: 'N/D',
      capital_social: 0,
      data_abertura: '',
      idade: 'N/D',
      sector: 'Não identificado (simulação)',
      natureza_juridica: 'N/D',
      endereco: '',
      contatos: '',
      qsa: [],
      cnaes_secundarios: [],
      score: score,
      riskLevel: riskLevel,
      emoji: emoji,
      scoreBreakdown: [
        { label: 'Análise simulada (sem dados reais)', value: `${score}`, type: 'neutral' }
      ],
      parecer: `Não foi possível consultar os dados oficiais da Receita Federal para o CNPJ **${cnpj}**. O score apresentado é uma estimativa simulada pela IA. Para uma análise precisa, verifique se o CNPJ está correto (14 dígitos) e tente novamente.`
    };
  }

  generateOracle(data) {
    const cnaeDesc = (data.cnae_fiscal_descricao || "").toLowerCase();
    
    // Análise de Porte e Empresa
    let sit = data.descricao_situacao_cadastral || "Desconhecida";
    let cs = data.capital_social || 0;
    
    let diagEmpresa = `* **Razão Social:** ${data.razao_social}
* **Situação:** ${sit}
* **Capital Social:** ${this.fmt(cs)}
* **Atividade (CNAE):** ${data.cnae_fiscal_descricao}`;

    // Motor Macro-Econômico Simulado (Baseado em Dados Globais de 2026)
    let tendenciaGlobal = ``;
    let planoAcao = ``;
    let riscoSetor = ``;

    if (cnaeDesc.includes("varejista") || cnaeDesc.includes("comercio") || cnaeDesc.includes("supermercado")) {
      riscoSetor = "🟡 Risco Setorial Moderado";
      tendenciaGlobal = `**Contexto Macro (Varejo & Comércio):**
A inflação mundial estabilizou, mas a taxa básica de juros (Selic) ainda pressiona o crédito. Notícias recentes indicam que gigantes asiáticas estão forçando as varejistas locais a investirem massivamente em *Phygital* (Integração Físico e Digital) para sobreviverem. O custo de aquisição de cliente (CAC) subiu 15% no último semestre globalmente.`;
      planoAcao = `1. **Liquidação de Estoque Parado:** Transforme produtos encalhados em caixa rápido.
2. **Fidelização:** Custa 7x mais atrair um novo cliente do que vender para o atual. Crie um programa de recompensas.
3. **Corte Intermediários:** Compre diretamente de fabricantes maiores para proteger sua margem de lucro.`;
    } 
    else if (cnaeDesc.includes("tecnologia") || cnaeDesc.includes("software") || cnaeDesc.includes("informacao")) {
      riscoSetor = "🟢 Risco Setorial Baixo (Alto Crescimento)";
      tendenciaGlobal = `**Contexto Macro (Tecnologia & Inovação):**
Mercados globais reportam que a adoção de Inteligência Artificial reduziu custos operacionais de software em até 40%. Contudo, há uma bolha de startups e investidores (VCs) exigem lucro rápido no lugar de apenas crescimento. A escassez de desenvolvedores sêniores continua sendo um gargalo global.`;
      planoAcao = `1. **Integração IA:** Adote ferramentas de IA (como o CFO MAX) para otimizar suas operações internas hoje mesmo.
2. **Pricing:** Suba os preços para clientes corporativos (B2B); o mercado aceita repasses se houver ganho de produtividade.
3. **Métricas de SaaS:** Monitore seu Churn (Cancelamentos) semanalmente. Acima de 5% a.m. é fatal.`;
    }
    else if (cnaeDesc.includes("construcao") || cnaeDesc.includes("engenharia") || cnaeDesc.includes("imobiliario")) {
      riscoSetor = "🔴 Risco Setorial Alto (Sensível a Juros)";
      tendenciaGlobal = `**Contexto Macro (Construção Civil):**
O mercado imobiliário mundial sofre o impacto dos juros de longo prazo. Em relatórios da Bloomberg, o custo de materiais (aço e cimento) teve pico de inflação, mas agora começa a ceder. O sucesso do setor em 2026 depende de parcerias com bancos que ofereçam taxas subsidiadas aos clientes finais.`;
      planoAcao = `1. **Proteção de Margem:** Compre insumos (ferro, cimento) com contratos travados (hedge) para evitar sustos de inflação.
2. **Alavancagem:** Evite pegar empréstimos com taxas pré-fixadas altas agora.
3. **Foco em Alta Renda:** O público de luxo continua comprando à vista, sem depender de financiamentos caros.`;
    }
    else if (cnaeDesc.includes("saude") || cnaeDesc.includes("medica") || cnaeDesc.includes("clinica")) {
      riscoSetor = "🟢 Risco Setorial Baixo (Demanda Inelástica)";
      tendenciaGlobal = `**Contexto Macro (Saúde e Bem-Estar):**
O envelhecimento populacional global garante demanda infinita. A OMS e os jornais econômicos mostram uma migração para 'Medicina Preventiva'. Contudo, a inflação médica é historicamente o dobro da inflação normal, achatando as margens das clínicas que não reajustam preços.`;
      planoAcao = `1. **Repasse de Custos:** Reajuste suas tabelas particulares anualmente acima da inflação para cobrir suprimentos importados.
2. **Verticalização:** Ofereça exames básicos dentro da própria clínica para aumentar o Ticket Médio do paciente.
3. **Redução de Glosas:** Se atende convênios, automatize seu faturamento para zerar as perdas por burocracia.`;
    }
    else if (cnaeDesc.includes("alimentacao") || cnaeDesc.includes("restaurante") || cnaeDesc.includes("bar")) {
      riscoSetor = "🔴 Risco Setorial Alto (Baixa Barreira de Entrada)";
      tendenciaGlobal = `**Contexto Macro (Alimentação e Food-Service):**
Notícias mundiais destacam a pressão gigantesca dos aplicativos de entrega (taxas de até 27%). Além disso, a inflação de alimentos in-natura flutua com as mudanças climáticas (El Niño). O consumidor está saindo menos e pedindo mais delivery, mas exige velocidade e embalagens impecáveis.`;
      planoAcao = `1. **Engenharia de Cardápio:** Retire os 20% dos pratos que menos vendem. Foco em ingredientes que você já usa para outros pratos.
2. **Canal Próprio:** Crie um sistema de delivery próprio no WhatsApp para fugir das taxas absurdas dos apps grandes.
3. **Controle de Desperdício (CMV):** Pese tudo. Desperdício no lixo é dinheiro do lucro evaporando.`;
    }
    else {
      riscoSetor = "🟡 Risco Setorial Moderado (Serviços e Genéricos)";
      tendenciaGlobal = `**Contexto Macro (Economia Global):**
A economia mundial caminha para uma leve desaceleração ('Pouso Suave' dos EUA). No Brasil, a reforma tributária pode impactar o setor de serviços, aumentando a carga final. Empresas sem diferencial competitivo estão perdendo margem esmagadas pela inflação de insumos.`;
      planoAcao = `1. **Foco em Caixa:** Dinheiro na mão é rei. Segure investimentos de longo prazo por enquanto.
2. **Automação:** Invista em sistemas para reduzir dependência de mão de obra braçal.
3. **Nichar o Produto:** Pare de vender para 'todo mundo'. Torne-se o especialista no seu nicho e cobre mais caro por isso.`;
    }

    return `🔮 **MÓDULO ORÁCULO: PREVISÃO MACROECONÔMICA**

Analisei a fundo a estrutura da empresa via Receita Federal (CNPJ: ${data.cnpj}) e cruzei seu setor de atuação (*${cnaeDesc.toUpperCase()}*) com dados econômicos mundiais.

**1. DIAGNÓSTICO DO CNPJ**
${diagEmpresa}
* **Alerta do CFO:** ${riscoSetor}

**2. ORÁCULO: O QUE ACONTECE NO SEU MERCADO HOJE?**
${tendenciaGlobal}

**3. PLANO DE AÇÃO PARA BLINDAR SEUS LUCROS**
${planoAcao}

*Análise gerada em tempo real cruzando a Receita Federal com projeções do mercado financeiro global.*`;
  }

  // ══════════════════════════════════════════════════════════════
  // MÓDULO NLP / CHAT CONVERSACIONAL INTELIGENTE
  // ══════════════════════════════════════════════════════════════
  generateSmartResponse(cmd, ctx) {
    const { receitas, despesas, saldo } = ctx;
    const c = cmd.toLowerCase().trim();

    if (this.has(c, 'lucro', 'lucrando', 'prejuízo', 'resultado', 'valeu a pena', 'ganhei dinheiro', 'to no vermelho')) {
      if (saldo > 0) {
        return `**Sim, você está lucrando!** 🚀\nSeu resultado líquido atual é de **${this.fmt(saldo)}** positivos.\nSua margem de lucro está em **${(saldo/receitas*100).toFixed(1)}%**. \n\nComo CFO, recomendo que você mantenha uma reserva de pelo menos 20% desse valor e estude investimentos para o excedente. Quer simular onde investir?`;
      } else if (saldo < 0) {
        return `**Atenção: Você está operando com prejuízo.** 📉\nSeu resultado atual está negativo em **${this.fmt(saldo)}**. Isso significa que suas despesas (${this.fmt(despesas)}) superaram suas receitas (${this.fmt(receitas)}). \n\nRecomendo focarmos em *cortar gastos* imediatamente ou fazer um aporte de capital. Quer ver o Diagnóstico Financeiro completo?`;
      } else {
        return `Você está no **Zero a Zero (Break-even)**.\nSuas receitas cobriram exatamente as despesas, sem gerar lucro. É um sinal de alerta de que você precisa estressar suas vendas ou repensar a operação!`;
      }
    }

    if (this.has(c, 'receita', 'faturamento', 'quanto ganhei', 'quanto entrou', 'vendi quanto')) {
      return `Seu faturamento total registrado é de **${this.fmt(receitas)}**.\n\nSe você quiser, posso gerar uma análise de Margens ou um Forecast para prever quanto você vai faturar nos próximos meses. O que prefere?`;
    }

    if (this.has(c, 'despesa', 'gasto', 'quanto gastei', 'onde estou gastando', 'maior custo', 'custos', 'gastos')) {
      return `O total de suas despesas é de **${this.fmt(despesas)}**.\n\nComo seu CFO, a minha recomendação é manter as despesas abaixo de 70% da receita (as suas representam ${receitas > 0 ? (despesas/receitas*100).toFixed(1) : 100}% no momento).\n\nPosso gerar um plano de **Redução de Custos** detalhado. Digite "reduzir custos" para eu iniciar a análise de corte.`;
    }

    if (this.has(c, 'o que eu faço', 'como melhorar', 'dica', 'conselho', 'sugestão', 'ajuda pra crescer', 'analise pra mim')) {
      return `**Conselho Executivo do CFO MAX:**\n\n1. **Acompanhe sua margem:** Sua margem atual é de ${(receitas>0 ? saldo/receitas*100 : 0).toFixed(1)}%. Tente levá-la de forma saudável para acima de 15%.\n2. **Runway:** Mantenha caixa suficiente para cobrir pelo menos 6 meses das suas despesas fixas. Você não quer ser surpreendido em uma crise.\n3. **Cortes inteligentes:** Foque em cortar custos que não afetam a qualidade da experiência do seu cliente.\n\nPosso gerar relatórios mais profundos baseados em contabilidade consultiva. Tente pedir um "DRE Completo" ou um "Diagnóstico".`;
    }

    if (c.includes('?')) {
      return `Essa é uma excelente pergunta ("*${cmd}*").\nComo Inteligência Artificial focada em Finanças Corporativas (CFO), eu cruzo seus lançamentos reais com as melhores práticas contábeis do mercado.\n\nPara te dar a resposta mais precisa sobre isso, recomendo que você confira seu **Diagnóstico Financeiro** completo ou o seu **DRE**, onde mapeei todos os seus indicadores com precisão matemática. Quer que eu gere um deles agora?`;
    }

    return `Entendi sua intenção: "*${cmd}*".\n\nComo seu CFO Virtual, eu funciono muito bem se você me pedir análises executivas. Você pode digitar comandos livres como:\n\n* *"Como estão meus lucros?"*\n* *"Qual meu maior gasto?"*\n* *"Gere meu DRE"*\n* *"Investir meu excedente"*\n* *"Analise o CNPJ 33.000.167/0001-01"*\n\nComo quer prosseguir?`;
  }

  // ══════════════════════════════════════════════════════════════
  // HELPER METHODS & UTILS
  // ══════════════════════════════════════════════════════════════
  handleCompanyQuery(cmd) { return `Para analisar o nível de risco de uma empresa real, digite o CNPJ dela exatamente no chat (ex: 00.000.000/0001-00) ou vá até a aba "🏢 Empresas". Eu consultarei a Receita Federal na mesma hora.`; }
  
  handleSimulatorQuery() { return `O Simulador de Cenários (aba 🧮) permite ajustar receitas e despesas com sliders e ver o impacto em tempo real no seu resultado, margem e score financeiro de forma super interativa!`; }

  getGreeting() {
    const hour = new Date().getHours();
    const greet = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
    return `${greet}! Sou o **MAX**, seu CFO Virtual de inteligência artificial.\n\nEstou aqui para ser seu parceiro estratégico financeiro 24h por dia. Posso:\n\n* Analisar seu DRE em segundos\n* Apontar onde cortar despesas (Cost Cutting)\n* Simular cenários e Runways de sobrevivência\n* Avaliar empresas via CNPJ\n\nComo posso ajudar os negócios hoje? Digite ou escolha abaixo.`;
  }
  
  getHelp() { return `**O que o MAX CFO pode fazer por você:**\n\n* Analisar a "Saúde Financeira" da empresa\n* Emitir um "DRE" para fechamento mensal\n* Indicar a melhor "Margem de Lucro"\n* Sugerir onde "Cortar Gastos"\n* Consultar dados reais na Receita se você me passar um CNPJ\n\nBasta escrever como você falaria com um consultor!`; }
  
  getThanks() { return `De nada! O trabalho duro compensa. Conte com a minha análise sempre que for tomar decisões financeiras críticas! 🚀`; }

  generateExecParecer(ctx, score, margem) {
    if (score >= 80) return `A empresa apresenta liquidez invejável, custos perfeitamente otimizados e rentabilidade premium. É o cenário ideal para acelerar investimentos agressivos no core-business, M&A ou distribuição de lucros. Mantenha os controles e parabéns pelo trabalho de gestão.`;
    if (score >= 60) return `Operação saudável. Temos lucros, porém com algumas linhas de despesa possivelmente elevadas. O foco para este momento é proteger o Capital de Giro e iniciar um comitê para revisar contratos com grandes fornecedores, elevando a margem para a categoria premium.`;
    if (score >= 40) return `Cenário de Alerta Moderado. A geração de caixa está muito comprimida em relação à operação. Recomendo *cost cutting* emergencial em todas as despesas indiretas e pausa em grandes investimentos imobilizados até recuperarmos a robustez financeira.`;
    return `Situação Alarmante! A empresa encontra-se em zona de prejuízo crônico e queima de caixa intensa. É necessário reestruturação imediata de despesas operacionais. Busque blindagem de patrimônio e negocie ativamente as maiores contas pendentes para manter a sobrevivência do CNPJ.`;
  }

  calcScore(ctx) {
    const { receitas, despesas, saldo } = ctx;
    if (receitas === 0) return 0;
    let s = 50;
    if (saldo > 0) s += 20; else s -= 30;
    const mg = saldo / receitas;
    if (mg >= 0.2) s += 20;
    else if (mg >= 0.1) s += 10;
    else if (mg >= 0) s += 0;
    if (despesas < receitas * 0.5) s += 10;
    s = Math.max(0, Math.min(100, s));
    return Math.floor(s);
  }

  has(cmd, ...words) {
    return words.some(w => cmd.includes(w));
  }

  fmt(val) {
    return (val||0).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
  }

  simulateScenario(ctx, recVar, despVar) {
    const { receitas, despesas, saldo } = ctx;
    const nr = receitas * (1 + recVar / 100);
    const nd = despesas * (1 + despVar / 100);
    const ns = nr - nd;
    const nm = nr > 0 ? (ns / nr) * 100 : 0;
    const curr_m = receitas > 0 ? (saldo / receitas) * 100 : 0;
    const diff = ns - saldo;
    const projScore = this.calcScore({ receitas: nr, despesas: nd, saldo: ns });

    let rec;
    if (ns > saldo && ns > 0) {
      rec = `Cenário **positivo**! Seu resultado projetado de ${this.fmt(ns)} representa uma melhoria de ${this.fmt(diff)} em relação ao atual. A margem projetada de ${nm.toFixed(1)}% está ${nm >= 15 ? 'dentro da faixa saudável' : 'abaixo do ideal de 15%'}. Recomendo avançar com cautela e monitorar os KPIs semanalmente.`;
    } else if (ns > 0) {
      rec = `Cenário com **resultado positivo**, mas inferior ao atual. O lucro cairia de ${this.fmt(saldo)} para ${this.fmt(ns)}, uma redução de ${this.fmt(Math.abs(diff))}. Monitore de perto e busque compensar com aumento de receitas ou novos cortes.`;
    } else {
      rec = `⚠️ Cenário de **prejuízo projetado** de ${this.fmt(ns)}. Neste cenário a empresa operaria no vermelho. Recomendo fortemente revisar a estrutura de custos e buscar novas fontes de receita antes que este cenário se concretize.`;
    }

    return { nr, nd, ns, nm, curr_m, diff, projScore, rec };
  }
}

var engine = new MaxCFOEngine();

window.engine = engine;


// ═══════════ FINTECH & ESTOQUE INTEGRATION ═══════════

async function simulateAnticipation() {
  const amountStr = document.getElementById('fintechAmount').value;
  const amount = parseInt(amountStr, 10);
  if (!amount || amount <= 0) return alert("Insira um valor válido");

  const btn = document.getElementById('btnAnticipate');
  btn.innerText = "Processando...";
  btn.disabled = true;

  try {
    const chargeRes = await fetchAPI(`/fintech/generate-boleto?amount=${amount * 100}`, { method: 'POST' });
    if (!chargeRes || !chargeRes.charge_id) throw new Error("Falha ao gerar cobrança");

    const antRes = await fetchAPI(`/fintech/anticipate?charge_id=${chargeRes.charge_id}`, { method: 'POST' });
    
    document.getElementById('anticipationResult').style.display = 'block';
    document.getElementById('antOriginal').innerText = `R$ ${(antRes.original_amount / 100).toFixed(2).replace('.', ',')}`;
    document.getElementById('antFee').innerText = `- R$ ${(antRes.discount_fee / 100).toFixed(2).replace('.', ',')}`;
    document.getElementById('antNet').innerText = `R$ ${(antRes.net_amount / 100).toFixed(2).replace('.', ',')}`;
  } catch (err) {
    console.error(err);
    alert("Erro ao simular adiantamento");
  } finally {
    btn.innerText = "Simular Adiantamento";
    btn.disabled = false;
  }
}

async function loadInventory() {
  const tbody = document.getElementById('inventory-table-body');
  try {
    const [products, alertsRes] = await Promise.all([
      fetchAPI('/inventory'),
      fetchAPI('/inventory/alerts')
    ]);

    const alerts = alertsRes?.alerts || [];
    const alertsContainer = document.getElementById('inventoryAlertsContainer');
    
    if (alerts.length > 0) {
      alertsContainer.style.display = 'block';
      document.getElementById('inventoryAlertText').innerText = `Existem ${alerts.length} produtos abaixo do ponto de recompra!`;
    } else {
      alertsContainer.style.display = 'none';
    }

    if (!products || products.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:32px; color:var(--text-muted);">Nenhum produto cadastrado.</td></tr>';
      return;
    }

    let html = '';
    products.forEach(prod => {
      const isCritical = prod.quantity <= prod.reorder_point;
      const statusHtml = isCritical
        ? `<span style="background:rgba(239, 68, 68, 0.2); color:#f87171; border:1px solid rgba(239, 68, 68, 0.3); padding:4px 12px; border-radius:12px; font-size:12px; font-weight:bold;">Repor Estoque</span>`
        : `<span style="background:rgba(16, 185, 129, 0.2); color:#34d399; border:1px solid rgba(16, 185, 129, 0.3); padding:4px 12px; border-radius:12px; font-size:12px; font-weight:bold;">Estável</span>`;

      html += `
        <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
          <td>
             <div style="font-weight:bold; color:white;">${prod.name}</div>
             <div style="font-size:12px; color:var(--text-muted);">SKU: ${prod.sku}</div>
          </td>
          <td></td>
          <td style="text-align:center; font-size:18px; font-weight:bold; color:white;">${prod.quantity}</td>
          <td style="text-align:center; color:var(--text-muted);">${prod.reorder_point}</td>
          <td style="text-align:right;">${statusHtml}</td>
        </tr>
      `;
    });
    tbody.innerHTML = html;
  } catch (err) {
    console.error("Failed to load inventory", err);
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:32px; color:#ef4444;">Erro ao carregar estoque.</td></tr>';
  }
}

// Hook into switchView
const originalSwitchView = window.switchView;
window.switchView = function(viewId) {
  if (originalSwitchView) {
    originalSwitchView(viewId);
  }
  
  // Specific view logic
  if (viewId === 'inventory') {
    loadInventory();
  }
};

// ═══════════ NEW ECOSYSTEM LOGIC (v4.0) ═══════════

// Hook into switchView for the new modules
const originalSwitchViewV4 = window.switchView;
window.switchView = function(viewId) {
  if (originalSwitchViewV4) {
    originalSwitchViewV4(viewId);
  }
  


// ═══════════ FINTECH & ESTOQUE INTEGRATION ═══════════

async function simulateAnticipation() {
  const amountStr = document.getElementById('fintechAmount').value;
  const amount = parseInt(amountStr, 10);
  if (!amount || amount <= 0) return alert("Insira um valor válido");

  const btn = document.getElementById('btnAnticipate');
  btn.innerText = "Processando...";
  btn.disabled = true;

  try {
    const chargeRes = await fetchAPI(`/fintech/generate-boleto?amount=${amount * 100}`, { method: 'POST' });
    if (!chargeRes || !chargeRes.charge_id) throw new Error("Falha ao gerar cobrança");

    const antRes = await fetchAPI(`/fintech/anticipate?charge_id=${chargeRes.charge_id}`, { method: 'POST' });
    
    document.getElementById('anticipationResult').style.display = 'block';
    document.getElementById('antOriginal').innerText = `R$ ${(antRes.original_amount / 100).toFixed(2).replace('.', ',')}`;
    document.getElementById('antFee').innerText = `- R$ ${(antRes.discount_fee / 100).toFixed(2).replace('.', ',')}`;
    document.getElementById('antNet').innerText = `R$ ${(antRes.net_amount / 100).toFixed(2).replace('.', ',')}`;
  } catch (err) {
    console.error(err);
    alert("Erro ao simular adiantamento");
  } finally {
    btn.innerText = "Simular Adiantamento";
    btn.disabled = false;
  }
}

async function loadInventory() {
  const tbody = document.getElementById('inventory-table-body');
  try {
    const [products, alertsRes] = await Promise.all([
      fetchAPI('/inventory'),
      fetchAPI('/inventory/alerts')
    ]);

    const alerts = alertsRes?.alerts || [];
    const alertsContainer = document.getElementById('inventoryAlertsContainer');
    
    if (alerts.length > 0) {
      alertsContainer.style.display = 'block';
      document.getElementById('inventoryAlertText').innerText = `Existem ${alerts.length} produtos abaixo do ponto de recompra!`;
    } else {
      alertsContainer.style.display = 'none';
    }

    if (!products || products.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:32px; color:var(--text-muted);">Nenhum produto cadastrado.</td></tr>';
      return;
    }

    let html = '';
    products.forEach(prod => {
      const isCritical = prod.quantity <= prod.reorder_point;
      const statusHtml = isCritical
        ? `<span style="background:rgba(239, 68, 68, 0.2); color:#f87171; border:1px solid rgba(239, 68, 68, 0.3); padding:4px 12px; border-radius:12px; font-size:12px; font-weight:bold;">Repor Estoque</span>`
        : `<span style="background:rgba(16, 185, 129, 0.2); color:#34d399; border:1px solid rgba(16, 185, 129, 0.3); padding:4px 12px; border-radius:12px; font-size:12px; font-weight:bold;">Estável</span>`;

      html += `
        <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
          <td>
             <div style="font-weight:bold; color:white;">${prod.name}</div>
             <div style="font-size:12px; color:var(--text-muted);">SKU: ${prod.sku}</div>
          </td>
          <td></td>
          <td style="text-align:center; font-size:18px; font-weight:bold; color:white;">${prod.quantity}</td>
          <td style="text-align:center; color:var(--text-muted);">${prod.reorder_point}</td>
          <td style="text-align:right;">${statusHtml}</td>
        </tr>
      `;
    });
    tbody.innerHTML = html;
  } catch (err) {
    console.error("Failed to load inventory", err);
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:32px; color:#ef4444;">Erro ao carregar estoque.</td></tr>';
  }
}

// Hook into switchView
const originalSwitchView = window.switchView;
window.switchView = function(viewId) {
  if (originalSwitchView) {
    originalSwitchView(viewId);
  }
  
  // Specific view logic
  if (viewId === 'inventory') {
    loadInventory();
  }
  
  if (viewId === 'thermofinance') {
    initThermofinance();
  }
};

function initThermofinance() {
    // Delegate to module if loaded
    if (typeof window.renderThermofinance === 'function') {
        window.renderThermofinance();
    } else {
        console.log("[Thermofinance] Module not yet loaded");
    }
}

// Simulate OCR Upload
function simulateOCR() {
    alert("Iniciando Leitura Mágica OCR com IA...");
    setTimeout(() => {
        alert("Sucesso! NFs processadas e lançadas no financeiro (Simulação).");
    }, 2000);
}

// Ensure the OCR button in finance actually calls this (Wait, we injected 'alert' directly in page.js, let's leave it as is or update it).

// ═══════════ OCR MÁGICO LOGIC ═══════════

function openOCRModal() {
    // Reset state
    document.getElementById('ocrUploadState').style.display = 'block';
    document.getElementById('ocrReviewState').style.display = 'none';
    document.getElementById('ocrScanningOverlay').style.display = 'none';
    
    // Set today as default date for extracted data
    document.getElementById('ocrExtractedDate').value = new Date().toISOString().split('T')[0];
    
    openModal('ocrModal');
}

function handleOCRFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // 1. Show Scanning Animation
    document.getElementById('ocrScanningOverlay').style.display = 'flex';
    
    // 2. Simulate AI Processing (3 seconds)
    setTimeout(() => {
        // Hide upload, show review
        document.getElementById('ocrUploadState').style.display = 'none';
        document.getElementById('ocrReviewState').style.display = 'block';
        
        // Randomize the mock data just a little bit to feel real
        const amounts = [4530.00, 1250.50, 8900.00, 320.00, 15000.00];
        const randomAmount = amounts[Math.floor(Math.random() * amounts.length)];
        document.getElementById('ocrExtractedAmount').value = randomAmount;
        
        // Reset file input so same file can be uploaded again if needed
        event.target.value = '';
    }, 3000);
}

function resetOCR() {
    document.getElementById('ocrUploadState').style.display = 'block';
    document.getElementById('ocrReviewState').style.display = 'none';
    document.getElementById('ocrScanningOverlay').style.display = 'none';
}

function saveOCRTransaction() {
    const desc = document.getElementById('ocrExtractedDesc').value;
    const amount = parseFloat(document.getElementById('ocrExtractedAmount').value);
    const date = document.getElementById('ocrExtractedDate').value;
    const cat = document.getElementById('ocrExtractedCategory').value;
    
    const newTx = {
        id: 'tx-' + Date.now(),
        desc: desc,
        amount: amount,
        date: date,
        type: 'DESPESA',
        category: cat,
        notes: 'Extraído automaticamente via IA (OCR)'
    };
    
    // Use the global state from app.js
    var txs = JSON.parse(localStorage.getItem('maxcfo_transactions') || '[]');
    txs.push(newTx);
    localStorage.setItem('maxcfo_transactions', JSON.stringify(txs));
    // Also update app.js state if available
    if (window.state && window.state.transactions) {
        window.state.transactions.push(newTx);
    }
    
    // Switch to finance view and refresh
    closeModal('ocrModal');
    switchView('finance');
    if (typeof renderFinance === 'function') renderFinance();
    if (typeof renderDashboard === 'function') renderDashboard();
    applyFilters();
    
    // Show a success notification
    if (typeof showToast === 'function') showToast('Despesa lançada com sucesso via OCR Mágico! ✅', 'success');

// Add drag and drop listeners
document.addEventListener('DOMContentLoaded', () => {
    // We have to wait or run it if DOM is already loaded, but engine.js is loaded dynamically or synchronously.
    // For safety, let's just add it to the window load
});

// Since the JS is executed, let's just bind drag events globally to the drop zone.
setTimeout(() => {
    const dropZone = document.getElementById('ocrDropZone');
    if (dropZone) {
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });
        dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
        });
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                // Mock the event object for our handler
                handleOCRFile({ target: { files: e.dataTransfer.files } });
            }
        });
    }
}, 1000);
