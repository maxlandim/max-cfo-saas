const fs = require('fs');
let content = fs.readFileSync('app/dashboard/page.js', 'utf8');

// Function to format HTML to be injected into a double-quoted JS string literal
function formatHtml(html) {
  return html.replace(/"/g, '\\"').replace(/\n/g, '\\n');
}

// 1. Add sidebar icons
if (!content.includes('id=\\"nav-crm\\"')) {
  // Find where to insert in the sidebar. We can just insert it after the nav-settings link.
  const target = '<a class=\\"nav-item\\" data-view=\\"settings\\" id=\\"nav-settings\\">';
  const endTarget = '<\\/a>';
  
  const startIdx = content.indexOf(target);
  if (startIdx !== -1) {
    const endIdx = content.indexOf(endTarget, startIdx) + endTarget.length;
    const toInsert = `\\n    <div class=\\"nav-section-label\\">MÓDULOS<\\\/div>\\n    <a class=\\"nav-item\\" data-view=\\"crm\\" id=\\"nav-crm\\">\\n      <span class=\\"nav-icon\\">💼<\\\/span><span class=\\"nav-label\\">CRM & Vendas<\\\/span>\\n    <\\\/a>\\n    <a class=\\"nav-item\\" data-view=\\"inventory\\" id=\\"nav-inventory\\">\\n      <span class=\\"nav-icon\\">📦<\\\/span><span class=\\"nav-label\\">Estoque<\\\/span>\\n    <\\\/a>`;
    content = content.slice(0, endIdx) + toInsert + content.slice(endIdx);
  }
}

// 2. Remove duplicate reports view (if any)
const reportStart = '<section class=\\"view\\" id=\\"view-reports\\" aria-label=\\"Relat\\u00f3rios\\">';
const occurrences = content.split(reportStart).length - 1;
if (occurrences > 1) {
  const firstIdx = content.indexOf(reportStart);
  const secondIdx = content.indexOf(reportStart, firstIdx + 1);
  if (secondIdx !== -1) {
    const endSecond = content.indexOf('<\\/section>', secondIdx) + 11;
    content = content.slice(0, secondIdx) + content.slice(endSecond);
  }
}

// 3. Add CRM section
if (!content.includes('id=\\"view-crm\\"')) {
  const crmHtml = formatHtml(`
    <!-- ═══════════ CRM & VENDAS ═══════════ -->
    <section class="view" id="view-crm" aria-label="CRM & Vendas">
      <div class="page-header">
        <div class="page-header-text">
          <h1>CRM & Vendas</h1>
          <p class="page-subtitle">Pipeline de Oportunidades e Leads</p>
        </div>
        <div class="page-header-actions">
          <button class="btn-primary" onclick="openModal('crmModal')">+ Novo Lead</button>
        </div>
      </div>
      <div class="kanban-board" id="crm-board" style="display:flex;gap:20px;overflow-x:auto;padding-top:20px;min-height:400px;"></div>
    </section>
`);
  const mainEnd = '<\\/main>';
  const idx = content.lastIndexOf(mainEnd);
  if (idx !== -1) {
    content = content.slice(0, idx) + crmHtml + content.slice(idx);
  }
}

// 4. Add Inventory section
if (!content.includes('id=\\"view-inventory\\"')) {
  const invHtml = formatHtml(`
    <!-- ═══════════ ESTOQUE ═══════════ -->
    <section class="view" id="view-inventory" aria-label="Estoque Inteligente">
      <div class="page-header">
        <div class="page-header-text">
          <h1>Estoque Inteligente</h1>
          <p class="page-subtitle">Monitoramento proativo com CFO IA</p>
        </div>
        <div class="page-header-actions">
          <button class="btn-primary" onclick="openModal('invModal')">+ Novo Produto</button>
        </div>
      </div>
      <div class="card" style="margin-top:20px">
        <div class="table-scroll">
          <table class="data-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Produto / Serviço</th>
                <th>Qtd Atual</th>
                <th>Status (IA)</th>
                <th>Previsão Falta</th>
              </tr>
            </thead>
            <tbody id="inventory-table-body"></tbody>
          </table>
        </div>
      </div>
    </section>
`);
  const mainEnd = '<\\/main>';
  const idx = content.lastIndexOf(mainEnd);
  if (idx !== -1) {
    content = content.slice(0, idx) + invHtml + content.slice(idx);
  }
}

// 5. Add Modals
if (!content.includes('id=\\"crmModal\\"')) {
  const crmModal = formatHtml(`
<!-- Modal CRM -->
<div class="modal-overlay" id="crmModal" role="dialog" aria-modal="true">
  <div class="modal-box">
    <div class="modal-head">
      <h2 class="modal-title">👤 Novo Lead</h2>
      <button class="modal-x" onclick="closeModal('crmModal')">✕</button>
    </div>
    <form id="crmForm" onsubmit="submitLead(event)">
      <div class="form-grid">
        <div class="form-field span-2">
          <label class="form-label">Empresa / Cliente</label>
          <input type="text" class="form-input" id="crmName" required>
        </div>
        <div class="form-field">
          <label class="form-label">Valor Estimado (R$)</label>
          <input type="number" class="form-input" id="crmValue" required>
        </div>
        <div class="form-field">
          <label class="form-label">Risco</label>
          <select class="form-input" id="crmRisk">
            <option value="Baixo">Baixo</option>
            <option value="Moderado">Moderado</option>
            <option value="Alto">Alto</option>
          </select>
        </div>
      </div>
      <div class="modal-foot">
        <button type="button" class="btn-ghost" onclick="closeModal('crmModal')">Cancelar</button>
        <button type="submit" class="btn-primary">Salvar Lead</button>
      </div>
    </form>
  </div>
</div>
`);
  const toastIdx = content.indexOf('<!-- TOAST -->');
  if (toastIdx !== -1) {
    content = content.slice(0, toastIdx) + crmModal + '\\n' + content.slice(toastIdx);
  }
}

if (!content.includes('id=\\"invModal\\"')) {
  const invModal = formatHtml(`
<!-- Modal Estoque -->
<div class="modal-overlay" id="invModal" role="dialog" aria-modal="true">
  <div class="modal-box">
    <div class="modal-head">
      <h2 class="modal-title">📦 Novo Produto</h2>
      <button class="modal-x" onclick="closeModal('invModal')">✕</button>
    </div>
    <form id="invForm" onsubmit="submitProduct(event)">
      <div class="form-grid">
        <div class="form-field span-2">
          <label class="form-label">Nome do Produto</label>
          <input type="text" class="form-input" id="invName" required>
        </div>
        <div class="form-field">
          <label class="form-label">Qtd Atual</label>
          <input type="number" class="form-input" id="invQty" required>
        </div>
      </div>
      <div class="modal-foot">
        <button type="button" class="btn-ghost" onclick="closeModal('invModal')">Cancelar</button>
        <button type="submit" class="btn-primary">Salvar Produto</button>
      </div>
    </form>
  </div>
</div>
`);
  const toastIdx = content.indexOf('<!-- TOAST -->');
  if (toastIdx !== -1) {
    content = content.slice(0, toastIdx) + invModal + '\\n' + content.slice(toastIdx);
  }
}

fs.writeFileSync('app/dashboard/page.js', content);
console.log('Patch complete.');
