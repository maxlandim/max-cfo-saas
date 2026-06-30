// Módulo de Ordem de Serviço (OS)

if (!window.state.os) {
  window.state.os = [];
}

function initOS() {
  const container = document.getElementById('view-os');
  if (!container) return;

  container.innerHTML = `
    <div class="page-header">
      <div class="page-header-text">
        <h1>Ordem de Serviço (OS)</h1>
        <p class="page-subtitle">Gerencie serviços, atendimentos e gere faturamentos.</p>
      </div>
      <div class="page-header-actions">
        <button class="btn-primary" onclick="openOSModal()">+ Nova OS</button>
      </div>
    </div>

    <!-- Kanban Board para OS -->
    <div class="kanban-board" id="os-board" style="display:flex;gap:20px;overflow-x:auto;padding-top:20px;min-height:400px;">
      
      <!-- Coluna: Pendente -->
      <div class="kanban-col" style="flex: 0 0 300px; background: rgba(255,255,255,0.02); border-radius: 12px; padding: 16px;">
        <h3 style="color:#f59e0b; margin-bottom:12px; font-size:14px; text-transform:uppercase; font-weight:600;">Pendente</h3>
        <div id="os-col-pending" style="min-height: 100px;"></div>
      </div>

      <!-- Coluna: Em Andamento -->
      <div class="kanban-col" style="flex: 0 0 300px; background: rgba(255,255,255,0.02); border-radius: 12px; padding: 16px;">
        <h3 style="color:#3b82f6; margin-bottom:12px; font-size:14px; text-transform:uppercase; font-weight:600;">Em Andamento</h3>
        <div id="os-col-progress" style="min-height: 100px;"></div>
      </div>

      <!-- Coluna: Concluído -->
      <div class="kanban-col" style="flex: 0 0 300px; background: rgba(255,255,255,0.02); border-radius: 12px; padding: 16px;">
        <h3 style="color:#10b981; margin-bottom:12px; font-size:14px; text-transform:uppercase; font-weight:600;">Concluído</h3>
        <div id="os-col-done" style="min-height: 100px;"></div>
      </div>

      <!-- Coluna: Faturado -->
      <div class="kanban-col" style="flex: 0 0 300px; background: rgba(255,255,255,0.02); border-radius: 12px; padding: 16px;">
        <h3 style="color:#8b5cf6; margin-bottom:12px; font-size:14px; text-transform:uppercase; font-weight:600;">Faturado</h3>
        <div id="os-col-billed" style="min-height: 100px;"></div>
      </div>

    </div>

    <!-- Modal Nova/Editar OS -->
    <div id="osModal" class="modal-overlay">
      <div class="modal">
        <div class="modal-header">
          <h2 id="osModalTitle">Nova Ordem de Serviço</h2>
          <button class="modal-close" onclick="closeOSModal()">×</button>
        </div>
        <div class="modal-body">
          <input type="hidden" id="osEditId">
          <div class="form-group">
            <label>Cliente / Empresa</label>
            <input type="text" id="osClient" class="form-input" placeholder="Ex: Acme Corp">
          </div>
          <div class="form-group">
            <label>Descrição do Serviço</label>
            <textarea id="osDesc" class="form-input" placeholder="Detalhes da OS..."></textarea>
          </div>
          <div class="grid-2col">
            <div class="form-group">
              <label>Valor Estimado (R$)</label>
              <input type="number" id="osValue" class="form-input" placeholder="0.00">
            </div>
            <div class="form-group">
              <label>Data Prevista</label>
              <input type="date" id="osDate" class="form-input">
            </div>
          </div>
          <div class="form-group">
            <label>Status</label>
            <select id="osStatus" class="form-input">
              <option value="pending">Pendente</option>
              <option value="progress">Em Andamento</option>
              <option value="done">Concluído</option>
              <option value="billed">Faturado</option>
            </select>
          </div>
          <button class="btn-primary" style="width:100%" onclick="saveOS()">Salvar Ordem de Serviço</button>
        </div>
      </div>
    </div>
  `;

  renderOSBoard();
}

function renderOSBoard() {
  const cols = {
    pending: document.getElementById('os-col-pending'),
    progress: document.getElementById('os-col-progress'),
    done: document.getElementById('os-col-done'),
    billed: document.getElementById('os-col-billed')
  };

  // Clear columns
  Object.values(cols).forEach(col => col && (col.innerHTML = ''));

  const osList = window.state.os || [];

  osList.forEach(os => {
    const card = document.createElement('div');
    card.className = 'card';
    card.style.marginBottom = '12px';
    card.style.padding = '12px';
    card.style.cursor = 'pointer';
    card.onclick = () => editOS(os.id);

    card.innerHTML = `
      <div style="font-weight:600; margin-bottom:4px;">${os.client}</div>
      <div style="font-size:12px; color:var(--text-muted); margin-bottom:8px;">${os.desc}</div>
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span style="color:var(--gold); font-weight:bold;">${window.fmt(os.value || 0)}</span>
        <span style="font-size:11px; color:var(--text-muted);">${window.fmtDate(os.date)}</span>
      </div>
      <div style="margin-top:8px; display:flex; gap:6px;">
        <button class="btn-secondary" style="padding:4px 8px; font-size:11px;" onclick="event.stopPropagation(); window.advanceOS('${os.id}')">Avançar →</button>
        ${os.status === 'done' ? `<button class="btn-primary" style="padding:4px 8px; font-size:11px;" onclick="event.stopPropagation(); window.faturarOS('${os.id}')">Faturar</button>` : ''}
      </div>
    `;

    if (cols[os.status]) cols[os.status].appendChild(card);
  });
}

