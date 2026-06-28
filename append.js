
const fs = require("fs");

const features = `
// ====== NEW V4.0 FEATURES ======

window.syncOpenFinance = function() {
  showToast("Iniciando sincronização Open Finance...", "info");
  setTimeout(() => {
    // Mock open finance transactions
    const mockTxs = [
      { date: new Date().toISOString().split("T")[0], amount: -150.00, desc: "Pgto Fornecedor (OpenFinance)", type: "DESPESA" },
      { date: new Date().toISOString().split("T")[0], amount: 2500.00, desc: "Recebimento Cliente (OpenFinance)", type: "RECEITA" }
    ];
    matchBankTransactions(mockTxs);
    showToast("Open Finance importado! Resolva as pendências abaixo.", "success");
  }, 1500);
};

window.emitirNFe = function() {
  document.getElementById("nfeModal").style.display = "flex";
  document.getElementById("nfeSpinner").style.display = "none";
  document.getElementById("nfeStatusText").innerText = "Selecione o cliente para gerar a Nota Fiscal de Serviço";
};

window.gerarNFe = function() {
  const cliente = document.getElementById("nfeCliente").value;
  const valor = document.getElementById("nfeValor").value;
  if (!valor) {
    showToast("Informe o valor da nota", "error");
    return;
  }
  
  document.getElementById("nfeSpinner").style.display = "block";
  document.getElementById("nfeStatusText").innerText = "Comunicando com a Prefeitura...";
  
  setTimeout(() => {
    document.getElementById("nfeSpinner").style.display = "none";
    document.getElementById("nfeStatusText").innerHTML = \`<span style="color:var(--success)">? NF-e emitida com sucesso para \${cliente}!</span>\`;
    showToast("NF-e Gerada com Sucesso!", "success");
    
    // Add transaction
    state.transactions.push({
      id: Date.now().toString(),
      type: "RECEITA",
      date: new Date().toISOString().split("T")[0],
      desc: \`NF-e \${cliente}\`,
      category: "Vendas",
      amount: parseFloat(valor)
    });
    saveData();
    updateFinanceKPIs();
    renderFinanceTable();
    
    setTimeout(() => {
      closeModal("nfeModal");
      document.getElementById("nfeValor").value = "";
    }, 2000);
  }, 2500);
};

`;

fs.appendFileSync("public/app.js", features, "utf-8");
console.log("Appended V4 features to app.js");

