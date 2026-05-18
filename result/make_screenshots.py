"""
Re-run Jest for each service capturing ANSI output, then render to PNG.
Pattern-based colorization (works even without raw ANSI codes).
"""
import os
import re
import subprocess
import sys
from PIL import Image, ImageDraw, ImageFont

# ─── Visual Config ────────────────────────────────────────────────────────────
BG            = (13, 17, 23)
TITLE_BAR     = (22, 27, 34)
FG_DEFAULT    = (201, 209, 217)
FG_GREEN      = ( 63, 185, 80)
FG_RED        = (248,  81,  73)
FG_YELLOW     = (210, 153,  34)
FG_CYAN       = ( 56, 189, 248)
FG_GREY       = (110, 118, 125)
FG_BOLD_WHITE = (240, 246, 252)
FG_MAGENTA    = (188,  86, 188)

PADDING_X  = 32
PADDING_Y  = 32
LINE_H     = 21
FONT_SIZE  = 14
MIN_WIDTH  = 920
TITLE_H    = 38


# ─── ANSI escape code parser ──────────────────────────────────────────────────
ANSI_RE = re.compile(r'\x1b\[([0-9;]*)m')
ANSI_COLORS = {
    "30": (100,100,100), "31": FG_RED,       "32": FG_GREEN,
    "33": FG_YELLOW,     "34": ( 88,166,255),"35": FG_MAGENTA,
    "36": FG_CYAN,       "37": FG_DEFAULT,   "90": FG_GREY,
    "91": (255,100,100), "92": ( 87,227,137),"93": (255,220,100),
    "94": (130,180,255), "95": (210,120,240),"96": ( 87,210,240),
    "97": FG_BOLD_WHITE,
}

def parse_ansi(line: str):
    """Parse ANSI escape sequences. Returns list of (text, color)."""
    segments, cur, pos = [], FG_DEFAULT, 0
    for m in ANSI_RE.finditer(line):
        if m.start() > pos:
            segments.append((line[pos:m.start()], cur))
        codes = m.group(1).split(";") if m.group(1) else ["0"]
        for c in codes:
            if c in ("0", ""):
                cur = FG_DEFAULT
            elif c in ANSI_COLORS:
                cur = ANSI_COLORS[c]
        pos = m.end()
    if pos < len(line):
        segments.append((line[pos:], cur))
    return segments or [(line, FG_DEFAULT)]

# Strip leftover [Xm artifacts (ESC was dropped during capture/decode)
_ANSI_ARTIFACT_RE = re.compile(r'\[[0-9;]*m')

def clean_line(line: str) -> str:
    """Remove raw ESC chars and leftover [Xm tokens that lost their ESC."""
    # First pass: remove proper ANSI sequences
    cleaned = ANSI_RE.sub('', line)
    # Second pass: remove orphan [Xm tokens (ESC was dropped)
    cleaned = _ANSI_ARTIFACT_RE.sub('', cleaned)
    # Remove bare ESC chars
    cleaned = cleaned.replace('\x1b', '')
    return cleaned

def has_ansi(text: str) -> bool:
    return '\x1b[' in text

