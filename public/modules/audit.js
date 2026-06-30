window.initAuditModule = function() {
    if (!window.state.auditLogs) {
        window.state.auditLogs = [];
    }

    // Global audit logger
    window.logAudit = function(action, module, details) {
        const user = localStorage.getItem('maxcfo_user');
        const userName = user ? JSON.parse(user).name : 'Usuário Desconhecido';
        
        window.state.auditLogs.unshift({
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            user: userName,
            action,
            module,
            details
        });

        // Keep only last 500 logs to save space
        if (window.state.auditLogs.length > 500) {
            window.state.auditLogs.length = 500;
        }

        // Persist will automatically trigger Firebase upload
        if (typeof window.persist === 'function') {
            window.persist();
        }
    };
};

window.renderAudit = function() {
    const view = document.getElementById('view-audit');
    if (!view) return;

    let html = `
    <div class="kpi-grid" style="margin-bottom:20px;">
        <div class="kpi-card">
            <div class="kpi-title">Registros no Log</div>
            <div class="kpi-value">${window.state.auditLogs?.length || 0}</div>
        </div>
        <div class="kpi-card" style="grid-column: span 3; background: rgba(197, 160, 89, 0.1); border-color: rgba(197, 160, 89, 0.3);">
            <div class="kpi-title" style="color: #C5A059;">Governança Ativa</div>
            <div style="font-size:14px; color: var(--text-muted); margin-top:10px;">
                Esta trilha é imutável. Todas as operações críticas são registradas com Carimbo de Tempo e Identificação do Usuário para compliance e auditoria externa.
            </div>
        </div>
    </div>

    <div class="card">
        <h2 style="margin-bottom: 20px;">Trilha de Auditoria (Audit Trail)</h2>
        <div class="table-responsive">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Data/Hora</th>
                        <th>Usuário</th>
                        <th>Ação</th>
                        <th>Módulo</th>
                        <th>Detalhes</th>
                    </tr>
                </thead>
                <tbody>
    `;

    const logs = window.state.auditLogs || [];

    if (logs.length === 0) {
        html += `<tr><td colspan="5" style="text-align:center;">Nenhum registro de auditoria encontrado.</td></tr>`;
    } else {
        logs.forEach(log => {
            const date = new Date(log.timestamp).toLocaleString('pt-BR');
            let actionColor = 'var(--text-color)';
            if (log.action.includes('CRIOU') || log.action.includes('ADICIONOU') || log.action.includes('EMITIU')) actionColor = 'var(--success)';
            if (log.action.includes('EDITOU') || log.action.includes('ATUALIZOU')) actionColor = '#F59E0B';
            if (log.action.includes('EXCLUIU') || log.action.includes('DELETOU')) actionColor = 'var(--danger)';

            html += `
                <tr>
                    <td style="font-family: monospace; font-size:12px; color:var(--text-muted)">${date}</td>
                    <td><strong>${log.user}</strong></td>
                    <td style="color: ${actionColor}; font-weight:bold; font-size:12px;">${log.action}</td>
                    <td><span style="background:var(--bg-surf); padding:4px 8px; border-radius:4px; font-size:11px;">${log.module}</span></td>
                    <td style="font-size:12px;">${log.details}</td>
                </tr>
            `;
        });
    }

    html += `
                </tbody>
            </table>
        </div>
    </div>
    `;

    view.innerHTML = html;
};
