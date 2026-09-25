/* ============================================================
   RESERVATION-HISTORY-MODAL.JS — Bitácora de cambios de una reservación
   Muestra quién creó / modificó / canceló, cuándo, y qué cambió.
   Plataforma Reservación Sala de Juntas · Ibero CDMX
   ============================================================ */

const ReservationHistoryModal = (() => {

  let _overlay = null;
  let _returnFocus = null;
  let _onKey = null;

  const ACTION = {
    create_reservation: { label: 'Reservación creada',    verb: 'creó',      cls: 'is-create' },
    update_reservation: { label: 'Reservación modificada', verb: 'modificó', cls: 'is-update' },
    cancel_reservation: { label: 'Reservación cancelada',  verb: 'canceló',  cls: 'is-cancel' },
  };

  const FIELD_LABEL = {
    schedule:     'Fecha y horario',
    responsible:  'Responsable',
    area:         'Nombre de la junta',
    observations: 'Observaciones',
  };

  const _esc = Utils.escapeHTML;

  // start/end are UTC instants; show them in Mexico City time.
  function _schedule(range) {
    if (!range?.start_time || !range?.end_time) return '—';
    const s = Utils.formatDateTimeMX(range.start_time);
    const e = Utils.formatDateTimeMX(range.end_time);
    return s.slice(0, 10) === e.slice(0, 10) ? `${s}–${e.slice(11)}` : `${s} → ${e}`;
  }

  function _value(field, v) {
    if (field === 'schedule') return _schedule(v);
    if (v === null || v === undefined || v === '') return '(vacío)';
    return String(v);
  }

  function _changeRow(c) {
    const label = FIELD_LABEL[c.field] ?? c.field;
    return `
      <li class="rhist__change">
        <span class="rhist__field">${_esc(label)}</span>
        <span class="rhist__from">${_esc(_value(c.field, c.from))}</span>
        <span class="rhist__arrow" aria-label="cambió a">→</span>
        <span class="rhist__to">${_esc(_value(c.field, c.to))}</span>
      </li>`;
  }

  function _detailHTML(entry) {
    const d = entry.details;
    if (entry.action === 'update_reservation') {
      if (Array.isArray(d?.changes) && d.changes.length) {
        return `<ul class="rhist__changes">${d.changes.map(_changeRow).join('')}</ul>`;
      }
      return `<p class="rhist__note">Sin detalle del cambio (registrado antes de que existiera esta bitácora).</p>`;
    }
    if (entry.action === 'cancel_reservation' && d?.bulk) {
      return `<p class="rhist__note">Cancelada junto con otras reservaciones seleccionadas.</p>`;
    }
    return '';
  }

  function _entryHTML(entry) {
    const a = ACTION[entry.action] ?? { label: entry.action, verb: 'registró', cls: '' };
    const who = entry.user_name ? _esc(entry.user_name) : 'Usuario eliminado';
    return `
      <li class="rhist__entry ${a.cls}">
        <span class="rhist__dot" aria-hidden="true"></span>
        <div class="rhist__entry-body">
          <div class="rhist__entry-head">
            <strong>${_esc(a.label)}</strong>
            <time datetime="${_esc(entry.timestamp)}">${_esc(Utils.formatDateTimeMX(entry.timestamp))}</time>
          </div>
          <div class="rhist__by">Por ${who}</div>
          ${_detailHTML(entry)}
        </div>
      </li>`;
  }

  function _setBody(html) {
    _overlay.querySelector('#rhist-body').innerHTML = html;
  }

  async function _load(reservationId) {
    _setBody('<p class="rhist__state">Cargando…</p>');
    try {
      const entries = await API.getReservationHistory(reservationId);
      if (!_overlay) return; // closed while loading
      _setBody(entries.length
        ? `<ol class="rhist__timeline">${entries.map(_entryHTML).join('')}</ol>`
        : '<p class="rhist__state">Aún no hay movimientos registrados para esta reservación.</p>');
    } catch (err) {
      console.error('Error loading reservation history:', err);
      if (!_overlay) return;
      _setBody(`
        <p class="rhist__state rhist__state--error">No se pudo cargar el historial de cambios.</p>
        <div style="text-align:center"><button type="button" class="btn btn-secondary btn-sm" id="rhist-retry">Reintentar</button></div>`);
      _overlay.querySelector('#rhist-retry')?.addEventListener('click', () => _load(reservationId));
    }
  }

  function close() {
    if (!_overlay) return;
    document.removeEventListener('keydown', _onKey);
    _overlay.remove();
    _overlay = null;
    _returnFocus?.focus?.();
  }

  function open(reservation) {
    close();
    _returnFocus = document.activeElement;

    _overlay = document.createElement('div');
    _overlay.className = 'modal-overlay';
    _overlay.setAttribute('role', 'dialog');
    _overlay.setAttribute('aria-modal', 'true');
    _overlay.setAttribute('aria-labelledby', 'rhist-title');

    _overlay.innerHTML = `
      <div class="modal-dialog modal-dialog--lg rhist">
        <div class="modal-header">
          <h3 id="rhist-title">Historial de cambios</h3>
          <button type="button" class="btn btn-ghost btn-sm" id="rhist-close" aria-label="Cerrar">✕</button>
        </div>
        <div class="rhist__summary">
          <strong>${_esc(reservation.responsible)}</strong>
          <span>${_esc(reservation.area ?? '')}</span>
          <span>${_esc(Utils.formatDateShort(reservation.date))} · ${_esc(reservation.startTime)}–${_esc(reservation.endTime)}</span>
        </div>
        <div class="modal-body rhist__body" id="rhist-body" aria-live="polite"></div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" id="rhist-done">Cerrar</button>
        </div>
      </div>`;

    document.body.appendChild(_overlay);

    _overlay.querySelector('#rhist-close').addEventListener('click', close);
    _overlay.querySelector('#rhist-done').addEventListener('click', close);
    // Read-only dialog, so clicking the backdrop is safe (no work to lose).
    _overlay.addEventListener('click', (e) => { if (e.target === _overlay) close(); });
    _onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', _onKey);
    _overlay.querySelector('#rhist-done').focus();

    _load(reservation.id);
  }

  return { open, close };
})();
