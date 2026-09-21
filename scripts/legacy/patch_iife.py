import os
import re

files_to_patch = [
    'frontend/js/pages/dashboard.js',
    'frontend/js/pages/history-page.js',
    'frontend/js/pages/stats-page.js',
    'frontend/js/pages/admin-page.js',
    'frontend/js/pages/calendar-page.js',
    'frontend/js/pages/ai-page.js'
]

for filepath in files_to_patch:
    if not os.path.exists(filepath): continue
    with open(filepath, 'r') as f:
        content = f.read()
        
    if "(() => {" in content and "const init = async () => {" in content:
        # Check if already wrapped
        if content.find("(() => {") < content.find("const init = async () => {"):
            continue

    # Replace `const init = async () => {` with `(() => {\nconst init = async () => {`
    content = content.replace("const init = async () => {", "(() => {\nconst init = async () => {", 1)
    
    # Replace the end
    content = content.replace("document.addEventListener('SPA:Navigated', init);", "document.addEventListener('SPA:Navigated', init);\n})();", 1)
    
    with open(filepath, 'w') as f:
        f.write(content)
    print(f"Wrapped {filepath}")

