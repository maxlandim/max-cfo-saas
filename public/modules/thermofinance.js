/**
 * MAX CFO AI - Termofinança IA Module
 */

window.initThermofinanceModule = function() {};

window.renderThermofinance = function() {
    const view = document.getElementById('view-thermo');
    if (!view) return;
    
    // Simulate entropy and macro
    const selic = 10.50;
    const ipca = 4.50;
    const entropia = 0.42; // 0 (stable) to 1 (chaotic)
    
    const isStable = entropia < 0.5;
    
    let html = `
      <div class="page-header">
        <div class="page-header-text">
          <h1>Termofinança & Inteligência Macro</h1>
          <p class="page-subtitle">Motor IA: Correlação do seu balanço com a economia global</p>
        </div>
        <div class="page-header-actions">
          <button class="btn-primary" onclick="window.renderThermofinance()">Recalcular Entropia</button>
        </div>
      </div>
      
      <div class="grid-3col" style="margin-top:20px;">
        <div class="card">
            <div style="color:var(--text-muted); font-size:14px; margin-bottom:8px;">Entropia Financeira (Volatilidade)</div>
            <div style="font-size:32px; font-weight:bold; color:${isStable ? 'var(--success)' : 'var(--danger)'};">${(entropia*100).toFixed(1)}%</div>
            <div style="font-size:12px; color:var(--text-muted); margin-top:4px;">Mede o quão caótico é o fluxo de caixa.</div>
        </div>
        <div class="card">
            <div style="color:var(--text-muted); font-size:14px; margin-bottom:8px;">Taxa Selic Atual (Macro)</div>
            <div style="font-size:32px; font-weight:bold; color:var(--warning);">${selic.toFixed(2)}% a.a.</div>
            <div style="font-size:12px; color:var(--text-muted); margin-top:4px;">Custo de oportunidade e alavancagem.</div>
        </div>
        <div class="card">
            <div style="color:var(--text-muted); font-size:14px; margin-bottom:8px;">IPCA Projetado (Inflação)</div>
            <div style="font-size:32px; font-weight:bold; color:var(--danger);">${ipca.toFixed(2)}% a.a.</div>
            <div style="font-size:12px; color:var(--text-muted); margin-top:4px;">Corrosão do poder de compra corporativo.</div>
        </div>
      </div>
      
      <div class="grid-2col" style="margin-top:20px;">
          <div class="card">
            <h3 class="card-title">Oráculo: Radar de Fundamentos</h3>
            <div style="display:flex; justify-content:center; padding: 20px;">
                <canvas id="thermoRadarChart" width="300" height="300"></canvas>
            </div>
          </div>
          <div class="card">
            <h3 class="card-title">Recomendações Termodinâmicas da IA</h3>
            
            <div style="background:var(--bg-body); padding:16px; border-radius:8px; border:1px solid var(--border-color); margin-bottom:12px;">
                <h4 style="color:var(--primary); margin:0 0 8px 0; font-size:14px;">🧠 Tese de Alavancagem</h4>
                <p style="color:var(--text-muted); font-size:13px; margin:0; line-height:1.5;">
                    Sua Entropia de ${ (entropia*100).toFixed(1) }% indica ${isStable ? 'estabilidade excelente' : 'alta instabilidade'}. 
                    Com a Selic a ${selic}%, ${isStable ? 'seu caixa suporta a tomada de crédito para expansão estrutural.' : 'é **proibitivo** tomar crédito agora. Foque em gerar caixa operacional e reduzir estoques.'}
                </p>
            </div>
            
            <div style="background:var(--bg-body); padding:16px; border-radius:8px; border:1px solid var(--border-color);">
                <h4 style="color:var(--gold); margin:0 0 8px 0; font-size:14px;">🛡️ Tese de Proteção (Hedge)</h4>
                <p style="color:var(--text-muted); font-size:13px; margin:0; line-height:1.5;">
                    Com a inflação projetada em ${ipca}%, seu dinheiro parado em caixa está perdendo valor. 
                    Recomendação: Aplicar o saldo ocioso (estimado R$ ${window.state?.saldo?.toLocaleString('pt-BR') || '0,00'}) em ativos indexados à inflação (IPCA+) ou fundos de liquidez imediata com rendimento a 100% do CDI.
                </p>
            </div>
          </div>
      </div>
    `;
    
    view.innerHTML = html;
    
    // Draw radar chart manually on canvas
    setTimeout(() => {
        const canvas = document.getElementById('thermoRadarChart');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            const cw = canvas.width;
            const ch = canvas.height;
            const cx = cw/2;
            const cy = ch/2;
            const radius = 100;
            
            // Background web
            ctx.strokeStyle = '#374151'; // border-color
            ctx.lineWidth = 1;
            
            for (let i = 1; i <= 5; i++) {
                const r = radius * (i/5);
                ctx.beginPath();
                for (let j = 0; j < 5; j++) {
                    const angle = (Math.PI * 2 * j / 5) - Math.PI/2;
                    ctx[j===0?'moveTo':'lineTo'](cx + Math.cos(angle)*r, cy + Math.sin(angle)*r);
                }
                ctx.closePath();
                ctx.stroke();
            }
            
            // Labels
            const labels = ['Liquidez', 'Rentabilidade', 'Diversificação', 'Estabilidade', 'Crescimento'];
            ctx.fillStyle = '#9ca3af';
            ctx.font = '12px Inter';
            ctx.textAlign = 'center';
            for (let j = 0; j < 5; j++) {
                const angle = (Math.PI * 2 * j / 5) - Math.PI/2;
                const lx = cx + Math.cos(angle)*(radius+25);
                const ly = cy + Math.sin(angle)*(radius+25);
                ctx.fillText(labels[j], lx, ly+4);
            }
            
            // Data poly
            const values = [0.8, 0.6, 0.9, 0.7, 0.5]; // mock
            ctx.fillStyle = 'rgba(129, 140, 248, 0.3)'; // primary with alpha
            ctx.strokeStyle = '#818cf8';
            ctx.lineWidth = 2;
            ctx.beginPath();
            for (let j = 0; j < 5; j++) {
                const angle = (Math.PI * 2 * j / 5) - Math.PI/2;
                const r = radius * values[j];
                ctx[j===0?'moveTo':'lineTo'](cx + Math.cos(angle)*r, cy + Math.sin(angle)*r);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }
    }, 100);
};
