from PIL import Image, ImageEnhance

metadata = {
    "name": "sharpness",
    "label": "Резкость",
    "description": "Настройка резкости изображения.",
    "params": [
        {
            "name": "amount",
            "type": "slider",
            "label": "Уровень",
            "min": 0,
            "max": 300,
            "default": 100
        }
    ]
}

def apply(image: Image.Image, amount: int = 100) -> Image.Image:
    if image.mode != "RGB":
        image = image.convert("RGB")

    factor = amount / 100
    enhancer = ImageEnhance.Sharpness(image)
    return enhancer.enhance(factor)