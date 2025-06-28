from PIL import Image, ImageDraw

metadata = {
    "name": "circle_vignette",
    "label": "Виньетка круглая",
    "description": "Создание круглой виньетки с заданным радиусом и прозрачностью.",
    "params": [
        {
            "name": "radius",
            "type": "slider",
            "label": "Радиус круга",
            "min": 10,
            "max": 500,
            "default": 100
        },
        {
            "name": "opacity",
            "type": "slider",
            "label": "Прозрачность фона",
            "min": 0,
            "max": 255,
            "default": 128
        }
    ]
}

def apply(image: Image.Image, radius=100, opacity=128) -> Image.Image:
    mask = Image.new("L", image.size, color=opacity)
    draw = ImageDraw.Draw(mask)
    
    cx, cy = image.size[0] // 2, image.size[1] // 2
    
    draw.ellipse(
        (cx - radius, cy - radius, cx + radius, cy + radius),
        fill=0
    )
    
    black_layer = Image.new("RGBA", image.size, (0, 0, 0, 255))
    
    base = image.convert("RGBA")
    
    vignette = Image.composite(black_layer, base, mask)
    
    return vignette