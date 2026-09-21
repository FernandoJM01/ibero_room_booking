import re

with open('frontend/js/components/sidebar.js', 'r') as f:
    content = f.read()

# I will replace from `let _pjaxInitialized = false;` down to `window.addEventListener('popstate', () => {`
# to safely inject the new logic.

pattern = r"let _pjaxInitialized = false;\n  const _initPJAX = \(sidebarId\) => \{.*?(?=window\.addEventListener\('popstate', \(\) => \{)"
replacement = r"""let _pjaxInitialized = false;
  const _prefetchCache = {};

  const _initPJAX = (sidebarId) => {
    if (_pjaxInitialized) return;
    _pjaxInitialized = true;

    // --- PREFETCHING (Hover-to-fetch) ---
    document.addEventListener('mouseover', (e) => {
      const link = e.target.closest('.sidebar__nav .nav-item');
      if (!link) return;
      
      const href = link.getAttribute('href');
      if (!href || href.startsWith('http') || href.startsWith('#')) return;
      
      // No prefetch para sub-pestañas de admin si ya estamos en admin
      if (document.querySelector('.admin-tabs') && href.startsWith('admin.html#')) return;
      
      const url = new URL(href, window.location.origin);
      const key = url.pathname + url.search;
      
      if (!_prefetchCache[key]) {
        _prefetchCache[key] = fetch(url).then(r => {
          if (!r.ok) throw new Error('Prefetch failed');
          return r.text();
        }).catch(err => {
          delete _prefetchCache[key]; // Limpiar en error
          console.warn('Prefetch silencioso falló', err);
        });
      }
    });

    document.addEventListener('click', async (e) => {
      const link = e.target.closest('.sidebar__nav .nav-item');
      if (!link) return;
      
      const href = link.getAttribute('href');
      if (href.startsWith('http') || href.startsWith('#')) return;
      
      // Solución definitiva para las pestañas de Administración
      if (document.querySelector('.admin-tabs') && href.startsWith('admin.html#')) {
        e.preventDefault();
        const hash = href.split('#')[1];
        const tabIdMap = {
          'usuarios': 'tab-users', 'solicitudes': 'tab-requests',
          'calendario': 'tab-calendar', 'notificaciones': 'tab-notif', 'respaldos': 'tab-backup'
        };
        const tabBtn = document.getElementById(tabIdMap[hash]);
        if (tabBtn) tabBtn.click();
        else window.location.hash = '#' + hash;
        
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        if (sidebar) sidebar.classList.remove('is-open');
        if (overlay) overlay.classList.remove('is-visible');
        return;
      }

      const url = new URL(href, window.location.origin);
      const currentPath = window.location.pathname.replace(/\.html$/, '').replace(/\/$/, '');
      const targetPath = url.pathname.replace(/\.html$/, '').replace(/\/$/, '');
      
      if (currentPath === targetPath) {
        e.preventDefault();
        if (url.hash && window.location.hash !== url.hash) window.location.hash = url.hash;
        return;
      }
      
      e.preventDefault();
      
      try {
        const key = url.pathname + url.search;
        let html;
        
        // --- USAR PREFETCH O FETCH NORMAL ---
        if (_prefetchCache[key]) {
           html = await _prefetchCache[key];
        } else {
           const res = await fetch(url);
           if (!res.ok) throw new Error('Network error');
           html = await res.text();
        }
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        const newPageContent = doc.querySelector('.page-content');
        const currentPageContent = document.querySelector('.page-content');
        if (!newPageContent || !currentPageContent) {
           window.location.href = href;
           return;
        }

        // --- FUNCIÓN DE ACTUALIZACIÓN DEL DOM ---
        const performDOMUpdate = async () => {
          currentPageContent.innerHTML = newPageContent.innerHTML;
          
          if (!document.startViewTransition) {
            currentPageContent.classList.remove('animate-fade-up');
            void currentPageContent.offsetWidth; // trigger reflow
            currentPageContent.classList.add('animate-fade-up');
          } else {
            // View transition takes over, remove manual animation to avoid conflict
            currentPageContent.classList.remove('animate-fade-up');
          }
          
          history.pushState(null, '', url);
          
          document.title = doc.querySelector('title')?.innerText || '';
          const topbarTitle = doc.querySelector('.topbar__title');
          const currentTopbarTitle = document.querySelector('.topbar__title');
          if (topbarTitle && currentTopbarTitle) {
            currentTopbarTitle.innerHTML = topbarTitle.innerHTML;
          }
          
          document.querySelectorAll('.sidebar__nav .nav-item').forEach(el => {
             el.classList.remove('active');
             el.removeAttribute('aria-current');
          });
          link.classList.add('active');
          link.setAttribute('aria-current', 'page');
          
          // Inject CSS
          const stylesheets = Array.from(doc.querySelectorAll('link[rel="stylesheet"]'));
          stylesheets.forEach(oldLink => {
            if (!document.querySelector(`link[href="${oldLink.getAttribute('href')}"]`)) {
              const newLink = document.createElement('link');
              newLink.rel = 'stylesheet';
              newLink.href = oldLink.href;
              document.head.appendChild(newLink);
            }
          });

          // Inject Scripts
          const scripts = Array.from(doc.querySelectorAll('script[src]'));
          const scriptPromises = [];
          scripts.forEach(oldScript => {
            if (!document.querySelector(`script[src="${oldScript.getAttribute('src')}"]`)) {
              const promise = new Promise((resolve) => {
                const newScript = document.createElement('script');
                newScript.src = oldScript.src;
                newScript.async = false;
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
        };

        // --- VIEW TRANSITIONS API ---
        if (document.startViewTransition) {
          const transition = document.startViewTransition(() => performDOMUpdate());
          await transition.updateCallbackDone; 
          document.dispatchEvent(new CustomEvent('SPA:Navigated', { detail: { href: url.pathname } }));
        } else {
          await performDOMUpdate();
          document.dispatchEvent(new CustomEvent('SPA:Navigated', { detail: { href: url.pathname } }));
        }
        
      } catch (err) {
        console.error('PJAX Error:', err);
        window.location.href = href;
      }
    });
    
    """

if re.search(pattern, content, re.DOTALL):
    content = re.sub(pattern, replacement.replace('\\', '\\\\'), content, flags=re.DOTALL)
    print("Patched sidebar.js with View Transitions and Prefetch!")
else:
    print("Regex failed to find PJAX block.")

with open('frontend/js/components/sidebar.js', 'w') as f:
    f.write(content)

