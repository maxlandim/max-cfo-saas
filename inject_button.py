import os
import re

with open('app/dashboard/page.js', 'r', encoding='utf-8') as f:
    content = f.read()

# The target HTML to replace
target = r"""<div class=\"page-header-actions\">
          <button class=\"btn-secondary\" onclick=\"exportCSV()\">\u2b07\ufe0f Exportar CSV</button>"""

# The replacement HTML including the OCR button
replacement = r"""<div class=\"page-header-actions\">
          <button class=\"btn-secondary\" onclick=\"openOCRModal()\">\ud83e\uddfe Subir NFs (OCR IA)</button>
          <button class=\"btn-secondary\" onclick=\"exportCSV()\">\u2b07\ufe0f Exportar CSV</button>"""

if "openOCRModal()" not in content:
    content = content.replace(target, replacement)
    print("Replaced header!")

with open('app/dashboard/page.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("DONE")
