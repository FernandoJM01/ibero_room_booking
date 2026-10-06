"""Captura de pantallas para los manuales. Requiere la pila de demostración en marcha y datos de seed_demo.py."""
import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *
import lib
lib.OUT = os.path.abspath(os.environ.get("SHOT_DIR", lib.OUT)); os.makedirs(lib.OUT, exist_ok=True)
from lib import shot, settle
B = Browser(scale=2)
made = []
def S(*a, **k):
    p = shot(*a, **k); made.append(p); print("  ", os.path.basename(p)); return p
def blank(pg): pg.mouse.click(760, 40)

# ───────── Académico ─────────
# Recorrido de bienvenida (paso 2: selector de sala resaltado)
pg = B.page("academico", tutorial=True); settle(pg, 1600)
pg.click("text=Siguiente"); settle(pg, 800)
S(pg, "acad_tutorial_1")
pg = B.page("academico"); settle(pg, 1400)
S(pg, "acad_calendar", marks=[("#readonly-banner","1","tl"),(".room-picker--topbar","2","bl"),("#view-month","3","bl"),("#cal-prev","4","bl"),("#cal-body","5","tl")])
S(pg, "common_sidebar_academico", clip_sel="#sidebar", pad=22, crop=(0,0.08,1,0.4), marks=[("#sidebar-nav-calendar","1","r"),("#sidebar-nav-historial","2","r")])
pg.locator(".cal-reservation:not(.is-busy)").first.click(); settle(pg, 800)
S(pg, "acad_popup", marks=[])
blank(pg); pg.keyboard.press("Escape"); pg.wait_for_timeout(300)
pg.locator(".cal-reservation.is-busy").first.click(); settle(pg, 800)
S(pg, "acad_busy_popup", clip_sel="#cal-popup", pad=26)
blank(pg); pg.keyboard.press("Escape"); pg.wait_for_timeout(300)
pg.click("#view-week"); settle(pg, 900)
S(pg, "acad_week")
pg.goto(BASE + "/historial.html"); settle(pg, 1400)
S(pg, "acad_hist", marks=[(".hist-search","1","bl"),(".hist-tabs","2","tl"),(".hist-table-card .table-wrapper","3","tl")])

# ───────── Super administrador ─────────
pg = B.page("admin"); pg.goto(BASE + "/admin.html#usuarios"); settle(pg, 1400)
S(pg, "adm_sidebar", clip_sel="#sidebar", pad=22, crop=(0,0.08,1,0.72), marks=[("#sidebar-nav-admin-users","1","r"),("#sidebar-nav-admin-rooms","2","r"),("#sidebar-nav-admin-config","3","r"),("#sidebar-nav-admin-notif","4","r"),("#sidebar-nav-admin-backup","5","r")])
S(pg, "adm_users", marks=[(".admin-tabs","1","bl"),("#btn-add-user","2","bl"),("#users-grid .user-card >> nth=0","3","tl")])
pg.click("#btn-add-user"); settle(pg, 600)
S(pg, "adm_user_new", clip_sel=".user-modal-overlay > *", pad=16, marks=[("#um-role","1","l"),("#um-is-admin","2","l"),("#um-password","3","l")])
pg.keyboard.press("Escape"); pg.wait_for_timeout(300)
if pg.locator(".user-modal-overlay").count(): pg.locator(".user-modal-overlay .btn-secondary").first.click(); pg.wait_for_timeout(300)
# desactivar (sin confirmar)
card = pg.locator("#users-grid .user-card", has_text="Elena Torres")
card.locator("button", has_text="Desactivar").click(); settle(pg, 500)
S(pg, "adm_user_deactivate", clip_sel=".modal-dialog", pad=14)
pg.locator(".modal-dialog .btn-secondary").first.click(); pg.wait_for_timeout(300)
# salas
pg.goto(BASE + "/admin.html#salas"); settle(pg, 1200)
S(pg, "adm_rooms", marks=[("#btn-add-room","1","bl"),("#rooms-grid .user-card >> nth=0","2","tl")])
pg.click("#btn-add-room"); settle(pg, 600)
S(pg, "adm_room_new", clip_sel=".user-modal-overlay > *", pad=16, marks=[("#rm-name","1","l"),("#rm-location","2","l"),("#rm-capacity","3","l")])
pg.keyboard.press("Escape"); pg.wait_for_timeout(300)
if pg.locator(".user-modal-overlay").count(): pg.locator(".user-modal-overlay .btn-secondary").first.click(); pg.wait_for_timeout(300)
# festivos y semestre
pg.goto(BASE + "/admin.html#calendario"); settle(pg, 1300)
S(pg, "adm_calendar", marks=[("#admin-cal-title","1","tl"),("#holiday-type","2","bl"),("#btn-mark-date","3","bl"),("#holiday-list","4","tl")])
pg.locator("#semester-settings-body").scroll_into_view_if_needed(); pg.wait_for_timeout(300)
S(pg, "adm_semester", clip_sel="#semester-settings-body", pad=20)
pg.goto(BASE + "/admin.html#notificaciones"); settle(pg, 1300)
S(pg, "adm_notif", marks=[("#smtp-config-body","1","tl"),("#notif-log-body","2","tl")])
pg.goto(BASE + "/admin.html#respaldos"); settle(pg, 1300)
S(pg, "adm_backup", marks=[("#btn-create-backup","1","tl"),("#bkp-count-reservations","2","l")])

# ───────── Móvil ─────────
def phone(role, url, name, action=None):
    pg = B.page(role, w=390, h=844, mobile=True); pg.goto(BASE + url); settle(pg, 1500)
    if action: action(pg)
    p = shot(pg, name, maxw=780); made.append(p); print("  ", os.path.basename(p)); return p
m1 = phone("secretaria", "/dashboard.html", "_m1")
m2 = phone("secretaria", "/dashboard.html", "_m2", lambda pg: (pg.click("#sidebar-toggle"), pg.wait_for_timeout(700)))
m3 = phone("secretaria", "/historial.html", "_m3")
ims = [Image.open(p).convert("RGB") for p in (m1, m2, m3)]
H = max(i.height for i in ims); gap = 40
sheet = Image.new("RGB", (sum(i.width for i in ims) + gap*(len(ims)+1), H + 2*gap), (243, 243, 243))
x = gap
for i in ims:
    sheet.paste(i, (x, gap)); ImageDraw.Draw(sheet).rounded_rectangle([x-3, gap-3, x+i.width+3, gap+i.height+3], radius=14, outline=(190,190,190), width=3); x += i.width + gap
sheet.save(lib.OUT + "/mob_secretaria.jpg", "JPEG", quality=86); made.append(lib.OUT + "/mob_secretaria.jpg")
for p in (m1, m2, m3): os.remove(p)
print("DONE", len(made)); B.close()
