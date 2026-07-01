/* ============================================================
   STATS-PAGE.JS — Dashboard de estadísticas
   HU-29 (dashboard de uso), HU-30 (reporte ocupación por período)
   Plataforma Reservación Sala de Juntas · Ibero CDMX
   ============================================================ */

document.addEventListener('DOMContentLoaded', async () => {

  Store.init();
  const user = Auth.requireAuth();
  if (!user) return;

  // Only secretaria can access this page
  if (user.role !== 'secretaria') {
    window.location.href = 'calendar.html';
    return;
  }

  // Load fresh data from API
  try {
    const reservations = await API.getReservations();
    Store.setState({ reservations });
  } catch (err) {
    console.error('Error loading reservations:', err);
    Toast.show('Error cargando datos', 'error');
  }

  Sidebar.init('estadisticas');
  Auth.startInactivityWatcher();

  /* ── DOM refs ──────────────────────────────────────────── */
  const dateFromEl = document.getElementById('stats-date-from');
  const dateToEl   = document.getElementById('stats-date-to');
  const btnApply   = document.getElementById('btn-stats-apply');
  const btnReset   = document.getElementById('btn-stats-reset');

  /* ── Chart instances (kept for destroy on re-render) ──── */
  let _charts = {};

  /* ── Default period: current calendar year ─────────────── */
  function _setDefaultPeriod() {
    const now  = new Date();
    const year = now.getFullYear();
    if (dateFromEl) dateFromEl.value = `${year}-01-01`;
    if (dateToEl)   dateToEl.value   = `${year}-12-31`;
  }

  /* ── Event listeners ───────────────────────────────────── */
  btnApply?.addEventListener('click', _render);
  btnReset?.addEventListener('click', () => { _setDefaultPeriod(); _render(); });

  /* ── Export wiring ─────────────────────────────────────── */
  Export.attachExportButtons({
    pdfBtnId:        'btn-stats-pdf',
    excelBtnId:      'btn-stats-excel',
    csvBtnId:        'btn-stats-csv',
    getReservations: () => _getFiltered(),
    getOpts:         () => ({
      title:    'Reporte de Estadísticas — Sala de Juntas Ibero',
      dateFrom: dateFromEl?.value ?? '',
      dateTo:   dateToEl?.value   ?? '',
    }),
  });

  /* ════════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════════ */

  function _getFiltered() {
    const from = dateFromEl?.value ?? '';
    const to   = dateToEl?.value   ?? '';
    return Search.filter(Store.getState().reservations, { dateFrom: from, dateTo: to });
  }

  function _render() {
    const all       = _getFiltered();
    const active    = all.filter(r => r.status === 'active');
    const cancelled = all.filter(r => r.status === 'cancelled');
    const recurring = all.filter(r => r.isRecurring);

    /* ── KPIs ── */
    _setText('kpi-total',         all.length);
    _setText('kpi-active',        active.length);
    _setText('kpi-cancelled',     cancelled.length);
    _setText('kpi-recurring',     recurring.length);

    const pct = (n) => all.length ? `${Math.round(n / all.length * 100)}% del total` : '—% del total';
    _setText('kpi-active-pct',    pct(active.length));
    _setText('kpi-cancelled-pct', pct(cancelled.length));

    /* ── Charts ── */
    _renderMonthlyChart(active);
    _renderStatusChart(active, cancelled);
    _renderAreasDonut(active);

    /* ── Top areas list ── */
    _renderTopAreasList(active);
  }

  /* ── Monthly occupancy bar chart ── */
  function _renderMonthlyChart(activeReservations) {
    const from     = dateFromEl?.value;
    const to       = dateToEl?.value;
    const monthMap = _buildMonthRange(from, to);

    for (const r of activeReservations) {
      const key = r.date.slice(0, 7);
      if (monthMap.has(key)) monthMap.set(key, monthMap.get(key) + 1);
    }

    const labels = [...monthMap.keys()].map(_monthLabel);
    const data   = [...monthMap.values()];

    _destroyChart('monthly');
    const ctx = document.getElementById('chart-monthly')?.getContext('2d');
    if (!ctx) return;

    _charts.monthly = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label:           'Reservaciones activas',
          data,
          backgroundColor: 'rgba(239, 62, 66, 0.75)',
          borderColor:     'rgba(239, 62, 66, 1)',
          borderWidth:     1,
          borderRadius:    4,
        }],
      },
      options: {
        responsive:          true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => ` ${ctx.parsed.y} reservación${ctx.parsed.y !== 1 ? 'es' : ''}`,
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { precision: 0, color: '#888', font: { size: 11 } },
            grid:  { color: 'rgba(0,0,0,0.05)' },
          },
          x: {
            ticks: { color: '#888', font: { size: 11 }, maxRotation: 45 },
            grid:  { display: false },
          },
        },
      },
    });
  }

  /* ── Active vs Cancelled grouped bar chart ── */
  function _renderStatusChart(active, cancelled) {
    const from      = dateFromEl?.value;
    const to        = dateToEl?.value;
    const activeMap = _buildMonthRange(from, to);
    const cancelMap = new Map([...activeMap.keys()].map(k => [k, 0]));

    for (const r of active)    { const k = r.date.slice(0, 7); if (activeMap.has(k)) activeMap.set(k, activeMap.get(k) + 1); }
    for (const r of cancelled) { const k = r.date.slice(0, 7); if (cancelMap.has(k)) cancelMap.set(k, cancelMap.get(k) + 1); }

    const labels = [...activeMap.keys()].map(_monthLabel);

    _destroyChart('status');
    const ctx = document.getElementById('chart-status')?.getContext('2d');
    if (!ctx) return;

    _charts.status = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label:           'Activas',
            data:            [...activeMap.values()],
            backgroundColor: 'rgba(40, 167, 69, 0.75)',
            borderColor:     'rgba(40, 167, 69, 1)',
            borderWidth:     1,
            borderRadius:    3,
          },
          {
            label:           'Canceladas',
            data:            [...cancelMap.values()],
            backgroundColor: 'rgba(239, 62, 66, 0.55)',
            borderColor:     'rgba(239, 62, 66, 1)',
            borderWidth:     1,
            borderRadius:    3,
          },
        ],
      },
      options: {
        responsive:          true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { font: { size: 11 }, boxWidth: 12 },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { precision: 0, color: '#888', font: { size: 11 } },
            grid:  { color: 'rgba(0,0,0,0.05)' },
          },
          x: {
            ticks: { color: '#888', font: { size: 11 }, maxRotation: 45 },
            grid:  { display: false },
          },
        },
      },
    });
  }

  /* ── Top 5 areas donut chart ── */
  function _renderAreasDonut(activeReservations) {
    const top = Search.topAreas(activeReservations, 5);

    _destroyChart('areas');
    const ctx = document.getElementById('chart-areas-donut')?.getContext('2d');
    if (!ctx) return;

    if (!top.length) return;

    const COLORS = [
      'rgba(239, 62, 66, 0.85)',
      'rgba(111, 66, 193, 0.80)',
      'rgba(23, 162, 184, 0.80)',
      'rgba(255, 193, 7, 0.80)',
      'rgba(40, 167, 69, 0.80)',
    ];

    _charts.areas = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels:   top.map(t => Utils.truncate(t.area, 28)),
        datasets: [{
          data:            top.map(t => t.count),
          backgroundColor: COLORS,
          borderWidth:     2,
          borderColor:     '#fff',
          hoverOffset:     6,
        }],
      },
      options: {
        responsive:          true,
        maintainAspectRatio: false,
        cutout:              '62%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { font: { size: 10 }, boxWidth: 12, padding: 8 },
          },
          tooltip: {
            callbacks: {
              label: ctx => ` ${ctx.label}: ${ctx.parsed} reservación${ctx.parsed !== 1 ? 'es' : ''}`,
            },
          },
        },
      },
    });
  }

  /* ── Top areas ranked list ── */
  function _renderTopAreasList(activeReservations) {
    const listEl = document.getElementById('top-areas-list');
    if (!listEl) return;

    const top = Search.topAreas(activeReservations, 10);

    if (!top.length) {
      listEl.innerHTML = '<li style="color:var(--color-secondary-light);font-size:var(--font-size-sm);">Sin datos en el período seleccionado.</li>';
      return;
    }

    const max = top[0].count;

    listEl.innerHTML = top.map((t, i) => `
      <li class="top-area-item">
        <span class="top-area-item__rank">${i + 1}</span>
        <div class="top-area-item__bar-wrap">
          <span class="top-area-item__name" title="${Utils.escapeHTML(t.area)}">
            ${Utils.escapeHTML(t.area)}
          </span>
          <div class="top-area-item__bar-bg" aria-hidden="true">
            <div class="top-area-item__bar-fill"
                 style="width:${Math.round(t.count / max * 100)}%"></div>
          </div>
        </div>
        <span class="top-area-item__count">${t.count}</span>
      </li>`
    ).join('');
  }

  /* ════════════════════════════════════════════════════════
     HELPERS
  ════════════════════════════════════════════════════════ */

  /** Build ordered Map<"YYYY-MM", 0> covering from→to */
  function _buildMonthRange(from, to) {
    const map = new Map();
    if (!from || !to) {
      const now = new Date();
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        map.set(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, 0);
      }
      return map;
    }

    const [fy, fm] = from.split('-').map(Number);
    const [ty, tm] = to.split('-').map(Number);
    let   year = fy, month = fm;

    while (year < ty || (year === ty && month <= tm)) {
      map.set(`${year}-${String(month).padStart(2, '0')}`, 0);
      month++;
      if (month > 12) { month = 1; year++; }
      if (map.size > 60) break; // safety cap
    }

    return map;
  }

  const MONTH_NAMES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

  function _monthLabel(key) {
    const [y, m] = key.split('-').map(Number);
    return `${MONTH_NAMES[m - 1]} ${y}`;
  }

  function _setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  function _destroyChart(key) {
    if (_charts[key]) { _charts[key].destroy(); delete _charts[key]; }
  }

  /* ── INIT ── */
  _setDefaultPeriod();
  _render();
});
