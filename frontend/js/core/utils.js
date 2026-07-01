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

  /** Valida contraseña (mín. 8 chars) */
  const isValidPassword = (pwd) => pwd.length >= 8;

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

  return {
    formatDateLong, formatDateShort, dateToISO, monthName, dayAbbr,
    daysInMonth, firstDayOfMonth, isWeekend, isSameDate, today,
    timesOverlap, isValidTimeRange, isValidEmail, isValidPassword,
    normalize, truncate, escapeHTML, uid, $, $$
  };
})();
