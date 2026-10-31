"""Build the two-page, A4 Meet to Manage product brochure.

Run from the repository root: python scripts/create-brochure.py
Requires reportlab and Pillow; uses installed Segoe UI fonts on Windows.
"""
from pathlib import Path
from io import BytesIO

from PIL import Image
from reportlab.graphics import renderPDF
from reportlab.graphics.barcode.qr import QrCodeWidget
from reportlab.graphics.shapes import Drawing
from reportlab.lib.colors import HexColor, white
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output/brochures"
OUT.mkdir(parents=True, exist_ok=True)
PDF = OUT / "Meet-to-Manage-Brochure-Redesigned.pdf"
FONT_DIR = Path("C:/Windows/Fonts")
for name, filename in [("Brand", "segoeui.ttf"), ("BrandBold", "segoeuib.ttf")]:
    pdfmetrics.registerFont(TTFont(name, str(FONT_DIR / filename)))
pdfmetrics.registerFontFamily("Brand", normal="Brand", bold="BrandBold")

W, H = 595.276, 841.89
M = 38
CW = W - M * 2
ORANGE = HexColor("#C2410C")
BRIGHT = HexColor("#EA580C")
INK = HexColor("#231D19")
MUTED = HexColor("#6D625A")
PEACH = HexColor("#FFF2E7")
LINE = HexColor("#EEDACB")
SITE = "https://meettomanage.cloud"
BOOK = SITE + "/get-started?utm_source=brochure&utm_medium=pdf&utm_campaign=product"

c = canvas.Canvas(str(PDF), pagesize=(W, H), pageCompression=1)
c.setTitle("Meet to Manage | Your academy. One connected platform.")
c.setAuthor("Meet to Manage / Infinity Uniquers")
c.setSubject("Academy management, live classrooms, admissions, fees and parent mobile app")
c.setCreator("Meet to Manage brochure builder")
c.setKeywords("coaching centre management, live classes, academy software, parent app")
LAYOUT = []


def rect(x, top, w, h, fill=white, stroke=None, radius=0):
    c.setFillColor(fill)
    c.setStrokeColor(stroke or fill)
    c.setLineWidth(.7)
    if radius:
        c.roundRect(x, H-top-h, w, h, radius, fill=1, stroke=int(stroke is not None))
    else:
        c.rect(x, H-top-h, w, h, fill=1, stroke=int(stroke is not None))


def text(value, x, top, size=10, color=INK, bold=False, width=None, leading=None, align=TA_LEFT):
    width = width or (W - x - M)
    style = ParagraphStyle("p", fontName="BrandBold" if bold else "Brand", fontSize=size,
                           leading=leading or size*1.45, textColor=color, alignment=align,
                           spaceBefore=0, spaceAfter=0)
    p = Paragraph(value, style)
    _, height = p.wrap(width, H)
    LAYOUT.append({"page": c.getPageNumber(), "text": value, "x": x, "top": top,
                   "width": width, "height": height})
    p.drawOn(c, x, H-top-height)
    return height


def image(path, x, top, w, h, radius=0, contain=False):
    im = Image.open(ROOT / "public" / path).convert("RGB")
    iw, ih = im.size
    scale = min(w/iw, h/ih) if contain else max(w/iw, h/ih)
    dw, dh = iw*scale, ih*scale
    c.saveState()
    clip = c.beginPath()
    clip.roundRect(x, H-top-h, w, h, radius)
    c.clipPath(clip, stroke=0)
    encoded = BytesIO()
    im.save(encoded, format="JPEG", quality=92, optimize=True)
    encoded.seek(0)
    c.drawImage(ImageReader(encoded), x+(w-dw)/2, H-top-h+(h-dh)/2, dw, dh, mask="auto")
    c.restoreState()


def rule(top, x=M, w=CW):
    c.setStrokeColor(LINE)
    c.setLineWidth(.7)
    c.line(x, H-top, x+w, H-top)


def arrow(x, top, color=white):
    c.setStrokeColor(color)
    c.setLineWidth(1.4)
    y = H-top
    c.line(x, y, x+10, y)
    c.line(x+6, y+4, x+10, y)
    c.line(x+6, y-4, x+10, y)


def button(label, x, top, w=190, h=36, link=BOOK, inverted=False):
    rect(x, top, w, h, white if inverted else ORANGE, radius=18)
    text(label, x+17, top+9, 9.5, ORANGE if inverted else white, True, w-43)
    arrow(x+w-26, top+h/2, ORANGE if inverted else white)
    c.linkURL(link, (x, H-top-h, x+w, H-top), relative=0, thickness=0)


