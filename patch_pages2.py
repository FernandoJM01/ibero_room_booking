import re
import sys

def patch_file(filepath, signature_id):
    with open(filepath, 'r') as f:
        content = f.read()

    # Find the start of the DOMContentLoaded block
    match = re.search(r"document\.addEventListener\('DOMContentLoaded',\s*(?:async\s*)?\(\)\s*=>\s*\{", content)
    if not match: return
    
    start_idx = match.end() - 1 # points to the '{'
    
    # Find the matching closing bracket for this block
    brace_count = 0
    in_string = False
    string_char = ''
    end_idx = -1
    
    for i in range(start_idx, len(content)):
        c = content[i]
        
        # very basic string handling to avoid counting braces inside strings
        # ignores escaping for simplicity, assuming no weird braces in strings
        if in_string:
            if c == string_char and content[i-1] != '\\':
                in_string = False
            continue
        if c in ['"', "'", '`']:
            in_string = True
            string_char = c
            continue
            
        if c == '{':
            brace_count += 1
        elif c == '}':
            brace_count -= 1
            if brace_count == 0:
                end_idx = i
                break
                
    if end_idx != -1:
        # We found the block: content[start_idx:end_idx+1] is `{ ... }`
        # We need to replace the start, and replace the closing `});` which is `}` + `);`
        
        # Check if the next characters are `);`
        closing_text = content[end_idx:end_idx+3]
        if closing_text == '});':
            new_closing = "};\ndocument.addEventListener('DOMContentLoaded', init);\ndocument.addEventListener('SPA:Navigated', init);\n"
            
            # Construct new content
            head = content[:match.start()]
            replacement = f"const init = async () => {{\n  if (!document.getElementById('{signature_id}')) return;\n"
            body = content[start_idx+1:end_idx]
            tail = content[end_idx+3:]
            
            new_content = head + replacement + body + new_closing + tail
            
            with open(filepath, 'w') as f:
                f.write(new_content)
            print(f"Successfully patched {filepath}")
        else:
            print(f"Failed to find expected closing for {filepath}")

patch_file('frontend/js/pages/dashboard.js', 'stat-total')
patch_file('frontend/js/pages/history-page.js', 'reservations-table')
patch_file('frontend/js/pages/stats-page.js', 'kpi-grid')
patch_file('frontend/js/pages/admin-page.js', 'admin-page-title')
patch_file('frontend/js/pages/calendar-page.js', 'cal-body')
patch_file('frontend/js/pages/ai-page.js', 'ai-proposal')

