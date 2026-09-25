/* ============================================================
   UTILS.JS — Funciones de utilidad compartidas
   Plataforma Reservación Sala de Juntas · Ibero CDMX
   ============================================================ */

const Utils = (() => {

  /* ── FECHAS ── */

  /** Formatea una fecha ISO a "15 de Abril de 2026" */
  const formatDateLong = (dateStr) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  /** Formatea "2026-04-15" a "15/04/2026" */
  const formatDateShort = (dateStr) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  /** Devuelve "2026-04-15" para un objeto Date */
  const dateToISO = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  /** Nombre del mes en español (0-based) */
  const monthName = (monthIndex) => {
    const names = [
      'Enero','Febrero','Marzo','Abril','Mayo','Junio',
      'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
    ];
    return names[monthIndex] ?? '';
  };

  /** Abreviatura del día en español (0=Dom) */
  const dayAbbr = (dayIndex) => {
    return ['Do','Lu','Ma','Mi','Ju','Vi','Sa'][dayIndex] ?? '';
  };

  /** Número de días en el mes */
  const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();

  /** Primer día de la semana del mes (0=Dom, ajustado a Lun=0) */
  const firstDayOfMonth = (year, month) => {
    const d = new Date(year, month, 1).getDay();
    return d === 0 ? 6 : d - 1; // Convierte Dom→6, Lun→0
  };

  /** ¿Es fin de semana? */
  const isWeekend = (dateStr) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const day = new Date(y, m - 1, d).getDay();
    return day === 0 || day === 6;
  };

  /** Compara dos strings ISO de fecha "YYYY-MM-DD" */
  const isSameDate = (a, b) => a === b;

  /** Hoy en formato ISO */
  const today = () => dateToISO(new Date());

  /* ── VALIDACIONES ── */

  /** Detecta traslape entre [s1,e1) y [s2,e2) en formato "HH:MM" */
  const timesOverlap = (s1, e1, s2, e2) => {
    const toMin = (t) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    return toMin(s1) < toMin(e2) && toMin(e1) > toMin(s2);
  };

  /** Valida que end > start en formato "HH:MM" */
  const isValidTimeRange = (start, end) => {
    const toMin = (t) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    return toMin(end) > toMin(start);
  };

  /** Valida correo electrónico */
  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  /** Valida contraseña (mín. 8 chars con mayúscula, minúscula, número y especial) */
  const isValidPassword = (pwd) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(pwd);

  /* ── STRINGS ── */

  /** Normaliza texto: minúsculas sin acentos */
  const normalize = (str) =>
    str.toLowerCase()
       .normalize('NFD')
       .replace(/[\u0300-\u036f]/g, '');

  /** Trunca texto con elipsis */
  const truncate = (str, len = 30) =>
    str.length > len ? str.slice(0, len) + '…' : str;

  /* ── DOM ── */

  /** Escapa HTML para prevenir XSS */
  const escapeHTML = (str) => {
    const map = { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' };
    return String(str).replace(/[&<>"']/g, c => map[c]);
  };

  /** Genera un ID único corto */
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  /** Selector seguro con error silencioso */
  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];

  const _eyeIcon = () => `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>`;

  const _eyeOffIcon = () => `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>`;

  /** Instante (ISO/UTC) → "24/09/2026 14:32" en hora de Ciudad de México, sin depender del navegador */
  const formatDateTimeMX = (iso) => {
    const parts = new Intl.DateTimeFormat('es-MX', {
      timeZone: 'America/Mexico_City',
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date(iso)).reduce((acc, p) => (acc[p.type] = p.value, acc), {});
    return `${parts.day}/${parts.month}/${parts.year} ${parts.hour}:${parts.minute}`;
  };

  /** Cablea un botón "ojo" para mostrar/ocultar un campo de contraseña */
  const wirePasswordToggle = (inputEl, btnEl) => {
    if (!inputEl || !btnEl) return;
    btnEl.innerHTML = _eyeIcon();
    btnEl.addEventListener('click', () => {
      const isHidden = inputEl.type === 'password';
      inputEl.type = isHidden ? 'text' : 'password';
      btnEl.setAttribute('aria-label', isHidden ? 'Ocultar contraseña' : 'Mostrar contraseña');
      btnEl.innerHTML = isHidden ? _eyeOffIcon() : _eyeIcon();
    });
  };

  return {
    formatDateLong, formatDateShort, dateToISO, monthName, dayAbbr,
    daysInMonth, firstDayOfMonth, isWeekend, isSameDate, today,
    timesOverlap, isValidTimeRange, isValidEmail, isValidPassword,
    normalize, truncate, escapeHTML, uid, $, $$, wirePasswordToggle, formatDateTimeMX
  };
})();
