const UI = {};
let selectedImage = null;
let selectedAudio = null;

function $(id) {
    return document.getElementById(id);
}

function handleFileUpload(e, type, callback) {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    fetch('/upload', { method: 'POST', body: formData })
        .then(res => res.json())
        .then(data => {
            if (data.error) {
                notify(data.error, 'error');
                if (callback) callback(null, data.error);
                return;
            }

            if (callback) {
                callback(data.path);
            }

            if (type === 'image') {
                selectedImage = data.path;
                UI.imageInfo.textContent = data.original_name;
                updatePreview();
            } else if (type === 'audio') {
                selectedAudio = data.path;
                UI.audioInfo.textContent = data.original_name;

                if (!UI.videoName.value.trim()) {
                    const baseName = data.original_name.replace(/\.[^/.]+$/, '');
                    UI.videoName.value = baseName;
                }
            }
        })
        .catch(() => {
            notify(`Ошибка загрузки ${type}`, 'error');
            if (callback) callback(null, 'Ошибка загрузки');
        });
}

function updatePreview() {
    if (!selectedImage) {
        UI.preview.innerHTML = placeholder('Превью видео появится здесь', 'image');
        return;
    }

    const mods = collectMods();

    fetch('/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            image_path: selectedImage,
            video_type: UI.videoType.value,
            video_style: UI.videoStyle.value,
            mods: mods
        })
    })
        .then(res => res.json())
        .then(data => {
            UI.preview.innerHTML = data.error
                ? placeholder(data.error, 'exclamation-triangle')
                : `<img src="${data.preview}" alt="Video Preview">`;
        })
        .catch(() => {
            UI.preview.innerHTML = placeholder('Ошибка загрузки превью', 'exclamation-triangle');
        });
}

function generateVideo() {
    if (!selectedImage || !selectedAudio || !UI.videoName.value.trim()) {
        return notify('Заполните все поля и загрузите файлы', 'error');
    }

    toggleGenerateBtn(true);

    const mods = collectMods();

    fetch('/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            image: selectedImage,
            audio: selectedAudio,
            video_name: UI.videoName.value.trim(),
            video_type: UI.videoType.value,
            video_style: UI.videoStyle.value,
            save_folder: UI.folderPath?.value ?? 'output',
            mods: mods
        })
    })
    .then(res => res.json())
    .then(data => {
        data.error
            ? notify(data.error, 'error')
            : (notify(data.message), setTimeout(() => location.reload(), 2000));
    })
    .catch(() => notify('Ошибка генерации видео', 'error'))
    .finally(() => toggleGenerateBtn(false));
}

function notify(msg, type = 'success') {
    const div = document.createElement('div');
    div.className = `notification ${type}`;
    div.innerHTML = `
        <i class="fas fa-${{
            success: 'check-circle',
            error: 'exclamation-circle',
            info: 'info-circle'
        }[type] || 'info-circle'}"></i> ${msg}`;

    UI.notifyArea.appendChild(div);
    setTimeout(() => div.remove(), 4000);
}

function placeholder(text, icon) {
    return `
        <div class="preview-placeholder">
            <i class="fas fa-${icon}"></i>
            <p>${text}</p>
        </div>
    `;
}

function toggleGenerateBtn(loading) {
    UI.generateBtn.disabled = loading;
    UI.generateBtn.innerHTML = loading
        ? '<i class="fas fa-spinner fa-spin"></i> Генерация...'
        : '<i class="fas fa-play-circle"></i> Сгенерировать видео';
}

document.addEventListener('DOMContentLoaded', () => {
    UI.videoType = $('video-type');
    UI.videoStyle = $('video-style');
    UI.videoName = $('video-name');
    UI.folderPath = $('folder-path');
    UI.generateBtn = $('generate-btn');
    UI.preview = $('preview-container');
    UI.imageUploadBtn = $('select-image');
    UI.audioUploadBtn = $('select-audio');
    UI.imageInput = $('image-input');
    UI.audioInput = $('audio-input');
    UI.imageInfo = $('image-info');
    UI.audioInfo = $('audio-info');
    UI.notifyArea = $('notification-area');

    const themeToggleBtn = $('theme-toggle');
    const root = document.documentElement;

    function applyTheme(theme) {
        if (theme === 'dark') {
            root.setAttribute('data-theme', 'dark');
            themeToggleBtn.innerHTML = '<i class="fas fa-sun"></i>';
        } else {
            root.removeAttribute('data-theme');
            themeToggleBtn.innerHTML = '<i class="fas fa-moon"></i>';
        }
        localStorage.setItem('theme', theme);
    }

    themeToggleBtn.addEventListener('click', () => {
        const currentTheme = root.getAttribute('data-theme');
        applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
    });

    applyTheme(localStorage.getItem('theme') || 'light');

    const fullscreenBtn = $('fullscreen-btn');
    const refreshBtn = $('refresh-btn');

    fullscreenBtn.addEventListener('click', () => {
        if (UI.preview.requestFullscreen) {
            UI.preview.requestFullscreen();
        } else if (UI.preview.webkitRequestFullscreen) {
            UI.preview.webkitRequestFullscreen();
        } else if (UI.preview.msRequestFullscreen) {
            UI.preview.msRequestFullscreen();
        }
    });

    refreshBtn.addEventListener('click', updatePreview);

    UI.videoType.onchange = UI.videoStyle.onchange = updatePreview;
    UI.imageUploadBtn.onclick = () => UI.imageInput.click();
    UI.audioUploadBtn.onclick = () => UI.audioInput.click();

    UI.generateBtn.onclick = generateVideo;

    UI.imageInput.onchange = e => handleFileUpload(e, 'image');
    UI.audioInput.onchange = e => handleFileUpload(e, 'audio');
});
