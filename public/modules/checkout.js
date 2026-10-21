/**
 * MAX CFO AI - Checkout & Links de Pagamento Module
 */

window.initCheckoutModule = function() {
    if (!window.state) window.state = {};
    // Os dados vêm da nuvem (Firestore). Sem exemplos inventados.
    window.state.checkouts = Array.isArray(window.state.checkouts) ? window.state.checkouts : [];
};

window.renderCheckout = function() {
    const view = document.getElementById('view-checkout');
    if (!view) return;
    
    let tbody = '';
    window.state.checkouts.forEach(c => {
        let statusStyle = 'background:rgba(16,185,129,0.1);color:#10b981'; // Ativo
        
        tbody += `
        <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
            <td><div style="font-weight:bold; color:white;">${c.titulo}</div></td>
            <td>R$ ${c.valor.toLocaleString('pt-BR', {minimumFractionDigits:2})}</td>
            <td>${c.metodos}</td>
            <td><a href="#" style="color:var(--primary); text-decoration:underline;" onclick="window.showToast('Link copiado!', 'info')">${c.link}</a></td>
            <td><span class="chip" style="${statusStyle}">${c.status}</span></td>
            <td>
                <button class="btn-ghost" style="padding:4px 8px; font-size:12px; color:var(--danger);" onclick="deleteCheckout('${c.id}')">Excluir</button>
            </td>
        </tr>`;
    });
    
    view.innerHTML = `
      <div class="page-header">
        <div class="page-header-text">
          <h1>Links de Pagamento Inteligentes</h1>
          <p class="page-subtitle">Venda rápida por WhatsApp ou Instagram (Stripe/Pix nativo)</p>
        </div>
        <div class="page-header-actions">
          <button class="btn-primary" onclick="openModalEl('checkoutModal')">+ Novo Link</button>
        </div>
      </div>
      
      <div class="card" style="margin-top:20px;">
        <h3 class="card-title">Links Ativos</h3>
        <table class="data-table">
            <thead>
                <tr>
                    <th>Produto / Titulo</th>
                    <th>Valor</th>
                    <th>Métodos Permitidos</th>
                    <th>Link (URL)</th>
                    <th>Status</th>
                    <th>Ações</th>
                </tr>
            </thead>
            <tbody>${tbody}</tbody>
        </table>
      </div>
    `;
};

window.deleteCheckout = function(id) {
    if(!confirm('Excluir este link?')) return;
    window.state.checkouts = window.state.checkouts.filter(x => x.id !== id);
    if (window.persist) window.persist();
    renderCheckout();
};

window.submitCheckoutForm = function(e) {
    e.preventDefault();
    const hash = Math.random().toString(36).substring(2, 8);
    window.state.checkouts.push({
        id: Date.now().toString(),
        titulo: document.getElementById('chkTitulo').value,
        valor: parseFloat(document.getElementById('chkValor').value),
        metodos: "Pix / Cartão",
        status: 'Ativo',
        link: `https://pay.maxcfo.ai/c/${hash}`
    });
    if (window.persist) window.persist();
    closeModal('checkoutModal');
    if (window.showToast) window.showToast('Link de pagamento criado e pronto para copiar!', 'success');
    renderCheckout();
};
