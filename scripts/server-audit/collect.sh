#!/usr/bin/env bash
# collect.sh - Auditoría de SOLO LECTURA del servidor de IberoReservations (reservadeii).
#
# Qué hace: recopila cómo está configurado el servidor (sistema, red, Docker/Swarm, Dokploy, Traefik,
# Dev Tunnel, base de datos, actualizaciones, usuarios) y lo escribe como informe en Markdown para
# documentarlo. No modifica nada: no reinicia servicios, no escribe archivos del sistema, no hace
# cambios en Docker ni en la base de datos (solo SELECT de conteos).
#
# Qué NO imprime: valores de variables de entorno (solo sus NOMBRES), contraseñas, tokens, llaves,
# hashes ni cuerpos de correo. Además, toda salida pasa por un filtro que enmascara patrones
# secretos y direcciones de correo, y al final se hace una revisión automática del informe.
#
# Uso (en el servidor, con un usuario que pueda usar sudo):
#     sudo bash collect.sh | tee ~/server-audit-$(date +%F).md
#
# Léelo antes de ejecutarlo: es un archivo de texto corto. Puedes probarlo sin riesgo.
set -u
umask 077

if [ "$(id -u)" -ne 0 ]; then
  echo "Ejecuta con sudo:  sudo bash $0" >&2
  exit 1
fi

# ───────────── filtro de secretos ─────────────
redact() {
  # 1) patrones conocidos con sed; 2) cadenas largas "aleatorias" (mayúscula+minúscula+dígito) con perl.
  #    Los nombres de servicios (minúsculas y guiones) NO se enmascaran: la documentación los necesita.
  sed -E \
    -e 's/eyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]*/<JWT-REDACTED>/g' \
    -e 's/(Bearer|Basic)[[:space:]]+[A-Za-z0-9._~+\/=-]{8,}/\1 <REDACTED>/Ig' \
    -e 's/(pass(word|wd|phrase)?|secret|token|api[_-]?key|authorization|credential|private[_-]?key)(([_.-][A-Za-z0-9_.-]*)?[[:space:]]*[:=][[:space:]]*)[^[:space:]'"'"'"]+/\1\3<REDACTED>/Ig' \
    -e 's/\$(2[aby]|apr1|1|5|6)\$[^[:space:]'"'"'"]+/<HASH-REDACTED>/g' \
    -e 's/[A-Za-z0-9._%+-]+@([A-Za-z0-9.-]+\.[A-Za-z]{2,})/***@\1/g' \
    -e 's/\b[A-Fa-f0-9]{32,}\b/<HEX-REDACTED>/g' |
  if command -v perl >/dev/null 2>&1; then
    perl -pe 's/\b(?=[A-Za-z0-9_-]{40,}\b)(?=\S*[A-Z])(?=\S*[a-z])(?=\S*\d)[A-Za-z0-9_-]{40,}\b/<LONG-STRING-REDACTED>/g'
  else
    cat
  fi
}

MAXLINES="${MAXLINES:-220}"
sec() { printf '\n\n## %s\n' "$1"; }
sub() { printf '\n### %s\n\n```text\n' "$1"; }
end() { printf '```\n'; }

# run "titulo" comando args...   (con límite de tiempo, filtro y límite de líneas)
run() {
  local title="$1"; shift
  sub "$title"
  { timeout 25 "$@" 2>&1 || true; } | redact | head -n "$MAXLINES"
  end
}
# shx "titulo" 'cadena de shell'
shx() {
  local title="$1"; shift
  sub "$title"
  { timeout 25 bash -c "$1" 2>&1 || true; } | redact | head -n "$MAXLINES"
  end
}
have() { command -v "$1" >/dev/null 2>&1; }

