/* ============================================================
   BACKUP.JS — Respaldo de datos (SQL)
   HU-18 (respaldo automático)
   Plataforma Reservación Sala de Juntas · Ibero CDMX
   ============================================================ */

const Backup = (() => {

  const LOG_KEY = 'ibero_backup_log';

  /* ════════════════════════════════════════════════════════
     CREAR RESPALDO — solicita un dump de PostgreSQL
  ════════════════════════════════════════════════════════ */

  /**
   * create() — solicita al servidor un dump de PostgreSQL
   * @returns {Promise<{ success: boolean, filename?: string, error?: string }>}
   */
  async function create() {
    try {
      const token = localStorage.getItem('ibero_jwt');
      const response = await fetch('/api/backups/export', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Extraer el nombre del archivo del header Content-Disposition si es posible
      const disposition = response.headers.get('Content-Disposition');
      let filename = 'respaldo_ibero.sql';
      if (disposition && disposition.includes('filename="')) {
        filename = disposition.split('filename="')[1].split('"')[0];
      } else {
        const ts = new Date().toISOString().slice(0, 16).replace('T', '_').replace(':', '-');
        filename = `respaldo_ibero_${ts}.sql`;
      }

      const blob = await response.blob();
      _triggerDownload(blob, filename);

      _appendLog({
        id:        Utils.uid(),
        type:      'export',
        status:    'success',
        filename,
        sizeBytes: blob.size,
        createdAt: new Date().toISOString(),
        counts: {
          info: 'Full PostgreSQL DB Dump'
        },
      });

      return { success: true, filename };
    } catch (err) {
      console.error('Error downloading backup:', err);
      _appendLog({
        id:        Utils.uid(),
        type:      'export',
        status:    'error',
        filename:  'Fallido',
        sizeBytes: 0,
        createdAt: new Date().toISOString(),
        error:     err.message,
      });
      return { success: false, error: err.message };
    }
  }

  /* ════════════════════════════════════════════════════════
     LOG DE RESPALDOS
  ════════════════════════════════════════════════════════ */

  function getLog() {
    try {
      return JSON.parse(localStorage.getItem(LOG_KEY) ?? '[]');
    } catch { return []; }
  }

  function clearLog() {
    localStorage.removeItem(LOG_KEY);
  }

  function _appendLog(entry) {
    const log = getLog();
    log.unshift(entry);
    if (log.length > 30) log.splice(30);
    localStorage.setItem(LOG_KEY, JSON.stringify(log));
  }

  /* ════════════════════════════════════════════════════════
     HELPERS
  ════════════════════════════════════════════════════════ */

  function _triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href    = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1500);
  }

  /** Formatea bytes a "12.4 KB" / "1.2 MB" */
  function formatSize(bytes) {
    if (bytes < 1024)        return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  /** Mensajes de error legibles */
  const ERROR_MSGS = {
    invalid_file_type: 'El archivo debe ser un JSON exportado por este sistema.',
    invalid_format:    'El archivo no tiene el formato correcto de respaldo.',
    parse_error:       'El archivo está corrupto o no es un JSON válido.',
    read_error:        'No se pudo leer el archivo.',
  };

  function errorMessage(code) {
    return ERROR_MSGS[code] ?? 'Error desconocido.';
  }

  return {
    create,
    getLog,
    clearLog,
    formatSize,
    errorMessage,
  };
})();
