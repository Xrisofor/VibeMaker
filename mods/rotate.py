from PIL import Image

metadata = {
    "name": "rotate",
    "label": "Поворот изображения",
    "params": [
        {"name": "angle", "type": "slider", "label": "Угол (°)", "min": -180, "max": 180, "default": 0}
    ]
}

def apply(image: Image.Image, angle = 0) -> Image.Image:
    return image.rotate(angle, expand=True)