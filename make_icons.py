"""
Uygulama ikonlarını oluşturur.
Çalıştırmak için: python3 make_icons.py
Gereklilik: pip install pillow
"""
from PIL import Image, ImageDraw, ImageFont
import os

def make_icon(size, path, bg="#534AB7", radius_ratio=0.2):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    r = int(size * radius_ratio)
    draw.rounded_rectangle([(0, 0), (size-1, size-1)], radius=r, fill=bg)
    # Müzik notası çiz
    cx, cy = size // 2, size // 2
    note_size = int(size * 0.45)
    # Oval (nota başı)
    ow, oh = int(note_size * 0.5), int(note_size * 0.35)
    ox = cx - int(note_size * 0.1)
    oy = cy + int(note_size * 0.15)
    draw.ellipse([(ox - ow//2, oy - oh//2), (ox + ow//2, oy + oh//2)], fill="white")
    # Kuyruk
    sx = ox + ow//2 - 2
    draw.rectangle([(sx, oy - oh//2 - note_size//2), (sx + max(3, size//40), oy - oh//2)], fill="white")
    # Bayrak
    draw.line([(sx + max(3, size//40), oy - oh//2 - note_size//2),
               (sx + max(3, size//40) + note_size//3, oy - oh//2 - note_size//3)], fill="white", width=max(2, size//40))
    img.save(path)
    print(f"✓ {path} ({size}x{size})")

os.makedirs("assets", exist_ok=True)
make_icon(1024, "assets/icon.png")
make_icon(1024, "assets/adaptive-icon.png", bg="#534AB7", radius_ratio=0)
make_icon(1024, "assets/splash.png", bg="#FAFAF9")
make_icon(32,   "assets/favicon.png")
print("\nİkonlar hazır! Şimdi: npm install && npx expo start")
