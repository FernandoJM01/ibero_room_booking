/* ============================================================
   SEARCH.JS — Búsqueda y filtros de reservaciones
   HU-26 (buscar y filtrar), HU-20 (historial)
   Plataforma Reservación Sala de Juntas · Ibero CDMX
   ============================================================ */

const Search = (() => {

  /* ────────────────────────────────────────────────────────
     filter(reservations, criteria) → reservation[]
     criteria: {
       query?:    string   — accent-insensitive full-text
       dateFrom?: string   — ISO "YYYY-MM-DD"
       dateTo?:   string   — ISO "YYYY-MM-DD"
       status?:   string   — 'active' | 'cancelled' | 'all'
       isRecurring?: boolean
     }
  ─────────────────────────────────────────────────────────── */
  function filter(reservations, criteria = {}) {
    const {
      query     = '',
      dateFrom  = '',
      dateTo    = '',
      status    = 'all',
      isRecurring,
    } = criteria;

    const q = Utils.normalize(query.trim());

    return reservations.filter(r => {
      // Status
      if (status !== 'all' && r.status !== status) return false;

      // Date range
      if (dateFrom && r.date < dateFrom) return false;
      if (dateTo   && r.date > dateTo)   return false;

      // Recurring flag
      if (isRecurring !== undefined && r.isRecurring !== isRecurring) return false;

      // Full-text (responsible, area, observations, date)
      if (q) {
        const haystack = Utils.normalize(
          [r.responsible, r.area, r.observations ?? '', r.date].join(' ')
        );
        if (!haystack.includes(q)) return false;
      }

      return true;
    });
  }

  /* ────────────────────────────────────────────────────────
     sort(reservations, field, dir) → sorted copy
     field: 'date' | 'responsible' | 'area' | 'startTime'
     dir:   'asc' | 'desc'
  ─────────────────────────────────────────────────────────── */
  function sort(reservations, field = 'date', dir = 'desc') {
    return [...reservations].sort((a, b) => {
      const va = _val(a, field);
      const vb = _val(b, field);
      if (va < vb) return dir === 'asc' ? -1 :  1;
      if (va > vb) return dir === 'asc' ?  1 : -1;
      return 0;
    });
  }

  function _val(r, field) {
    const v = r[field] ?? '';
    return typeof v === 'string' ? v.toLowerCase() : v;
  }

  /* ────────────────────────────────────────────────────────
     filterAndSort(reservations, criteria, sortField, sortDir)
     Convenience: filter + sort in one call.
  ─────────────────────────────────────────────────────────── */
  function filterAndSort(reservations, criteria, sortField = 'date', sortDir = 'desc') {
    return sort(filter(reservations, criteria), sortField, sortDir);
  }

  /* ────────────────────────────────────────────────────────
     highlight(text, query) → HTML string with <mark> tags
     Safe: text is escaped first, then marks inserted.
  ─────────────────────────────────────────────────────────── */
  function highlight(text, query) {
    const safe = Utils.escapeHTML(text);
    if (!query) return safe;
    const q = Utils.normalize(query.trim());
    if (!q) return safe;

    // Build a regex that matches the normalized form in the original text
    // We escape regex special chars in the query
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Use a case-insensitive + unicode-insensitive approach via normalize
    // Strategy: find positions in the normalized haystack, map to original
    const normalized = Utils.normalize(safe);
    let result = '';
    let pos    = 0;
    let idx;
    const re = new RegExp(escaped, 'g');
    while ((idx = re.exec(normalized)) !== null) {
      result += safe.slice(pos, idx.index);
      result += `<mark>${safe.slice(idx.index, idx.index + idx[0].length)}</mark>`;
      pos = idx.index + idx[0].length;
    }
    result += safe.slice(pos);
    return result;
  }

  /* ────────────────────────────────────────────────────────
     groupByMonth(reservations) → Map<"YYYY-MM", reservation[]>
     Useful for stats and exports.
  ─────────────────────────────────────────────────────────── */
  function groupByMonth(reservations) {
    const map = new Map();
    for (const r of reservations) {
      const key = r.date.slice(0, 7); // "YYYY-MM"
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(r);
    }
    return map;
  }

  /* ────────────────────────────────────────────────────────
     topAreas(reservations, n=5) → [{area, count}] sorted desc
  ─────────────────────────────────────────────────────────── */
  function topAreas(reservations, n = 5) {
    const counts = {};
    for (const r of reservations) {
      const key = r.area.trim();
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return Object.entries(counts)
      .map(([area, count]) => ({ area, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, n);
  }

  return { filter, sort, filterAndSort, highlight, groupByMonth, topAreas };
})();
