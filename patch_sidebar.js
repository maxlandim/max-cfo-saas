const fs = require('fs');
let content = fs.readFileSync('app/dashboard/page.js', 'utf8');

if (!content.includes('id=\\"nav-crm\\"')) {
  content = content.replace(
    /id=\\"nav-settings\\">[\s\S]*?<\\\/a>/,
    `$&\\n    <div class=\\"nav-section-label\\">MÓDULOS<\\\/div>\\n    <a class=\\"nav-item\\" data-view=\\"crm\\" id=\\"nav-crm\\">\\n      <span class=\\"nav-icon\\">💼<\\\/span><span class=\\"nav-label\\">CRM & Vendas<\\\/span>\\n    <\\\/a>\\n    <a class=\\"nav-item\\" data-view=\\"inventory\\" id=\\"nav-inventory\\">\\n      <span class=\\"nav-icon\\">📦<\\\/span><span class=\\"nav-label\\">Estoque<\\\/span>\\n    <\\\/a>`
  );
}

fs.writeFileSync('app/dashboard/page.js', content);
console.log('Sidebar patch complete.');
