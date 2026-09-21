import sys

def p(file, sig):
    with open(file, 'r') as f:
        c = f.read()
    
    if "SPA:Navigated" in c: return
    
    c = c.replace("document.addEventListener('DOMContentLoaded', async () => {", f"const init = async () => {{\n  if (!document.getElementById('{sig}')) return;")
    
    parts = c.rsplit('});', 1)
    if len(parts) == 2:
        c = f"{parts[0]}}};\n\ndocument.addEventListener('DOMContentLoaded', init);\ndocument.addEventListener('SPA:Navigated', init);\n{parts[1]}"
        with open(file, 'w') as f:
            f.write(c)

p('frontend/js/pages/history-page.js', 'reservations-table')
p('frontend/js/pages/admin-page.js', 'admin-page-title')
p('frontend/js/pages/ai-page.js', 'ai-proposal')
