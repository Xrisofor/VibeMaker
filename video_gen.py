import os, subprocess, json, mod, uuid
from PIL import Image, ImageFilter, ImageEnhance
from style import apply_style
from flask import current_app

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

FFMPEG_PATH = os.path.join(BASE_DIR, "ffmpeg", "ffmpeg.exe")
FFPROBE_PATH = os.path.join(BASE_DIR, "ffmpeg", "ffprobe.exe")

def crop_and_resize(img_path, size=(1080, 1080)):
    with Image.open(img_path) as img:
        if img.height < 1080:
            raise ValueError("Высота изображения должна быть не менее 1080px")
        
        min_dim = min(img.size)
        left = (img.width - min_dim) // 2
        top = (img.height - min_dim) // 2
        img = img.crop(
            (
                left,
                top,
                left + min_dim,
                top + min_dim
            )
        ).resize(size)

        filename = os.path.splitext(os.path.basename(img_path))[0]
        path = os.path.join(current_app.config["TEMP_FOLDER"], f"{filename}.jpg")
        img.save(path)
        return path
    
def get_audio_duration(path):
    result = subprocess.run([
        FFPROBE_PATH, '-v', 'error',
        '-show_entries', 'format=duration',
        '-of', 'json', path
    ], capture_output=True, text=True)

    if result.returncode:
        raise RuntimeError(f"ffprobe error: {result.stderr}")
    
    return float(
        json.loads(result.stdout)['format']['duration']
    )

def create_blur_bg(img_path):
    with Image.open(img_path) as img:
        bg = img.resize(
            (1920, 1080), Image.LANCZOS
        ).filter(ImageFilter.GaussianBlur(20))
        bg = ImageEnhance.Brightness(bg).enhance(0.7)

        filename = os.path.splitext(os.path.basename(img_path))[0]
        path = os.path.join(current_app.config["TEMP_FOLDER"], f"{filename}_bg.jpg")
        bg.save(path)
        return path
    
def generate_video(img_path, aud_path, out_path, vid_type = "YouTube", vid_style = "black", mods_cfg = None):
    main_img = crop_and_resize(img_path)
    duration = get_audio_duration(aud_path)

    with Image.open(main_img) as img:
        if mods_cfg:
            img = mod.apply_mods(img, mods_cfg)

        img = apply_style(
            img, vid_type, vid_style
        )

        processed_path = os.path.join(current_app.config["TEMP_FOLDER"], f"processed_{uuid.uuid4().hex}.jpg")
        img.save(processed_path)

    match vid_type:
        case "YouTube":
            filter_complex = "[0:v]scale=1920:1080[v]"
        case "TikTok":
            filter_complex = "[0:v]scale=1080:1920[v]"
        case _:
            filter_complex = "[0:v]scale=1080:1080[v]"

    cmd = [
        FFMPEG_PATH,
        '-loop', '1',
        '-i', processed_path,
        '-i', aud_path,
        '-filter_complex', filter_complex,
        '-map', '[v]',
        '-map', '1:a',
        '-t', str(duration),
        '-c:v', 'libx264',
        '-b:v', "5M",
        '-c:a', 'aac',
        '-pix_fmt', 'yuv420p',
        '-shortest',
        '-y',
        out_path
    ]

    result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

    if os.path.exists(processed_path):
        os.remove(processed_path)  

    if result.returncode != 0:
        error = result.stderr.decode("utf-8") if result.stderr else "Неизвестная ошибка"
        raise RuntimeError(f"ffmpeg error: {error}")
    
    return out_path