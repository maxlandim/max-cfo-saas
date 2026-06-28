import os

fp = r'C:\Users\tamir\.gemini\antigravity\scratch\max-cfo-saas\public\app.js'
with open(fp, 'r', encoding='utf-8') as f:
    js = f.read()

pdf_code = """
// PDF Export Feature
async function exportToPDF(elementId, filename) {
  const el = document.getElementById(elementId);
  if (!el) return;
  
  if (!window.html2pdf) {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
    document.head.appendChild(script);
    await new Promise(r => script.onload = r);
  }
  
  const opt = {
    margin: 10,
    filename: filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };
  
  showToast('Gerando PDF...', 'info');
  html2pdf().set(opt).from(el).save().then(() => {
    showToast('PDF exportado com sucesso!', 'success');
  });
}
"""

js = js.replace(
    "document.getElementById('printReportBtn').style.display = 'inline-block';",
    "document.getElementById('printReportBtn').style.display = 'inline-block';\n  document.getElementById('printReportBtn').textContent = '📄 Exportar PDF';\n  document.getElementById('printReportBtn').onclick = () => exportToPDF('reportOutput', 'MAX_CFO_Relatorio.pdf');"
)

js += "\n" + pdf_code

with open(fp, 'w', encoding='utf-8') as f:
    f.write(js)
print("PDF export added to app.js")
