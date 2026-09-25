const express = require('express');
const pool = require('../db/pool');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const {
  sendEmail,
  reservationCreatedEmail,
  reservationUpdatedEmail,
  reservationCancelledEmail,
  reservationAdminModifiedEmail,
  reservationAdminCancelledEmail,
} = require('../utils/mailer');
const { buildCreateDetails, buildUpdateChanges, logReservationEvent } = require('../utils/reservationAudit');

const router = express.Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Write endpoints must return the same shape as the list endpoint (creator
// and last-modifier names joined in). A bare `RETURNING *` row lacks them,
// which made the History table lose "Creado por"/"Modificado por" until a
// full page reload.
const RESERVATION_WITH_NAMES = `
  SELECT r.*, u.name AS creator_name, lm.name AS last_modified_by_name,
         ec.email AS external_email, ec.organization AS external_organization
  FROM reservations r
  LEFT JOIN users u  ON u.id  = r.created_by
  LEFT JOIN users lm ON lm.id = r.last_modified_by
  LEFT JOIN external_contacts ec ON ec.id = r.external_responsible_id`;

const fetchWithNames = async (db, id) =>
  (await db.query(`${RESERVATION_WITH_NAMES} WHERE r.id = $1`, [id])).rows[0];

// All reservations routes require authentication
router.use(auth);

// POST /api/reservations/recurring-group - Create recurring group (for HU-27)
router.post('/recurring-group', requireRole('secretaria'), async (req, res) => {
  const { pattern, endDate, maxOccurrences } = req.body;

  if (!pattern || !['daily', 'weekly', 'biweekly', 'monthly'].includes(pattern)) {
    return res.status(400).json({ error: 'Invalid pattern' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO recurring_groups (pattern, end_date, max_occurrences)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [pattern, endDate || null, maxOccurrences || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating recurring group:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/reservations - Get all reservations with optional filters
router.get('/', async (req, res) => {
  const { status, dateFrom, dateTo, responsible } = req.query;

  try {
    let query = `
      SELECT r.*, u.name AS creator_name, lm.name AS last_modified_by_name,
             ec.email AS external_email, ec.organization AS external_organization
      FROM reservations r
      LEFT JOIN users u  ON u.id  = r.created_by
      LEFT JOIN users lm ON lm.id = r.last_modified_by
      LEFT JOIN external_contacts ec ON ec.id = r.external_responsible_id
      WHERE 1=1`;
    const params = [];
    let paramCount = 1;

    if (status) {
      query += ` AND r.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (dateFrom) {
      query += ` AND r.start_time >= $${paramCount}`;
      params.push(dateFrom);
      paramCount++;
    }

    if (dateTo) {
      query += ` AND r.end_time <= $${paramCount}`;
      params.push(dateTo);
      paramCount++;
    }

    if (responsible) {
      query += ` AND r.responsible_name ILIKE $${paramCount}`;
      params.push(`%${responsible}%`);
      paramCount++;
    }

    // Security: Academics should only see reservations they own or created
    if (req.user.role === 'academico') {
      query += ` AND (r.created_by = $${paramCount} OR r.responsible_id = $${paramCount})`;
      params.push(req.user.id);
      paramCount++;
    }

    query += ' ORDER BY r.start_time ASC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching reservations:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/reservations/week?date=YYYY-MM-DD - Get all reservations in the week containing the given date (Mon-Sun)
router.get('/week', async (req, res) => {
  const { date } = req.query;

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'date (YYYY-MM-DD) required' });
  }

  // Compute Monday of the week containing `date` and the Monday of the next week.
  const ref = new Date(`${date}T00:00:00Z`);
  const dow = ref.getUTCDay();                    // 0=Sun … 6=Sat
  const diffToMonday = dow === 0 ? -6 : 1 - dow;
  const weekStart = new Date(ref);
  weekStart.setUTCDate(ref.getUTCDate() + diffToMonday);
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekStart.getUTCDate() + 7);

  try {
    const result = await pool.query(
      `SELECT r.*, u.name AS creator_name, lm.name AS last_modified_by_name,
              ec.email AS external_email, ec.organization AS external_organization
       FROM reservations r
       LEFT JOIN users u  ON u.id  = r.created_by
       LEFT JOIN users lm ON lm.id = r.last_modified_by
       LEFT JOIN external_contacts ec ON ec.id = r.external_responsible_id
       WHERE r.start_time >= $1 AND r.start_time < $2
       ORDER BY r.start_time ASC`,
      [weekStart.toISOString(), weekEnd.toISOString()]
    );
    res.json({
      weekStart: weekStart.toISOString().slice(0, 10),
      reservations: result.rows
    });
  } catch (err) {
    console.error('Error fetching week reservations:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/reservations/multi - Create multiple reservations in one logical booking (secretaria only)
router.post('/multi', requireRole('secretaria'), async (req, res) => {
  const { intervals, responsible_id, external_responsible_id, area, observations } = req.body || {};

  if (!Array.isArray(intervals) || intervals.length === 0) {
    return res.status(400).json({ error: 'intervals[] is required' });
  }
  if (!responsible_id && !external_responsible_id) {
    return res.status(400).json({ error: 'responsible_id or external_responsible_id is required' });
  }
  if (responsible_id && external_responsible_id) {
    return res.status(400).json({ error: 'Provide only one of responsible_id or external_responsible_id' });
  }
  if (!area) {
    return res.status(400).json({ error: 'area is required' });
  }
  for (const it of intervals) {
    if (!it?.start_time || !it?.end_time) {
      return res.status(400).json({ error: 'each interval needs start_time and end_time' });
    }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Look up responsible entity
    let responsible;
    let internalId = null;
    let externalId = null;

    if (responsible_id) {
      const userResult = await client.query(
        'SELECT id, name, email FROM users WHERE id = $1 AND active = true',
        [responsible_id]
      );
      if (userResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Responsible user not found' });
      }
      responsible = userResult.rows[0];
      internalId = responsible.id;
    } else {
      const extResult = await client.query(
        'SELECT id, name, email FROM external_contacts WHERE id = $1',
        [external_responsible_id]
      );
      if (extResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'External responsible contact not found' });
      }
      responsible = extResult.rows[0];
      externalId = responsible.id;
    }

    // Conflict check across all intervals (incl. against each other)
    for (let i = 0; i < intervals.length; i++) {
      const a = intervals[i];
      // Self-overlap within payload
      for (let j = i + 1; j < intervals.length; j++) {
        const b = intervals[j];
        if (a.start_time < b.end_time && a.end_time > b.start_time) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'Selected intervals overlap each other' });
        }
      }
      // Overlap with existing active reservations
      const overlap = await client.query(
        `SELECT id, responsible_name, start_time, end_time
         FROM reservations
         WHERE status = 'active'
         AND start_time < $2 AND end_time > $1
         LIMIT 1`,
        [a.start_time, a.end_time]
      );
      if (overlap.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          error: 'overlap',
          message: 'Time slot is already booked',
          conflictWith: overlap.rows[0],
          intervalIndex: i,
        });
      }
    }

    // Generate one grouped_id when there are 2+ intervals
    const groupedRow = intervals.length > 1
      ? await client.query('SELECT gen_random_uuid() AS id')
      : null;
    const groupedId = groupedRow ? groupedRow.rows[0].id : null;

    const created = [];
    for (const it of intervals) {
      const ins = await client.query(
        `INSERT INTO reservations (
          responsible_id, external_responsible_id, responsible_name, area, start_time, end_time,
          observations, grouped_id, created_by, last_modified_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          internalId,
          externalId,
          responsible.name,
          area,
          it.start_time,
          it.end_time,
          (observations ?? '').trim() || null,
          groupedId,
          req.user.id,
          req.user.id,
        ]
      );
      created.push(ins.rows[0]);

      await logReservationEvent(client, {
        userId: req.user.id,
        action: 'create_reservation',
        reservationId: ins.rows[0].id,
        details: buildCreateDetails(ins.rows[0]),
      });
    }

    await client.query('COMMIT');

    // Confirmation email per interval (non-blocking)
    if (responsible.email) {
      for (const r of created) {
        const { subject, html } = reservationCreatedEmail(r);
        sendEmail(responsible.email, subject, html);
      }
    }

    const createdWithNames = await Promise.all(created.map(r => fetchWithNames(pool, r.id)));
    res.status(201).json({ reservations: createdWithNames, grouped_id: groupedId });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error creating multi reservation:', err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// GET /api/reservations/:id/history - Change log for one reservation (secretaria only)
router.get('/:id/history', requireRole('secretaria'), async (req, res) => {
  const { id } = req.params;
  if (!UUID_RE.test(id)) {
    return res.status(400).json({ error: 'Invalid reservation id' });
  }

  try {
    const result = await pool.query(
      `SELECT a.id, a.action, a.timestamp, a.details, u.name AS user_name
       FROM audit_log a
       LEFT JOIN users u ON u.id = a.user_id
       WHERE a.entity = 'reservations'
         AND a.entity_id = $1
         AND a.action IN ('create_reservation', 'update_reservation', 'cancel_reservation')
       ORDER BY a.timestamp DESC, a.id`,
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching reservation history:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/reservations/:id - Get single reservation
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(`
      SELECT r.*, u.name AS creator_name, lm.name AS last_modified_by_name,
             ec.email AS external_email, ec.organization AS external_organization
      FROM reservations r
      LEFT JOIN users u  ON u.id  = r.created_by
      LEFT JOIN users lm ON lm.id = r.last_modified_by
      LEFT JOIN external_contacts ec ON ec.id = r.external_responsible_id
      WHERE r.id = $1
    `, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Reservation not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching reservation:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/reservations - Create new reservation (secretaria only)
router.post('/', requireRole('secretaria'), async (req, res) => {
  const {
    responsible_id,
    external_responsible_id,
    area,
    start_time,
    end_time,
    observations,
    is_recurring,
    recurring_group
  } = req.body;

  if ((!responsible_id && !external_responsible_id) || !area || !start_time || !end_time) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  if (responsible_id && external_responsible_id) {
    return res.status(400).json({ error: 'Provide only one of responsible_id or external_responsible_id' });
  }

  try {
    // Look up responsible entity
    let responsible;
    let internalId = null;
    let externalId = null;

    if (responsible_id) {
      const userResult = await pool.query(
        'SELECT id, name, email FROM users WHERE id = $1 AND active = true',
        [responsible_id]
      );
      if (userResult.rows.length === 0) {
        return res.status(400).json({ error: 'Responsible user not found' });
      }
      responsible = userResult.rows[0];
      internalId = responsible.id;
    } else {
      const extResult = await pool.query(
        'SELECT id, name, email FROM external_contacts WHERE id = $1',
        [external_responsible_id]
      );
      if (extResult.rows.length === 0) {
        return res.status(400).json({ error: 'External responsible contact not found' });
      }
      responsible = extResult.rows[0];
      externalId = responsible.id;
    }

    // Check for overlap with active reservations
    const overlapCheck = await pool.query(
      `SELECT id, responsible_name, start_time, end_time
       FROM reservations
       WHERE status = 'active'
       AND start_time < $2
       AND end_time > $1`,
      [start_time, end_time]
    );

    if (overlapCheck.rows.length > 0) {
      return res.status(409).json({
        error: 'overlap',
        message: 'Time slot is already booked',
        conflictWith: overlapCheck.rows[0]
      });
    }

    // Create reservation
    const result = await pool.query(
      `INSERT INTO reservations (
        responsible_id, external_responsible_id, responsible_name, area, start_time, end_time,
        observations, is_recurring, recurring_group, created_by, last_modified_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        internalId,
        externalId,
        responsible.name,
        area,
        start_time,
        end_time,
        observations || null,
        is_recurring || false,
        recurring_group || null,
        req.user.id,
        req.user.id
      ]
    );

    await logReservationEvent(pool, {
      userId: req.user.id,
      action: 'create_reservation',
      reservationId: result.rows[0].id,
      details: buildCreateDetails(result.rows[0]),
    });

    // Send confirmation email to responsible person (non-blocking)
    const { subject, html } = reservationCreatedEmail(result.rows[0]);
    sendEmail(responsible.email, subject, html);

    res.status(201).json(await fetchWithNames(pool, result.rows[0].id));
  } catch (err) {
    console.error('Error creating reservation:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/reservations/:id - Update reservation (secretaria only, own reservation; super-admin for any)
router.put('/:id', requireRole('secretaria'), async (req, res) => {
  const { id } = req.params;
  const { responsible_id, external_responsible_id, area, start_time, end_time, observations } = req.body;

  try {
    // Check if reservation exists
    const existing = await pool.query('SELECT * FROM reservations WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Reservation not found' });
    }

    // Any secretaria may edit any reservation (the "Solicitudes de cambio"
    // approval workflow was removed at the secretary's request — it stopped
    // covering for a sick/unavailable colleague from blocking work). Every
    // edit is still attributed via last_modified_by/audit_log, and the
    // original creator is notified below when someone else changes it.
    // See docs/changes/2026-09-22-secretary-feedback.md #7.
    const isOwner = existing.rows[0].created_by === req.user.id;

    // Look up responsible entity if provided
    let responsible = null;
    let internalId = null;
    let externalId = null;

    if (responsible_id) {
      const userResult = await pool.query(
        'SELECT id, name, email FROM users WHERE id = $1 AND active = true',
        [responsible_id]
      );
      if (userResult.rows.length === 0) {
        return res.status(400).json({ error: 'Responsible user not found' });
      }
      responsible = userResult.rows[0];
      internalId = responsible.id;
    } else if (external_responsible_id) {
      const extResult = await pool.query(
        'SELECT id, name, email FROM external_contacts WHERE id = $1',
        [external_responsible_id]
      );
      if (extResult.rows.length === 0) {
        return res.status(400).json({ error: 'External responsible contact not found' });
      }
      responsible = extResult.rows[0];
      externalId = responsible.id;
    }

    // Check for overlap (excluding current reservation)
    if (start_time && end_time) {
      const overlapCheck = await pool.query(
        `SELECT id FROM reservations
         WHERE status = 'active' AND id != $1
         AND start_time < $3 AND end_time > $2`,
        [id, start_time, end_time]
      );

      if (overlapCheck.rows.length > 0) {
        return res.status(409).json({ error: 'Time slot is already booked' });
      }
    }

    // If we fetched a new responsible, we overwrite both fields to preserve the XOR constraint
    const setResId = (responsible_id || external_responsible_id) ? internalId : existing.rows[0].responsible_id;
    const setExtId = (responsible_id || external_responsible_id) ? externalId : existing.rows[0].external_responsible_id;

    // Update reservation
    const result = await pool.query(
      `UPDATE reservations
       SET responsible_id   = $2,
           external_responsible_id = $3,
           responsible_name = COALESCE($4, responsible_name),
           area             = COALESCE($5, area),
           start_time       = COALESCE($6, start_time),
           end_time         = COALESCE($7, end_time),
           observations     = COALESCE($8, observations),
           last_modified_by = $9,
           updated_at       = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, setResId, setExtId, responsible?.name ?? null, area, start_time, end_time, observations, req.user.id]
    );

    const before = existing.rows[0];
    const after  = result.rows[0];

    // Audit trail: one row per edit that actually changed something, with a
    // before/after diff for the History "Ver cambios" timeline.
    const auditChanges = buildUpdateChanges(before, after);
    if (auditChanges.length) {
      await logReservationEvent(pool, {
        userId: req.user.id,
        action: 'update_reservation',
        reservationId: id,
        details: { changes: auditChanges },
      });
    }

    // Compute which fields actually changed and notify the responsible person
    const fieldLabels = {
      responsible_name: 'responsable',
      area: 'área',
      start_time: 'inicio',
      end_time: 'fin',
      observations: 'observaciones',
    };
    const changes = Object.keys(fieldLabels).filter(k => {
      const a = before[k] instanceof Date ? before[k].toISOString() : before[k];
      const b = after[k]  instanceof Date ? after[k].toISOString()  : after[k];
      return a !== b;
    }).map(k => fieldLabels[k]);

    if (changes.length) {
      let email = null;
      if (after.responsible_id) {
        const userQ = await pool.query('SELECT email FROM users WHERE id = $1', [after.responsible_id]);
        email = userQ.rows[0]?.email;
      } else if (after.external_responsible_id) {
        const extQ = await pool.query('SELECT email FROM external_contacts WHERE id = $1', [after.external_responsible_id]);
        email = extQ.rows[0]?.email;
      }
      
      if (email) {
        const { subject, html } = reservationUpdatedEmail(after, changes);
        sendEmail(email, subject, html);
      }
    }

    // Notify the creating secretary whenever someone else modifies their
    // reservation (used to be admin-only; now any secretary can edit any
    // reservation, so any non-owner edit should notify the creator).
    if (!isOwner && before.created_by) {
      const creatorQ = await pool.query('SELECT email FROM users WHERE id = $1', [before.created_by]);
      if (creatorQ.rows[0]?.email) {
        const { subject, html } = reservationAdminModifiedEmail(after, req.user.name, changes);
        sendEmail(creatorQ.rows[0].email, subject, html);
      }
    }

    res.json(await fetchWithNames(pool, id));
  } catch (err) {
    console.error('Error updating reservation:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// NOTE: must stay above DELETE /:id — Express matches routes in order, and
// '/:id' would otherwise capture the literal path '/bulk' (500: invalid uuid).
// DELETE /api/reservations/bulk - Cancel multiple reservations
// Secretaries may only cancel their own; super-admin may cancel any
router.delete('/bulk', requireRole('secretaria'), async (req, res) => {
  const { ids } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'ids array required' });
  }

  try {
    // Any secretaria may bulk-cancel any reservation — see the note in
    // PUT /:id above. See docs/changes/2026-09-22-secretary-feedback.md #7.
    const result = await pool.query(
      `UPDATE reservations SET status = 'cancelled', last_modified_by = $2, updated_at = NOW()
       WHERE id = ANY($1::uuid[]) AND status = 'active'
       RETURNING *`,
      [ids, req.user.id]
    );

    // One audit row per reservation (with its id) so each reservation's
    // own change history shows the cancellation.
    for (const r of result.rows) {
      await logReservationEvent(pool, {
        userId: req.user.id,
        action: 'cancel_reservation',
        reservationId: r.id,
        details: { bulk: true },
      });
    }

    // Send a cancellation email per affected reservation (non-blocking)
    const responsibleIds = [...new Set(result.rows.map(r => r.responsible_id).filter(Boolean))];
    const externalIds = [...new Set(result.rows.map(r => r.external_responsible_id).filter(Boolean))];
    
    const emailById = new Map();
    const emailByExtId = new Map();

    if (responsibleIds.length) {
      const usersQ = await pool.query(
        'SELECT id, email FROM users WHERE id = ANY($1::uuid[])',
        [responsibleIds]
      );
      usersQ.rows.forEach(u => emailById.set(u.id, u.email));
    }
    
    if (externalIds.length) {
      const extQ = await pool.query(
        'SELECT id, email FROM external_contacts WHERE id = ANY($1::uuid[])',
        [externalIds]
      );
      extQ.rows.forEach(ec => emailByExtId.set(ec.id, ec.email));
    }

    for (const reservation of result.rows) {
      const email = reservation.responsible_id 
        ? emailById.get(reservation.responsible_id)
        : emailByExtId.get(reservation.external_responsible_id);
        
      if (email) {
        const { subject, html } = reservationCancelledEmail(reservation);
        sendEmail(email, subject, html);
      }
    }

    const withNames = await Promise.all(result.rows.map(r => fetchWithNames(pool, r.id)));
    res.json({ deleted: result.rows.length, reservations: withNames });
  } catch (err) {
    console.error('Error bulk cancelling reservations:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/reservations/:id - Cancel single reservation (soft delete)
// Own reservations: any secretaria; other secretaries' reservations: super-admin only
router.delete('/:id', requireRole('secretaria'), async (req, res) => {
  const { id } = req.params;

  try {
    const existing = await pool.query('SELECT * FROM reservations WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Reservation not found' });
    }

    // Any secretaria may cancel any reservation — see the note in PUT /:id
    // above. See docs/changes/2026-09-22-secretary-feedback.md #7.
    const isOwner = existing.rows[0].created_by === req.user.id;

    // Already cancelled: nothing to change, log or notify.
    if (existing.rows[0].status === 'cancelled') {
      return res.json(await fetchWithNames(pool, id));
    }

    const result = await pool.query(
      `UPDATE reservations SET status = 'cancelled', last_modified_by = $2, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, req.user.id]
    );

    await logReservationEvent(pool, {
      userId: req.user.id,
      action: 'cancel_reservation',
      reservationId: id,
    });

    const cancelled = result.rows[0];

    // Send cancellation email to responsible person (non-blocking)
    let respEmail = null;
    if (cancelled.responsible_id) {
      const resp = await pool.query('SELECT email FROM users WHERE id = $1', [cancelled.responsible_id]);
      respEmail = resp.rows[0]?.email;
    } else if (cancelled.external_responsible_id) {
      const extQ = await pool.query('SELECT email FROM external_contacts WHERE id = $1', [cancelled.external_responsible_id]);
      respEmail = extQ.rows[0]?.email;
    }

    if (respEmail) {
      const { subject, html } = reservationCancelledEmail(cancelled);
      sendEmail(respEmail, subject, html);
    }

    // Notify the creating secretary whenever someone else cancels their
    // reservation (used to be admin-only; see the note in PUT /:id above).
    if (!isOwner && cancelled.created_by) {
      const creatorQ = await pool.query('SELECT email FROM users WHERE id = $1', [cancelled.created_by]);
      if (creatorQ.rows[0]?.email) {
        const { subject, html } = reservationAdminCancelledEmail(cancelled, req.user.name);
        sendEmail(creatorQ.rows[0].email, subject, html);
      }
    }

    res.json(await fetchWithNames(pool, id));
  } catch (err) {
    console.error('Error cancelling reservation:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