report() {
NOW="$(date -Is)"
echo "# Informe de auditoría del servidor"
echo
echo "- Generado: $NOW"
echo "- Equipo: $(hostname)"
echo "- Herramienta: scripts/server-audit/collect.sh (solo lectura; secretos enmascarados)"

# ───────────── 1. sistema ─────────────
sec "1. Sistema operativo y recursos"
shx "Sistema" 'cat /etc/os-release | grep -E "^(PRETTY_NAME|VERSION)="; uname -srm; uptime -p; echo "Último arranque: $(uptime -s)"; timedatectl 2>/dev/null | grep -E "Time zone|System clock synchronized|NTP service"'
shx "CPU y memoria" 'echo "CPU núcleos: $(nproc)"; free -h'
shx "Disco" 'df -hT -x tmpfs -x devtmpfs -x overlay -x squashfs 2>/dev/null'
shx "¿Hace falta reiniciar?" '[ -f /var/run/reboot-required ] && cat /var/run/reboot-required || echo "No (no existe /var/run/reboot-required)"'

# ───────────── 2. actualizaciones ─────────────
sec "2. Actualizaciones y parches"
shx "Paquetes pendientes" 'apt-get -s upgrade 2>/dev/null | grep -cE "^Inst " | sed "s/^/Paquetes actualizables: /"; apt-get -s upgrade 2>/dev/null | grep -E "^Inst .*-security" | wc -l | sed "s/^/…de ellos de seguridad: /"'
shx "Actualizaciones automáticas" 'systemctl is-enabled unattended-upgrades 2>&1; systemctl is-active unattended-upgrades 2>&1; grep -hE "^(APT::Periodic::(Update-Package-Lists|Unattended-Upgrade))" /etc/apt/apt.conf.d/20auto-upgrades 2>/dev/null'
have pro && run "Ubuntu Pro / ESM" pro status --format tabular

# ───────────── 3. red y acceso ─────────────
sec "3. Red, cortafuegos y acceso remoto"
run "Direcciones" ip -br addr
run "Ruta por defecto" ip route show default
shx "Puertos en escucha (TCP)" 'ss -tlnp 2>/dev/null | awk "NR==1 || /LISTEN/"'
shx "Cortafuegos" 'if have_ufw=$(command -v ufw); then ufw status verbose; else echo "ufw no instalado"; fi; echo "--- iptables (resumen)"; iptables -S 2>/dev/null | head -n 30; echo "--- nftables (reglas: $(nft list ruleset 2>/dev/null | wc -l) líneas)"'
shx "Configuración efectiva de SSH (solo opciones relevantes)" 'sshd -T 2>/dev/null | grep -E "^(port|permitrootlogin|passwordauthentication|pubkeyauthentication|kbdinteractiveauthentication|maxauthtries|allowusers|allowgroups|x11forwarding|clientaliveinterval|logingracetime) "'
shx "Usuarios con shell de inicio de sesión" 'getent passwd | awk -F: '"'"'$3>=1000 && $7 !~ /(nologin|false)$/ {print $1" (uid "$3", shell "$7")"}'"'"
shx "Miembros de sudo y docker" 'echo "sudo:   $(getent group sudo   | cut -d: -f4)"; echo "docker: $(getent group docker | cut -d: -f4)"; echo "admin:  $(getent group admin  | cut -d: -f4)"; echo "--- /etc/sudoers.d:"; ls -1 /etc/sudoers.d 2>/dev/null'
shx "Llaves SSH autorizadas (solo conteo por usuario)" 'for h in /root /home/*; do f="$h/.ssh/authorized_keys"; [ -f "$f" ] && echo "$(basename "$h"): $(grep -cE "^(ssh|ecdsa|sk-)" "$f") llave(s)"; done; true'

# ───────────── 4. Docker y Swarm ─────────────
sec "4. Docker y Swarm"
if have docker; then
  shx "Versiones y modo" 'docker version --format "Docker {{.Server.Version}} (API {{.Server.APIVersion}})"; docker info --format "Swarm: {{.Swarm.LocalNodeState}} | Gestor: {{.Swarm.ControlAvailable}} | Almacenamiento: {{.Driver}} | cgroup: {{.CgroupDriver}} | Logging: {{.LoggingDriver}} | Raíz: {{.DockerRootDir}}"'
  run "Nodos" docker node ls
  run "Servicios" docker service ls
  run "Stacks" docker stack ls
  run "Redes" docker network ls
  run "Volúmenes" docker volume ls
  shx "Contenedores (puertos publicados)" 'docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"'
  shx "Imágenes locales" 'docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedSince}}"'
  run "Uso de disco de Docker" docker system df
  shx "daemon.json (rotación de logs, etc.)" '[ -f /etc/docker/daemon.json ] && cat /etc/docker/daemon.json || echo "No existe /etc/docker/daemon.json (valores por defecto)"'

  # ───────────── 5. servicios de la aplicación y de Dokploy ─────────────
  sec "5. Servicios de la aplicación y de Dokploy (sin valores de variables)"
  for svc in $(docker service ls --format '{{.Name}}' 2>/dev/null); do
    sub "Servicio $svc"
    {
      timeout 25 docker service inspect "$svc" --format 'Imagen: {{.Spec.TaskTemplate.ContainerSpec.Image}}
Réplicas: {{if .Spec.Mode.Replicated}}{{.Spec.Mode.Replicated.Replicas}}{{else}}global{{end}}
Reinicio: {{if .Spec.TaskTemplate.RestartPolicy}}{{.Spec.TaskTemplate.RestartPolicy.Condition}} (espera {{.Spec.TaskTemplate.RestartPolicy.Delay}}){{end}}
Actualización: {{if .Spec.UpdateConfig}}paralelismo {{.Spec.UpdateConfig.Parallelism}}, orden {{.Spec.UpdateConfig.Order}}, ante fallo {{.Spec.UpdateConfig.FailureAction}}{{end}}
Redes: {{range .Spec.TaskTemplate.Networks}}{{.Target}} {{end}}
Puertos publicados: {{range .Endpoint.Ports}}{{.PublishedPort}}->{{.TargetPort}}/{{.Protocol}} {{end}}
Montajes: {{range .Spec.TaskTemplate.ContainerSpec.Mounts}}[{{.Type}} {{.Source}} -> {{.Target}}] {{end}}
Restricciones: {{range .Spec.TaskTemplate.Placement.Constraints}}{{.}} {{end}}' 2>&1
      printf 'Nombres de variables de entorno: '
      timeout 25 docker service inspect "$svc" --format '{{range .Spec.TaskTemplate.ContainerSpec.Env}}{{println .}}{{end}}' 2>/dev/null | cut -d= -f1 | sort | tr '\n' ' '
      echo
    } | redact | head -n 40
    end
  done

  # ───────────── 6. Traefik ─────────────
  sec "6. Traefik (enrutador)"
  TR="$(docker ps --format '{{.Names}}' | grep -E '^dokploy-traefik' | head -1)"
  if [ -n "$TR" ]; then
    shx "Contenedor $TR" "docker inspect $TR --format 'Imagen: {{.Config.Image}} | Estado: {{.State.Status}} | Reinicio: {{.HostConfig.RestartPolicy.Name}}'; docker inspect $TR --format '{{range .Mounts}}[{{.Type}} {{.Source}} -> {{.Destination}}] {{end}}'; docker port $TR 2>/dev/null"
  else
    echo; echo "(no se encontró el contenedor dokploy-traefik)"
  fi
else
  echo; echo "(docker no está instalado o no es accesible)"
fi

sec "7. Archivos de configuración de Dokploy y Traefik en el disco"
shx "Árbol de /etc/dokploy (permisos, propietario, tamaño)" 'find /etc/dokploy -maxdepth 4 \( -type d -o -type f \) -not -path "*/code/*" -printf "%M %u:%g %8s  %p\n" 2>/dev/null | sort -k4 | head -n 120'
shx "Aplicaciones clonadas y commit desplegado" 'for d in /etc/dokploy/applications/*/code; do [ -d "$d/.git" ] && printf "%s -> " "$(basename "$(dirname "$d")")" && git -c safe.directory="*" -C "$d" log -1 --format="%h %ad %s" --date=short; done'
shx "traefik.yml (configuración estática)" 'cat /etc/dokploy/traefik/traefik.yml'
shx "Rutas dinámicas: reglas Host y servicios" 'grep -hnE "rule:|Host\(|PathPrefix|url:|entryPoints|- web|- websecure|middlewares" /etc/dokploy/traefik/dynamic/*.yml 2>/dev/null | head -n 120'
shx "Archivos dinámicos" 'ls -la /etc/dokploy/traefik/dynamic/'

# ───────────── 8. Dev Tunnel y servicios del sistema ─────────────
sec "8. Dev Tunnel y servicios de systemd"
shx "Unidad devtunnel-reservations" 'systemctl cat devtunnel-reservations 2>&1; echo; systemctl is-enabled devtunnel-reservations 2>&1; systemctl is-active devtunnel-reservations 2>&1'
shx "Estado del servicio (sin bitácora larga)" 'systemctl show devtunnel-reservations -p ActiveState -p SubState -p ActiveEnterTimestamp -p Restart -p User -p NRestarts 2>&1'
shx "Últimas líneas de la bitácora del túnel" 'journalctl -u devtunnel-reservations -n 15 --no-pager 2>&1'
DT="$(systemctl show devtunnel-reservations -p ExecStart --value 2>/dev/null | grep -oE 'path=[^ ;]+' | head -1 | cut -d= -f2)"
DTUSER="$(systemctl show devtunnel-reservations -p User --value 2>/dev/null)"
if [ -n "$DT" ] && [ -n "$DTUSER" ]; then
  shx "Túnel registrado (como $DTUSER)" "runuser -u $DTUSER -- $DT show ibero-reservas.usw3 2>&1 | head -n 30; echo; runuser -u $DTUSER -- $DT user show 2>&1 | head -n 6"
fi
shx "Servicios en ejecución" 'systemctl list-units --type=service --state=running --no-legend --no-pager | awk "{print \$1}"'
shx "Temporizadores y cron" 'systemctl list-timers --no-pager 2>&1 | head -n 15; echo "--- cron del sistema:"; ls -1 /etc/cron.d /etc/cron.daily 2>/dev/null; echo "--- crontabs de usuarios:"; for u in $(cut -d: -f1 /etc/passwd); do c=$(crontab -l -u "$u" 2>/dev/null | grep -vE "^#|^$" | wc -l); [ "$c" -gt 0 ] && echo "$u: $c entrada(s)"; done; true'
shx "cloudflared" 'systemctl is-enabled cloudflared 2>&1; systemctl is-active cloudflared 2>&1'

# ───────────── 9. base de datos (solo conteos) ─────────────
sec "9. Base de datos de la aplicación (solo conteos, sin datos personales)"
DBC="$(have docker && docker ps -qf name=iberoreservationsdb | head -1)"
if [ -n "${DBC:-}" ]; then
  Q="SELECT 'PostgreSQL: '||version();
SELECT 'Tamaño de la base: '||pg_size_pretty(pg_database_size(current_database()));
SELECT 'Tablas: '||count(*) FROM information_schema.tables WHERE table_schema='public';
SELECT 'Existe tabla rooms (migración 009): '||EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='rooms');
SELECT 'Existe reservations.room_id: '||EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='reservations' AND column_name='room_id');
SELECT 'Usuarios: '||count(*)||' (secretaria '||count(*) FILTER (WHERE role='secretaria')||', académico '||count(*) FILTER (WHERE role='academico')||', super admin '||count(*) FILTER (WHERE is_admin)||', inactivos '||count(*) FILTER (WHERE NOT active)||')' FROM users;
SELECT 'Reservaciones: '||count(*)||' (activas '||count(*) FILTER (WHERE status='active')||', canceladas '||count(*) FILTER (WHERE status='cancelled')||') entre '||coalesce(min(start_time)::date::text,'-')||' y '||coalesce(max(start_time)::date::text,'-') FROM reservations;
SELECT 'Contactos externos: '||count(*) FROM external_contacts;
SELECT 'Fechas marcadas (festivos/cierres): '||count(*) FROM calendar_events;
SELECT 'Entradas de historial de cambios: '||count(*) FROM audit_log;
SELECT 'Registro de correos: '||count(*)||' ('||coalesce(string_agg(DISTINCT status,', '),'-')||')' FROM notification_logs;"
  shx "Resumen" "docker exec -i $DBC sh -c 'psql -U \"\$POSTGRES_USER\" -d \"\$POSTGRES_DB\" -At' <<'SQL'
