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

def drag_slots(pg, date, h1, h2):
    a = pg.locator(f'.cal-wk__slot[data-date="{date}"][data-hour="{h1}"]').first
    b = pg.locator(f'.cal-wk__slot[data-date="{date}"][data-hour="{h2}"]').first
    a.scroll_into_view_if_needed()
    ba, bb = a.bounding_box(), b.bounding_box()
    pg.mouse.move(ba["x"]+ba["width"]/2, ba["y"]+ba["height"]/2); pg.mouse.down()
    pg.mouse.move(bb["x"]+bb["width"]/2, bb["y"]+bb["height"]/2, steps=8); pg.mouse.up(); settle(pg, 400)

# ───────── Login & sesión (común) ─────────
pg = B.page(None, w=1440, h=900)
pg.goto(BASE + "/index.html"); settle(pg)
pg.fill("#login-email", "nombre@ibero.mx") if False else None
S(pg, "common_login", clip_sel=".login-card", pad=14, marks=[("#login-email","1","l"),("#login-password","2","l"),("#login-password ~ button, .pw-toggle-btn","3","r"),("button[type=submit]","4","l"),("text=¿Olvidaste tu contraseña?","5","l")])
pg.click("text=¿Olvidaste tu contraseña?"); settle(pg, 500)
S(pg, "common_forgot", clip_sel=".login-card", pad=14)

# ───────── Secretaria ─────────
pg = B.page("secretaria"); settle(pg, 1200)
S(pg, "sec_dashboard", marks=[(".stats-grid","1","tl"),(".room-picker--topbar","2","bl"),(".calendar-widget__view-toggle","3","bl"),(".calendar-widget__nav","4","br"),("#calendar-body","5","tl"),("#mini-cal","6","tl"),(".upcoming-panel__header","7","tl"),(".cal-legend","8","tl")])
S(pg, "common_sidebar_secretaria", clip_sel="#sidebar", pad=22, crop=(0,0.08,1,0.66), marks=[("#sidebar-nav-dashboard","1","r"),("#sidebar-nav-historial","2","r"),("#sidebar-nav-estadisticas","3","r"),("#sidebar-nav-admin-users","4","r"),("#sidebar-nav-admin-config","5","r"),("#sidebar-nav-admin-notif","6","r")])
# month → click a populated day popup
pg.locator('.cal-reservation').first.click(); settle(pg, 700)
S(pg, "sec_popup", clip_sel=".cal-popup", pad=24)
pg.keyboard.press("Escape"); pg.wait_for_timeout(300)
pg.mouse.click(760, 40)

# semana + selección
pg.click("#view-week"); settle(pg); pg.locator("#cal-next").click(); settle(pg, 700)
S(pg, "sec_week")
drag_slots(pg, "2026-10-15", "10:00", "11:30")
S(pg, "sec_week_selected", marks=[("#cal-selection-bar","1","tl"),(".cal-wk__slot.is-selected","2","r"),("#cal-selection-book","3","bl")])
pg.keyboard.press("Escape")
# menú contextual sobre una reservación
blk = pg.locator('.cal-wk__event[data-id]').first
bb = blk.bounding_box(); pg.mouse.click(bb["x"]+bb["width"]/2, bb["y"]+bb["height"]/2, button="right"); settle(pg, 400)
S(pg, "sec_ctx_reservation", clip_sel="#wk-ctx-menu", pad=30)
pg.keyboard.press("Escape"); pg.mouse.click(760, 40)
# menú contextual en celda libre
sl = pg.locator('.cal-wk__slot[data-date="2026-10-16"][data-hour="13:00"]').first
bb = sl.bounding_box(); pg.mouse.click(bb["x"]+10, bb["y"]+5, button="right"); settle(pg, 400)
S(pg, "sec_ctx_cell", clip_sel="#wk-ctx-menu", pad=30)
pg.keyboard.press("Escape"); pg.mouse.click(760, 40)