def colorize_plain(line: str):
    """Intelligent colorization for plain (non-ANSI) Jest output lines."""
    stripped = line.rstrip()
    stripped_l = line.lstrip()

    # Summary lines
    if stripped_l.startswith(("PASS ", "√ PASS", "✓ PASS", "\u2713 PASS", "\u221a PASS")):
        return [(stripped, FG_GREEN)]
    if stripped_l.startswith(("FAIL ", "\u2715 FAIL", "✕ FAIL", "\u2717 FAIL")):
        return [(stripped, FG_RED)]

    # Individual test check marks
    if re.match(r'\s+(√|✓|\u2713|\u221a)\s+', line):
        return [(stripped, FG_GREEN)]
    if re.match(r'\s+(\u2715|✕|\u2717|×)\s+', line):
        return [(stripped, FG_RED)]

    # Bullet failure block
    if re.match(r'\s+●\s+', line):
        return [(stripped, FG_RED)]

    # Summary stats
    m = re.match(r'^(Test Suites:|Tests:|Snapshots:|Time:)\s*(.*)', stripped)
    if m:
        label = m.group(1)
        rest  = m.group(2)
        segs  = [(label + "  ", FG_BOLD_WHITE)]
        for token in re.split(r'(\d+)', rest):
            if token.isdigit():
                segs.append((token, FG_YELLOW))
            elif "failed" in token:
                segs.append((token, FG_RED))
            elif "passed" in token or "skipped" in token:
                segs.append((token, FG_GREEN))
            else:
                segs.append((token, FG_DEFAULT))
        return segs

    # File path lines (grey)
    if re.search(r'[\\/](src|tests|testing|__tests__)[\\/]', line):
        return [(stripped, FG_GREY)]

    # Section headers  (describe blocks)
    if re.match(r'\s{4}[A-Z]', line) or re.match(r'\s{2}[A-Z]', line):
        return [(stripped, FG_CYAN)]

    # expect / received
    if "Expected:" in line:
        return [(stripped, FG_GREEN)]
    if "Received:" in line:
        return [(stripped, FG_RED)]

    # Timing / duration lines
    if re.match(r'\s+\(\d+\.?\d*\s*(ms|s)\)', line):
        return [(stripped, FG_GREY)]

    # Separator lines
    if re.match(r'^[-─=]+$', stripped.strip()):
        return [(stripped, FG_GREY)]

    # console output lines
    if "console." in line.lower():
        return [(stripped, FG_GREY)]

    return [(stripped, FG_DEFAULT)]


def parse_line(line: str):
    clean = clean_line(line)
    if has_ansi(line):
        segs = parse_ansi(line)
        return [(clean_line(t), c) for t, c in segs if clean_line(t)]
    return colorize_plain(clean)


# ─── Font helpers ─────────────────────────────────────────────────────────────
def load_font(size):
    for path in [
        "c:/Windows/Fonts/consola.ttf",
        "c:/Windows/Fonts/cour.ttf",
        "c:/Windows/Fonts/lucon.ttf",
        "c:/Windows/Fonts/courier.ttf",
    ]:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                pass
    return ImageFont.load_default()


