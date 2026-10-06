# firewall: keep the Dokploy panel (port 3000) off the network

**Problem.** The Dokploy admin panel is published by Docker on `0.0.0.0:3000` and the server's firewall (UFW) allows it from
anywhere. It speaks plain HTTP and controls Docker (root-equivalent), so any device on the campus network can try to log in.

**Why `ufw deny 3000` is not enough.** Docker publishes a port with a NAT rule that runs *before* UFW's INPUT rules, and the
traffic is then *forwarded* to the container. UFW never sees it. Docker evaluates a chain called **`DOCKER-USER`** first for all
forwarded traffic: that is the one place meant for your own rules.

## Where firewall rules live on this server

| Layer | Where to change it | Covers |
| ----- | ------------------ | ------ |
| **UFW** (host firewall) | `sudo ufw status numbered`, `sudo ufw delete <n>`, `sudo ufw allow from <ip> to any port 22`; stored in `/etc/ufw/user.rules` and `user6.rules` (do not edit by hand) | Traffic to the server itself: SSH (22), and host services. **Not** Docker-published ports (IPv4) |
| **`DOCKER-USER`** (iptables chain) | `sudo iptables -S DOCKER-USER` to read; rules added at runtime are lost at reboot, so ours are re-applied by a systemd unit (below) | Traffic to Docker-published ports (3000 Dokploy, 80/443 Traefik) |
| **Docker's own chains** (`DOCKER`, `DOCKER-FORWARD`...) | Never edit; Docker rewrites them at start | Container networking |
| **Campus firewall** (university IT) | A ticket to IT | Who on the campus/internet can reach the server at all; outbound blocks such as TCP 7844 |
| **Dev Tunnel / Cloudflare** | Their dashboards | Public access to the site only |

Read the live state: `sudo ufw status verbose`, `sudo iptables -S DOCKER-USER`, `sudo iptables -t nat -S DOCKER | head`,
`ss -tlnp`. The server's iptables is the nft backend, so these commands show what is really enforced.

## What this folder installs

- `ibero-docker-firewall.sh` adds one rule per blocked port at the top of `DOCKER-USER`: **drop packets that enter from the
  network interface whose original destination port is 3000**. It is idempotent (checks with `iptables -C` first).
- `ibero-docker-firewall.service` runs it at boot after Docker and again whenever Docker restarts (`PartOf=docker.service`).
- Config (optional): `/etc/default/ibero-firewall` with `BLOCK_PORTS="3000"` (add ports separated by spaces) and `NET_IFACE`.

**Not affected:** connections from the server itself. `ssh -L 3000:127.0.0.1:3000 ...` connects to `127.0.0.1` on the server,
which does not go through `DOCKER-USER`, so you keep using the panel exactly as today. SSH (22), Traefik (80/443) and the tunnel are
untouched. A mistake in this rule cannot cut your SSH session (it only matches port 3000).

> Do **not** add 80 or 443 to `BLOCK_PORTS` without a plan: Traefik receives the tunnel's traffic on port 80 (the tunnel connects
> to the server's own address, which is local traffic, but verify before relying on that).

## Install (needs `sudo`), with a test

```bash
# 0. From a DIFFERENT campus device (laptop on the campus network), before: the panel answers
curl -m 5 -sI http://<server-ip>:3000 | head -1          # expect an HTTP status line
# 1. On the server
sudo install -m 0755 ibero-docker-firewall.sh /usr/local/sbin/ibero-docker-firewall.sh
sudo install -m 0644 ibero-docker-firewall.service /etc/systemd/system/ibero-docker-firewall.service
sudo systemctl daemon-reload && sudo systemctl enable --now ibero-docker-firewall.service
sudo iptables -S DOCKER-USER                                # shows the "ibero: block published port 3000" rule
sudo ufw delete allow 3000/tcp; sudo ufw delete allow 3000/tcp   # IPv4 rule, then IPv6 rule (second command may say "Could not delete")
# 2. Same device as step 0: now it must time out
curl -m 5 -sI http://<server-ip>:3000 || echo "blocked, good"
# 3. On your computer: the panel still works through the SSH tunnel
ssh -J <user>@antares.dci.uia.mx -L 3000:127.0.0.1:3000 <user>@<server-ip>      # then open http://localhost:3000
# 4. The public site is unaffected
curl -s https://deii-salas.uk/api/health
```

Keep an SSH session open while you do this. **Reboot test** (with the pending updates): after the reboot the rule must be back
(`sudo iptables -S DOCKER-USER`) without anyone running anything.

## Remove

```bash
sudo systemctl disable --now ibero-docker-firewall.service
sudo iptables -D DOCKER-USER -i <iface> -p tcp -m conntrack --ctorigdstport 3000 --ctdir ORIGINAL -m comment --comment "ibero: block published port 3000 from the network" -j DROP
sudo ufw allow 3000/tcp          # only if you want the old behaviour back
```

Status: **prepared and the rule syntax tested in a Linux container (idempotent); not yet installed on the server.**
