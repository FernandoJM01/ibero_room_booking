/* ============================================================
   EXPORT.JS — Exportación a PDF y Excel
   HU-28 (exportar PDF / Excel)
   Plataforma Reservación Sala de Juntas · Ibero CDMX

   Dependencias externas (CDN, cargadas por la página):
     - jsPDF  (window.jspdf.jsPDF)
     - SheetJS (window.XLSX)
   ============================================================ */

const Export = (() => {

  /* ── HELPERS COMUNES ──────────────────────────────────── */

  function _buildRows(reservations) {
    return reservations.map(r => ({
      Fecha:        r.date,
      Sala:         r.roomName ?? '—',
      Responsable:  r.responsible,
      Tipo:         r.externalEmail ? 'Externo' : 'Interno',
      'Creado por': r.creatorName ?? '—',
      'Nombre de la junta': r.area,
      'Hora inicio':r.startTime,
      'Hora fin':   r.endTime,
      Observaciones:r.observations ?? '',
      Estado:       r.status === 'active' ? 'Activa' : 'Cancelada',
    }));
  }

  /** Builds the "Filtros aplicados" lines shown in PDF/Excel headers.
   *  Prefers opts.filters (a page that knows its own filter UI, e.g.
   *  History, passes the exact human-readable lines); falls back to just
   *  the date range for pages that only filter by period (e.g. Estadísticas). */
  function _filterLines(opts) {
    if (Array.isArray(opts.filters) && opts.filters.length) return opts.filters;
    const lines = [];
    if (opts.dateFrom) lines.push(`Desde: ${Utils.formatDateShort(opts.dateFrom)}`);
    if (opts.dateTo)   lines.push(`Hasta: ${Utils.formatDateShort(opts.dateTo)}`);
    return lines;
  }

  function _generatedByLine(opts) {
    const name = opts.generatedBy ?? Store.getUser()?.name ?? '—';
    const now  = new Date();
    const date = now.toLocaleDateString('es-MX', { timeZone: 'America/Mexico_City' });
    const time = now.toLocaleTimeString('es-MX', { timeZone: 'America/Mexico_City', hour: '2-digit', minute: '2-digit' });
    return `Generado por ${name} — ${date} ${time}`;
  }

  /** Self-describing filename: reservaciones_<filtros>_<fecha-de-hoy>.<ext>
   *  e.g. reservaciones_activas_internos_2026-09-01_a_2026-09-30_2026-09-27.pdf
   *  Falls back to reservaciones_completo_<fecha>.<ext> when nothing is filtered. */
  function _buildFilenameBase(opts = {}) {
    const parts = [];
    if (opts.roomName) {
      // filename-safe: strip anything but letters/digits/spaces, then spaces -> _
      parts.push(opts.roomName.normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-zA-Z0-9 ]/g, '').trim().replace(/\s+/g, '_').toLowerCase());
    }
    if (opts.status && opts.status !== 'all') {
      parts.push(opts.status === 'active' ? 'activas' : 'canceladas');
    }
    if (opts.type && opts.type !== 'all') {
      parts.push(opts.type === 'internals' ? 'internos' : 'externos');
    }
    if (opts.dateFrom || opts.dateTo) {
      parts.push(`${opts.dateFrom || 'inicio'}_a_${opts.dateTo || 'hoy'}`);
    }
    if (!parts.length) parts.push('completo');
    parts.push(new Date().toISOString().slice(0, 10));
    return `reservaciones_${parts.join('_')}`;
  }

  /* ── PDF ──────────────────────────────────────────────── */

  /**
   * toPDF(reservations, opts)
   * opts: { title?, dateFrom?, dateTo? }
   * Requires jsPDF + jspdf-autotable loaded via CDN.
   */
  function toPDF(reservations, opts = {}) {
    const jsPDF = window.jspdf?.jsPDF ?? window.jsPDF;
    if (!jsPDF) {
      _notifyMissingLib('jsPDF');
      return;
    }

    const doc   = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const title = opts.title ?? 'Reservaciones — Sala de Juntas Ibero';

    // Banda de título
    doc.setFillColor(239, 62, 66);          // --color-primary
    doc.rect(0, 0, 297, 18, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 10, 12);
    doc.setTextColor(0, 0, 0);

    // Bloque de filtros aplicados + metadatos del reporte — para que un
    // académico que pide un reporte pueda ver, impreso, exactamente qué
    // se filtró, sin tener que anotarlo aparte.
    const filterLines = _filterLines(opts);
    const filterText  = filterLines.length ? filterLines.join('   ·   ') : 'Sin filtros aplicados';
    const wrapped     = doc.splitTextToSize(`Filtros: ${filterText}`, 277);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    let metaY = 24;
    wrapped.forEach(line => { doc.text(line, 10, metaY); metaY += 4.5; });
    doc.text(_generatedByLine(opts), 10, metaY); metaY += 4.5;
    doc.text(`Total de registros: ${reservations.length}`, 10, metaY); metaY += 3;

    const tableStartY = metaY + 3;

    // Auto-table
    const head = [['Fecha', 'Sala', 'Responsable', 'Tipo', 'Creado por', 'Nombre de la junta', 'Inicio', 'Fin']];
    const body = reservations.map(r => [
      r.date,
      r.roomName ?? '—',
      r.responsible,
      r.externalEmail ? 'Externo' : 'Interno',
      r.creatorName ?? '—',
      r.area,
      r.startTime,
      r.endTime,
    ]);

    // Use autoTable if available (jspdf-autotable plugin)
    if (typeof doc.autoTable === 'function') {
      doc.autoTable({
        startY: tableStartY,
        head,
        body,
        headStyles: {
          fillColor: [239, 62, 66],
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 9,
        },
        bodyStyles:  { fontSize: 8 },
        alternateRowStyles: { fillColor: [250, 250, 250] },
        columnStyles: {
          0: { cellWidth: 18 },  // Fecha
          1: { cellWidth: 25 },  // Sala
          2: { cellWidth: 32 },  // Responsable
          3: { cellWidth: 18 },  // Tipo
          4: { cellWidth: 25 },  // Creado por
          5: { cellWidth: 45 },  // Nombre de la junta
          6: { cellWidth: 12 },  // Inicio
          7: { cellWidth: 12 },  // Fin
        },
        margin: { left: 10, right: 10 },
      });
    } else {
      // Fallback: simple manual table without plugin
      _drawSimpleTable(doc, head[0], body, tableStartY);
    }

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(140, 140, 140);
      doc.text(
        `Exportado el ${new Date().toLocaleDateString('es-MX')} — Sala de Juntas Ibero CDMX`,
        10, 205
      );
      doc.text(`${i} / ${pageCount}`, 287, 205, { align: 'right' });
    }

    doc.save(_buildFilenameBase(opts) + '.pdf');
  }

  /** Minimal table renderer for when autoTable plugin is absent */
  function _drawSimpleTable(doc, headers, rows, startY) {
    const colW  = [18, 25, 32, 18, 25, 45, 12, 12];
    const rowH  = 7;
    let   x     = 10;
    let   y     = startY;
    const pageH = 200;

    // Header row
    doc.setFillColor(239, 62, 66);
    doc.rect(x, y, colW.reduce((a, b) => a + b, 0), rowH, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    headers.forEach((h, i) => {
      const cx = x + colW.slice(0, i).reduce((a, b) => a + b, 0);
      doc.text(String(h), cx + 2, y + 5);
    });

    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    y += rowH;

    rows.forEach((row, ri) => {
      if (y + rowH > pageH) { doc.addPage(); y = 15; }
      if (ri % 2 === 0) {
        doc.setFillColor(250, 250, 250);
        doc.rect(x, y, colW.reduce((a, b) => a + b, 0), rowH, 'F');
      }
      row.forEach((cell, i) => {
        const cx = x + colW.slice(0, i).reduce((a, b) => a + b, 0);
        const text = String(cell ?? '').substring(0, 35);
        doc.text(text, cx + 2, y + 5);
      });
      y += rowH;
    });
  }

  /* ── EXCEL ────────────────────────────────────────────── */

  /**
   * toExcel(reservations, opts)
   * opts: { sheetName?, title?, dateFrom?, dateTo? }
   * Requires SheetJS (window.XLSX) loaded via CDN.
   */
  function toExcel(reservations, opts = {}) {
    if (!window.XLSX) {
      _notifyMissingLib('SheetJS (XLSX)');
      return;
    }

    const rows      = _buildRows(reservations);
    const sheetName = opts.sheetName ?? 'Reservaciones';
    const wb        = window.XLSX.utils.book_new();
    const colCount  = Object.keys(rows[0] ?? {}).length || 1;

    // Header block (title, filters, who/when it was generated, row count) as
    // its own rows above the data table — same information as the PDF, so a
    // filtered report carries the filters it was run with even in Excel.
    const filterLines = _filterLines(opts);
    const headerBlock = [
      [opts.title ?? 'Reservaciones — Sala de Juntas Ibero'],
      [`Filtros: ${filterLines.length ? filterLines.join('   ·   ') : 'Sin filtros aplicados'}`],
      [_generatedByLine(opts)],
      [`Total de registros: ${reservations.length}`],
      [],
    ];
    const ws = window.XLSX.utils.aoa_to_sheet(headerBlock);
    window.XLSX.utils.sheet_add_json(ws, rows, { origin: headerBlock.length });
    ws['!merges'] = headerBlock.slice(0, 4).map((_, r) => ({
      s: { r, c: 0 }, e: { r, c: colCount - 1 },
    }));

    // Column widths
    ws['!cols'] = [
      { wch: 14 },  // Fecha
      { wch: 20 },  // Sala
      { wch: 35 },  // Responsable
      { wch: 12 },  // Tipo
      { wch: 30 },  // Creado por
      { wch: 35 },  // Nombre de la junta
      { wch: 12 },  // Hora inicio
      { wch: 12 },  // Hora fin
      { wch: 40 },  // Observaciones
      { wch: 12 },  // Estado
    ];

    window.XLSX.utils.book_append_sheet(wb, ws, sheetName);

    window.XLSX.writeFile(wb, _buildFilenameBase(opts) + '.xlsx');
  }

  /* ── CSV (fallback sin dependencias) ─────────────────── */

  /**
   * toCSV(reservations, opts)
   * Pure JS fallback — no external library needed.
   */
  function toCSV(reservations, opts = {}) {
    const rows    = _buildRows(reservations);
    const headers = Object.keys(rows[0] ?? {});
    const escape  = v => `"${String(v ?? '').replace(/"/g, '""')}"`;

    const lines = [
      headers.map(escape).join(','),
      ...rows.map(r => headers.map(h => escape(r[h])).join(',')),
    ];

    const blob     = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url      = URL.createObjectURL(blob);
    const a        = document.createElement('a');
    a.href         = url;
    a.download     = _buildFilenameBase(opts) + '.csv';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
  }

  /* ── UI HELPER — botones de exportación ──────────────── */

  /**
   * attachExportButtons({ pdfBtnId, excelBtnId, csvBtnId, getReservations, getOpts })
   * Wires click handlers to export buttons in the page.
   * getReservations() should return the current filtered list.
   * getOpts() should return { title?, dateFrom?, dateTo? }.
   */
  function attachExportButtons({ pdfBtnId, excelBtnId, csvBtnId, getReservations, getOpts = () => ({}) }) {
    _wire(pdfBtnId,   () => toPDF(getReservations(),   getOpts()));
    _wire(excelBtnId, () => toExcel(getReservations(), getOpts()));
    _wire(csvBtnId,   () => toCSV(getReservations(),   getOpts()));
  }

  function _wire(id, fn) {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', fn);
  }

  function _notifyMissingLib(name) {
    console.warn(`[Export] Librería ${name} no encontrada. Verifica que el CDN esté cargado.`);
    if (window.Toast) {
      Toast.show(`No se pudo exportar: librería ${name} no disponible.`, 'error');
    } else {
      alert(`Librería ${name} no disponible. Revisa la conexión o usa la exportación CSV.`);
    }
  }

  return { toPDF, toExcel, toCSV, attachExportButtons };
})();
