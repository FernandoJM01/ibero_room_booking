# External monitor: step by step

Why: the watchdog on the server only sees the tunnel. A dead server, network, power cut, Cloudflare Worker or expired domain
is invisible to it. An **external** monitor checks the public site from outside and e-mails the people on call. It needs no
change on the server, the firewall or the architecture.

Recipients (same as the watchdog): `antonio.cardena@ibero.mx` and `a231592a@correo.uia.mx`.

## 1. The site check (UptimeRobot, free)

Any service with a keyword check and e-mail alerts works (Better Stack, StatusCake...). UptimeRobot's free plan: 50 monitors, 5-minute
interval, keyword monitors, e-mail alerts; it is meant for **non-commercial** use, which fits an internal university tool, but if
that is a doubt use Better Stack's free tier, which has the same features. Menu names change over time; the idea is the same.

1. Sign up at uptimerobot.com with a mailbox the **team** controls (not a personal one) and verify the e-mail. Record the account
   owner in [ACCESS](ACCESS.md) (name only; the password goes in the password manager).
2. **Alert contacts:** add an *E-mail* contact for each recipient above; each person clicks the confirmation link they receive.
3. **New monitor**, type *Keyword*:
   - URL: `https://deii-salas.uk/api/health`
   - Keyword: `"ok":true`, alert when the keyword **does not exist**
   - Interval: 5 minutes
   - Alert contacts: both people
4. **Second monitor**, type *HTTP(s)*, URL `https://deii-salas.uk/`, expect 200 (catches the web container serving nothing while the API is fine).
5. If the service offers it, enable domain-expiry / SSL-expiry reminders for `deii-salas.uk`.
6. **Test the alert without causing an outage:** edit the keyword to `"ok":false`, wait 5-10 minutes for the "down" e-mail to arrive at
   **both** people, then set it back and wait for the "up" e-mail.

What each alert means: [WATCHDOG_AND_BACKUPS §3](WATCHDOG_AND_BACKUPS.md#3-the-e-mails-and-what-to-do) and the RUNBOOK
([site down](RUNBOOK.md#tunnel-process-running-but-site-down)). If the monitor says down **and** no watchdog e-mail follows within
15 minutes, the problem is outside the tunnel (server, network, Worker, domain): go to the RUNBOOK troubleshooting table.

## 2. The server heartbeat (Healthchecks.io, free, optional but recommended)

Reverse direction: the server announces "I am alive" after every healthy check; if the announcements stop, you get an e-mail. It
catches a server that cannot reach the internet at all.

1. Create an account, then a check named `ibero-watchdog`: period **5 minutes**, grace **10 minutes**.
2. Add both e-mails in its *Integrations* and enable them for the check (confirm the verification e-mails).
3. Copy the check's ping URL (looks like `https://hc-ping.com/<uuid>`).
4. On the server: `sudo nano /etc/default/ibero-alerts`, uncomment `HEARTBEAT_URL=` and paste the URL. Nothing to restart: it is used at
   the next watchdog run (2 minutes). The check turns green after the first ping.
5. The ping URL is a secret-ish identifier: keep it out of the repository and chat.

## 3. Maintenance

- When a recipient changes: update **both** places: `/etc/default/ibero-alerts` (server e-mails) **and** the monitor's alert contacts.
- Before a planned outage (reboot, deploy window): pause the monitor so nobody is alerted for nothing; resume afterwards.
- Every quarter, run the drill from the [WATCHDOG guide](WATCHDOG_AND_BACKUPS.md#failure-drill-about-4-minutes-of-downtime-do-it-outside-school-hours) and see both the watchdog and the monitor react.
