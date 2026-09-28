/* ============================================================
   HISTORY-PAGE.JS — Historial y eliminación masiva de reservaciones
   HU-12 (eliminación masiva), HU-20 (historial),
   HU-11 (cancelar individual), HU-26 (búsqueda/filtros)
   Plataforma Reservación Sala de Juntas · Ibero CDMX
   ============================================================ */

(() => {

/* ── POPOVERS (rango de fechas, más filtros, política de retención) ──
   Los listeners de documento se registran una sola vez (init corre en cada
   navegación SPA); consultan el DOM vigente en cada evento. En móvil el panel
   se abre como hoja inferior colgada de <body> (el contenedor de la página
   tiene transform, que rompería position:fixed). */
let _popDocWired = false;
const _isMobileSheet = () => window.innerWidth <= 640;

function _closePops() {
  document.querySelectorAll('.hist-pop:not([hidden])').forEach(pop => {
    pop.hidden = true;
    document.querySelectorAll(`[aria-controls="${pop.id}"]`).forEach(t => t.setAttribute('aria-expanded', 'false'));
    if (pop._home && pop.parentElement !== pop._home) pop._home.appendChild(pop);
  });
  document.getElementById('hist-backdrop')?.remove();
}

function _togglePop(triggerId, popId) {
  const trigger = document.getElementById(triggerId);
  const pop     = document.getElementById(popId);
  if (!trigger || !pop) return;
  const wasOpen = !pop.hidden;
  _closePops();
  if (wasOpen) return;
  if (_isMobileSheet()) {
    pop._home = pop._home || pop.parentElement;
    const bd = document.createElement('div');
    bd.id = 'hist-backdrop';
    bd.className = 'hist-backdrop';
    document.body.appendChild(bd);
    document.body.appendChild(pop);
  }
  pop.hidden = false;
  trigger.setAttribute('aria-expanded', 'true');
}

function _wirePopDocument() {
  if (_popDocWired) return;
  _popDocWired = true;
  document.addEventListener('click', (e) => {
    if (!document.querySelector('.hist-pop:not([hidden])')) return;
    if (e.target.closest('.hist-pop') || e.target.closest('[aria-controls^="pop-"]')) return;
    _closePops();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') _closePops();
  });
}

const init = async () => {
  if (!document.getElementById('reservations-table')) return;

  // 1. Auth
  Store.init();
  const user = Auth.requireAuth();
  if (!user) return;

  // Load fresh data from API
  let _rooms = [];
  try {
    const [reservations, rooms] = await Promise.all([
      API.getReservations(),
      API.getRooms(),
    ]);
    Store.setState({ reservations });
    _rooms = Array.isArray(rooms) ? rooms : [];
  } catch (err) {
    console.error('Error loading reservations:', err);
    Toast.show('Error cargando datos', 'error');
  }

  const isSecretary = user.role === 'secretaria';

  // 2. Sidebar + badge
  Sidebar.init('historial');
  Auth.startInactivityWatcher();

  const badge = document.getElementById('topbar-role-badge');
  if (badge) {
    badge.textContent = isSecretary ? 'Secretaria' : 'Académico';
    badge.className   = `badge ${isSecretary ? 'badge-primary' : 'badge-info'} topbar__badge-role`;
  }

  // Ocultar columnas de acción para académico
  if (!isSecretary) {
    document.getElementById('select-all-top')?.closest('th')?.remove();
  }

  /* ── ESTADO ── */
  let _filtered  = [];
  let _selected  = new Set();
  let _sortField = 'date';
  let _sortDir   = 'desc';
  let _status    = 'all';   // all | active | cancelled  (pestañas)
  let _type      = 'all';   // all | internals | externals (Más filtros)

  const STATUS_LABEL = { active: 'Activas', cancelled: 'Canceladas' };
  const TYPE_LABEL   = { internals: 'Internos', externals: 'Externos' };

  /* ── REFERENCIAS ── */
  const filterField    = document.getElementById('filter-field');
  const filterSearch   = document.getElementById('filter-search');
  const filterDateFrom = document.getElementById('filter-date-from');
  const filterDateTo   = document.getElementById('filter-date-to');
  const filterRoom     = document.getElementById('filter-room');
  const btnClear       = document.getElementById('btn-clear-filters');
  const chipsEl        = document.getElementById('filter-chips');
  const dateLabelEl    = document.getElementById('date-range-label');
  const btnDateRange   = document.getElementById('btn-date-range');
  const btnMoreFilters = document.getElementById('btn-more-filters');
  const moreCountEl    = document.getElementById('more-filters-count');
  const statusTabs     = document.querySelectorAll('.hist-tab[data-status]');
  const typeBtns       = document.querySelectorAll('#type-seg [data-type]');
  const presetBtns     = document.querySelectorAll('#date-presets [data-preset]');
  const selectAllTop   = document.getElementById('select-all-top');
  const bulkBar        = document.getElementById('bulk-bar');
  const selectAllChk   = document.getElementById('select-all-chk');
  const bulkCount      = document.getElementById('bulk-count');
  const selCount       = document.getElementById('selection-count');
  const btnBulkCancel  = document.getElementById('btn-bulk-cancel');
  const tableBody      = document.getElementById('table-body');
  const tableEmpty     = document.getElementById('table-empty');
  const tableFooter    = document.getElementById('table-footer');

  /* ── SALAS (filtro) ── */
  if (filterRoom) {
    _rooms.forEach(room => {
      const opt = document.createElement('option');
      opt.value       = room.id;
      opt.textContent = room.name;
      filterRoom.appendChild(opt);
    });
  }

  /* ── FILTROS ── */
  _wirePopDocument();

  filterField?.addEventListener('change',  _applyFilters);
  filterSearch?.addEventListener('input',  _applyFilters);
  filterRoom?.addEventListener('change',   _applyFilters);
  filterDateFrom?.addEventListener('change', _applyFilters);
  filterDateTo?.addEventListener('change',   _applyFilters);

  statusTabs.forEach(tab => tab.addEventListener('click', () => {
    _status = tab.dataset.status;
    _applyFilters();
  }));

  typeBtns.forEach(btn => btn.addEventListener('click', () => {
    _type = btn.dataset.type;
    _applyFilters();
  }));

  btnDateRange?.addEventListener('click',   () => _togglePop('btn-date-range', 'pop-dates'));
  btnMoreFilters?.addEventListener('click', () => _togglePop('btn-more-filters', 'pop-more'));
  document.getElementById('btn-retention')?.addEventListener('click',
    () => _togglePop('btn-retention', 'pop-retention'));

  // Atajos de fecha (semana lunes–domingo, hora local)
  const _addDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
  const _presetRange = (key) => {
    const t   = new Date();
    const iso = Utils.dateToISO;
    switch (key) {
      case 'today':  return [iso(t), iso(t)];
      case 'week': {
        const monday = _addDays(t, -((t.getDay() + 6) % 7));
        return [iso(monday), iso(_addDays(monday, 6))];
      }
      case 'month':  return [iso(new Date(t.getFullYear(), t.getMonth(), 1)), iso(new Date(t.getFullYear(), t.getMonth() + 1, 0))];
      case 'year':   return [`${t.getFullYear()}-01-01`, `${t.getFullYear()}-12-31`];
      case 'last30': return [iso(_addDays(t, -29)), iso(t)];
      case 'next30': return [iso(t), iso(_addDays(t, 29))];
      default:       return ['', ''];
    }
  };
  const PRESET_NAME = {
    today: 'Hoy', week: 'Esta semana', month: 'Este mes', year: 'Este año',
    last30: 'Últimos 30 días', next30: 'Próximos 30 días',
  };
  const _activePreset = () => {
    const from = filterDateFrom?.value ?? '', to = filterDateTo?.value ?? '';
    if (!from && !to) return 'all';
    return Object.keys(PRESET_NAME).find(k => {
      const [f, t] = _presetRange(k);
      return f === from && t === to;
    }) ?? null;
  };
  const _dateRangeText = () => {
    const from = filterDateFrom?.value ?? '', to = filterDateTo?.value ?? '';
    const preset = _activePreset();
    if (preset === 'all') return 'Fechas';
    if (preset) return PRESET_NAME[preset];
    if (from && to) return `${Utils.formatDateShort(from)} – ${Utils.formatDateShort(to)}`;
    return from ? `Desde ${Utils.formatDateShort(from)}` : `Hasta ${Utils.formatDateShort(to)}`;
  };

  presetBtns.forEach(btn => btn.addEventListener('click', () => {
    const [from, to] = _presetRange(btn.dataset.preset);
    if (filterDateFrom) filterDateFrom.value = from;
    if (filterDateTo)   filterDateTo.value   = to;
    _closePops();
    _applyFilters();
  }));

  function _resetFilters() {
    if (filterField)    filterField.value = 'all';
    if (filterSearch)   filterSearch.value = '';
    if (filterDateFrom) filterDateFrom.value = '';
    if (filterDateTo)   filterDateTo.value = '';
    if (filterRoom)     filterRoom.value = 'all';
    _status = 'all';
    _type   = 'all';
    _applyFilters();
  }
  btnClear?.addEventListener('click', _resetFilters);

  // Chips de filtros activos (la pestaña de estado ya se ve seleccionada)
  const _activeChips = () => {
    const chips  = [];
    const search = filterSearch?.value.trim() ?? '';
    if (search) {
      const f = filterField?.value !== 'all' ? `${filterField.selectedOptions[0]?.textContent}: ` : '';
      chips.push({ key: 'search', text: `${f}“${search}”` });
    }
    if (filterDateFrom?.value || filterDateTo?.value) chips.push({ key: 'dates', text: _dateRangeText() });
    if (filterRoom?.value && filterRoom.value !== 'all') {
      chips.push({ key: 'room', text: `Sala: ${filterRoom.selectedOptions[0]?.textContent}` });
    }
    if (_type !== 'all') chips.push({ key: 'type', text: TYPE_LABEL[_type] });
    return chips;
  };
  const _clearChip = (key) => {
    if (key === 'search') { if (filterSearch) filterSearch.value = ''; if (filterField) filterField.value = 'all'; }
    if (key === 'dates')  { if (filterDateFrom) filterDateFrom.value = ''; if (filterDateTo) filterDateTo.value = ''; }
    if (key === 'room')   { if (filterRoom) filterRoom.value = 'all'; }
    if (key === 'type')   { _type = 'all'; }
    _applyFilters();
  };

  function _syncFilterUI() {
    // Pestañas / segmentado / atajos
    statusTabs.forEach(t => {
      const on = t.dataset.status === _status;
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-selected', String(on));
    });
    typeBtns.forEach(b => b.classList.toggle('is-active', b.dataset.type === _type));
    const preset = _activePreset();
    presetBtns.forEach(b => b.classList.toggle('is-active', b.dataset.preset === preset));

    // Botones de la barra
    const hasDates = !!(filterDateFrom?.value || filterDateTo?.value);
    if (dateLabelEl) dateLabelEl.textContent = _dateRangeText();
    btnDateRange?.classList.toggle('is-active', hasDates);
    filterRoom?.closest('.hist-select')?.classList.toggle('is-active', !!filterRoom && filterRoom.value !== 'all');
    const moreCount = _type !== 'all' ? 1 : 0;
    if (moreCountEl) { moreCountEl.textContent = moreCount; moreCountEl.hidden = moreCount === 0; }
    btnMoreFilters?.classList.toggle('is-active', moreCount > 0);

    // Chips + "Limpiar"
    const chips = _activeChips();
    if (chipsEl) {
      chipsEl.hidden = chips.length === 0;
      chipsEl.innerHTML = chips.map(c => `
        <span class="hist-chip">
          <span class="hist-chip__text">${Utils.escapeHTML(c.text)}</span>
          <button type="button" class="hist-chip__x" data-clear="${c.key}"
                  aria-label="Quitar filtro: ${Utils.escapeHTML(c.text)}">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"
                 stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </span>`).join('');
      chipsEl.querySelectorAll('[data-clear]').forEach(b =>
        b.addEventListener('click', () => _clearChip(b.dataset.clear)));
    }
    if (btnClear) btnClear.hidden = chips.length === 0 && _status === 'all';
  }

  /* ── COLUMNAS ORDENABLES ── */
  document.querySelectorAll('.data-table th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const field = th.dataset.sort;
      _sortDir    = _sortField === field && _sortDir === 'asc' ? 'desc' : 'asc';
      _sortField  = field;
      _updateSortIndicators();
      _renderTable();
    });
  });

  /* ── SELECT ALL (cabecera de tabla) ── */
  selectAllTop?.addEventListener('change', () => {
    _filtered.filter(r => r.status === 'active').forEach(r => {
      if (selectAllTop.checked) _selected.add(r.id);
      else                      _selected.delete(r.id);
    });
    _renderTable();
    _updateBulkBar();
  });

  /* ── SELECT ALL (bulk bar) ── */
  selectAllChk?.addEventListener('change', () => {
    _filtered.filter(r => r.status === 'active').forEach(r => {
      if (selectAllChk.checked) _selected.add(r.id);
      else                      _selected.delete(r.id);
    });
    _renderTable();
    _updateBulkBar();
  });

  /* ── BULK CANCEL ── */
  btnBulkCancel?.addEventListener('click', () => {
    const count = _selected.size;
    if (!count) return;
    _showConfirmModal(
      'Cancelar reservaciones',
      `¿Confirmas la cancelación de <strong>${count} reservación${count !== 1 ? 'es' : ''}</strong>?<br>
       Esta acción se registrará en el historial y no se puede deshacer.`,
      async () => {
        const cancelled = await Reservations.bulkCancel([..._selected]);
        _selected.clear();
        if (cancelled > 0) {
          Toast.show(
            `${cancelled} reservaci${cancelled !== 1 ? 'ones canceladas' : 'ón cancelada'} correctamente.`,
            'success'
          );
        } else {
          Toast.show('No se pudo cancelar las reservaciones seleccionadas.', 'error');
        }
        _applyFilters();
        _updateBulkBar();
      }
    );
  });

  /* ════════════════════════════════════════
     FILTRADO
     ════════════════════════════════════════ */
  // ignoreStatus: usado para los contadores de las pestañas, que deben
  // reflejar el resto de filtros pero no el estado elegido.
  function _matches(r, ignoreStatus = false) {
    const field    = filterField?.value ?? 'all';
    const search   = Utils.normalize(filterSearch?.value  ?? '');
    const dateFrom = filterDateFrom?.value ?? '';
    const dateTo   = filterDateTo?.value   ?? '';
    const roomId   = filterRoom?.value     ?? 'all';

    if (!ignoreStatus && _status !== 'all' && r.status !== _status) return false;
    if (_type === 'internals' && r.externalEmail) return false;
    if (_type === 'externals' && !r.externalEmail) return false;
    if (roomId !== 'all' && r.roomId !== roomId) return false;
    if (dateFrom && r.date < dateFrom)           return false;
    if (dateTo   && r.date > dateTo)             return false;
    if (search) {
      let hay = '';
      if (field === 'responsible') {
        hay = Utils.normalize(r.responsible ?? '');
      } else if (field === 'area') {
        hay = Utils.normalize(`${r.area ?? ''} ${r.externalOrg ?? ''}`);
      } else if (field === 'creator') {
        hay = Utils.normalize(r.creatorName ?? '');
      } else if (field === 'observations') {
        hay = Utils.normalize(r.observations ?? '');
      } else {
        hay = Utils.normalize(`${r.responsible} ${r.area} ${r.externalOrg ?? ''} ${r.externalEmail ?? ''} ${r.observations ?? ''} ${r.creatorName ?? ''}`);
      }
      if (!hay.includes(search)) return false;
    }
    return true;
  }

  function _applyFilters() {
    const all = Store.getState().reservations;

    _filtered = all.filter(r => _matches(r));

    // Contadores de pestañas
    const base = all.filter(r => _matches(r, true));
    const setCount = (id, n) => { const el = document.getElementById(id); if (el) el.textContent = n; };
    setCount('tab-count-all',       base.length);
    setCount('tab-count-active',    base.filter(r => r.status === 'active').length);
    setCount('tab-count-cancelled', base.filter(r => r.status === 'cancelled').length);

    _syncFilterUI();

    // Descartar selecciones que ya no están en el filtro
    _selected = new Set([..._selected].filter(id =>
      _filtered.some(r => r.id === id && r.status === 'active')
    ));

    _renderTable();
    _updateBulkBar();
  }

  /* ════════════════════════════════════════
     RENDER TABLA
     ════════════════════════════════════════ */
  function _getSortedData() {
    return [..._filtered].sort((a, b) => {
      let va = (a[_sortField] ?? '').toString().toLowerCase();
      let vb = (b[_sortField] ?? '').toString().toLowerCase();
      if (va < vb) return _sortDir === 'asc' ? -1 :  1;
      if (va > vb) return _sortDir === 'asc' ?  1 : -1;
      if (_sortField === 'date') {            // misma fecha: por hora de inicio
        const sa = a.startTime ?? '', sb = b.startTime ?? '';
        if (sa !== sb) return (sa < sb ? -1 : 1) * (_sortDir === 'asc' ? 1 : -1);
      }
      return 0;
    });
  }

  function _renderTable() {
    const sorted = _getSortedData();

    if (!sorted.length) {
      tableBody.innerHTML = '';
      tableEmpty?.classList.remove('hidden');
      if (tableFooter) tableFooter.textContent = `0 de ${Store.getState().reservations.length} reservaciones`;
      return;
    }

    tableEmpty?.classList.add('hidden');
    if (tableFooter) {
      const total = Store.getState().reservations.length;
      const noun  = total === 1 ? 'reservación' : 'reservaciones';
      tableFooter.textContent = sorted.length === total
        ? `${total} ${noun}`
        : `Mostrando ${sorted.length} de ${total} ${noun}`;
    }

    tableBody.innerHTML = sorted.map(r => _buildRow(r)).join('');

    // Wire checkboxes
    tableBody.querySelectorAll('.row-check').forEach(chk => {
      chk.addEventListener('change', () => {
        if (chk.checked) _selected.add(chk.dataset.id);
        else             _selected.delete(chk.dataset.id);
        const row = chk.closest('tr');
        row?.classList.toggle('is-selected', chk.checked);
        _updateBulkBar();
        _syncSelectAll();
      });
    });

    // Wire individual edit — any secretaria may edit any reservation now.
    // See docs/changes/2026-09-22-secretary-feedback.md #7.
    tableBody.querySelectorAll('.row-edit-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const r = Store.getState().reservations.find(res => res.id === btn.dataset.id);
        if (!r) return;
        // _applyFilters (not _renderTable): _filtered is a snapshot of Store
        // objects, and an edit replaces the object, so re-derive it first.
        ReservationModal.open({ editReservation: r, onSaved: () => _applyFilters() });
      });
    });

    // Wire per-reservation change log
    tableBody.querySelectorAll('.row-history-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const r = Store.getState().reservations.find(res => res.id === btn.dataset.id);
        if (r) ReservationHistoryModal.open(r);
      });
    });

    // Wire individual cancel
    tableBody.querySelectorAll('.row-cancel-btn').forEach(btn => {
      btn.addEventListener('click', () => _onRowCancel(btn.dataset.id));
    });

    _syncSelectAll();
  }

  function _buildRow(r) {
    const isActive = r.status === 'active';
    const isSel    = _selected.has(r.id);

    const rowCls = [
      isSel     ? 'is-selected'  : '',
      !isActive ? 'is-cancelled' : '',
    ].filter(Boolean).join(' ');

    const statusBadge = isActive
      ? `<span class="badge badge-success">Activa</span>`
      : r.status === 'cancelled'
        ? `<span class="badge badge-neutral">Cancelada</span>`
        : `<span class="badge badge-info">Pasada</span>`;

    const checkCell = isSecretary
      ? `<td class="col-check">
           ${isActive ? `<input type="checkbox" class="row-check" data-id="${r.id}"
                  ${isSel ? 'checked' : ''}
                  aria-label="Seleccionar reservación de ${Utils.escapeHTML(r.responsible)}" />` : ''}
         </td>`
      : ``;

    // Any secretaria may edit/cancel any reservation now — the "Solicitudes
    // de cambio" approval step was removed. See
    // docs/changes/2026-09-22-secretary-feedback.md #7.
    const canModify = isSecretary;

    const editLabel = 'Editar';
    const editIcon  = `<path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
         <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>`;

    // "Modified" = touched after it was created (created_at and updated_at
    // are the same NOW() on insert). The dot replaces the old inline
    // "Modificado por" line; the full detail lives in the Ver cambios dialog.
    const wasModified = r.updated_at && r.created_at
      && (new Date(r.updated_at) - new Date(r.created_at)) > 1000;
    const changeTip = wasModified
      ? `${r.status === 'cancelled' ? 'Cancelada' : 'Modificada'}${r.lastModifiedByName ? ` por ${r.lastModifiedByName}` : ''} · ${Utils.formatDateTimeMX(r.updated_at)}`
      : 'Ver cambios';

    const historyBtn = `
           <button class="btn btn-secondary btn-sm row-action-btn row-history-btn${wasModified ? ' has-changes' : ''}" data-id="${r.id}"
                   title="${Utils.escapeHTML(changeTip)}"
                   aria-label="Ver cambios de la reservación de ${Utils.escapeHTML(r.responsible)}${wasModified ? '. ' + Utils.escapeHTML(changeTip) : ''}">
             <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2.2"
                  stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
               <circle cx="12" cy="12" r="9"/>
               <polyline points="12 7 12 12 15 14"/>
             </svg>
           </button>`;

    const editCancelBtns = isActive ? `
           <button class="btn btn-secondary btn-sm row-action-btn row-edit-btn" data-id="${r.id}"
                   title="${editLabel}" aria-label="${editLabel} reservación de ${Utils.escapeHTML(r.responsible)}">
             <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2.2"
                  stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
               ${editIcon}
             </svg>
           </button>
           ${canModify ? `
           <button class="btn btn-danger btn-sm row-action-btn row-cancel-btn" data-id="${r.id}"
                   title="Cancelar" aria-label="Cancelar reservación de ${Utils.escapeHTML(r.responsible)}">
             <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2.2"
                  stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
               <line x1="18" y1="6" x2="6" y2="18"/>
               <line x1="6"  y1="6" x2="18" y2="18"/>
             </svg>
           </button>` : ''}` : '';

    // The change log is for secretaries only (it names who edited what).
    const actions = isSecretary
      ? `<div class="row-actions" style="display:flex; gap:6px; justify-content:flex-end;">
           ${historyBtn}${editCancelBtns}
         </div>`
      : `<span style="color:var(--color-secondary-light);font-size:var(--font-size-xs);">—</span>`;

    const isExternal = !!r.externalEmail;
    let responsibleHTML = `<span class="row-name hist-trunc" title="${Utils.escapeHTML(r.responsible)}" style="font-weight:500;">${Utils.escapeHTML(r.responsible)}</span>`;
    
    if (isExternal) {
      responsibleHTML += `
        <div style="margin-top:2px; display:inline-block; font-size:10px;">
          <span class="badge badge-primary" style="padding: 2px 4px;">Externo</span>
        </div>`;
    }

    return `
      <tr class="${rowCls}" data-id="${r.id}">
        ${checkCell}
        <td><span class="hist-dt"><strong>${Utils.formatDateShort(r.date)}</strong><small>${r.startTime}–${r.endTime}</small></span></td>
        <td>${r.roomName ? `<span class="room-chip">${Utils.escapeHTML(r.roomName)}</span>` : '<span style="color:var(--color-secondary-light)">—</span>'}</td>
        <td>${responsibleHTML}</td>
        <td class="hide-on-mobile">${r.creatorName ? `<span class="hist-trunc" title="${Utils.escapeHTML(r.creatorName)}">${Utils.escapeHTML(r.creatorName)}</span>` : '<span style="color:var(--color-secondary-light)">—</span>'}</td>
        <td><span class="hist-trunc" title="${Utils.escapeHTML(r.area ?? '')}">${Utils.escapeHTML(r.area ?? '')}</span></td>
        <td>${statusBadge}</td>
        <td class="col-actions">${actions}</td>
      </tr>`;
  }

  /* ── CANCELAR FILA INDIVIDUAL ── */
  function _onRowCancel(id) {
    const r = Reservations.getById(id);
    if (!r) return;
    _showConfirmModal(
      'Cancelar reservación',
      `¿Cancelar la reservación de <strong>${Utils.escapeHTML(r.responsible)}</strong><br>
       el ${Utils.formatDateLong(r.date)}, ${r.startTime}–${r.endTime}?`,
      async () => {
        const ok = await Reservations.cancel(id);
        _selected.delete(id);
        Toast.show(ok ? 'Reservación cancelada.' : 'No se pudo cancelar la reservación.', ok ? 'success' : 'error');
        _applyFilters();
      }
    );
  }

  /* ════════════════════════════════════════
     HELPERS DE UI
     ════════════════════════════════════════ */

  function _updateBulkBar() {
    const count = _selected.size;
    bulkBar?.classList.toggle('hidden', count === 0 || !isSecretary);
    if (bulkCount) bulkCount.textContent = count;
    if (selCount)  selCount.textContent  = `${count} seleccionada${count !== 1 ? 's' : ''}`;
  }

  function _syncSelectAll() {
    const activeInFilter  = _filtered.filter(r => r.status === 'active').length;
    const selectedCount   = [..._selected].filter(id =>
      _filtered.some(r => r.id === id && r.status === 'active')
    ).length;

    const indeterminate = selectedCount > 0 && selectedCount < activeInFilter;
    const checked       = activeInFilter > 0 && selectedCount === activeInFilter;

    [selectAllTop, selectAllChk].forEach(el => {
      if (!el) return;
      el.indeterminate = indeterminate;
      el.checked       = checked;
    });
  }

  function _updateSortIndicators() {
    document.querySelectorAll('.data-table th.sortable').forEach(th => {
      th.dataset.sortDir = th.dataset.sort === _sortField ? _sortDir : '';
    });
  }

  /* ── MODAL DE CONFIRMACIÓN ── */
  function _showConfirmModal(title, message, onConfirm) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'conf-title');

    overlay.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-header">
          <svg width="18" height="18" class="modal-header__icon" viewBox="0 0 24 24"
               fill="none" stroke="currentColor" stroke-width="2"
               stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            <line x1="12" y1="9"  x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <h3 id="conf-title">${Utils.escapeHTML(title)}</h3>
        </div>
        <div class="modal-body"><p>${message}</p></div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="conf-cancel-btn">Cancelar</button>
          <button class="btn btn-danger"    id="conf-ok-btn">Confirmar</button>
        </div>
      </div>`;

    document.body.appendChild(overlay);

    const close = () => overlay.remove();

    overlay.querySelector('#conf-cancel-btn').addEventListener('click', close);
    overlay.querySelector('#conf-ok-btn').addEventListener('click', () => {
      close();
      onConfirm();
    });
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

    const esc = (e) => {
      if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); }
    };
    document.addEventListener('keydown', esc);

    overlay.querySelector('#conf-ok-btn').focus();
  }

  /* ── EXPORT BUTTONS ── */
  // Human-readable summary of the filters actually applied, using the same
  // labels shown in the filter UI — printed in the PDF/Excel header so a
  // report carries what it was filtered by (CSV stays plain data; it's the
  // format someone reimports, not the one they print or hand out).
  function _activeFilterLines() {
    const lines  = [];
    const search = filterSearch?.value.trim() ?? '';
    if (search) {
      const fieldLabel = filterField?.selectedOptions[0]?.textContent ?? 'Todos los campos';
      lines.push(`Buscar (${fieldLabel}): "${search}"`);
    }
    if (filterDateFrom?.value) lines.push(`Desde: ${Utils.formatDateShort(filterDateFrom.value)}`);
    if (filterDateTo?.value)   lines.push(`Hasta: ${Utils.formatDateShort(filterDateTo.value)}`);
    if (_status !== 'all') lines.push(`Estado: ${STATUS_LABEL[_status]}`);
    if (_type   !== 'all') lines.push(`Tipo: ${TYPE_LABEL[_type]}`);
    if (filterRoom?.value && filterRoom.value !== 'all') {
      lines.push(`Sala: ${filterRoom.selectedOptions[0]?.textContent}`);
    }
    return lines;
  }

  document.getElementById('export-btn-group')?.style.setProperty('display', '');
  Export.attachExportButtons({
    pdfBtnId:        'btn-export-pdf',
    excelBtnId:      'btn-export-excel',
    csvBtnId:        'btn-export-csv',
    getReservations: () => _getSortedData(),
    getOpts:         () => ({
      title:       'Reservaciones — Sala de Juntas Ibero',
      dateFrom:    filterDateFrom?.value ?? '',
      dateTo:      filterDateTo?.value   ?? '',
      status:      _status,
      type:        _type,
      roomName:    (filterRoom?.value && filterRoom.value !== 'all') ? filterRoom.selectedOptions[0]?.textContent : null,
      generatedBy: user.name,
      filters:     _activeFilterLines(),
    }),
  });

  /* ── INICIO ── */
  _updateSortIndicators();
  _applyFilters();
};

document.addEventListener('DOMContentLoaded', init);
document.addEventListener('SPA:Navigated', init);
})();