$Q
SQL"
else
  echo; echo "(no se encontró el contenedor de la base de datos iberoreservationsdb)"
fi

# ───────────── 10. aplicación y exposición pública ─────────────
sec "10. Salud de la aplicación y exposición pública"
tunnel_hosts() {
  # hosts de túnel conocidos: el que reporta `devtunnel show` y todos los de las rutas de Traefik
  # (puede haber rutas de un túnel retirado: por eso se prueban todos, no solo el primero)
  {
    if [ -n "${DT:-}" ] && [ -n "${DTUSER:-}" ] && [ -x "$DT" ]; then
      runuser -u "$DTUSER" -- "$DT" show ibero-reservas.usw3 2>/dev/null | grep -oE 'https://[^/ ]+devtunnels\.ms' | sed 's#https://##'
    fi
    grep -rhoP 'Host\(\x60\K[^\x60]+devtunnels\.ms(?=\x60\))' /etc/dokploy/traefik/dynamic/ 2>/dev/null
  } | sort -u
}
sub "Salud vía Traefik (por cada host de túnel configurado)"
for TH in $(tunnel_hosts); do
  printf '%s -> ' "$TH"
  timeout 10 curl -s -m 8 -o /dev/null -w '%{http_code}\n' -H "Host: $TH" http://127.0.0.1/api/health