# ─── Core renderer ────────────────────────────────────────────────────────────
def render_png(lines: list[str], service_name: str, out_path: str):
    # ── filter noise lines ───────────────────────────────────────────────────
    NOISE = [
        re.compile(r'\(node:\d+\).*\[MONGOOSE\]'),
        re.compile(r'Use `node --trace-warnings'),
    ]
    lines = [ln for ln in lines if not any(p.search(ln) for p in NOISE)]
    # Remove trailing blank lines
    while lines and not lines[-1].strip():
        lines.pop()

    # Smart crop: keep top (file-level PASS/FAIL) + tail (summary)
    # to avoid gigantic images for services with many tests
    MAX_LINES = 120
    if len(lines) > MAX_LINES:
        head = lines[:40]
        tail = lines[-50:]
        omitted = len(lines) - len(head) - len(tail)
        sep = [f"", f"  ... {omitted} lines omitted (individual test results) ...", ""]
        lines = head + sep + tail
    font = load_font(FONT_SIZE)
    dummy = Image.new("RGB", (1, 1))
    dd = ImageDraw.Draw(dummy)
    def w(txt): return dd.textbbox((0,0),txt,font=font)[2]

    max_w = MIN_WIDTH
    parsed = []
    for line in lines:
        segs = parse_line(line)
        plain = "".join(t for t,_ in segs)
        max_w = max(max_w, w(plain))
        parsed.append(segs)

    img_w = max_w + PADDING_X * 2
    img_h = TITLE_H + PADDING_Y * 2 + len(parsed) * LINE_H

    img  = Image.new("RGB", (img_w, img_h), BG)
    draw = ImageDraw.Draw(img)

    # title bar
    draw.rectangle([(0,0),(img_w, TITLE_H)], fill=TITLE_BAR)
    for cx, col in [(20,FG_RED),(38,(210,153,34)),(56,FG_GREEN)]:
        draw.ellipse([(cx-8,TITLE_H//2-8),(cx+8,TITLE_H//2+8)], fill=col)
    fw = w(service_name)
    tfont = load_font(FONT_SIZE - 1)
    draw.text((img_w//2 - fw//2, 10), service_name, font=tfont, fill=FG_GREY)

    y = TITLE_H + PADDING_Y
    for segs in parsed:
        x = PADDING_X
        for text, color in segs:
            if not text:
                continue
            draw.text((x, y), text, font=font, fill=color)
            x += w(text)
        y += LINE_H

    img.save(out_path, "PNG", optimize=True)
    return img_w, img_h


# ─── Test runner ─────────────────────────────────────────────────────────────
SERVICES = [
    "auth-service", "billing-service", "cloud-media-service",
    "exam-service", "lesson-service", "listening-service",
    "notification-service", "payment-service", "reading-service",
    "speaking-service", "writing-service",
]

def run_jest(svc_dir: str) -> str:
    jest_cmd = os.path.join(svc_dir, "node_modules", ".bin", "jest.cmd")
    if not os.path.exists(jest_cmd):
        # fallback: use npx
        cmd_parts = ["npx", "jest", "--forceExit", "--no-coverage", "--colors"]
    else:
        cmd_parts = [jest_cmd, "--forceExit", "--no-coverage", "--colors"]

    env = os.environ.copy()
    env["FORCE_COLOR"] = "1"
    env["TERM"] = "xterm-256color"
    result = subprocess.run(
        cmd_parts,
        cwd=svc_dir,
        capture_output=True,           # raw bytes — preserves ESC (0x1B)
        env=env,
        timeout=300,
    )
    raw = result.stdout + result.stderr
    return raw.decode("utf-8", errors="replace")


def txt_from_file(txt_path: str) -> list[str]:
    """Fall back to existing txt file if re-run fails."""
    with open(txt_path, encoding="utf-8", errors="replace") as f:
        return f.read().splitlines()


# ─── Entry point ─────────────────────────────────────────────────────────────
if __name__ == "__main__":
    script_dir  = os.path.dirname(os.path.abspath(__file__))
    be_dir      = os.path.normpath(os.path.join(script_dir, "..", "ielts", "be"))
    shots_dir   = os.path.join(script_dir, "screenshots")
    os.makedirs(shots_dir, exist_ok=True)

    print(f"Output dir : {shots_dir}\n{'─'*60}")
    for svc in SERVICES:
        svc_dir  = os.path.join(be_dir, svc)
        png_out  = os.path.join(shots_dir, f"{svc}-test.png")
        txt_path = os.path.join(script_dir, f"{svc}-test.txt")

        print(f"[{svc}]  ", end="", flush=True)
        if os.path.isdir(svc_dir):
            try:
                raw = run_jest(svc_dir)
                lines = raw.splitlines()
                print(f"ran  ({len(lines)} lines) → ", end="", flush=True)
            except Exception as e:
                print(f"run failed ({e}), using txt → ", end="", flush=True)
                lines = txt_from_file(txt_path) if os.path.exists(txt_path) else [str(e)]
        elif os.path.exists(txt_path):
            lines = txt_from_file(txt_path)
            print(f"txt fallback ({len(lines)} lines) → ", end="", flush=True)
        else:
            print("SKIP (not found)")
            continue

        iw, ih = render_png(lines, svc, png_out)
        print(f"PNG {iw}×{ih}  ✓")

    print(f"\n{'─'*60}\nAll screenshots saved to: {shots_dir}")
