const fs = require('fs');
let content = fs.readFileSync('app/dashboard/page.js', 'utf8');

// Function to format HTML to be injected into a double-quoted JS string literal
function formatHtml(html) {
  return html.replace(/"/g, '\\"').replace(/\n/g, '\\n');
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
  const mainEnd = '</main>';
  const idx = content.lastIndexOf(mainEnd);
  if (idx !== -1) {
    content = content.slice(0, idx) + crmHtml + content.slice(idx);
  } else {
    console.log("mainEnd not found");
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
  const mainEnd = '</main>';
  const idx = content.lastIndexOf(mainEnd);
  if (idx !== -1) {
    content = content.slice(0, idx) + invHtml + content.slice(idx);
  }
}

fs.writeFileSync('app/dashboard/page.js', content);
console.log('Patch complete.');
