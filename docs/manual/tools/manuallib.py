# -*- coding: utf-8 -*-
"""Biblioteca mínima para armar los manuales en PDF (reportlab).

Uso:  m = Manual(...); m.h1(...); m.p(...); m.steps([...]); m.fig(...); m.build(ruta)
Solo usa fuentes estándar (Helvetica), por lo que el texto debe limitarse a
caracteres Latin-1/Windows-1252 (acentos, ñ, ¿, ¡, «», “”, —, ·, …, ›).
"""
import os
from PIL import Image as PILImage
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, Table,
                                TableStyle, Image, KeepTogether, PageBreak, NextPageTemplate,
                                ListFlowable, ListItem, CondPageBreak, FrameBreak)
from reportlab.platypus.tableofcontents import TableOfContents

RED = colors.HexColor("#ef3e42")
RED_DARK = colors.HexColor("#c62d30")
INK = colors.HexColor("#222222")
GREY = colors.HexColor("#666666")
LINE = colors.HexColor("#d9d9d9")
SOFT = colors.HexColor("#f5f5f5")
W, H = letter
MARGIN = 0.8 * inch
CONTENT_W = W - 2 * MARGIN

HERE = os.path.dirname(os.path.abspath(__file__))
IMG = os.path.join(HERE, "..", "img")
LOGO = os.path.join(HERE, "..", "..", "..", "frontend", "assets", "img", "logo-ibero-white.png")

body = ParagraphStyle("body", fontName="Helvetica", fontSize=10, leading=14.2, textColor=INK, spaceAfter=6, alignment=TA_LEFT)
small = ParagraphStyle("small", parent=body, fontSize=8.4, leading=11, textColor=GREY, spaceAfter=0)
h1s = ParagraphStyle("h1", fontName="Helvetica-Bold", fontSize=19, leading=23, textColor=RED, spaceBefore=4, spaceAfter=8)
h2s = ParagraphStyle("h2", fontName="Helvetica-Bold", fontSize=13, leading=17, textColor=INK, spaceBefore=12, spaceAfter=5, keepWithNext=1)
h3s = ParagraphStyle("h3", fontName="Helvetica-Bold", fontSize=10.5, leading=14, textColor=RED_DARK, spaceBefore=8, spaceAfter=3, keepWithNext=1)
cell = ParagraphStyle("cell", parent=body, fontSize=9, leading=12, spaceAfter=0)
cellb = ParagraphStyle("cellb", parent=cell, fontName="Helvetica-Bold")
cellh = ParagraphStyle("cellh", parent=cell, fontName="Helvetica-Bold", textColor=colors.white)
caption = ParagraphStyle("caption", parent=small, alignment=TA_CENTER, spaceBefore=3, spaceAfter=10)
item = ParagraphStyle("item", parent=body, spaceAfter=3)

BADGE = "<font backColor='#ef3e42' color='white'><b>&nbsp;{}&nbsp;</b></font>"


