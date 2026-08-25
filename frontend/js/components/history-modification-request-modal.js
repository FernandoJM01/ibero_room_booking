/* ============================================================
   HISTORY-MODIFICATION-REQUEST-MODAL.JS
   Isolated modern modal for requesting a time change from the 
   History table. Decoupled from Calendar's cal-popup.
   ============================================================ */

const HistoryModificationRequestModal = (() => {

  const MODAL_ID = 'hmreq-modal';

  let _reservation      = null;
  let _onSent           = null;
  let _initialDate      = null;
  let _initialStartTime = null;
  let _initialEndTime   = null;

  /* ── Time slot helpers ── */
  const _timeSlots = () => {
    const opts = [];
    for (let h = 7; h < 21; h++) {
      for (const m of [0, 30]) {
        opts.push(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`);
      }
    }
    return opts;
  };

  const _timeOptions = (selected) =>
    _timeSlots().map(t =>
      `<option value="${t}"${t === selected ? ' selected' : ''}>${t}</option>`
    ).join('');

  /* ── Render ── */
  const _render = () => {
    const r = _reservation;
    const dateISO  = r.date   ?? r.start_time?.slice(0, 10);
    const startVal = r.startTime ?? r.start_time?.slice(11, 16);
    const endVal   = r.endTime   ?? r.end_time?.slice(11, 16);

    const newDateISO  = _initialDate      ?? dateISO;
    const newStartVal = _initialStartTime ?? startVal;
    const newEndVal   = _initialEndTime   ?? endVal;

    const overlay = document.createElement('div');
    overlay.id = MODAL_ID;
    overlay.className = 'modal-overlay';
    overlay.style.zIndex = '1100'; // High priority
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'hmreq-title');

    overlay.innerHTML = `
      <div class="modal-dialog rmodal">
        <div class="rmodal__accent-bar"></div>
        <div class="modal-header rmodal__header">
          <h3 id="hmreq-title" class="modal-title">Solicitar cambio de horario</h3>
          <button class="modal-close" id="hmreq-close" aria-label="Cerrar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        
        <div class="rmodal__body">
          <div class="rmodal__section">
            <div style="display:flex; gap: var(--space-3); align-items:flex-start;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--color-primary); flex-shrink:0; margin-top:2px;">
                <rect x="3" y="4" width="18" height="18" rx="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              <div>
                <div style="font-weight: var(--font-weight-semibold); color: var(--color-text);">${Utils.escapeHTML(r.responsible_name ?? r.responsible ?? '—')}</div>
                <div style="color: var(--color-secondary); font-size: var(--font-size-sm); margin-bottom: var(--space-1);">${Utils.escapeHTML(r.area ?? '—')}</div>
                <div style="font-size: var(--font-size-xs); background: var(--color-warning-bg, #fff3cd); color: var(--color-warning-text, #856404); display:inline-block; padding: 2px 8px; border-radius: var(--radius-full);">
                  Horario actual: ${Utils.escapeHTML(dateISO)} ${Utils.escapeHTML(startVal)}–${Utils.escapeHTML(endVal)}
                </div>
              </div>
            </div>
          </div>

          <div class="rmodal__section">
            <div class="rmodal__field" style="margin-bottom: var(--space-4);">
              <label class="form-label" for="hmreq-date">Nueva fecha sugerida</label>
              <input type="date" id="hmreq-date" class="form-input" value="${newDateISO}" min="${Utils.today()}" />
            </div>

            <div class="rmodal__field" style="margin-bottom: var(--space-4);">
              <label class="form-label">Nuevo horario sugerido</label>
              <div style="display:flex; align-items:center; gap:var(--space-3);">
                <select class="form-select" id="hmreq-start" aria-label="Hora inicio" style="flex:1;">
                  ${_timeOptions(newStartVal)}
                </select>
                <span style="color:var(--color-secondary-light);">→</span>
                <select class="form-select" id="hmreq-end" aria-label="Hora fin" style="flex:1;">
                  ${_timeOptions(newEndVal)}
                </select>
              </div>
              <div id="hmreq-overlap" class="rmodal__iv-overlap hidden" role="status" aria-live="polite"></div>
            </div>

            <div class="rmodal__field" style="margin-bottom:0;">
              <label class="form-label" for="hmreq-reason">Motivo de la solicitud (opcional)</label>
              <textarea id="hmreq-reason" class="form-textarea" rows="3" maxlength="300"
                        placeholder="Explica brevemente por qué sugieres este cambio de horario..."></textarea>
            </div>
          </div>
        </div>

        <div class="modal-footer rmodal__footer">
          <button type="button" class="btn btn-ghost" id="hmreq-cancel">Cancelar</button>
          <button type="button" class="btn btn-primary" id="hmreq-submit">Enviar solicitud</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    _wireEvents(overlay);
    _checkOverlap();
    requestAnimationFrame(() => document.getElementById('hmreq-date')?.focus());
  };

  /* ── Overlap check ── */
  const _checkOverlap = () => {
    const dateVal  = document.getElementById('hmreq-date')?.value;
    const startVal = document.getElementById('hmreq-start')?.value;
    const endVal   = document.getElementById('hmreq-end')?.value;
    const statusEl = document.getElementById('hmreq-overlap');
    if (!statusEl) return;

    if (!dateVal || !startVal || !endVal || startVal >= endVal) {
      statusEl.className = 'rmodal__iv-overlap hidden';
      return;
    }

    const conflict = Reservations.checkOverlap(dateVal, startVal, endVal, _reservation?.id ?? null);
    statusEl.classList.remove('hidden', 'is-conflict', 'is-available');
    if (conflict) {
      statusEl.classList.add('is-conflict');
      statusEl.innerHTML = `Traslape con <strong>${Utils.escapeHTML(conflict.responsible)}</strong> (${conflict.startTime}–${conflict.endTime})`;
    } else {
      statusEl.classList.add('is-available');
      statusEl.textContent = 'Horario disponible';
    }
  };

  /* ── Wire events ── */
  const _wireEvents = (overlay) => {
    document.getElementById('hmreq-close')?.addEventListener('click', close);
    document.getElementById('hmreq-cancel')?.addEventListener('click', close);
    document.getElementById('hmreq-start')?.addEventListener('change', _checkOverlap);
    document.getElementById('hmreq-end')?.addEventListener('change', _checkOverlap);
    document.getElementById('hmreq-date')?.addEventListener('change', _checkOverlap);
    document.getElementById('hmreq-submit')?.addEventListener('click', _submit);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });

    const _onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', _onKey);
    overlay._cleanup = () => document.removeEventListener('keydown', _onKey);
  };

  /* ── Submit ── */
  const _submit = async () => {
    const dateVal   = document.getElementById('hmreq-date')?.value;
    const startVal  = document.getElementById('hmreq-start')?.value;
    const endVal    = document.getElementById('hmreq-end')?.value;
    const reasonVal = document.getElementById('hmreq-reason')?.value?.trim();

    if (!dateVal) { Toast.show('Selecciona una fecha', 'warning'); return; }
    if (!startVal || !endVal || startVal >= endVal) {
      Toast.show('La hora de inicio debe ser anterior a la hora de fin', 'warning'); return;
    }

    const submitBtn = document.getElementById('hmreq-submit');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Enviando…'; }

    try {
      await API.submitModificationRequest({
        reservation_id: _reservation.id,
        new_start_time: `${dateVal}T${startVal}:00`,
        new_end_time:   `${dateVal}T${endVal}:00`,
        reason: reasonVal || null,
      });
      const savedOnSent = _onSent;
      close();
      Toast.show('Solicitud enviada. Un administrador la revisará pronto.', 'success');
      savedOnSent?.();
    } catch (err) {
      const msg = err?.data?.error || err?.message || 'Error al enviar la solicitud';
      Toast.show(msg, 'error');
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Enviar solicitud'; }
    }
  };

  /* ── Public API ── */
  const open = ({ reservation, onSent, initialDate, initialStartTime, initialEndTime } = {}) => {
    close();
    _reservation      = reservation;
    _onSent           = onSent ?? null;
    _initialDate      = initialDate      ?? null;
    _initialStartTime = initialStartTime ?? null;
    _initialEndTime   = initialEndTime   ?? null;
    _render();
  };

  const close = () => {
    const overlay = document.getElementById(MODAL_ID);
    if (overlay) {
      overlay._cleanup?.();
      overlay.remove();
    }
    _reservation      = null;
    _onSent           = null;
    _initialDate      = null;
    _initialStartTime = null;
    _initialEndTime   = null;
  };

  return { open, close };
})();
