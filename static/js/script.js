const UI = {};
let selectedImage = null;
let selectedAudio = null;
let selectedImageFile = null;
let selectedAudioFile = null;

function $(id) {
    return document.getElementById(id);
}

function handleFileUpload(e, type, callback) {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    if (type === 'image') selectedImageFile = file;
    if (type === 'audio') selectedAudioFile = file;

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
            style_resize: UI.styleResize.value,
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
            style_resize: UI.styleResize.value,
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

function downloadPreviewImage() {
    if (!selectedImage) {
        return notify('Нет изображения для превью', 'warning');
    }

    const fileName = UI.videoName?.value?.trim() || 'vibemaker_preview';

    fetch('/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            image_path: selectedImage,
            video_type: UI.videoType.value,
            style_resize: UI.styleResize.value,
            video_style: UI.videoStyle.value,
            mods: collectMods()
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.error || !data.preview) {
            throw new Error(data.error || 'Не удалось получить превью');
        }

        const base64Data = data.preview;
        const link = document.createElement('a');
        link.href = base64Data;
        link.download = `${fileName}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        notify('Превью успешно скачано!', 'success');
    })
    .catch(error => {
        console.error('Ошибка при скачивании превью:', error);
        notify('Ошибка при скачивании превью', 'error');
    });
}

function saveProject() {
    const readFileAsBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    const saveProjectData = async () => {
        const projectData = {
            videoType: UI.videoType.value,
            styleResize: UI.styleResize.value,
            videoStyle: UI.videoStyle.value,
            videoName: UI.videoName.value,
            selectedMods: getSelectedModsData(),
        };

        if (selectedImageFile) {
            projectData.image = {
                name: selectedImageFile.name,
                data: await readFileAsBase64(selectedImageFile)
            };
        }

        if (selectedAudioFile) {
            projectData.audio = {
                name: selectedAudioFile.name,
                data: await readFileAsBase64(selectedAudioFile)
            };
        }

        return projectData;
    };

    saveProjectData().then(projectData => {
        const dataStr = JSON.stringify(projectData);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        const exportFileDefaultName = `vibemaker_project_${Date.now()}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
        
        notify('Проект успешно сохранен!', 'success');
    }).catch(error => {
        console.error('Ошибка сохранения проекта:', error);
        notify('Ошибка сохранения проекта', 'error');
    });
}

function loadProject(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const projectData = JSON.parse(event.target.result);
            
            UI.videoType.value = projectData.videoType;
            UI.styleResize.value = projectData.styleResize;
            UI.videoStyle.value = projectData.videoStyle;
            UI.videoName.value = projectData.videoName;
            
            loadSelectedMods(projectData.selectedMods);
            
            const restoreFiles = async () => {
                if (projectData.image) {
                    const imageFile = base64ToFile(
                        projectData.image.data, 
                        projectData.image.name
                    );
                    
                    await simulateFileUpload(imageFile, 'image');
                    UI.imageInfo.textContent = projectData.image.name;
                }

                if (projectData.audio) {
                    const audioFile = base64ToFile(
                        projectData.audio.data, 
                        projectData.audio.name
                    );
                    
                    await simulateFileUpload(audioFile, 'audio');
                    UI.audioInfo.textContent = projectData.audio.name;
                }
            };

            restoreFiles().then(() => {
                notify('Проект успешно загружен!', 'success');
            }).catch(error => {
                console.error('Ошибка восстановления файлов:', error);
                notify('Ошибка восстановления файлов проекта', 'error');
            });
            
        } catch (error) {
            notify('Ошибка загрузки проекта', 'error');
            console.error('Error loading project:', error);
        }
    };
    reader.readAsText(file);
}

function base64ToFile(base64, filename) {
    const arr = base64.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    
    return new File([u8arr], filename, { type: mime });
}

function simulateFileUpload(file, type) {
    return new Promise((resolve, reject) => {
        const event = {
            target: {
                files: [file]
            }
        };
        
        handleFileUpload(event, type, (path, error) => {
            if (error) {
                reject(error);
            } else {
                resolve(path);
            }
        });
    });
}

function getSelectedModsData() {
    return selectedMods.map(mod => ({
        name: mod.name,
        params: mod.params || {}
    }));
}

function loadSelectedMods(modsData) {
    selectedMods = modsData || [];
    renderSelectedMods();
}

document.addEventListener('DOMContentLoaded', () => {
    UI.videoType = $('video-type');
    UI.videoStyle = $('video-style');
    UI.styleResize = $('style-resize');
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

    UI.saveProjectBtn = $('save-project');
    UI.loadProjectBtn = $('load-project');
    UI.projectFileInput = $('project-file');
    UI.downloadBtn = $('download-btn');

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

    UI.videoType.onchange = UI.videoStyle.onchange = UI.styleResize.onchange = updatePreview;
    UI.imageUploadBtn.onclick = () => UI.imageInput.click();
    UI.audioUploadBtn.onclick = () => UI.audioInput.click();

    UI.generateBtn.onclick = generateVideo;
    UI.downloadBtn.onclick = downloadPreviewImage;

    UI.imageInput.onchange = e => handleFileUpload(e, 'image');
    UI.audioInput.onchange = e => handleFileUpload(e, 'audio');

    UI.saveProjectBtn.onclick = saveProject;
    UI.loadProjectBtn.onclick = () => UI.projectFileInput.click();
    UI.projectFileInput.onchange = loadProject;
});
