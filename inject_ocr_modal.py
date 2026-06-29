import os

def inject_ocr_modal():
    with open('app/dashboard/page.js', 'r', encoding='utf-8') as f:
        content = f.read()

    ocr_modal_html = r"""<!-- ═══════════ MODAIS ═══════════ -->

<!-- Modal OCR Mágico -->
<div class=\"modal-overlay\" id=\"ocrModal\" role=\"dialog\" aria-modal=\"true\">
  <div class=\"modal-box\">
    <div class=\"modal-head\">
      <h2 class=\"modal-title\">✨ OCR M\u00e1gico (Leitura IA)</h2>
      <button class=\"modal-x\" onclick=\"closeModal('ocrModal')\">\u2715</button>
    </div>
    
    <div id=\"ocrUploadState\">
      <p style=\"color:var(--text-muted); margin-bottom:16px\">Fa\u00e7a o upload de uma Nota Fiscal (PDF, JPG, PNG) para extra\u00e7\u00e3o inteligente de dados.</p>
      
      <div class=\"ocr-drop-zone\" id=\"ocrDropZone\" onclick=\"document.getElementById('ocrFileInput').click()\">
        <div class=\"ocr-scanning-overlay\" id=\"ocrScanningOverlay\">
          <div class=\"laser-line\"></div>
          <span style=\"font-size:32px; margin-bottom:16px\">\ud83e\uddfe</span>
          <h3 style=\"color:var(--primary); font-family:monospace\">EXTRAINDO DADOS...</h3>
          <p style=\"font-family:monospace; color:#818cf8; font-size:12px; margin-top:8px\">Rede Neural Ativa: Reconhecendo padr\u00f5es fiscais</p>
        </div>
        
        <span class=\"ocr-icon-lg\">\ud83d\udce4</span>
        <h3 style=\"color:white\">Arraste e solte sua Nota Fiscal aqui</h3>
        <p style=\"color:var(--text-muted); margin-top:8px\">Ou clique para procurar (PDF, JPG, PNG)</p>
        <input type=\"file\" id=\"ocrFileInput\" style=\"display:none\" accept=\".pdf,image/*\" onchange=\"handleOCRFile(event)\">
      </div>
    </div>

    <div id=\"ocrReviewState\" style=\"display:none\">
      <div style=\"background:rgba(16,185,129,0.1); border:1px solid #10b981; border-radius:8px; padding:12px; margin-bottom:16px; display:flex; align-items:center; gap:12px\">
        <span style=\"font-size:24px\">\u2705</span>
        <div>
          <h4 style=\"color:#10b981; margin:0\">Leitura Conclu\u00edda com Sucesso</h4>
          <p style=\"font-size:12px; color:var(--text-muted); margin:0\">Confirme os dados extra\u00eddos antes de salvar no financeiro.</p>
        </div>
      </div>

      <div class=\"form-grid\">
        <div class=\"form-field span-2\">
          <label class=\"form-label\">Fornecedor / Descri\u00e7\u00e3o</label>
          <input type=\"text\" class=\"form-input\" id=\"ocrExtractedDesc\" value=\"Servi\u00e7os de Computa\u00e7\u00e3o em Nuvem - AWS\">
        </div>
        <div class=\"form-field\">
          <label class=\"form-label\">CNPJ</label>
          <input type=\"text\" class=\"form-input\" id=\"ocrExtractedCnpj\" value=\"23.413.399/0001-44\">
        </div>
        <div class=\"form-field\">
          <label class=\"form-label\">Valor (R$)</label>
          <input type=\"number\" class=\"form-input\" id=\"ocrExtractedAmount\" value=\"4530.00\" step=\"0.01\">
        </div>
        <div class=\"form-field\">
          <label class=\"form-label\">Data de Emiss\u00e3o</label>
          <input type=\"date\" class=\"form-input\" id=\"ocrExtractedDate\">
        </div>
        <div class=\"form-field\">
          <label class=\"form-label\">Categoria</label>
          <select class=\"form-input\" id=\"ocrExtractedCategory\">
            <option value=\"Tecnologia\">Tecnologia</option>
            <option value=\"Impostos\">Impostos</option>
            <option value=\"Folha de Pagamento\">Folha de Pagamento</option>
            <option value=\"Marketing\">Marketing</option>
            <option value=\"Infraestrutura\">Infraestrutura</option>
          </select>
        </div>
      </div>
      
      <div class=\"modal-foot\" style=\"margin-top:20px\">
        <button class=\"btn-ghost\" onclick=\"resetOCR()\">Descartar</button>
        <button class=\"btn-primary\" onclick=\"saveOCRTransaction()\">\ud83d\udcbe Salvar Despesa</button>
      </div>
    </div>

  </div>
</div>
"""
    # Fix the OCR button in finance view to actually open this modal
    finance_ocr_btn = r'<button class=\"btn-secondary\" onclick=\"alert(\'Inicializando OCR M\u00e1gico...\')\">\ud83e\uddfe Subir NFs (OCR IA)</button>'
    finance_ocr_btn_new = r'<button class=\"btn-secondary\" onclick=\"openOCRModal()\">\ud83e\uddfe Subir NFs (OCR IA)</button>'
    
    content = content.replace('<!-- ═══════════ MODAIS ═══════════ -->', ocr_modal_html)
    content = content.replace(finance_ocr_btn, finance_ocr_btn_new)

    with open('app/dashboard/page.js', 'w', encoding='utf-8') as f:
        f.write(content)

inject_ocr_modal()
print("OCR Modal Injected!")