class _Doc(BaseDocTemplate):
    def __init__(self, path, footer_title, **kw):
        super().__init__(path, pagesize=letter, leftMargin=MARGIN, rightMargin=MARGIN,
                         topMargin=0.85 * inch, bottomMargin=0.8 * inch, **kw)
        self.footer_title = footer_title
        self._cover = None
        frame = Frame(MARGIN, 0.8 * inch, CONTENT_W, H - 0.85 * inch - 0.8 * inch, id="f", leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
        cframe = Frame(MARGIN, 0.8 * inch, CONTENT_W, H * 0.40, id="c", leftPadding=0, rightPadding=0)
        self.addPageTemplates([PageTemplate(id="cover", frames=[cframe], onPage=self._draw_cover),
                               PageTemplate(id="body", frames=[frame], onPage=self._draw_page)])

    def afterFlowable(self, fl):
        lvl = getattr(fl, "_toc_level", None)
        if lvl is not None:
            text = fl.getPlainText()
            key = "h%s-%s" % (lvl, self.seq.nextf("toc"))
            self.canv.bookmarkPage(key)
            self.notify("TOCEntry", (lvl, text, self.page - 1, key))

    def _draw_cover(self, c, doc):
        meta = self._cover
        c.saveState()
        c.setFillColor(RED); c.rect(0, H * 0.46, W, H * 0.54, stroke=0, fill=1)
        c.setFillColor(RED_DARK); c.rect(0, H * 0.46, W, 5, stroke=0, fill=1)
        try:
            im = PILImage.open(LOGO); iw, ih = im.size; lw = 2.6 * inch
            c.drawImage(LOGO, MARGIN, H - 1.25 * inch - lw * ih / iw, width=lw, height=lw * ih / iw, mask="auto")
        except Exception:
            pass
        c.setFillColor(colors.white)
        c.setFont("Helvetica", 12); c.drawString(MARGIN, H * 0.46 + 2.55 * inch, meta["kicker"])
        c.setFont("Helvetica-Bold", 34)
        y = H * 0.46 + 1.75 * inch
        for line in meta["title_lines"]:
            c.drawString(MARGIN, y, line); y -= 40
        c.setFont("Helvetica", 13); c.drawString(MARGIN, H * 0.46 + 0.45 * inch, meta["subtitle"])
        c.setFillColor(GREY); c.setFont("Helvetica", 9)
        c.drawString(MARGIN, 0.55 * inch, meta["footer"])
        c.restoreState()

    def _draw_page(self, c, doc):
        c.saveState()
        c.setStrokeColor(RED); c.setLineWidth(2); c.line(MARGIN, H - 0.42 * inch, MARGIN + 0.5 * inch, H - 0.42 * inch)
        c.setFillColor(GREY); c.setFont("Helvetica", 8.5)
        c.drawString(MARGIN, H - 0.62 * inch, "IberoReservations · Universidad Iberoamericana Ciudad de México")
        c.setStrokeColor(LINE); c.setLineWidth(0.5); c.line(MARGIN, 0.62 * inch, W - MARGIN, 0.62 * inch)
        c.drawString(MARGIN, 0.45 * inch, self.footer_title)
        c.drawRightString(W - MARGIN, 0.45 * inch, "Página %d" % (doc.page - 1))
        c.restoreState()


class Manual:
    def __init__(self, footer_title, kicker, title_lines, subtitle, cover_footer):
        self.footer_title = footer_title
        self.cover = dict(kicker=kicker, title_lines=title_lines, subtitle=subtitle, footer=cover_footer)
        self.s = []
        self._fig = 0

    # ── texto
    def h1(self, text, newpage=True):
        self.s.append(PageBreak() if newpage else CondPageBreak(2.2 * inch))
        p = Paragraph(text, h1s); p._toc_level = 0; self.s.append(p)
        self.s.append(_rule())

    def h2(self, text):
        self.s.append(CondPageBreak(1.6 * inch))
        p = Paragraph(text, h2s); p._toc_level = 1; self.s.append(p)

    def h3(self, text):
        self.s.append(CondPageBreak(1.2 * inch)); self.s.append(Paragraph(text, h3s))

    def p(self, text, style=None):
        self.s.append(Paragraph(text, style or body))

    def bullets(self, items):
        self.s.append(ListFlowable([ListItem(Paragraph(t, item), leftIndent=14) for t in items],
                                   bulletType="bullet", start="•", leftIndent=14, bulletFontSize=9, bulletColor=RED))
        self.s.append(Spacer(1, 4))

    def steps(self, items):
        self.s.append(ListFlowable([ListItem(Paragraph(t, item), leftIndent=18) for t in items],
                                   bulletType="1", bulletFontName="Helvetica-Bold", bulletFontSize=9.5,
                                   bulletColor=RED, leftIndent=18))
        self.s.append(Spacer(1, 4))

    def legend(self, items):
        """Lista de elementos numerados que corresponden a los círculos rojos de la captura."""
        rows = [[Paragraph(BADGE.format(i + 1), cell), Paragraph(t, cell)] for i, t in enumerate(items)]
        t = Table(rows, colWidths=[0.35 * inch, CONTENT_W - 0.35 * inch])
        t.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("TOPPADDING", (0, 0), (-1, -1), 2.5),
                               ("BOTTOMPADDING", (0, 0), (-1, -1), 2.5), ("LEFTPADDING", (0, 0), (-1, -1), 0)]))
        self.s.append(t); self.s.append(Spacer(1, 6))

    # ── recuadros
    def _box(self, label, text, edge, bg):
        t = Table([[Paragraph("<b>%s</b>  %s" % (label, text), cell)]], colWidths=[CONTENT_W])
        t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), bg), ("LINEBEFORE", (0, 0), (0, -1), 3, edge),
                               ("LEFTPADDING", (0, 0), (-1, -1), 10), ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                               ("TOPPADDING", (0, 0), (-1, -1), 7), ("BOTTOMPADDING", (0, 0), (-1, -1), 7)]))
        self.s.append(Spacer(1, 2)); self.s.append(KeepTogether(t)); self.s.append(Spacer(1, 8))

    def tip(self, text):  self._box("Consejo:", text, colors.HexColor("#2e9e5b"), colors.HexColor("#eef8f2"))
    def note(self, text): self._box("Nota:", text, colors.HexColor("#2f80b7"), colors.HexColor("#eef5fa"))
    def warn(self, text): self._box("Importante:", text, RED, colors.HexColor("#fdeeee"))

    # ── tablas
    def table(self, header, rows, widths):
        data = [[Paragraph(h, cellh) for h in header]] + [[Paragraph(str(c), cell) for c in r] for r in rows]
        tw = sum(widths); widths = [w / tw * CONTENT_W for w in widths]
        t = Table(data, colWidths=widths, repeatRows=1)
        t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), RED), ("VALIGN", (0, 0), (-1, -1), "TOP"),
                               ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, SOFT]),
                               ("LINEBELOW", (0, 0), (-1, -1), 0.4, LINE),
                               ("LEFTPADDING", (0, 0), (-1, -1), 6), ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                               ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4)]))
        self.s.append(t); self.s.append(Spacer(1, 8))

    # ── figuras
    def fig(self, name, text, max_w=None, max_h=4.6 * inch):
        path = os.path.join(IMG, name + ".jpg")
        if not os.path.exists(path):
            raise FileNotFoundError(path)
        iw, ih = PILImage.open(path).size
        max_w = max_w or CONTENT_W
        max_h = min(max_h, 3.9 * inch if iw / ih > 1.3 else 5.3 * inch)
        scale = min(max_w / iw, max_h / ih)
        w, h = iw * scale, ih * scale
        self._fig += 1
        img = Image(path, width=w, height=h)
        framed = Table([[img]], colWidths=[w + 2], style=TableStyle([
            ("BOX", (0, 0), (-1, -1), 0.6, LINE), ("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ("TOPPADDING", (0, 0), (-1, -1), 0), ("BOTTOMPADDING", (0, 0), (-1, -1), 0)]))
        framed.hAlign = "CENTER"
        self.s.append(KeepTogether([Spacer(1, 3), framed, Paragraph("Figura %d. %s" % (self._fig, text), caption)]))

    def build(self, out):
        toc = TableOfContents()
        toc.levelStyles = [
            ParagraphStyle("t0", fontName="Helvetica-Bold", fontSize=10, leading=15.5, leftIndent=0, textColor=INK, spaceBefore=2),
            ParagraphStyle("t1", fontName="Helvetica", fontSize=9, leading=12.2, leftIndent=16, textColor=GREY)]
        toc.dotsMinLevel = 0
        head = [Spacer(1, 0), NextPageTemplate("body"), PageBreak(),
                Paragraph("Contenido", h1s), _rule(), toc]
        doc = _Doc(out, self.footer_title, title=self.footer_title, author="Proyecto IberoReservations")
        doc._cover = self.cover
        doc.multiBuild(head + self.s)


def _rule():
    t = Table([[""]], colWidths=[CONTENT_W], rowHeights=[2])
    t.setStyle(TableStyle([("LINEBELOW", (0, 0), (-1, -1), 0.8, LINE)]))
    return t
