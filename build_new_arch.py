import re

def build_new_architecture():
    with open('app/dashboard/page.js', 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. NEW SIDEBAR
    new_sidebar = r"""<!-- SIDEBAR -->
<aside class=\"sidebar\" id=\"sidebar\">
  <div class=\"sidebar-brand\">
    <div class=\"brand-logo\">\u26a1</div>
    <div class=\"brand-text\">
      <span class=\"brand-name\">MAX CFO AI</span>
      <span class=\"brand-tagline\">Plataforma Financeira v4.0</span>
    </div>
  </div>

  <nav class=\"sidebar-nav\">
    <div class=\"nav-section-label\">1. ONBOARDING & EQUIPE</div>
    <a class=\"nav-item\" data-view=\"team\" id=\"nav-team\">
      <span class=\"nav-icon\">\ud83d\udc65</span><span class=\"nav-label\">Equipe & Workspaces</span>
    </a>
    <a class=\"nav-item\" data-view=\"settings\" id=\"nav-settings\">
      <span class=\"nav-icon\">\u2699\ufe0f</span><span class=\"nav-label\">Configura\u00e7\u00f5es</span>
    </a>

    <div class=\"nav-section-label\">2. OPERA\u00c7\u00c3O & VENDAS</div>
    <a class=\"nav-item\" data-view=\"finance\" id=\"nav-finance\">
      <span class=\"nav-icon\">\ud83d\udcb0</span><span class=\"nav-label\">Financeiro & OCR</span>
    </a>
    <a class=\"nav-item\" data-view=\"reconciliation\" id=\"nav-reconciliation\">
      <span class=\"nav-icon\">\ud83d\udd04</span><span class=\"nav-label\">Open Finance</span>
    </a>
    <a class=\"nav-item\" data-view=\"crm\" id=\"nav-crm\">
      <span class=\"nav-icon\">\ud83e\udd1d</span><span class=\"nav-label\">CRM & Vendas</span>
    </a>
    <a class=\"nav-item\" data-view=\"inventory\" id=\"nav-inventory\">
      <span class=\"nav-icon\">\ud83d\udce6</span><span class=\"nav-label\">Estoque & Compras</span>
    </a>
    <a class=\"nav-item\" data-view=\"hr\" id=\"nav-hr\">
      <span class=\"nav-icon\">\ud83d\udccb</span><span class=\"nav-label\">RH Provis\u00f5es</span>
    </a>

    <div class=\"nav-section-label\">3. FINTECH & FATURAMENTO</div>
    <a class=\"nav-item\" data-view=\"fintech\" id=\"nav-fintech\">
      <span class=\"nav-icon\">\ud83c\udfe6</span><span class=\"nav-label\">Antecipa\u00e7\u00e3o de Notas</span>
    </a>
    <a class=\"nav-item\" data-view=\"nfe\" id=\"nav-nfe\">
      <span class=\"nav-icon\">\ud83e\uddfe</span><span class=\"nav-label\">Emiss\u00e3o Fiscal (NF-e)</span>
    </a>

    <div class=\"nav-section-label\">4. ENTERPRISE & PATRIM\u00d4NIO</div>
    <a class=\"nav-item\" data-view=\"assets\" id=\"nav-assets\">
      <span class=\"nav-icon\">\ud83c\udfd8\ufe0f</span><span class=\"nav-label\">Gest\u00e3o de Ativos</span>
    </a>
    <a class=\"nav-item\" data-view=\"tax-audit\" id=\"nav-tax-audit\">
      <span class=\"nav-icon\">\ud83d\udd0d</span><span class=\"nav-label\">Auditoria Tribut\u00e1ria</span>
    </a>
    <a class=\"nav-item\" data-view=\"companies\" id=\"nav-companies\">
      <span class=\"nav-icon\">\ud83c\udfe2</span><span class=\"nav-label\">CNPJs & Compliance</span>
    </a>
    <a class=\"nav-item\" data-view=\"thermofinance\" id=\"nav-thermofinance\">
      <span class=\"nav-icon\">\u26a2\ufe0f</span><span class=\"nav-label\">Termofinan\u00e7a IA</span>
    </a>

    <div class=\"nav-section-label\">5. INTELIG\u00caNCIA & DASHBOARD</div>
    <a class=\"nav-item active\" data-view=\"dashboard\" id=\"nav-dashboard\">
      <span class=\"nav-icon\">\ud83d\udcca</span><span class=\"nav-label\">Vis\u00e3o Geral</span>
    </a>
    <a class=\"nav-item\" data-view=\"chat\" id=\"nav-chat\">
      <span class=\"nav-icon\">\ud83e\udd16</span><span class=\"nav-label\">CFO IA Chat</span>
      <span class=\"nav-badge\" id=\"chatBadge\" style=\"display:none\">1</span>
    </a>
    <a class=\"nav-item\" data-view=\"simulator\" id=\"nav-simulator\">
      <span class=\"nav-icon\">\ud83d\udd2e</span><span class=\"nav-label\">Forecast & Simulador</span>
    </a>
    <a class=\"nav-item\" data-view=\"reports\" id=\"nav-reports\">
      <span class=\"nav-icon\">\ud83d\udcc8</span><span class=\"nav-label\">Relat\u00f3rios Export\u00e1veis</span>
    </a>
  </nav>

  <div class=\"sidebar-bottom\">
    <div class=\"sidebar-version\">MAX CFO AI v4.0 \u2014 Ecosystem</div>
    <div class=\"user-profile\" id=\"userProfile\">
      <div class=\"user-avatar\" id=\"userAvatarSidebar\">M</div>
      <div class=\"user-info\">
        <span class=\"user-name\" id=\"sidebarUserName\">CFO Master</span>
        <span class=\"user-plan\">Unlimited Plan \ud83d\udc8e</span>
      </div>
    </div>
  </div>
</aside>"""

    # Fix: use lambda for replacement to avoid re parsing escape sequences
    content = re.sub(r'<!-- SIDEBAR -->.*?</aside>', lambda m: new_sidebar, content, flags=re.DOTALL)

    # 2. NEW VIEWS
    new_views = r"""
    <!-- \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 EQUIPE & WORKSPACES \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 -->
    <section class=\"view\" id=\"view-team\" aria-label=\"Gest\u00e3o de Equipe\">
      <div class=\"page-header\">
        <div class=\"page-header-text\">
          <h1>Equipe & Workspaces</h1>
          <p class=\"page-subtitle\">Gerencie multi-usu\u00e1rios, acessos e auditoria</p>
        </div>
        <div class=\"page-header-actions\">
          <button class=\"btn-primary\">+ Novo Usu\u00e1rio</button>
        </div>
      </div>
      <div class=\"grid-2col\" style=\"margin-top:20px;\">
        <div class=\"card\">
          <h3 class=\"card-title\">Membros do Workspace</h3>
          <table class=\"data-table\">
            <thead><tr><th>Nome</th><th>Papel</th><th>\u00daltimo Login</th><th>A\u00e7\u00f5es</th></tr></thead>
            <tbody>
              <tr><td>Jo\u00e3o Silva</td><td><span class=\"chip\" style=\"background:rgba(99,102,241,0.1);color:#818cf8\">Admin</span></td><td>Agora</td><td>Editar</td></tr>
              <tr><td>Maria Souza</td><td><span class=\"chip\" style=\"background:rgba(16,185,129,0.1);color:#34d399\">Operador</span></td><td>Ontem</td><td>Editar</td></tr>
              <tr><td>Contabilidade Externo</td><td><span class=\"chip\" style=\"background:rgba(245,158,11,0.1);color:#fbbf24\">Contador (Read-Only)</span></td><td>H\u00e1 2 dias</td><td>Editar</td></tr>
            </tbody>
          </table>
        </div>
        <div class=\"card\">
          <h3 class=\"card-title\">Trilha de Auditoria (Audit Trail)</h3>
          <div style=\"max-height: 250px; overflow-y: auto;\">
             <div style=\"padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.05);\"><span style=\"color:var(--text-muted); font-size:12px;\">Hoje 10:45</span> - <b>Jo\u00e3o Silva</b> aprovou pagamento de R$ 5.000,00</div>
             <div style=\"padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.05);\"><span style=\"color:var(--text-muted); font-size:12px;\">Ontem 16:20</span> - <b>Maria Souza</b> cadastrou nota de despesa</div>
             <div style=\"padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.05);\"><span style=\"color:var(--text-muted); font-size:12px;\">Ontem 15:10</span> - <b>Jo\u00e3o Silva</b> alterou permiss\u00f5es do contador</div>
          </div>
        </div>
      </div>
    </section>

    <!-- \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 RH PROVIS\u00d5ES \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 -->
    <section class=\"view\" id=\"view-hr\" aria-label=\"RH e Provis\u00f5es\">
      <div class=\"page-header\">
        <div class=\"page-header-text\">
          <h1>RH Financeiro & Provis\u00f5es</h1>
          <p class=\"page-subtitle\">Proje\u00e7\u00e3o autom\u00e1tica de F\u00e9rias, 13\u00ba e Encargos no fluxo de caixa</p>
        </div>
      </div>
      <div class=\"card\" style=\"margin-top:20px\">
         <div style=\"padding:40px; text-align:center; color:var(--text-muted)\"><div style=\"font-size:40px; margin-bottom:16px;\">\ud83d\udccb</div><h3>M\u00f3dulo Ativado</h3><p>Importe sua folha de pagamento para gerar as provis\u00f5es autom\u00e1ticas.</p></div>
      </div>
    </section>

    <!-- \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 EMISS\u00c3O FISCAL NF-e \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 -->
    <section class=\"view\" id=\"view-nfe\" aria-label=\"Emiss\u00e3o Fiscal\">
      <div class=\"page-header\">
        <div class=\"page-header-text\">
          <h1>Emiss\u00e3o Fiscal Integrada</h1>
          <p class=\"page-subtitle\">Conex\u00e3o direta com Prefeituras e SEFAZ</p>
        </div>
      </div>
      <div class=\"card\" style=\"margin-top:20px\">
         <div style=\"padding:40px; text-align:center; color:var(--text-muted)\"><div style=\"font-size:40px; margin-bottom:16px;\">\ud83e\uddfe</div><h3>Hub de Faturamento</h3><p>Configura\u00e7\u00e3o de Certificado A1/A3 necess\u00e1ria para in\u00edcio.</p><button class=\"btn-primary\" style=\"margin-top:16px\">Configurar Certificado</button></div>
      </div>
    </section>

    <!-- \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 GEST\u00c3O DE ATIVOS \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 -->
    <section class=\"view\" id=\"view-assets\" aria-label=\"Gest\u00e3o de Ativos\">
      <div class=\"page-header\">
        <div class=\"page-header-text\">
          <h1>Gest\u00e3o de Ativos & Imobilizado</h1>
          <p class=\"page-subtitle\">Controle de ROI imobili\u00e1rio, deprecia\u00e7\u00e3o e transfer\u00eancias (Real Estate)</p>
        </div>
      </div>
      <div class=\"card\" style=\"margin-top:20px\">
         <div style=\"padding:40px; text-align:center; color:var(--text-muted)\"><div style=\"font-size:40px; margin-bottom:16px;\">\ud83c\udfd8\ufe0f</div><h3>Portf\u00f3lio Vazio</h3><p>Cadastre im\u00f3veis, maquin\u00e1rio ou frotas para calcular a deprecia\u00e7\u00e3o cont\u00e1bil e ITBI autom\u00e1tico.</p></div>
      </div>
    </section>

    <!-- \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 AUDITORIA TRIBUT\u00c1RIA \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 -->
    <section class=\"view\" id=\"view-tax-audit\" aria-label=\"Auditoria Tribut\u00e1ria\">
      <div class=\"page-header\">
        <div class=\"page-header-text\">
          <h1>Auditoria Tribut\u00e1ria Preditiva</h1>
          <p class=\"page-subtitle\">Cruzamento de notas com legisla\u00e7\u00e3o ICMS, ISS e PIS/COFINS</p>
        </div>
      </div>
      <div class=\"card\" style=\"margin-top:20px; border: 1px solid rgba(245, 158, 11, 0.3);\">
         <div style=\"display:flex; gap:16px; align-items:center;\">
           <div style=\"font-size:32px\">\u26a0\ufe0f</div>
           <div><h3 style=\"color:#fbbf24\">Nenhuma Inconsist\u00eancia Detectada</h3><p style=\"color:var(--text-muted)\">O motor de auditoria n\u00e3o encontrou risco de autua\u00e7\u00e3o nas \u00faltimas 300 notas analisadas.</p></div>
         </div>
      </div>
    </section>

    <!-- \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 TERMOFINAN\u00c7A \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 -->
    <section class=\"view\" id=\"view-thermofinance\" aria-label=\"Termofinan\u00e7a IA\">
      <div class=\"page-header\">
        <div class=\"page-header-text\">
          <h1>Motor de Termofinan\u00e7a (IA N\u00edvel Global)</h1>
          <p class=\"page-subtitle\">C\u00e1lculo de Entropia Financeira e Equil\u00edbrio Din\u00e2mico Macro</p>
        </div>
      </div>
      <div class=\"grid-2col\" style=\"margin-top:20px;\">
         <div class=\"card\">
            <h3 class=\"card-title\">Matriz de Entropia</h3>
            <div style=\"height: 200px; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.2); border-radius:12px; margin-top:16px; position:relative; overflow:hidden;\">
               <!-- Fake heatmap / radar visual for thermofinance -->
               <div style=\"width:100px; height:100px; background:radial-gradient(circle, rgba(99,102,241,0.8) 0%, rgba(16,185,129,0) 70%); filter:blur(10px); position:absolute; animation: pulse 3s infinite;\"></div>
               <span style=\"z-index:2; font-weight:bold; font-size:24px; color:white;\">0.82 \u0394S</span>
            </div>
         </div>
         <div class=\"card\">
            <h3 class=\"card-title\">Diagn\u00f3stico Macroecon\u00f4mico</h3>
            <ul style=\"list-style:none; padding:0; margin-top:16px; display:flex; flex-direction:column; gap:12px;\">
              <li style=\"padding:12px; background:rgba(16,185,129,0.1); border-left:3px solid #10b981; border-radius:4px;\"><b>Risco de Infla\u00e7\u00e3o:</b> Baixo. Prote\u00e7\u00e3o de capital otimizada.</li>
              <li style=\"padding:12px; background:rgba(245,158,11,0.1); border-left:3px solid #fbbf24; border-radius:4px;\"><b>Alavancagem:</b> Momento oportuno com Selic estabilizada.</li>
            </ul>
         </div>
      </div>
    </section>
"""
    
    # 3. APPEND NEW VIEWS TO THE END OF MAIN WRAP
    content = content.replace("</main>", new_views + "\n</main>")

    # 4. UPDATE FINANCE SCREEN WITH OCR BUTTON
    finance_ocr_btn = r'<button class=\"btn-primary\" onclick=\"openModal(\'receita\')\">+ Nova Receita</button>\n          <button class=\"btn-secondary\" onclick=\"alert(\'Inicializando OCR M\u00e1gico...\')\">\ud83e\uddfe Subir NFs (OCR IA)</button>'
    content = content.replace(r'<button class=\"btn-primary\" onclick=\"openModal(\'receita\')\">+ Nova Receita</button>', finance_ocr_btn)

    with open('app/dashboard/page.js', 'w', encoding='utf-8') as f:
        f.write(content)

build_new_architecture()
print("Architecture successfully injected into page.js")
