from pathlib import Path
import sys
from PIL import Image, ImageDraw

folder = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(
    "/Users/fernandoliernur/Projects/nutrisoft/docs/master-style-render"
)
pages = sorted(folder.glob("page-*.png"), key=lambda p: int(p.stem.split("-")[1]))
thumb_w, thumb_h = 340, 440
cols, rows, gap, label_h = 3, 3, 18, 24

for start in range(0, len(pages), cols * rows):
    batch = pages[start:start + cols * rows]
    sheet = Image.new("RGB", (cols * (thumb_w + gap) + gap, rows * (thumb_h + label_h + gap) + gap), "#DCE5E8")
    draw = ImageDraw.Draw(sheet)
    for i, path in enumerate(batch):
        image = Image.open(path).convert("RGB")
        image.thumbnail((thumb_w, thumb_h))
        x = gap + (i % cols) * (thumb_w + gap) + (thumb_w - image.width) // 2
        y = gap + (i // cols) * (thumb_h + label_h + gap)
        sheet.paste(image, (x, y + label_h))
        draw.text((x, y + 3), path.stem, fill="#15304A")
    output = folder / f"contact-{start // (cols * rows) + 1}.png"
    sheet.save(output)
    print(output)
