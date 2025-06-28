import os, uuid, json, mod
from flask import Flask, request, jsonify, send_from_directory, render_template
from video_gen import generate_video, crop_and_resize_for_style
from datetime import datetime

app = Flask(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
OUTPUT_DIR = os.path.join(BASE_DIR, "output")
TEMP_DIR = os.path.join(BASE_DIR, "temp")

app.config["UPLOAD_FOLDER"] = UPLOAD_DIR
app.config['OUTPUT_FOLDER'] = OUTPUT_DIR
app.config["TEMP_FOLDER"] = TEMP_DIR
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(TEMP_DIR, exist_ok=True)

def clear_dir(dir):
    for f in os.listdir(dir):
        try:
            os.remove(os.path.join(dir, f))
        except Exception as e:
            print(f"Ошибка удаление файла {f}: {e}")

@app.route("/")
def index():
    clear_dir(app.config["TEMP_FOLDER"])
    clear_dir(app.config["UPLOAD_FOLDER"])

    return render_template("index.html")

@app.route('/generate', methods=['POST'])
def generate():
    data = request.json

    if not all(key in data for key in ['image', 'audio', 'video_name', 'video_type', 'video_style']):
        return jsonify({
            "error": "Не все обязательные поля заполнены"
        }), 400
    
    video_name = data['video_name'].strip()
    if not video_name:
        return jsonify({"error": "Введите название видео"}), 400
    
    save_folder = app.config["OUTPUT_FOLDER"]
    os.makedirs(save_folder, exist_ok=True)
    
    output_path = os.path.join(save_folder, f"{video_name}.mp4")
    mods_cfg = data.get('mods', None)

    try:
        generate_video(
            data['image'],
            data['audio'],
            output_path,
            data['video_type'],
            data['style_resize'],
            data['video_style'],
            mods_cfg
        )
        
        date_str = datetime.now().strftime("%d.%m.%Y %H:%M")
        video_data = {
            "name": f"{video_name}.mp4",
            "date": date_str,
            "path": f"{video_name}.mp4",
            "exists": True
        }
        
        return jsonify({
            "success": True,
            "message": "Видео успешно сгенерировано!",
            "video_path": output_path
        })
    except Exception as e:
        return jsonify({"error": f"Ошибка генерации видео: {str(e)}"}), 500

@app.route("/preview", methods=['POST'])
def preview():
    import io, base64
    from PIL import Image
    from style import apply_style

    data = request.json
    img_path = data.get('image_path')
    vid_type = data.get('video_type', 'YouTube')
    res_type = data.get('style_resize', 'default')
    vid_style = data.get('video_style', 'black')
    mods_cfg = data.get('mods', None)

    if not os.path.exists(img_path):
        return jsonify({
            "error": "Изображение не найдено"
        }), 400
    
    try:
        main_img = crop_and_resize_for_style(img_path, res_type)

        with Image.open(main_img) as img:
            img = mod.apply_mods(img, mods_cfg)

            img = apply_style(
                img, vid_type, vid_style
            )

            buf = io.BytesIO()
            img.save(buf, format="PNG")
            encoded = base64.b64encode(buf.getvalue()).decode("utf-8")

            return jsonify({
                "preview": f"data:image/png;base64,{encoded}"
            })
    except Exception as e:
        return jsonify({
            "error": f"Ошибка генерации предпросмотра: {str(e)}"
        }), 500

@app.route("/upload", methods=["POST"])
def upload_file():
    file = request.files.get("file")
    type = request.form.get("type")

    if not file:
        return jsonify({
            "error": "Файл не выбран"
        }), 400
    
    ext = os.path.splitext(file.filename)[1].lower()
    filename = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(app.config["UPLOAD_FOLDER"], filename)

    try:
        file.save(file_path)

        if type == "image":
            from PIL import Image
            with Image.open(file_path) as img:
                _, h = img.size

            if h < 1080:
                os.remove(file_path)
                return jsonify({
                    "error": "Высота изображения должна быть не менее 1080px"
                }), 400
                
        return jsonify({
            "filename": filename,
            "original_name": file.filename,
            "path": file_path
        })
    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        return jsonify({
            "error": f"Ошибка загрузки файла: {str(e)}"
        }), 500

@app.route('/output/<path:filename>')
def download_file(filename):
    return send_from_directory(app.config['OUTPUT_FOLDER'], filename, as_attachment=True)

@app.route('/mods', methods=['POST'])
def get_all_mods():
    mods = mod.get_mods()
    return jsonify({"mods": mods})

if __name__ == "__main__":
    app.run(debug=True)