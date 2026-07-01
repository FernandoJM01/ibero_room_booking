/* ============================================================
   MODAL.JS — Diálogos de confirmación reutilizables
   Plataforma Reservación Sala de Juntas · Ibero CDMX
   ============================================================ */

const Modal = (() => {

  /* ════════════════════════════════════════
     CONFIRM — diálogo simple OK / Cancelar
     ════════════════════════════════════════ */
  /**
   * @param {object}   opts
   * @param {string}   opts.title
   * @param {string}   opts.message       — puede contener HTML seguro
   * @param {string}   [opts.confirmText] — texto del botón de acción
   * @param {boolean}  [opts.danger]      — estilo rojo en botón de acción
   * @param {Function} onConfirm
   */
  const confirm = (opts, onConfirm) => {
    const { title, message, confirmText = 'Confirmar', danger = false } = opts;
    const btnClass = danger ? 'btn-danger' : 'btn-primary';

    _open(`
      <div class="modal-header">
        <svg width="18" height="18" class="modal-header__icon" viewBox="0 0 24 24"
             fill="none" stroke="currentColor" stroke-width="2"
             stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
          <line x1="12" y1="9"  x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <h3 id="modal-title">${Utils.escapeHTML(title)}</h3>
      </div>
      <div class="modal-body"><p>${message}</p></div>
      <div class="modal-footer">
        <button class="btn btn-secondary" data-modal-action="cancel">Cancelar</button>
        <button class="btn ${btnClass}"   data-modal-action="confirm">${Utils.escapeHTML(confirmText)}</button>
      </div>`,
      { confirm: onConfirm },
      'confirm'
    );
  };

  /* ════════════════════════════════════════
     CHOICE — tres opciones (para recurrentes)
     ════════════════════════════════════════ */
  /**
   * @param {object}   opts
   * @param {string}   opts.title
   * @param {string}   opts.message
   * @param {string}   opts.option1Text   — acción secundaria (ej. "Solo esta instancia")
   * @param {string}   opts.option2Text   — acción principal (ej. "Toda la serie")
   * @param {Function} onOption1
   * @param {Function} onOption2
   */
  const choice = (opts, onOption1, onOption2) => {
    const { title, message, option1Text, option2Text } = opts;

    _open(`
      <div class="modal-header">
        <svg width="18" height="18" class="modal-header__icon" viewBox="0 0 24 24"
             fill="none" stroke="currentColor" stroke-width="2"
             stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 11-.57-8.38"/>
        </svg>
        <h3 id="modal-title">${Utils.escapeHTML(title)}</h3>
      </div>
      <div class="modal-body"><p>${message}</p></div>
      <div class="modal-footer" style="justify-content:space-between;">
        <button class="btn btn-ghost btn-sm" data-modal-action="cancel">Cancelar</button>
        <div style="display:flex;gap:var(--space-2);">
          <button class="btn btn-secondary btn-sm" data-modal-action="option1">${Utils.escapeHTML(option1Text)}</button>
          <button class="btn btn-danger    btn-sm" data-modal-action="option2">${Utils.escapeHTML(option2Text)}</button>
        </div>
      </div>`,
      { option1: onOption1, option2: onOption2 },
      'option2'
    );
  };

  /* ════════════════════════════════════════
     PRIVATE: _open
     ════════════════════════════════════════ */
  const _open = (bodyHTML, actions, defaultFocus) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.setAttribute('role',       'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'modal-title');

    overlay.innerHTML = `<div class="modal-dialog">${bodyHTML}</div>`;
    document.body.appendChild(overlay);

    const close = () => overlay.remove();

    // Wire all action buttons
    overlay.querySelectorAll('[data-modal-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.modalAction;
        close();
        actions[action]?.();
      });
    });

    // Close on outside click
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

    // Close on Escape
    const esc = (e) => {
      if (e.key === 'Escape') {
        close();
        document.removeEventListener('keydown', esc);
      }
    };
    document.addEventListener('keydown', esc);

    // Focus default action button
    overlay.querySelector(`[data-modal-action="${defaultFocus}"]`)?.focus();
  };

  return { confirm, choice };
})();
