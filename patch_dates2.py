
with open("app/dashboard/page.js", "r", encoding="utf-8") as f:
    content = f.read()

search_str = "<div class=\"page-header-actions\">\\n          <button class=\"btn-secondary\" id=\"printReportBtn\""
replace_str = "<div class=\"page-header-actions\" style=\"display:flex;gap:10px;align-items:center;\">\\n          <input type=\"date\" id=\"reportStartDate\" class=\"form-input\" style=\"width:auto\" title=\"Data Inicial\">\\n          <input type=\"date\" id=\"reportEndDate\" class=\"form-input\" style=\"width:auto\" title=\"Data Final\">\\n          <button class=\"btn-primary\" onclick=\"renderReports()\">Filtrar</button>\\n          <button class=\"btn-secondary\" id=\"printReportBtn\""

content = content.replace(search_str, replace_str)

with open("app/dashboard/page.js", "w", encoding="utf-8") as f:
    f.write(content)

print("Date inputs patched successfully!")

