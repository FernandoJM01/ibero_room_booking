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
      Responsable:  r.responsible,
      'Área':       r.area,
      'Hora inicio':r.startTime,
      'Hora fin':   r.endTime,
      Observaciones:r.observations ?? '',
      Estado:       r.status === 'active' ? 'Activa' : 'Cancelada',
    }));
  }

  function _buildFilenameBase(label) {
    const ts = new Date().toISOString().slice(0, 10);
    return `reservaciones_${label}_${ts}`;
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

    // Header
    doc.setFillColor(239, 62, 66);          // --color-primary
    doc.rect(0, 0, 297, 18, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 10, 12);

    // Date range subtitle
    if (opts.dateFrom || opts.dateTo) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const from = opts.dateFrom ?? '—';
      const to   = opts.dateTo   ?? '—';
      doc.text(`Período: ${from} – ${to}`, 10, 17);
    }

    doc.setTextColor(0, 0, 0);

    // Auto-table
    const head = [['Fecha', 'Responsable', 'Área / Dpto.', 'Inicio', 'Fin', 'Estado']];
    const body = reservations.map(r => [
      r.date,
      r.responsible,
      r.area,
      r.startTime,
      r.endTime,
      r.status === 'active' ? 'Activa' : 'Cancelada',
    ]);

    // Use autoTable if available (jspdf-autotable plugin)
    if (typeof doc.autoTable === 'function') {
      doc.autoTable({
        startY: 22,
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
          0: { cellWidth: 28 },  // Fecha
          1: { cellWidth: 60 },  // Responsable
          2: { cellWidth: 70 },  // Área
          3: { cellWidth: 20 },  // Inicio
          4: { cellWidth: 20 },  // Fin
          5: { cellWidth: 22 },  // Estado
        },
        margin: { left: 10, right: 10 },
      });
    } else {
      // Fallback: simple manual table without plugin
      _drawSimpleTable(doc, head[0], body, 22);
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

    const filename = _buildFilenameBase(opts.dateFrom ?? 'completo') + '.pdf';
    doc.save(filename);
  }

  /** Minimal table renderer for when autoTable plugin is absent */
  function _drawSimpleTable(doc, headers, rows, startY) {
    const colW  = [28, 55, 65, 20, 20, 22];
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
    const ws        = window.XLSX.utils.json_to_sheet(rows);

    // Column widths
    ws['!cols'] = [
      { wch: 14 },  // Fecha
      { wch: 35 },  // Responsable
      { wch: 35 },  // Área
      { wch: 12 },  // Hora inicio
      { wch: 12 },  // Hora fin
      { wch: 40 },  // Observaciones
      { wch: 12 },  // Estado
    ];

    window.XLSX.utils.book_append_sheet(wb, ws, sheetName);

    const filename = _buildFilenameBase(opts.dateFrom ?? 'completo') + '.xlsx';
    window.XLSX.writeFile(wb, filename);
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
    a.download     = _buildFilenameBase(opts.dateFrom ?? 'completo') + '.csv';
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
