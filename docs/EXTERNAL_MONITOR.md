# External monitor: step by step

Why: the watchdog on the server only sees the tunnel. A dead server, network, power cut, Cloudflare Worker or expired domain
is invisible to it. An **external** monitor checks the public site from outside and e-mails the people on call. It needs no
change on the server, the firewall or the architecture.

Recipients (same as the watchdog): `p18731@correo.uia.mx` and `a231592a@correo.uia.mx`.

## 1. The site check (UptimeRobot)

UptimeRobot's free plan: 50 monitors, 5-minute interval, keyword monitors, e-mail alerts. It is meant for **non-commercial** use, which
fits an internal university tool; if that is a doubt, Better Stack's free tier has the same features and the steps are the same.
Menu names change between versions of the site; look for the words in bold.

**A. Account hygiene (once)**
1. Sign in at uptimerobot.com. Turn on **two-step verification** in the account settings and keep the recovery codes in the team
   password manager. Record the account's e-mail in [ACCESS](ACCESS.md) (the e-mail, never the password).
2. If the account was created with one person's e-mail, that person is the single owner of the monitor: note it in ACCESS and, if the
   plan allows, add the second person as a team member.

**B. Alert contacts** (menu **Integrations**, or **My settings › Alert contacts**)
3. **Add** an *E-mail* contact for `p18731@correo.uia.mx` and another for `a231592a@correo.uia.mx`. Each person opens the confirmation
   e-mail UptimeRobot sends and clicks the link (the contact stays "not confirmed" until then). Check the spam folder.

**C. Monitor 1: the API answers and says "ok"** (button **+ New monitor**)
4. Monitor type: **Keyword** (the option that checks the page text).
5. Friendly name: `IberoReservas API health`.
6. URL: `https://deii-salas.uk/api/health`
7. Keyword: `"ok":true` (with the quotes), and choose **Alert when the keyword does NOT exist**.
8. Monitoring interval: **5 minutes** (the free minimum). If there is a *timeout* field leave the default (30 s).
9. Alert contacts to notify: tick **both** contacts. Create.

**D. Monitor 2: the web page loads**
10. **+ New monitor**, type **HTTP(s)**, name `IberoReservas web`, URL `https://deii-salas.uk/`, interval 5 minutes, both contacts. (It catches
    the web container or the Worker failing while the API is still fine.)

**E. Optional**
11. If your plan offers it, add **domain / SSL expiry** monitoring for `deii-salas.uk` (the domain lapsing is a silent, total outage; see
    the open question about the registrar in the [plan](PLAN_AVAILABILITY_AND_SECURITY.md)).
12. Optional status page: not needed.

**F. Test the alerts without causing an outage**
13. Edit monitor 1 and change the keyword to `"ok":false`. Within 5-10 minutes a **Down** e-mail must arrive at **both** people.
14. Change it back to `"ok":true`. An **Up** e-mail must follow. Do not leave the wrong keyword in place.

**G. Record what was configured**
15. Fill the table below (date, who did it) and commit it.

| Item | Value | Done on / by |
| ---- | ----- | ------------ |
| UptimeRobot account (e-mail only) | _fill in_ | _date, name_ |
| Two-step verification + recovery codes stored | yes / no | |
| Alert contact `p18731@correo.uia.mx` confirmed | yes / no | |
| Alert contact `a231592a@correo.uia.mx` confirmed | yes / no | |
| Monitor 1 `IberoReservas API health` (keyword) | yes / no | |
| Monitor 2 `IberoReservas web` (HTTP) | yes / no | |
| Down and Up e-mails received by both (test F) | yes / no | |
| Heartbeat (section 2) | yes / no | |

What each alert means: [WATCHDOG_AND_BACKUPS §3](WATCHDOG_AND_BACKUPS.md#3-the-e-mails-and-what-to-do) and the RUNBOOK
([site down](RUNBOOK.md#tunnel-process-running-but-site-down)). If the monitor says **Down** and no watchdog e-mail follows within
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
