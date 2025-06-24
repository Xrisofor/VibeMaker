# 🎞️ ProVideo-Editor

ProVideo-Editor — локальный Flask-сервер и веб-интерфейс для генерации видео из изображений и звука, с возможностью наложения визуальных эффектов (модов). Под капотом используются `ffmpeg`, `Pillow`, `Flask` и кастомные модификаторы изображений.

## 🔧 Возможности

- Загрузка изображения и аудио  
- Автоматическое кадрирование и масштабирование изображения  
- Применение визуальных модов (например, размытие, наложение логотипа и др.)  
- Генерация видео с нужной разметкой под YouTube или square-видео  
- Просмотр предпросмотра модов  
- Скачивание, удаление и просмотр истории видео  

## 🚀 Установка и запуск

1. Убедитесь, что у вас установлен `ffmpeg` и он доступен в переменной окружения или прописан в `FFMPEG_PATH`.  
2. Установите зависимости:  
```bash
pip install -r requirements.txt
```
3. Запустите локальный сервер:
```bash
python app.py
```
4. Откройте в браузере адрес:
```
http://127.0.0.1:5000
```

## 🧩 Как создать свой мод (модификатор изображения)
Каждый мод — это Python-файл в папке `mod` с двумя обязательными элементами:

1. `metadata` — описание параметров мода
Это словарь с информацией о моде и его параметрах, которые будут отображаться в интерфейсе.

Пример — размытие:
```python
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
```

Пример — наложение изображения:
```python
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
```

2. apply(...) — логика применения мода
Функция, которая принимает исходное изображение и параметры, и возвращает изменённое изображение.

Пример — `blur.py`:

```python
from PIL import ImageFilter

def apply(image: Image.Image, radius: int = 0) -> Image.Image:
    return image.filter(ImageFilter.GaussianBlur(radius))
```

Пример — `image_overlay.py`:
```python
from PIL import Image

def apply(image: Image.Image, overlay_path: str, x: int, y: int, scale: int) -> Image.Image:
    overlay = Image.open(overlay_path).convert("RGBA")

    if scale != 100:
        new_size = (overlay.width * scale // 100, overlay.height * scale // 100)
        overlay = overlay.resize(new_size, Image.LANCZOS)

    base = image.convert("RGBA")
    base.paste(overlay, (x, y), overlay)
    return base.convert("RGB")
```
