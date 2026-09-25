const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db/pool');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const {
  sendEmail,
  welcomeEmail,
  passwordChangedEmail,
  accountDeactivatedEmail,
} = require('../utils/mailer');

const router = express.Router();

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
function isValidPassword(password) {
  return PASSWORD_REGEX.test(password);
}

// All user routes require authentication
router.use(auth);

// GET /api/users - Get all users (any secretaria)
router.get('/', requireRole('secretaria'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, role, is_admin, active, last_login, created_at
       FROM users ORDER BY name ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/users - Create new user (any secretaria)
router.post('/', requireRole('secretaria'), async (req, res) => {
  const { name, email, password, role, is_admin } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'name, email, password, and role required' });
  }

  if (!['secretaria', 'academico'].includes(role)) {
    return res.status(400).json({ error: 'role must be "secretaria" or "academico"' });
  }

  if (!isValidPassword(password)) {
    return res.status(400).json({ error: 'password_too_weak' });
  }

  try {
    // Check if email exists
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already exists' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Security: only an existing super admin may grant super-admin on the
    // user they're creating. A plain secretaria's is_admin request is ignored
    // (this route is open to any secretaria — see requireRole above).
    const grantIsAdmin = req.user.isAdmin && is_admin === true;
    // A super admin always has the secretaria role (requireRole checks it).
    const finalRole = grantIsAdmin ? 'secretaria' : role;

    // Create user
    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, is_admin, active)
       VALUES ($1, $2, $3, $4, $5, true)
       RETURNING id, name, email, role, is_admin, active, created_at`,
      [name, email, passwordHash, finalRole, grantIsAdmin]
    );

    // Log to audit
    await pool.query(
      `INSERT INTO audit_log (user_id, action, entity, entity_id)
       VALUES ($1, $2, $3, $4)`,
      [req.user.id, 'create_user', 'users', result.rows[0].id]
    );

    // Welcome email (non-blocking)
    const loginUrl = process.env.APP_URL || 'http://localhost:8080';
    const { subject, html } = welcomeEmail(result.rows[0], loginUrl);
    sendEmail(result.rows[0].email, subject, html);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating user:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Any secretaria manages users, EXCEPT super-admin accounts: letting a plain
// secretaria edit (i.e. reset the password of) or deactivate a super admin
// would be a privilege-escalation path. Only a super admin touches those.
const ADMIN_ONLY_MSG = 'Only a super admin can modify a super admin account';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// PUT /api/users/:id - Update user (any secretaria; super-admin accounts: super admin only)
router.put('/:id', requireRole('secretaria'), async (req, res) => {
  const { id } = req.params;
  const { name, email, password, role, is_admin } = req.body;

  if (!UUID_RE.test(id)) {
    return res.status(400).json({ error: 'Invalid user id' });
  }
  if (role !== undefined && !['secretaria', 'academico'].includes(role)) {
    return res.status(400).json({ error: 'role must be "secretaria" or "academico"' });
  }

  try {
    // Check if user exists
    const existing = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const target = existing.rows[0];

    if (target.is_admin && !req.user.isAdmin) {
      return res.status(403).json({ error: ADMIN_ONLY_MSG });
    }

    // Changing your own role would lock you out of the screens you're using.
    if (id === req.user.id && role && role !== target.role) {
      return res.status(400).json({ error: 'You cannot change your own role' });
    }

    // Granting/removing super admin is a super-admin-only decision; a
    // plain secretaria's is_admin is ignored. A super admin can't demote
    // themselves, which also guarantees at least one super admin remains.
    let newIsAdmin = target.is_admin;
    if (req.user.isAdmin && typeof is_admin === 'boolean') {
      if (!is_admin && id === req.user.id) {
        return res.status(400).json({ error: 'You cannot remove your own super-admin access' });
      }
      newIsAdmin = is_admin;
    }
    const newRole = newIsAdmin ? 'secretaria' : (role ?? target.role);

    // Check if email is already taken by another user
    if (email && email !== target.email) {
      const emailCheck = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
      if (emailCheck.rows.length > 0) {
        return res.status(409).json({ error: 'Email already exists' });
      }
    }

    let passwordHash = target.password_hash;
    if (password) {
      if (!isValidPassword(password)) {
        return res.status(400).json({ error: 'password_too_weak' });
      }
      passwordHash = await bcrypt.hash(password, 10);
    }

    const result = await pool.query(
      `UPDATE users
       SET name = COALESCE($2, name),
           email = COALESCE($3, email),
           password_hash = $4,
           role = $5,
           is_admin = $6
       WHERE id = $1
       RETURNING id, name, email, role, is_admin, active, last_login, created_at`,
      [id, name, email, passwordHash, newRole, newIsAdmin]
    );

    // Log to audit
    await pool.query(
      `INSERT INTO audit_log (user_id, action, entity, entity_id)
       VALUES ($1, $2, $3, $4)`,
      [req.user.id, 'update_user', 'users', id]
    );

    // Notify on password change (non-blocking)
    if (password) {
      const { subject, html } = passwordChangedEmail(result.rows[0]);
      sendEmail(result.rows[0].email, subject, html);
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/users/:id/deactivate - Deactivate user (any secretaria; super-admin accounts: super admin only)
router.patch('/:id/deactivate', requireRole('secretaria'), async (req, res) => {
  const { id } = req.params;

  // Cannot deactivate self
  if (id === req.user.id) {
    return res.status(403).json({ error: 'Cannot deactivate yourself' });
  }
  if (!UUID_RE.test(id)) {
    return res.status(400).json({ error: 'Invalid user id' });
  }

  try {
    const target = await pool.query('SELECT is_admin FROM users WHERE id = $1', [id]);
    if (target.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (target.rows[0].is_admin && !req.user.isAdmin) {
      return res.status(403).json({ error: ADMIN_ONLY_MSG });
    }

    const result = await pool.query(
      `UPDATE users SET active = false WHERE id = $1 RETURNING id, name, email, active`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Log to audit
    await pool.query(
      `INSERT INTO audit_log (user_id, action, entity, entity_id)
       VALUES ($1, $2, $3, $4)`,
      [req.user.id, 'deactivate_user', 'users', id]
    );

    // Notify the deactivated user (non-blocking)
    const { subject, html } = accountDeactivatedEmail(result.rows[0]);
    sendEmail(result.rows[0].email, subject, html);

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error deactivating user:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/users/:id/activate - Activate user (any secretaria; super-admin accounts: super admin only)
router.patch('/:id/activate', requireRole('secretaria'), async (req, res) => {
  const { id } = req.params;

  if (!UUID_RE.test(id)) {
    return res.status(400).json({ error: 'Invalid user id' });
  }

  try {
    const target = await pool.query('SELECT is_admin FROM users WHERE id = $1', [id]);
    if (target.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (target.rows[0].is_admin && !req.user.isAdmin) {
      return res.status(403).json({ error: ADMIN_ONLY_MSG });
    }

    const result = await pool.query(
      `UPDATE users SET active = true WHERE id = $1 RETURNING id, name, email, active`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Log to audit
    await pool.query(
      `INSERT INTO audit_log (user_id, action, entity, entity_id)
       VALUES ($1, $2, $3, $4)`,
      [req.user.id, 'activate_user', 'users', id]
    );

    // Notify the activated user (non-blocking)
    const { accountActivatedEmail } = require('../utils/mailer');
    const { subject, html } = accountActivatedEmail(result.rows[0]);
    sendEmail(result.rows[0].email, subject, html);

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error activating user:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
