/**
 * MAX CFO AI - Cobrança Nativa Module
 */

window.initBillingModule = function() {
    if (!window.state) window.state = {};
    let billings = JSON.parse(localStorage.getItem('maxcfo_billings') || 'null');
    if (!billings) {
        billings = [
            { id: "1", cliente: "João Silva", valor: 1500, vencimento: "2026-07-10", tipo: "Boleto", status: "Pendente" },
            { id: "2", cliente: "Maria Souza", valor: 850, vencimento: "2026-06-25", tipo: "Pix", status: "Vencido" }
        ];
        localStorage.setItem('maxcfo_billings', JSON.stringify(billings));
    }
    window.state.billings = billings;
};

window.renderBilling = function() {
    const view = document.getElementById('view-billing');
    if (!view) return;
    
    let totalPendente = 0;
    
    let tbody = '';
    window.state.billings.forEach(b => {
        if (b.status === 'Pendente') totalPendente += b.valor;
        
        let statusStyle = 'background:rgba(245,158,11,0.1);color:#fbbf24';
        if (b.status === 'Pago') statusStyle = 'background:rgba(16,185,129,0.1);color:#10b981';
        else if (b.status === 'Vencido') statusStyle = 'background:rgba(239,68,68,0.1);color:#ef4444';
        
        tbody += `
        <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
            <td><div style="font-weight:bold; color:white;">${b.cliente}</div></td>
            <td>R$ ${b.valor.toLocaleString('pt-BR', {minimumFractionDigits:2})}</td>
            <td>${b.tipo}</td>
            <td>${new Date(b.vencimento).toLocaleDateString('pt-BR')}</td>
            <td><span class="chip" style="${statusStyle}">${b.status}</span></td>
            <td>
                ${b.status !== 'Pago' ? `<button class="btn-ghost" style="padding:4px 8px; font-size:12px; color:var(--success);" onclick="markBillingPaid('${b.id}')">Baixar (Pago)</button>` : ''}
            </td>
        </tr>`;
    });
    
    view.innerHTML = `
      <div class="page-header">
        <div class="page-header-text">
          <h1>Cobrança Integrada (Boleto/Pix)</h1>
          <p class="page-subtitle">Emissão nativa sem depender de bancos externos</p>
        </div>
        <div class="page-header-actions">
          <button class="btn-primary" onclick="openModal('billingModal')">+ Nova Cobrança</button>
        </div>
      </div>
      
      <div class="grid-2col" style="margin-top:20px;">
        <div class="card">
            <div style="color:var(--text-muted); font-size:14px; margin-bottom:8px;">Total a Receber (Pendente)</div>
            <div style="font-size:32px; font-weight:bold; color:var(--warning);">R$ ${totalPendente.toLocaleString('pt-BR', {minimumFractionDigits:2})}</div>
        </div>
        <div class="card">
            <div style="color:var(--text-muted); font-size:14px; margin-bottom:8px;">Taxa de Inadimplência Simulada</div>
            <div style="font-size:32px; font-weight:bold; color:var(--danger);">8.5%</div>
        </div>
      </div>
      
      <div class="card" style="margin-top:20px;">
        <h3 class="card-title">Cobranças Emitidas</h3>
        <table class="data-table">
            <thead>
                <tr>
                    <th>Cliente</th>
                    <th>Valor</th>
                    <th>Tipo</th>
                    <th>Vencimento</th>
                    <th>Status</th>
                    <th>Ações</th>
                </tr>
            </thead>
            <tbody>${tbody}</tbody>
        </table>
      </div>
    `;
};

window.markBillingPaid = function(id) {
    const b = window.state.billings.find(x => x.id === id);
    if (!b) return;
    b.status = 'Pago';
    localStorage.setItem('maxcfo_billings', JSON.stringify(window.state.billings));
    
    // Auto-create transaction
    if (window.state.transactions) {
        window.state.transactions.push({
            id: 'tx-' + Date.now().toString(),
            type: 'RECEITA',
            date: new Date().toISOString().split("T")[0],
            desc: `Rec. Cobrança - ${b.cliente}`,
            category: 'Vendas',
            amount: b.valor
        });
        localStorage.setItem('maxcfo_transactions', JSON.stringify(window.state.transactions));
    }
    
    if (window.showToast) window.showToast('Cobrança recebida e contabilizada!', 'success');
    renderBilling();
};

window.submitBillingForm = function(e) {
    e.preventDefault();
    window.state.billings.push({
        id: Date.now().toString(),
        cliente: document.getElementById('bilCliente').value,
        valor: parseFloat(document.getElementById('bilValor').value),
        vencimento: document.getElementById('bilVenc').value,
        tipo: document.getElementById('bilTipo').value,
        status: 'Pendente'
    });
    localStorage.setItem('maxcfo_billings', JSON.stringify(window.state.billings));
    closeModal('billingModal');
    if (window.showToast) window.showToast('Cobrança emitida (via Open Finance)!', 'success');
    renderBilling();
};
