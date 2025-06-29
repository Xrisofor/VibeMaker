from PIL import Image, ImageEnhance

metadata = {
    "name": "darken",
    "label": "Потемнение",
    "description": "Уменьшение яркости изображения.",
    "params": [
        {
            "name": "enhance",
            "type": "slider",
            "label": "Яркость",
            "min": 0,
            "max": 2,
            "default": 1,
            "step": 0.01
        }
    ]
}

def apply(image: Image.Image, enhance: float = 1.0) -> Image.Image:
    enhance = max(0.0, min(2.0, float(enhance)))

    enhancer = ImageEnhance.Brightness(image)
    return enhancer.enhance(enhance)
