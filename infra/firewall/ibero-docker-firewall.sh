#!/usr/bin/env bash
# ibero-docker-firewall.sh - keeps selected Docker-published ports (default: 3000, the Dokploy panel) off the network.
#
# Why: ports published by Docker are DNAT-ed before UFW's INPUT rules see them, so `ufw deny 3000` does not close
# them. Traffic to published ports is forwarded, and Docker evaluates the DOCKER-USER chain first: that is the one
# place meant for site rules. We drop packets that ENTER from the network interface and whose ORIGINAL destination
# port is a blocked one. Connections from the server itself (127.0.0.1, e.g. an SSH tunnel `-L 3000:127.0.0.1:3000`)
# never pass through this chain, so the panel stays reachable for administrators.
#
# Idempotent: safe to run many times. Config (environment): BLOCK_PORTS ("3000" or "3000 8080"), NET_IFACE.
set -eu
PORTS="${BLOCK_PORTS:-3000}"
IFACE="${NET_IFACE:-$(ip route show default | awk '{print $5; exit}')}"
[ -n "$IFACE" ] || { echo "cannot find the network interface"; exit 1; }
iptables -n -L DOCKER-USER >/dev/null 2>&1 || { echo "DOCKER-USER chain not found: is Docker running?"; exit 1; }

for p in $PORTS; do
  rule=(-i "$IFACE" -p tcp -m conntrack --ctorigdstport "$p" --ctdir ORIGINAL -m comment --comment "ibero: block published port $p from the network" -j DROP)
  if iptables -C DOCKER-USER "${rule[@]}" 2>/dev/null; then
    echo "port $p: rule already present"
  else
    iptables -I DOCKER-USER 1 "${rule[@]}"
    echo "port $p: blocked from $IFACE"
  fi
done
