#!/usr/bin/env bash
# Decision-logic tests for devtunnel-watchdog.sh with mocked curl/systemctl/notify. Run (needs Docker):
#   docker run --rm -v "$PWD":/w:ro -v "$PWD/tests/run.sh":/t.sh:ro ubuntu:24.04 bash /t.sh
M=/mock; mkdir -p $M/bin /state; rm -f /state/* $M/calls $M/mails
cat > $M/bin/curl <<'C'
#!/bin/bash
for a in "$@"; do [ "$a" = "-H" ] && { [ -f /mock/app_ok ] && exit 0 || exit 22; }; done
[ -f /mock/tunnel_ok ] && exit 0 || exit 22
C
cat > $M/bin/systemctl <<'C'
#!/bin/bash
echo "systemctl $*" >> /mock/calls
C
cat > $M/bin/logger <<'C'
#!/bin/bash
exit 0
C
cat > $M/notify <<'C'
#!/bin/bash
echo "MAIL: $1" >> /mock/mails
C
chmod +x $M/bin/* $M/notify
export PATH=$M/bin:$PATH WATCHDOG_STATE_DIR=/state NOTIFY_CMD=$M/notify
W=/w/devtunnel-watchdog.sh
T=1000000
run() { WATCHDOG_NOW=$T bash $W >/dev/null; T=$((T+${1:-120})); }
count() { [ -f "$2" ] && grep -c "$1" "$2" || echo 0; }
ok=0; bad=0
chk() { if [ "$2" = "$3" ]; then ok=$((ok+1)); echo "PASS $1"; else bad=$((bad+1)); echo "FAIL $1 (got '$2', want '$3')"; fi; }

touch $M/tunnel_ok $M/app_ok
run; chk "healthy: no state, no calls" "$(ls /state | wc -l) $(count . $M/calls)" "0 0"

rm $M/tunnel_ok
run; chk "1st failure: no restart" "$(count restart $M/calls)" "0"
run; chk "2nd failure: restart #1" "$(count restart $M/calls)" "1"
chk "restart #1: no mail yet" "$(count . $M/mails)" "0"
run; run;  chk "within 10 min: throttled" "$(count restart $M/calls)" "1"
for i in 1 2 3 4 5; do run; done; chk "after 10 min: restart #2" "$(count restart $M/calls)" "2"
chk "2 restarts failed: ACTION NEEDED mail" "$(count 'ACTION NEEDED' $M/mails)" "1"
run; run; run; run;  chk "no repeat mail within an hour" "$(count 'ACTION NEEDED' $M/mails)" "1"
T=$((T+4000)); run; run; run
chk "repeat after an hour" "$(count 'ACTION NEEDED' $M/mails)" "2"

touch $M/tunnel_ok; run
chk "recovery mail" "$(count RECOVERED $M/mails)" "1"
chk "outage state cleared (only the restart throttle stamp stays)" "$(ls /state | grep -vc last-restart)" "0"
run; chk "no second recovery mail" "$(count RECOVERED $M/mails)" "1"

rm $M/tunnel_ok $M/app_ok; rm -f $M/calls $M/mails
run; run; chk "app down: no tunnel restart" "$(count restart $M/calls)" "0"
chk "app down: one ALERT mail" "$(count 'application is down' $M/mails)" "1"
run; run; chk "app down: throttled" "$(count 'application is down' $M/mails)" "1"
echo "passed=$ok failed=$bad"
