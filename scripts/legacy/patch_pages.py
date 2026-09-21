import os
import re

def patch_file(filepath, signature_id):
    if not os.path.exists(filepath): return
    with open(filepath, 'r') as f:
        content = f.read()
    
    # If already patched, skip
    if 'SPA:Navigated' in content: return

    # Replace `document.addEventListener('DOMContentLoaded', async () => {`
    # or `document.addEventListener('DOMContentLoaded', () => {`
    
    pattern = r"document\.addEventListener\('DOMContentLoaded',\s*(?:async\s*)?\(\)\s*=>\s*\{"
    
    replacement = f"""const init = async () => {{
  if (!document.getElementById('{signature_id}')) return;
"""
    new_content = re.sub(pattern, replacement, content, count=1)
    
    if new_content != content:
        # find last `});`
        last_idx = new_content.rfind('});')
        if last_idx != -1:
            new_content = new_content[:last_idx] + "};\n\ndocument.addEventListener('DOMContentLoaded', init);\ndocument.addEventListener('SPA:Navigated', init);\n" + new_content[last_idx+3:]
        
        with open(filepath, 'w') as f:
            f.write(new_content)
        print(f"Patched {filepath}")

patch_file('frontend/js/pages/dashboard.js', 'stat-total')
patch_file('frontend/js/pages/history-page.js', 'reservations-table')
patch_file('frontend/js/pages/stats-page.js', 'kpi-grid')
patch_file('frontend/js/pages/admin-page.js', 'admin-page-title')
patch_file('frontend/js/pages/calendar-page.js', 'cal-body')
patch_file('frontend/js/pages/ai-page.js', 'ai-proposal')

