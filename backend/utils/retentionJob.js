const pool = require('../db/pool');

async function runRetentionCleanup() {
  const months = parseInt(process.env.DATA_RETENTION_MONTHS || '18', 10);
  console.log(`[Retention Job] Starting data cleanup (Retention: ${months} months)`);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Calculate cutoff date in JS to pass as parameterized query
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - months);
    const cutoffStr = cutoffDate.toISOString();
    console.log(`[Retention Job] Cutoff date: ${cutoffStr}`);

    // 1. Audit logs
    let res = await client.query('DELETE FROM audit_log WHERE timestamp < $1', [cutoffStr]);
    console.log(`[Retention Job] Deleted ${res.rowCount} old audit_log records.`);

    // 2. Notification logs
    res = await client.query('DELETE FROM notification_logs WHERE sent_at < $1', [cutoffStr]);
    console.log(`[Retention Job] Deleted ${res.rowCount} old notification_logs records.`);

    // 3. Modification requests
    res = await client.query('DELETE FROM modification_requests WHERE created_at < $1', [cutoffStr]);
    console.log(`[Retention Job] Deleted ${res.rowCount} old modification_requests.`);

    // 4. Reservations (this will CASCADE to modification_requests if any were left, though we just deleted them)
    res = await client.query('DELETE FROM reservations WHERE end_time < $1', [cutoffStr]);
    console.log(`[Retention Job] Deleted ${res.rowCount} old reservations.`);

    // 5. Recurring groups
    // Delete groups where the end_date is older than the cutoff.
    // Since we already deleted reservations older than cutoff, the associated reservations are gone.
    res = await client.query('DELETE FROM recurring_groups WHERE end_date < $1', [cutoffStr]);
    console.log(`[Retention Job] Deleted ${res.rowCount} old recurring_groups.`);

    // 6. Calendar events (holidays, closures)
    res = await client.query('DELETE FROM calendar_events WHERE date < $1', [cutoffStr]);
    console.log(`[Retention Job] Deleted ${res.rowCount} old calendar_events.`);

    await client.query('COMMIT');
    console.log('[Retention Job] Cleanup completed successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Retention Job] Error during cleanup. Rolled back.', error.message);
  } finally {
    client.release();
  }
}

function startRetentionScheduler() {
  // Run once immediately on startup, then every 24 hours
  setTimeout(() => {
    runRetentionCleanup();
    // 24 hours = 24 * 60 * 60 * 1000 = 86400000 ms
    setInterval(runRetentionCleanup, 86400000);
  }, 5000); // Wait 5 seconds after boot
}

module.exports = {
  runRetentionCleanup,
  startRetentionScheduler
};
