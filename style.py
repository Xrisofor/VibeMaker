from PIL import Image, ImageEnhance, ImageFilter

def get_resized_size_and_offset(img: Image.Image, canvas_size):
    canvas_w, canvas_h = canvas_size
    aspect_ratio = img.width / img.height

    if canvas_h >= canvas_w:
        new_w = canvas_w
        new_h = int(new_w / aspect_ratio)
        if new_h > canvas_h:
            new_h = canvas_h
            new_w = int(new_h * aspect_ratio)
    else:
        new_h = canvas_h
        new_w = int(aspect_ratio * new_h)

    x_offset = (canvas_w - new_w) // 2
    y_offset = (canvas_h - new_h) // 2
    return (new_w, new_h), (x_offset, y_offset)

def create_blur_background(img: Image.Image, size):
    bg_img = img.copy().resize(size, Image.LANCZOS)
    bg_img = bg_img.filter(ImageFilter.GaussianBlur(radius=10))
    bg_img = ImageEnhance.Brightness(bg_img).enhance(0.7)
    return bg_img

def create_color_frame_background(img: Image.Image, size, color=None):
    if color is None:
        img_thumb = img.copy()
        img_thumb.thumbnail((1, 1))
        color = img_thumb.getpixel((0, 0))
    canvas = Image.new("RGB", size, color)
    return canvas

def resize_and_center(img: Image.Image, canvas_size):
    (new_w, new_h), (x_offset, y_offset) = get_resized_size_and_offset(img, canvas_size)
    resized_img = img.resize((new_w, new_h), Image.LANCZOS)
    canvas = Image.new("RGB", canvas_size, (0, 0, 0))
    canvas.paste(resized_img, (x_offset, y_offset))
    return canvas

def apply_style(img: Image.Image, vid_type="YouTube", vid_style="black", prew_size=None):
    if prew_size is None:
        match vid_type:
            case "YouTube":
                prew_size = (1920, 1080)
            case "TikTok":
                prew_size = (1080, 1920)
            case _:
                prew_size = (1080, 1080)

    if vid_style == "blur":
        bg_img = create_blur_background(img, prew_size)
        (new_w, new_h), (x_offset, y_offset) = get_resized_size_and_offset(img, prew_size)
        resized_img = img.resize((new_w, new_h), Image.LANCZOS)
        bg_img.paste(resized_img, (x_offset, y_offset))
        return bg_img

    elif vid_style == "color":
        bg_img = create_color_frame_background(img, prew_size)
        (new_w, new_h), (x_offset, y_offset) = get_resized_size_and_offset(img, prew_size)
        resized_img = img.resize((new_w, new_h), Image.LANCZOS)
        bg_img.paste(resized_img, (x_offset, y_offset))
        return bg_img

    else:
        return resize_and_center(img, prew_size)
