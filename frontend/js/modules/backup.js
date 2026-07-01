/* ============================================================
   BACKUP.JS — Respaldo y recuperación de datos
   HU-18 (respaldo automático), HU-19 (recuperación ante fallos)
   Plataforma Reservación Sala de Juntas · Ibero CDMX

   Implementación de prototipo: descarga/carga de archivos JSON
   (en producción se conectaría a Cloud Storage / S3).
   ============================================================ */

const Backup = (() => {

  const LOG_KEY     = 'ibero_backup_log';
  const APP_VERSION = '1.0';

  /* ════════════════════════════════════════════════════════
     CREAR RESPALDO — descarga un archivo JSON con todo el estado
  ════════════════════════════════════════════════════════ */

  /**
   * create() — serializa el estado de la app y lo descarga como .json
   * @returns {{ success: boolean, filename: string }}
   */
  function create() {
    const state = Store.getState();

    const snapshot = {
      _meta: {
        version:   APP_VERSION,
        createdAt: new Date().toISOString(),
        app:       'Sala de Juntas Ibero',
      },
      reservations:       state.reservations       ?? [],
      recurringGroups:    state.recurringGroups     ?? [],
      users:              state.users               ?? [],
      holidays:           state.holidays            ?? [],
      responsibleHistory: state.responsibleHistory  ?? [],
      notificationLog:    state.notificationLog     ?? [],
    };

    const json     = JSON.stringify(snapshot, null, 2);
    const blob     = new Blob([json], { type: 'application/json;charset=utf-8' });
    const ts       = new Date().toISOString().slice(0, 16).replace('T', '_').replace(':', '-');
    const filename = `backup_sala_juntas_${ts}.json`;

    _triggerDownload(blob, filename);

    _appendLog({
      id:        Utils.uid(),
      type:      'export',
      status:    'success',
      filename,
      sizeBytes: blob.size,
      createdAt: new Date().toISOString(),
      counts: {
        reservations: snapshot.reservations.length,
        users:        snapshot.users.length,
        holidays:     snapshot.holidays.length,
      },
    });

    return { success: true, filename };
  }

  /* ════════════════════════════════════════════════════════
     RESTAURAR — lee un archivo JSON y recarga el estado
  ════════════════════════════════════════════════════════ */

  /**
   * restore(file) — carga un archivo de respaldo (File object desde <input>)
   * @param {File} file
   * @returns {Promise<{ success, restored?, error? }>}
   */
  function restore(file) {
    return new Promise((resolve) => {
      if (!file || file.type !== 'application/json') {
        resolve({ success: false, error: 'invalid_file_type' });
        return;
      }

      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const snapshot = JSON.parse(e.target.result);

          // Basic validation: must have reservations and users arrays
          if (!Array.isArray(snapshot.reservations) || !Array.isArray(snapshot.users)) {
            resolve({ success: false, error: 'invalid_format' });
            return;
          }

          // Restore state
          Store.setState({
            reservations:       snapshot.reservations       ?? [],
            recurringGroups:    snapshot.recurringGroups     ?? [],
            users:              snapshot.users               ?? [],
            holidays:           snapshot.holidays            ?? [],
            responsibleHistory: snapshot.responsibleHistory  ?? [],
            notificationLog:    snapshot.notificationLog     ?? [],
          });
          Store.persist();

          const counts = {
            reservations: snapshot.reservations.length,
            users:        snapshot.users.length,
            holidays:     (snapshot.holidays ?? []).length,
          };

          _appendLog({
            id:        Utils.uid(),
            type:      'import',
            status:    'success',
            filename:  file.name,
            sizeBytes: file.size,
            createdAt: new Date().toISOString(),
            counts,
          });

          resolve({ success: true, restored: counts });

        } catch (err) {
          _appendLog({
            id:        Utils.uid(),
            type:      'import',
            status:    'error',
            filename:  file.name,
            sizeBytes: file.size,
            createdAt: new Date().toISOString(),
            error:     err.message,
          });
          resolve({ success: false, error: 'parse_error' });
        }
      };

      reader.onerror = () => {
        resolve({ success: false, error: 'read_error' });
      };

      reader.readAsText(file, 'utf-8');
    });
  }

  /* ════════════════════════════════════════════════════════
     AUTO-RESPALDO — guarda snapshot en localStorage (simulación)
     En producción se enviaría a un endpoint de la API.
  ════════════════════════════════════════════════════════ */

  /**
   * autoSave() — crea una copia en memoria (localStorage)
   * Llamar periódicamente (p.ej. cada 30 min) para tener un punto de restauración.
   * @returns {{ success: boolean, key: string }}
   */
  function autoSave() {
    const state    = Store.getState();
    const snapshot = {
      _meta:              { version: APP_VERSION, createdAt: new Date().toISOString() },
      reservations:       state.reservations      ?? [],
      recurringGroups:    state.recurringGroups    ?? [],
      users:              state.users              ?? [],
      holidays:           state.holidays           ?? [],
      responsibleHistory: state.responsibleHistory ?? [],
    };

    const key = 'ibero_auto_backup';
    try {
      localStorage.setItem(key, JSON.stringify(snapshot));
      _appendLog({
        id:        Utils.uid(),
        type:      'auto',
        status:    'success',
        filename:  '(auto)',
        sizeBytes: JSON.stringify(snapshot).length,
        createdAt: new Date().toISOString(),
        counts: {
          reservations: snapshot.reservations.length,
          users:        snapshot.users.length,
          holidays:     snapshot.holidays.length,
        },
      });
      return { success: true, key };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * restoreAuto() — restaura el último auto-respaldo guardado en localStorage
   * @returns {{ success: boolean, restored?, error? }}
   */
  function restoreAuto() {
    try {
      const raw = localStorage.getItem('ibero_auto_backup');
      if (!raw) return { success: false, error: 'no_auto_backup' };

      const snapshot = JSON.parse(raw);
      if (!Array.isArray(snapshot.reservations)) return { success: false, error: 'invalid_format' };

      Store.setState({
        reservations:       snapshot.reservations       ?? [],
        recurringGroups:    snapshot.recurringGroups     ?? [],
        users:              snapshot.users               ?? [],
        holidays:           snapshot.holidays            ?? [],
        responsibleHistory: snapshot.responsibleHistory  ?? [],
      });
      Store.persist();

      return {
        success:  true,
        restored: {
          reservations: snapshot.reservations.length,
          users:        (snapshot.users ?? []).length,
          holidays:     (snapshot.holidays ?? []).length,
        },
        createdAt: snapshot._meta?.createdAt ?? null,
      };
    } catch (err) {
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
    no_auto_backup:    'No hay un respaldo automático disponible.',
  };

  function errorMessage(code) {
    return ERROR_MSGS[code] ?? 'Error desconocido.';
  }

  return {
    create,
    restore,
    autoSave,
    restoreAuto,
    getLog,
    clearLog,
    formatSize,
    errorMessage,
  };
})();
