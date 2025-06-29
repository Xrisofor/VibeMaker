import os
from PIL import Image, ImageDraw, ImageFont

metadata = {
    "name": "text_overlay",
    "label": "Наложение текста",
    "description": "Наложение текста на изображение с возможностью настройки позиции и масштаба.",
    "params": [
        {"name": "text", "type": "text", "label": "Текст", "default": "Ваш текст здесь"},
        {"name": "font_size", "type": "slider", "label": "Размер шрифта", "min": 10, "max": 130, "default": 70},
        {"name": "color", "type": "color", "label": "Цвет", "default": "#FFFFFF"},
        {"name": "font_path", "type": "file", "label": "Загрузить шрифт", "accept": ".ttf, .otf, .woff, .woff2"},
        {"name": "x", "type": "slider", "label": "X", "min": -1, "max": 1080, "default": -1},
        {"name": "y", "type": "slider", "label": "Y", "min": -1, "max": 1080, "default": -1},
        {"name": "scale", "type": "slider", "label": "Масштаб (%)", "min": 10, "max": 200, "default": 100}
    ]
}

def apply(image: Image.Image, text="", font_size=70, color="#FFFFFF", font_path=None, x=-1, y=-1, scale=100) -> Image.Image:
    if not text:
        return image

    try:
        scaled_font_size = int(font_size * scale / 100)
        
        if not font_path:
            font_path = os.path.join(os.path.dirname(__file__), "arial.ttf")

        try:
            font_obj = ImageFont.truetype(font_path, size=scaled_font_size) if font_path else ImageFont.load_default()
        except Exception as e:
            print(f"Ошибка загрузки шрифта '{font_path}': {e}")
            font_obj = ImageFont.load_default()

        overlay = Image.new("RGBA", image.size, (0, 0, 0, 0))
        draw = ImageDraw.Draw(overlay)

        text_bbox = draw.textbbox((0, 0), text, font=font_obj)
        text_width = text_bbox[2] - text_bbox[0]
        text_height = text_bbox[3] - text_bbox[1]

        pos_x = x if x >= 0 else (image.width - text_width) // 2
        pos_y = y if y >= 0 else (image.height - text_height) // 2

        r, g, b = tuple(int(color.lstrip("#")[i:i+2], 16) for i in (0, 2, 4))
        draw.text((pos_x, pos_y), text, font=font_obj, fill=(r, g, b, 255))

        combined = Image.alpha_composite(image.convert("RGBA"), overlay)
        return combined.convert("RGB")

    except Exception as e:
        print(f"Ошибка наложения текста: {e}")
        return image
