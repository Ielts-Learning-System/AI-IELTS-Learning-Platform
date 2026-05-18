"""
Convert Jest test result .txt files to terminal-style PNG screenshots.
Supports basic ANSI color codes from Jest output.
"""
import os
import re
import sys
from PIL import Image, ImageDraw, ImageFont

# ─── Config ───────────────────────────────────────────────────────────────────
BG_COLOR        = (13, 17, 23)        # GitHub Dark background
DEFAULT_FG      = (230, 237, 243)     # default text
PADDING_X       = 28
PADDING_Y       = 28
LINE_HEIGHT     = 22
FONT_SIZE       = 15
MIN_WIDTH       = 900

# ANSI → RGB mapping (subset Jest uses)
ANSI_COLORS = {
    "30": (100, 100, 100),  # dark grey (dim)
    "31": (255,  85,  85),  # red   → FAIL
    "32": ( 80, 200, 120),  # green → PASS
    "33": (255, 198,  77),  # yellow
    "34": (100, 149, 237),  # blue
    "35": (180, 120, 220),  # magenta
    "36": ( 86, 182, 194),  # cyan
    "37": (230, 237, 243),  # white
    "90": (100, 100, 100),  # bright black / grey
    "91": (255, 100, 100),  # bright red
    "92": (100, 220, 130),  # bright green
    "93": (255, 220, 100),  # bright yellow
    "94": (130, 165, 255),  # bright blue
    "95": (200, 140, 240),  # bright magenta
    "96": (100, 200, 220),  # bright cyan
    "97": (255, 255, 255),  # bright white
    "1":  None,             # bold — handled by weight, not color
    "0":  None,             # reset
}

ANSI_RE = re.compile(r'\x1b\[([0-9;]*)m')


def strip_and_parse(line: str):
    """
    Parse a line with possible ANSI escape codes.
    Returns list of (text_segment, rgb_color).
    """
    segments = []
    current_color = DEFAULT_FG
    pos = 0
    for m in ANSI_RE.finditer(line):
        if m.start() > pos:
            segments.append((line[pos:m.start()], current_color))
        codes = m.group(1).split(";") if m.group(1) else ["0"]
        for code in codes:
            if code == "0" or code == "":
                current_color = DEFAULT_FG
            elif code in ANSI_COLORS and ANSI_COLORS[code] is not None:
                current_color = ANSI_COLORS[code]
        pos = m.end()
    if pos < len(line):
        segments.append((line[pos:], current_color))
    return segments


def load_font(size):
    font_candidates = [
        "c:/Windows/Fonts/consola.ttf",        # Consolas
        "c:/Windows/Fonts/cour.ttf",           # Courier New
        "c:/Windows/Fonts/lucon.ttf",          # Lucida Console
        "c:/Windows/Fonts/DejaVuSansMono.ttf",
    ]
    for path in font_candidates:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                continue
    return ImageFont.load_default()


def txt_to_png(txt_path: str, png_path: str):
    with open(txt_path, "r", encoding="utf-8", errors="replace") as f:
        raw_lines = f.read().splitlines()

    # Remove totally blank trailing lines
    while raw_lines and raw_lines[-1].strip() == "":
        raw_lines.pop()

    font = load_font(FONT_SIZE)

    # ── measure max width ────────────────────────────────────────────────────
    dummy = Image.new("RGB", (1, 1))
    dd = ImageDraw.Draw(dummy)

    def measure(text):
        bbox = dd.textbbox((0, 0), text, font=font)
        return bbox[2] - bbox[0]

    max_line_px = MIN_WIDTH
    parsed_lines = []
    for raw in raw_lines:
        segs = strip_and_parse(raw)
        plain = "".join(t for t, _ in segs)
        w = measure(plain)
        if w > max_line_px:
            max_line_px = w
        parsed_lines.append(segs)

    img_w = max_line_px + PADDING_X * 2
    img_h = len(parsed_lines) * LINE_HEIGHT + PADDING_Y * 2 + 40  # +40 for title bar

    img = Image.new("RGB", (img_w, img_h), BG_COLOR)
    draw = ImageDraw.Draw(img)

    # ── title bar ────────────────────────────────────────────────────────────
    title_bar_color = (30, 38, 50)
    draw.rectangle([(0, 0), (img_w, 36)], fill=title_bar_color)
    # traffic lights
    for cx, col in [(18, (255, 95, 86)), (38, (255, 189, 46)), (58, (40, 200, 64))]:
        draw.ellipse([(cx - 7, 11), (cx + 7, 25)], fill=col)
    # title text
    svc_name = os.path.basename(txt_path).replace("-test.txt", "")
    title_font = load_font(FONT_SIZE - 1)
    draw.text((img_w // 2 - measure(svc_name) // 2, 9),
              svc_name, font=title_font, fill=(160, 175, 190))

    # ── render lines ─────────────────────────────────────────────────────────
    y = PADDING_Y + 40
    for segs in parsed_lines:
        x = PADDING_X
        for text, color in segs:
            if not text:
                continue
            draw.text((x, y), text, font=font, fill=color)
            x += measure(text)
        y += LINE_HEIGHT

    img.save(png_path, "PNG", optimize=True)
    print(f"  ✓  {os.path.basename(png_path)}  ({img_w}×{img_h})")


# ── Main ──────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    result_dir = os.path.dirname(os.path.abspath(__file__))
    screenshots_dir = os.path.join(result_dir, "screenshots")
    os.makedirs(screenshots_dir, exist_ok=True)

    txt_files = sorted(
        f for f in os.listdir(result_dir)
        if f.endswith("-test.txt")
    )

    if not txt_files:
        print("No *-test.txt files found in", result_dir)
        sys.exit(1)

    print(f"Converting {len(txt_files)} files → PNG screenshots\n")
    for fname in txt_files:
        src = os.path.join(result_dir, fname)
        dst = os.path.join(screenshots_dir, fname.replace(".txt", ".png"))
        txt_to_png(src, dst)

    print(f"\nDone — screenshots saved to: {screenshots_dir}")
