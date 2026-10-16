"""產生網站圖示（site/icons/）。需要 Pillow，只在開發電腦執行一次：python3 scripts/make_icons.py
圖案：深藍底＋白色四角星（小精靈的光點）。改圖示就改這支再重跑。"""
from pathlib import Path

from PIL import Image, ImageDraw

ACCENT = (2, 84, 166)
OUT = Path(__file__).resolve().parent.parent / "site" / "icons"


def star(cx, cy, r, inner):
    pts = []
    for i in range(8):
        rr = r if i % 2 == 0 else inner
        dx, dy = [(0, -1), (0.7071, -0.7071), (1, 0), (0.7071, 0.7071),
                  (0, 1), (-0.7071, 0.7071), (-1, 0), (-0.7071, -0.7071)][i]
        pts.append((cx + dx * rr, cy + dy * rr))
    return pts


def draw(size, scale):
    big = size * 4  # 先畫大再縮小，邊緣比較平滑
    img = Image.new("RGB", (big, big), ACCENT)
    d = ImageDraw.Draw(img)
    c = big / 2
    d.polygon(star(c - big * 0.06 * scale, c + big * 0.04 * scale, big * 0.30 * scale, big * 0.07 * scale), fill="white")
    d.polygon(star(c + big * 0.22 * scale, c - big * 0.22 * scale, big * 0.11 * scale, big * 0.03 * scale), fill="white")
    return img.resize((size, size), Image.LANCZOS)


SVG = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
<rect width="100" height="100" fill="#0254A6"/>
<polygon fill="#fff" points="{a}"/>
<polygon fill="#fff" points="{b}"/>
</svg>
"""

if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    draw(192, 1).save(OUT / "icon-192.png")
    draw(512, 1).save(OUT / "icon-512.png")
    draw(512, 0.75).save(OUT / "icon-maskable-512.png")  # 圖案縮進安全區，給會裁成圓形的手機用
    fmt = lambda pts: " ".join(f"{x:.1f},{y:.1f}" for x, y in pts)
    (OUT / "icon.svg").write_text(SVG.format(a=fmt(star(44, 54, 30, 7)), b=fmt(star(72, 28, 11, 3))), encoding="utf-8")
    print("已產生", sorted(p.name for p in OUT.iterdir()))
