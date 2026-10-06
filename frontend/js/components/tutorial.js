/* ============================================================
   TUTORIAL.JS — Tutorial interactivo con spotlight
   Plataforma Reservación Sala de Juntas · Ibero CDMX
   ============================================================ */

const Tutorial = (() => {

  const STORAGE_KEY = 'sjibero_tutorial_v2';   // bumped: the tour was rewritten, everyone sees it once more
  const PAD         = 10;   // px padding around spotlight
  const GAP         = 14;   // px gap between spotlight and tooltip

  /* ── SVG icons ─────────────────────────────────────────── */
  const _I = {
    welcome:  `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
    stats:    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
    calendar: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
    form:     `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
    week:     `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="9" x2="9" y2="21"/></svg>`,
    move:     `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="5 9 2 12 5 15"/><polyline points="9 5 12 2 15 5"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="22"/></svg>`,
    copy:     `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
    upcoming: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    nav:      `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`,
    room:     `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/></svg>`,
    mail:     `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>`,
    done:     `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  };

  /* ── Steps ─────────────────────────────────────────────── */
  // Basic tour only: the manuals (docs/manual/*.pdf) hold the detail. One list per role.
  // `target` is a CSS selector; if it matches several elements (e.g. the room picker exists in the topbar AND in
  // the calendar card, one of them hidden by the layout) the first VISIBLE one is used; if none, the tip is centred.

  const _SECRETARY = [
    {
      target: null, position: 'center', icon: _I.welcome,
      title: 'Bienvenida al sistema de reservaciones',
      body:  `Aquí registras y administras las reservaciones de la <strong>Sala de Juntas</strong> para los académicos y para personas externas.
<div class="tut__tip">Este recorrido de 9 pasos te da lo básico. El detalle está en los manuales. Puedes repetirlo cuando quieras con el botón <strong>?</strong> de la barra superior.</div>`,
    },
    {
      target: '#sidebar', position: 'right', icon: _I.nav,
      title: 'Menú lateral',
      body:  `<ul class="tut__list">
  <li><strong>Reservar</strong> — el calendario donde creas reservaciones</li>
  <li><strong>Historial</strong> y <strong>Estadísticas</strong></li>
  <li><strong>Administración</strong> — usuarios, festivos y cierres, notificaciones</li>
</ul>
Quien es Super Administrador ve además <strong>Salas</strong> y <strong>Respaldos</strong>.`,
    },
    {
      target: '[data-room-select]', position: 'bottom', icon: _I.room,
      title: 'Elige la sala',
      body:  'Cada sala tiene su propio calendario. Lo que reserves quedará en la <strong>sala que estés viendo</strong>.',
    },
    {
      target: '.calendar-widget__header', position: 'bottom', icon: _I.week,
      onEnter: () => document.getElementById('view-month')?.click(),
      title: 'Lee el calendario',
      body:  `<strong>Mes</strong> te da el panorama y <strong>Semana</strong> muestra las horas. Muévete con las flechas y <strong>Hoy</strong>.
<div class="tut__tip">Los colores se explican en la leyenda, debajo del calendario.</div>`,
    },
    {
      target: '#calendar-body', position: 'top', icon: _I.calendar,
      title: 'Crea una reservación',
      body:  `En <strong>Mes</strong>, haz clic en un día. En <strong>Semana</strong>, arrastra sobre las horas.
Se abre el formulario: <strong>responsable</strong> (persona del sistema o contacto externo), nombre de la junta, sala, horario y observaciones.
<div class="tut__tip">Si el horario ya está ocupado, el sistema avisa <strong>«Traslape»</strong> y no guarda.</div>`,
    },
    {
      target: '#calendar-body', position: 'top', icon: _I.copy,
      title: 'Reservaciones recurrentes',
      body:  `En el formulario activa <strong>Recurrente</strong> para crear una serie (diaria, semanal, quincenal o mensual). Las series se ven en <strong>morado</strong>.
<div class="tut__tip">El responsable recibe <strong>un solo correo</strong> con todas las fechas. Para mover o cancelar puedes elegir <strong>solo esa fecha</strong> o <strong>toda la serie</strong>.</div>`,
    },
    {
      target: '#calendar-body', position: 'top', icon: _I.form,
      title: 'Ver, editar y cancelar',
      body:  'Haz clic en una reservación para ver su detalle. Desde ahí puedes <strong>editarla</strong> o <strong>cancelarla</strong>.',
    },
    {
      target: '.cal-legend', position: 'top', icon: _I.calendar,
      title: 'Festivos y cierres',
      body:  `Un <strong>día festivo</strong> solo se resalta: <strong>sí se puede reservar</strong>. Un <strong>cierre institucional</strong> bloquea el día: no admite reservaciones.
<div class="tut__tip">Se administran en <strong>Administración › Festivos / Cierres</strong>.</div>`,
    },
    {
      target: '#sidebar-nav-historial', position: 'right', icon: _I.mail,
      title: 'Historial y correos',
      body:  `<strong>Historial</strong> lista las reservaciones activas y canceladas, con filtros y exportación. <strong>Ver cambios</strong> muestra quién modificó qué y cuándo.
<div class="tut__tip">El responsable recibe un correo al crear, cambiar o cancelar su reservación (uno solo por serie). Tú recibes aviso si otra persona modifica una reservación que creaste.</div>`,
    },
  ];

  const _ACADEMIC = [
    {
      target: null, position: 'center', icon: _I.welcome,
      title: 'Bienvenido al sistema de reservaciones',
      body:  `Aquí consultas el <strong>calendario de la Sala de Juntas</strong>, tus reservaciones y tu historial. Las reservaciones las registra la secretaría.
<div class="tut__tip">Este recorrido de 7 pasos te da lo básico. El detalle está en el manual. Puedes repetirlo con el botón <strong>?</strong> de la barra superior.</div>`,
    },
    {
      target: '[data-room-select]', position: 'bottom', icon: _I.room,
      title: 'Elige la sala',
      body:  'Cada sala tiene su propio calendario. Cambia de sala aquí para ver cuándo está libre u ocupada.',
    },
    {
      target: '.cal-view-toggle', position: 'bottom', icon: _I.week,
      onEnter: () => document.getElementById('view-month')?.click(),
      title: 'Mes y Semana',
      body:  '<strong>Mes</strong> te da el panorama y <strong>Semana</strong> muestra las horas. Muévete con las flechas y el botón <strong>Hoy</strong>.',
    },
    {
      target: '.cal-grid-container', position: 'top', icon: _I.calendar,
      title: 'Qué ves en el calendario',
      body:  `Tus reservaciones aparecen con su detalle. Las de otras personas se muestran como <strong>«Ocupado»</strong>, sin nombres ni motivos.
<div class="tut__tip">También ves los <strong>festivos</strong> y los <strong>cierres institucionales</strong>; la leyenda está debajo del calendario.</div>`,
    },
    {
      target: '.cal-grid-container', position: 'top', icon: _I.form,
      title: 'El detalle de tu reservación',
      body:  'Haz clic en una de tus reservaciones para ver su detalle. Es <strong>solo lectura</strong>: no puedes editarla desde aquí.',
    },
    {
      target: '#sidebar-nav-historial', position: 'right', icon: _I.upcoming,
      title: 'Historial',
      body:  'Aquí ves todas tus reservaciones, si siguen <strong>activas</strong> o fueron <strong>canceladas</strong>, y puedes filtrarlas.',
    },
    {
      target: '#profile-dropdown-btn', position: 'right', icon: _I.mail,
      title: 'Pedir una reservación y tu cuenta',
      body:  `Para <strong>reservar, cambiar o cancelar</strong>, contacta a la secretaría: ella lo registra y recibes un correo (uno solo por serie).
<div class="tut__tip">Cambia tu contraseña desde este menú de tu perfil. Si la olvidas, usa <strong>«¿Olvidaste tu contraseña?»</strong> al iniciar sesión.</div>`,
    },
  ];

  let _steps = _SECRETARY;
  const _stepsForRole = () => {
    let role = 'secretaria';
    try { role = (typeof Store !== 'undefined' && Store.getUser && Store.getUser()?.role) || role; } catch (_) { /* default */ }
    return role === 'academico' ? _ACADEMIC : _SECRETARY;
  };

  /* ── State ─────────────────────────────────────────────── */
  let _step      = 0;
  let _active    = false;
  let _blocker   = null;
  let _spotlight = null;
  let _tooltip   = null;
  let _onResize  = null;
  let _onKey     = null;

  /* ════════════════════════════════════════
     PUBLIC API
     ════════════════════════════════════════ */

  const start = () => {
    if (_active) return;
    _active = true;
    _step   = 0;
    _steps  = _stepsForRole();
    _mount();
    _showStep(0);
  };

  const stop = () => {
    if (!_active) return;
    _active = false;
    _blocker?.remove();
    _spotlight?.remove();
    _tooltip?.remove();
    _blocker = _spotlight = _tooltip = null;
    if (_onResize) window.removeEventListener('resize', _onResize);
    if (_onKey)    document.removeEventListener('keydown', _onKey);
    localStorage.setItem(STORAGE_KEY, '1');
  };

  /** Show automatically on first ever visit. */
  const autoStart = () => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setTimeout(start, 900);
    }
  };

  /* ════════════════════════════════════════
     DOM SETUP
     ════════════════════════════════════════ */

  const _mount = () => {
    _blocker = Object.assign(document.createElement('div'), { id: 'tutorial-blocker' });
    document.body.appendChild(_blocker);

    _spotlight = Object.assign(document.createElement('div'), { id: 'tutorial-spotlight' });
    _spotlight.classList.add('is-hidden');
    document.body.appendChild(_spotlight);

    _tooltip = Object.assign(document.createElement('div'), { id: 'tutorial-tooltip' });
    document.body.appendChild(_tooltip);

    _onResize = () => { if (_active) _showStep(_step); };
    window.addEventListener('resize', _onResize);

    _onKey = (e) => {
      if (!_active) return;
      if (e.key === 'Escape')                          stop();
      if (e.key === 'ArrowRight' || e.key === 'Enter') _next();
      if (e.key === 'ArrowLeft')                       _prev();
    };
    document.addEventListener('keydown', _onKey);
  };

  /* ════════════════════════════════════════
     STEP RENDERING
     ════════════════════════════════════════ */

  const _showStep = (idx) => {
    const step    = _steps[idx];
    const isFirst = idx === 0;
    const isLast  = idx === _steps.length - 1;

    // Run optional step hook (e.g. switch to weekly view)
    step.onEnter?.();

    /* ── Spotlight ── */
    const targetEl = _findTarget(step.target);
    const visible  = _isVisible(targetEl);

    if (visible) {
      const r = targetEl.getBoundingClientRect();
      _spotlight.classList.remove('is-hidden');
      Object.assign(_spotlight.style, {
        top:    `${r.top    - PAD}px`,
        left:   `${r.left   - PAD}px`,
        width:  `${r.width  + PAD * 2}px`,
        height: `${r.height + PAD * 2}px`,
      });
    } else {
      _spotlight.classList.add('is-hidden');
      Object.assign(_spotlight.style, { top: '50%', left: '50%', width: '0', height: '0' });
    }

    /* ── Tooltip ── */
    const isCenter = step.position === 'center' || !visible;
    _tooltip.className = isCenter ? 'is-centered' : '';

    // Replay animation on each step change
    _tooltip.style.animation = 'none';
    void _tooltip.offsetWidth;
    _tooltip.style.animation = '';

    const dots = _steps.map((_, i) => {
      const cls = i === idx ? 'is-active' : (i < idx ? 'is-done' : '');
      return `<span class="tut__dot ${cls}"></span>`;
    }).join('');

    _tooltip.innerHTML = `
      <div class="tut__header">
        <div class="tut__header-icon" aria-hidden="true">${step.icon}</div>
        <div class="tut__header-title">${step.title}</div>
      </div>
      <div class="tut__body">${step.body}</div>
      <div class="tut__footer">
        <div class="tut__progress"
             role="progressbar"
             aria-valuenow="${idx + 1}" aria-valuemin="1" aria-valuemax="${_steps.length}"
             aria-label="Paso ${idx + 1} de ${_steps.length}">${dots}</div>
        <div class="tut__actions">
          ${!isFirst ? `<button class="btn btn-ghost btn-sm" id="tut-prev" aria-label="Paso anterior">Anterior</button>` : ''}
          ${!isLast
            ? `<button class="btn btn-primary btn-sm" id="tut-next" aria-label="Siguiente paso">Siguiente</button>`
            : `<button class="btn btn-primary btn-sm" id="tut-finish">¡Empezar!</button>`}
        </div>
        ${!isLast ? `<button class="tut__skip" id="tut-skip" aria-label="Saltar tutorial">Saltar</button>` : ''}
      </div>`;

    document.getElementById('tut-prev')?.addEventListener('click',   _prev);
    document.getElementById('tut-next')?.addEventListener('click',   _next);
    document.getElementById('tut-finish')?.addEventListener('click', stop);
    document.getElementById('tut-skip')?.addEventListener('click',   stop);

    /* ── Position tooltip ── */
    if (!isCenter) {
      requestAnimationFrame(() => _placeTooltip(targetEl, step.position));
    }
  };

  /* ── Tooltip placement with auto-flip ── */
  const _placeTooltip = (targetEl, position) => {
    if (!targetEl || !_tooltip) return;
    const r  = targetEl.getBoundingClientRect();
    const tw = _tooltip.offsetWidth;
    const th = _tooltip.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const fits = {
      bottom: r.bottom + GAP + th + 8 <= vh,
      top:    r.top    - GAP - th - 8 >= 0,
      right:  r.right  + GAP + tw + 8 <= vw,
      left:   r.left   - GAP - tw - 8 >= 0,
    };

    let pos = position;
    if (!fits[pos]) {
      const flip = { bottom: 'top', top: 'bottom', right: 'left', left: 'right' };
      if (fits[flip[pos]])  pos = flip[pos];
      else if (fits.bottom) pos = 'bottom';
      else if (fits.top)    pos = 'top';
      else if (fits.right)  pos = 'right';
      else                  pos = 'left';
    }

    let top, left;
    switch (pos) {
      case 'bottom': top = r.bottom + GAP;            left = r.left + (r.width  - tw) / 2; break;
      case 'top':    top = r.top - th - GAP;          left = r.left + (r.width  - tw) / 2; break;
      case 'right':  top = r.top + (r.height - th) / 2; left = r.right + GAP;              break;
      case 'left':   top = r.top + (r.height - th) / 2; left = r.left - tw - GAP;          break;
    }

    const EDGE = 8;
    left = Math.max(EDGE, Math.min(left, vw - tw - EDGE));
    top  = Math.max(EDGE, Math.min(top,  vh - th - EDGE));

    _tooltip.style.left = `${left}px`;
    _tooltip.style.top  = `${top}px`;
  };

  // First VISIBLE match (the same control can exist twice, one copy hidden by the responsive layout).
  const _findTarget = (sel) => sel ? [...document.querySelectorAll(sel)].find(_isVisible) || null : null;

  const _isVisible = (el) => {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    // inside the viewport on BOTH axes (the sidebar sits off-screen to the left on phones: then the tip is centred)
    return r.width > 0 && r.height > 0 && r.top < window.innerHeight && r.bottom > 0 && r.left < window.innerWidth && r.right > 0;
  };

  const _next = () => { if (_step < _steps.length - 1) _showStep(++_step); };
  const _prev = () => { if (_step > 0)                _showStep(--_step); };

  return { start, stop, autoStart };
})();
