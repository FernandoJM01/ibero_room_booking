import re

with open('frontend/js/components/sidebar.js', 'r') as f:
    content = f.read()

old_promise = """            const promise = new Promise((resolve) => {
              const newScript = document.createElement('script');
              newScript.src = oldScript.src;
              newScript.onload = resolve;
              newScript.onerror = resolve;
              document.body.appendChild(newScript);
            });"""

new_promise = """            const promise = new Promise((resolve) => {
              const newScript = document.createElement('script');
              newScript.src = oldScript.src;
              newScript.onload = resolve;
              newScript.onerror = resolve;
              document.body.appendChild(newScript);
              // Fallback timeout just in case onload fails to fire
              setTimeout(resolve, 500);
            });"""

if old_promise in content:
    content = content.replace(old_promise, new_promise)
    with open('frontend/js/components/sidebar.js', 'w') as f:
        f.write(content)
    print("Fixed sidebar.js promise timeout.")
else:
    print("Could not find promise block.")
