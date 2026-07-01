/* ============================================================
   NOTIFICATIONS.JS — Notificaciones y correos (simulados)
   HU-23 (confirmación), HU-24 (recordatorio), HU-25 (cancelación)
   Plataforma Reservación Sala de Juntas · Ibero CDMX
   ============================================================ */

const Notifications = (() => {

  /** Registra un email simulado en el log */
  const logEmail = ({ to, subject, body }) => {
    const entry = {
      id:        Utils.uid(),
      type:      'email',
      to,
      subject,
      body,
      sentAt:    new Date().toISOString(),
      simulated: true
    };

    const { notificationLog } = Store.getState();
    Store.setState({ notificationLog: [entry, ...notificationLog] });
    Store.persist();

    // Console log para prototipo
    console.log(`[NOTIF] Email enviado → ${to}\nAsunto: ${subject}\n${body}`);
    return entry;
  };

  /** Notifica creación de reservación */
  const onReservationCreated = (reservation) => {
    return logEmail({
      to:      reservation.responsible,
      subject: `Confirmación de reservación — Sala de Juntas Ibero`,
      body:    `Se ha creado una reservación para el ${Utils.formatDateLong(reservation.date)} de ${reservation.startTime} a ${reservation.endTime}. Responsable: ${reservation.responsible}. Área: ${reservation.area}.`
    });
  };

  /** Notifica cancelación de reservación */
  const onReservationCancelled = (reservation) => {
    return logEmail({
      to:      reservation.responsible,
      subject: `Cancelación de reservación — Sala de Juntas Ibero`,
      body:    `La reservación del ${Utils.formatDateLong(reservation.date)} de ${reservation.startTime} a ${reservation.endTime} ha sido cancelada. Por favor contacta a la coordinación si tienes dudas.`
    });
  };

  /** Devuelve el log completo */
  const getLog = () => Store.getState().notificationLog;

  return { logEmail, onReservationCreated, onReservationCancelled, getLog };
})();
