/**
 * MAX CFO AI - Auditoria Tributária Module
 */

window.initTaxAuditModule = function() {};

window.renderTaxAudit = function() {
    const view = document.getElementById('view-tax-audit');
    if (!view) return;
    
    // Simulate rules engine on transactions
    let alerts = [];
    let score = 100;
    
    if (window.state && window.state.transactions) {
        window.state.transactions.forEach(t => {
            // Rule 1: Serviços > R$ 1000 sem NF (ISS)
            if (t.type === 'DESPESA' && t.amount > 1000 && t.category === 'Serviços' && !t.desc.toLowerCase().includes('iss')) {
                alerts.push({ id: t.id, level: 'critical', reg: 'Risco de Sonegação (Tomador)', desc: `Despesa de R$ ${t.amount} em Serviços sem retenção de ISS visível na descrição.` });
                score -= 15;
            }
            // Rule 2: NF > 5000 sem PIS/COFINS
            if (t.type === 'RECEITA' && t.amount > 5000 && !t.desc.toLowerCase().includes('pis') && !t.desc.toLowerCase().includes('cofins')) {
                alerts.push({ id: t.id, level: 'warning', reg: 'Retenção Federal', desc: `Receita alta (R$ ${t.amount}) sem registro explícito de retenção (CSRF).` });
                score -= 10;
            }
        });
    }
    
    if (alerts.length === 0) {
        alerts.push({ id: 'ok', level: 'info', reg: 'Auditoria Limpa', desc: 'Nenhuma inconformidade tributária grave encontrada nos lançamentos recentes.' });
    }
    
    score = Math.max(0, score);
    
    let html = `
      <div class="page-header">
        <div class="page-header-text">
          <h1>Auditoria Tributária IA</h1>
          <p class="page-subtitle">Varredura automática por riscos fiscais e sonegação passiva</p>
        </div>
        <div class="page-header-actions">
          <button class="btn-primary" onclick="renderTaxAudit()">Reescanear Base de Dados</button>
        </div>
      </div>
      
      <div class="grid-2col" style="margin-top:20px;">
        <div class="card" style="display:flex; flex-direction:column; align-items:center; justify-content:center;">
            <h3 class="card-title">Score de Compliance Fiscal</h3>
            <div style="position:relative; width:200px; height:100px; overflow:hidden; margin: 20px 0;">
                <svg viewBox="0 0 100 50" style="width:100%; height:100%; transform: rotate(180deg);">
                    <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#1f2937" stroke-width="15" />
                    <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="${score > 80 ? '#10b981' : score > 50 ? '#f59e0b' : '#ef4444'}" stroke-width="15" stroke-dasharray="125" stroke-dashoffset="${125 - (125 * score / 100)}" />
                </svg>
                <div style="position:absolute; bottom:0; left:0; right:0; text-align:center; transform:translateY(-10px);">
                    <span style="font-size:36px; font-weight:bold; color:white;">${score}</span><span style="font-size:14px; color:var(--text-muted)">/100</span>
                </div>
            </div>
            <p style="text-align:center; color:var(--text-muted); font-size:14px;">
                ${score > 80 ? 'Risco Baixo (Auditoria OK)' : score > 50 ? 'Risco Moderado (Atenção)' : 'Risco Crítico (Risco de Malha Fina)'}
            </p>
        </div>
        
        <div class="card">
            <h3 class="card-title">Log de Inconformidades</h3>
            <div style="max-height:300px; overflow-y:auto;">
    `;
    
    alerts.forEach(a => {
        const color = a.level === 'critical' ? 'var(--danger)' : a.level === 'warning' ? 'var(--warning)' : 'var(--success)';
        const icon = a.level === 'critical' ? '🚨' : a.level === 'warning' ? '⚠️' : '✅';
        html += `
            <div style="padding:12px; margin-bottom:8px; border-left:3px solid ${color}; background:rgba(255,255,255,0.02); border-radius:4px;">
                <div style="font-weight:bold; color:${color}; font-size:14px; margin-bottom:4px;">${icon} ${a.reg}</div>
                <div style="color:var(--text-muted); font-size:13px;">${a.desc}</div>
            </div>
        `;
    });
    
    html += `
            </div>
        </div>
      </div>
    `;
    view.innerHTML = html;
};
