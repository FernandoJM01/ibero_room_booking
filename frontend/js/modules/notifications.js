/* ============================================================
   NOTIFICATIONS.JS — Notificaciones y correos
   HU-23 (confirmación), HU-24 (recordatorio), HU-25 (cancelación)
   Plataforma Reservación Sala de Juntas · Ibero CDMX
   ============================================================ */

const Notifications = (() => {

  /** 
   * Fetches the real notification audit log from the backend.
   * This retrieves exactly what the SMTP service executed.
   */
  const getLog = async () => {
    try {
      const logs = await API.getNotificationLog();
      return logs;
    } catch (err) {
      console.error('Failed to fetch notification logs:', err);
      return [];
    }
  };

  return { getLog };
})();
