
import re

with open("public/app.js", "r", encoding="utf-8") as f:
    content = f.read()

func = """
window.renderReports = function() {
  const activeTile = document.querySelector(".active-tile");
  if (activeTile) {
    activeTile.click();
  } else {
    showToast("Selecione um relatório primeiro", "info");
  }
};
"""

if "window.renderReports" not in content:
    with open("public/app.js", "a", encoding="utf-8") as f:
        f.write(func)

print("renderReports added!")

