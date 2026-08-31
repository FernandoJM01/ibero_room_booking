import re

with open('frontend/js/components/sidebar.js', 'r') as f:
    content = f.read()

bad = """              document.body.appendChild(newScript);
              // Fallback timeout just in case onload fails to fire
              setTimeout(resolve, 500);
            });"""
            
good = """              document.body.appendChild(newScript);
            });"""

if bad in content:
    content = content.replace(bad, good)
    with open('frontend/js/components/sidebar.js', 'w') as f:
        f.write(content)
    print("Fixed timeout issue.")
else:
    print("Could not find timeout block.")
