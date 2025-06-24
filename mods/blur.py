from PIL import Image, ImageFilter

metadata = {
    "name": "blur",
    "label": "Размытие",
    "params": [
        {
            "name": "radius",
            "type": "slider",
            "label": "Радиус",
            "min": 0,
            "max": 50,
            "default": 0
        }
    ]
}

def apply(image: Image.Image, radius = 10) -> Image.Image:
    return image.filter(
        ImageFilter.GaussianBlur(
            radius=radius
        )
    )