done
end
shx "Sitio público" 'curl -sI -m 10 https://deii-salas.uk/ | grep -iE "^(HTTP|server|cf-ray|content-type|strict-transport|x-frame|x-content)"; echo; curl -s -m 10 https://deii-salas.uk/api/health'
shx "Salida a internet (443) hacia Cloudflare" 'curl -s -m 8 https://api.cloudflare.com/cdn-cgi/trace | grep -E "^(fl|h|loc|http|tls)="'

}

TMP="$(mktemp)"
report > "$TMP" 2>&1
# ───────────── revisión automática de secretos ─────────────
SUS="$(grep -nEi '(password|passwd|secret|token|api[_-]?key)[A-Za-z0-9_.-]*[[:space:]]*[:=][[:space:]]*[^<[:space:]][^[:space:]]{5,}|-----BEGIN [A-Z ]*PRIVATE|\$2[aby]\$|\$apr1\$' "$TMP" | head -n 20)"
cat "$TMP"
printf '\n\n## Revisión automática\n\n'
if [ -n "$SUS" ]; then
  echo "**ATENCIÓN: posibles secretos en el informe. No lo compartas hasta revisarlo:**"; echo; echo '```text'; echo "$SUS"; echo '```'
else
  echo "Sin patrones de secretos detectados (contraseñas, tokens, llaves, hashes). Revisa de todos modos antes de compartirlo."
fi
echo
echo "_Fin del informe (generado por collect.sh)._"
rm -f "$TMP"
