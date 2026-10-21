/**
 * MAX CFO AI - Comissões Module
 */

window.initCommissionsModule = function() {
    if (!window.state) window.state = {};
    // Os dados vêm da nuvem (Firestore). Sem exemplos inventados.
    window.state.commissions = Array.isArray(window.state.commissions) ? window.state.commissions : [];
};

window.renderCommissions = function() {
    const view = document.getElementById('view-commissions');
    if (!view) return;
    
    let aPagar = 0;
    
    let tbody = '';
    window.state.commissions.forEach(c => {
        if (c.status === 'A Pagar') aPagar += c.valorComissao;
        
        let statusStyle = c.status === 'Pago' ? 'background:rgba(16,185,129,0.1);color:#10b981' : 'background:rgba(245,158,11,0.1);color:#fbbf24';
        
        tbody += `
        <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
            <td><div style="font-weight:bold; color:white;">${c.vendedor}</div></td>
            <td>R$ ${c.vendaBruta.toLocaleString('pt-BR', {minimumFractionDigits:2})}</td>
            <td>${c.taxa}%</td>
            <td style="font-weight:bold; color:var(--primary);">R$ ${c.valorComissao.toLocaleString('pt-BR', {minimumFractionDigits:2})}</td>
            <td><span class="chip" style="${statusStyle}">${c.status}</span></td>
            <td>
                ${c.status === 'A Pagar' ? `<button class="btn-ghost" style="padding:4px 8px; font-size:12px; color:var(--success);" onclick="payCommission('${c.id}')">Liquidar</button>` : ''}
            </td>
        </tr>`;
    });
    
    view.innerHTML = `
      <div class="page-header">
        <div class="page-header-text">
          <h1>Comissões & Bônus (Sales)</h1>
          <p class="page-subtitle">Cálculo automatizado sobre vendas faturadas</p>
        </div>
        <div class="page-header-actions">
          <button class="btn-primary" onclick="openModalEl('commModal')">+ Registrar Comissão</button>
        </div>
      </div>
      
      <div class="grid-2col" style="margin-top:20px;">
        <div class="card">
            <div style="color:var(--text-muted); font-size:14px; margin-bottom:8px;">Total de Comissões a Pagar</div>
            <div style="font-size:32px; font-weight:bold; color:var(--warning);">R$ ${aPagar.toLocaleString('pt-BR', {minimumFractionDigits:2})}</div>
        </div>
        <div class="card">
            <h3 class="card-title">Ranking de Vendas (Simulado)</h3>
            <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.05)">
                <span>🥇 Luciana Costa</span> <strong>R$ 85.000</strong>
            </div>
            <div style="display:flex; justify-content:space-between; padding:8px 0;">
                <span>🥈 Roberto Vendas</span> <strong>R$ 50.000</strong>
            </div>
        </div>
      </div>
      
      <div class="card" style="margin-top:20px;">
        <h3 class="card-title">Fechamento de Comissões</h3>
        <table class="data-table">
            <thead>
                <tr>
                    <th>Vendedor / Representante</th>
                    <th>Base (Vendas Faturadas)</th>
                    <th>Taxa (%)</th>
                    <th>Valor Devido</th>
                    <th>Status</th>
                    <th>Ações</th>
                </tr>
            </thead>
            <tbody>${tbody}</tbody>
        </table>
      </div>
    `;
};

window.payCommission = function(id) {
    const c = window.state.commissions.find(x => x.id === id);
    if (!c) return;
    
    c.status = 'Pago';
    if (window.persist) window.persist();
    
    // Auto despesa
    if (window.state.transactions) {
        window.state.transactions.push({
            id: 'tx-' + Date.now().toString(),
            type: 'DESPESA',
            date: new Date().toISOString().split("T")[0],
            desc: `Pgto Comissão - ${c.vendedor}`,
            category: 'Folha de Pagamento', // or Comissoes
            amount: c.valorComissao
        });
        if (window.persist) window.persist();
    }
    
    if (window.showToast) window.showToast('Comissão paga e lançada como despesa!', 'success');
    renderCommissions();
};

window.submitCommForm = function(e) {
    e.preventDefault();
    const vendedor = document.getElementById('commVendedor').value;
    const bruta = parseFloat(document.getElementById('commBase').value);
    const taxa = parseFloat(document.getElementById('commTaxa').value);
    
    window.state.commissions.push({
        id: Date.now().toString(),
        vendedor: vendedor,
        vendaBruta: bruta,
        taxa: taxa,
        valorComissao: (bruta * taxa / 100),
        status: 'A Pagar',
        competencia: new Date().toISOString().substring(0, 7)
    });
    if (window.persist) window.persist();
    closeModal('commModal');
    if (window.showToast) window.showToast('Comissão registrada!', 'success');
    renderCommissions();
};
