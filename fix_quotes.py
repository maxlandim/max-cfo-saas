import os

with open('app/dashboard/page.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the start of the string
# from: <div dangerouslySetInnerHTML={{ __html: "\n\n<!-- SIDEBAR -->
# to:   <div dangerouslySetInnerHTML={{ __html: `\n\n<!-- SIDEBAR -->
content = content.replace(
    '<div dangerouslySetInnerHTML={{ __html: "\\n\\n<!-- SIDEBAR -->',
    '<div dangerouslySetInnerHTML={{ __html: `\\n\\n<!-- SIDEBAR -->'
)

# And replace the end of the string
# from: " }} />
# to:   ` }} />
content = content.replace(
    '" }} />',
    '` }} />'
)

with open('app/dashboard/page.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("page.js syntax fixed!")
