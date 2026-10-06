#!/usr/bin/env bash
# devtunnel-notify.sh "<subject>" "<body>" - e-mails the watchdog's recipients using the SMTP account the
# application already has. The credentials stay inside the API container (read from its own environment);
# nothing secret is stored or passed on the host. Always exits 0 so a mail failure never breaks the watchdog.
#
# Config (environment, optional): ALERT_TO (comma separated), API_NAME_FILTER (default reservationsapi).
set -u
SUBJECT="${1:-[IberoReservas] alert}"
BODY="${2:-}"
TO="${ALERT_TO:-antonio.cardena@ibero.mx,a231592a@correo.uia.mx}"
FILTER="${API_NAME_FILTER:-reservationsapi}"

log() { logger -t devtunnel-watchdog -- "$*" 2>/dev/null; echo "$*"; }

cid="$(docker ps -qf "name=$FILTER" 2>/dev/null | head -1)"
if [ -z "$cid" ]; then
  log "notify: API container not running, cannot send e-mail ($SUBJECT). The external monitor is the backup channel."
  exit 0
fi

# Plain nodemailer call inside the container: no database write, no notification_logs row.
js="const nm=require('nodemailer'),e=process.env;
if(!(e.SMTP_HOST&&e.SMTP_USER&&e.SMTP_PASSWORD)){console.error('SMTP not configured');process.exit(2)}
nm.createTransport({host:e.SMTP_HOST,port:parseInt(e.SMTP_PORT||'587',10),secure:e.SMTP_PORT==='465',
 auth:{user:e.SMTP_USER,pass:e.SMTP_PASSWORD},connectionTimeout:15000,greetingTimeout:15000,socketTimeout:20000})
 .sendMail({from:e.SMTP_FROM||e.SMTP_USER,to:e.ALERT_TO,subject:e.ALERT_SUBJECT,text:e.ALERT_BODY})
 .then(()=>{console.log('sent');process.exit(0)},x=>{console.error('failed: '+x.message);process.exit(1)})"

if out="$(timeout 60 docker exec -e ALERT_TO="$TO" -e ALERT_SUBJECT="$SUBJECT" -e ALERT_BODY="$BODY" "$cid" node -e "$js" 2>&1)"; then
  log "notify: e-mail sent to $TO: $SUBJECT"
else
  log "notify: e-mail NOT sent ($SUBJECT): $(echo "$out" | tail -1)"
fi
exit 0
