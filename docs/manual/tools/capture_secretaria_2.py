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

# ── Historial
pg = B.page("secretaria"); pg.goto(BASE + "/historial.html"); settle(pg, 1400)
S(pg, "sec_hist_full", marks=[(".hist-search","1","bl"),("#btn-date-range","2","bl"),(".hist-select","3","bl"),("#btn-more-filters","4","bl"),(".hist-tabs","5","tl"),("#export-btn-group","6","bl"),(".hist-table-card .table-wrapper","7","tl"),("#btn-retention","8","tl")])
pg.click("#btn-date-range"); pg.wait_for_timeout(500)
S(pg, "sec_hist_dates", clip_sel=".hist-toolbar", pad=0) if False else None
bb = pg.locator("#pop-dates").bounding_box()
S(pg, "sec_hist_dates", marks=[("#date-presets","1","tl"),(".hist-pop__row","2","tl")])
pg.click("#date-presets [data-preset=month]"); pg.wait_for_timeout(300)
pg.click(".hist-tab[data-status=active]"); pg.wait_for_timeout(300)
pg.click("#btn-more-filters"); pg.click("#type-seg [data-type=internals]"); pg.wait_for_timeout(300)
S(pg, "sec_hist_filtered", marks=[("#btn-date-range","1","bl"),("#btn-more-filters","2","bl"),("#filter-chips","3","tl"),("#btn-clear-filters","4","bl"),("#tab-count-active","5","br")])
blank(pg)
pg.click("#btn-clear-filters"); pg.wait_for_timeout(300)
# acciones de fila
row = pg.locator("#table-body tr:not(.is-cancelled)").first
S(pg, "sec_hist_row", clip_sel=row.evaluate_handle("e=>e") and "#table-body tr:not(.is-cancelled)", pad=6, marks=[(".row-history-btn","1","tl"),(".row-edit-btn","2","tl"),(".row-cancel-btn","3","tr")])
# ver cambios (reservación modificada)
pg.locator(".row-history-btn.has-changes").first.click(); settle(pg, 900)
S(pg, "sec_hist_changes", clip_sel=".modal-dialog", pad=14)
pg.keyboard.press("Escape"); pg.wait_for_timeout(300)
if pg.locator(".modal-overlay").count(): pg.locator(".modal-overlay").first.click(position={"x":4,"y":4}); pg.wait_for_timeout(300)
# selección múltiple
pg.locator(".row-check").nth(0).check(); pg.locator(".row-check").nth(1).check(); pg.wait_for_timeout(400)
S(pg, "sec_hist_bulk", marks=[("#bulk-bar","1","tl"),("#btn-bulk-cancel","2","bl"),("#select-all-top","3","br")])
pg.locator(".row-check").nth(0).uncheck(); pg.locator(".row-check").nth(1).uncheck()
# confirmar cancelación (sin confirmar)
pg.locator(".row-cancel-btn").first.click(); settle(pg, 500)
S(pg, "sec_cancel_confirm", clip_sel=".modal-dialog", pad=14)
pg.click("#conf-cancel-btn"); pg.wait_for_timeout(300)
# exportar a PDF → primera página
with pg.expect_download(timeout=30000) as dl:
    pg.click("#btn-export-pdf")
dl.value.save_as("/tmp/_hist_export.pdf")
import pymupdf
doc = pymupdf.open("/tmp/_hist_export.pdf"); pix = doc[0].get_pixmap(dpi=130); pix.save(lib.OUT + "/sec_export_pdf.png")
im = Image.open(lib.OUT + "/sec_export_pdf.png").convert("RGB"); im.save(lib.OUT + "/sec_export_pdf.jpg", "JPEG", quality=86); os.remove(lib.OUT + "/sec_export_pdf.png"); made.append(lib.OUT + "/sec_export_pdf.jpg"); print("   sec_export_pdf.jpg", doc.page_count, "pages")

# ── Editar reservación (viewport alto)
pg = B.page("secretaria", w=1440, h=1500); pg.goto(BASE + "/historial.html"); settle(pg, 1200)
pg.locator(".row-edit-btn").first.click(); settle(pg, 900)
S(pg, "sec_edit_modal", clip_sel=".rmodal")

# ── Estadísticas
pg = B.page("secretaria"); pg.goto(BASE + "/estadisticas.html"); settle(pg, 2200)
S(pg, "sec_stats", marks=[(".stats-period-bar","1","bl"),("#kpi-grid","2","bl"),("#chart-monthly","3","tl"),(".stats-export-bar","4","tl")])

# ── Usuarios
pg.goto(BASE + "/admin.html#usuarios"); settle(pg, 1300)
S(pg, "sec_users", marks=[(".admin-tabs","1","bl"),("#subtab-internal","2","bl"),("#btn-add-user","3","bl"),("#users-grid .user-card >> nth=1","4","tl")])
pg.click("#btn-add-user"); settle(pg, 600)
S(pg, "sec_user_new", clip_sel=".user-modal-overlay > *", pad=16, marks=[("#um-name","1","l"),("#um-email","2","l"),("#um-role","3","l"),("#um-password","4","l")])
pg.keyboard.press("Escape"); pg.wait_for_timeout(300)
if pg.locator(".user-modal-overlay").count(): pg.locator(".user-modal-overlay [data-close], .user-modal-overlay .btn-secondary").first.click(); pg.wait_for_timeout(300)
pg.click("#subtab-external"); settle(pg, 600)
S(pg, "sec_users_external")
# ── Festivos / cierres
pg.goto(BASE + "/admin.html#calendario"); settle(pg, 1300)
S(pg, "sec_calendar_admin", marks=[("#admin-cal-title","1","tl"),("#holiday-type","2","bl"),("#holiday-name","3","bl"),("#btn-mark-date","4","bl"),("#holiday-list","5","tl")])
pg.locator("#semester-settings-body").scroll_into_view_if_needed(); pg.wait_for_timeout(300)
S(pg, "sec_semester_readonly", clip_sel="#semester-settings-body", pad=20)
# ── Notificaciones
pg.goto(BASE + "/admin.html#notificaciones"); settle(pg, 1300)
S(pg, "sec_notif", marks=[("#smtp-config-body","1","tl"),("#notif-log-body","2","tl")])

# ── Sidebar contraído, menú de perfil, cambiar contraseña, tutorial
pg = B.page("secretaria", collapsed=True); settle(pg, 1300)
S(pg, "common_sidebar_collapsed")
pg = B.page("secretaria"); settle(pg, 1000)
pg.click("#profile-dropdown-btn"); pg.wait_for_timeout(400)
S(pg, "common_profile_menu", clip_sel="#sidebar", pad=22, crop=(0,0.62,1,1), marks=[("#profile-dropdown-btn","1","r"),("#change-pwd-btn","2","r"),("#logout-btn","3","r")])
pg.click("#change-pwd-btn"); settle(pg, 600)
S(pg, "common_change_password", clip_sel=".modal-dialog", pad=16)
pg.keyboard.press("Escape")
pg = B.page("secretaria", tutorial=True); settle(pg, 1500)
S(pg, "common_tutorial_1")
pg.click("text=Siguiente"); settle(pg, 700)
S(pg, "common_tutorial_2")
print("DONE", len(made)); B.close()
