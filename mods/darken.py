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
            "default": 1
        }
    ]
}

def apply(image: Image.Image, enhance = 1) -> Image.Image:
    enhancer = ImageEnhance.Brightness(image)
    return enhancer.enhance(enhance)