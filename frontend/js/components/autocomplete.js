/* ============================================================
   AUTOCOMPLETE.JS — Autocompletado de texto con historial
   HU-15: Registrar responsable con autocompletado de historial
   Plataforma Reservación Sala de Juntas · Ibero CDMX
   ============================================================ */

const Autocomplete = (() => {

  /**
   * Inicializa el autocompletado en un input.
   *
   * @param {HTMLInputElement} inputEl       — campo de texto objetivo
   * @param {Function}         getSuggestions — () => string[]
   * @param {object}           [opts]
   * @param {number}           [opts.minChars=2]
   * @param {Function}         [opts.onSelect]  — (value) => void
   * @returns {{ destroy: Function }}
   */
  const init = (inputEl, getSuggestions, opts = {}) => {
    const { minChars = 2, onSelect = null } = opts;

    let dropdownEl    = null;
    let suggestions   = [];
    let activeIndex   = -1;

    /* ── Cerrar dropdown ── */
    const close = () => {
      dropdownEl?.remove();
      dropdownEl  = null;
      activeIndex = -1;
      inputEl.removeAttribute('aria-activedescendant');
    };

    /* ── Abrir dropdown con lista ── */
    const open = (items) => {
      close();
      if (!items.length) return;
      suggestions = items;

      dropdownEl = document.createElement('ul');
      dropdownEl.className = 'ac-dropdown';
      dropdownEl.setAttribute('role', 'listbox');
      dropdownEl.id = `ac-list-${Utils.uid()}`;
      inputEl.setAttribute('aria-controls', dropdownEl.id);

      items.forEach((s, i) => {
        const li = document.createElement('li');
        li.className = 'ac-item';
        li.setAttribute('role', 'option');
        li.setAttribute('id',   `${dropdownEl.id}-${i}`);
        li.setAttribute('aria-selected', 'false');
        li.textContent = s;

        li.addEventListener('mousedown', (e) => {
          e.preventDefault(); // evitar blur antes de selección
          _select(s);
        });

        dropdownEl.appendChild(li);
      });

      // Posicionar bajo el input
      _reposition();
      document.body.appendChild(dropdownEl);
    };

    /* ── Seleccionar sugerencia ── */
    const _select = (value) => {
      inputEl.value = value;
      onSelect?.(value);
      close();
      inputEl.focus();
    };

    /* ── Resaltar ítem activo ── */
    const _setActive = (index) => {
      const items = dropdownEl?.querySelectorAll('.ac-item');
      if (!items) return;
      items.forEach((el, i) => {
        const active = i === index;
        el.classList.toggle('is-active', active);
        el.setAttribute('aria-selected', String(active));
      });
      activeIndex = index;
      if (index >= 0) {
        inputEl.setAttribute('aria-activedescendant', `${dropdownEl.id}-${index}`);
        dropdownEl.querySelectorAll('.ac-item')[index]?.scrollIntoView({ block: 'nearest' });
      }
    };

    /* ── Reposicionar al scroll/resize ── */
    const _reposition = () => {
      if (!dropdownEl) return;
      const rect = inputEl.getBoundingClientRect();
      dropdownEl.style.top   = `${rect.bottom + window.scrollY + 2}px`;
      dropdownEl.style.left  = `${rect.left  + window.scrollX}px`;
      dropdownEl.style.width = `${rect.width}px`;
    };

    /* ── ARIA setup ── */
    inputEl.setAttribute('autocomplete',   'off');
    inputEl.setAttribute('aria-autocomplete', 'list');
    inputEl.setAttribute('aria-haspopup',  'listbox');

    /* ── Event listeners ── */
    const _onInput = () => {
      const val = inputEl.value.trim();
      if (val.length < minChars) { close(); return; }
      const norm = Utils.normalize(val);
      const matches = getSuggestions()
        .filter(s => Utils.normalize(s).includes(norm))
        .slice(0, 8);
      open(matches);
    };

    const _onKeydown = (e) => {
      if (!dropdownEl) return;
      const items = dropdownEl.querySelectorAll('.ac-item');
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          _setActive(Math.min(activeIndex + 1, items.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          _setActive(Math.max(activeIndex - 1, 0));
          break;
        case 'Enter':
          if (activeIndex >= 0) {
            e.preventDefault();
            _select(suggestions[activeIndex]);
          }
          break;
        case 'Escape':
          close();
          break;
        case 'Tab':
          close();
          break;
      }
    };

    const _onBlur  = () => setTimeout(close, 150);
    const _onScroll = () => _reposition();

    inputEl.addEventListener('input',   _onInput);
    inputEl.addEventListener('keydown', _onKeydown);
    inputEl.addEventListener('blur',    _onBlur);
    window.addEventListener('scroll',   _onScroll, { passive: true });
    window.addEventListener('resize',   _reposition);

    /* ── Destroy ── */
    const destroy = () => {
      close();
      inputEl.removeEventListener('input',   _onInput);
      inputEl.removeEventListener('keydown', _onKeydown);
      inputEl.removeEventListener('blur',    _onBlur);
      window.removeEventListener('scroll',   _onScroll);
      window.removeEventListener('resize',   _reposition);
    };

    return { destroy };
  };

  return { init };
})();
