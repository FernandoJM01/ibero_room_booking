require('dotenv').config();
const pool = require('./db/pool');

async function test() {
  try {
    const query = `
      SELECT r.*, u.name AS creator_name,
             ec.email AS external_email, ec.organization AS external_organization
      FROM reservations r
      LEFT JOIN users u ON u.id = r.created_by
      LEFT JOIN external_contacts ec ON ec.id = r.external_responsible_id
      WHERE 1=1`;
    const result = await pool.query(query);
    console.log("Success! Rows:", result.rows.length);
  } catch (err) {
    console.error("DB Error:", err.message);
  } finally {
    pool.end();
  }
}

test();
