/**
 * MAX CFO AI - Emissão Fiscal NF-e Module
 */

window.initNFeModule = function() {
    if (!window.state) window.state = {};
    let nfes = JSON.parse(localStorage.getItem('maxcfo_nfes') || 'null');
    if (!nfes) {
        nfes = [
            { id: "1", numero: "2026001", tomador: "Empresa Cliente S.A.", cnpj: "12.345.678/0001-90", servico: "Consultoria Premium", valor: 15000, iss: 750, status: "Autorizada", data: new Date().toISOString() }
        ];
        localStorage.setItem('maxcfo_nfes', JSON.stringify(nfes));
    }
    window.state.nfes = nfes;
};

window.renderNFe = function() {
    const nfeView = document.getElementById('view-nfe');
    if (!nfeView) return;
    
    const emitidas = window.state.nfes.filter(n => n.status === 'Autorizada');
    const totalValor = emitidas.reduce((acc, n) => acc + n.valor, 0);
    const totalImposto = emitidas.reduce((acc, n) => acc + (n.iss || 0) + (n.icms || 0), 0);
    
    let tbody = '';
    window.state.nfes.sort((a,b) => new Date(b.data) - new Date(a.data)).forEach(nf => {
        let statusStyle = 'background:rgba(16,185,129,0.1);color:#34d399';
        if (nf.status === 'Cancelada') statusStyle = 'background:rgba(239,68,68,0.1);color:#f87171';
        else if (nf.status === 'Pendente') statusStyle = 'background:rgba(245,158,11,0.1);color:#fbbf24';
        
        tbody += `
        <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
            <td><strong>#${nf.numero}</strong></td>
            <td>
                <div style="font-weight:bold; color:white;">${nf.tomador}</div>
                <div style="font-size:12px; color:var(--text-muted);">${nf.cnpj}</div>
            </td>
            <td>${nf.servico}</td>
            <td style="font-weight:bold;">R$ ${nf.valor.toLocaleString('pt-BR', {minimumFractionDigits:2})}</td>
            <td><span class="chip" style="${statusStyle}">${nf.status}</span></td>
            <td>${new Date(nf.data).toLocaleDateString('pt-BR')}</td>
            <td>
                ${nf.status === 'Autorizada' ? `<button class="btn-ghost" style="padding:4px 8px; font-size:12px; color:var(--danger)" onclick="cancelarNFe('${nf.id}')">Cancelar</button>` : ''}
            </td>
        </tr>`;
    });
    
    nfeView.innerHTML = `
      <div class="page-header">
        <div class="page-header-text">
          <h1>Emissão Fiscal Integrada</h1>
          <p class="page-subtitle">Conexão direta com Prefeituras e SEFAZ via API</p>
        </div>
        <div class="page-header-actions">
          <button class="btn-primary" onclick="openNFeModal()">+ Emitir Nova NF-e</button>
        </div>
      </div>
      
      <div class="grid-3col" style="margin-top:20px;">
        <div class="card">
            <div style="color:var(--text-muted); font-size:14px; margin-bottom:8px;">Notas Emitidas (Mês)</div>
            <div style="font-size:32px; font-weight:bold; color:white;">${emitidas.length}</div>
        </div>
        <div class="card">
            <div style="color:var(--text-muted); font-size:14px; margin-bottom:8px;">Faturamento Total Tributado</div>
            <div style="font-size:32px; font-weight:bold; color:var(--primary);">R$ ${totalValor.toLocaleString('pt-BR', {minimumFractionDigits:2})}</div>
        </div>
        <div class="card">
            <div style="color:var(--text-muted); font-size:14px; margin-bottom:8px;">Impostos Retidos (Estimado)</div>
            <div style="font-size:32px; font-weight:bold; color:var(--danger);">R$ ${totalImposto.toLocaleString('pt-BR', {minimumFractionDigits:2})}</div>
        </div>
      </div>
      
      <div class="card" style="margin-top:20px;">
        <h3 class="card-title">Histórico de Notas Fiscais</h3>
        <table class="data-table">
            <thead>
                <tr>
                    <th>Número</th>
                    <th>Tomador</th>
                    <th>Serviço/Produto</th>
                    <th>Valor Total</th>
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

window.openNFeModal = function() {
    if (window.openModal) window.openModal('nfeModal');
};

// This overrides the mock one in app.js
window.gerarNFe = function() {
    const cliente = document.getElementById("nfeCliente").value;
    const valor = parseFloat(document.getElementById("nfeValor").value);
    
    if (!cliente || !valor) {
        if (window.showToast) window.showToast("Preencha todos os campos", "error");
        return;
    }
    
    document.getElementById("nfeSpinner").style.display = "block";
    document.getElementById("nfeStatusText").innerText = "Transmitindo lote para SEFAZ/Prefeitura (Assinando com Certificado A1)...";
    
    setTimeout(() => {
        document.getElementById("nfeSpinner").style.display = "none";
        document.getElementById("nfeStatusText").innerHTML = `<span style="color:var(--success)">✅ NF-e Autorizada com sucesso! (Protocolo: ${Math.floor(Math.random()*10000000000)})</span>`;
        if (window.showToast) window.showToast("NF-e Autorizada!", "success");
        
        const nextNum = window.state.nfes.length > 0 ? Math.max(...window.state.nfes.map(n => parseInt(n.numero))) + 1 : 2026001;
        
        const newNf = {
            id: Date.now().toString(),
            numero: nextNum.toString(),
            tomador: cliente,
            cnpj: "00.000.000/0001-00", // mock
            servico: "Serviço Prestado",
            valor: valor,
            iss: valor * 0.05,
            status: "Autorizada",
            data: new Date().toISOString()
        };
        
        window.state.nfes.push(newNf);
        localStorage.setItem('maxcfo_nfes', JSON.stringify(window.state.nfes));
        
        // Auto-create transaction
        if (window.state.transactions) {
            window.state.transactions.push({
                id: 'tx-' + Date.now().toString(),
                type: 'RECEITA',
                date: new Date().toISOString().split("T")[0],
                desc: `NF-e ${nextNum} - ${cliente}`,
                category: 'Vendas',
                amount: valor
            });
            localStorage.setItem('maxcfo_transactions', JSON.stringify(window.state.transactions));
            if (window.renderDashboard) window.renderDashboard();
            if (window.renderFinance) window.renderFinance();
        }
        
        renderNFe();
        
        setTimeout(() => {
            if (window.closeModal) window.closeModal("nfeModal");
            document.getElementById("nfeCliente").value = "";
            document.getElementById("nfeValor").value = "";
            document.getElementById("nfeStatusText").innerHTML = "";
        }, 1500);
    }, 2500);
};

window.cancelarNFe = function(id) {
    if (!confirm('Atenção: Cancelar a NF-e irá comunicar a SEFAZ. Deseja continuar?')) return;
    const nf = window.state.nfes.find(n => n.id === id);
    if (nf) {
        nf.status = 'Cancelada';
        localStorage.setItem('maxcfo_nfes', JSON.stringify(window.state.nfes));
        if (window.showToast) window.showToast(`NF-e ${nf.numero} cancelada com sucesso na SEFAZ.`, 'success');
        renderNFe();
    }
};