# ───────── Modal Nueva reservación (viewport alto) ─────────
pg = B.page("secretaria", w=1440, h=1500); settle(pg, 1200)
pg.click("#view-week"); settle(pg); pg.locator("#cal-next").click(); settle(pg, 700)
drag_slots(pg, "2026-10-15", "10:00", "11:30"); pg.click("#cal-selection-book"); settle(pg, 900)
S(pg, "sec_modal_empty", clip_sel=".rmodal", pad=0)
pg.select_option("#rmodal-room", "a10e1300-0000-4000-8000-000000000001"); pg.wait_for_timeout(300)
pg.select_option("#rmodal-responsible", label="Dra. Elena Torres Ruiz (academico)") if pg.locator("#rmodal-responsible option", has_text="Elena Torres").count() else None; pg.evaluate("(()=>{const s=document.getElementById('rmodal-responsible');const o=[...s.options].find(o=>/Elena Torres/.test(o.textContent));if(o){s.value=o.value;s.dispatchEvent(new Event('change',{bubbles:true}));}})()"); pg.fill("#rmodal-area", "Reunión de academia"); pg.fill("#rmodal-obs", "Se requiere proyector."); pg.wait_for_timeout(300)
S(pg, "sec_modal_filled", clip_sel=".rmodal", marks=[("#rmodal-room","1","l"),("[data-iv-start='0']","2","tl"),("[data-iv-overlap='0']","3","bl"),("input[name=rmodal-resp-type], .rmodal__radio-group","4","tl"),("#rmodal-responsible","5","l"),("#rmodal-area","6","l"),("#rmodal-obs","7","l"),("#rmodal-recur-chk","8","l"),("#rmodal-save","9","tl")])
# recurrencia
pg.check("#rmodal-recur-chk"); pg.wait_for_timeout(300)
pg.select_option("#rmodal-recur-freq", "weekly"); pg.fill("#rmodal-recur-count", "4"); pg.wait_for_timeout(500)
S(pg, "sec_modal_recurring", clip_sel=".rmodal", marks=[("#rmodal-recur-freq","1","l"),("input[name=rmodal-recur-end-mode] >> nth=0","2","l"),("#rmodal-recur-count","3","l"),("#rmodal-recur-preview","4","tl")])
pg.uncheck("#rmodal-recur-chk")
# traslape
pg.select_option("[data-iv-start='0']", "09:00"); pg.select_option("[data-iv-end='0']", "10:30")
pg.fill("#rmodal-area", "Reunión de academia"); pg.select_option("#rmodal-room", "a10e1300-0000-4000-8000-000000000001")
pg.evaluate("document.querySelector('[data-iv-start=\"0\"]').dispatchEvent(new Event('change',{bubbles:true}))"); pg.wait_for_timeout(300)
# la fecha del intervalo es 15/oct; se busca un día con reserva real: se abre otro modal más abajo
pg.click("[data-rmodal-close]"); pg.wait_for_timeout(400)
# solicitante externo
drag_slots(pg, "2026-10-15", "12:00", "12:30"); pg.click("#cal-selection-book"); settle(pg, 700)
pg.check("input[type=radio][value=external], label:has-text('Solicitante Externo') input"); pg.wait_for_timeout(400)
S(pg, "sec_modal_external", clip_sel=".rmodal")
pg.click("[data-rmodal-close]"); pg.wait_for_timeout(400)
# varios horarios
drag_slots(pg, "2026-10-14", "10:00", "10:30")
a = pg.locator('.cal-wk__slot[data-date="2026-10-16"][data-hour="10:00"]').first; a.click(modifiers=["Control"]); pg.wait_for_timeout(300)
pg.click("#cal-selection-book"); settle(pg, 700)
S(pg, "sec_modal_multi", clip_sel=".rmodal")
pg.click("[data-rmodal-close]"); pg.wait_for_timeout(300)

print("DONE", len(made))
B.close()
