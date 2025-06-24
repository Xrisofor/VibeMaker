from PIL import Image

metadata = {
    "name": "image_overlay",
    "label": "Наложение изображения",
    "params": [
        {"name": "overlay_path", "type": "file", "label": "Загрузить изображение", "default": ""},
        {"name": "x", "type": "slider", "label": "X", "min": 0, "max": 1080, "default": 0},
        {"name": "y", "type": "slider", "label": "Y", "min": 0, "max": 1080, "default": 0},
        {"name": "scale", "type": "slider", "label": "Масштаб (%)", "min": 10, "max": 200, "default": 100}
    ]
}

def apply(image: Image.Image, overlay_path="", x=40, y=40, scale=100) -> Image.Image:
    if not overlay_path:
        return image

    try:
        overlay = Image.open(overlay_path).convert("RGBA")
    except Exception as e:
        print(f"Ошибка загрузки оверлея: {e}")
        return image

    scale_factor = scale / 100
    new_width = int(overlay.width * scale_factor)
    new_height = int(overlay.height * scale_factor)
    overlay = overlay.resize((new_width, new_height), Image.LANCZOS)

    base = image.convert("RGBA")
    base.paste(overlay, (x, y), overlay)

    return base.convert("RGB")