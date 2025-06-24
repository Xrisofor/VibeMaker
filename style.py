from PIL import Image, ImageEnhance, ImageFilter

def apply_style(img: Image.Image, vid_type="YouTube", vid_style="black", prew_size=(1920, 1080)):
    preview_width, preview_height = prew_size

    if vid_style == "blur" and vid_type == "YouTube":
        bg_img = img.copy().resize((preview_width, preview_height), Image.LANCZOS)
        bg_img = bg_img.filter(ImageFilter.GaussianBlur(radius=10))
        bg_img = ImageEnhance.Brightness(bg_img).enhance(0.7)

        aspect_ratio = img.width / img.height
        new_height = preview_height
        new_width = int(aspect_ratio * new_height)
        main_img = img.resize((new_width, new_height), Image.LANCZOS)

        x_offset = (preview_width - new_width) // 2
        bg_img.paste(main_img, (x_offset, 0))
        return bg_img

    elif vid_type == "YouTube":
        result = Image.new("RGB", (preview_width, preview_height), (0, 0, 0))

        aspect_ratio = img.width / img.height
        new_height = preview_height
        new_width = int(aspect_ratio * new_height)
        resized = img.resize((new_width, new_height), Image.LANCZOS)

        x_offset = (preview_width - new_width) // 2
        result.paste(resized, (x_offset, 0))
        return result

    else:
        return img
