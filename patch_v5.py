import re

with open('frontend/js/components/sidebar.js', 'r') as f:
    content = f.read()

bad = """      const url = new URL(href, window.location.origin);
      
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
      }"""

good = """      // Solución definitiva para las pestañas de Administración en producción:
      // Si el enlace es de administración y ya estamos en la página de administración (comprobado vía DOM)
      if (document.getElementById('admin-page-title') && href.startsWith('admin.html#')) {
        e.preventDefault();
        
        const hash = href.split('#')[1]; // ej. 'usuarios'
        const tabIdMap = {
          'usuarios': 'tab-users',
          'solicitudes': 'tab-requests',
          'calendario': 'tab-calendar',
          'notificaciones': 'tab-notif',
          'respaldos': 'tab-backup'
        };
        
        // Emular exactamente el comportamiento de la barra interna superior
        const tabBtn = document.getElementById(tabIdMap[hash]);
        if (tabBtn) {
          tabBtn.click();
        } else {
          window.location.hash = '#' + hash;
        }
        
        // Cerrar el menú lateral en móviles
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        if (sidebar) sidebar.classList.remove('is-open');
        if (overlay) overlay.classList.remove('is-visible');
        
        return; // Detener el router PJAX por completo
      }

      const url = new URL(href, window.location.origin);
      
      // Normalizar rutas para ignorar diferencias en servidores de producción (ej. /admin vs /admin.html)
      const currentPath = window.location.pathname.replace(/\.html$/, '').replace(/\/$/, '');
      const targetPath = url.pathname.replace(/\.html$/, '').replace(/\/$/, '');
      
      // Fallback para otros enlaces de la misma página
      if (currentPath === targetPath) {
        e.preventDefault();
        if (url.hash && window.location.hash !== url.hash) {
          window.location.hash = url.hash;
        }
        return;
      }"""

# The warning was due to regex escapes in python strings, use raw string for bad
import ast

bad_raw = r"""      const url = new URL(href, window.location.origin);
      
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
      }"""

if bad_raw in content:
    content = content.replace(bad_raw, good)
    print("Patched sidebar PJAX with DOM validation.")
else:
    print("Could not find PJAX block. Trying fallback search.")
    if "const currentPath =" in content:
        print("Found partial match, need manual adjustment")

with open('frontend/js/components/sidebar.js', 'w') as f:
    f.write(content)
