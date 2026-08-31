import re

with open('frontend/js/components/sidebar.js', 'r') as f:
    content = f.read()

bad_logic = """        // Extraer e inyectar scripts
        const scripts = Array.from(doc.querySelectorAll('script'));
        scripts.forEach(oldScript => {
          if (oldScript.src) {
            if (!document.querySelector(`script[src="${oldScript.getAttribute('src')}"]`)) {
              const newScript = document.createElement('script');
              newScript.src = oldScript.src;
              document.body.appendChild(newScript);
            }
          }
        });
        
        // Notificar a la app que la página cambió
        const event = new CustomEvent('SPA:Navigated', { detail: { href: url.pathname } });
        document.dispatchEvent(event);"""

good_logic = """        // Extraer e inyectar CSS
        const stylesheets = Array.from(doc.querySelectorAll('link[rel="stylesheet"]'));
        stylesheets.forEach(oldLink => {
          if (!document.querySelector(`link[href="${oldLink.getAttribute('href')}"]`)) {
            const newLink = document.createElement('link');
            newLink.rel = 'stylesheet';
            newLink.href = oldLink.href;
            document.head.appendChild(newLink);
          }
        });

        // Extraer e inyectar scripts (esperando a que carguen)
        const scripts = Array.from(doc.querySelectorAll('script[src]'));
        const scriptPromises = [];
        
        scripts.forEach(oldScript => {
          if (!document.querySelector(`script[src="${oldScript.getAttribute('src')}"]`)) {
            const promise = new Promise((resolve) => {
              const newScript = document.createElement('script');
              newScript.src = oldScript.src;
              newScript.onload = resolve;
              newScript.onerror = resolve;
              document.body.appendChild(newScript);
            });
            scriptPromises.push(promise);
          }
        });
        
        if (scriptPromises.length > 0) {
          await Promise.all(scriptPromises);
        }
        
        // Notificar a la app que la página cambió
        const event = new CustomEvent('SPA:Navigated', { detail: { href: url.pathname } });
        document.dispatchEvent(event);"""

if bad_logic in content:
    content = content.replace(bad_logic, good_logic)
    with open('frontend/js/components/sidebar.js', 'w') as f:
        f.write(content)
    print("Fixed sidebar.js PJAX logic.")
else:
    print("Could not find bad logic block.")

