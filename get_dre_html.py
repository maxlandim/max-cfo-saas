
with open("app/dashboard/page.js", "r", encoding="utf-8") as f:
    content = f.read()

idx = content.find("view-reports")
print(content[idx:idx+400])

