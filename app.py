import os, uuid, mod, importlib.util
from flask import Flask, request, jsonify, send_from_directory, render_template
from video_gen import generate_video, crop_and_resize_for_style

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
                img = img.convert("RGB")
                w, h = img.size

            if h < 1080:
                scale = 1080 / h
                new_size = (int(w * scale), 1080)
                img = img.resize(new_size, resample=Image.LANCZOS)
                img.save(file_path)
                
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

@app.route("/mods/<mod_name>/<button_name>", methods=["POST"])
def mod_button_action(mod_name, button_name):
    try:
        mod_path = os.path.join(mod.MODS_DIR, f"{mod_name}.py")
        if not os.path.exists(mod_path):
            return jsonify({"error": "Мод не найден"}), 404

        spec = importlib.util.spec_from_file_location(mod_name, mod_path)
        mod_module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod_module)

        if not hasattr(mod_module, "on_button_click"):
            return jsonify({"error": "Мод не поддерживает кнопки"}), 400

        params = request.json.get("params", {})
        response = mod_module.on_button_click(button_name, params)

        if isinstance(response, dict):
            return jsonify(response)
        else:
            return jsonify({"message": response or "Успешно"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True)