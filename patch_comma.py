
with open("public/engine.js", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("    };\n  },\n\n  analyzeCompany(cnpj, name) {", "    };\n  }\n\n  analyzeCompany(cnpj, name) {")

with open("public/engine.js", "w", encoding="utf-8") as f:
    f.write(content)

print("Comma removed!")

