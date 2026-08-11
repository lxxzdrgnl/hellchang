#!/usr/bin/env python3
"""
앱 아이콘(굽힌 팔)을 웹이 요구하는 모든 크기로 굽는다.

SVG 하나를 여러 도구로 변환하면 렌더러마다 스트로크 끝이 미묘하게 달라진다.
도형이 선 두 개와 원 두 개뿐이라 여기서 직접 그리고, 4배로 그린 뒤 줄여
가장자리를 깎는다.

    python3 scripts/build-icons.py
"""
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public"
APP = ROOT / "app"

BG = (11, 13, 12, 255)       # --bg  #0b0d0c
ACCENT = (74, 222, 128, 255)  # --accent #4ade80

SS = 4  # 슈퍼샘플링 배수


def draw_arm(size: int, *, radius_ratio: float, scale: float, bg: tuple | None) -> Image.Image:
    """96 좌표계로 그린 뒤 size 로 스케일한다. app/icon.svg 와 같은 좌표다."""
    S = size * SS
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    if bg:
        r = int(S * radius_ratio)
        d.rounded_rectangle([0, 0, S - 1, S - 1], radius=r, fill=bg)

    # 96 단위 좌표 → 픽셀. scale 은 마스커블 안전영역용 축소.
    c = S / 2

    def px(v: float) -> float:
        return c + (v - 48) * (S / 96) * scale

    def w(v: float) -> float:
        return v * (S / 96) * scale

    stroke = w(17)

    def bar(x1, y1, x2, y2):
        """라운드 캡 선 — 사각형 하나와 양 끝 원."""
        half = stroke / 2
        d.rectangle([px(x1), px(y1) - half, px(x2), px(y2) + half] if y1 == y2
                    else [px(x1) - half, px(y1), px(x2) + half, px(y2)], fill=ACCENT)
        for x, y in ((x1, y1), (x2, y2)):
            d.ellipse([px(x) - half, px(y) - half, px(x) + half, px(y) + half], fill=ACCENT)

    bar(20, 65, 55, 65)   # 위팔
    bar(56, 33, 56, 64)   # 아래팔
    circle(d, px(40), px(50), w(13))  # 이두
    circle(d, px(56), px(28), w(11))  # 주먹

    return img.resize((size, size), Image.LANCZOS)


def circle(d: ImageDraw.ImageDraw, cx: float, cy: float, r: float) -> None:
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=ACCENT)


def save(img: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path)
    print(f"  {path.relative_to(ROOT)}  {img.size[0]}×{img.size[1]}")


def main() -> None:
    print("아이콘을 굽는다")

    # PWA 설치용. 안드로이드는 SVG 만 있으면 설치 배너를 안 띄우는 경우가 있다.
    for size in (192, 512):
        save(draw_arm(size, radius_ratio=0.22, scale=1.0, bg=BG), PUBLIC / f"icon-{size}.png")

    # 마스커블은 어떤 모양으로 잘려도 살아남아야 한다 — 안전영역(중앙 80%)에 담는다.
    for size in (192, 512):
        save(draw_arm(size, radius_ratio=0.0, scale=0.72, bg=BG), PUBLIC / f"icon-maskable-{size}.png")

    # iOS 홈 화면. 시스템이 알아서 둥글리므로 우리는 사각으로 준다.
    save(draw_arm(180, radius_ratio=0.0, scale=1.0, bg=BG), APP / "apple-icon.png")

    # 구형 브라우저와 북마크 바.
    ico = draw_arm(64, radius_ratio=0.22, scale=1.0, bg=BG)
    ico.save(APP / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
    print(f"  app/favicon.ico  16·32·48·64")

    # 소셜 카드. 링크를 공유하면 이 그림이 뜬다.
    og = Image.new("RGBA", (1200, 630), BG)
    mark = draw_arm(300, radius_ratio=0.0, scale=1.0, bg=None)
    og.alpha_composite(mark, (110, 165))
    d = ImageDraw.Draw(og)
    d.rectangle([110, 520, 110 + 300, 528], fill=ACCENT)
    save(og.convert("RGB"), PUBLIC / "og.png")


if __name__ == "__main__":
    main()
