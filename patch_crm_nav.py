
with open("app/dashboard/page.js", "r", encoding="utf-8") as f:
    content = f.read()

search_str = "<div class=\"nav-section-label\">GESTÃO</div>\n    <a class=\"nav-item\" data-view=\"finance\" id=\"nav-finance\">"
replace_str = "<div class=\"nav-section-label\">GESTÃO</div>\n    <a class=\"nav-item\" data-view=\"crm\" id=\"nav-crm\">\n      <span class=\"nav-icon\">??</span><span class=\"nav-label\">CRM & Vendas</span>\n    </a>\n    <a class=\"nav-item\" data-view=\"inventory\" id=\"nav-inventory\">\n      <span class=\"nav-icon\">??</span><span class=\"nav-label\">Estoque</span>\n    </a>\n    <a class=\"nav-item\" data-view=\"finance\" id=\"nav-finance\">"

content = content.replace(search_str, replace_str)

with open("app/dashboard/page.js", "w", encoding="utf-8") as f:
    f.write(content)

print("Nav items added!")

