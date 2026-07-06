const express = require('express');
const pool = require('../db/pool');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

const router = express.Router();

// Require authentication for all external contact routes
router.use(auth);

// GET /api/external-contacts - Fetch all external contacts with stats
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT ec.id, ec.name, ec.email, ec.organization, ec.created_at,
             COUNT(r.id)::int AS reservation_count,
             MAX(r.start_time) AS last_reservation
      FROM external_contacts ec
      LEFT JOIN reservations r ON r.external_responsible_id = ec.id
      GROUP BY ec.id
      ORDER BY ec.name ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching external contacts:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/external-contacts - Create a new external contact
// Only allow creation by secretaries or admins
router.post('/', requireRole('secretaria'), async (req, res) => {
  const { name, email, organization } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  try {
    // Check if the contact already exists
    const existing = await pool.query(
      'SELECT * FROM external_contacts WHERE email = $1',
      [email]
    );

    if (existing.rows.length > 0) {
      // Return the existing one rather than conflict, as it might be re-used
      return res.status(200).json(existing.rows[0]);
    }

    const result = await pool.query(
      `INSERT INTO external_contacts (name, email, organization)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name, email, organization || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating external contact:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/external-contacts/:id - Update an external contact
router.put('/:id', requireRole('secretaria'), async (req, res) => {
  const { id } = req.params;
  const { name, email, organization } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  try {
    // Check if the new email conflicts with another contact
    const existing = await pool.query(
      'SELECT id FROM external_contacts WHERE email = $1 AND id != $2',
      [email, id]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'El correo ya está en uso por otro contacto' });
    }

    const result = await pool.query(
      `UPDATE external_contacts 
       SET name = $1, email = $2, organization = $3 
       WHERE id = $4
       RETURNING *`,
      [name, email, organization || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating external contact:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
