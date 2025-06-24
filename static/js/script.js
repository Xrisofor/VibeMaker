document.addEventListener('DOMContentLoaded', () => {
    const $ = id => document.getElementById(id);

    const themeToggleBtn = document.getElementById('theme-toggle');
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
        if (currentTheme === 'dark') {
            applyTheme('light');
        } else {
            applyTheme('dark');
        }
    });

    const savedTheme = localStorage.getItem('theme') || 'light';
    applyTheme(savedTheme);

    const previewContainer = document.getElementById('preview-container');
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    const refreshBtn = document.getElementById('refresh-btn');

    fullscreenBtn.addEventListener('click', () => {
        if (previewContainer.requestFullscreen) {
        previewContainer.requestFullscreen();
        } else if (previewContainer.webkitRequestFullscreen) { // Safari
        previewContainer.webkitRequestFullscreen();
        } else if (previewContainer.msRequestFullscreen) { // IE11
        previewContainer.msRequestFullscreen();
        }
    });

    refreshBtn.addEventListener('click', () => {
        updatePreview();
    });

    const UI = {
        videoType: $('video-type'),
        videoStyle: $('video-style'),
        videoName: $('video-name'),
        folderPath: $('folder-path'),
        selectFolder: $('select-folder'),
        generateBtn: $('generate-btn'),
        preview: $('preview-container'),
        imageUploadBtn: $('select-image'),
        audioUploadBtn: $('select-audio'),
        imageInput: $('image-input'),
        audioInput: $('audio-input'),
        imageInfo: $('image-info'),
        audioInfo: $('audio-info'),
        clearHistory: $('clear-history'),
        historyList: $('history-list'),
        notifyArea: $('notification-area'),
    };

    let selectedImage = null;
    let selectedAudio = null;

    // Bind events
    UI.videoType.onchange = UI.videoStyle.onchange = updatePreview;
    UI.imageUploadBtn.onclick = () => UI.imageInput.click();
    UI.audioUploadBtn.onclick = () => UI.audioInput.click();
    UI.selectFolder?.addEventListener('click', () => {
        UI.folderPath.value = 'output';
        notify('Папка сохранения изменена');
    });
    UI.generateBtn.onclick = generateVideo;
    UI.clearHistory.onclick = clearHistory;
    UI.historyList.addEventListener('click', handleHistoryClick);
    UI.imageInput.onchange = e => handleFileUpload(e, 'image');
    UI.audioInput.onchange = e => handleFileUpload(e, 'audio');

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

    function clearHistory() {
        if (!confirm('Вы уверены, что хотите очистить всю историю видео?')) return;
        fetch('/clear-history', { method: 'POST' })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    notify(data.message);
                    UI.historyList.innerHTML = placeholder('Нет сохраненных видео', 'info-circle');
                }
            })
            .catch(() => notify('Ошибка очистки истории', 'error'));
    }

    function handleHistoryClick(e) {
        const btn = e.target.closest('.download-btn, .delete-btn');
        if (!btn) return;

        const item = btn.closest('.history-item');
        const path = item?.dataset.path;

        if (btn.classList.contains('download-btn')) {
            window.location.href = `/output/${path.split('/').pop()}`;
        }

        if (btn.classList.contains('delete-btn') && confirm('Удалить это видео?')) {
            fetch('/delete-video', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path })
            })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        notify(data.message);
                        item.remove();
                        if (!UI.historyList.querySelector('.history-item')) {
                            UI.historyList.innerHTML = placeholder('Нет сохраненных видео', 'info-circle');
                        }
                    } else {
                        notify(data.error || 'Ошибка удаления', 'error');
                    }
                })
                .catch(() => notify('Ошибка удаления видео', 'error'));
        }
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
});
