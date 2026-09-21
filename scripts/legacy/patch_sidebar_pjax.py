import re

with open('frontend/js/components/sidebar.js', 'r') as f:
    content = f.read()

bad = """      // Si ya estamos en esta URL, no interceptar (permitir navegación por ancla nativa)
      const url = new URL(href, window.location.origin);
      if (window.location.pathname === url.pathname) return;
      
      e.preventDefault();"""

good = """      const url = new URL(href, window.location.origin);
      
      // Normalizar rutas para ignorar diferencias en servidores de producción (ej. /admin vs /admin.html)
      const currentPath = window.location.pathname.replace(/\.html$/, '').replace(/\/$/, '');
      const targetPath = url.pathname.replace(/\.html$/, '').replace(/\/$/, '');
      
      // Si la página de destino es la misma que la actual
      if (currentPath === targetPath) {
        e.preventDefault(); // Prevenir recarga nativa del navegador
        
        // Si hay un ancla, navegar manualmente para detonar el evento hashchange
        if (url.hash && window.location.hash !== url.hash) {
          window.location.hash = url.hash;
        }
        return; // Detener el router PJAX
      }
      
      e.preventDefault();"""

if bad in content:
    content = content.replace(bad, good)
    print("Patched sidebar PJAX.")
else:
    print("Could not find PJAX block.")

with open('frontend/js/components/sidebar.js', 'w') as f:
    f.write(content)
