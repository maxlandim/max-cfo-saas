/**
 * MAX CFO AI - Planos e Assinaturas Module (SaaS)
 */

window.initPlansModule = function() {
    if (!window.state) window.state = {};
    let assinaturas = JSON.parse(localStorage.getItem('maxcfo_assinaturas') || 'null');
    if (!assinaturas) {
        assinaturas = [
            { id: "1", cliente: "Tech Startup LLC", plano: "Pro Mensal", valor: 199, status: "Ativa", mrrmes: "2026-05" },
            { id: "2", cliente: "Agência Criativa", plano: "Enterprise", valor: 899, status: "Ativa", mrrmes: "2026-05" },
            { id: "3", cliente: "Consultoria XYZ", plano: "Pro Mensal", valor: 199, status: "Cancelada (Churn)", mrrmes: "2026-04" }
        ];
        localStorage.setItem('maxcfo_assinaturas', JSON.stringify(assinaturas));
    }
    window.state.assinaturas = assinaturas;
};

window.renderPlans = function() {
    const view = document.getElementById('view-plans');
    if (!view) return;
    
    let mrr = 0;
    let ativos = 0;
    let churn = 0;
    
    // Calcula CAC baseado no Marketing
    const mktDesp = window.state.transactions ? window.state.transactions.filter(t => t.category === 'Marketing e Publicidade').reduce((a, b) => a + b.amount, 0) : 0;
    
    let tbody = '';
    window.state.assinaturas.forEach(sub => {
        if (sub.status === 'Ativa') {
            mrr += sub.valor;
            ativos++;
        } else {
            churn++;
        }
        
        let statusStyle = sub.status === 'Ativa' ? 'background:rgba(16,185,129,0.1);color:#10b981' : 'background:rgba(239,68,68,0.1);color:#ef4444';
        
        tbody += `
        <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
            <td><div style="font-weight:bold; color:white;">${sub.cliente}</div></td>
            <td>${sub.plano}</td>
            <td style="font-weight:bold; color:var(--primary);">R$ ${sub.valor.toLocaleString('pt-BR', {minimumFractionDigits:2})}</td>
            <td><span class="chip" style="${statusStyle}">${sub.status}</span></td>
            <td>
                ${sub.status === 'Ativa' ? `<button class="btn-ghost" style="padding:4px 8px; font-size:12px; color:var(--danger);" onclick="cancelSubscription('${sub.id}')">Registrar Churn</button>` : ''}
            </td>
        </tr>`;
    });
    
    view.innerHTML = `
      <div class="page-header">
        <div class="page-header-text">
          <h1>Recorrência (SaaS / MRR)</h1>
          <p class="page-subtitle">Gestão de assinaturas, MRR, ARR e Churn Rate</p>
        </div>
        <div class="page-header-actions">
          <button class="btn-primary" onclick="openModal('planModal')">+ Nova Assinatura</button>
        </div>
      </div>
      
      <div class="grid-4col" style="margin-top:20px;">
        <div class="card fin-kpi">
            <div style="color:var(--text-muted); font-size:14px; margin-bottom:8px;">MRR (Receita Recorrente)</div>
            <div style="font-size:28px; font-weight:bold; color:var(--success);">R$ ${mrr.toLocaleString('pt-BR', {minimumFractionDigits:2})}</div>
            <div style="font-size:12px; color:var(--text-muted); margin-top:4px;">ARR: R$ ${(mrr * 12).toLocaleString('pt-BR')}</div>
        </div>
        <div class="card fin-kpi">
            <div style="color:var(--text-muted); font-size:14px; margin-bottom:8px;">Assinantes Ativos</div>
            <div style="font-size:28px; font-weight:bold; color:white;">${ativos}</div>
        </div>
        <div class="card fin-kpi">
            <div style="color:var(--text-muted); font-size:14px; margin-bottom:8px;">Taxa de Churn</div>
            <div style="font-size:28px; font-weight:bold; color:var(--danger);">${(churn / (ativos + churn || 1) * 100).toFixed(1)}%</div>
        </div>
        <div class="card fin-kpi">
            <div style="color:var(--text-muted); font-size:14px; margin-bottom:8px;">LTV / CAC</div>
            <div style="font-size:28px; font-weight:bold; color:var(--gold);">
               ${ativos > 0 ? 'R$ ' + ((mrr / ativos) * 24).toLocaleString('pt-BR', {maximumFractionDigits:0}) : 'R$ 0'}
            </div>
            <div style="font-size:12px; color:var(--text-muted); margin-top:4px;">CAC Est.: R$ ${(ativos > 0 ? mktDesp / ativos : 0).toLocaleString('pt-BR', {maximumFractionDigits:0})}</div>
        </div>
      </div>
      
      <div class="card" style="margin-top:20px;">
        <h3 class="card-title">Base de Clientes Recorrentes</h3>
        <table class="data-table">
            <thead>
                <tr>
                    <th>Cliente</th>
                    <th>Plano</th>
                    <th>Mensalidade (MRR)</th>
                    <th>Status</th>
                    <th>Ações</th>
                </tr>
            </thead>
            <tbody>${tbody}</tbody>
        </table>
      </div>
    `;
};

window.cancelSubscription = function(id) {
    if(!confirm('Registrar cancelamento (Churn)? A receita recorrente (MRR) vai cair.')) return;
    const sub = window.state.assinaturas.find(x => x.id === id);
    if(sub) {
        sub.status = 'Cancelada (Churn)';
        localStorage.setItem('maxcfo_assinaturas', JSON.stringify(window.state.assinaturas));
        if (window.showToast) window.showToast('Assinatura cancelada (Churn computado).', 'warning');
        renderPlans();
    }
};

window.submitPlanForm = function(e) {
    e.preventDefault();
    window.state.assinaturas.push({
        id: Date.now().toString(),
        cliente: document.getElementById('planCliente').value,
        plano: document.getElementById('planNome').value,
        valor: parseFloat(document.getElementById('planValor').value),
        status: 'Ativa',
        mrrmes: new Date().toISOString().substring(0, 7)
    });
    localStorage.setItem('maxcfo_assinaturas', JSON.stringify(window.state.assinaturas));
    closeModal('planModal');
    if (window.showToast) window.showToast('Assinatura adicionada (MRR +)!', 'success');
    renderPlans();
};