def header(page):
    image("logo-full.webp", M, 22, 148, 50, contain=True)
    text("ACADEMY MANAGEMENT\nPLATFORM".replace("\n", "<br/>"), W-M-180, 35, 7.5, MUTED, True, 180, 11, TA_RIGHT)
    rule(84)
    text("meettomanage.cloud", M, 816, 8, MUTED)
    c.linkURL(SITE, (M, 10, M+120, 28), relative=0, thickness=0)
    text(f"PRODUCT BROCHURE  /  0{page}", W-M-140, 816, 7, MUTED, True, 140, align=TA_RIGHT)


def icon(kind, x, top):
    rect(x, top, 27, 27, HexColor("#FFE3CE"), radius=8)
    c.saveState()
    c.translate(x, H-top-27)
    c.setStrokeColor(ORANGE)
    c.setLineWidth(1.15)
    if kind == "video":
        c.roundRect(6, 8, 11, 11, 2, fill=0)
        p = c.beginPath(); p.moveTo(17, 11); p.lineTo(22, 8); p.lineTo(22, 19); p.lineTo(17, 16); c.drawPath(p)
    elif kind == "calendar":
        c.roundRect(6, 6, 15, 15, 2, fill=0); c.line(6, 16, 21, 16); c.line(10, 19, 10, 23); c.line(17, 19, 17, 23)
        for ix, iy in [(10, 12), (16, 12), (10, 9), (16, 9)]: c.circle(ix, iy, .6, fill=0)
    else:
        c.roundRect(7, 4, 13, 20, 3, fill=0); c.line(11, 7, 16, 7); c.line(11, 21, 16, 21)
    c.restoreState()


def phone(path, x, top, w):
    h = w*2.23
    rect(x+2, top+5, w, h, HexColor("#E9D7C5"), radius=w*.13)
    rect(x, top, w, h, INK, radius=w*.13)
    inset = 3.5
    rect(x+inset, top+inset, w-inset*2, h-inset*2, HexColor("#FAFAFA"), radius=w*.105)
    image(path, x+inset, top+17, w-inset*2, h-20.5, radius=w*.08)
    rect(x+w*.36, top+7, w*.28, 4, INK, radius=2)
    return h


# PAGE ONE: one consistent grid for the headline, product and benefits.
rect(0, 0, W, H)
rect(0, 84, W, 541, HexColor("#FFF8F2"))
header(1)
text("ONE PLATFORM. EVERY PART OF YOUR ACADEMY.", M, 106, 8, ORANGE, True)
text("Teach more.<br/><font color='#C2410C'>Manage less.</font>", M, 126,
     42, INK, True, CW, 45)
text("Live classes, admissions, fees and parent updates.<br/>Bring the work behind every lesson into one place.",
     M, 226, 11, MUTED, width=CW, leading=16)

# Preserve the complete artwork: no cropping of device edges.
hero_top, hero_height = 274, CW * 2 / 3
rect(M, hero_top+3, CW, hero_height, HexColor("#EEDCCE"), radius=15)
image("product/hero-classroom-v2.webp", M, hero_top, CW, hero_height, radius=15, contain=True)
text("Illustrative classroom and parent app. Sample names and data.",
     M, 627, 6.8, MUTED, width=CW)

colw = (CW-28)/3
cards = [
    ("video", "Teach live", "Video, whiteboard, quizzes, activities and recordings."),
    ("calendar", "Manage daily", "Admissions, schedules, attendance and fee collection."),
    ("phone", "Connect parents", "Classes, payments, resources and progress in one app."),
]
for i, (kind, title, body) in enumerate(cards):
    x = M+i*(colw+14)
    icon(kind, x, 650)
    text(title, x+35, 655, 10.5, INK, True, colw-35, 13)
    text(body, x, 686, 9, MUTED, width=colw, leading=13)

rule(737)
text("Built around the way you teach.", M, 753, 11, INK, True, 286)
text("Free 30-minute walkthrough. No payment details.", M, 774, 8, MUTED, width=286)
button("Book a free walkthrough", W-M-191, 751, 191, 39)
c.showPage()

# PAGE TWO: aligned columns, aligned devices and a clearer contact block.
header(2)
text("FROM FIRST ENQUIRY TO EVERYDAY LEARNING", M, 106, 8, ORANGE, True)
text("One journey.<br/><font color='#C2410C'>Every detail connected.</font>", M, 126, 32, INK, True, CW, 37)
text("Support your team and your families, before, during and after class.",
     M, 209, 10.5, MUTED, width=CW, leading=16)

