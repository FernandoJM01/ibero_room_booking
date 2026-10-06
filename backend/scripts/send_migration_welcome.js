#!/usr/bin/env node
/* One-off: e-mail the people whose accounts were created by the data migration (docs/DATA_MIGRATION.md), who
 * never got a welcome e-mail. ONE e-mail per person: account + a "create your password" link + their reservations.
 *
 * The link is a normal password-reset token with a longer validity (default 7 days), so no password is ever e-mailed
 * and the existing /reset-password.html page is used. If the link expires the person uses "¿Olvidaste tu contraseña?".
 *
 * Run INSIDE the API container (it has the SMTP settings and the database access):
 *   node scripts/send_migration_welcome.js                       dry run: who would get what (default; writes nothing)
 *   node scripts/send_migration_welcome.js --preview-dir /tmp/p  also writes each e-mail as an .html file to review
 *   node scripts/send_migration_welcome.js --send                sends (asks nothing: review the dry run first)
 * Options: --emails a@x,b@y   only these accounts (default: active non-admin users who never logged in and have upcoming
 *                              active reservations)
 *          --ttl-hours 168    validity of the link
 *          --force            also people already invited (audit_log action 'migration_invite_sent')
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const pool = require('../db/pool');
const { sendEmail, accountInvitationEmail } = require('../utils/mailer');

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const val = (f, d) => { const i = args.indexOf(f); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
const SEND = has('--send');
const FORCE = has('--force');
const TTL = parseInt(val('--ttl-hours', '168'), 10);
const ONLY = val('--emails', '') ? val('--emails', '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean) : null;
const PREVIEW = val('--preview-dir', null);
const APP_URL = (process.env.APP_URL || '').replace(/\/$/, '');

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const hashToken = (t) => crypto.createHash('sha256').update(t).digest('hex');

async function main() {
  if (!Number.isFinite(TTL) || TTL < 1 || TTL > 24 * 30) throw new Error('--ttl-hours must be between 1 and 720');
  if (SEND && !APP_URL) throw new Error('APP_URL is not set in this container: the links would be wrong. Aborting.');
  const base = APP_URL || 'http://localhost:8080';

  const users = (await pool.query(
    `SELECT u.id, u.name, u.email,
            EXISTS (SELECT 1 FROM audit_log a WHERE a.action = 'migration_invite_sent' AND a.entity_id = u.id) AS invited
       FROM users u
      WHERE u.active AND NOT u.is_admin
        AND ($1::text[] IS NULL OR lower(u.email) = ANY($1::text[]))
        AND ($1::text[] IS NOT NULL OR u.last_login IS NULL)
        AND EXISTS (SELECT 1 FROM reservations r WHERE r.responsible_id = u.id AND r.status = 'active' AND r.end_time > NOW())
      ORDER BY u.name`, [ONLY])).rows;

  console.log(`${SEND ? 'SENDING' : 'DRY RUN (nothing is written or sent)'} · link validity ${TTL} h · ${users.length} account(s)\n`);
  if (PREVIEW) fs.mkdirSync(PREVIEW, { recursive: true });

  let sent = 0, failed = 0, skipped = 0;
  for (const u of users) {
    const rows = (await pool.query(
      `SELECT r.id, r.area, r.start_time, r.end_time, r.recurring_group, rm.name AS room_name
         FROM reservations r LEFT JOIN rooms rm ON rm.id = r.room_id
        WHERE r.responsible_id = $1 AND r.status = 'active' AND r.end_time > NOW()
        ORDER BY r.start_time`, [u.id])).rows;
    const groups = new Map(); const singles = [];
    for (const r of rows) {
      if (!r.recurring_group) { singles.push(r); continue; }
      if (!groups.has(r.recurring_group)) groups.set(r.recurring_group, { area: r.area, room_name: r.room_name, dates: [] });
      groups.get(r.recurring_group).dates.push(r);
    }
    const series = [...groups.values()];
    const line = `${u.name} <${u.email}> · ${rows.length} reservation(s): ${series.length} series, ${singles.length} single`;

    if (u.invited && !FORCE) { console.log(`SKIP (already invited; use --force)  ${line}`); skipped++; continue; }

    // The link needs a real token; in a dry run a placeholder keeps the preview readable and writes nothing.
    const token = SEND ? crypto.randomBytes(32).toString('hex') : 'TOKEN-OF-THE-PREVIEW';
    const { subject, html } = accountInvitationEmail({
      user: u, loginUrl: base, inviteLink: `${base}/reset-password.html?token=${token}`, ttlHours: TTL, series, singles,
    });
    if (PREVIEW) fs.writeFileSync(path.join(PREVIEW, `${u.email.replace(/[^a-z0-9.@-]/gi, '_')}.html`), html);

    if (!SEND) { console.log(`WOULD SEND  ${line}`); continue; }

    await pool.query(
      `UPDATE users SET reset_token_hash = $2, reset_token_expires = NOW() + ($3 || ' hours')::interval WHERE id = $1`,
      [u.id, hashToken(token), String(TTL)]);
    const ok = await sendEmail(u.email, subject, html);
    if (ok) {
      await pool.query(`INSERT INTO audit_log (user_id, action, entity, entity_id, details) VALUES (NULL, 'migration_invite_sent', 'users', $1, $2)`,
        [u.id, JSON.stringify({ reservations: rows.length, ttl_hours: TTL })]);
      console.log(`SENT        ${line}`); sent++;
    } else {
      await pool.query('UPDATE users SET reset_token_hash = NULL, reset_token_expires = NULL WHERE id = $1', [u.id]);
      console.log(`FAILED      ${line}  (see Notificaciones; the link was revoked)`); failed++;
    }
    await sleep(1500);   // be gentle with the SMTP provider
  }
  console.log(`\n${SEND ? `sent ${sent}, failed ${failed}, ` : ''}skipped ${skipped}${PREVIEW ? `; previews in ${PREVIEW}` : ''}`);
  if (!SEND && users.length) console.log('Review, then run again with --send.');
}

main().catch(e => { console.error('Error:', e.message); process.exitCode = 1; }).finally(() => pool.end());
