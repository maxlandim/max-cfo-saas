/**
 * MAX CFO AI - Team & Workspaces Module
 */

window.initTeamModule = function() {
    if (!window.state) window.state = {};
    
    // Initialize state if empty
    let team = JSON.parse(localStorage.getItem('maxcfo_team') || 'null');
    if (!team) {
        team = [
            { id: "1", name: "João Silva", email: "joao@empresa.com", role: "Admin", lastLogin: new Date().toISOString() },
            { id: "2", name: "Maria Souza", email: "maria@empresa.com", role: "Operador", lastLogin: new Date(Date.now() - 86400000).toISOString() },
            { id: "3", name: "Contabilidade Externo", email: "contato@contabilidade.com", role: "Contador (Read-Only)", lastLogin: new Date(Date.now() - 172800000).toISOString() }
        ];
        localStorage.setItem('maxcfo_team', JSON.stringify(team));
    }
    window.state.team = team;
    
    let audit = JSON.parse(localStorage.getItem('maxcfo_audit') || 'null');
    if (!audit) {
        audit = [
            { id: "a1", time: new Date().toISOString(), user: "João Silva", action: "aprovou pagamento de R$ 5.000,00" },
            { id: "a2", time: new Date(Date.now() - 3600000).toISOString(), user: "Maria Souza", action: "cadastrou nota de despesa" },
            { id: "a3", time: new Date(Date.now() - 7200000).toISOString(), user: "João Silva", action: "alterou permissões do contador" }
        ];
        localStorage.setItem('maxcfo_audit', JSON.stringify(audit));
    }
    window.state.audit = audit;
};

window.renderTeam = function() {
    const tbody = document.getElementById('teamTableBody');
    if (!tbody) return;
    
    let html = '';
    window.state.team.forEach(member => {
        let roleStyle = 'background:rgba(99,102,241,0.1);color:#818cf8';
        if (member.role === 'Operador') roleStyle = 'background:rgba(16,185,129,0.1);color:#34d399';
        else if (member.role.includes('Contador')) roleStyle = 'background:rgba(245,158,11,0.1);color:#fbbf24';
        
        let dateStr = 'Nunca';
        if (member.lastLogin) {
            const d = new Date(member.lastLogin);
            const now = new Date();
            const diff = now - d;
            if (diff < 3600000) dateStr = 'Agora';
            else if (diff < 86400000) dateStr = 'Hoje';
            else if (diff < 172800000) dateStr = 'Ontem';
            else dateStr = window.fmtDate ? window.fmtDate(member.lastLogin.split('T')[0]) : member.lastLogin.split('T')[0];
        }
        
        html += `
        <tr>
            <td>
                <div style="font-weight:bold; color:white;">${member.name}</div>
                <div style="font-size:12px; color:var(--text-muted);">${member.email}</div>
            </td>
            <td><span class="chip" style="${roleStyle}">${member.role}</span></td>
            <td>${dateStr}</td>
            <td>
                <button class="btn-ghost" style="padding:4px 8px; font-size:12px;" onclick="removeTeamMember('${member.id}')">Remover</button>
            </td>
        </tr>`;
    });
    tbody.innerHTML = html;
    
    renderAuditTrail();
};

window.renderAuditTrail = function() {
    const list = document.getElementById('auditTrailList');
    if (!list) return;
    
    // Sort descending by time
    const sorted = [...window.state.audit].sort((a, b) => new Date(b.time) - new Date(a.time));
    
    let html = '';
    sorted.slice(0, 50).forEach(entry => {
        const d = new Date(entry.time);
        const timeStr = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth()+1).toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
        
        html += `
        <div style="padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.05);">
            <span style="color:var(--text-muted); font-size:12px;">${timeStr}</span> - 
            <b style="color:white;">${entry.user}</b> ${entry.action}
        </div>`;
    });
    list.innerHTML = html;
};

window.addAuditEntry = function(action, userName = "Sistema") {
    if (!window.state || !window.state.audit) return;
    window.state.audit.push({
        id: "a" + Date.now(),
        time: new Date().toISOString(),
        user: userName,
        action: action
    });
    localStorage.setItem('maxcfo_audit', JSON.stringify(window.state.audit));
    
    if (document.getElementById('view-team') && document.getElementById('view-team').classList.contains('active')) {
        renderAuditTrail();
    }
};

window.openTeamModal = function() {
    if (window.openModal) window.openModal('teamModal');
};

window.submitTeamMember = function(e) {
    e.preventDefault();
    const name = document.getElementById('teamName').value;
    const email = document.getElementById('teamEmail').value;
    const role = document.getElementById('teamRole').value;
    const cpf = document.getElementById('teamCPF').value;
    
    // Very basic CPF check just for show
    if (cpf && cpf.replace(/\D/g, '').length !== 11) {
        if (window.showToast) window.showToast('CPF Inválido', 'error');
        return;
    }
    
    const newMember = {
        id: Date.now().toString(),
        name,
        email,
        role,
        lastLogin: null
    };
    
    window.state.team.push(newMember);
    localStorage.setItem('maxcfo_team', JSON.stringify(window.state.team));
    
    window.addAuditEntry(`adicionou o usuário ${name} (${role})`);
    
    if (window.closeModal) window.closeModal('teamModal');
    if (window.showToast) window.showToast('Usuário adicionado com sucesso', 'success');
    
    document.getElementById('teamForm').reset();
    renderTeam();
};

window.removeTeamMember = function(id) {
    if (!confirm('Tem certeza que deseja remover este usuário?')) return;
    
    const member = window.state.team.find(m => m.id === id);
    if (!member) return;
    
    window.state.team = window.state.team.filter(m => m.id !== id);
    localStorage.setItem('maxcfo_team', JSON.stringify(window.state.team));
    
    window.addAuditEntry(`removeu o usuário ${member.name}`);
    
    if (window.showToast) window.showToast('Usuário removido', 'success');
    renderTeam();
};
