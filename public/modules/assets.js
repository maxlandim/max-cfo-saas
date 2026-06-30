/**
 * MAX CFO AI - Gestão de Ativos Module
 */

window.initAssetsModule = function() {
    if (!window.state) window.state = {};
    let assets = JSON.parse(localStorage.getItem('maxcfo_assets') || 'null');
    if (!assets) {
        assets = [
            { id: "1", nome: "Sede Corporativa", tipo: "Imóvel", valor: 2500000, vidaUtil: 25, aluguel: 15000, data: "2020-01-15" },
            { id: "2", nome: "Frota - Caminhão VW", tipo: "Veículo", valor: 450000, vidaUtil: 5, aluguel: 0, data: "2024-02-10" }
        ];
        localStorage.setItem('maxcfo_assets', JSON.stringify(assets));
    }
    window.state.assets = assets;
};

window.renderAssets = function() {
    const view = document.getElementById('view-assets');
    if (!view) return;
    
    let totalValor = 0;
    let totalDeprec = 0;
    let totalAluguel = 0;
    
    let tbody = '';
    window.state.assets.forEach(a => {
        totalValor += a.valor;
        totalAluguel += (a.aluguel || 0);
        
        const deprecMensal = a.valor / a.vidaUtil / 12;
        totalDeprec += deprecMensal;
        
        const mesesUso = Math.max(0, (new Date() - new Date(a.data)) / (1000 * 60 * 60 * 24 * 30));
        const acumulada = Math.min(a.valor, deprecMensal * mesesUso);
        const residual = Math.max(0, a.valor - acumulada);
        
        const roi = a.aluguel ? ((a.aluguel * 12) / a.valor * 100).toFixed(2) + '%' : 'N/A';
        
        let color = '#818cf8';
        if (a.tipo === 'Veículo') color = '#f59e0b';
        else if (a.tipo === 'Máquina') color = '#10b981';
        
        tbody += `
        <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
            <td>
                <div style="font-weight:bold; color:white;">${a.nome}</div>
                <div style="font-size:12px; color:${color};">${a.tipo}</div>
            </td>
            <td>R$ ${a.valor.toLocaleString('pt-BR', {minimumFractionDigits:2})}</td>
            <td><span style="color:var(--danger)">- R$ ${deprecMensal.toLocaleString('pt-BR', {minimumFractionDigits:2})}</span></td>
            <td>R$ ${residual.toLocaleString('pt-BR', {minimumFractionDigits:2})}</td>
            <td style="color:var(--success); font-weight:bold;">${roi}</td>
            <td>
                <button class="btn-ghost" style="padding:4px 8px; font-size:12px;" onclick="removeAsset('${a.id}')">Vender/Baixar</button>
            </td>
        </tr>`;
    });
    
    const roiMedio = totalAluguel > 0 ? ((totalAluguel * 12) / totalValor * 100).toFixed(2) + '%' : '0.00%';
    
    view.innerHTML = `
      <div class="page-header">
        <div class="page-header-text">
          <h1>Gestão de Ativos & Imobilizado</h1>
          <p class="page-subtitle">Controle de ROI imobiliário, depreciação e transferências (Real Estate)</p>
        </div>
        <div class="page-header-actions">
          <button class="btn-primary" onclick="openModalEl('assetModal')">+ Cadastrar Ativo</button>
        </div>
      </div>
      
      <div class="grid-3col" style="margin-top:20px;">
        <div class="card">
            <div style="color:var(--text-muted); font-size:14px; margin-bottom:8px;">Valor Total do Patrimônio</div>
            <div style="font-size:32px; font-weight:bold; color:white;">R$ ${totalValor.toLocaleString('pt-BR', {minimumFractionDigits:2})}</div>
        </div>
        <div class="card">
            <div style="color:var(--text-muted); font-size:14px; margin-bottom:8px;">Depreciação Mensal (Impacto DRE)</div>
            <div style="font-size:32px; font-weight:bold; color:var(--danger);">- R$ ${totalDeprec.toLocaleString('pt-BR', {minimumFractionDigits:2})}</div>
        </div>
        <div class="card">
            <div style="color:var(--text-muted); font-size:14px; margin-bottom:8px;">ROI Médio (Aluguéis)</div>
            <div style="font-size:32px; font-weight:bold; color:var(--success);">${roiMedio} a.a.</div>
        </div>
      </div>
      
      <div class="card" style="margin-top:20px;">
        <h3 class="card-title">Portfólio de Ativos</h3>
        <table class="data-table">
            <thead>
                <tr>
                    <th>Ativo / Categoria</th>
                    <th>Valor de Aquisição</th>
                    <th>Deprec. Mensal</th>
                    <th>Valor Residual Atual</th>
                    <th>ROI (Locação)</th>
                    <th>Ações</th>
                </tr>
            </thead>
            <tbody>${tbody}</tbody>
        </table>
      </div>
    `;
};

window.submitAsset = function(e) {
    e.preventDefault();
    window.state.assets.push({
        id: Date.now().toString(),
        nome: document.getElementById('assetName').value,
        tipo: document.getElementById('assetType').value,
        valor: parseFloat(document.getElementById('assetValue').value),
        vidaUtil: parseInt(document.getElementById('assetLife').value),
        aluguel: parseFloat(document.getElementById('assetRent').value) || 0,
        data: document.getElementById('assetDate').value
    });
    localStorage.setItem('maxcfo_assets', JSON.stringify(window.state.assets));
    closeModal('assetModal');
    if (window.showToast) window.showToast('Ativo imobilizado cadastrado!', 'success');
    renderAssets();
};

window.removeAsset = function(id) {
    if(!confirm('Realizar baixa deste ativo?')) return;
    window.state.assets = window.state.assets.filter(a => a.id !== id);
    localStorage.setItem('maxcfo_assets', JSON.stringify(window.state.assets));
    if (window.showToast) window.showToast('Ativo baixado.', 'success');
    renderAssets();
};
