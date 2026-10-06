#!/usr/bin/env node
// Prints one SQL statement that sets the administrator's password to one you choose, so that after a
// full reset (Option A) the account never has to be used with the PUBLIC default password from seed.sql.
//
//   (needs Node and `bcryptjs`: run inside the backend container, or `cd backend && npm ci` first)
//   node scripts/import-sessions/admin_password_sql.js [email] > scripts/import-sessions/private/admin_password.sql
//
// The password is typed without echo and is never printed. The output holds only the bcrypt hash (still
// keep it out of git: everything under private/ is ignored). Same strength rule as the application.
const path = require('path');
let bcrypt;
try { bcrypt = require(path.join(__dirname, '..', '..', 'backend', 'node_modules', 'bcryptjs')); }
catch { bcrypt = require('bcryptjs'); }   // e.g. after `npm install bcryptjs` in a scratch folder

const email = (process.argv[2] || 'julieta.esquinca@ibero.mx').replace(/'/g, "''");
const RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

function ask(prompt) {
  return new Promise((resolve) => {
    process.stderr.write(prompt);
    const stdin = process.stdin;
    let buf = '';
    if (stdin.isTTY) stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    stdin.on('data', function onData(ch) {
      for (const c of ch) {
        if (c === '\n' || c === '\r' || c === '\u0004') {
          if (stdin.isTTY) stdin.setRawMode(false);
          stdin.pause(); stdin.removeListener('data', onData);
          process.stderr.write('\n');
          return resolve(buf);
        }
        if (c === '\u0003') process.exit(130);
        if (c === '\u007f') buf = buf.slice(0, -1); else buf += c;
      }
    });
  });
}

(async () => {
  let piped = null;   // non-interactive use (tests): two lines on stdin
  if (!process.stdin.isTTY) piped = require('fs').readFileSync(0, 'utf8').split(/\r?\n/);
  const ask2 = (prompt) => (piped ? Promise.resolve(piped.shift() || '') : ask(prompt));
  const p1 = await ask2('New administrator password: ');
  if (!RULE.test(p1)) { console.error('Rejected: at least 8 characters with upper case, lower case, a digit and a symbol.'); process.exit(1); }
  const p2 = await ask2('Repeat it: ');
  if (p1 !== p2) { console.error('The two entries differ.'); process.exit(1); }
  const hash = bcrypt.hashSync(p1, 12);
  console.log(`-- Generated ${new Date().toISOString()}; keep out of git.`);
  console.log(`UPDATE users SET password_hash = '${hash}' WHERE email = '${email}' AND is_admin = TRUE;`);
  console.log(`SELECT count(*) AS administradores_actualizados FROM users WHERE email = '${email}' AND password_hash = '${hash}';`);
})();
