/**
 * MAX CFO AI - Team & Workspaces Module
 */

window.initTeamModule = function() {
    if (!window.state) window.state = {};
    
    // Initialize state if empty
    let team = JSON.parse(localStorage.getItem('maxcfo_team') || 'null');
    if (!team) {
        team = [
            { id: "1", name: "João Silva", email: "joao@empresa.com", role: "Admin", permissions: ['dashboard', 'finance', 'crm', 'inventory', 'nfe', 'os'], lastLogin: new Date().toISOString() },
            { id: "2", name: "Maria Souza", email: "maria@empresa.com", role: "Operador", permissions: ['dashboard', 'finance'], lastLogin: new Date(Date.now() - 86400000).toISOString() },
            { id: "3", name: "Contabilidade Externo", email: "contato@contabilidade.com", role: "Contador (Read-Only)", permissions: ['finance', 'nfe'], lastLogin: new Date(Date.now() - 172800000).toISOString() }
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
        else if (member.role.includes('Contador') || member.role === 'Visualizador') roleStyle = 'background:rgba(245,158,11,0.1);color:#fbbf24';
        
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
        
        // Build permissions badges
        const perms = member.permissions || [];
        const permsHtml = perms.map(p => `<span style="font-size:10px; border: 1px solid rgba(255,255,255,0.2); border-radius: 4px; padding: 2px 4px; margin-right: 4px; display: inline-block; margin-top: 4px;">${p.toUpperCase()}</span>`).join('');
        
        html += `
        <tr>
            <td>
                <div style="font-weight:bold; color:white;">${member.name}</div>
                <div style="font-size:12px; color:var(--text-muted);">${member.email}</div>
            </td>
            <td>
                <span class="chip" style="${roleStyle}">${member.role}</span>
                <div style="margin-top: 4px;">${permsHtml}</div>
            </td>
            <td>${dateStr}</td>
            <td>
                <button class="btn-ghost" style="padding:4px 8px; font-size:12px; color: var(--primary);" onclick="window.openTeamModal('${member.id}')">Editar</button>
                <button class="btn-ghost" style="padding:4px 8px; font-size:12px; color: var(--danger);" onclick="window.removeTeamMember('${member.id}')">Remover</button>
            </td>
        </tr>`;
    });
    tbody.innerHTML = html;
    
    if (window.renderAuditTrail) window.renderAuditTrail();
};

window.renderAuditTrail = function() {
    const list = document.getElementById('auditTrailList');
    if (!list) return;
    
    const sorted = [...(window.state.audit || [])].sort((a, b) => new Date(b.time) - new Date(a.time));
    
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
    if (!window.state) window.state = {};
    if (!window.state.audit) window.state.audit = [];
    
    try {
        const u = JSON.parse(localStorage.getItem('maxcfo_user'));
        if (u && u.name) userName = u.name;
    } catch(e) {}
    
    window.state.audit.push({
        id: "a" + Date.now(),
        time: new Date().toISOString(),
        user: userName,
        action: action
    });
    localStorage.setItem('maxcfo_audit', JSON.stringify(window.state.audit));
    
    if (document.getElementById('view-team') && document.getElementById('view-team').classList.contains('active')) {
        if (window.renderAuditTrail) window.renderAuditTrail();
    }
};

window.openTeamModal = function(id = null) {
    const title = document.getElementById('teamModalTitle');
    const form = document.getElementById('teamForm');
    if (!form) return;
    
    form.reset();
    document.getElementById('tmId').value = '';
    
    const checkboxes = document.querySelectorAll('.perm-checkbox');
    checkboxes.forEach(cb => cb.checked = ['dashboard', 'finance'].includes(cb.value));
    
    if (id) {
        if (title) title.innerText = "✏️ Editar Membro";
        document.getElementById('btnTeamSubmit').innerText = "Salvar Alterações";
        
        const member = window.state.team.find(m => m.id === id);
        if (member) {
            document.getElementById('tmId').value = member.id;
            document.getElementById('tmNome').value = member.name || '';
            document.getElementById('tmEmail').value = member.email || '';
            document.getElementById('tmRole').value = member.role || 'Operador';
            
            const perms = member.permissions || [];
            checkboxes.forEach(cb => {
                cb.checked = perms.includes(cb.value);
            });
        }
    } else {
        if (title) title.innerText = "👤 Convidar Membro";
        document.getElementById('btnTeamSubmit').innerText = "Enviar Convite";
    }
    
    if (window.openModal) window.openModal('teamModal');
};

window.submitTeamMember = function(e) {
    e.preventDefault();
    const id = document.getElementById('tmId').value;
    const name = document.getElementById('tmNome').value;
    const email = document.getElementById('tmEmail').value;
    const role = document.getElementById('tmRole').value;
    
    const checkboxes = document.querySelectorAll('.perm-checkbox');
    const permissions = [];
    checkboxes.forEach(cb => {
        if (cb.checked) permissions.push(cb.value);
    });
    
    if (id) {
        // Edit mode
        const index = window.state.team.findIndex(m => m.id === id);
        if (index >= 0) {
            window.state.team[index].name = name;
            window.state.team[index].email = email;
            window.state.team[index].role = role;
            window.state.team[index].permissions = permissions;
            window.addAuditEntry(`atualizou as permissões do usuário ${name}`);
            if (window.showToast) window.showToast('Usuário atualizado com sucesso', 'success');
        }
    } else {
        // Create mode
        const newMember = {
            id: Date.now().toString(),
            name,
            email,
            role,
            permissions,
            lastLogin: null
        };
        window.state.team.push(newMember);
        window.addAuditEntry(`adicionou o usuário ${name} (${role})`);
        if (window.showToast) window.showToast('Usuário adicionado com sucesso', 'success');
    }
    
    localStorage.setItem('maxcfo_team', JSON.stringify(window.state.team));
    
    if (window.closeModal) window.closeModal('teamModal');
    document.getElementById('teamForm').reset();
    renderTeam();
};

window.removeTeamMember = function(id) {
    if (!confirm('Tem certeza que deseja remover este usuário permanentemente?')) return;
    
    const member = window.state.team.find(m => m.id === id);
    if (!member) return;
    
    window.state.team = window.state.team.filter(m => m.id !== id);
    localStorage.setItem('maxcfo_team', JSON.stringify(window.state.team));
    
    window.addAuditEntry(`removeu o usuário ${member.name}`);
    
    if (window.showToast) window.showToast('Usuário removido', 'success');
    renderTeam();
};
