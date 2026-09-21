import re

with open('frontend/js/components/sidebar.js', 'r') as f:
    content = f.read()

bad = "if (document.getElementById('admin-page-title') && href.startsWith('admin.html#')) {"
good = "if (document.querySelector('.admin-tabs') && href.startsWith('admin.html#')) {"

if bad in content:
    content = content.replace(bad, good)
    print("Patched DOM check logic.")
else:
    print("Could not find bad string.")

with open('frontend/js/components/sidebar.js', 'w') as f:
    f.write(content)

