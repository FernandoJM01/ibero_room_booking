import re

with open('frontend/js/components/sidebar.js', 'r') as f:
    content = f.read()

bad = """      e.preventDefault();
      
      // Si ya estamos en esta URL, no hacer nada
      const url = new URL(href, window.location.origin);
      if (window.location.pathname === url.pathname) return;"""
      
good = """      // Si ya estamos en esta URL, no interceptar (permitir navegación por ancla nativa)
      const url = new URL(href, window.location.origin);
      if (window.location.pathname === url.pathname) return;
      
      e.preventDefault();"""

if bad in content:
    content = content.replace(bad, good)
    with open('frontend/js/components/sidebar.js', 'w') as f:
        f.write(content)
    print("Fixed PJAX same-page hash navigation.")
else:
    print("Could not find the block to fix.")
