/**
 * MAX CFO AI - Portal do Contador Module
 */

window.initAccountantModule = function() {};

window.renderAccountant = function() {
    const view = document.getElementById('view-accountant');
    if (!view) return;
    
    view.innerHTML = `
      <div class="page-header">
        <div class="page-header-text">
          <h1>Portal do Contador</h1>
          <p class="page-subtitle">Exportação OFX, Relatórios Fiscais e Integração Contábil (Domínio, Alterdata)</p>
        </div>
      </div>
      
      <div class="grid-2col" style="margin-top:20px;">
        <div class="card">
            <h3 class="card-title">Exportação de Lotes (OFX / Excel)</h3>
            <p style="color:var(--text-muted); font-size:14px; margin-bottom:16px;">Gere o pacote contábil mensal consolidado com 1 clique. Inclui notas fiscais, extratos e comprovantes.</p>
            
            <div class="form-grid">
                <div class="form-field">
                    <label class="form-label">Mês Referência</label>
                    <input type="month" class="form-input" value="2026-05">
                </div>
                <div class="form-field">
                    <label class="form-label">Formato</label>
                    <select class="form-input">
                        <option>OFX (Padrão Bancário)</option>
                        <option>XLSX (Excel)</option>
                        <option>CSV (Domínio Sistemas)</option>
                    </select>
                </div>
            </div>
            
            <button class="btn-primary" style="margin-top:16px; width:100%" onclick="window.showToast('Lote Contábil gerado e enviado para o email cadastrado!', 'success')">📦 Gerar e Enviar para o Contador</button>
        </div>
        
        <div class="card">
            <h3 class="card-title">Acesso Direto do Contador</h3>
            <p style="color:var(--text-muted); font-size:14px; margin-bottom:16px;">Seu contador pode acessar este ambiente remotamente sem permissão de edição (Apenas Leitura).</p>
            
            <div style="background:var(--bg-body); border:1px solid var(--border-color); padding:16px; border-radius:8px;">
                <div style="font-weight:bold; color:white;">Status da Conexão</div>
                <div style="color:var(--success); margin-top:4px; font-size:14px;">✅ Contador Integrado (Escritório XYZ)</div>
                <div style="font-size:12px; color:var(--text-muted); margin-top:8px;">Último acesso: Ontem às 15:42</div>
            </div>
            
            <button class="btn-ghost" style="margin-top:16px; width:100%" onclick="window.showToast('Convite reenviado!', 'info')">Reenviar Convite de Acesso</button>
        </div>
      </div>
    `;
};