leftw, gutter = 245, 24
px = M+leftw+gutter
pw = W-M-px
text("FOR YOUR ACADEMY", M, 249, 7.5, ORANGE, True, leftw)
text("FOR YOUR FAMILIES", px, 249, 7.5, ORANGE, True, pw)
rule(270, M, leftw)
rule(270, px, pw)

steps = [
    ("Welcome the next learner", "Organise enquiries, schedule demos and keep enrolment details together."),
    ("Plan the class", "Coordinate batches, teachers and sessions from one workspace."),
    ("Teach and share", "Run interactive lessons. Share worksheets and recordings available with your plan."),
    ("Keep fees on track", "Manage invoices, online payments, instalments and payment reminders."),
]
for i, (title, body) in enumerate(steps):
    top = 291+i*68
    if i < 3:
        c.setStrokeColor(LINE); c.setLineWidth(1); c.line(M+11, H-top-22, M+11, H-top-68)
    rect(M, top, 22, 22, PEACH, radius=11)
    text(str(i+1).zfill(2), M, top+5, 7, ORANGE, True, 22, 9, TA_CENTER)
    text(title, M+34, top, 10.5, INK, True, leftw-34, 14)
    text(body, M+34, top+22, 9, MUTED, width=leftw-34, leading=13)

text("Join. Pay. Follow progress.", px, 291, 11, INK, True, pw, 15)
text("A parent app for every family.", px, 313, 9, MUTED, width=pw)
rect(px, 339, pw, 232, PEACH, stroke=LINE, radius=14)
phone_w = 87
phone_gap = 12
phone_left = px+(pw-phone_w*2-phone_gap)/2
phone_top = 353
phone_h = phone("product/app-home-390.webp", phone_left, phone_top, phone_w)
phone("product/app-fees-390.webp", phone_left+phone_w+phone_gap, phone_top, phone_w)
text("Home", phone_left, phone_top+phone_h+8, 7, MUTED, width=phone_w, align=TA_CENTER)
text("Fees", phone_left+phone_w+phone_gap, phone_top+phone_h+8, 7, MUTED, width=phone_w, align=TA_CENTER)
text("Parent app screens with sample data.", px, 579, 6.8, MUTED, width=pw, align=TA_CENTER)

rule(606)
text("FOR TUITION, PHONICS, ABACUS, LANGUAGES AND ARTS", M, 621, 7.5, ORANGE, True, CW)
text("Part of the teaching community", M, 641, 12, INK, True, CW)
text("Used by coaching centres including", M, 664, 9, MUTED, width=225)
image("clients/thereader.png", M+245, 657, 31, 31, contain=True)
text("The Reader Nest", M+284, 667, 8.5, INK, True, 111)
image("clients/alphabet.webp", W-M-114, 654, 114, 37, contain=True)
c.linkURL(SITE+"/customers/the-reader-nest", (M+241, H-695, M+396, H-651), relative=0, thickness=0)
c.linkURL(SITE+"/customers/alphabet", (W-M-117, H-695, W-M, H-651), relative=0, thickness=0)

rect(M, 712, CW, 91, ORANGE, radius=14)
text("Let's talk about your academy.", M+17, 724, 17, white, True, 365, 22)
text("meettomanage.cloud/get-started", M+17, 752, 9.5, white, True, 360)
text("WhatsApp  +91 93447 73231", M+17, 773, 8.5, HexColor("#FFE6D3"), width=181)
text("info@infinityuniquers.com", M+202, 773, 8.5, HexColor("#FFE6D3"), width=197)
c.linkURL(BOOK, (M+14, H-767, M+387, H-720), relative=0, thickness=0)
c.linkURL("https://wa.me/919344773231", (M+14, H-794, M+194, H-770), relative=0, thickness=0)
c.linkURL("mailto:info@infinityuniquers.com", (M+199, H-794, M+396, H-770), relative=0, thickness=0)

# Short destination reduces QR density; quiet zone is four modules.
qr_url = SITE+"/get-started"
qr = QrCodeWidget(qr_url)
qr.barWidth = qr.barHeight = 66
qr.barBorder = 4
draw = Drawing(66, 66)
draw.add(qr)
qx, qt = W-M-79, 723
rect(qx, qt, 66, 66, white, radius=4)
renderPDF.draw(draw, c, qx, H-qt-66)
c.linkURL(qr_url, (qx, H-qt-66, qx+66, H-qt), relative=0, thickness=0)
text("SCAN TO BOOK", qx-3, 792, 5.5, white, True, 72, 7, TA_CENTER)
c.save()

# Check paragraph geometry during generation.
for item in LAYOUT:
    if item["top"]+item["height"] > H-8 or item["x"]+item["width"] > W+1:
        raise RuntimeError(f"Text outside page: {item}")
print(PDF)
