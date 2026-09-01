const express = require('express');
const pool = require('../db/pool');
const auth = require('../middleware/auth');

const router = express.Router();

function requireSuperAdmin(req, res, next) {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ error: 'Acceso denegado. Se requiere nivel de Super Administrador.' });
  }
  next();
}

const requireRole = require('../middleware/requireRole');

// GET /api/notifications/log
// Fetch the 50 most recent notification logs (Available to super admins and secretarias)
router.get('/log', auth, requireRole('secretaria'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM notification_logs 
       ORDER BY sent_at DESC 
       LIMIT 50`
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching notification logs:', err);
    res.status(500).json({ error: 'Error del servidor al obtener el registro de notificaciones.' });
  }
});

module.exports = router;
