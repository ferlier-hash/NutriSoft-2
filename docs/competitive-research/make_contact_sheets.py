from pathlib import Path
from PIL import Image, ImageDraw


folder = Path("/Users/fernandoliernur/Projects/nutrisoft/docs/competitive-research/rendered-v2")
pages = sorted(folder.glob("page-*.png"), key=lambda p: int(p.stem.split("-")[1]))
thumb_w, thumb_h = 340, 440
cols, rows = 3, 3
gap, label_h = 18, 24

for batch_index in range(0, len(pages), cols * rows):
    batch = pages[batch_index:batch_index + cols * rows]
    sheet = Image.new("RGB", (cols * (thumb_w + gap) + gap, rows * (thumb_h + label_h + gap) + gap), "#d9e1e8")
    draw = ImageDraw.Draw(sheet)
    for i, path in enumerate(batch):
        img = Image.open(path).convert("RGB")
        img.thumbnail((thumb_w, thumb_h))
        x = gap + (i % cols) * (thumb_w + gap) + (thumb_w - img.width) // 2
        y = gap + (i // cols) * (thumb_h + label_h + gap)
        sheet.paste(img, (x, y + label_h))
        draw.text((x, y + 3), path.stem, fill="#15304a")
    out = folder / f"contact-{batch_index // (cols * rows) + 1}.png"
    sheet.save(out)
    print(out)
