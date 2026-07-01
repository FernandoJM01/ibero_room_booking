/* ============================================================
   STORE.JS — Estado Global (patrón Module)
   Plataforma Reservación Sala de Juntas · Ibero CDMX
   ============================================================ */

const Store = (() => {
  let state = {
    currentUser:        null,
    reservations:       [],
    recurringGroups:    [],
    users:              [],
    holidays:           [],
    responsibleHistory: [],
    currentMonth:       new Date().getMonth(),
    currentYear:        new Date().getFullYear(),
    calendarView:       'month',    // 'month' | 'week'
    selectedDate:       null,
    filters:            {},
    notificationLog:    []
  };

  /** Devuelve copia superficial del estado */
  const getState = () => ({ ...state });

  /** Actualiza estado (merge) */
  const setState = (updates) => {
    state = { ...state, ...updates };
    // Populate responsible history if reservations were updated
    if (updates.reservations) {
      _populateResponsibleHistory();
    }
    _notifyListeners();
  };

  /** Devuelve usuario actual */
  const getUser = () => state.currentUser;

  /** true si el usuario es secretaria */
  const isAdmin = () => state.currentUser?.role === 'secretaria';

  /* ── Listeners de cambio ── */
  const _listeners = [];
  const subscribe = (fn) => {
    _listeners.push(fn);
    return () => {
      const idx = _listeners.indexOf(fn);
      if (idx > -1) _listeners.splice(idx, 1);
    };
  };
  const _notifyListeners = () => _listeners.forEach(fn => fn(state));

  /* ── Inicialización ── */
  const init = () => {
    // Restore session user from localStorage (JWT-based)
    const sessionUser = localStorage.getItem('ibero_session');
    if (sessionUser) {
      try {
        state.currentUser = JSON.parse(sessionUser);
      } catch (e) {
        // Invalid session, user will need to log in again
      }
    }
    // Data arrays are loaded from API on page initialization
  };

  /* ── Persistencia ── */
  const persist = () => {
    // Only persist session-related data; API is source of truth for data arrays
    // (persist() is now a no-op for data arrays; kept for backward compatibility)
  };

  /* ── Helpers de reservaciones ── */
  const getReservations = (filter = {}) => {
    let list = [...state.reservations];
    if (filter.status)    list = list.filter(r => r.status === filter.status);
    if (filter.date)      list = list.filter(r => r.date === filter.date);
    if (filter.dateFrom)  list = list.filter(r => r.date >= filter.dateFrom);
    if (filter.dateTo)    list = list.filter(r => r.date <= filter.dateTo);
    if (filter.responsible) {
      const q = filter.responsible.toLowerCase();
      list = list.filter(r => r.responsible.toLowerCase().includes(q));
    }
    return list;
  };

  const addReservation = (r) => {
    state.reservations.push(r);
    _updateResponsibleHistory(r.responsible_name);
    _notifyListeners();
  };

  const updateReservation = (id, updates) => {
    const idx = state.reservations.findIndex(r => r.id === id);
    if (idx === -1) return false;
    state.reservations[idx] = { ...state.reservations[idx], ...updates, updated_at: new Date().toISOString() };
    _notifyListeners();
    return true;
  };

  const removeReservations = (ids) => {
    state.reservations = state.reservations.filter(r => !ids.includes(r.id));
    _notifyListeners();
  };

  /* ── Helpers de historial de responsables ── */
  const _updateResponsibleHistory = (name) => {
    if (!name || !name.trim()) return;
    const clean = name.trim();
    if (!state.responsibleHistory.includes(clean)) {
      state.responsibleHistory.unshift(clean);
      if (state.responsibleHistory.length > 50) state.responsibleHistory.pop();
      persist();
    }
  };

  const _populateResponsibleHistory = () => {
    const seen = new Set();
    state.reservations.forEach(r => {
      if (r.responsible && !seen.has(r.responsible)) {
        seen.add(r.responsible);
        if (!state.responsibleHistory.includes(r.responsible)) {
          state.responsibleHistory.push(r.responsible);
        }
      }
    });
  };

  return {
    getState,
    setState,
    getUser,
    isAdmin,
    subscribe,
    init,
    persist,
    getReservations,
    addReservation,
    updateReservation,
    removeReservations
  };
})();
