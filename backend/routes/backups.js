const express = require('express');
const { spawn } = require('child_process');
const auth = require('../middleware/auth');
const { requireSuperAdmin } = require('../middleware/requireRole');

const router = express.Router();

// GET /api/backups/export
// Only super admin can export the database
router.get('/export', auth, requireSuperAdmin, (req, res) => {
  const dbUser = process.env.DB_USER;
  const dbPassword = process.env.DB_PASSWORD;
  const dbName = process.env.DB_NAME;
  const dbHost = process.env.DB_HOST || 'db';
  const dbPort = process.env.DB_PORT || '5432';

  if (!dbUser || !dbPassword || !dbName) {
    return res.status(500).json({ error: 'Faltan variables de entorno de base de datos.' });
  }

  const timestamp = new Date().toISOString().slice(0, 16).replace('T', '_').replace(':', '-');
  const filename = `respaldo_ibero_${timestamp}.sql`;

  res.setHeader('Content-Type', 'application/sql');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  // Ejecutar pg_dump
  // -O: No output object ownership commands
  // -c: Clean (drop) database objects before recreating
  // -x: Do not dump privileges
  const pgDump = spawn('pg_dump', [
    '-h', dbHost,
    '-p', dbPort,
    '-U', dbUser,
    '-O', '-c', '-x',
    dbName
  ], {
    env: { ...process.env, PGPASSWORD: dbPassword }
  });

  pgDump.stdout.pipe(res);

  pgDump.stderr.on('data', (data) => {
    console.error(`[pg_dump error]: ${data}`);
  });

  pgDump.on('close', (code) => {
    if (code !== 0) {
      console.error(`pg_dump process exited with code ${code}`);
      if (!res.headersSent) {
        res.status(500).end();
      }
    }
  });
});

module.exports = router;
