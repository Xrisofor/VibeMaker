import math
from PIL import Image, ImageDraw

metadata = {
    "name": "shape_vignette",
    "label": "Фигурная виньетка",
    "description": "Создание виньетки с заданной формой, радиусом и прозрачностью.",
    "params": [
        {
            "name": "shape",
            "type": "dropdown",
            "label": "Форма",
            "options": [
                { "label": "Круг", "value": "circle" },
                { "label": "Квадрат", "value": "square" },
                { "label": "Треугольник", "value": "triangle" },
                { "label": "Ромб", "value": "rhombus" },
                { "label": "Пятиугольник", "value": "pentagon" },
                { "label": "Шестиугольник", "value": "hexagon" },
                { "label": "Звезда", "value": "star" },
                { "label": "Кольцо", "value": "ring" },
                { "label": "Сердце", "value": "heart" }
            ],
            "default": "circle"
        },
        {
            "name": "radius",
            "type": "slider",
            "label": "Размер фигуры",
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

def regular_polygon(cx, cy, radius, sides):
    return [
        (
            cx + radius * math.cos(2 * math.pi * i / sides - math.pi / 2),
            cy + radius * math.sin(2 * math.pi * i / sides - math.pi / 2)
        )
        for i in range(sides)
    ]

def apply(image: Image.Image, radius=100, opacity=128, shape="circle") -> Image.Image:
    w, h = image.size
    cx, cy = w // 2, h // 2

    mask = Image.new("L", image.size, color=opacity)
    draw = ImageDraw.Draw(mask)

    if shape == "circle":
        draw.ellipse((cx - radius, cy - radius, cx + radius, cy + radius), fill=0)

    elif shape == "square":
        draw.rectangle((cx - radius, cy - radius, cx + radius, cy + radius), fill=0)

    elif shape == "triangle":
        points = regular_polygon(cx, cy, radius, 3)
        draw.polygon(points, fill=0)

    elif shape == "rhombus":
        points = [
            (cx, cy - radius),
            (cx + radius, cy),
            (cx, cy + radius),
            (cx - radius, cy)
        ]
        draw.polygon(points, fill=0)

    elif shape == "pentagon":
        draw.polygon(regular_polygon(cx, cy, radius, 5), fill=0)

    elif shape == "hexagon":
        draw.polygon(regular_polygon(cx, cy, radius, 6), fill=0)

    elif shape == "star":
        points = []
        for i in range(10):
            r = radius if i % 2 == 0 else radius * 0.5
            angle = 2 * math.pi * i / 10 - math.pi / 2
            x = cx + r * math.cos(angle)
            y = cy + r * math.sin(angle)
            points.append((x, y))
        draw.polygon(points, fill=0)

    elif shape == "ring":
        draw.ellipse((cx - radius, cy - radius, cx + radius, cy + radius), fill=0)
        inner_r = radius * 0.6
        draw.ellipse((cx - inner_r, cy - inner_r, cx + inner_r, cy + inner_r), fill=opacity)

    elif shape == "heart":
        scale = radius / 16
        path = []
        for t in range(0, 360, 5):
            theta = math.radians(t)
            x = 16 * math.sin(theta) ** 3
            y = 13 * math.cos(theta) - 5 * math.cos(2 * theta) - 2 * math.cos(3 * theta) - math.cos(4 * theta)
            path.append((cx + x * scale, cy - y * scale))
        draw.polygon(path, fill=0)

    black_layer = Image.new("RGBA", image.size, (0, 0, 0, 255))
    base = image.convert("RGBA")
    return Image.composite(black_layer, base, mask)