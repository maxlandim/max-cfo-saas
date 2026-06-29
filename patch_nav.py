import re

def patch_page_js():
    with open('app/dashboard/page.js', 'r', encoding='utf-8') as f:
        content = f.read()

    # Fix the links
    content = content.replace('href="/dashboard/fintech"', 'data-view="fintech"')
    content = content.replace('href="/dashboard/inventory"', 'data-view="inventory"')

    # The HTML to inject
    fintech_html = """
    <!-- ═══════════ FINTECH E CRÉDITO ═══════════ -->
    <section class="view" id="view-fintech" aria-label="Fintech e Crédito">
      <div class="page-header">
        <div class="page-header-text">
          <h1>Hub Fintech</h1>
          <p class="page-subtitle">Transforme suas contas a receber em dinheiro na hora.</p>
        </div>
      </div>
      <div class="grid-2col" style="margin-top:20px;">
        <!-- Painel de Antecipação -->
        <div class="card" style="border: 1px solid rgba(99, 102, 241, 0.4);">
          <div style="display:flex; align-items:center; gap:12px; margin-bottom:24px;">
            <div style="padding:12px; background:rgba(99, 102, 241, 0.1); border-radius:12px; color:#818cf8;">
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h2 style="font-size:18px; font-weight:bold; color:white;">Antecipação de Recebíveis</h2>
          </div>
          <div style="display:flex; flex-direction:column; gap:16px;">
            <div>
              <label class="form-label">Valor da Fatura Futura (R$)</label>
              <input type="number" id="fintechAmount" value="15000" class="form-input" style="font-size:18px; padding:12px;">
            </div>
            <button class="btn-primary" id="btnAnticipate" style="width:100%; padding:14px; font-size:16px;" onclick="simulateAnticipation()">
              Simular Adiantamento
            </button>
          </div>
        </div>
        <!-- Resultado -->
        <div id="anticipationResult" style="display:none;" class="card">
          <div style="position:relative; overflow:hidden;">
            <div style="position:absolute; top:-40px; right:-40px; width:120px; height:120px; background:rgba(16, 185, 129, 0.1); border-radius:50%; filter:blur(30px);"></div>
            <h3 style="font-size:18px; font-weight:bold; color:#d1d5db; margin-bottom:16px;">Resumo da Operação</h3>
            
            <div style="display:flex; justify-content:space-between; padding:12px 0; border-bottom:1px solid rgba(255,255,255,0.05);">
              <span style="color:#9ca3af;">Valor Original</span>
              <span style="color:white; font-weight:500;" id="antOriginal">R$ 0,00</span>
            </div>
            
            <div style="display:flex; justify-content:space-between; padding:12px 0; border-bottom:1px solid rgba(255,255,255,0.05);">
              <span style="color:#ef4444;">Taxa de Desconto (3%)</span>
              <span style="color:#ef4444; font-weight:500;" id="antFee">- R$ 0,00</span>
            </div>
            
            <div style="display:flex; justify-content:space-between; padding:16px 0 0 0; margin-top:8px;">
              <span style="color:#d1d5db; font-weight:bold;">Valor Líquido creditado HOJE</span>
              <span style="font-size:28px; font-weight:900; color:#10b981;" id="antNet">R$ 0,00</span>
            </div>
            
            <div style="margin-top:32px; text-align:center; padding-top:16px; border-top:1px solid rgba(255,255,255,0.05);">
              <span style="display:inline-block; background:rgba(16,185,129,0.1); color:#34d399; font-size:12px; padding:4px 12px; border-radius:16px; border:1px solid rgba(16,185,129,0.2);">
                Pré-aprovado
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
"""

    inventory_html = """
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
      
      <div id="inventoryAlertsContainer" style="display:none; margin-top:20px;">
        <div style="background:rgba(239, 68, 68, 0.1); border:1px solid rgba(239, 68, 68, 0.3); padding:16px; border-radius:12px; display:flex; gap:12px; align-items:flex-start;">
          <svg style="width:24px; height:24px; color:#ef4444; flex-shrink:0;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <h3 style="color:#f87171; font-weight:bold; margin-bottom:4px;">Atenção: Ação Necessária</h3>
            <p style="color:#fecaca; font-size:14px;" id="inventoryAlertText">Existem produtos abaixo do ponto de recompra!</p>
          </div>
        </div>
      </div>

      <div class="card" style="margin-top:20px">
        <div class="table-scroll">
          <table class="data-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Produto / Serviço</th>
                <th style="text-align:center;">Qtd Atual</th>
                <th style="text-align:center;">Ponto de Recompra</th>
                <th style="text-align:right;">Status (IA)</th>
              </tr>
            </thead>
            <tbody id="inventory-table-body">
               <tr><td colspan="5" style="text-align:center; padding:32px; color:var(--text-muted);">Carregando Estoque...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
"""

    # First, let's remove any existing <section class="view" id="view-inventory">
    content = re.sub(r'<!-- ═══════════ ESTOQUE ═══════════ -->.*?</section>', '', content, flags=re.DOTALL)
    
    # Also remove any existing view-fintech just in case
    content = re.sub(r'<!-- ═══════════ FINTECH E CRÉDITO ═══════════ -->.*?</section>', '', content, flags=re.DOTALL)

    # Insert the new HTML right before </main>
    insertion_point = "</main>"
    content = content.replace(insertion_point, fintech_html + "\n" + inventory_html + "\n</main>")

    with open('app/dashboard/page.js', 'w', encoding='utf-8') as f:
        f.write(content)

patch_page_js()
print("app/dashboard/page.js patched")
