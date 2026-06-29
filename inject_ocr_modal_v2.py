import os

with open('app/dashboard/page.js', 'r', encoding='utf-8') as f:
    content = f.read()

ocr_modal_html = """
<!-- Modal OCR Magico -->
<div class="modal-overlay" id="ocrModal" role="dialog" aria-modal="true">
  <div class="modal-box">
    <div class="modal-head">
      <h2 class="modal-title">⚡ OCR Mágico (Leitura IA)</h2>
      <button class="modal-x" onclick="closeModal('ocrModal')">✕</button>
    </div>
    
    <div id="ocrUploadState">
      <p style="color:var(--text-muted); margin-bottom:16px">Faça o upload de uma Nota Fiscal (PDF, JPG, PNG) para extração inteligente de dados.</p>
      
      <div class="ocr-drop-zone" id="ocrDropZone" onclick="document.getElementById('ocrFileInput').click()">
        <div class="ocr-scanning-overlay" id="ocrScanningOverlay">
          <div class="laser-line"></div>
          <span style="font-size:32px; margin-bottom:16px">🧾</span>
          <h3 style="color:var(--primary); font-family:monospace">EXTRAINDO DADOS...</h3>
          <p style="font-family:monospace; color:#818cf8; font-size:12px; margin-top:8px">Rede Neural Ativa: Reconhecendo padrões fiscais</p>
        </div>
        
        <span class="ocr-icon-lg">📥</span>
        <h3 style="color:white">Arraste e solte sua Nota Fiscal aqui</h3>
        <p style="color:var(--text-muted); margin-top:8px">Ou clique para procurar (PDF, JPG, PNG)</p>
        <input type="file" id="ocrFileInput" style="display:none" accept=".pdf,image/*" onchange="handleOCRFile(event)">
      </div>
    </div>

    <div id="ocrReviewState" style="display:none">
      <div style="background:rgba(16,185,129,0.1); border:1px solid #10b981; border-radius:8px; padding:12px; margin-bottom:16px; display:flex; align-items:center; gap:12px">
        <span style="font-size:24px">✅</span>
        <div>
          <h4 style="color:#10b981; margin:0">Leitura Concluída com Sucesso</h4>
          <p style="font-size:12px; color:var(--text-muted); margin:0">Confirme os dados extraídos antes de salvar no financeiro.</p>
        </div>
      </div>

      <div class="form-grid">
        <div class="form-field span-2">
          <label class="form-label">Fornecedor / Descrição</label>
          <input type="text" class="form-input" id="ocrExtractedDesc" value="Serviços de Computação em Nuvem - AWS">
        </div>
        <div class="form-field">
          <label class="form-label">CNPJ</label>
          <input type="text" class="form-input" id="ocrExtractedCnpj" value="23.413.399/0001-44">
        </div>
        <div class="form-field">
          <label class="form-label">Valor (R$)</label>
          <input type="number" class="form-input" id="ocrExtractedAmount" value="4530.00" step="0.01">
        </div>
        <div class="form-field">
          <label class="form-label">Data de Emissão</label>
          <input type="date" class="form-input" id="ocrExtractedDate">
        </div>
        <div class="form-field">
          <label class="form-label">Categoria</label>
          <select class="form-input" id="ocrExtractedCategory">
            <option value="Tecnologia">Tecnologia</option>
            <option value="Impostos">Impostos</option>
            <option value="Folha de Pagamento">Folha de Pagamento</option>
            <option value="Marketing">Marketing</option>
            <option value="Infraestrutura">Infraestrutura</option>
          </select>
        </div>
      </div>
      
      <div class="modal-foot" style="margin-top:20px">
        <button class="btn-ghost" onclick="resetOCR()">Descartar</button>
        <button class="btn-primary" onclick="saveOCRTransaction()">💾 Salvar Despesa</button>
      </div>
    </div>

  </div>
</div>
<!-- TOAST -->"""

# Add Modal
if "id=\"ocrModal\"" not in content:
    content = content.replace("<!-- TOAST -->", ocr_modal_html)

# Add Button to Finance View
finance_header = """<div class="page-header">
      <div>
        <h1 class="page-title">Livro Caixa & Transações</h1>
        <p class="page-subtitle">Acompanhe e concilie entradas e saídas</p>
      </div>
      <div style="display:flex; gap:12px">
        <button class="btn-ghost" onclick="exportData()">⬇ Exportar CSV</button>
        <button class="btn-primary" onclick="openModal('txModal')">＋ Nova Transação</button>
      </div>
    </div>"""

finance_header_new = """<div class="page-header">
      <div>
        <h1 class="page-title">Livro Caixa & Transações</h1>
        <p class="page-subtitle">Acompanhe e concilie entradas e saídas</p>
      </div>
      <div style="display:flex; gap:12px">
        <button class="btn-secondary" onclick="openOCRModal()">🧾 Subir NFs (OCR IA)</button>
        <button class="btn-ghost" onclick="exportData()">⬇ Exportar CSV</button>
        <button class="btn-primary" onclick="openModal('txModal')">＋ Nova Transação</button>
      </div>
    </div>"""

if "openOCRModal()" not in content:
    content = content.replace(finance_header, finance_header_new)


with open('app/dashboard/page.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("INJECTION SUCCESS")
