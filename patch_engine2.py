engine_patch = """
// ═══════════ FINTECH & ESTOQUE INTEGRATION ═══════════

async function simulateAnticipation() {
  const amountStr = document.getElementById('fintechAmount').value;
  const amount = parseInt(amountStr, 10);
  if (!amount || amount <= 0) return alert("Insira um valor válido");

  const btn = document.getElementById('btnAnticipate');
  btn.innerText = "Processando...";
  btn.disabled = true;

  try {
    const chargeRes = await fetchAPI(`/fintech/generate-boleto?amount=${amount * 100}`, { method: 'POST' });
    if (!chargeRes || !chargeRes.charge_id) throw new Error("Falha ao gerar cobrança");

    const antRes = await fetchAPI(`/fintech/anticipate?charge_id=${chargeRes.charge_id}`, { method: 'POST' });
    
    document.getElementById('anticipationResult').style.display = 'block';
    document.getElementById('antOriginal').innerText = `R$ ${(antRes.original_amount / 100).toFixed(2).replace('.', ',')}`;
    document.getElementById('antFee').innerText = `- R$ ${(antRes.discount_fee / 100).toFixed(2).replace('.', ',')}`;
    document.getElementById('antNet').innerText = `R$ ${(antRes.net_amount / 100).toFixed(2).replace('.', ',')}`;
  } catch (err) {
    console.error(err);
    alert("Erro ao simular adiantamento");
  } finally {
    btn.innerText = "Simular Adiantamento";
    btn.disabled = false;
  }
}

async function loadInventory() {
  const tbody = document.getElementById('inventory-table-body');
  try {
    const [products, alertsRes] = await Promise.all([
      fetchAPI('/inventory'),
      fetchAPI('/inventory/alerts')
    ]);

    const alerts = alertsRes?.alerts || [];
    const alertsContainer = document.getElementById('inventoryAlertsContainer');
    
    if (alerts.length > 0) {
      alertsContainer.style.display = 'block';
      document.getElementById('inventoryAlertText').innerText = `Existem ${alerts.length} produtos abaixo do ponto de recompra!`;
    } else {
      alertsContainer.style.display = 'none';
    }

    if (!products || products.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:32px; color:var(--text-muted);">Nenhum produto cadastrado.</td></tr>';
      return;
    }

    let html = '';
    products.forEach(prod => {
      const isCritical = prod.quantity <= prod.reorder_point;
      const statusHtml = isCritical
        ? `<span style="background:rgba(239, 68, 68, 0.2); color:#f87171; border:1px solid rgba(239, 68, 68, 0.3); padding:4px 12px; border-radius:12px; font-size:12px; font-weight:bold;">Repor Estoque</span>`
        : `<span style="background:rgba(16, 185, 129, 0.2); color:#34d399; border:1px solid rgba(16, 185, 129, 0.3); padding:4px 12px; border-radius:12px; font-size:12px; font-weight:bold;">Estável</span>`;

      html += `
        <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
          <td>
             <div style="font-weight:bold; color:white;">${prod.name}</div>
             <div style="font-size:12px; color:var(--text-muted);">SKU: ${prod.sku}</div>
          </td>
          <td></td>
          <td style="text-align:center; font-size:18px; font-weight:bold; color:white;">${prod.quantity}</td>
          <td style="text-align:center; color:var(--text-muted);">${prod.reorder_point}</td>
          <td style="text-align:right;">${statusHtml}</td>
        </tr>
      `;
    });
    tbody.innerHTML = html;
  } catch (err) {
    console.error("Failed to load inventory", err);
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:32px; color:#ef4444;">Erro ao carregar estoque.</td></tr>';
  }
}

// Hook into switchView
const originalSwitchView = window.switchView;
window.switchView = function(viewId) {
  if (originalSwitchView) {
    originalSwitchView(viewId);
  }
  
  // Specific view logic
  if (viewId === 'inventory') {
    loadInventory();
  }
};
"""

with open('public/engine.js', 'a', encoding='utf-8') as f:
    f.write("\n" + engine_patch)
