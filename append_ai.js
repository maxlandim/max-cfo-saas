
const fs = require("fs");
fs.appendFileSync("public/app.js", `
// Proactive AI Mock
setTimeout(() => {
  if(window.showToast) {
    window.showToast("CFO IA: Risco de ruptura no Estoque! (PRD-002)", "info");
  }
}, 8000);
`, "utf-8");
console.log("Added AI Mock!");

