import random
from PIL import Image

metadata = {
    "name": "noise",
    "label": "Шум",
    "description": "Добавление шума к изображению с заданной интенсивностью.",
    "params": [
        {"name": "intensity", "type": "slider", "label": "Интенсивность", "min": 0, "max": 100, "default": 0}
    ]
}

def apply(image: Image.Image, intensity: int = 0) -> Image.Image:
    if image.mode != "RGB":
        image = image.convert("RGB")

    pixels = image.load()
    width, height = image.size

    factor = intensity / 100 * 64

    for y in range(height):
        for x in range(width):
            r, g, b = pixels[x, y]
            r = min(255, max(0, r + random.randint(-int(factor), int(factor))))
            g = min(255, max(0, g + random.randint(-int(factor), int(factor))))
            b = min(255, max(0, b + random.randint(-int(factor), int(factor))))
            pixels[x, y] = (r, g, b)

    return image