import os, uuid, json, mod
from flask import Flask, request, jsonify, send_from_directory, render_template
from video_gen import generate_video
from datetime import datetime

app = Flask(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
OUTPUT_DIR = os.path.join(BASE_DIR, "output")
CONFIG_FILE = os.path.join(BASE_DIR, "config.json")

app.config["UPLOAD_FOLDER"] = UPLOAD_DIR
app.config['OUTPUT_FOLDER'] = OUTPUT_DIR
app.config['CONFIG_FILE'] = CONFIG_FILE
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

def load_cfg():
    cfg_path = app.config["CONFIG_FILE"]
    if os.path.exists(cfg_path):
        try:
            with open(cfg_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except:
            return { "videos": [] }   
        
    return { "videos": [] }    

def save_cfg(data):
    with open(app.config["CONFIG_FILE"], "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

@app.route("/")
def index():
    cfg = load_cfg()

    return render_template(
        "index.html",
        videos=cfg.get("videos", [])
    )

@app.route('/generate', methods=['POST'])
def generate():
    data = request.json
    cfg = load_cfg()

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
            mods_cfg
        )
        
        date_str = datetime.now().strftime("%d.%m.%Y %H:%M")
        video_data = {
            "name": f"{video_name}.mp4",
            "date": date_str,
            "path": output_path,
            "exists": True
        }
        
        cfg['videos'].insert(0, video_data)
        save_cfg(cfg)
        
        return jsonify({
            "success": True,
            "message": "Видео успешно сгенерировано!",
            "video_path": output_path
        })
    except Exception as e:
        return jsonify({"error": f"Ошибка генерации видео: {str(e)}"}), 500

@app.route("/upload", methods=["POST"])
def upload_file():
    file_type = request.form.get("type")
    file = request.files.get("file")

    if not file:
        return jsonify({
            "error": "Файл не выбран"
        }), 400
    
    ext = os.path.splitext(file.filename)[1].lower()
    filename = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(app.config["UPLOAD_FOLDER"], filename)

    try:
        file.save(file_path)

        if file_path == "image":
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

@app.route("/preview", methods=['POST'])
def preview():
    import io, base64
    from PIL import Image, ImageFilter, ImageEnhance

    data = request.json
    img_path = data.get('image_path')
    mods_cfg = data.get('mods', None)

    if not os.path.exists(img_path):
        return jsonify({
            "error": "Изображение не найдено"
        }), 400
    
    try:
        with Image.open(img_path) as img:
            img = mod.apply_mods(img, mods_cfg)

            buf = io.BytesIO()
            img.save(buf, format="JPEG")
            encoded = base64.b64encode(buf.getvalue()).decode("utf-8")

            return jsonify({
                "preview": f"data:image/jpeg;base64,{encoded}"
            })
    except Exception as e:
        return jsonify({
            "error": f"Ошибка генерации предпросмотра: {str(e)}"
        }), 500

    #vid_type = data.get('video_type', 'YouTube')

@app.route('/clear-history', methods=['POST'])
def clear_history():
    config = load_cfg()
    config['videos'] = []
    save_cfg(config)
    return jsonify({
        "success": True,
        "message": "История очищена"
    })

@app.route('/delete-video', methods=['POST'])
def delete_video():
    data = request.json
    path = data.get("path")

    if not path:
        return jsonify({
            "error": "Не указан путь к видео"
        }), 400
    
    cfg = load_cfg()

    try:
        if os.path.exists(path):
            os.remove(path)
    except Exception as e:
        return jsonify({
            "error": f"Не удалось удалить файл: {str(e)}"
        }), 500
    
    cfg["videos"] = [
        v for v in cfg.get("videos", []) if v["path"] != path
    ]
    save_cfg(cfg)

    return jsonify({
        "success": True, "message":
        "Видео удалено"
    })

@app.route('/output/<path:filename>')
def download_file(filename):
    return send_from_directory(app.config['OUTPUT_FOLDER'], filename, as_attachment=True)

@app.route('/mods', methods=['POST'])
def get_all_mods():
    mods = mod.get_mods()
    return jsonify({"mods": mods})

if __name__ == "__main__":
    app.run(debug=True)