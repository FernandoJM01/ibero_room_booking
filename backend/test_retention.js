require('dotenv').config();
const pool = require('./db/pool');
const { runRetentionCleanup } = require('./utils/retentionJob');

async function testRetention() {
  const client = await pool.connect();
  try {
    console.log("Setting up test data...");
    await client.query('BEGIN');
    
    // Create an old calendar event (2 years ago)
    const oldDate = new Date();
    oldDate.setFullYear(oldDate.getFullYear() - 2);
    const oldStr = oldDate.toISOString();
    
    // Create a new calendar event (1 year ago)
    const newDate = new Date();
    newDate.setFullYear(newDate.getFullYear() - 1);
    const newStr = newDate.toISOString();

    await client.query("INSERT INTO calendar_events (date, name, type) VALUES ($1, 'Old Event', 'evento')", [oldStr]);
    await client.query("INSERT INTO calendar_events (date, name, type) VALUES ($1, 'New Event', 'evento')", [newStr]);
    await client.query('COMMIT');
    
    console.log("Running retention cleanup...");
    // Force env var to 18 months for test
    process.env.DATA_RETENTION_MONTHS = "18";
    await runRetentionCleanup();

    // Verify
    const res = await client.query("SELECT * FROM calendar_events WHERE name IN ('Old Event', 'New Event')");
    const names = res.rows.map(r => r.name);
    
    if (names.includes('New Event') && !names.includes('Old Event')) {
      console.log("Test Passed: Old event deleted, new event retained.");
    } else {
      console.log("Test Failed: Unexpected remaining events:", names);
    }
  } catch (err) {
    console.error("Test Error:", err);
  } finally {
    // Cleanup
    await client.query("DELETE FROM calendar_events WHERE name IN ('Old Event', 'New Event')");
    client.release();
    pool.end();
  }
}

testRetention();
