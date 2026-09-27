/* ============================================================
   RESERVATIONS.JS — CRUD de reservaciones
   HU-08 (crear), HU-09 (traslape), HU-10 (editar),
   HU-11 (cancelar), HU-12 (masiva), HU-15 (responsable)
   Plataforma Reservación Sala de Juntas · Ibero CDMX
   ============================================================ */

const Reservations = (() => {

  /* ════════════════════════════════════════
     CREATE — HU-08
     ════════════════════════════════════════ */
  const create = async (data) => {
    try {
      const reservation = await API.createReservation({
        responsible_id: data.responsible_id,
        room_id: data.room_id,
        area: data.area.trim(),
        start_time: data.start_time,
        end_time: data.end_time,
        observations: (data.observations ?? '').trim()
      });
      Store.addReservation(reservation);
      // Notifications no longer exposes onReservationCreated (it now only
      // exposes getLog(), which reads the server's own send log). Calling
      // the old hook threw here *after* the reservation was already saved,
      // which reported a false error back to the caller. See the same fix
      // for the recurring path: docs/changes/2026-09-22-secretary-feedback.md #6a.
      return { success: true, reservation };
    } catch (err) {
      if (err.status === 409) {
        return { success: false, error: 'overlap', conflictWith: err.data.conflictWith };
      }
      console.error('Create reservation error:', err);
      return { success: false, error: err.message || 'Error creating reservation' };
    }
  };

  /* ════════════════════════════════════════
     UPDATE — HU-10
     ════════════════════════════════════════ */
  const update = async (id, data) => {
    try {
      const reservation = await API.updateReservation(id, {
        responsible_id: data.responsible_id,
        room_id: data.room_id,
        area: data.area.trim(),
        start_time: data.start_time,
        end_time: data.end_time,
        observations: (data.observations ?? '').trim()
      });
      Store.updateReservation(id, reservation);
      return { success: true };
    } catch (err) {
      if (err.status === 409) {
        return { success: false, error: 'overlap', conflictWith: err.data.conflictWith };
      }
      if (err.status === 403) {
        return { success: false, error: 'forbidden', message: err.data?.error || 'No tienes permiso para modificar esta reservación' };
      }
      console.error('Update reservation error:', err);
      return { success: false, error: err.message || 'Error updating reservation' };
    }
  };

  /* ════════════════════════════════════════
     CANCEL — HU-11
     ════════════════════════════════════════ */
  const cancel = async (id) => {
    try {
      const cancelled = await API.cancelReservation(id);
      Store.updateReservation(id, cancelled);
      // Same dead-hook issue as create() above: Notifications no longer
      // exposes onReservationCancelled. Calling it threw after the
      // cancellation had already succeeded, which reported a false error to
      // the secretary even though the booking was correctly cancelled.
      return true;
    } catch (err) {
      console.error('Cancel reservation error:', err);
      return false;
    }
  };

  /* ════════════════════════════════════════
     BULK CANCEL — HU-12
     ════════════════════════════════════════ */
  const bulkCancel = async (ids) => {
    try {
      const result = await API.bulkCancelReservations(ids);
      result.reservations.forEach(r => Store.updateReservation(r.id, r));
      return result.deleted;
    } catch (err) {
      console.error('Bulk cancel error:', err);
      return 0;
    }
  };

  /* ════════════════════════════════════════
     READ
     ════════════════════════════════════════ */
  const getAll = () => Store.getState().reservations;
  const getById = (id) => Store.getState().reservations.find(r => r.id === id) ?? null;

  /* ════════════════════════════════════════
     OVERLAP DETECTION — HU-09
     ════════════════════════════════════════ */
  const checkOverlap = (date, startTime, endTime, roomId = null, excludeId = null) => {
    const allRes = Store.getState().reservations;

    for (const r of allRes) {
      // Skip cancelled reservations and the reservation being edited
      if (r.status === 'cancelled' || r.id === excludeId) continue;

      // Only check reservations on the same date, IN THE SAME ROOM — two
      // rooms booked at the same time are not a conflict. roomId=null (a
      // caller that hasn't picked a room yet) matches nothing, same as the
      // server: no room means nothing can be confirmed free yet.
      if (r.date !== date) continue;
      if (r.roomId !== roomId) continue;

      // Check time overlap: new period [start,end) overlaps with [rStart,rEnd)?
      if (startTime < r.endTime && endTime > r.startTime) {
        return r; // Return conflicting reservation
      }
    }

    return null; // No conflict
  };

  return {
    create,
    update,
    cancel,
    bulkCancel,
    getAll,
    getById,
    checkOverlap
  };
})();
