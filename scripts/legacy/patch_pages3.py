import re
import sys

def patch_file(filepath, signature_id):
    with open(filepath, 'r') as f:
        content = f.read()

    match = re.search(r"document\.addEventListener\('DOMContentLoaded',\s*(?:async\s*)?\(\)\s*=>\s*\{", content)
    if not match: return
    
    start_idx = match.end() - 1
    brace_count = 0
    in_string = False
    string_char = ''
    end_idx = -1
    
    for i in range(start_idx, len(content)):
        c = content[i]
        
        # simple escaping fix
        if in_string:
            if c == string_char and content[i-1] != '\\':
                in_string = False
            continue
        if c in ['"', "'", '`']:
            in_string = True
            string_char = c
            continue
            
        # skip regex literals like /.../ if needed? We will just ignore for now.
            
        if c == '{':
            brace_count += 1
        elif c == '}':
            brace_count -= 1
            if brace_count == 0:
                end_idx = i
                break
                
    if end_idx != -1:
        closing_text = content[end_idx:end_idx+3]
        print(f"{filepath} closing: {closing_text}")
        
        # Even if it's not `});`, it could be `}\n);` or something. Let's just find the `)` and `;`
        
        # we will use regex to replace from end_idx to the next `;`
        after_brace = content[end_idx:]
        m2 = re.match(r"\}\s*\)\s*;", after_brace)
        if m2:
            real_end = end_idx + m2.end()
            new_closing = "};\ndocument.addEventListener('DOMContentLoaded', init);\ndocument.addEventListener('SPA:Navigated', init);\n"
            
            head = content[:match.start()]
            replacement = f"const init = async () => {{\n  if (!document.getElementById('{signature_id}')) return;\n"
            body = content[start_idx+1:end_idx]
            tail = content[real_end:]
            
            new_content = head + replacement + body + new_closing + tail
            
            with open(filepath, 'w') as f:
                f.write(new_content)
            print(f"Successfully patched {filepath}")

patch_file('frontend/js/pages/history-page.js', 'reservations-table')
patch_file('frontend/js/pages/admin-page.js', 'admin-page-title')
patch_file('frontend/js/pages/ai-page.js', 'ai-proposal')
