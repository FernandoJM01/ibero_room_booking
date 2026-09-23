const express = require('express');
const pool = require('../db/pool');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const { requireSuperAdmin } = require('../middleware/requireRole');

const router = express.Router();

// Small key/value settings store (see migration 007). Currently used for the
// current semester's date range, read by the recurring-reservation form's
// "Usar fin de semestre" shortcut. Keys are an allowlist so this endpoint
// can't be used to write arbitrary settings.
// See docs/changes/2026-09-22-secretary-feedback.md #6b.
const ALLOWED_KEYS = ['semester_start', 'semester_end'];

// All settings routes require at least a secretaria (read-only for them;
// writes are super-admin only, enforced per-route below).
router.use(auth, requireRole('secretaria'));

// GET /api/settings — any secretaria may read (needed to show the
// "Usar fin de semestre" shortcut in the reservation form).
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT key, value FROM app_settings WHERE key = ANY($1::text[])`,
      [ALLOWED_KEYS]
    );
    const settings = {};
    result.rows.forEach(row => { settings[row.key] = row.value; });
    res.json(settings);
  } catch (err) {
    console.error('Error fetching settings:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/settings — super-admin only. Body: { key: value, ... } restricted
// to ALLOWED_KEYS.
router.put('/', requireSuperAdmin, async (req, res) => {
  const entries = Object.entries(req.body || {}).filter(([key]) => ALLOWED_KEYS.includes(key));

  if (entries.length === 0) {
    return res.status(400).json({ error: 'No valid settings keys provided' });
  }

  try {
    for (const [key, value] of entries) {
      await pool.query(
        `INSERT INTO app_settings (key, value, updated_by, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (key) DO UPDATE
           SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = NOW()`,
        [key, value === null || value === undefined ? null : String(value), req.user.id]
      );
    }

    await pool.query(
      `INSERT INTO audit_log (user_id, action, entity, details)
       VALUES ($1, $2, $3, $4)`,
      [req.user.id, 'update_settings', 'app_settings', JSON.stringify(Object.fromEntries(entries))]
    );

    const result = await pool.query(
      `SELECT key, value FROM app_settings WHERE key = ANY($1::text[])`,
      [ALLOWED_KEYS]
    );
    const settings = {};
    result.rows.forEach(row => { settings[row.key] = row.value; });
    res.json(settings);
  } catch (err) {
    console.error('Error updating settings:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
