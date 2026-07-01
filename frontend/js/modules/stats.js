/* ============================================================
   STATS.JS — Cálculos estadísticos reutilizables
   HU-29 (dashboard de uso), HU-30 (reporte ocupación)
   Plataforma Reservación Sala de Juntas · Ibero CDMX
   ============================================================ */

const Stats = (() => {

  /* ════════════════════════════════════════════════════════
     summary(reservations) → objeto con KPIs globales
  ════════════════════════════════════════════════════════ */

  /**
   * Devuelve un resumen de KPIs para la lista de reservaciones.
   * @param {Array} reservations
   * @returns {{ total, active, cancelled, recurring, activePct, cancelledPct }}
   */
  function summary(reservations) {
    const total     = reservations.length;
    const active    = reservations.filter(r => r.status === 'active').length;
    const cancelled = reservations.filter(r => r.status === 'cancelled').length;
    const recurring = reservations.filter(r => r.isRecurring).length;

    return {
      total,
      active,
      cancelled,
      recurring,
      activePct:    total ? Math.round(active    / total * 100) : 0,
      cancelledPct: total ? Math.round(cancelled / total * 100) : 0,
    };
  }

  /* ════════════════════════════════════════════════════════
     byMonth(reservations, dateFrom, dateTo)
     → Map<"YYYY-MM", { active: number, cancelled: number }>
  ════════════════════════════════════════════════════════ */

  /**
   * Agrupa reservaciones por mes dentro del rango especificado.
   * Útil para gráficas de barras mensuales.
   *
   * @param {Array}  reservations
   * @param {string} dateFrom  "YYYY-MM-DD" (puede estar vacío)
   * @param {string} dateTo    "YYYY-MM-DD" (puede estar vacío)
   * @returns {Map}
   */
  function byMonth(reservations, dateFrom = '', dateTo = '') {
    const map = _buildMonthRange(dateFrom, dateTo);

    for (const r of reservations) {
      const key = r.date.slice(0, 7);
      if (!map.has(key)) map.set(key, { active: 0, cancelled: 0 });
      const entry = map.get(key);
      if (r.status === 'active')    entry.active++;
      else if (r.status === 'cancelled') entry.cancelled++;
    }

    return map;
  }

  /* ════════════════════════════════════════════════════════
     topAreas(reservations, n) → [{ area, count }]
  ════════════════════════════════════════════════════════ */

  /**
   * Devuelve las N áreas/departamentos con más reservaciones activas.
   * Delega en Search.topAreas para no duplicar lógica.
   *
   * @param {Array}  reservations
   * @param {number} n  Número de áreas a devolver (default 5)
   * @returns {Array<{ area: string, count: number }>}
   */
  function topAreas(reservations, n = 5) {
    // Search.topAreas operates on all statuses; filter to active first.
    const active = reservations.filter(r => r.status === 'active');
    if (typeof Search !== 'undefined') return Search.topAreas(active, n);

    // Fallback if Search module isn't loaded
    const counts = {};
    for (const r of active) {
      const key = r.area.trim();
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return Object.entries(counts)
      .map(([area, count]) => ({ area, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, n);
  }

  /* ════════════════════════════════════════════════════════
     peakHours(reservations) → [{ hour, count }] sorted desc
  ════════════════════════════════════════════════════════ */

  /**
   * Identifica las horas de inicio más frecuentes.
   *
   * @param {Array} reservations
   * @returns {Array<{ hour: string, count: number }>}
   */
  function peakHours(reservations) {
    const active = reservations.filter(r => r.status === 'active' && r.startTime);
    const counts = {};
    for (const r of active) {
      const h = r.startTime.split(':')[0]; // "10"
      counts[h] = (counts[h] ?? 0) + 1;
    }
    return Object.entries(counts)
      .map(([hour, count]) => ({ hour: `${hour}:00`, count }))
      .sort((a, b) => b.count - a.count);
  }

  /* ════════════════════════════════════════════════════════
     avgDurationMin(reservations) → number (minutos)
  ════════════════════════════════════════════════════════ */

  /**
   * Duración media (en minutos) de las reservaciones activas.
   *
   * @param {Array} reservations
   * @returns {number}
   */
  function avgDurationMin(reservations) {
    const active = reservations.filter(
      r => r.status === 'active' && r.startTime && r.endTime
    );
    if (!active.length) return 0;

    const totalMin = active.reduce((sum, r) => {
      const [sh, sm] = r.startTime.split(':').map(Number);
      const [eh, em] = r.endTime.split(':').map(Number);
      return sum + (eh * 60 + em) - (sh * 60 + sm);
    }, 0);

    return Math.round(totalMin / active.length);
  }

  /* ════════════════════════════════════════════════════════
     occupancyPct(reservations, dateFrom, dateTo) → number
     Percentage of available working-day hours that are booked.
  ════════════════════════════════════════════════════════ */

  /**
   * Calcula el porcentaje de ocupación respecto a las horas laborables
   * disponibles en el período (08:00–20:00, Lu–Vi).
   *
   * @param {Array}  reservations  — solo las activas del período
   * @param {string} dateFrom      — "YYYY-MM-DD"
   * @param {string} dateTo        — "YYYY-MM-DD"
   * @returns {number}             — 0-100
   */
  function occupancyPct(reservations, dateFrom, dateTo) {
    if (!dateFrom || !dateTo) return 0;

    // Count working days in range
    let workDays = 0;
    const start = new Date(dateFrom);
    const end   = new Date(dateTo);
    for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dow = d.getDay();
      if (dow !== 0 && dow !== 6) workDays++;
    }
    if (!workDays) return 0;

    const availableMin = workDays * 12 * 60; // 12 h/day × 60 min

    const bookedMin = reservations
      .filter(r => r.status === 'active' && r.startTime && r.endTime)
      .reduce((sum, r) => {
        const [sh, sm] = r.startTime.split(':').map(Number);
        const [eh, em] = r.endTime.split(':').map(Number);
        return sum + Math.max(0, (eh * 60 + em) - (sh * 60 + sm));
      }, 0);

    return Math.min(100, Math.round(bookedMin / availableMin * 100));
  }

  /* ════════════════════════════════════════════════════════
     HELPERS
  ════════════════════════════════════════════════════════ */

  /** Construye Map<"YYYY-MM", { active:0, cancelled:0 }> para el rango */
  function _buildMonthRange(from, to) {
    const map = new Map();

    if (!from || !to) {
      // Default: últimos 12 meses
      const now = new Date();
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        map.set(key, { active: 0, cancelled: 0 });
      }
      return map;
    }

    const [fy, fm] = from.split('-').map(Number);
    const [ty, tm] = to.split('-').map(Number);
    let y = fy, m = fm;

    while (y < ty || (y === ty && m <= tm)) {
      const key = `${y}-${String(m).padStart(2, '0')}`;
      map.set(key, { active: 0, cancelled: 0 });
      m++;
      if (m > 12) { m = 1; y++; }
      if (map.size > 60) break; // safety cap
    }

    return map;
  }

  return { summary, byMonth, topAreas, peakHours, avgDurationMin, occupancyPct };
})();
