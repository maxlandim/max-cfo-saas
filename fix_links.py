import re

def fix_links():
    with open('app/dashboard/page.js', 'r', encoding='utf-8') as f:
        content = f.read()

    # The string is escaped inside the JSX, so it looks like:
    # href=\"/dashboard/fintech\"
    content = content.replace('href=\\"/dashboard/fintech\\"', 'data-view=\\"fintech\\"')
    content = content.replace('href=\\"/dashboard/inventory\\"', 'data-view=\\"inventory\\"')

    with open('app/dashboard/page.js', 'w', encoding='utf-8') as f:
        f.write(content)

fix_links()
print("Links fixed")
