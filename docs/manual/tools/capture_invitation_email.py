"""Imagen del correo de invitación (cuentas cargadas por migración) con datos ficticios de la pila de demostración.
Requiere la pila en marcha y seed_demo.py ejecutado. No envía ningún correo: usa la simulación del script."""
import os, shutil, subprocess, sys, tempfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import OUT, BASE, RED, font
from playwright.sync_api import sync_playwright
from PIL import Image, ImageDraw

CONTAINER = os.environ.get("DEMO_BACKEND", "ibero-demo-backend-1")
DB = os.environ.get("DEMO_DB", "ibero-demo-db-1")
EMAIL = "ricardo.salas@demo.ibero.mx"
tmp = tempfile.mkdtemp()
GROUP = "99999999-9999-4999-8999-999999999999"

def sql(q):
    subprocess.run(["docker", "exec", DB, "psql", "-q", "-U", "ibero", "-d", "sala_juntas", "-c", q], check=True, capture_output=True)

# A temporary weekly series for the demo person so the e-mail shows both a series and single bookings; removed afterwards.
sql("DELETE FROM reservations WHERE recurring_group = '%s'; DELETE FROM recurring_groups WHERE id = '%s';" % (GROUP, GROUP))
sql("INSERT INTO recurring_groups (id, pattern, max_occurrences) VALUES ('%s', 'weekly', 4)" % GROUP)
sql("""INSERT INTO reservations (responsible_id, responsible_name, room_id, area, start_time, end_time, status, is_recurring, recurring_group)
       SELECT u.id, u.name, (SELECT id FROM rooms ORDER BY created_at LIMIT 1), 'Seminario de investigación',
              (d::date + time '15:00') AT TIME ZONE 'America/Mexico_City', (d::date + time '16:00') AT TIME ZONE 'America/Mexico_City',
              'active', true, '%s'
         FROM users u, generate_series('2026-10-14'::date, '2026-11-04'::date, '7 days') d WHERE u.email = '%s'""" % (GROUP, "ricardo.salas@demo.ibero.mx"))
subprocess.run(["docker", "exec", CONTAINER, "rm", "-rf", "/tmp/prev"], check=False)
subprocess.run(["docker", "exec", "-e", "APP_URL=https://deii-salas.uk", CONTAINER, "node", "scripts/send_migration_welcome.js",
                "--emails", EMAIL, "--preview-dir", "/tmp/prev"], check=True, capture_output=True)
subprocess.run(["docker", "cp", f"{CONTAINER}:/tmp/prev/{EMAIL}.html", f"{tmp}/mail.html"], check=True)
body = open(f"{tmp}/mail.html", encoding="utf-8").read()
open(f"{tmp}/wrap.html", "w", encoding="utf-8").write(f'''<html><body style="margin:0;background:#fff;font-family:Helvetica,Arial,sans-serif;">
<div style="width:620px;padding:0 10px 10px;">{body}</div></body></html>''')
with sync_playwright() as p:
    b = p.chromium.launch(channel="chrome", headless=True)
    pg = b.new_page(viewport={"width": 640, "height": 900}, device_scale_factor=2, locale="es-MX", timezone_id="America/Mexico_City")
    pg.goto("file://" + tmp + "/wrap.html"); pg.screenshot(path=tmp + "/mail.png", full_page=True)
    boxes = []
    for sel in ('a[href*="reset-password"]', 'strong:has-text("Tus reservaciones")'):
        bb = pg.locator(sel).first.bounding_box(); boxes.append(bb)
    b.close()
sql("DELETE FROM reservations WHERE recurring_group = '%s'; DELETE FROM recurring_groups WHERE id = '%s';" % (GROUP, GROUP))
img = Image.open(tmp + "/mail.png").convert("RGB")
d = ImageDraw.Draw(img); f = font(30); sc = 2
for n, bb in enumerate(boxes, 1):
    x0, y0, x1, y1 = bb["x"]*sc, bb["y"]*sc, (bb["x"]+bb["width"])*sc, (bb["y"]+bb["height"])*sc
    d.rounded_rectangle([x0-8, y0-8, x1+8, y1+8], radius=12, outline=RED, width=5)
    r = 22; cx, cy = x0-8, y0-8
    d.ellipse([cx-r, cy-r, cx+r, cy+r], fill=RED, outline="white", width=3)
    tw = d.textlength(str(n), font=f); d.text((cx-tw/2, cy-r*0.72), str(n), fill="white", font=f)
img.save(OUT + "/email_invitacion.jpg", "JPEG", quality=82, optimize=True)
shutil.rmtree(tmp); print("   email_invitacion.jpg", img.size)
