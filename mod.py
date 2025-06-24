import importlib.util, os, glob
from PIL import Image

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODS_DIR = os.path.join(BASE_DIR, "mods")

def get_mods():
    mod_list = []

    mod_files = glob.glob(os.path.join(MODS_DIR, "*.py"))

    for mod_file in mod_files:
        try:
            mod_name = os.path.splitext(os.path.basename(mod_file))[0]
            spec = importlib.util.spec_from_file_location(mod_name, mod_file)
            mod = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(mod)

            if hasattr(mod, 'metadata'):
                mod_list.append(mod.metadata)
        except Exception as e:
            print(f"Ошибка загрузки мода {mod_name}: {e}")

    return mod_list

def apply_mods(image, mods_cfg):
    cache = {}

    for mod in mods_cfg:
        mod_name = mod.get("name", "Нет названия")
        mod_params = mod.get("params", {})

        if mod_name not in cache:
            mod_path = os.path.join(MODS_DIR, f"{mod_name}.py")
            if not os.path.exists(mod_path):
                raise FileNotFoundError(f"Модуль '{mod_name}' не найден")
            
            spec = importlib.util.spec_from_file_location(mod_name, mod_path)
            mod_module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(mod_module)
            cache[mod_name] = mod_module
        else:
            mod_module = cache[mod_name]

        result_img = mod_module.apply(image, **mod_params)
        if not isinstance(result_img, Image.Image):
            raise TypeError(f"Мод '{mod_name}' должен возвращать объект PIL.Image.Image")
        image = result_img

    return image
