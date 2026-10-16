import os
from PIL import Image, ImageDraw, ImageFilter

def generate_sample_tshirt(output_path: str):
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    w, h = 1024, 1280
    # Create high-res 4x supersampled image for ultra-smooth anti-aliasing
    scale = 2
    sw, sh = w * scale, h * scale
    img = Image.new("RGBA", (sw, sh), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Keypoints scaled
    def pt(u, v):
        return (int(u * sw), int(v * sh))

    neck_l = pt(0.42, 0.08)
    neck_r = pt(0.58, 0.08)
    neck_b = pt(0.50, 0.16)

    sh_l = pt(0.24, 0.12)
    sh_r = pt(0.76, 0.12)

    sl_l_top = pt(0.06, 0.28)
    sl_l_bot = pt(0.18, 0.38)

    sl_r_top = pt(0.94, 0.28)
    sl_r_bot = pt(0.82, 0.38)

    armpit_l = pt(0.26, 0.36)
    armpit_r = pt(0.74, 0.36)

    hem_l = pt(0.28, 0.95)
    hem_r = pt(0.72, 0.95)
    hem_c = pt(0.50, 0.95)

    # Polygon outline points:
    # Start at right neck -> shoulder right -> sleeve right top -> sleeve right bot
    # -> armpit right -> hem right -> hem center -> hem left -> armpit left
    # -> sleeve left bot -> sleeve left top -> shoulder left -> neck left -> neck curve
    polygon = [
        neck_r,
        sh_r,
        sl_r_top,
        sl_r_bot,
        armpit_r,
        hem_r,
        hem_c,
        hem_l,
        armpit_l,
        sl_l_bot,
        sl_l_top,
        sh_l,
        neck_l,
    ]

    # Draw body base fill: rich dark charcoal (#1e2024)
    body_color = (30, 32, 36, 255)
    draw.polygon(polygon, fill=body_color)

    # Cut out neck curve with bezier/arc
    neck_box = [neck_l[0], neck_l[1] - int(0.04 * sh), neck_r[0], neck_b[1]]
    draw.chord(neck_box, start=0, end=180, fill=(0, 0, 0, 0))

    # Add subtle collar ribbing accent (#2d3139)
    draw.arc(neck_box, start=0, end=180, fill=(50, 54, 64, 255), width=int(14 * scale))

    # Add subtle fabric gradient highlights
    highlight = Image.new("RGBA", (sw, sh), (255, 255, 255, 0))
    h_draw = ImageDraw.Draw(highlight)
    # Subtle chest highlight
    chest_box = [int(0.38 * sw), int(0.22 * sh), int(0.62 * sw), int(0.48 * sh)]
    h_draw.ellipse(chest_box, fill=(255, 255, 255, 12))
    highlight = highlight.filter(ImageFilter.GaussianBlur(radius=30 * scale))

    # Composite highlight onto garment
    img = Image.alpha_composite(img, highlight)

    # Downsample with Lanczos for smooth subpixel edges
    final_img = img.resize((w, h), Image.Resampling.LANCZOS)
    final_img.save(output_path, "PNG")
    print(f"Generated sample t-shirt asset at: {output_path}")

if __name__ == "__main__":
    import sys
    out = sys.argv[1] if len(sys.argv) > 1 else "fixtures/garments/sample-tshirt.png"
    generate_sample_tshirt(out)
