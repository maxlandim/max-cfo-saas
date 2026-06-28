
import re

with open("public/app.js", "r", encoding="utf-8") as f:
    content = f.read()

# Fix consultarEmpresa
new_consultar = """async function consultarEmpresa(forceName = "") {
  const inp = document.getElementById("cnpjInput");
  const val = inp?.value.trim();
  if (!val) return showToast("Informe um CPF, CNPJ ou Nome", "error");

  const btn = document.getElementById("analyzeBtn");
  if (btn) { btn.textContent = "? Analisando..."; btn.disabled = true; }

  const rawDigits = val.replace(/\D/g, "");
  const isCnpj = rawDigits.length === 14;
  const isCpf = rawDigits.length === 11;
  const documentType = isCnpj ? "CNPJ" : (isCpf ? "CPF" : "Documento");
  
  const formattedDoc = isCnpj 
    ? val 
    : (isCpf ? val : "00.000.000/0001-00");
    
  const name = forceName || (rawDigits.length > 0 ? `${documentType} ${formattedDoc}` : val);

  let result;
  
  try {
    if (isCnpj) {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${rawDigits}`);
      if (response.ok) {
        const data = await response.json();
        result = engine.analyzeRealCompany(data);
      } else {
        throw new Error("API Error");
      }
    } else {
      throw new Error("Fallback to mock");
    }
  } catch (err) {
    result = engine.analyzeCreditRisk(rawDigits, name, documentType);
  }

  const sc = result.score;
  const color = sc >= 70 ? "var(--success)" : sc >= 45 ? "var(--warning)" : "var(--danger)";
  const resultName = result.isReal ? (result.name || name) : name;

  setHtml("companyMainCard", `
    <div class="company-header-info" style="margin-bottom:20px">
      <div class="company-icon">${isCpf ? "??" : "??"}</div>
      <div>
        <div class="company-cname">${escHtml(resultName)}</div>
        <div class="company-cnpj-text">${documentType}: ${formattedDoc} &nbsp;|&nbsp; Abertura/Registro: ${result.data_abertura ? fmtDate(result.data_abertura) : "N/D"} (${result.idade || ""})</div>
      </div>
    </div>
"""

# We need to replace from "async function consultarEmpresa" until the end of the setHtml("companyMainCard", `...`) block
# This is tricky using regex, let us find the start and end indices.

start_idx = content.find("async function consultarEmpresa(")
end_idx = content.find("    <div class=\"company-details-grid\"", start_idx)

if start_idx != -1 and end_idx != -1:
    content = content[:start_idx] + new_consultar + content[end_idx:]
    with open("public/app.js", "w", encoding="utf-8") as f:
        f.write(content)
    print("consultarEmpresa patched successfully!")
else:
    print("Could not find the bounds for consultarEmpresa")

