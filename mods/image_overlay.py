from PIL import Image

metadata = {
    "name": "image_overlay",
    "label": "Наложение изображения",
    "description": "Наложение одного изображения на другое с возможностью настройки позиции и масштаба.",
    "params": [
        {"name": "overlay_path", "type": "file", "label": "Загрузить изображение", "accept": "image/*"},
        {"name": "x", "type": "slider", "label": "X", "min": -1, "max": 1080, "default": -1},
        {"name": "y", "type": "slider", "label": "Y", "min": -1, "max": 1080, "default": -1},
        {"name": "scale", "type": "slider", "label": "Масштаб (%)", "min": 10, "max": 200, "default": 100}
    ]
}

def apply(image: Image.Image, overlay_path = "", x = -1, y = -1, scale = 100) -> Image.Image:
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

    pos_x = x if x >= 0 else (base.width - overlay.width) // 2
    pos_y = y if y >= 0 else (base.height - overlay.height) // 2

    base.paste(overlay, (pos_x, pos_y), overlay)

    return base.convert("RGB")