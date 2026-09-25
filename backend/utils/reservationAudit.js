// Audit-trail helpers for reservations. Every create/edit/cancel writes one
// audit_log row; for edits, `details` carries a structured before/after diff
// that the History "Ver cambios" timeline renders.

const iso = (v) => (v instanceof Date ? v.toISOString() : v);
const text = (v) => (v ?? '');

function buildCreateDetails(row) {
  return {
    responsible_name: row.responsible_name,
    area: row.area,
    start_time: iso(row.start_time),
    end_time: iso(row.end_time),
  };
}

// Returns [] when nothing user-visible changed. Start/end are reported as one
// "schedule" change so the timeline can show "date, from–to → date, from–to".
function buildUpdateChanges(before, after) {
  const changes = [];

  if (iso(before.start_time) !== iso(after.start_time) || iso(before.end_time) !== iso(after.end_time)) {
    changes.push({
      field: 'schedule',
      from: { start_time: iso(before.start_time), end_time: iso(before.end_time) },
      to:   { start_time: iso(after.start_time),  end_time: iso(after.end_time) },
    });
  }
  if (before.responsible_name !== after.responsible_name) {
    changes.push({ field: 'responsible', from: before.responsible_name, to: after.responsible_name });
  }
  if (text(before.area) !== text(after.area)) {
    changes.push({ field: 'area', from: before.area, to: after.area });
  }
  if (text(before.observations) !== text(after.observations)) {
    changes.push({ field: 'observations', from: before.observations ?? null, to: after.observations ?? null });
  }
  return changes;
}

async function logReservationEvent(db, { userId, action, reservationId, details = null }) {
  await db.query(
    `INSERT INTO audit_log (user_id, action, entity, entity_id, details)
     VALUES ($1, $2, 'reservations', $3, $4)`,
    [userId, action, reservationId, details ? JSON.stringify(details) : null]
  );
}

module.exports = { buildCreateDetails, buildUpdateChanges, logReservationEvent };
