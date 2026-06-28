
with open("public/engine.js", "r", encoding="utf-8") as f:
    content = f.read()

# Replace analyzeCompany with analyzeCreditRisk
old_func = """  analyzeCompany(cnpj, name) {"""
new_func = """  analyzeCreditRisk(document_digits, name, docType) {
    // Fallback determinístico e Mock de Risco de Crédito (CPF/CNPJ)
    const hash = document_digits.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    const score = 30 + (hash % 50);
    const riskLevel = score >= 70 ? "Baixo" : score >= 45 ? "Moderado" : "Alto";
    const emoji = score >= 70 ? "??" : score >= 45 ? "??" : "??";
    
    // Simulação de restrições CADIN/Serasa dependendo do Score
    const restricoes = [];
    if (score < 50) restricoes.push("Apontamento Serasa");
    if (score < 60 && docType === "CNPJ") restricoes.push("Pendência CADIN");
    if (score < 40) restricoes.push("Protestos em Cartório");

    return {
      isReal: false,
      name: name,
      status: restricoes.length > 0 ? "Com Restrições" : "Regular",
      capital_social: 0,
      data_abertura: "",
      idade: "N/D",
      sector: "Não identificado (simulação)",
      natureza_juridica: docType === "CPF" ? "Pessoa Física" : "Pessoa Jurídica",
      endereco: "",
      contatos: "",
      qsa: [],
      cnaes_secundarios: [],
      score: score,
      riskLevel: riskLevel,
      restricoes: restricoes,
      docType: docType
    };
  },
  
  // Keep original analyzeCompany for any other internal reference just in case
  analyzeCompany(cnpj, name) {"""

content = content.replace(old_func, new_func)

with open("public/engine.js", "w", encoding="utf-8") as f:
    f.write(content)

print("engine.js patched!")

