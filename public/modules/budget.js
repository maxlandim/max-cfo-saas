/**
 * MAX CFO AI - Orçamentos Module
 */

window.initBudgetModule = function() {
    if (!window.state) window.state = {};
    // Os dados vêm da nuvem (Firestore). Sem exemplos inventados.
    window.state.budgets = Array.isArray(window.state.budgets) ? window.state.budgets : [];
};

window.renderBudget = function() {
    const view = document.getElementById('view-budget');
    if (!view) return;
    
    let totalAprovado = 0;
    
    let tbody = '';
    window.state.budgets.sort((a,b) => new Date(b.data) - new Date(a.data)).forEach(b => {
        if (b.status === 'Aprovado') totalAprovado += b.total;
        
        let statusStyle = 'background:rgba(156,163,175,0.1);color:#9ca3af';
        if (b.status === 'Enviado') statusStyle = 'background:rgba(129,140,248,0.1);color:#818cf8';
        else if (b.status === 'Aprovado') statusStyle = 'background:rgba(16,185,129,0.1);color:#10b981';
        else if (b.status === 'Faturado') statusStyle = 'background:rgba(192,132,252,0.1);color:#c084fc';
        
        tbody += `
        <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
            <td><strong>${b.num}</strong></td>
            <td><div style="font-weight:bold; color:white;">${b.cliente}</div></td>
            <td style="font-weight:bold;">R$ ${b.total.toLocaleString('pt-BR', {minimumFractionDigits:2})}</td>
            <td><span class="chip" style="${statusStyle}">${b.status}</span></td>
            <td>${new Date(b.data).toLocaleDateString('pt-BR')}</td>
            <td>
                <button class="btn-ghost" style="padding:4px 8px; font-size:12px; margin-right:4px;" onclick="advanceBudget('${b.id}')">Avançar Status</button>
                <button class="btn-ghost" style="padding:4px 8px; font-size:12px; color:var(--danger);" onclick="deleteBudget('${b.id}')">Excluir</button>
            </td>
        </tr>`;
    });
    
    view.innerHTML = `
      <div class="page-header">
        <div class="page-header-text">
          <h1>Orçamentos e Ordens de Serviço</h1>
          <p class="page-subtitle">Pipeline comercial (Quote-to-Cash)</p>
        </div>
        <div class="page-header-actions">
          <button class="btn-primary" onclick="openModalEl('budgetModal')">+ Novo Orçamento</button>
        </div>
      </div>
      
      <div class="grid-2col" style="margin-top:20px;">
        <div class="card">
            <div style="color:var(--text-muted); font-size:14px; margin-bottom:8px;">Total Orçamentos Aprovados (Pipeline)</div>
            <div style="font-size:32px; font-weight:bold; color:var(--success);">R$ ${totalAprovado.toLocaleString('pt-BR', {minimumFractionDigits:2})}</div>
        </div>
        <div class="card">
            <div style="color:var(--text-muted); font-size:14px; margin-bottom:8px;">Volume em Negociação</div>
            <div style="font-size:32px; font-weight:bold; color:white;">${window.state.budgets.length} docs</div>
        </div>
      </div>
      
      <div class="card" style="margin-top:20px;">
        <h3 class="card-title">Gestão de Orçamentos</h3>
        <table class="data-table">
            <thead>
                <tr>
                    <th>Número</th>
                    <th>Cliente</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Data</th>
                    <th>Ações</th>
                </tr>
            </thead>
            <tbody>${tbody}</tbody>
        </table>
      </div>
    `;
};

window.advanceBudget = function(id) {
    const b = window.state.budgets.find(x => x.id === id);
    if (!b) return;
    
    const flux = ['Rascunho', 'Enviado', 'Aprovado', 'Em Execução', 'Concluído', 'Faturado'];
    let idx = flux.indexOf(b.status);
    if (idx < flux.length - 1) {
        b.status = flux[idx + 1];
        if (window.persist) window.persist();
        
        if (b.status === 'Faturado') {
            if (window.showToast) window.showToast('Orçamento Faturado! Emita a NF-e no módulo Fiscal.', 'success');
        } else {
            if (window.showToast) window.showToast(`Status alterado para ${b.status}`, 'success');
        }
        
        renderBudget();
    }
};

window.deleteBudget = function(id) {
    if(!confirm('Excluir este orçamento?')) return;
    window.state.budgets = window.state.budgets.filter(x => x.id !== id);
    if (window.persist) window.persist();
    if (window.showToast) window.showToast('Orçamento excluído.', 'success');
    renderBudget();
};

window.submitBudgetForm = function(e) {
    e.preventDefault();
    const cliente = document.getElementById('budCliente').value;
    const valor = parseFloat(document.getElementById('budTotal').value);
    
    const num = "ORC-" + Math.floor(1000 + Math.random() * 9000);
    
    window.state.budgets.push({
        id: Date.now().toString(),
        num,
        cliente,
        total: valor,
        status: 'Rascunho',
        data: new Date().toISOString()
    });
    
    if (window.persist) window.persist();
    closeModal('budgetModal');
    if (window.showToast) window.showToast('Orçamento criado!', 'success');
    renderBudget();
};
