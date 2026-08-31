import re

with open('frontend/js/components/sidebar.js', 'r') as f:
    content = f.read()

# We need to find the script injection and add newScript.async = false;
bad = """              const newScript = document.createElement('script');
              newScript.src = oldScript.src;"""
              
good = """              const newScript = document.createElement('script');
              newScript.src = oldScript.src;
              newScript.async = false;"""

if bad in content:
    content = content.replace(bad, good)
    with open('frontend/js/components/sidebar.js', 'w') as f:
        f.write(content)
    print("Fixed script injection async order.")
else:
    print("Could not find script injection block.")
