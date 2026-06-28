
import re

with open("app/dashboard/page.js", "r", encoding="utf-8") as f:
    content = f.read()

# We will inject date inputs before the print report button
search_str = """<div class=\\"page-header-actions\\">\\n          <button class=\\"btn-secondary\\""""
replace_str = """<div class=\\"page-header-actions\\" style=\\"display:flex;gap:10px;align-items:center\\">\\n          <input type=\\"date\\" id=\\"reportStartDate\\" class=\\"form-input\\" style=\\"width:auto\\">\\n          <input type=\\"date\\" id=\\"reportEndDate\\" class=\\"form-input\\" style=\\"width:auto\\">\\n          <button class=\\"btn-primary\\" onclick=\\"renderReports()\\">Filtrar</button>\\n          <button class=\\"btn-secondary\\""""

content = content.replace(search_str, replace_str)

with open("app/dashboard/page.js", "w", encoding="utf-8") as f:
    f.write(content)

print("Date inputs patched!")

