const express = require('express');
const pool = require('../db/pool');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const { requireSuperAdmin } = require('../middleware/requireRole');

const router = express.Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Any authenticated user (académico included — they need the list to see
// which room a reservation is in); writes are super-admin only, per route.
// See docs/changes/2026-09-27-multi-room-support.md.
router.use(auth);

// GET /api/rooms — everyone; ?all=1 (secretaria+) also returns retired rooms,
// for the admin list where they still need to be visible/reactivatable.
router.get('/', async (req, res) => {
  const includeInactive = req.query.all === '1' && req.user.role === 'secretaria';
  try {
    const result = await pool.query(
      `SELECT id, name, location, capacity, active, created_at FROM rooms
       ${includeInactive ? '' : 'WHERE active = true'}
       ORDER BY name ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching rooms:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/rooms — super-admin only
router.post('/', requireSuperAdmin, async (req, res) => {
  const { name, location, capacity } = req.body || {};

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'name is required' });
  }
  if (capacity !== undefined && capacity !== null && capacity !== '' && (!Number.isInteger(capacity) || capacity < 1)) {
    return res.status(400).json({ error: 'capacity must be a positive integer' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO rooms (name, location, capacity)
       VALUES ($1, $2, $3)
       RETURNING id, name, location, capacity, active, created_at`,
      [name.trim(), location?.trim() || null, capacity || null]
    );

    await pool.query(
      `INSERT INTO audit_log (user_id, action, entity, entity_id)
       VALUES ($1, $2, $3, $4)`,
      [req.user.id, 'create_room', 'rooms', result.rows[0].id]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating room:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/rooms/:id — super-admin only. Also how a room is reactivated
// (active: true) — there's no separate activate route, unlike users, since
// a room has no login/security implication to keep the actions separate.
router.put('/:id', requireSuperAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, location, capacity, active } = req.body || {};

  if (!UUID_RE.test(id)) {
    return res.status(400).json({ error: 'Invalid room id' });
  }
  if (name !== undefined && !name.trim()) {
    return res.status(400).json({ error: 'name cannot be empty' });
  }
  if (capacity !== undefined && capacity !== null && capacity !== '' && (!Number.isInteger(capacity) || capacity < 1)) {
    return res.status(400).json({ error: 'capacity must be a positive integer' });
  }

  try {
    const existing = await pool.query('SELECT id FROM rooms WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // COALESCE: a field omitted from the request body leaves the current
    // value in place (matches PUT /users/:id) — a toggle-only request like
    // { active: false } must not blank out name/location/capacity.
    const result = await pool.query(
      `UPDATE rooms
       SET name     = COALESCE($2, name),
           location = COALESCE($3, location),
           capacity = COALESCE($4, capacity),
           active   = COALESCE($5, active)
       WHERE id = $1
       RETURNING id, name, location, capacity, active, created_at`,
      [id, name?.trim(), location?.trim() || null, capacity ?? null, active]
    );

    await pool.query(
      `INSERT INTO audit_log (user_id, action, entity, entity_id)
       VALUES ($1, $2, $3, $4)`,
      [req.user.id, 'update_room', 'rooms', id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating room:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
