import re

with open('frontend/js/components/sidebar.js', 'r') as f:
    content = f.read()

# 1. Add _initPJAX to init
content = content.replace('_initMobileToggle(mountId);', '_initMobileToggle(mountId);\n    _initPJAX(mountId);')

# 2. Add _initPJAX implementation
pjax_code = """
  /* ── PJAX SPA ROUTER ── */
  let _pjaxInitialized = false;
  const _initPJAX = (sidebarId) => {
    if (_pjaxInitialized) return;
    _pjaxInitialized = true;

    document.addEventListener('click', async (e) => {
      const link = e.target.closest('.sidebar__nav .nav-item');
      if (!link) return;
      
      const href = link.getAttribute('href');
      // Ignorar enlaces externos o anclas locales
      if (href.startsWith('http') || href.startsWith('#')) return;
      
      e.preventDefault();
      
      // Si ya estamos en esta URL, no hacer nada
      const url = new URL(href, window.location.origin);
      if (window.location.pathname === url.pathname) return;
      
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error('Network response was not ok');
        const html = await res.text();
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Extraer contenido principal
        const newPageContent = doc.querySelector('.page-content');
        if (!newPageContent) {
           window.location.href = href;
           return;
        }
        
        const currentPageContent = document.querySelector('.page-content');
        if (!currentPageContent) {
           window.location.href = href;
           return;
        }

        currentPageContent.innerHTML = newPageContent.innerHTML;
        
        // Reiniciar animaciones
        currentPageContent.classList.remove('animate-fade-up');
        void currentPageContent.offsetWidth; // trigger reflow
        currentPageContent.classList.add('animate-fade-up');
        
        // Actualizar URL
        history.pushState(null, '', url);
        
        // Actualizar título de la ventana y topbar
        document.title = doc.querySelector('title')?.innerText || '';
        const topbarTitle = doc.querySelector('.topbar__title');
        const currentTopbarTitle = document.querySelector('.topbar__title');
        if (topbarTitle && currentTopbarTitle) {
          currentTopbarTitle.innerHTML = topbarTitle.innerHTML;
        }
        
        // Actualizar activo en sidebar
        document.querySelectorAll('.sidebar__nav .nav-item').forEach(el => {
           el.classList.remove('active');
           el.removeAttribute('aria-current');
        });
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
        
        // Extraer e inyectar scripts
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
        document.dispatchEvent(event);
        
      } catch (err) {
        console.error('PJAX Error:', err);
        window.location.href = href; // fallback nativo
      }
    });
    
    window.addEventListener('popstate', () => {
      window.location.reload();
    });
  };

  /* ── UPDATE ACTIVE ── */"""

content = content.replace('  /* ── UPDATE ACTIVE ── */', pjax_code)

with open('frontend/js/components/sidebar.js', 'w') as f:
    f.write(content)
