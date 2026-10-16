"""Makes every picture the site serves from one source, art/desk-source.jpg.

    python3 tools/make_images.py

Writes into static/:
  img/avatar-{192,288}.{webp,jpg}   the clay me in the headline (a crop with room
                                    around the head, so no pose touches the edge)
  img/desk-{640,1000}.{webp,jpg}    the whole desk scene, for the 404 page
  img/social-card.jpg               the 1200 x 630 link preview (X, LinkedIn, Slack…)
  favicon.ico (16/32/48), apple-touch-icon.png (180), icon-192.png, icon-512.png

Needs Pillow and the Noto Sans fonts (Ubuntu: fonts-noto-core). Run it again
after changing the source picture or the card's words; the output is the same
every time for the same inputs.
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "art" / "desk-source.jpg"
STATIC = ROOT / "static"
FONTS = Path("/usr/share/fonts/truetype/noto")

# The page's own colours (static/style.css, light theme).
BG = (253, 253, 252)  # --bg #fdfdfc
TEXT = (31, 35, 40)  # --text #1f2328
MUTED = (101, 109, 118)  # --muted #656d76
LINE = (229, 231, 235)  # --line #e5e7eb
ACCENT = (183, 65, 14)  # --accent #b7410e (rust)
BLUE, VIOLET, PINK, AMBER = (37, 99, 235), (124, 58, 237), (190, 24, 93), (180, 83, 9)
RAINBOW = [BLUE, VIOLET, PINK, ACCENT, AMBER]  # --rainbow, the top line
BREAK = [VIOLET, PINK, ACCENT]  # the gradient word in the headline

# The avatar: a square crop of the source with room around the head. The
# plant's leaves (x 165-275, y 380-740: only leaves and background there; the
# person starts at x 300, the mug at y 745) would peek into the circle when
# the face turns, so that patch becomes the plain background.
AVATAR_CROP = (165, 40, 800)  # left, top, size
LEAF_PATCH = (165, 380, 275, 740)
PHOTO_BG = (253, 253, 253)  # the source picture's background
# The favicon at 16-48 px needs the face larger: a tighter crop.
ICON_CROP = (290, 95, 560)


def save_pair(image, stem, webp_quality, jpeg_quality):
    image.save(STATIC / "img" / f"{stem}.webp", "WEBP", quality=webp_quality, method=6)
    image.save(STATIC / "img" / f"{stem}.jpg", "JPEG", quality=jpeg_quality, optimize=True, progressive=True)


def crop(image, spec):
    left, top, size = spec
    return image.crop((left, top, left + size, top + size))


def gradient(width, height, stops):
    """A left-to-right gradient through `stops`, evenly spaced."""
    strip = Image.new("RGB", (width, 1))
    px = strip.load()
    for x in range(width):
        t = x / max(width - 1, 1) * (len(stops) - 1)
        i = min(int(t), len(stops) - 2)
        f = t - i
        a, b = stops[i], stops[i + 1]
        px[x, 0] = tuple(round(a[c] + (b[c] - a[c]) * f) for c in range(3))
    return strip.resize((width, height))


def round_icon(face, size):
    """The face in a circle on a transparent square, smooth-edged (drawn at
    4x, then scaled down)."""
    big = size * 4
    face = face.resize((big, big), Image.LANCZOS).convert("RGBA")
    mask = Image.new("L", (big, big), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, big - 1, big - 1), fill=255)
    face.putalpha(mask)
    return face.resize((size, size), Image.LANCZOS)


def social_card(source):
    W, H = 1200, 630
    card = Image.new("RGB", (W, H), BG)
    card.paste(gradient(W, 6, RAINBOW), (0, 0))
    # The desk scene on the right, framed like a photo.
    side = 510
    x0, y0 = W - 60 - side, (H - side) // 2 + 3
    scene = source.resize((side, side), Image.LANCZOS)
    mask = Image.new("L", (side, side), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, side - 1, side - 1), radius=26, fill=255)
    frame = ImageDraw.Draw(card)
    frame.rounded_rectangle((x0 - 1, y0 - 1, x0 + side, y0 + side), radius=27, outline=LINE, width=1)
    card.paste(scene, (x0, y0), mask)
    # The words on the left.
    mono = ImageFont.truetype(str(FONTS / "NotoSansMono-Bold.ttf"), 34)
    bold = ImageFont.truetype(str(FONTS / "NotoSans-Bold.ttf"), 78)
    regular = ImageFont.truetype(str(FONTS / "NotoSans-Regular.ttf"), 29)
    left = 72
    draw = ImageDraw.Draw(card)
    draw.text((left, 92), "~/", font=mono, fill=ACCENT)
    draw.text((left + draw.textlength("~/", font=mono), 92), "404human", font=mono, fill=TEXT)
    # "hey, I break" / "things." with "break" in the gradient.
    y = 168
    draw.text((left, y), "hey, I ", font=bold, fill=TEXT)
    bx = left + round(draw.textlength("hey, I ", font=bold))
    word = "break"
    wb = draw.textbbox((0, 0), word, font=bold)
    ww, wh = wb[2], wb[3]
    word_mask = Image.new("L", (ww, wh), 0)
    ImageDraw.Draw(word_mask).text((0, 0), word, font=bold, fill=255)
    card.paste(gradient(ww, wh, BREAK), (bx, y), word_mask)
    draw.text((left, y + 92), "things.", font=bold, fill=TEXT)
    # The site's description, wrapped to the column.
    words = ("Building Rust runtimes, reliable background jobs, and AI infrastructure. "
             "Sharing the experiments, failures, and releases.").split()
    column = x0 - 48 - left
    lines, line = [], ""
    for w in words:
        trial = f"{line} {w}".strip()
        if draw.textlength(trial, font=regular) <= column:
            line = trial
        else:
            lines.append(line)
            line = w
    lines.append(line)
    for n, text in enumerate(lines):
        draw.text((left, 400 + n * 42), text, font=regular, fill=MUTED)
    return card


def main():
    source = Image.open(SOURCE).convert("RGB")
    (STATIC / "img").mkdir(parents=True, exist_ok=True)

    retouched = source.copy()
    retouched.paste(PHOTO_BG, LEAF_PATCH)
    avatar = crop(retouched, AVATAR_CROP)
    for px in (192, 288):
        save_pair(avatar.resize((px, px), Image.LANCZOS), f"avatar-{px}", 82, 84)
    for px in (640, 1000):
        save_pair(source.resize((px, px), Image.LANCZOS), f"desk-{px}", 80, 82)

    social_card(source).save(STATIC / "img" / "social-card.jpg", "JPEG", quality=86, optimize=True, progressive=True)

    face = crop(retouched, ICON_CROP)
    sizes = [16, 32, 48]
    icons = [round_icon(face, s) for s in sizes]
    icons[-1].save(STATIC / "favicon.ico", sizes=[(s, s) for s in sizes], append_images=icons[:-1])
    # The home-screen icon is opaque (iOS draws its own rounded corners).
    face.resize((180, 180), Image.LANCZOS).save(STATIC / "apple-touch-icon.png", optimize=True)
    for s in (192, 512):
        round_icon(face, s).save(STATIC / f"icon-{s}.png", optimize=True)

    for f in sorted([*(STATIC / "img").iterdir(), *STATIC.glob("*.png"), STATIC / "favicon.ico"]):
        print(f"{f.relative_to(ROOT)}\t{f.stat().st_size}")


if __name__ == "__main__":
    main()
