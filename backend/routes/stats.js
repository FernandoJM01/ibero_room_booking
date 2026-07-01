const express = require('express');
const pool = require('../db/pool');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

const router = express.Router();

// GET /api/stats/dashboard - Dashboard statistics (secretaria only)
router.get('/dashboard', auth, requireRole('secretaria'), async (req, res) => {
  try {
    const now = new Date();
    const currentMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');

    // Get reservations this month
    const monthResult = await pool.query(
      `SELECT
        COUNT(*) FILTER (WHERE status = 'active') as active_this_month,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_this_month,
        COUNT(*) FILTER (WHERE status = 'active' AND start_time > NOW()) as upcoming
       FROM reservations
       WHERE TO_CHAR(start_time, 'YYYY-MM') = $1`,
      [currentMonth]
    );

    // Get top areas
    const areasResult = await pool.query(
      `SELECT area, COUNT(*) as count
       FROM reservations
       WHERE status = 'active'
       GROUP BY area
       ORDER BY count DESC
       LIMIT 5`
    );

    // Get total active reservations
    const totalResult = await pool.query(
      `SELECT COUNT(*) as total_active FROM reservations WHERE status = 'active'`
    );

    // Calculate occupancy percentage
    const allSlotsResult = await pool.query(
      `SELECT COUNT(*) as working_days
       FROM generate_series(NOW()::date, (NOW() + interval '30 days')::date, '1 day'::interval) as date
       WHERE EXTRACT(dow FROM date::timestamp) NOT IN (0, 6)`
    );

    const workingDays = parseInt(allSlotsResult.rows[0].working_days) || 1;
    const occupancyPct = Math.round((monthResult.rows[0].upcoming / (workingDays * 10)) * 100) || 0;

    res.json({
      activeThisMonth: parseInt(monthResult.rows[0].active_this_month) || 0,
      cancelledThisMonth: parseInt(monthResult.rows[0].cancelled_this_month) || 0,
      totalActive: parseInt(totalResult.rows[0].total_active) || 0,
      upcoming: parseInt(monthResult.rows[0].upcoming) || 0,
      topAreas: areasResult.rows.map(r => ({
        area: r.area,
        count: parseInt(r.count)
      })),
      occupancyPct
    });
  } catch (err) {
    console.error('Error fetching stats:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