window.openOSModal = function() {
  document.getElementById('osEditId').value = '';
  document.getElementById('osClient').value = '';
  document.getElementById('osDesc').value = '';
  document.getElementById('osValue').value = '';
  document.getElementById('osDate').value = new Date().toISOString().split('T')[0];
  document.getElementById('osStatus').value = 'pending';
  document.getElementById('osModalTitle').innerText = 'Nova Ordem de Serviço';
  document.getElementById('osModal').classList.add('active');
};

window.closeOSModal = function() {
  document.getElementById('osModal').classList.remove('active');
};

function editOS(id) {
  const os = window.state.os.find(o => o.id === id);
  if(!os) return;
  document.getElementById('osEditId').value = os.id;
  document.getElementById('osClient').value = os.client;
  document.getElementById('osDesc').value = os.desc;
  document.getElementById('osValue').value = os.value;
  document.getElementById('osDate').value = os.date;
  document.getElementById('osStatus').value = os.status;
  document.getElementById('osModalTitle').innerText = 'Editar Ordem de Serviço';
  document.getElementById('osModal').classList.add('active');
}

window.saveOS = function() {
  const id = document.getElementById('osEditId').value;
  const client = document.getElementById('osClient').value.trim();
  const desc = document.getElementById('osDesc').value.trim();
  const value = parseFloat(document.getElementById('osValue').value) || 0;
  const date = document.getElementById('osDate').value;
  const status = document.getElementById('osStatus').value;

  if(!client || !desc) {
    return window.showToast('Preencha cliente e descrição', 'error');
  }

  if(!window.state.os) window.state.os = [];

  if (id) {
    const idx = window.state.os.findIndex(o => o.id === id);
    if(idx > -1) {
      const oldOs = {...window.state.os[idx]};
      window.state.os[idx] = { ...window.state.os[idx], client, desc, value, date, status };
      if(window.logAudit) window.logAudit('update', 'os', id, `OS de ${client} atualizada`, oldOs, window.state.os[idx]);
    }
  } else {
    const newOS = { id: window.genId(), client, desc, value, date, status, createdAt: new Date().toISOString() };
    window.state.os.push(newOS);
    if(window.logAudit) window.logAudit('create', 'os', newOS.id, `OS de ${client} criada`, null, newOS);
  }

  window.persist();
  closeOSModal();
  renderOSBoard();
  window.showToast('OS salva com sucesso!', 'success');
};

window.advanceOS = function(id) {
  const os = window.state.os.find(o => o.id === id);
  if(!os) return;
  const oldOs = {...os};
  
  if (os.status === 'pending') os.status = 'progress';
  else if (os.status === 'progress') os.status = 'done';
  else if (os.status === 'done') os.status = 'billed';
  else return;

  if(window.logAudit) window.logAudit('update', 'os', id, `OS de ${os.client} avançou para ${os.status}`, oldOs, os);
  window.persist();
  renderOSBoard();
};

window.faturarOS = function(id) {
  const os = window.state.os.find(o => o.id === id);
  if(!os) return;
  
  // Create a transaction from this OS
  const tx = {
    id: window.genId(),
    desc: `Faturamento OS: ${os.client} - ${os.desc.substring(0, 20)}...`,
    amount: os.value,
    date: new Date().toISOString().split('T')[0],
    category: 'Vendas/Serviços',
    notes: 'Gerado via Módulo OS',
    type: 'RECEITA'
  };

  if(!window.state.transactions) window.state.transactions = [];
  window.state.transactions.push(tx);
  
  // Move OS to billed
  const oldOs = {...os};
  os.status = 'billed';

  if(window.logAudit) {
    window.logAudit('create', 'transaction', tx.id, `Transação (Receita) gerada via faturamento OS ${os.client}`, null, tx);
    window.logAudit('update', 'os', id, `OS de ${os.client} faturada`, oldOs, os);
  }

  window.persist();
  renderOSBoard();
  if(typeof window.renderFinance === 'function') window.renderFinance();
  if(typeof window.renderDashboard === 'function') window.renderDashboard();
  
  window.showToast(`Receita de ${window.fmt(os.value)} registrada no financeiro!`, 'success');
};

// Hook into the main app initialization
const originalInitOS = window.initMaxCfoApp;
if(originalInitOS) {
  // Try to hijack or we just call initOS globally after script load if needed
}

// Attach to global for manual triggers if needed
window.initOS = initOS;
