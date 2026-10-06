"""Utilidades de captura de pantalla para los manuales (Playwright + Chrome del sistema)."""
import os, sys, json
from playwright.sync_api import sync_playwright
from PIL import Image, ImageDraw, ImageFont

BASE = os.environ.get("DEMO_BASE", "http://localhost:8090")
PW   = os.environ.get("DEMO_PASSWORD") or sys.exit("Define DEMO_PASSWORD (la contraseña de las cuentas de demostración).")
OUT  = os.environ.get("SHOT_DIR", os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "img"))
USERS = {
    "secretaria": "laura.mendez@demo.ibero.mx",
    "academico":  "ricardo.salas@demo.ibero.mx",
    "admin":      "admin@demo.ibero.mx",
}
RED = (239, 62, 66)
os.makedirs(OUT, exist_ok=True)

def font(sz):
    for f in ("/System/Library/Fonts/Helvetica.ttc", "/System/Library/Fonts/Supplemental/Arial Bold.ttf"):
        try: return ImageFont.truetype(f, sz)
        except Exception: pass
    return ImageFont.load_default()

class Browser:
    def __init__(self, scale=2):
        self.pw = sync_playwright().start()
        self.b = self.pw.chromium.launch(channel="chrome", headless=True)
        self.scale = scale
    def page(self, role=None, w=1440, h=900, tutorial=False, collapsed=False, mobile=False):
        ctx = self.b.new_context(viewport={"width": w, "height": h}, device_scale_factor=self.scale, locale="es-MX",
                                 timezone_id="America/Mexico_City", has_touch=mobile, is_mobile=mobile)
        init = "try{" + ("" if tutorial else "localStorage.setItem('sjibero_tutorial_v1','1');") +                "localStorage.setItem('ibero_selected_room','a10e1300-0000-4000-8000-000000000001');" +                ("localStorage.setItem('ibero_sidebar_collapsed','1');" if collapsed else "") + "}catch(e){}"
        ctx.add_init_script(init)
        if role:
            auth = self.auth(role)
            ctx.add_init_script("try{localStorage.setItem('ibero_jwt'," + json.dumps(auth["token"]) +
                ");localStorage.setItem('ibero_session'," + json.dumps(json.dumps(auth["user"])) +
                ");localStorage.setItem('ibero_login_time',Date.now().toString());}catch(e){}")
        pg = ctx.new_page()
        if role: pg.goto(BASE + "/dashboard.html" if role != "academico" else BASE + "/calendar.html")
        return pg
    _auth = {}
    def auth(self, role):
        if role not in self._auth:
            import urllib.request
            req = urllib.request.Request(BASE + "/api/auth/login", method="POST", data=json.dumps({"email": USERS[role], "password": PW}).encode(), headers={"Content-Type": "application/json"})
            self._auth[role] = json.loads(urllib.request.urlopen(req).read())
        return self._auth[role]
    def close(self): self.b.close(); self.pw.stop()

def settle(pg, ms=900):
    pg.wait_for_load_state("networkidle"); pg.wait_for_timeout(ms)

def dismiss_tutorial(pg):
    # first-visit tutorial overlay would cover every screenshot
    pg.evaluate("""() => { try { Object.keys(localStorage).filter(k => /tutor/i.test(k)).forEach(k => localStorage.setItem(k, 'true')); } catch(e){} }""")

def shot(pg, name, clip_sel=None, marks=(), pad=0, full=False, quality=80, maxw=1600, crop=None):
    """Screenshot (optionally clipped to an element) with numbered callouts.
    marks: [(selector, number, 'tl'|'tr'|'bl'|'br'|'l'|'r'), ...] drawn on the final image."""
    path = f"{OUT}/{name}.png"
    box = None
    if clip_sel:
        el = pg.locator(clip_sel).first
        bb = el.bounding_box(); assert bb, f"no box for {clip_sel}"
        box = {"x": max(bb["x"]-pad,0), "y": max(bb["y"]-pad,0), "width": bb["width"]+2*pad, "height": bb["height"]+2*pad}
        pg.screenshot(path=path, clip=box)
    else:
        pg.screenshot(path=path, full_page=full)
    s = pg.evaluate("window.devicePixelRatio")
    img = Image.open(path).convert("RGB")
    d = ImageDraw.Draw(img)
    f = font(int(15*s))
    for sel, num, pos in marks:
        loc = pg.locator(sel).first
        bb = loc.bounding_box()
        if not bb: print("  (mark skipped, no box):", sel); continue
        ox, oy = (box["x"], box["y"]) if box else (0, 0)
        x0, y0 = (bb["x"]-ox)*s, (bb["y"]-oy)*s
        x1, y1 = x0+bb["width"]*s, y0+bb["height"]*s
        # outline the target
        d.rounded_rectangle([x0-3*s, y0-3*s, x1+3*s, y1+3*s], radius=6*s, outline=RED, width=int(2.2*s))
        r = 11*s
        cx, cy = {"tl": (x0-3*s, y0-3*s), "tr": (x1+3*s, y0-3*s), "bl": (x0-3*s, y1+3*s), "br": (x1+3*s, y1+3*s),
                  "l": (x0-3*s-r*0.4, (y0+y1)/2), "r": (x1+3*s+r*0.4, (y0+y1)/2)}[pos]
        d.ellipse([cx-r, cy-r, cx+r, cy+r], fill=RED, outline="white", width=int(1.5*s))
        tw = d.textlength(str(num), font=f)
        d.text((cx-tw/2, cy-r*0.62), str(num), fill="white", font=f)
    if crop:
        W, H = img.size; img = img.crop((int(crop[0]*W), int(crop[1]*H), int(crop[2]*W), int(crop[3]*H)))
    # downscale + JPEG
    if img.width > maxw:
        img = img.resize((maxw, int(img.height*maxw/img.width)), Image.LANCZOS)
    out = f"{OUT}/{name}.jpg"
    img.save(out, "JPEG", quality=quality, optimize=True)
    os.remove(path)
    return out

def contact_sheet(paths, out, cols=2, w=900):
    ims = [Image.open(p).convert("RGB") for p in paths]
    ims = [i.resize((w, int(i.height*w/i.width))) for i in ims]
    rows = [ims[i:i+cols] for i in range(0, len(ims), cols)]
    H = sum(max(i.height for i in r) for r in rows)
    sheet = Image.new("RGB", (w*cols, H), "white"); y = 0
    for r in rows:
        for c, im in enumerate(r): sheet.paste(im, (c*w, y))
        y += max(i.height for i in r)
    sheet.save(out, "JPEG", quality=85)
